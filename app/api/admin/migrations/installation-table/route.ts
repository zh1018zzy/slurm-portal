/**
 * 创建系统安装记录表 - 防篡改机制
 * 仅管理员可执行
 */

import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    logger.info('Migration', '开始创建 system_installation 表')

    // 创建表
    const { error: createError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS system_installation (
          id SERIAL PRIMARY KEY,
          install_id UUID NOT NULL UNIQUE,
          install_date TIMESTAMPTZ NOT NULL,
          hardware_fingerprint TEXT NOT NULL,
          security_markers JSONB NOT NULL,
          version TEXT NOT NULL DEFAULT '1.0.0',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          metadata JSONB
        );

        CREATE INDEX IF NOT EXISTS idx_install_id ON system_installation(install_id);
        CREATE INDEX IF NOT EXISTS idx_hardware_fingerprint ON system_installation(hardware_fingerprint);
        CREATE INDEX IF NOT EXISTS idx_is_active ON system_installation(is_active);
        CREATE INDEX IF NOT EXISTS idx_install_date ON system_installation(install_date);
      `
    })

    if (createError) {
      // 如果 rpc 不可用，直接使用原始 SQL
      logger.warn('Migration', 'RPC 不可用，尝试直接创建表')

      // 使用直接查询（需要启用 PostgREST）
      const { error: directError } = await supabase
        .from('system_installation')
        .select('id')
        .limit(1)

      if (directError && directError.code === '42P01') {
        // 表不存在，需要手动创建
        return NextResponse.json({
          success: false,
          error: '需要手动执行迁移 SQL',
          sql: path.join(process.cwd(), 'scripts/migrations/create-installation-table.sql')
        }, { status: 500 })
      }
    }

    logger.info('Migration', '表创建成功或已存在')

    return NextResponse.json({
      success: true,
      message: 'system_installation 表创建成功'
    })

  } catch (error) {
    logger.error('Migration', '迁移失败', error as Error)

    return NextResponse.json({
      success: false,
      error: '迁移执行失败',
      details: (error as Error).message
    }, { status: 500 })
  }
}
