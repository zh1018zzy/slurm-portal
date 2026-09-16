/**
 * 管理员权限验证辅助函数
 * 统一的管理员权限检查逻辑
 */

/**
 * 检查用户是否为管理员（包括超级管理员）
 * @param user 用户对象
 * @returns 是否为管理员
 */
export function isAdminUser(user: any): boolean {
  if (!user) return false

  return (
    user.role === 'admin' ||
    user.role === 'super_admin' ||
    user.isAdmin === true ||
    user.isSuperAdmin === true
  )
}

/**
 * 检查用户是否为超级管理员
 * @param user 用户对象
 * @returns 是否为超级管理员
 */
export function isSuperAdminUser(user: any): boolean {
  if (!user) return false

  return (
    user.role === 'super_admin' ||
    user.isSuperAdmin === true
  )
}

/**
 * 获取用户角色显示名称
 * @param user 用户对象
 * @returns 角色显示名称
 */
export function getUserRoleLabel(user: any): string {
  if (!user) return '未知'

  if (isSuperAdminUser(user)) return '超级管理员'
  if (isAdminUser(user)) return '管理员'

  return user.role === 'user' ? '普通用户' : (user.role || '普通用户')
}
