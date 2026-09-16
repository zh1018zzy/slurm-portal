import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logger } from '@/lib/logger'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * 获取用户统计API - 使用实际数据库查询
 */
export async function GET(request: NextRequest) {
  try {
    logger.info('Users-Count-API', '获取用户统计')

    // 并行查询总用户数与在线用户数
    const [totalResult, onlineResult] = await Promise.all([
      supabase.from('users').select('id'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_online', true)
    ])

    const totalUsers = totalResult.data ? totalResult.data.length : 0
    const concurrentUsers = onlineResult.count || 0

    const result = {
      totalUsers,
      concurrentUsers,
      timestamp: new Date().toISOString()
    }

    logger.info('Users-Count-API', '用户统计获取成功', result)

    return NextResponse.json(result)

  } catch (error) {
    logger.error('Users-Count-API', '用户统计获取失败', error as Error)
    
    return NextResponse.json({
      totalUsers: 0,
      concurrentUsers: 0,
      error: '用户统计获取失败'
    }, { status: 500 })
  }
}
