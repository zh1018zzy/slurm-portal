import { spawn } from 'child_process'
import { promisify } from 'util'
import { exec } from 'child_process'
import { createClient } from '@supabase/supabase-js'

const execPromise = promisify(exec)

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * NIS 用户管理工具函数
 * 注意：NIS 用户管理需要在 NIS 主服务器上执行
 */

/**
 * 检查 NIS 环境配置
 * @returns Promise<{ configured: boolean, domain?: string, server?: string, error?: string }>
 */
export async function checkNisConfiguration(): Promise<{
  configured: boolean
  domain?: string
  server?: string
  error?: string
}> {
  try {
    // 检查 NIS 域名
    const { stdout: domain, stderr: domainErr } = await execPromise('ypdomainname')
    const nisDomain = domain.trim()

    if (!nisDomain || nisDomain === '(none)' || domainErr) {
      return {
        configured: false,
        error: 'NIS 域未配置或未启动'
      }
    }

    // 检查 NIS 服务器
    try {
      const { stdout: server } = await execPromise('ypwhich')
      const nisServer = server.trim()

      return {
        configured: true,
        domain: nisDomain,
        server: nisServer
      }
    } catch (err) {
      return {
        configured: false,
        domain: nisDomain,
        error: 'NIS 服务器未响应或未配置'
      }
    }
  } catch (error: any) {
    return {
      configured: false,
      error: 'NIS 环境检查失败: ' + error.message
    }
  }
}

/**
 * 检查 NIS 用户是否存在
 * @param username 用户名
 * @returns Promise<boolean>
 */
export async function checkNisUserExists(username: string): Promise<boolean> {
  try {
    // 使用 getent 检查用户（支持 NIS）
    const { stdout } = await execPromise(`getent passwd ${username}`)
    return stdout.trim().length > 0
  } catch (error) {
    // getent 返回非 0 表示用户不存在
    return false
  }
}

/**
 * 获取 NIS 用户信息
 * @param username 用户名
 * @returns Promise<{ username: string, uid: number, gid: number, home: string, shell: string } | null>
 */
export async function getNisUserInfo(username: string): Promise<{
  username: string
  uid: number
  gid: number
  gecos: string
  home: string
  shell: string
} | null> {
  try {
    const { stdout } = await execPromise(`getent passwd ${username}`)
    const line = stdout.trim()

    if (!line) return null

    // 解析 passwd 格式: username:x:uid:gid:gecos:home:shell
    const parts = line.split(':')
    if (parts.length < 7) return null

    return {
      username: parts[0],
      uid: parseInt(parts[2]),
      gid: parseInt(parts[3]),
      gecos: parts[4],
      home: parts[5],
      shell: parts[6]
    }
  } catch (error) {
    return null
  }
}

/**
 * 获取下一个可用的 UID 号
 * @returns Promise<number>
 */
async function getNextUidNumber(): Promise<number> {
  try {
    // 从数据库获取最大 UID
    const { data, error } = await supabase
      .from('users')
      .select('uid_number')
      .not('uid_number', 'is', null)
      .order('uid_number', { ascending: false })
      .limit(1)

    if (error) {
      console.error('数据库查询失败:', error)
      return 2000 // 默认起始值
    }

    if (data && data.length > 0) {
      return data[0].uid_number + 1
    }

    // 如果数据库没有记录，从系统获取最大 UID
    try {
      const { stdout } = await execPromise("getent passwd | awk -F: '{print $3}' | sort -n | tail -1")
      const maxUid = parseInt(stdout.trim())

      if (maxUid && maxUid >= 1000) {
        return maxUid + 1
      }
    } catch (err) {
      console.error('系统 UID 查询失败:', err)
    }

    return 2000
  } catch (error: any) {
    console.error('获取 UID 失败:', error)
    return 2000
  }
}

/**
 * 添加 NIS 用户（需要在 NIS 主服务器上执行）
 * @param username 用户名
 * @param password 密码
 * @param realName 真实姓名
 * @param options 可选参数 { uid?, gid?, home?, shell? }
 * @returns Promise<{ success: boolean, error?: string, uid?: number }>
 */
