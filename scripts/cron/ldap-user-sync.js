#!/usr/bin/env node

/**
 * LDAP用户同步脚本
 * 将LDAP中的用户同步到Supabase数据库中
 */

import ldap from 'ldapjs'
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// 加载环境变量
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
dotenv.config({ path: join(__dirname, '../../.env.local') })

// 配置
const LDAP_URL = process.env.LDAP_URL || 'ldap://localhost:389'
const LDAP_BASE_DN = process.env.LDAP_BASE_DN || 'dc=my-hpc,dc=com'
const LDAP_BIND_DN = process.env.LDAP_BIND_DN || 'cn=admin,dc=my-hpc,dc=com'
const LDAP_BIND_PASSWORD = process.env.LDAP_BIND_PASSWORD || 'admin'
const LDAP_USERS_DN = `ou=users,${LDAP_BASE_DN}`

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// 初始化Supabase客户端
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY)

// 命令行参数解析
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isForce = args.includes('--force')
const isVerbose = args.includes('--verbose')

// 日志函数
function log(message, level = 'INFO') {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${level}] ${message}`)
}

function logInfo(message) { log(message, 'INFO') }
function logSuccess(message) { log(message, 'SUCCESS') }
function logWarning(message) { log(message, 'WARNING') }
function logError(message) { log(message, 'ERROR') }
function logVerbose(message) { if (isVerbose) log(message, 'VERBOSE') }

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c == 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 从LDAP获取所有用户
async function getLdapUsers() {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: LDAP_URL })
    const users = []

    client.bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD, (err) => {
      if (err) {
        client.unbind()
        return reject(new Error(`LDAP管理员bind失败: ${err.message}`))
      }

      const searchOpts = {
        filter: '(objectClass=inetOrgPerson)',
        scope: 'sub',
        attributes: ['cn', 'sn', 'givenName', 'displayName', 'mail', 'uid', 'uidNumber', 'description']
      }

      client.search(LDAP_USERS_DN, searchOpts, (err, res) => {
        if (err) {
          client.unbind()
          return reject(new Error(`LDAP搜索失败: ${err.message}`))
        }

        res.on('searchEntry', (entry) => {
          const user = {
            username: entry.object.cn,
            real_name: entry.object.displayName || entry.object.sn || entry.object.cn,
            email: entry.object.mail || `${entry.object.cn}@my-hpc.com`,
            uid: entry.object.uidNumber,
            description: entry.object.description
          }
          users.push(user)
          logVerbose(`从LDAP读取用户: ${user.username}`)
        })

        res.on('error', (err) => {
          client.unbind()
          reject(new Error(`LDAP搜索出错: ${err.message}`))
        })

        res.on('end', () => {
          client.unbind()
          logInfo(`从LDAP读取到 ${users.length} 个用户`)
          resolve(users)
        })
      })
    })

    client.on('error', (err) => {
      reject(new Error(`LDAP连接错误: ${err.message}`))
    })
  })
}

// 从数据库获取所有用户
async function getDatabaseUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, real_name, email, role, created_at')

  if (error) {
    throw new Error(`数据库查询失败: ${error.message}`)
  }

  logInfo(`从数据库读取到 ${data.length} 个用户`)
  return data
}

// 添加用户到数据库
async function addUserToDatabase(user) {
  const userData = {
    id: generateUUID(),
    username: user.username,
    real_name: user.real_name,
    email: user.email,
    role: 'user',
    is_online: false,
    last_login_at: null,
    created_at: new Date().toISOString()
  }

  if (isDryRun) {
    logInfo(`[DRY-RUN] 将添加用户: ${user.username}`)
    return { success: true, user: userData }
  }

  const { data, error } = await supabase
    .from('users')
    .insert([userData])
    .select()

  if (error) {
    throw new Error(`添加用户失败: ${error.message}`)
  }

  logSuccess(`添加用户成功: ${user.username}`)
  return { success: true, user: data[0] }
}

// 更新数据库中的用户
async function updateUserInDatabase(dbUser, ldapUser) {
  const updates = {}
  let hasChanges = false

  if (dbUser.real_name !== ldapUser.real_name) {
    updates.real_name = ldapUser.real_name
    hasChanges = true
  }

  if (dbUser.email !== ldapUser.email) {
    updates.email = ldapUser.email
    hasChanges = true
  }

  if (!hasChanges) {
    logVerbose(`用户 ${ldapUser.username} 无需更新`)
    return { success: true, updated: false }
  }

  if (isDryRun) {
    logInfo(`[DRY-RUN] 将更新用户: ${ldapUser.username}`, updates)
    return { success: true, updated: true }
  }

  const { error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', dbUser.id)

  if (error) {
    throw new Error(`更新用户失败: ${error.message}`)
  }

  logSuccess(`更新用户成功: ${ldapUser.username}`)
  return { success: true, updated: true }
}

// 删除数据库中的用户
async function deleteUserFromDatabase(user) {
  if (isDryRun) {
    logWarning(`[DRY-RUN] 将删除用户: ${user.username}`)
    return { success: true }
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', user.id)

  if (error) {
    throw new Error(`删除用户失败: ${error.message}`)
  }

  logWarning(`删除用户成功: ${user.username}`)
  return { success: true }
}

// 主同步函数
async function syncUsers() {
  logInfo('开始LDAP用户同步...')
  logInfo(`模式: ${isDryRun ? 'DRY-RUN' : '实际执行'}`)
  logInfo(`强制删除: ${isForce ? '是' : '否'}`)

  try {
    const ldapUsers = await getLdapUsers()
    const dbUsers = await getDatabaseUsers()

    const ldapUserMap = new Map(ldapUsers.map(u => [u.username, u]))
    const dbUserMap = new Map(dbUsers.map(u => [u.username, u]))

    let added = 0, updated = 0, deleted = 0, errors = 0

    // 处理新增和更新的用户
    for (const ldapUser of ldapUsers) {
      try {
        const dbUser = dbUserMap.get(ldapUser.username)
        
        if (!dbUser) {
          await addUserToDatabase(ldapUser)
          added++
        } else {
          const result = await updateUserInDatabase(dbUser, ldapUser)
          if (result.updated) updated++
        }
      } catch (error) {
        logError(`处理用户 ${ldapUser.username} 时出错: ${error.message}`)
        errors++
      }
    }

    // 处理删除的用户（仅在强制模式下）
    if (isForce) {
      for (const dbUser of dbUsers) {
        if (!ldapUserMap.has(dbUser.username)) {
          try {
            await deleteUserFromDatabase(dbUser)
            deleted++
          } catch (error) {
            logError(`删除用户 ${dbUser.username} 时出错: ${error.message}`)
            errors++
          }
        }
      }
    }

    // 输出统计结果
    logInfo('同步完成！')
    logSuccess(`统计结果: 新增=${added}, 更新=${updated}${isForce ? `, 删除=${deleted}` : ''}${errors > 0 ? `, 错误=${errors}` : ''}`)

  } catch (error) {
    logError(`同步过程中发生错误: ${error.message}`)
    process.exit(1)
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
LDAP用户同步脚本

使用方法:
  node scripts/ldap-user-sync.js [options]

选项:
  --dry-run    仅显示将要进行的操作，不实际执行
  --force      强制同步，包括删除数据库中存在但LDAP中不存在的用户
  --verbose    详细输出
  --help       显示此帮助信息

示例:
  node scripts/ldap-user-sync.js --dry-run --verbose
  node scripts/ldap-user-sync.js --force
  node scripts/ldap-user-sync.js
`)
}

// 主程序入口
async function main() {
  if (args.includes('--help')) {
    showHelp()
    return
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    logError('缺少必要的环境变量: NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  if (!LDAP_URL || !LDAP_BIND_DN || !LDAP_BIND_PASSWORD) {
    logError('缺少必要的LDAP环境变量')
    process.exit(1)
  }

  try {
    await syncUsers()
  } catch (error) {
    logError(`程序执行失败: ${error.message}`)
    process.exit(1)
  }
}

main() 