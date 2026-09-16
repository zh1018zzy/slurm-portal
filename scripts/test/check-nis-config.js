#!/usr/bin/env node

/**
 * NIS 环境配置检查脚本
 */

const { exec } = require('child_process')
const { promisify } = require('util')

const execPromise = promisify(exec)

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, ...args) {
  console.log(color, ...args, colors.reset)
}

function success(msg) {
  log(colors.green, '✅', msg)
}

function error(msg) {
  log(colors.red, '❌', msg)
}

function info(msg) {
  log(colors.blue, 'ℹ️', msg)
}

function warn(msg) {
  log(colors.yellow, '⚠️', msg)
}

async function checkCommand(command, description) {
  try {
    const { stdout } = await execPromise(`which ${command}`)
    if (stdout.trim()) {
      success(`${description} (${command}) - 已安装: ${stdout.trim()}`)
      return true
    }
  } catch (err) {
    error(`${description} (${command}) - 未安装`)
    return false
  }
  return false
}

async function runCommand(command, description, optional = false) {
  try {
    const { stdout, stderr } = await execPromise(command)
    const output = (stdout + stderr).trim()

    if (output && output !== '(none)') {
      success(`${description}`)
      if (output) {
        console.log('  输出:', output)
      }
      return true
    } else if (optional) {
      warn(`${description} - 未配置（可选）`)
      return false
    } else {
      error(`${description} - 未配置`)
      return false
    }
  } catch (err) {
    if (optional) {
      warn(`${description} - 未配置（可选）`)
    } else {
      error(`${description} - 检查失败: ${err.message}`)
    }
    return false
  }
}

