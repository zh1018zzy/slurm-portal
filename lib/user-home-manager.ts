import { exec } from 'child_process'
import { promisify } from 'util'
import { promises as fs } from 'fs'
import path from 'path'

const execAsync = promisify(exec)

/**
 * 获取系统设置中的用户家目录前缀
 */
async function getUserHomePrefix(): Promise<string> {
  try {
    const configPath = path.resolve(process.cwd(), 'config/system-settings.json')
    const data = await fs.readFile(configPath, 'utf-8')
    const settings = JSON.parse(data)
    return settings.userHomeDirectoryPrefix || '/home'
  } catch (error) {
    console.warn('无法读取系统设置，使用默认家目录前缀 /home:', error)
    return '/home'
  }
}

/**
 * 用户主目录管理器
 * 提供通用的用户主目录获取和管理功能
 */
export class UserHomeManager {
  private static cache = new Map<string, { home: string; uid: number; gid: number; timestamp: number }>()
  private static cacheTTL = 5 * 60 * 1000 // 5分钟缓存

  /**
   * 获取用户主目录
   * @param username 用户名
   * @param useCache 是否使用缓存
   * @returns 用户主目录路径
   */
  static async getUserHome(username: string, useCache: boolean = true): Promise<string> {
    try {
      // 检查缓存
      if (useCache) {
        const cached = this.cache.get(username)
        if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
          return cached.home
        }
      }

      let home: string

      try {
        // 首先尝试使用系统命令获取用户主目录
        const { stdout } = await execAsync(`eval echo ~${username}`)
        const systemHome = stdout.trim()

        // 验证路径是否有效（避免未找到用户时返回~username）
        if (systemHome && systemHome !== `~${username}` && !systemHome.startsWith('~')) {
          home = systemHome
        } else {
          throw new Error('系统用户不存在或无法获取主目录')
        }
      } catch (error) {
        console.warn(`无法从系统获取用户 ${username} 的主目录，使用配置的前缀:`, error)
        
        // 使用系统设置中配置的家目录前缀
        const homePrefix = await getUserHomePrefix()
        home = path.join(homePrefix, username)
      }

      // 更新缓存
      this.cache.set(username, {
        home,
        uid: 0,
        gid: 0,
        timestamp: Date.now()
      })

      return home
    } catch (error) {
      console.error(`获取用户 ${username} 主目录失败:`, error)
      
      // 最终回退到默认路径
      const homePrefix = await getUserHomePrefix()
      const fallbackHome = path.join(homePrefix, username)
      console.warn(`使用默认路径: ${fallbackHome}`)
      return fallbackHome
    }
  }

  /**
   * 获取用户UID和GID
   * @param username 用户名
   * @returns {uid, gid} 用户UID和GID
   */
  static async getUserIds(username: string): Promise<{ uid: number; gid: number }> {
    try {
      // 检查缓存
      const cached = this.cache.get(username)
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL && cached.uid > 0) {
        return { uid: cached.uid, gid: cached.gid }
      }

      // 获取用户UID
      const { stdout: uidOutput } = await execAsync(`id -u ${username}`)
      const uid = Number(uidOutput.trim())

      // 获取用户GID
      const { stdout: gidOutput } = await execAsync(`id -g ${username}`)
      const gid = Number(gidOutput.trim())

      // 验证UID和GID
      if (uid <= 0 || gid <= 0) {
        throw new Error(`无效的用户ID: uid=${uid}, gid=${gid}`)
      }

      // 更新缓存
      const home = await this.getUserHome(username, false)
      this.cache.set(username, {
        home,
        uid,
        gid,
        timestamp: Date.now()
      })

      return { uid, gid }
    } catch (error) {
      console.error(`获取用户 ${username} UID/GID失败:`, error)
      return { uid: 1000, gid: 1000 } // 默认值
    }
  }

  /**
   * 获取用户完整信息
   * @param username 用户名
   * @returns 用户信息
   */
  static async getUserInfo(username: string): Promise<{
    home: string
    uid: number
    gid: number
    exists: boolean
  }> {
    try {
      const home = await this.getUserHome(username)
      const { uid, gid } = await this.getUserIds(username)

      // 检查用户目录是否存在
      const { execSync } = await import('child_process')
      let exists = false
      try {
        execSync(`test -d "${home}"`, { stdio: 'ignore' })
        exists = true
      } catch {
        exists = false
      }

      return { home, uid, gid, exists }
    } catch (error) {
      console.error(`获取用户 ${username} 信息失败:`, error)
      const homePrefix = await getUserHomePrefix()
      return {
        home: path.join(homePrefix, username),
        uid: 1000,
        gid: 1000,
        exists: false
      }
    }
  }

  /**
   * 创建用户作业目录
   * @param username 用户名
   * @param jobId 作业ID
   * @returns 作业目录路径
   */
  static async createJobDirectory(username: string, jobId?: string): Promise<{
    jobDir: string
    myJobsDir: string
    home: string
    uid: number
    gid: number
  }> {
    const userInfo = await this.getUserInfo(username)
    const { home, uid, gid } = userInfo

    // 创建my-jobs目录
    const myJobsDir = `${home}/my-jobs`
    const { mkdir } = await import('fs/promises')
    await mkdir(myJobsDir, { recursive: true })

    // 创建作业目录
    const timestamp = Date.now()
    const rand = require('crypto').randomBytes(6).toString('hex')
    const jobDir = `${myJobsDir}/job_${timestamp}_${rand}`

    if (jobId) {
      // 如果提供了作业ID，使用作业ID作为目录名
      const jobDirWithId = `${myJobsDir}/job_${jobId}`
      await mkdir(jobDirWithId, { recursive: true })
      
      // 创建软链接
      try {
        const { symlink } = await import('fs/promises')
        await symlink(jobDirWithId, jobDir)
      } catch (error) {
        console.warn('创建软链接失败:', error)
      }
    } else {
      await mkdir(jobDir, { recursive: true })
    }

    // 设置目录权限
    try {
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execFileAsync = promisify(execFile)
      
      await execFileAsync('chown', [`${uid}:${gid}`, myJobsDir])
      await execFileAsync('chown', [`${uid}:${gid}`, jobDir])
    } catch (error) {
      console.warn('设置目录权限失败:', error)
    }

    return { jobDir, myJobsDir, home, uid, gid }
  }

  /**
   * 清除缓存
   * @param username 用户名（可选，如果不提供则清除所有缓存）
   */
  static clearCache(username?: string): void {
    if (username) {
      this.cache.delete(username)
    } else {
      this.cache.clear()
    }
  }

  /**
   * 获取缓存统计信息
   */
  static getCacheStats(): {
    size: number
    entries: Array<{ username: string; home: string; timestamp: number }>
  } {
    const entries = Array.from(this.cache.entries()).map(([username, data]) => ({
      username,
      home: data.home,
      timestamp: data.timestamp
    }))

    return {
      size: this.cache.size,
      entries
    }
  }
}

/**
 * 兼容性函数 - 保持与现有代码的兼容性
 */
export async function getUserHomeDir(username: string): Promise<string> {
  return UserHomeManager.getUserHome(username)
}

/**
 * 获取用户作业目录
 * @param username 用户名
 * @returns 作业目录路径
 */
export async function getUserJobDir(username: string): Promise<string> {
  const { jobDir } = await UserHomeManager.createJobDirectory(username)
  return jobDir
} 