export async function addNisUser(
  username: string,
  password: string,
  realName?: string,
  options?: {
    uid?: number
    gid?: number
    home?: string
    shell?: string
  }
): Promise<{ success: boolean, error?: string, uid?: number }> {
  try {
    // 检查用户是否已存在
    const exists = await checkNisUserExists(username)
    if (exists) {
      return { success: false, error: '用户已存在' }
    }

    // 获取 UID
    const uid = options?.uid || await getNextUidNumber()
    const gid = options?.gid || 2000 // 默认组
    const home = options?.home || `/home/${username}`
    const shell = options?.shell || '/bin/bash'
    const gecos = realName || username

    // 使用 useradd 创建用户
    // -m: 创建家目录
    // -u: 指定 UID
    // -g: 指定 GID
    // -d: 指定家目录
    // -s: 指定 shell
    // -c: 指定注释（真实姓名）
    const useraddCmd = `useradd -m -u ${uid} -g ${gid} -d ${home} -s ${shell} -c "${gecos}" ${username}`

    console.log('执行 useradd 命令:', useraddCmd)

    await execPromise(useraddCmd)

    // 设置密码
    // 使用 chpasswd 命令设置密码（更安全）
    await execPromise(`echo "${username}:${password}" | chpasswd`)

    console.log(`NIS 用户创建成功: ${username} (UID: ${uid})`)

    // 更新 NIS 数据库（需要在 NIS 主服务器上执行）
    try {
      await execPromise('cd /var/yp && make')
      console.log('NIS 数据库更新成功')
    } catch (makeErr: any) {
      console.warn('NIS 数据库更新失败（可能不在 NIS 主服务器上）:', makeErr.message)
      // 不影响用户创建结果
    }

    return { success: true, uid }
  } catch (error: any) {
    console.error('添加 NIS 用户失败:', error)
    return {
      success: false,
      error: 'NIS 用户创建失败: ' + error.message
    }
  }
}

/**
 * 修改 NIS 用户密码
 * @param username 用户名
 * @param newPassword 新密码
 * @returns Promise<{ success: boolean, error?: string }>
 */
export async function changeNisPassword(
  username: string,
  newPassword: string
): Promise<{ success: boolean, error?: string }> {
  try {
    // 检查用户是否存在
    const exists = await checkNisUserExists(username)
    if (!exists) {
      return { success: false, error: '用户不存在' }
    }

    // 使用 chpasswd 修改密码
    await execPromise(`echo "${username}:${newPassword}" | chpasswd`)

    console.log(`NIS 用户密码修改成功: ${username}`)

    // 更新 NIS 数据库
    try {
      await execPromise('cd /var/yp && make')
      console.log('NIS 数据库更新成功')
    } catch (makeErr: any) {
      console.warn('NIS 数据库更新失败:', makeErr.message)
    }

    return { success: true }
  } catch (error: any) {
    console.error('修改 NIS 用户密码失败:', error)
    return {
      success: false,
      error: 'NIS 密码修改失败: ' + error.message
    }
  }
}

/**
 * 删除 NIS 用户
 * @param username 用户名
 * @param removeHome 是否删除家目录（默认 false）
 * @returns Promise<{ success: boolean, error?: string }>
 */
export async function deleteNisUser(
  username: string,
  removeHome: boolean = false
): Promise<{ success: boolean, error?: string }> {
  try {
    // 检查用户是否存在
    const exists = await checkNisUserExists(username)
    if (!exists) {
      return { success: false, error: '用户不存在' }
    }

    // 使用 userdel 删除用户
    // -r: 同时删除家目录
    const userdelCmd = removeHome ? `userdel -r ${username}` : `userdel ${username}`

    console.log('执行 userdel 命令:', userdelCmd)

    await execPromise(userdelCmd)

    console.log(`NIS 用户删除成功: ${username}`)

    // 更新 NIS 数据库
    try {
      await execPromise('cd /var/yp && make')
      console.log('NIS 数据库更新成功')
    } catch (makeErr: any) {
      console.warn('NIS 数据库更新失败:', makeErr.message)
    }

    return { success: true }
  } catch (error: any) {
    console.error('删除 NIS 用户失败:', error)
    return {
      success: false,
      error: 'NIS 用户删除失败: ' + error.message
    }
  }
}

/**
 * 更新 NIS 用户信息
 * @param username 用户名
 * @param options 更新选项 { realName?, shell?, home? }
 * @returns Promise<{ success: boolean, error?: string }>
 */
