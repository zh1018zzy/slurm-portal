import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
export const dynamic = 'force-dynamic'


export async function GET(request: NextRequest) {
  try {
    const configPath = join(process.cwd(), 'config', 'webshell-permissions.json')
    const configData = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(configData)
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('读取 WebShell 权限配置失败:', error)
    
    // 返回默认配置
    return NextResponse.json({
      permissions: {
        admin: {
          copy: true,
          paste: true,
          download: true,
          upload: true,
          execute: true
        },
        user: {
          copy: false,
          paste: false,
          download: false,
          upload: false,
          execute: true
        },
        guest: {
          copy: false,
          paste: false,
          download: false,
          upload: false,
          execute: false
        }
      },
      default_role: 'user',
      session_timeout: 3600,
      max_sessions_per_user: 3
    })
  }
} 