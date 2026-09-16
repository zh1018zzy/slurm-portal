#!/usr/bin/env node

const ldap = require('ldapjs')
const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// 加载环境变量，优先使用.env.local，如果没有则使用.env
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const LDAP_URL = process.env.LDAP_URL || 'ldap://localhost:389'
const LDAP_BASE_DN = process.env.LDAP_BASE_DN || 'dc=my-hpc,dc=com'
const LDAP_BIND_DN = process.env.LDAP_BIND_DN || 'cn=admin,dc=my-hpc,dc=com'
const LDAP_BIND_PASSWORD = process.env.LDAP_BIND_PASSWORD || 'admin'
const LDAP_USERS_DN = `ou=users,${LDAP_BASE_DN}`

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isForce = args.includes('--force')
const isVerbose = args.includes('--verbose')

function log(msg, level = 'INFO') {
  console.log(`[${new Date().toISOString()}] [${level}] ${msg}`)
}

function logInfo(message) { log(message, 'INFO') }
function logSuccess(message) { log(message, 'SUCCESS') }
function logWarning(message) { log(message, 'WARNING') }
function logError(message) { log(message, 'ERROR') }
function logVerbose(message) { if (isVerbose) log(message, 'VERBOSE') }

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

async function getLdapUsers() {
  return new Promise((resolve, reject) => {
    const client = ldap.createClient({ url: LDAP_URL })
    const users = []

    client.bind(LDAP_BIND_DN, LDAP_BIND_PASSWORD, (err) => {
      if (err) {
        client.unbind()
        return reject(new Error(`LDAP bind失败: ${err.message}`))
      }

      const searchOpts = {
        filter: '(&(objectClass=inetOrgPerson)(objectClass=posixAccount))',
        scope: 'sub',
        attributes: ['cn', 'sn', 'displayName', 'mail', 'uid', 'uidNumber']
      }
      
      logVerbose(`搜索LDAP: ${LDAP_USERS_DN}`)
      logVerbose(`搜索过滤器: ${searchOpts.filter}`)
      
      client.search(LDAP_USERS_DN, searchOpts, (err, res) => {
        if (err) {
          client.unbind()
          return reject(new Error(`LDAP搜索失败: ${err.message}`))
        }

        res.on('searchEntry', (entry) => {
          try {
            logVerbose(`LDAP条目DN: ${entry.objectName}`)
            logVerbose(`LDAP条目属性: ${JSON.stringify(entry.attributes, null, 2)}`)
            
            // 从属性中提取用户信息
            const attrs = {}
            entry.attributes.forEach(attr => {
              attrs[attr.type] = attr.values[0]
            })
            
            const user = {
              username: attrs.cn || attrs.uid,
              real_name: attrs.displayName || attrs.sn || attrs.cn || attrs.uid,
              email: attrs.mail || `${attrs.cn || attrs.uid}@my-hpc.com`,
              uid_number: attrs.uidNumber ? parseInt(attrs.uidNumber) : null
            }
            
            if (user.username) {
              users.push(user)
              logVerbose(`从LDAP读取用户: ${user.username}`)
            } else {
              logVerbose(`跳过无效用户条目: ${JSON.stringify(attrs)}`)
            }
          } catch (error) {
            log(`解析LDAP条目时出错: ${error.message}`, 'ERROR')
          }
        })

        res.on('end', () => {
          client.unbind()
          log(`从LDAP读取到 ${users.length} 个用户`)
          resolve(users)
        })

        res.on('error', (err) => {
          client.unbind()
          reject(new Error(`LDAP搜索出错: ${err.message}`))
        })
      })
    })

    client.on('error', (err) => {
      reject(new Error(`LDAP连接错误: ${err.message}`))
    })
  })
}

async function getDatabaseUsers() {
  const { data, error } = await supabase.from('users').select('id, username, real_name, email, uid_number')
  if (error) throw new Error(`数据库查询失败: ${error.message}`)
  log(`从数据库读取到 ${data.length} 个用户`)
  return data
}

async function getBlacklistedUsers() {
  try {
    const { data, error } = await supabase.from('deleted_users_blacklist').select('username')
    if (error) {
      if (error.code === 'PGRST202' || error.message.includes('does not exist')) {
        logWarning(`黑名单表不存在，跳过黑名单检查`)
        logWarning(`如需启用黑名单功能，请运行: node scripts/setup-blacklist-table.js`)
        return new Set()
      }
      logWarning(`查询黑名单失败: ${error.message}`)
      return new Set()
    }
    const blacklistedUsernames = new Set(data.map(item => item.username))
    log(`从黑名单读取到 ${blacklistedUsernames.size} 个已删除用户`)
    return blacklistedUsernames
  } catch (error) {
    logWarning(`查询黑名单异常: ${error.message}`)
    return new Set()
  }
}

