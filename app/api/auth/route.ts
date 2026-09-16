import { NextRequest } from 'next/server'
import { authenticateLinux } from '@/lib/auth-linux'
import { authenticateLdap } from '@/lib/auth-ldap'
import { authenticateSuperAdmin } from '@/lib/super-admin'
import { signJwt } from '@/lib/jwt'
import { createClient } from '@supabase/supabase-js'
import { logAppEvent } from '@/lib/logger'
export const dynamic = 'force-dynamic'


/**
 * POST /api/auth/login
 * body: { username, password }
 * 支持linux本地认证和ldap认证，登录成功返回JWT
 */
export async function POST(req: NextRequest) {
  const { username, password } = await req.json()
  const mode = process.env.AUTH_MODE || 'linux'

  try {
    // 优先检查是否为超级管理员登录（绕过所有限制）
    const superAdminInfo = await authenticateSuperAdmin(username, password)
    if (superAdminInfo) {
      const token = signJwt(superAdminInfo)
      logAppEvent(`超级管理员登录成功: ${username}`)
      return Response.json({ success: true, token, userInfo: superAdminInfo })
    }

    // 执行普通用户认证
    let userInfo = null
    if (mode === 'linux') {
      userInfo = await authenticateLinux(username, password)
    } else if (mode === 'ldap') {
      userInfo = await authenticateLdap(username, password)
    }
    
    if (userInfo) {
      // 登录成功，记录last_login_at和活跃状态
      const supabaseUrl = process.env.SUPABASE_URL || ''
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
      const supabase = createClient(supabaseUrl, supabaseKey)
      
      await supabase.from('users').update({ 
        last_login_at: new Date().toISOString(),
        is_active: true // 标记为活跃用户
      }).eq('username', username)
      
      const token = signJwt(userInfo)
      logAppEvent(`用户登录成功: ${username}`)
      return Response.json({ success: true, token, userInfo })
    }
    
    logAppEvent(`用户登录失败: ${username} - 认证失败`)
    return Response.json({ success: false, error: '用户名或密码错误' }, { status: 401 })
    
  } catch (error) {
    console.error('登录处理失败:', error)
    logAppEvent(`用户登录错误: ${username} - ${error}`)
    return Response.json({ success: false, error: '登录处理失败' }, { status: 500 })
  }
}
