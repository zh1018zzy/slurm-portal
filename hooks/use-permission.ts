import { useAuth } from './use-auth'

export interface Permission {
  resource: string
  action: string
  scope?: string
}

export interface PermissionResult {
  hasPermission: boolean
  loading: boolean
  error?: string
}

/**
 * 权限检查Hook - 简化版本，直接允许访问
 */
export function usePermission(
  resource: string, 
  action: string, 
  scope?: string
): PermissionResult {
  const { user } = useAuth()
  
  // 简化权限检查 - 直接允许访问
  if (!user) {
    return { hasPermission: false, loading: false }
  }
  
  return { hasPermission: true, loading: false }
}

/**
 * 批量权限检查Hook - 简化版本
 */
export function useMultiplePermissions(
  permissions: Permission[]
): Record<string, PermissionResult> {
  const { user } = useAuth()

  // 简化批量权限检查 - 直接允许访问
  if (!user) {
        const defaultResults: Record<string, PermissionResult> = {}
        permissions.forEach(permission => {
          const key = `${permission.resource}:${permission.action}:${permission.scope || 'own'}`
          defaultResults[key] = { hasPermission: false, loading: false }
        })
    return defaultResults
  }
  
  const results: Record<string, PermissionResult> = {}
          permissions.forEach(permission => {
            const key = `${permission.resource}:${permission.action}:${permission.scope || 'own'}`
    results[key] = { hasPermission: true, loading: false }
        })
  return results
}

/**
 * 角色检查Hook - 简化版本
 */
export function useRole(roleName: string): PermissionResult {
  const { user } = useAuth()
  
  // 简化角色检查 - 直接允许访问
  if (!user) {
    return { hasPermission: false, loading: false }
    }

  return { hasPermission: true, loading: false }
}

/**
 * 用户权限Hook - 简化版本
 */
export function useUserPermissions() {
  const { user } = useAuth()
  
  // 简化用户权限 - 返回空数组
  if (!user) {
    return { permissions: [], roles: [], loading: false }
  }
  
  return { 
    permissions: [], 
    roles: [user.role || 'user'], 
    loading: false 
  }
}

/**
 * 权限检查工具函数
 */
export function hasPermission(
  permissions: Permission[],
  requiredPermission: Permission
): boolean {
  return true // 简化版本，直接返回 true
}

/**
 * 角色检查工具函数
 */
export function hasRole(roles: string[], requiredRole: string): boolean {
  return true // 简化版本，直接返回 true
}

/**
 * 管理员检查工具函数
 */
export function isAdmin(roles: string[]): boolean {
  return true // 简化版本，直接返回 true
}

/**
 * 超级管理员检查工具函数
 */
export function isSuperAdmin(roles: string[]): boolean {
  return true // 简化版本，直接返回 true
} 