async function addUser(user) {
  if (isDryRun) {
    log(`[DRY-RUN] 将添加用户: ${user.username}`)
    return
  }

  const { error } = await supabase.from('users').insert([{
    id: generateUUID(),
    username: user.username,
    real_name: user.real_name,
    email: user.email,
    role: 'user',
    is_online: false,
    last_login_at: null,
    // 添加POSIX属性
    uid_number: user.uid_number,
    gid_number: 2000, // 默认users组（与LDAP保持一致）
    home_directory: `/home/${user.username}`,
    login_shell: '/bin/bash'
  }])

  if (error) throw new Error(`添加用户失败: ${error.message}`)
  log(`添加用户成功: ${user.username}`, 'SUCCESS')
}

async function updateUser(dbUser, ldapUser) {
  const updates = {}
  if (dbUser.real_name !== ldapUser.real_name) updates.real_name = ldapUser.real_name
  if (dbUser.email !== ldapUser.email) updates.email = ldapUser.email
  if (dbUser.uid_number !== ldapUser.uid_number && ldapUser.uid_number !== null) updates.uid_number = ldapUser.uid_number

  if (Object.keys(updates).length === 0) return

  if (isDryRun) {
    log(`[DRY-RUN] 将更新用户: ${ldapUser.username}`, updates)
    return
  }

  const { error } = await supabase.from('users').update(updates).eq('id', dbUser.id)
  if (error) throw new Error(`更新用户失败: ${error.message}`)
  log(`更新用户成功: ${ldapUser.username}`, 'SUCCESS')
}

async function deleteUser(user) {
  if (isDryRun) {
    log(`[DRY-RUN] 将删除用户: ${user.username}`, 'WARNING')
    return
  }

  const { error } = await supabase.from('users').delete().eq('id', user.id)
  if (error) throw new Error(`删除用户失败: ${error.message}`)
  log(`删除用户成功: ${user.username}`, 'WARNING')
}

async function syncUsers() {
  log('开始LDAP用户同步...')
  log(`模式: ${isDryRun ? 'DRY-RUN' : '实际执行'}`)

  try {
    const ldapUsers = await getLdapUsers()
    const dbUsers = await getDatabaseUsers()
    const blacklistedUsers = await getBlacklistedUsers()

    const ldapMap = new Map(ldapUsers.map(u => [u.username, u]))
    const dbMap = new Map(dbUsers.map(u => [u.username, u]))

    let added = 0, updated = 0, deleted = 0, skipped = 0, errors = 0

    // 处理新增和更新
    for (const ldapUser of ldapUsers) {
      try {
        // 🔍 检查用户是否在黑名单中
        if (blacklistedUsers.has(ldapUser.username)) {
          logWarning(`跳过黑名单用户: ${ldapUser.username}（该用户已被管理员删除）`)
          skipped++
          continue
        }
        
        const dbUser = dbMap.get(ldapUser.username)
        if (!dbUser) {
          await addUser(ldapUser)
          added++
        } else {
          await updateUser(dbUser, ldapUser)
          updated++
        }
      } catch (error) {
        log(`处理用户 ${ldapUser.username} 时出错: ${error.message}`, 'ERROR')
        errors++
      }
    }

    // 处理删除（仅在强制模式下）
    if (isForce) {
      for (const dbUser of dbUsers) {
        if (!ldapMap.has(dbUser.username)) {
          try {
            await deleteUser(dbUser)
            deleted++
          } catch (error) {
            log(`删除用户 ${dbUser.username} 时出错: ${error.message}`, 'ERROR')
            errors++
          }
        }
      }
    }

    log('同步完成！', 'SUCCESS')
    log(`统计: 新增=${added}, 更新=${updated}${isForce ? `, 删除=${deleted}` : ''}, 跳过黑名单=${skipped}${errors > 0 ? `, 错误=${errors}` : ''}`)

  } catch (error) {
    log(`同步失败: ${error.message}`, 'ERROR')
    process.exit(1)
  }
}

if (args.includes('--help')) {
  console.log(`
LDAP用户同步脚本

用法: node scripts/ldap-sync.js [options]

选项:
  --dry-run    仅显示操作，不实际执行
  --force      强制删除数据库中存在但LDAP中不存在的用户
  --help       显示帮助

示例:
  node scripts/ldap-sync.js --dry-run
  node scripts/ldap-sync.js --force
`)
  process.exit(0)
}

syncUsers() 