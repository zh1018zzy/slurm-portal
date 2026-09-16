import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// GET /api/groups/[id]/applications - 获取用户组的应用权限列表
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id

    // 获取组的应用权限
    const { data: permissions, error } = await supabase
      .from('group_application_permissions')
      .select(`
        id,
        application_name,
        permission_type,
        created_at,
        created_by
      `)
      .eq('group_id', groupId)
      .order('application_name')

    if (error) {
      console.error('查询组应用权限失败:', error)
      return NextResponse.json({
        success: false,
        error: '查询权限失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      permissions: permissions || []
    })

  } catch (error) {
    console.error('获取组应用权限失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

// POST /api/groups/[id]/applications - 为用户组添加应用权限
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const body = await request.json()
    const { applications, permissionType = 'access', createdBy } = body

    if (!applications || !Array.isArray(applications)) {
      return NextResponse.json({
        success: false,
        error: '应用列表不能为空'
      }, { status: 400 })
    }

    // 准备批量插入的数据
    const permissionRecords = applications.map(appName => ({
      group_id: groupId,
      application_name: appName,
      permission_type: permissionType,
      created_by: createdBy || 'system'
    }))

    // 批量插入权限记录
    const { data, error } = await supabase
      .from('group_application_permissions')
      .upsert(permissionRecords, {
        onConflict: 'group_id,application_name,permission_type',
        ignoreDuplicates: false
      })
      .select()

    if (error) {
      console.error('添加应用权限失败:', error)
      return NextResponse.json({
        success: false,
        error: '添加权限失败: ' + error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `成功为组添加 ${applications.length} 个应用权限`,
      data: data
    })

  } catch (error) {
    console.error('添加组应用权限失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}

// DELETE /api/groups/[id]/applications - 移除用户组的应用权限
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const groupId = params.id
    const body = await request.json()
    const { applications, permissionType } = body

    if (!applications || !Array.isArray(applications)) {
      return NextResponse.json({
        success: false,
        error: '应用列表不能为空'
      }, { status: 400 })
    }

    // 删除指定的权限记录
    let query = supabase
      .from('group_application_permissions')
      .delete()
      .eq('group_id', groupId)
      .in('application_name', applications)

    // 如果指定了权限类型，则只删除该类型的权限
    if (permissionType) {
      query = query.eq('permission_type', permissionType)
    }

    const { error } = await query

    if (error) {
      console.error('删除应用权限失败:', error)
      return NextResponse.json({
        success: false,
        error: '删除权限失败: ' + error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `成功移除 ${applications.length} 个应用权限`
    })

  } catch (error) {
    console.error('删除组应用权限失败:', error)
    return NextResponse.json({
      success: false,
      error: '服务器错误'
    }, { status: 500 })
  }
}