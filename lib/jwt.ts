import jwt from 'jsonwebtoken'

// JWT 签名密钥必须通过环境变量 JWT_SECRET 提供，禁止内置默认密钥（防止伪造管理员 token）
const SECRET = process.env.JWT_SECRET || ''

/**
 * 生成JWT
 * @param payload 用户信息
 * @returns token字符串
 */
export function signJwt(payload: object): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

/**
 * 校验并解析JWT
 * @param token token字符串
 * @returns payload对象或null
 */
export function verifyJwt(token: string): any | null {
  try {
    return jwt.verify(token, SECRET)
  } catch {
    return null
  }
} 