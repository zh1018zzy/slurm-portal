/**
 * 超级管理员认证
 *
 * 凭证在安装时由 scripts/setup/init-super-admin.js 生成：
 * - 密码使用 scrypt 单向哈希（不明文存储）
 * - 整份凭证文件使用 AES-256-GCM 加密写入 config/super-admin.enc
 * - 加密密钥来自 SUPER_ADMIN_CRYPTO_KEY（优先）或 JWT_SECRET
 */

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const CREDENTIAL_PATH = path.resolve(process.cwd(), 'config/super-admin.enc')
const KEY_SALT = 'slurm-portal-super-admin-v1'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const HASH_KEYLEN = 64
const AES_KEYLEN = 32

export interface SuperAdminUserInfo {
  id: string
  username: string
  role: string
  isAdmin: boolean
  isSuperAdmin: boolean
}

interface PasswordRecord {
  algorithm: 'scrypt'
  salt: string
  hash: string
  N: number
  r: number
  p: number
  keylen: number
}

interface SuperAdminRecord {
  version: 1
  id: string
  username: string
  password: PasswordRecord
  createdAt: string
  updatedAt: string
}

interface CacheEntry {
  mtimeMs: number
  record: SuperAdminRecord
}

let cache: CacheEntry | null = null

function getCryptoPassword(): string | null {
  const key = process.env.SUPER_ADMIN_CRYPTO_KEY || process.env.JWT_SECRET
  if (!key || key === 'change-me-to-a-random-secret' || key === 'slurm-portal-dev-secret') {
    return null
  }
  return key
}

function deriveAesKey(secret: string): Buffer {
  return crypto.scryptSync(secret, KEY_SALT, AES_KEYLEN)
}

function encryptPayload(plaintext: string, secret: string): string {
  const key = deriveAesKey(secret)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [
    'v1',
    iv.toString('base64url'),
    tag.toString('base64url'),
    encrypted.toString('base64url')
  ].join('.')
}

function decryptPayload(blob: string, secret: string): string {
  const parts = blob.trim().split('.')
  if (parts.length !== 4 || parts[0] !== 'v1') {
    throw new Error('超级管理员凭证文件格式无效')
  }
  const [, ivB64, tagB64, dataB64] = parts
  const key = deriveAesKey(secret)
  const iv = Buffer.from(ivB64, 'base64url')
  const tag = Buffer.from(tagB64, 'base64url')
  const data = Buffer.from(dataB64, 'base64url')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8')
}

export function hashPassword(password: string, salt?: Buffer): PasswordRecord {
  const saltBuf = salt || crypto.randomBytes(16)
  const hash = crypto.scryptSync(password, saltBuf, HASH_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P
  })
  return {
    algorithm: 'scrypt',
    salt: saltBuf.toString('base64url'),
    hash: hash.toString('base64url'),
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    keylen: HASH_KEYLEN
  }
}

function verifyPassword(password: string, record: PasswordRecord): boolean {
  if (record.algorithm !== 'scrypt') return false
  const saltBuf = Buffer.from(record.salt, 'base64url')
  const expected = Buffer.from(record.hash, 'base64url')
  const actual = crypto.scryptSync(password, saltBuf, record.keylen || HASH_KEYLEN, {
    N: record.N || SCRYPT_N,
    r: record.r || SCRYPT_R,
    p: record.p || SCRYPT_P
  })
  if (actual.length !== expected.length) return false
  return crypto.timingSafeEqual(actual, expected)
}

function loadRecord(): SuperAdminRecord | null {
  try {
    if (!fs.existsSync(CREDENTIAL_PATH)) {
      cache = null
      return null
    }
    const stat = fs.statSync(CREDENTIAL_PATH)
    if (cache && cache.mtimeMs === stat.mtimeMs) {
      return cache.record
    }

    const secret = getCryptoPassword()
    if (!secret) {
      console.error('[super-admin] 缺少 SUPER_ADMIN_CRYPTO_KEY 或 JWT_SECRET，无法解密超级管理员凭证')
      return null
    }

    const blob = fs.readFileSync(CREDENTIAL_PATH, 'utf8')
    const record = JSON.parse(decryptPayload(blob, secret)) as SuperAdminRecord
    if (!record?.username || !record?.password?.hash || !record?.id) {
      throw new Error('凭证内容不完整')
    }
    cache = { mtimeMs: stat.mtimeMs, record }
    return record
  } catch (error) {
    console.error('[super-admin] 读取凭证失败:', error)
    cache = null
    return null
  }
}

export function getSuperAdminCredentialPath(): string {
  return CREDENTIAL_PATH
}

export function hasSuperAdminConfigured(): boolean {
  return fs.existsSync(CREDENTIAL_PATH)
}

/**
 * 写入加密凭证文件（安装脚本 / 重置工具使用）
 */
export function saveSuperAdminCredentials(options: {
  username: string
  password: string
  id?: string
  cryptoSecret: string
}): SuperAdminRecord {
  const username = options.username.trim()
  if (!username) throw new Error('用户名不能为空')
  if (!options.password || options.password.length < 8) {
    throw new Error('密码至少 8 位')
  }
  if (!options.cryptoSecret) {
    throw new Error('缺少加密密钥（SUPER_ADMIN_CRYPTO_KEY 或 JWT_SECRET）')
  }

  const now = new Date().toISOString()
  const existing = (() => {
    try {
      return loadRecord()
    } catch {
      return null
    }
  })()

  const record: SuperAdminRecord = {
    version: 1,
    id: options.id || existing?.id || crypto.randomUUID(),
    username,
    password: hashPassword(options.password),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  }

  const dir = path.dirname(CREDENTIAL_PATH)
  fs.mkdirSync(dir, { recursive: true })
  const tmp = `${CREDENTIAL_PATH}.tmp-${process.pid}`
  const blob = encryptPayload(JSON.stringify(record), options.cryptoSecret)
  fs.writeFileSync(tmp, blob, { encoding: 'utf8', mode: 0o600 })
  fs.renameSync(tmp, CREDENTIAL_PATH)
  try {
    fs.chmodSync(CREDENTIAL_PATH, 0o600)
  } catch {
    // ignore on unsupported platforms
  }
  cache = null
  return record
}

export async function authenticateSuperAdmin(
  username: string,
  password: string
): Promise<SuperAdminUserInfo | null> {
  const record = loadRecord()
  if (!record) return null
  if (username !== record.username) return null
  if (!verifyPassword(password, record.password)) return null

  return {
    id: record.id,
    username: record.username,
    role: 'super_admin',
    isAdmin: true,
    isSuperAdmin: true
  }
}

export function isSuperAdmin(userInfo: any): boolean {
  return userInfo?.isSuperAdmin === true || userInfo?.role === 'super_admin'
}

export function verifySuperAdminToken(decoded: any): boolean {
  if (!(decoded?.isSuperAdmin === true || decoded?.role === 'super_admin')) {
    return false
  }
  const record = loadRecord()
  if (!record) return false
  return decoded?.username === record.username && decoded?.id === record.id
}
