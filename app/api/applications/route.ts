import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry, ApplicationRegistry } from '@/lib/application-registry'
import { ApplicationCategory, ApplicationType } from '@/lib/hpc-application-spec'
import { supabase } from '@/lib/supabase'
import { getSystemSettings } from '@/lib/metadata'
export const dynamic = 'force-dynamic'


// 检查应用中心是否启用的辅助函数
export async function checkApplicationCenterEnabled() {
  const systemSettings = await getSystemSettings()
  return systemSettings.applicationsCenterEnabled !== false
}

// 返回应用中心禁用错误响应
export function getApplicationCenterDisabledResponse() {
  return NextResponse.json({
    success: false,
    error: 'Application center is disabled',
    message: '应用中心已被管理员禁用',
    data: []
  }, { status: 403 })
}

// 用户信息缓存
const userCache = new Map<string, { data: any; timestamp: number }>()
const USER_CACHE_TTL = 5 * 60 * 1000 // 5分钟缓存

// 获取用户信息（带缓存）
async function getUserInfo(username: string) {
  const now = Date.now()
  const cached = userCache.get(username)
  
  // 检查缓存是否有效
  if (cached && (now - cached.timestamp) < USER_CACHE_TTL) {
    return cached.data
  }
  
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('department, role')
      .eq('username', username)
      .single()
    
    if (userError || !userData) {
      console.warn(`无法获取用户 ${username} 的详细信息:`, userError)
      return null
    }
    
    // 缓存用户信息
    userCache.set(username, { data: userData, timestamp: now })
    return userData
  } catch (error) {
    console.error('获取用户信息时出错:', error)
    return null
  }
}

// 检查用户是否有应用访问权限（通过用户组）
async function checkUserApplicationAccess(username: string, applicationName: string): Promise<boolean> {
  try {
    // 使用数据库函数检查用户权限
    const { data, error } = await supabase
      .rpc('check_user_application_permission', {
        user_username: username,
        app_name: applicationName,
        permission: 'access'
      })
    
    if (error) {
      console.error('检查用户应用权限失败:', error)
      return false
    }
    
    return data === true
  } catch (error) {
    console.error('检查用户应用权限时出错:', error)
    return false
  }
}

// 检查用户的组和部门权限（优化版）
function checkUserAccess(userInfo: any, visibility: any): boolean {
  if (!userInfo || !visibility) return false
  
  // 检查部门权限
  if (visibility?.allowedDepartments && visibility.allowedDepartments.length > 0) {
    const userDepartment = userInfo.department
    if (userDepartment && visibility.allowedDepartments.includes(userDepartment)) {
      return true
    }
  }
  
  // 检查用户组权限 - 暂时跳过，因为users表没有groups字段
  if (visibility?.allowedGroups && visibility.allowedGroups.length > 0) {
    // TODO: 如果将来需要支持用户组，需要添加groups字段到users表
    console.log(`[应用API] 跳过用户组权限检查，因为users表没有groups字段`)
    return false
  }
  
  return false
}