async function checkNisEnvironment() {
  console.log('\n' + '='.repeat(60))
  info('NIS 环境配置检查')
  console.log('='.repeat(60) + '\n')

  let checks = {
    required: 0,
    optional: 0,
    requiredPassed: 0,
    optionalPassed: 0
  }

  // 1. 检查必需的命令
  info('检查必需的系统命令:')
  console.log('')

  checks.required++
  if (await checkCommand('getent', 'getent 命令')) checks.requiredPassed++

  checks.required++
  if (await checkCommand('useradd', 'useradd 命令')) checks.requiredPassed++

  checks.required++
  if (await checkCommand('usermod', 'usermod 命令')) checks.requiredPassed++

  checks.required++
  if (await checkCommand('userdel', 'userdel 命令')) checks.requiredPassed++

  checks.required++
  if (await checkCommand('chpasswd', 'chpasswd 命令')) checks.requiredPassed++

  console.log('')

  // 2. 检查可选的 NIS 命令
  info('检查可选的 NIS 命令:')
  console.log('')

  checks.optional++
  if (await checkCommand('ypdomainname', 'ypdomainname 命令')) checks.optionalPassed++

  checks.optional++
  if (await checkCommand('ypwhich', 'ypwhich 命令')) checks.optionalPassed++

  checks.optional++
  if (await checkCommand('ypcat', 'ypcat 命令')) checks.optionalPassed++

  console.log('')

  // 3. 检查 NIS 配置
  info('检查 NIS 配置:')
  console.log('')

  checks.optional++
  if (await runCommand('ypdomainname', 'NIS 域名配置', true)) checks.optionalPassed++

  checks.optional++
  if (await runCommand('ypwhich', 'NIS 服务器连接', true)) checks.optionalPassed++

  console.log('')

  // 4. 检查 nsswitch 配置
  info('检查 nsswitch 配置:')
  console.log('')

  try {
    const { stdout } = await execPromise('cat /etc/nsswitch.conf | grep -E "^(passwd|shadow|group):"')
    if (stdout) {
      success('nsswitch.conf 配置:')
      stdout.split('\n').forEach(line => {
        if (line.trim()) {
          console.log('  ', line)
          if (line.includes('nis')) {
            success('  └─ 已配置 NIS 查询')
          } else {
            warn('  └─ 未配置 NIS 查询（仅使用本地文件）')
          }
        }
      })
    }
  } catch (err) {
    error('无法读取 nsswitch.conf')
  }

  console.log('')

  // 5. 检查当前用户权限
  info('检查当前用户权限:')
  console.log('')

  try {
    const { stdout: uid } = await execPromise('id -u')
    const currentUid = parseInt(uid.trim())

    if (currentUid === 0) {
      success('当前以 root 用户运行，拥有完整权限')
    } else {
      warn('当前非 root 用户运行')
      warn('用户管理操作可能需要 sudo 权限')

      // 检查 sudo 权限
      try {
        await execPromise('sudo -n true', { timeout: 1000 })
        success('当前用户拥有 sudo 权限')
      } catch (err) {
        error('当前用户没有 sudo 权限或需要密码')
        error('请配置免密 sudo 或以 root 用户运行应用')
      }
    }
  } catch (err) {
    error('无法检查用户权限')
  }

  console.log('')

  // 6. 测试用户查询
  info('测试用户查询功能:')
  console.log('')

  try {
    const { stdout } = await execPromise("getent passwd | awk -F: '$3 >= 1000 {print}' | head -5")
    if (stdout) {
      success('可以查询系统用户（显示前 5 个 UID >= 1000 的用户）:')
      stdout.split('\n').forEach(line => {
        if (line.trim()) {
          const parts = line.split(':')
          console.log(`  - ${parts[0]} (UID: ${parts[2]}, Home: ${parts[5]})`)
        }
      })
    }
  } catch (err) {
    error('用户查询测试失败')
  }

  console.log('')

  // 7. 检查 /var/yp 目录（NIS 服务器）
  info('检查 NIS 服务器配置（可选）:')
  console.log('')

  try {
    const { stdout } = await execPromise('ls -ld /var/yp 2>/dev/null || echo "not found"')
    if (stdout.includes('not found')) {
      warn('/var/yp 目录不存在（不是 NIS 服务器）')
      warn('用户创建后不会自动同步到 NIS 数据库')
    } else {
      success('/var/yp 目录存在')
      console.log('  ', stdout.trim())

      try {
        const { stdout: makeFile } = await execPromise('ls /var/yp/Makefile 2>/dev/null || echo "not found"')
        if (makeFile.includes('not found')) {
          warn('NIS Makefile 不存在')
        } else {
          success('NIS Makefile 存在，可以更新 NIS 数据库')
        }
      } catch (err) {
        // ignore
      }
    }
  } catch (err) {
    warn('无法检查 /var/yp 目录')
  }

  console.log('')

  // 8. 环境变量检查
  info('检查应用环境变量:')
  console.log('')

  const authMode = process.env.AUTH_MODE || 'linux'
  console.log('  AUTH_MODE:', authMode)

  if (authMode === 'linux') {
    success('认证模式设置为 linux（将使用 NIS/本地用户认证）')
  } else if (authMode === 'ldap') {
    info('认证模式设置为 ldap（将使用 LDAP 认证）')
    warn('当前测试针对 NIS 认证，请将 AUTH_MODE 设置为 linux')
  } else {
    error(`未知的认证模式: ${authMode}`)
  }

  console.log('')

  // 总结
  console.log('='.repeat(60))
  info('检查总结')
  console.log('='.repeat(60))
  console.log('')

  console.log('必需功能:')
  if (checks.requiredPassed === checks.required) {
    success(`  全部通过 (${checks.requiredPassed}/${checks.required})`)
  } else {
    error(`  未全部通过 (${checks.requiredPassed}/${checks.required})`)
  }

  console.log('')
  console.log('可选功能 (NIS 特性):')
  if (checks.optionalPassed > 0) {
    success(`  部分可用 (${checks.optionalPassed}/${checks.optional})`)
  } else {
    warn(`  未配置 (${checks.optionalPassed}/${checks.optional})`)
  }

  console.log('')

  if (checks.requiredPassed === checks.required) {
    success('✅ 系统已准备好使用 Linux/NIS 用户认证')

    if (checks.optionalPassed === 0) {
      console.log('')
      warn('提示: NIS 未配置，系统将使用本地用户认证')
      warn('这对于单机或小型集群来说是正常的')
      info('如需配置 NIS，请参考文档: docs/system/permissions/NIS-AUTHENTICATION-GUIDE.md')
    } else if (checks.optionalPassed < checks.optional) {
      console.log('')
      warn('提示: NIS 部分配置，可能不是 NIS 主服务器')
      info('用户管理功能仍然可用，但可能无法自动同步到 NIS 数据库')
    } else {
      console.log('')
      success('✨ NIS 完全配置，所有功能可用')
    }
  } else {
    console.log('')
    error('❌ 系统缺少必需的组件，请安装相关工具')
    console.log('')
    info('Ubuntu/Debian 安装命令:')
    console.log('  sudo apt-get install passwd')
    console.log('')
    info('CentOS/RHEL 安装命令:')
    console.log('  sudo yum install shadow-utils')
  }

  console.log('')
  console.log('='.repeat(60) + '\n')

  return checks.requiredPassed === checks.required
}

// 运行检查
checkNisEnvironment()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    error('检查过程发生错误:')
    console.error(err)
    process.exit(1)
  })
