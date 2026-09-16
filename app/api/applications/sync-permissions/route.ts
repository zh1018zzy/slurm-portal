import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

// POST /api/applications/sync-permissions - 同步应用权限到权限表
export async function POST(request: NextRequest) {
  try {
    const { applicationName, allowedGroups } = await request.json()

    if (!applicationName || !Array.isArray(allowedGroups)) {
      return NextResponse.json({
        success: false,
        error: '应用名称和允许的用户组列表不能为空'
      }, { status: 400 })
    }

    console.log(`🔄 开始同步应用权限: ${applicationName}, 允许的组: ${allowedGroups.join(', ')}`)

    // 1. 首先删除该应用的现有权限
    const { error: deleteError } = await supabase
      .from('group_application_permissions')
      .delete()
      .eq('application_name', applicationName)

    if (deleteError) {
      console.error('删除现有权限失败:', deleteError)
      return NextResponse.json({
        success: false,
        error: '删除现有权限失败: ' + deleteError.message
      }, { status: 500 })
    }

    // 2. 如果有允许的用户组，添加新权限
    if (allowedGroups.length > 0) {
      // 获取用户组ID
      const { data: groups, error: groupError } = await supabase
        .from('groups')
        .select('id, name')
        .in('name', allowedGroups)

      if (groupError) {
        console.error('获取用户组失败:', groupError)
        return NextResponse.json({
          success: false,
          error: '获取用户组失败: ' + groupError.message
        }, { status: 500 })
      }

      // 检查是否所有组都存在
      const foundGroupNames = groups.map(g => g.name)
      const missingGroups = allowedGroups.filter(name => !foundGroupNames.includes(name))
      
      if (missingGroups.length > 0) {
        console.warn(`以下用户组不存在，将被跳过: ${missingGroups.join(', ')}`)
      }

      // 为存在的用户组创建权限记录
      if (groups.length > 0) {
        const permissionRecords = groups.map(group => ({
          group_id: group.id,
          application_name: applicationName,
          permission_type: 'access',
          created_by: 'system'
        }))

        const { error: insertError } = await supabase
          .from('group_application_permissions')
          .insert(permissionRecords)

        if (insertError) {
          console.error('添加权限记录失败:', insertError)
          return NextResponse.json({
            success: false,
            error: '添加权限记录失败: ' + insertError.message
          }, { status: 500 })
        }

        console.log(`✅ 权限同步成功: 为 ${groups.length} 个用户组添加了应用 "${applicationName}" 的访问权限`)

        return NextResponse.json({
          success: true,
          message: `权限同步成功`,
          details: {
            applicationName,
            syncedGroups: foundGroupNames,
            skippedGroups: missingGroups,
            permissionsAdded: groups.length
          }
        })
      }
    }

    // 如果没有允许的组，只是删除现有权限
    console.log(`✅ 权限同步完成: 应用 "${applicationName}" 的所有权限已清除`)

    return NextResponse.json({
      success: true,
      message: '权限已清除',
      details: {
        applicationName,
        syncedGroups: [],
        permissionsAdded: 0
      }
    })

  } catch (error) {
    console.error('权限同步失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}