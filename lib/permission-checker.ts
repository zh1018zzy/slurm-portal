import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

export interface Permission {
  resource: string
  action: string
  scope?: string
  conditions?: object
}

export interface UserInfo {
  id: string
  username: string
  role?: string
  isAdmin?: boolean
  isSuperAdmin?: boolean
}

/**
 * 检查用户是否具有指定权限
 * @param userInfo 用户信息
 * @param permission 权限配置
 * @returns Promise<boolean> 是否有权限
 */
export async function checkPermission(
  userInfo: UserInfo,
  permission: Permission
): Promise<boolean> {
  try {
    // 超级管理员拥有所有权限，直接返回 true
    if (userInfo.role === 'super_admin' || userInfo.isSuperAdmin === true) {
      return true
    }

    // 1. 获取用户角色
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        expires_at,
        roles (
          name,
          level
        )
      `)
      .eq('user_id', userInfo.id)
      .gte('expires_at', new Date().toISOString())
      .or('expires_at.is.null')

    if (userRolesError) {
      console.error('获取用户角色失败:', userRolesError)
      return false
    }

    if (!userRoles || userRoles.length === 0) {
      // 如果没有分配角色，使用默认角色
      return checkDefaultRolePermission(userInfo, permission)
    }

    // 2. 检查每个角色的权限
    for (const userRole of userRoles) {
      const { data: rolePermissions, error: rolePermissionsError } = await supabase
        .from('role_permissions')
        .select(`
          permissions (
            resource,
            action,
            scope
          ),
          conditions
        `)
        .eq('role_id', userRole.role_id)

      if (rolePermissionsError) {
        console.error('获取角色权限失败:', rolePermissionsError)
        continue
      }

      if (rolePermissions) {
        for (const rolePermission of rolePermissions) {
          const perms = rolePermission.permissions
          if (Array.isArray(perms)) {
            for (const perm of perms) {
              if (perm.resource === permission.resource && 
                  perm.action === permission.action &&
                  (permission.scope ? perm.scope === permission.scope : true)) {
                return true
              }
            }
          }
        }
      }
    }

    return false
  } catch (error) {
    console.error('权限检查失败:', error)
    return false
  }
}

/**
 * 检查默认角色权限（向后兼容）
 * @param userInfo 用户信息
 * @param permission 权限配置
 * @returns boolean 是否有权限
 */
function checkDefaultRolePermission(userInfo: UserInfo, permission: Permission): boolean {
  // 超级管理员拥有所有权限
  if (userInfo.role === 'super_admin') {
    return true
  }

  // 系统管理员拥有大部分权限
  if (userInfo.role === 'system_admin') {
    // 除了用户删除权限
    if (permission.resource === 'user' && permission.action === 'delete') {
      return false
    }
    return true
  }

  // 普通用户的基础权限
  if (userInfo.role === 'user') {
    // 用户相关权限
    if (permission.resource === 'user') {
      if (permission.action === 'read' && permission.scope === 'own') return true
      if (permission.action === 'update' && permission.scope === 'own') return true
      return false
    }

    // 作业相关权限
    if (permission.resource === 'job') {
      if (permission.action === 'create') return true
      if (permission.action === 'read' && permission.scope === 'own') return true
      if (permission.action === 'update' && permission.scope === 'own') return true
      if (permission.action === 'delete' && permission.scope === 'own') return true
      return false
    }

    // 应用相关权限
    if (permission.resource === 'app') {
      if (permission.action === 'read') return true
      return false
    }

    // 文件相关权限
    if (permission.resource === 'file') {
      if (permission.action === 'create') return true
      if (permission.action === 'read' && permission.scope === 'own') return true
      if (permission.action === 'update' && permission.scope === 'own') return true
      if (permission.action === 'delete' && permission.scope === 'own') return true
      return false
    }

    return false
  }

  // 访客只有读取权限
  if (userInfo.role === 'guest') {
    if (permission.action === 'read') return true
    return false
  }

  return false
}

/**
 * 批量检查多个权限
 * @param userInfo 用户信息
 * @param permissions 权限列表
 * @returns Promise<Record<string, boolean>> 权限检查结果
 */
export async function checkMultiplePermissions(
  userInfo: UserInfo, 
  permissions: Permission[]
): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {}
  
  // 并行检查所有权限
  const checks = permissions.map(async (permission) => {
    const key = `${permission.resource}:${permission.action}:${permission.scope || 'own'}`
    results[key] = await checkPermission(userInfo, permission)
  })
  
  await Promise.all(checks)
  return results
}

/**
 * 获取用户所有权限
 * @param userInfo 用户信息
 * @returns Promise<Permission[]> 用户权限列表
 */
export async function getUserPermissions(userInfo: UserInfo): Promise<Permission[]> {
  try {
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select(`
        role_id,
        expires_at,
        roles (
          name,
          level
        )
      `)
      .eq('user_id', userInfo.id)
      .gte('expires_at', new Date().toISOString())
      .or('expires_at.is.null')

    if (userRolesError || !userRoles) {
      return []
    }

    const permissions: Permission[] = []
    
    for (const userRole of userRoles) {
      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select(`
          permissions (
            resource,
            action,
            scope
          )
        `)
        .eq('role_id', userRole.role_id)

      if (rolePermissions) {
        for (const rolePermission of rolePermissions) {
          const perms = rolePermission.permissions
          if (Array.isArray(perms)) {
            for (const perm of perms) {
              permissions.push({
                resource: perm.resource,
                action: perm.action,
                scope: perm.scope
              })
            }
          }
        }
      }
    }

    return permissions
  } catch (error) {
    console.error('获取用户权限失败:', error)
    return []
  }
}

/**
 * 检查用户是否具有指定角色
 * @param userInfo 用户信息
 * @param roleName 角色名称
 * @returns Promise<boolean> 是否具有该角色
 */
export async function hasRole(userInfo: UserInfo, roleName: string): Promise<boolean> {
  try {
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('user_id', userInfo.id)
      .eq('roles.name', roleName)
      .gte('expires_at', new Date().toISOString())
      .or('expires_at.is.null')

    if (error || !userRoles) {
      return false
    }

    return userRoles.length > 0
  } catch (error) {
    console.error('检查用户角色失败:', error)
    return false
  }
}

/**
 * 获取用户所有角色
 * @param userInfo 用户信息
 * @returns Promise<string[]> 角色名称列表
 */
export async function getUserRoles(userInfo: UserInfo): Promise<string[]> {
  try {
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select(`
        roles (
          name
        )
      `)
      .eq('user_id', userInfo.id)
      .gte('expires_at', new Date().toISOString())
      .or('expires_at.is.null')

    if (error || !userRoles) {
      return []
    }

    return userRoles.map((ur: any) => {
      const roles = ur.roles as any
      return Array.isArray(roles) ? roles[0]?.name : roles?.name
    }).filter(Boolean) as string[]
  } catch (error) {
    console.error('获取用户角色失败:', error)
    return []
  }
} 