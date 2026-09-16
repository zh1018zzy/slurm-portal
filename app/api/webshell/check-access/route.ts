import { NextRequest, NextResponse } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


function getCurrentUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  return verifyJwt(token)
}

export async function GET(req: NextRequest) {
  // 构建时保护 - 返回默认响应
  if (process.env.NODE_ENV === 'production' && !req.headers.get('authorization')) {
    return NextResponse.json({ 
      hasAccess: false, 
      error: '构建时无法访问此API'
    })
  }

  try {
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return NextResponse.json({ hasAccess: false, error: '未登录' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 从users表查询webshell_access字段
    const { data: user, error } = await supabase
      .from('users')
      .select('webshell_access')
      .eq('username', userInfo.username)
      .single()

    if (error || !user) {
      console.error('查询用户WebShell权限失败:', error)
      return NextResponse.json({ hasAccess: false, error: '用户不存在' }, { status: 404 })
    }

    return NextResponse.json({ hasAccess: user.webshell_access || false })

  } catch (error) {
    console.error('检查WebShell权限失败:', error)
    return NextResponse.json({ hasAccess: false, error: '权限检查失败' }, { status: 500 })
  }
} 