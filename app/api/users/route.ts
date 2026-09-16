import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addLdapUser, changeLdapPassword, deleteLdapUser } from '@/lib/ldap-user'
import { addNisUser, changeNisPassword, deleteNisUser } from '@/lib/nis-user'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// GET /api/users 获取所有用户，支持search、分页
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '10', 10)
  let query = supabase.from('users').select('*, webshell_access', { count: 'exact' })
  if (search) {
    query = query.or(`username.ilike.%${search}%,real_name.ilike.%${search}%,email.ilike.%${search}%`)
  }
  query = query.order('created_at', { ascending: false })
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  // 活跃用户统计
  if (searchParams.get('stats') === 'active') {
    // 统计last_login_at在24小时内的用户数
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true }).gte('last_login_at', since)
    if (error) return Response.json({ success: false, error: error.message }, { status: 500 })
    return Response.json({ success: true, activeUsers: count })
  }
  // 部门分布统计
  if (searchParams.get('stats') === 'department') {
    const { data, error } = await supabase.from('users').select('department')
    if (error) return Response.json({ success: false, error: error.message }, { status: 500 })
    const stats: Record<string, number> = {}
    data.forEach((u: any) => {
      const dept = u.department || '未分配'
      stats[dept] = (stats[dept] || 0) + 1
    })
    return Response.json({ success: true, departmentStats: stats })
  }

  const { data, error, count } = await query
  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
  return Response.json({ success: true, users: data, total: count })
}

// POST /api/users 添加新用户
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { username, real_name, email, phone, department, role, password } = body

  if (!username || !password) {
    return Response.json({ success: false, error: '用户名和密码必填' }, { status: 400 })
  }

  try {
    // 获取认证模式
    const authMode = process.env.AUTH_MODE || 'linux'
    console.log('当前认证模式:', authMode)

    let uidNumber = 1000
    let systemUserResult: { success: boolean, error?: string, uid?: number }

    // 1. 根据认证模式添加系统用户（LDAP 或 NIS）
    if (authMode === 'ldap') {
      console.log('开始添加 LDAP 用户:', username)
      systemUserResult = await addLdapUser(username, password, real_name, email)
      console.log('LDAP 添加结果:', systemUserResult)
    } else if (authMode === 'linux') {
      console.log('开始添加 NIS/Linux 用户:', username)
      systemUserResult = await addNisUser(username, password, real_name, {
        gid: 2000,
        home: `/home/${username}`,
        shell: '/bin/bash'
      })
      console.log('NIS/Linux 添加结果:', systemUserResult)
    } else {
      return Response.json({
        success: false,
        error: `不支持的认证模式: ${authMode}`
      }, { status: 400 })
    }

    if (!systemUserResult.success) {
      return Response.json({ success: false, error: systemUserResult.error }, { status: 400 })
    }

    // 2. 使用系统返回的 uidNumber
    uidNumber = systemUserResult.uid || 1000
    console.log('使用的 uidNumber:', uidNumber, '(来源:', systemUserResult.uid ? '系统用户' : '默认值', ')')

    // 3. 写入 Supabase，包含 POSIX 属性
    const { data, error } = await supabase.from('users').insert([
      {
        id: generateUUID(),
        username,
        real_name,
        email,
        phone,
        department,
        role: role || 'user',
        is_online: false,
        last_login_at: null,
        // POSIX 属性
        uid_number: uidNumber,
        gid_number: 2000, // 默认 users 组
        home_directory: `/home/${username}`,
        login_shell: '/bin/bash'
      }
    ]).select()

    if (error) {
      // 4. Supabase 失败，需要回退系统用户操作
      console.error('数据库插入失败，开始回退系统用户:', error)

      let rollbackResult: { success: boolean, error?: string }
      if (authMode === 'ldap') {
        rollbackResult = await deleteLdapUser(username)
      } else {
        rollbackResult = await deleteNisUser(username, false)
      }

      if (!rollbackResult.success) {
        return Response.json({
          success: false,
          error: `数据库插入失败: ${error.message}。${authMode.toUpperCase()} 用户已创建但回退失败，请联系管理员手动清理。`
        }, { status: 400 })
      }
      return Response.json({ success: false, error: `数据库插入失败: ${error.message}` }, { status: 400 })
    }

    console.log('用户添加成功:', username)
    return Response.json({ success: true, user: data[0] })

  } catch (error) {
    console.error('添加用户失败:', error)
    return Response.json({
      success: false,
      error: '添加用户失败：' + (error instanceof Error ? error.message : '未知错误')
    }, { status: 500 })
  }
}

// PATCH /api/users/[id]/password 修改用户密码
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  const { newPassword } = await req.json()
  if (!newPassword) {
    return Response.json({ success: false, error: '新密码不能为空' }, { status: 400 })
  }
  // 查username
  const { data: user, error } = await supabase.from('users').select('username').eq('id', id).single()
  if (error || !user) {
    return Response.json({ success: false, error: '用户不存在' }, { status: 404 })
  }
  const ok = await changeLdapPassword(user.username, newPassword)
  if (!ok) {
    return Response.json({ success: false, error: 'LDAP修改密码失败' }, { status: 400 })
  }
  return Response.json({ success: true })
}