// GET /api/applications - 获取应用列表,支持新HPC规范和向后兼容
export async function GET(request: NextRequest) {
  try {
    // 检查应用中心是否启用
    const isEnabled = await checkApplicationCenterEnabled()
    if (!isEnabled) {
      return getApplicationCenterDisabledResponse()
    }

    const { searchParams } = new URL(request.url)
    
    // 解析查询参数
    const keyword = searchParams.get('q')
    const category = searchParams.get('category') as ApplicationCategory
    const type = searchParams.get('type') as ApplicationType
    const tags = searchParams.get('tags')?.split(',').filter(Boolean)
    const author = searchParams.get('author')
    const legacy = searchParams.get('legacy') === 'true' // 向后兼容模式
    const forUser = searchParams.get('forUser') // 为特定用户过滤

    // 如果请求legacy模式，使用旧的applications表
    if (legacy) {
      return getLegacyApplications(searchParams)
    }

    console.log(`[应用API] 开始获取应用列表，参数: forUser=${forUser}`)
    
    // 新的HPC应用规范模式
    let applications: any[] = []
    
    if (keyword || category || type || tags || author) {
      console.log(`[应用API] 使用搜索模式，参数:`, { keyword, category, type, tags, author })
      applications = await applicationRegistry.search({
        keyword: keyword || undefined,
        category: category || undefined,
        type: type || undefined,
        tags: tags || undefined,
        author: author || undefined
      })
    } else {
      console.log(`[应用API] 获取所有应用`)
      applications = await applicationRegistry.getAll()
    }
    
    console.log(`[应用API] 从注册表获取到 ${applications.length} 个应用`)
    
    // 如果没有应用，尝试从旧版表加载
    if (applications.length === 0) {
      console.log(`[应用API] 主应用表为空，回退到旧版应用表...`)
      return getLegacyApplications(searchParams)
    }
    
    // 如果指定了用户，根据可见性规则过滤应用
    if (forUser && applications.length > 0) {
      // ✅ 优化：只查询一次用户信息，而不是为每个应用都查询
      const userInfo = await getUserInfo(forUser)
      
      console.log(`[应用API] 为用户 ${forUser} 过滤应用，用户信息:`, userInfo ? '已获取' : '获取失败')
      
      // 即使无法获取用户信息，也要检查公开应用和用户组权限
      const filteredApplications = []
      
      for (const app of applications) {
        const visibility = app.visibility || app.access
        const appName = app.metadata?.name || app.name

        // 如果没有应用名称，跳过
        if (!appName) {
          continue
        }

        // 检查应用是否有可见性配置
        if (!visibility) {
          // 如果没有可见性配置，默认为公开应用
          filteredApplications.push(app)
          continue
        }

        // 未发布的应用（isPublic === false），所有用户都不可见
        if (visibility.isPublic === false) {
          continue
        }

        // 已发布的应用（isPublic === true或null），检查权限
        // null 被视为已发布（为了向后兼容）
        if (visibility.isPublic === true || visibility.isPublic === null || visibility.isPublic === undefined) {
          // 首先检查用户组权限表
          const hasGroupAccess = await checkUserApplicationAccess(forUser, appName)
          if (hasGroupAccess) {
            filteredApplications.push(app)
            continue
          }
          
          // 如果用户组权限表中没有权限，检查应用本身的权限设置
          const hasUserRestrictions = visibility?.allowedUsers && visibility.allowedUsers.length > 0
          const hasGroupRestrictions = visibility?.allowedGroups && visibility.allowedGroups.length > 0
          const hasDeptRestrictions = visibility?.allowedDepartments && visibility.allowedDepartments.length > 0
          
          // 如果应用没有设置任何访问限制，则默认所有人可访问
          if (!hasUserRestrictions && !hasGroupRestrictions && !hasDeptRestrictions) {
            filteredApplications.push(app)
            continue
          }
          
          // 如果无法获取用户信息，跳过需要权限检查的应用
          if (!userInfo) {
            continue
          }
          
          // 检查用户是否在允许列表中
          if (hasUserRestrictions && visibility.allowedUsers.includes(forUser)) {
            filteredApplications.push(app)
            continue
          }
          
          // 检查用户组和部门权限（使用缓存的用户信息）
          if (checkUserAccess(userInfo, visibility)) {
            filteredApplications.push(app)
            continue
          }
        }
      }
      
      console.log(`[应用API] 过滤结果：总应用 ${applications.length} 个，过滤后 ${filteredApplications.length} 个`)
      applications = filteredApplications
    }
    
    return NextResponse.json({
      success: true,
      data: applications,
      total: applications.length,
      version: 'v2' // 标识新版本API
    })
  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch applications',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 向后兼容：获取旧版applications表数据
async function getLegacyApplications(searchParams: URLSearchParams) {
  console.log('[应用API] 使用旧版应用表加载数据...')
  const startTime = Date.now()
  
  const page = parseInt(searchParams.get('page') || '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
  const keyword = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const status = searchParams.get('status') || ''
  const isPublished = searchParams.get('is_published')
  const forUser = searchParams.get('forUser') // 获取用户过滤参数

  // 只查询必要的字段，提高查询性能
  let query = supabase
    .from('applications')
    .select('name, version, description, created_by, category, tags, icon, status, fields', { count: 'exact' })
    
  if (keyword) {
    query = query.ilike('name', `%${keyword}%`)
  }
  if (category) {
    query = query.eq('category', category)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (isPublished !== null && isPublished !== undefined) {
    query = query.eq('is_published', isPublished === 'true')
  }
  
  // 只查询活跃的应用，优化查询条件
  query = query.in('status', ['active', 'published'])
  query = query.order('created_at', { ascending: false })
  
  // 限制返回数量，避免一次加载太多数据
  const maxResults = Math.min(pageSize, 50) // 最多50个应用
  query = query.range((page - 1) * maxResults, page * maxResults - 1)

  const { data, error, count } = await query
  if (error) {
    console.error('[应用API] 旧版应用表查询失败:', error)
    return NextResponse.json({ success: false, message: error.message }, { status: 500 })
  }

  const loadTime = Date.now() - startTime
  console.log(`[应用API] 旧版应用表加载完成：${data?.length || 0} 个应用，耗时 ${loadTime}ms`)

  // 转换旧版应用格式为新版格式，使用最小化的数据结构
  const convertedApps = (data || []).map((app: any) => ({
    metadata: {
      name: app.name || 'Unknown',
      displayName: app.name || 'Unknown',
      version: app.version || '1.0',
      description: app.description || '暂无描述',
      author: app.created_by || 'Unknown',
      category: app.category || 'general',
      tags: Array.isArray(app.tags) ? app.tags : [],
      icon: app.icon,
      type: ['interactive'] // 默认类型
    },
    // 简化其他字段，只保留必要的
    requirements: { system: { os: ['linux'] } },
    resources: { cpu: { default: 1 }, memory: { default: '2GB' } },
    execution: { type: 'batch' },
    interface: { type: 'form', fields: app.fields || [] },
    access: { isPublic: true, isActive: true, isListed: true }
  }))

  console.log(`[应用API] 数据转换完成：${convertedApps.length} 个应用`)

  // 转换为统一格式，字段名改为 data 而不是 applications
  return NextResponse.json({ 
    success: true, 
    total: count, 
    data: convertedApps, // ✅ 修复：返回转换后的应用数据
    version: 'v1' // 标识旧版本API
  })
}

// POST /api/applications - 创建新应用，支持两种格式
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const isHpcSpec = body.metadata && body.requirements && body.resources // 检测是否为HPC规范

    if (isHpcSpec) {
      // 新的HPC应用规范
      const validation = applicationRegistry.validate(body)
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid application specification',
            details: validation.errors,
            warnings: validation.warnings
          },
          { status: 400 }
        )
      }

      // 确保 visibility 字段映射到 access 字段
      const appData = {
        ...body,
        access: body.visibility || body.access
      }
      await applicationRegistry.register(appData)
      
      return NextResponse.json({
        success: true,
        message: 'HPC application registered successfully',
        application: body,
        version: 'v2'
      }, { status: 201 })
    } else {
      // 旧版应用格式
      const {
        name, description, version, fields, script_template,
        icon, category, tags, status, form_version,
        role_ids, department_ids, visible_to_all, user_ids, created_by
      } = body

      if (!name || !fields || !script_template) {
        return NextResponse.json({ 
          success: false, 
          message: '缺少必要参数' 
        }, { status: 400 })
      }

      const { data, error } = await supabase.from('applications').insert([{
        name, description, version, fields, script_template,
        icon, category, tags, status: status ?? 'draft', form_version: form_version ?? '1',
        role_ids: role_ids ?? [], department_ids: department_ids ?? [], 
        visible_to_all: visible_to_all ?? false, user_ids: user_ids ?? [], created_by
      }]).select().single()

      if (error) {
        return NextResponse.json({ 
          success: false, 
          message: error.message 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        application: data,
        version: 'v1'
      })
    }
  } catch (error) {
    console.error('Error creating application:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create application',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// PUT /api/applications - 更新应用（兼容两种格式）
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { originalName, originalVersion, ...updateData } = body
    
    // 检查是否为HPC规范格式
    const isHpcSpec = updateData.metadata && updateData.requirements && updateData.resources
    
    if (isHpcSpec) {
      // 更新HPC应用
      const validation = applicationRegistry.validate(updateData)
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid application specification',
            details: validation.errors
          },
          { status: 400 }
        )
      }

      // 如果提供了原始名称和版本，进行更新操作
      if (originalName && originalVersion) {
        const isNameOrVersionChanged = 
          originalName !== updateData.metadata.name || 
          originalVersion !== updateData.metadata.version
        
        if (isNameOrVersionChanged) {
          // 名称或版本发生变化，删除旧版本并创建新版本
          await supabase
            .from('hpc_applications')
            .delete()
            .eq('metadata->>name', originalName)
            .eq('metadata->>version', originalVersion)
          
          // 创建新版本，确保 visibility 字段映射到 access 字段
          const appData = {
            ...updateData,
            access: updateData.visibility || updateData.access
          }
          await applicationRegistry.register(appData)
          
          return NextResponse.json({
            success: true,
            application: updateData,
            message: '应用已更新（名称或版本已变更）',
            version: 'v2'
          })
        } else {
          // 名称和版本未变化，使用注册表的update方法
          try {
            // 确保 visibility 字段映射到 access 字段
            const appData = {
              ...updateData,
              access: updateData.visibility || updateData.access
            }
            await applicationRegistry.update(appData, originalName, originalVersion)
            
            return NextResponse.json({
              success: true,
              application: updateData,
              message: '应用更新成功',
              version: 'v2'
            })
          } catch (error) {
            return NextResponse.json({
              success: false,
              error: 'Failed to update application',
              message: error instanceof Error ? error.message : 'Unknown error'
            }, { status: 500 })
          }
        }
      } else {
        // 没有提供原始信息，创建新应用
        await applicationRegistry.register(updateData)
        
        return NextResponse.json({
          success: true,
          application: updateData,
          message: '应用创建成功',
          version: 'v2'
        })
      }
    } else {
      // 更新旧版应用（需要ID）
      const { id } = body
      if (!id) {
        return NextResponse.json({ 
          success: false, 
          message: '缺少应用ID' 
        }, { status: 400 })
      }
      
      const { data, error } = await supabase
        .from('applications')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        return NextResponse.json({ 
          success: false, 
          message: error.message 
        }, { status: 500 })
      }
      
      return NextResponse.json({ 
        success: true, 
        application: data,
        version: 'v1'
      })
    }
  } catch (error) {
    console.error('Error updating application:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update application',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// DELETE /api/applications - 删除应用
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const name = searchParams.get('name')
    const version = searchParams.get('version')
    
    // 支持两种删除方式：通过ID（旧版）或通过名称+版本（HPC版）
    if (!id && (!name || !version)) {
      return NextResponse.json({ 
        success: false, 
        message: '缺少应用标识信息（需要 id 或 name+version）' 
      }, { status: 400 })
    }
    
    let deleted = false
    
    // 尝试从HPC应用表删除
    if (name && version) {
      console.log(`[DELETE API] 尝试删除HPC应用: ${name}@${version}`)
      
      const { error: hpcError } = await supabase
        .from('hpc_applications')
        .delete()
        .eq('metadata->>name', name)
        .eq('metadata->>version', version)
      
      if (!hpcError) {
        console.log(`[DELETE API] HPC应用删除成功: ${name}@${version}`)
        deleted = true
        
        // ✅ 关键修复：删除后立即清除应用注册表缓存
        try {
          // 优先使用精确移除，如果失败再全局清除缓存
          applicationRegistry.removeFromCache(name, version)
          console.log(`[DELETE API] 应用已从缓存中移除: ${name}@${version}`)
        } catch (cacheError) {
          console.error(`[DELETE API] 精确缓存移除失败，执行全局缓存清除:`, cacheError)
          try {
            await applicationRegistry.clearCache()
            console.log(`[DELETE API] 全局缓存已清除`)
          } catch (globalCacheError) {
            console.error(`[DELETE API] 全局缓存清除也失败:`, globalCacheError)
            // 缓存清除失败不影响删除操作的成功
          }
        }
      } else {
        console.log(`[DELETE API] HPC应用删除失败:`, hpcError)
      }
    }
    
    // 尝试从旧版应用表删除
    if (id && !deleted) {
      console.log(`[DELETE API] 尝试删除旧版应用: ID ${id}`)
      
      const { error: legacyError } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)
      
      if (!legacyError) {
        console.log(`[DELETE API] 旧版应用删除成功: ID ${id}`)
        deleted = true
      } else {
        console.log(`[DELETE API] 旧版应用删除失败:`, legacyError)
      }
    }
    
    if (!deleted) {
      return NextResponse.json({ 
        success: false, 
        message: '应用不存在或删除失败' 
      }, { status: 404 })
    }
    
    console.log(`[DELETE API] 应用删除操作完成`)
    
    return NextResponse.json({ 
      success: true, 
      message: '应用已删除' 
    })
  } catch (error) {
    console.error('Error deleting application:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete application',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
