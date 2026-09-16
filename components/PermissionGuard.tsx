import { ReactNode } from 'react'
import { usePermission, Permission } from '@/hooks/use-permission'

interface PermissionGuardProps {
  resource: string
  action: string
  scope?: string
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
  showOnError?: boolean
}

/**
 * 权限守卫组件
 * 根据用户权限决定是否渲染子组件
 */
export function PermissionGuard({ 
  resource, 
  action, 
  scope, 
  children, 
  fallback = null,
  loading = <div className="text-sm text-gray-500">权限检查中...</div>,
  showOnError = false
}: PermissionGuardProps) {
  const { hasPermission, loading: permissionLoading, error } = usePermission(resource, action, scope)

  // 加载状态
  if (permissionLoading) {
    return <>{loading}</>
  }

  // 错误状态
  if (error && !showOnError) {
    return <>{fallback}</>
  }

  // 权限检查结果
  return hasPermission ? <>{children}</> : <>{fallback}</>
}

/**
 * 角色守卫组件
 * 根据用户角色决定是否渲染子组件
 */
interface RoleGuardProps {
  role: string
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
}

export function RoleGuard({ 
  role, 
  children, 
  fallback = null,
  loading = <div className="text-sm text-gray-500">角色检查中...</div>
}: RoleGuardProps) {
  const { hasPermission, loading: roleLoading } = usePermission('system', 'read', 'all')

  if (roleLoading) {
    return <>{loading}</>
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

/**
 * 管理员守卫组件
 * 只有管理员才能访问
 */
interface AdminGuardProps {
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
}

export function AdminGuard({ 
  children, 
  fallback = null,
  loading = <div className="text-sm text-gray-500">权限检查中...</div>
}: AdminGuardProps) {
  const { hasPermission, loading: adminLoading } = usePermission('system', 'admin', 'all')

  if (adminLoading) {
    return <>{loading}</>
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

/**
 * 超级管理员守卫组件
 * 只有超级管理员才能访问
 */
interface SuperAdminGuardProps {
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
}

export function SuperAdminGuard({ 
  children, 
  fallback = null,
  loading = <div className="text-sm text-gray-500">权限检查中...</div>
}: SuperAdminGuardProps) {
  const { hasPermission, loading: superAdminLoading } = usePermission('system', 'admin', 'all')

  if (superAdminLoading) {
    return <>{loading}</>
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

/**
 * 批量权限守卫组件
 * 检查多个权限，支持AND和OR逻辑
 */
interface MultiplePermissionGuardProps {
  permissions: Permission[]
  logic?: 'AND' | 'OR'
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
}

export function MultiplePermissionGuard({ 
  permissions, 
  logic = 'AND',
  children, 
  fallback = null,
  loading = <div className="text-sm text-gray-500">权限检查中...</div>
}: MultiplePermissionGuardProps) {
  // 检查权限的自定义 hook，避免在循环中调用 hooks
  const usePermissions = (perms: Permission[]) => {
    // 为每个可能的权限位置分别调用 hook
    const result1 = usePermission(perms[0]?.resource || '', perms[0]?.action || '', perms[0]?.scope)
    const result2 = usePermission(perms[1]?.resource || '', perms[1]?.action || '', perms[1]?.scope)
    const result3 = usePermission(perms[2]?.resource || '', perms[2]?.action || '', perms[2]?.scope)
    const result4 = usePermission(perms[3]?.resource || '', perms[3]?.action || '', perms[3]?.scope)
    const result5 = usePermission(perms[4]?.resource || '', perms[4]?.action || '', perms[4]?.scope)
    
    // 只返回有效权限的结果
    const results = []
    if (perms[0]) results.push(result1)
    if (perms[1]) results.push(result2)
    if (perms[2]) results.push(result3)
    if (perms[3]) results.push(result4)
    if (perms[4]) results.push(result5)
    
    return results
  }

  const results = usePermissions(permissions)

  const isLoading = results.some(result => result.loading)
  const hasError = results.some(result => result.error)

  if (isLoading) {
    return <>{loading}</>
  }

  if (hasError) {
    return <>{fallback}</>
  }

  let hasAllPermissions: boolean
  if (logic === 'AND') {
    hasAllPermissions = results.every(result => result.hasPermission)
  } else {
    hasAllPermissions = results.some(result => result.hasPermission)
  }

  return hasAllPermissions ? <>{children}</> : <>{fallback}</>
}

/**
 * 条件权限守卫组件
 * 根据条件动态决定权限要求
 */
interface ConditionalPermissionGuardProps {
  condition: () => Permission | null
  children: ReactNode
  fallback?: ReactNode
  loading?: ReactNode
}

export function ConditionalPermissionGuard({ 
  condition, 
  children, 
  fallback = null,
  loading = <div className="text-sm text-gray-500">权限检查中...</div>
}: ConditionalPermissionGuardProps) {
  const requiredPermission = condition()

  // 总是调用 hook，但使用空字符串作为默认值
  const { hasPermission, loading: permissionLoading } = usePermission(
    requiredPermission?.resource || '',
    requiredPermission?.action || '',
    requiredPermission?.scope
  )

  // 如果没有权限要求，直接显示内容
  if (!requiredPermission) {
    return <>{children}</>
  }

  if (permissionLoading) {
    return <>{loading}</>
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

/**
 * 权限不足提示组件
 */
interface PermissionDeniedProps {
  resource?: string
  action?: string
  message?: string
}

export function PermissionDenied({ 
  resource, 
  action, 
  message 
}: PermissionDeniedProps) {
  const defaultMessage = message || 
    (resource && action 
      ? `您没有${resource}的${action}权限`
      : '您没有访问此功能的权限')

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">权限不足</h3>
      <p className="text-gray-600 mb-4">{defaultMessage}</p>
      <p className="text-sm text-gray-500">
        如果您认为这是一个错误，请联系系统管理员
      </p>
    </div>
  )
}

/**
 * 权限加载组件
 */
interface PermissionLoadingProps {
  message?: string
}

export function PermissionLoading({ 
  message = '权限检查中...' 
}: PermissionLoadingProps) {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
      <span className="text-sm text-gray-600">{message}</span>
    </div>
  )
}

// 默认导出主组件
export default PermissionGuard 