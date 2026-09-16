import crypto from 'crypto'

/**
 * 超级管理员配置
 * 独立于现有认证系统，具有最高权限
 */

// 超级管理员凭证配置
const SUPER_ADMIN_CONFIG = {
  username: 'vtadmin',
  // 密码: Vtkj2407 的SHA256哈希值
  passwordHash: crypto.createHash('sha256').update('Vtkj2407').digest('hex'),
  role: 'super_admin',
  id: 'super-admin-001'
}

/**
 * 验证超级管理员凭证
 * @param username 用户名
 * @param password 密码
 * @returns 认证成功返回用户信息，否则返回null
 */
export async function authenticateSuperAdmin(
  username: string,
  password: string
): Promise<{ id: string; username: string; role: string; isAdmin: boolean; isSuperAdmin: boolean } | null> {
  // 验证用户名
  if (username !== SUPER_ADMIN_CONFIG.username) {
    return null
  }

  // 验证密码（使用哈希比对）
  const inputPasswordHash = crypto.createHash('sha256').update(password).digest('hex')
  if (inputPasswordHash !== SUPER_ADMIN_CONFIG.passwordHash) {
    return null
  }

  // 认证成功，返回超级管理员信息
  return {
    id: SUPER_ADMIN_CONFIG.id,
    username: SUPER_ADMIN_CONFIG.username,
    role: SUPER_ADMIN_CONFIG.role,
    isAdmin: true,
    isSuperAdmin: true
  }
}

/**
 * 检查用户是否为超级管理员
 * @param userInfo 用户信息对象
 * @returns 是否为超级管理员
 */
export function isSuperAdmin(userInfo: any): boolean {
  return userInfo?.isSuperAdmin === true || userInfo?.role === 'super_admin'
}

/**
 * 验证超级管理员token中的信息
 * @param decoded JWT解码后的信息
 * @returns 是否为有效的超级管理员
 */
export function verifySuperAdminToken(decoded: any): boolean {
  return (
    decoded?.username === SUPER_ADMIN_CONFIG.username &&
    decoded?.id === SUPER_ADMIN_CONFIG.id &&
    (decoded?.isSuperAdmin === true || decoded?.role === 'super_admin')
  )
}
