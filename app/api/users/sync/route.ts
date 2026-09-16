import { NextRequest } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const execAsync = promisify(exec)

// 初始化Supabase客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// POST /api/users/sync - 触发LDAP用户同步
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { dryRun = false, force = false } = body

    // 检查权限（只有管理员可以执行同步）
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ success: false, error: '未授权访问' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 验证JWT token
    let userInfo: any = null
    try {
      const { verifyJwt } = require('@/lib/jwt')
      userInfo = verifyJwt(token)
      if (!userInfo) {
        console.error('同步API: JWT验证失败')
        return Response.json({ success: false, error: '无效的认证令牌' }, { status: 401 })
      }
      console.log('同步API: JWT验证成功, username:', userInfo.username)
    } catch (error) {
      console.error('同步API: JWT验证异常:', error)
      return Response.json({ success: false, error: '无效的认证令牌' }, { status: 401 })
    }

    // 检查用户是否为管理员
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('username', userInfo.username)
      .single()

    if (userError || userData?.role !== 'admin') {
      return Response.json({ success: false, error: '需要管理员权限' }, { status: 403 })
    }

    // 构建同步命令
    const scriptPath = process.cwd() + '/scripts/cron/sync-ldap-users.sh'
    let command = scriptPath
    
    if (dryRun) {
      command += ' --dry-run'
    }
    
    if (force) {
      command += ' --force'
    }

    // 执行同步脚本
    const { stdout, stderr } = await execAsync(command, {
      timeout: 300000, // 5分钟超时
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    })

    if (stderr) {
      console.error('LDAP同步脚本错误输出:', stderr)
    }

    // 解析输出结果
    const lines = stdout.split('\n')
    const summary = lines.find(line => line.includes('统计:'))
    
    return Response.json({
      success: true,
      message: 'LDAP用户同步完成',
      output: stdout,
      summary: summary || '同步完成',
      dryRun,
      force
    })

  } catch (error: any) {
    console.error('LDAP同步API错误:', error)
    
    if (error.code === 'ETIMEDOUT') {
      return Response.json({ 
        success: false, 
        error: '同步操作超时，请检查LDAP连接或稍后重试' 
      }, { status: 408 })
    }

    return Response.json({ 
      success: false, 
      error: error.message || '同步操作失败' 
    }, { status: 500 })
  }
}

// GET /api/users/sync - 获取同步状态和历史
export async function GET(req: NextRequest) {
  try {
    // 检查权限
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return Response.json({ success: false, error: '未授权访问' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // 验证JWT token
    let userInfo: any = null
    try {
      const { verifyJwt } = require('@/lib/jwt')
      userInfo = verifyJwt(token)
      if (!userInfo) {
        return Response.json({ success: false, error: '无效的认证令牌' }, { status: 401 })
      }
    } catch (error) {
      return Response.json({ success: false, error: '无效的认证令牌' }, { status: 401 })
    }

    // 检查用户是否为管理员
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('username', userInfo.username)
      .single()

    if (userError || userData?.role !== 'admin') {
      return Response.json({ success: false, error: '需要管理员权限' }, { status: 403 })
    }

    // 测试LDAP连接
    try {
      const { stdout } = await execAsync('scripts/cron/sync-ldap-users.sh --test', {
        timeout: 30000, // 30秒超时
        env: {
          ...process.env,
          NODE_ENV: 'production'
        }
      })

      return Response.json({
        success: true,
        ldapStatus: 'connected',
        message: 'LDAP连接正常',
        testOutput: stdout
      })

    } catch (testError: any) {
      return Response.json({
        success: false,
        ldapStatus: 'disconnected',
        error: 'LDAP连接测试失败',
        testError: testError.message
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error('LDAP状态检查错误:', error)
    return Response.json({ 
      success: false, 
      error: error.message || '状态检查失败' 
    }, { status: 500 })
  }
} 