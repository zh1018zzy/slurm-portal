import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { changeLdapPassword } from '@/lib/ldap-user'
import { changeNisPassword } from '@/lib/nis-user'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// PUT /api/users/[id]/password 修改用户密码 (兼容前端调用)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = resolvedParams.id
  const body = await req.json()
  const { password: newPassword } = body

  if (!newPassword) {
    return Response.json({ success: false, error: '新密码不能为空' }, { status: 400 })
  }

  // 1. 查找用户username
  const { data: user, error } = await supabase.from('users').select('username').eq('id', id).single()
  if (error || !user) {
    return Response.json({ success: false, error: '用户不存在' }, { status: 404 })
  }

  // 2. 根据认证模式修改密码
  const authMode = process.env.AUTH_MODE || 'linux'
  let result: { success: boolean, error?: string }

  if (authMode === 'ldap') {
    result = await changeLdapPassword(user.username, newPassword)
  } else if (authMode === 'linux') {
    result = await changeNisPassword(user.username, newPassword)
  } else {
    return Response.json({
      success: false,
      error: `不支持的认证模式: ${authMode}`
    }, { status: 400 })
  }

  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: 400 })
  }

  return Response.json({ success: true })
}

// PATCH /api/users/[id]/password 修改用户密码
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  const id = resolvedParams.id
  const { newPassword } = await req.json()

  if (!newPassword) {
    return Response.json({ success: false, error: '新密码不能为空' }, { status: 400 })
  }

  // 1. 查找用户username
  const { data: user, error } = await supabase.from('users').select('username').eq('id', id).single()
  if (error || !user) {
    return Response.json({ success: false, error: '用户不存在' }, { status: 404 })
  }

  // 2. 根据认证模式修改密码
  const authMode = process.env.AUTH_MODE || 'linux'
  let result: { success: boolean, error?: string }

  if (authMode === 'ldap') {
    result = await changeLdapPassword(user.username, newPassword)
  } else if (authMode === 'linux') {
    result = await changeNisPassword(user.username, newPassword)
  } else {
    return Response.json({
      success: false,
      error: `不支持的认证模式: ${authMode}`
    }, { status: 400 })
  }

  if (!result.success) {
    return Response.json({ success: false, error: result.error }, { status: 400 })
  }

  return Response.json({ success: true })
} 