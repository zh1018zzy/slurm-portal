#!/usr/bin/env node

/**
 * 清理孤立的Supabase Auth用户账号
 * 删除auth.users表中没有对应业务用户的认证账号
 */

const { createClient } = require('@supabase/supabase-js')
const dotenv = require('dotenv')

// 加载环境变量
dotenv.config({ path: '.env.local' })
dotenv.config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
)

const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const isVerbose = args.includes('--verbose')

function log(msg, level = 'INFO') {
  console.log(`[${new Date().toISOString()}] [${level}] ${msg}`)
}

function logInfo(message) { log(message, 'INFO') }
function logSuccess(message) { log(message, 'SUCCESS') }
function logWarning(message) { log(message, 'WARNING') }
function logError(message) { log(message, 'ERROR') }
function logVerbose(message) { if (isVerbose) log(message, 'VERBOSE') }

async function cleanupOrphanAuthUsers() {
  logInfo('开始清理孤立的认证用户账号...')
  logInfo(`模式: ${isDryRun ? 'DRY-RUN' : '实际执行'}`)

  try {
    // 1. 获取所有auth用户
    logInfo('获取Supabase Auth用户列表...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    if (authError) {
      throw new Error(`获取Auth用户失败: ${authError.message}`)
    }
    logInfo(`Auth用户总数: ${authUsers.users.length}`)

    // 2. 获取所有业务用户
    logInfo('获取业务用户列表...')
    const { data: bizUsers, error: bizError } = await supabase
      .from('users')
      .select('id, username, email')
    if (bizError) {
      throw new Error(`获取业务用户失败: ${bizError.message}`)
    }
    logInfo(`业务用户总数: ${bizUsers.length}`)

    // 3. 创建业务用户ID集合
    const bizUserIds = new Set(bizUsers.map(u => u.id))
    const bizUserEmails = new Set(bizUsers.map(u => u.email).filter(Boolean))

    // 4. 找出孤立的auth用户
    const orphanUsers = authUsers.users.filter(authUser => {
      // 检查ID和邮箱都不在业务表中
      return !bizUserIds.has(authUser.id) && !bizUserEmails.has(authUser.email)
    })

    logInfo(`发现 ${orphanUsers.length} 个孤立的认证用户`)

    if (orphanUsers.length === 0) {
      logSuccess('没有发现孤立的认证用户，清理完成')
      return
    }

    // 5. 显示孤立用户详情
    orphanUsers.forEach(user => {
      logVerbose(`孤立用户: ${user.email || user.id} (ID: ${user.id})`)
    })

    // 6. 删除孤立用户
    let deletedCount = 0
    let errorCount = 0

    for (const user of orphanUsers) {
      try {
        if (isDryRun) {
          logInfo(`[DRY-RUN] 将删除认证用户: ${user.email || user.id}`)
          deletedCount++
        } else {
          const { error } = await supabase.auth.admin.deleteUser(user.id)
          if (error) {
            logError(`删除用户 ${user.email || user.id} 失败: ${error.message}`)
            errorCount++
          } else {
            logSuccess(`已删除认证用户: ${user.email || user.id}`)
            deletedCount++
          }
        }
      } catch (error) {
        logError(`删除用户 ${user.email || user.id} 时发生错误: ${error.message}`)
        errorCount++
      }
    }

    // 7. 输出统计结果
    logInfo('清理完成！')
    logSuccess(`统计结果: 删除=${deletedCount}${errorCount > 0 ? `, 错误=${errorCount}` : ''}`)

  } catch (error) {
    logError(`清理过程中发生错误: ${error.message}`)
    process.exit(1)
  }
}

// 显示帮助信息
function showHelp() {
  console.log(`
清理孤立的Supabase Auth用户账号

用法: node scripts/cleanup-orphan-auth-users.js [选项]

选项:
  --dry-run    仅显示将要进行的操作，不实际执行
  --verbose    详细输出
  --help       显示此帮助信息

示例:
  node scripts/cleanup-orphan-auth-users.js --dry-run --verbose
  node scripts/cleanup-orphan-auth-users.js
`)
}

// 主程序入口
async function main() {
  if (args.includes('--help')) {
    showHelp()
    return
  }

  // 检查必要的环境变量
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    logError('缺少必要的环境变量: SUPABASE_SERVICE_ROLE_KEY')
    logError('需要Service Role Key才能删除认证用户')
    process.exit(1)
  }

  try {
    await cleanupOrphanAuthUsers()
  } catch (error) {
    logError(`程序执行失败: ${error.message}`)
    process.exit(1)
  }
}

main() 