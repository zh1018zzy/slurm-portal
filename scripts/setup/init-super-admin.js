#!/usr/bin/env node
/**
 * 安装 / 重置超级管理员
 *
 * 交互：
 *   npm run setup:super-admin
 *   node scripts/setup/init-super-admin.js
 *
 * 非交互：
 *   SUPER_ADMIN_USERNAME=admin SUPER_ADMIN_PASSWORD='...' \
 *     node scripts/setup/init-super-admin.js --yes
 *
 * 依赖 .env 中的 JWT_SECRET，或 SUPER_ADMIN_CRYPTO_KEY（专用加密密钥，推荐）。
 * 算法与 lib/super-admin.ts 保持一致。
 */

const fs = require('fs')
const path = require('path')
const readline = require('readline')
const crypto = require('crypto')

require('dotenv').config({ path: path.resolve(process.cwd(), '.env') })
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') })

const CREDENTIAL_PATH = path.resolve(process.cwd(), 'config/super-admin.enc')
const KEY_SALT = 'slurm-portal-super-admin-v1'
const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const HASH_KEYLEN = 64
const AES_KEYLEN = 32

function deriveAesKey(secret) {
  return crypto.scryptSync(secret, KEY_SALT, AES_KEYLEN)
}

function encryptPayload(plaintext, secret) {
  const key = deriveAesKey(secret)
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), encrypted.toString('base64url')].join('.')
}

function hashPassword(password) {
  const saltBuf = crypto.randomBytes(16)
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

function saveSuperAdminCredentials({ username, password, cryptoSecret }) {
  const name = String(username || '').trim()
  if (!name) throw new Error('用户名不能为空')
  if (!password || String(password).length < 8) throw new Error('密码至少 8 位')
  if (!cryptoSecret) throw new Error('缺少加密密钥（SUPER_ADMIN_CRYPTO_KEY 或 JWT_SECRET）')

  const now = new Date().toISOString()
  const record = {
    version: 1,
    id: crypto.randomUUID(),
    username: name,
    password: hashPassword(String(password)),
    createdAt: now,
    updatedAt: now
  }

  fs.mkdirSync(path.dirname(CREDENTIAL_PATH), { recursive: true })
  const tmp = `${CREDENTIAL_PATH}.tmp-${process.pid}`
  fs.writeFileSync(tmp, encryptPayload(JSON.stringify(record), cryptoSecret), {
    encoding: 'utf8',
    mode: 0o600
  })
  fs.renameSync(tmp, CREDENTIAL_PATH)
  try {
    fs.chmodSync(CREDENTIAL_PATH, 0o600)
  } catch (_) {}
  return record
}

function getCryptoSecret() {
  const key = process.env.SUPER_ADMIN_CRYPTO_KEY || process.env.JWT_SECRET
  if (!key || key === 'change-me-to-a-random-secret' || key === 'slurm-portal-dev-secret') {
    return null
  }
  return key
}

function ask(rl, question, { silent = false } = {}) {
  return new Promise((resolve) => {
    if (!silent) {
      rl.question(question, resolve)
      return
    }
    const stdin = process.stdin
    const stdout = process.stdout
    stdout.write(question)
    let input = ''
    stdin.setRawMode?.(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        stdin.setRawMode?.(false)
        stdin.removeListener('data', onData)
        stdout.write('\n')
        resolve(input)
        return
      }
      if (char === '\u0003') process.exit(1)
      if (char === '\u007f' || char === '\b') {
        input = input.slice(0, -1)
        return
      }
      input += char
      stdout.write('*')
    }
    stdin.on('data', onData)
  })
}

async function main() {
  const nonInteractive = process.argv.includes('--yes') || process.argv.includes('-y')
  const cryptoSecret = getCryptoSecret()

  console.log('=== slurm-portal 超级管理员初始化 ===\n')

  if (!cryptoSecret) {
    console.error('错误: 请先在 .env 中设置 JWT_SECRET（或 SUPER_ADMIN_CRYPTO_KEY），且勿使用占位默认值。')
    console.error('示例: JWT_SECRET=$(openssl rand -hex 32)')
    process.exit(1)
  }

  if (fs.existsSync(CREDENTIAL_PATH) && !nonInteractive) {
    console.log(`检测到已有凭证文件: ${CREDENTIAL_PATH}`)
    console.log('继续操作将覆盖现有超级管理员。\n')
  }

  let username
  let password

  if (nonInteractive) {
    username = process.env.SUPER_ADMIN_USERNAME
    password = process.env.SUPER_ADMIN_PASSWORD
    if (!username || !password) {
      console.error('非交互模式需要 SUPER_ADMIN_USERNAME 与 SUPER_ADMIN_PASSWORD')
      process.exit(1)
    }
  } else {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    username = (await ask(rl, '超级管理员用户名 [admin]: ')).trim() || 'admin'
    password = await ask(rl, '超级管理员密码（至少 8 位）: ', { silent: true })
    const confirm = await ask(rl, '再次输入密码: ', { silent: true })
    rl.close()
    if (password !== confirm) {
      console.error('两次密码不一致')
      process.exit(1)
    }
  }

  try {
    const record = saveSuperAdminCredentials({ username, password, cryptoSecret })
    console.log('\n已写入加密凭证:')
    console.log(`  文件: ${CREDENTIAL_PATH}`)
    console.log(`  用户: ${record.username}`)
    console.log(`  ID:   ${record.id}`)
    console.log('  权限: 0600；密码 scrypt 哈希；文件 AES-256-GCM 加密')
    console.log('\n请妥善保管密码；勿将 config/super-admin.enc 提交到 Git。')
  } catch (error) {
    console.error('保存失败:', error.message || error)
    process.exit(1)
  }
}

main()
