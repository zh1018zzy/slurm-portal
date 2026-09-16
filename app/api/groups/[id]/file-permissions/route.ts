import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyJwt } from '@/lib/jwt'

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic'

// 文件权限类型定义
const FILE_PERMISSION_TYPES = [
  'file_upload',
  'file_download', 
  'file_preview',
  'file_delete',
  'file_share',
  'file_export',
  'file_copy'
] as const

type FilePermissionType = typeof FILE_PERMISSION_TYPES[number]

// 验证权限类型
function isValidPermissionType(type: string): type is FilePermissionType {
  return FILE_PERMISSION_TYPES.includes(type as FilePermissionType)
}

// GET: 获取用户组文件权限列表
export async function GET(request: NextRequest) {
  try {
    // 验证用户权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo || !userInfo.isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    
    if (!groupId) {
      return NextResponse.json({ error: '用户组ID不能为空' }, { status: 400 })
    }
    
    // 验证用户组是否存在
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id, name')
      .eq('id', groupId)
      .single()
    
    if (groupError || !group) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 })
    }
    
    // 获取用户组的文件权限
    const { data: permissions, error: permError } = await supabase
      .from('group_file_permissions')
      .select('*')
      .eq('group_id', groupId)
      .order('permission_type')
    
    if (permError) {
      console.error('获取用户组文件权限失败:', permError)
      return NextResponse.json({ error: '获取权限失败' }, { status: 500 })
    }
    
    // 如果没有权限记录，为每种权限类型创建默认记录
    if (!permissions || permissions.length === 0) {
      const defaultPermissions = FILE_PERMISSION_TYPES.map(type => ({
        group_id: groupId,
        permission_type: type,
        is_enabled: false,
        created_by: userInfo.username
      }))
      
      const { data: newPermissions, error: insertError } = await supabase
        .from('group_file_permissions')
        .insert(defaultPermissions)
        .select()
      
      if (insertError) {
        console.error('创建默认权限失败:', insertError)
        return NextResponse.json({ error: '创建默认权限失败' }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        group,
        permissions: newPermissions || []
      })
    }
    
    return NextResponse.json({
      success: true,
      group,
      permissions: permissions || []
    })
  } catch (error) {
    console.error('获取用户组文件权限失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// POST: 更新用户组文件权限
export async function POST(request: NextRequest) {
  try {
    // 验证用户权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo || !userInfo.isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }
    
    const body = await request.json()
    const { groupId, permissionType, isEnabled } = body
    
    if (!groupId || !permissionType || typeof isEnabled !== 'boolean') {
      return NextResponse.json({ 
        error: '参数不完整：需要 groupId, permissionType, isEnabled' 
      }, { status: 400 })
    }
    
    if (!isValidPermissionType(permissionType)) {
      return NextResponse.json({ 
        error: `无效的权限类型: ${permissionType}` 
      }, { status: 400 })
    }
    
    // 验证用户组是否存在
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .single()
    
    if (groupError || !group) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 })
    }
    
    // 更新或插入权限记录
    const { data, error } = await supabase
      .from('group_file_permissions')
      .upsert({
        group_id: groupId,
        permission_type: permissionType,
        is_enabled: isEnabled,
        updated_by: userInfo.username
      }, {
        onConflict: 'group_id,permission_type'
      })
      .select()
    
    if (error) {
      console.error('更新用户组文件权限失败:', error)
      return NextResponse.json({ error: '更新权限失败' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: `权限${isEnabled ? '启用' : '禁用'}成功`,
      permission: data?.[0]
    })
  } catch (error) {
    console.error('更新用户组文件权限失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// PUT: 批量更新用户组文件权限
export async function PUT(request: NextRequest) {
  try {
    // 验证用户权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo || !userInfo.isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }
    
    const body = await request.json()
    const { groupId, permissions } = body
    
    if (!groupId || !permissions || typeof permissions !== 'object') {
      return NextResponse.json({ 
        error: '参数不完整：需要 groupId 和 permissions 对象' 
      }, { status: 400 })
    }
    
    // 验证用户组是否存在
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('id')
      .eq('id', groupId)
      .single()
    
    if (groupError || !group) {
      return NextResponse.json({ error: '用户组不存在' }, { status: 404 })
    }
    
    // 验证所有权限类型
    const invalidTypes = Object.keys(permissions).filter(type => !isValidPermissionType(type))
    if (invalidTypes.length > 0) {
      return NextResponse.json({ 
        error: `无效的权限类型: ${invalidTypes.join(', ')}` 
      }, { status: 400 })
    }
    
    // 批量更新权限
    const updates = Object.entries(permissions).map(([permissionType, isEnabled]) => ({
      group_id: groupId,
      permission_type: permissionType,
      is_enabled: Boolean(isEnabled),
      updated_by: userInfo.username
    }))
    
    const { data, error } = await supabase
      .from('group_file_permissions')
      .upsert(updates, {
        onConflict: 'group_id,permission_type'
      })
      .select()
    
    if (error) {
      console.error('批量更新用户组文件权限失败:', error)
      return NextResponse.json({ error: '批量更新权限失败' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: '批量更新权限成功',
      permissions: data || []
    })
  } catch (error) {
    console.error('批量更新用户组文件权限失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// DELETE: 删除用户组文件权限
export async function DELETE(request: NextRequest) {
  try {
    // 验证用户权限
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo || !userInfo.isAdmin) {
      return NextResponse.json({ error: '需要管理员权限' }, { status: 403 })
    }
    
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')
    const permissionType = searchParams.get('permissionType')
    
    if (!groupId) {
      return NextResponse.json({ error: '用户组ID不能为空' }, { status: 400 })
    }
    
    let query = supabase
      .from('group_file_permissions')
      .delete()
      .eq('group_id', groupId)
    
    if (permissionType) {
      if (!isValidPermissionType(permissionType)) {
        return NextResponse.json({ 
          error: `无效的权限类型: ${permissionType}` 
        }, { status: 400 })
      }
      query = query.eq('permission_type', permissionType)
    }
    
    const { error } = await query
    
    if (error) {
      console.error('删除用户组文件权限失败:', error)
      return NextResponse.json({ error: '删除权限失败' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: permissionType 
        ? `删除权限 ${permissionType} 成功`
        : '删除用户组所有文件权限成功'
    })
  } catch (error) {
    console.error('删除用户组文件权限失败:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}