import { signJwt } from './jwt'

/**
 * 管理员配置
 */
export interface AdminConfig {
  username: string
  role: string
  isAdmin: boolean
}

/**
 * 默认管理员配置
 */
const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  username: 'demo_user',
  role: 'admin',
  isAdmin: true
}

/**
 * 生成管理员token
 * @param config 管理员配置
 * @returns JWT token
 */
export function generateAdminToken(config: AdminConfig = DEFAULT_ADMIN_CONFIG): string {
  return signJwt(config)
}

/**
 * 获取当前管理员token
 * 如果环境变量中有配置，则使用环境变量中的token
 * 否则生成一个新的token
 */
export function getAdminToken(): string {
  // 优先使用环境变量中的token
  const envToken = process.env.ADMIN_TOKEN
  if (envToken) {
    return envToken
  }
  
  // 否则生成新的token
  return generateAdminToken()
}

/**
 * 验证管理员token是否有效
 * @param token 要验证的token
 * @returns 是否有效
 */
export function validateAdminToken(token: string): boolean {
  try {
    const { verifyJwt } = require('./jwt')
    const decoded = verifyJwt(token)
    return decoded && decoded.isAdmin === true
  } catch {
    return false
  }
} 