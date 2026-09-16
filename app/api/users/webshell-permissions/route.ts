import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// GET /api/users/webshell-permissions 获取所有用户的WebShell权限
export async function GET(req: NextRequest) {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, username, real_name, email, role, webshell_access')
      .order('username')

    if (error) {
      console.error('获取用户WebShell权限失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, users })
  } catch (error) {
    console.error('获取用户WebShell权限失败:', error)
    return NextResponse.json({ success: false, error: '获取权限失败' }, { status: 500 })
  }
}

// PUT /api/users/webshell-permissions 更新用户WebShell权限
export async function PUT(req: NextRequest) {
  try {
    const { userId, hasAccess } = await req.json()
    
    if (!userId || typeof hasAccess !== 'boolean') {
      return NextResponse.json({ success: false, error: '参数错误' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('users')
      .update({ webshell_access: hasAccess })
      .eq('id', userId)
      .select('id, username, webshell_access')
      .single()

    if (error) {
      console.error('更新用户WebShell权限失败:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      user: data,
      message: `用户 ${data.username} 的WebShell权限已${hasAccess ? '启用' : '禁用'}`
    })
  } catch (error) {
    console.error('更新用户WebShell权限失败:', error)
    return NextResponse.json({ success: false, error: '更新权限失败' }, { status: 500 })
  }
} 