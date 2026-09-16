import { spawn } from 'child_process'
import { promisify } from 'util'
import { exec } from 'child_process'
import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'
import { checkNisUserExists, getNisUserInfo } from './nis-user'

const execPromise = promisify(exec)

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Linux/NIS 认证：使用 PAM 验证用户密码
 * 支持本地用户和 NIS 用户认证
 * @param username 用户名
 * @param password 密码
 * @returns Promise<userInfo|null> 认证成功返回用户信息，否则null
 */
export async function authenticateLinux(username: string, password: string): Promise<{ id: string, username: string, role?: string, isAdmin?: boolean } | null> {
  logger.debug('Auth-Linux', '开始 Linux/NIS 认证', { username })

  try {
    // 1. 首先检查用户是否存在（支持本地用户和 NIS 用户）
    const userExists = await checkNisUserExists(username)

    if (!userExists) {
      logger.warn('Auth-Linux', '用户不存在', { username })
      return null
    }

    // 2. 获取用户信息
    const userInfo = await getNisUserInfo(username)

    if (!userInfo) {
      logger.warn('Auth-Linux', '无法获取用户信息', { username })
      return null
    }

    logger.debug('Auth-Linux', '用户信息', {
      username,
      uid: userInfo.uid,
      gid: userInfo.gid,
      home: userInfo.home,
      shell: userInfo.shell
    })

    // 3. 使用 su 命令验证密码（通过 PAM 认证，支持 NIS）
    const authenticated = await authenticateWithSu(username, password)

    if (!authenticated) {
      logger.warn('Auth-Linux', '密码验证失败', { username })
      return null
    }

    logger.info('Auth-Linux', '认证成功', { username })

    // 4. 认证成功后，从 Supabase 获取用户信息
    try {
      const { data: userDb, error: dbError } = await supabase
        .from('users')
        .select('id, role, is_online')
        .eq('username', username)
        .single()

      // 如果业务表中没有用户记录，拒绝登录
      if (dbError || !userDb) {
        logger.warn('Auth-Linux', '用户不存在于业务表中，拒绝登录', { username })
        return null
      }

      const role = userDb.role || 'user'

      logger.debug('Auth-Linux', '获取用户角色', { username, role })

      return {
        id: userDb.id,
        username,
        role,
        isAdmin: role === 'admin'
      }
    } catch (error) {
      logger.error('Auth-Linux', '获取用户信息失败', error)
      return null
    }
  } catch (error: any) {
    logger.error('Auth-Linux', 'Linux/NIS 认证失败', error)
    return null
  }
}

/**
 * 使用 su 命令验证密码（通过 PAM）
 * @param username 用户名
 * @param password 密码
 * @returns Promise<boolean> 验证成功返回 true，否则 false
 */
async function authenticateWithSu(username: string, password: string): Promise<boolean> {
  return new Promise((resolve) => {
    // su -c 'exit' 用户名，输入密码，若返回码为 0 则认证成功
    const su = spawn('su', ['-c', 'exit', username], {
      stdio: ['pipe', 'ignore', 'ignore']
    })

    let isResolved = false
    const timeout = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        su.kill()
        logger.warn('Auth-Linux', 'su 命令超时', { username })
        resolve(false)
      }
    }, 5000) // 5 秒超时

    su.stdin.write(password + '\n')
    su.stdin.end()

    su.on('close', (code) => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        resolve(code === 0)
      }
    })

    su.on('error', (err) => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timeout)
        logger.error('Auth-Linux', 'su 命令执行错误', err)
        resolve(false)
      }
    })
  })
} 