export async function updateNisUser(
  username: string,
  options: {
    realName?: string
    shell?: string
    home?: string
  }
): Promise<{ success: boolean, error?: string }> {
  try {
    // 检查用户是否存在
    const exists = await checkNisUserExists(username)
    if (!exists) {
      return { success: false, error: '用户不存在' }
    }

    const commands: string[] = []

    // 使用 usermod 修改用户信息
    if (options.realName) {
      commands.push(`usermod -c "${options.realName}" ${username}`)
    }

    if (options.shell) {
      commands.push(`usermod -s ${options.shell} ${username}`)
    }

    if (options.home) {
      // -m: 移动家目录内容到新位置
      commands.push(`usermod -d ${options.home} -m ${username}`)
    }

    if (commands.length === 0) {
      return { success: true } // 没有需要更新的内容
    }

    // 执行所有更新命令
    for (const cmd of commands) {
      console.log('执行 usermod 命令:', cmd)
      await execPromise(cmd)
    }

    console.log(`NIS 用户信息更新成功: ${username}`)

    // 更新 NIS 数据库
    try {
      await execPromise('cd /var/yp && make')
      console.log('NIS 数据库更新成功')
    } catch (makeErr: any) {
      console.warn('NIS 数据库更新失败:', makeErr.message)
    }

    return { success: true }
  } catch (error: any) {
    console.error('更新 NIS 用户信息失败:', error)
    return {
      success: false,
      error: 'NIS 用户信息更新失败: ' + error.message
    }
  }
}

/**
 * 列出所有 NIS 用户
 * @returns Promise<Array<{ username: string, uid: number, gid: number, gecos: string, home: string, shell: string }>>
 */
export async function listNisUsers(): Promise<Array<{
  username: string
  uid: number
  gid: number
  gecos: string
  home: string
  shell: string
}>> {
  try {
    // 使用 getent 获取所有用户（包括 NIS 用户）
    // 过滤 UID >= 1000 的普通用户
    const { stdout } = await execPromise("getent passwd | awk -F: '$3 >= 1000 {print}'")

    const users = stdout.trim().split('\n').map(line => {
      const parts = line.split(':')
      if (parts.length < 7) return null

      return {
        username: parts[0],
        uid: parseInt(parts[2]),
        gid: parseInt(parts[3]),
        gecos: parts[4],
        home: parts[5],
        shell: parts[6]
      }
    }).filter(u => u !== null) as Array<{
      username: string
      uid: number
      gid: number
      gecos: string
      home: string
      shell: string
    }>

    return users
  } catch (error: any) {
    console.error('列出 NIS 用户失败:', error)
    return []
  }
}

/**
 * 批量更新所有用户的家目录前缀
 * @param newPrefix 新的家目录前缀
 * @returns Promise<{ success: boolean, error?: string, updatedCount?: number }>
 */
export async function updateAllUsersHomeDirectory(
  newPrefix: string
): Promise<{ success: boolean, error?: string, updatedCount?: number }> {
  try {
    console.log("🚀 开始批量更新 NIS 用户家目录前缀:", newPrefix)

    // 从数据库获取所有用户
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("username")

    if (usersError || !users) {
      return { success: false, error: "获取用户列表失败: " + usersError?.message }
    }

    let updatedCount = 0

    // 逐个处理用户
    for (const user of users) {
      try {
        const newHomeDir = `${newPrefix}/${user.username}`

        // 使用 usermod 更新家目录
        await execPromise(`usermod -d ${newHomeDir} -m ${user.username}`)

        updatedCount++
        console.log(`✅ 更新用户家目录: ${user.username} -> ${newHomeDir}`)
      } catch (updateError: any) {
        console.warn(`⚠️ 更新用户 ${user.username} 家目录失败:`, updateError.message)
        // 继续处理其他用户
      }
    }

    // 更新 NIS 数据库
    try {
      await execPromise('cd /var/yp && make')
      console.log('NIS 数据库更新成功')
    } catch (makeErr: any) {
      console.warn('NIS 数据库更新失败:', makeErr.message)
    }

    console.log(`✅ 批量更新完成，共更新 ${updatedCount} 个用户`)

    return { success: true, updatedCount }
  } catch (error: any) {
    console.error('批量更新用户家目录失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
