import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { storageMonitor } from '@/lib/storage-monitor'
import { UserHomeManager } from '@/lib/user-home-manager'
export const dynamic = 'force-dynamic'


const execAsync = promisify(exec)

// 获取当前用户信息
function getCurrentUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  const userInfo = verifyJwt(token)
  return userInfo
}

// 简单的内存缓存
const storageCache = {
  data: null as any,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5分钟缓存
}

// 用户存储缓存（单独缓存，更新频率较低）
const userStorageCache = new Map<string, {
  data: any,
  timestamp: number,
  ttl: number
}>()

// 加载存储配置
function loadStorageConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'storage-config.json')
    const configData = fs.readFileSync(configPath, 'utf8')
    return JSON.parse(configData)
  } catch (error) {
    console.error('加载存储配置失败:', error)
    // 返回默认配置
    return {
      sharedStorage: {
        name: "集群共享存储",
        mountPath: "/shared",
        description: "集群共享存储空间",
        quotaEnabled: false,
        warningThreshold: 80,
        criticalThreshold: 90
      },
      userStorage: {
        name: "用户个人存储",
        mountPath: "/home",
        description: "用户个人存储空间",
        quotaEnabled: true,
        warningThreshold: 75,
        criticalThreshold: 85
      }
    }
  }
}

// 获取指定路径的存储使用情况
async function getStorageUsage(mountPath: string): Promise<any> {
  try {
    // 检查路径是否存在
    const { stdout: existsCheck } = await execAsync(`test -d "${mountPath}" && echo "exists" || echo "not exists"`)
    if (existsCheck.trim() !== 'exists') {
      return {
        exists: false,
        error: `路径 ${mountPath} 不存在`
      }
    }

    // 获取存储使用情况
    const { stdout } = await execAsync(`df -h "${mountPath}" | tail -1`)
    const parts = stdout.trim().split(/\s+/)
    
    if (parts.length >= 6) {
      const [source, size, used, avail, pcent, target] = parts
      return {
        exists: true,
        source,
        size,
        used,
        available: avail,
        usagePercent: parseInt(pcent.replace('%', '')),
        mountPoint: target
      }
    }
    
    return {
      exists: false,
      error: '无法解析存储信息'
    }
  } catch (error) {
    console.error(`获取存储使用情况失败 (${mountPath}):`, error)
    return {
      exists: false,
      error: String(error)
    }
  }
}

// 获取用户存储使用情况（带缓存）
async function getUserStorageUsage(username: string, mountPath: string, userRole?: string): Promise<any> {
  const cacheKey = `${username}:${mountPath}`
  const now = Date.now()
  
  // 检查用户存储缓存（10分钟缓存）
  const userCache = userStorageCache.get(cacheKey)
  if (userCache && (now - userCache.timestamp) < userCache.ttl) {
    return userCache.data
  }

  try {
    // 使用 UserHomeManager 获取用户真实主目录
    let userPath: string
    try {
      userPath = await UserHomeManager.getUserHome(username)
    } catch (error) {
      // 如果获取失败，回退到传统方式
      console.warn(`无法获取用户 ${username} 的主目录，使用默认路径:`, error)
      userPath = path.join(mountPath, username)
    }
    
    // 检查用户目录是否存在
    const { stdout: existsCheck } = await execAsync(`test -d "${userPath}" && echo "exists" || echo "not exists"`)
    if (existsCheck.trim() !== 'exists') {
      // 对于管理员账号，给出更友好的提示
      const isAdmin = userRole === 'admin' || username.toLowerCase().includes('admin') || username.toLowerCase().includes('root')
      const result = {
        exists: false,
        error: isAdmin 
          ? `管理员账号 ${username} 的主目录 ${userPath} 不存在，可能需要创建或配置`
          : `用户目录 ${userPath} 不存在`
      }
      // 缓存错误结果（较短时间）
      userStorageCache.set(cacheKey, {
        data: result,
        timestamp: now,
        ttl: 2 * 60 * 1000 // 2分钟
      })
      return result
    }

    // 方案1: 使用 df 命令获取用户目录使用情况（快速）
    try {
      const { stdout: dfOutput } = await execAsync(`df -h "${userPath}" | tail -1`)
      const parts = dfOutput.trim().split(/\s+/)
      
      if (parts.length >= 6) {
        const [source, size, used, avail, pcent, target] = parts
        const result = {
          exists: true,
          userPath,
          size: used, // 使用 df 的已用空间
          usagePercent: parseInt(pcent.replace('%', '')),
          totalSize: size,
          available: avail
        }
        
        // 缓存结果（10分钟）
        userStorageCache.set(cacheKey, {
          data: result,
          timestamp: now,
          ttl: 10 * 60 * 1000
        })
        return result
      }
    } catch (dfError) {
    }

    // 方案2: 使用 du 命令（备用，较慢）
    try {
      const { stdout: sizeOutput } = await execAsync(`du -sh "${userPath}" 2>/dev/null || echo "0"`)
      const size = sizeOutput.trim().replace(/\t.*$/, '') // 移除路径部分
      
      // 获取用户目录使用百分比
      const { stdout: percentOutput } = await execAsync(`df "${userPath}" | tail -1 | awk '{print $5}' | sed 's/%//'`)
      const usagePercent = parseInt(percentOutput.trim()) || 0
      
      const result = {
        exists: true,
        userPath,
        size,
        usagePercent
      }
      
      // 缓存结果（5分钟，因为du较慢）
      userStorageCache.set(cacheKey, {
        data: result,
        timestamp: now,
        ttl: 5 * 60 * 1000
      })
      return result
    } catch (duError) {
      console.error(`du命令也失败: ${duError}`)
      throw duError
    }
  } catch (error) {
    console.error(`获取用户存储使用情况失败 (${username}):`, error)
    const result = {
      exists: false,
      error: String(error)
    }
    // 缓存错误结果（较短时间）
    userStorageCache.set(cacheKey, {
      data: result,
      timestamp: now,
      ttl: 2 * 60 * 1000
    })
    return result
  }
}

// 获取存储配额信息
async function getStorageQuota(username: string, mountPath: string): Promise<any> {
  try {
    // 尝试获取用户配额信息
    const { stdout } = await execAsync(`quota -u ${username} 2>/dev/null || echo "No quota"`)
    
    if (stdout.includes('No quota')) {
      return {
        hasQuota: false,
        softLimit: null,
        hardLimit: null,
        used: null
      }
    }
    
    // 解析quota输出，查找指定路径的配额
    const lines = stdout.trim().split('\n')
    const quotaLine = lines.find(line => line.includes(mountPath))
    
    if (quotaLine) {
      const parts = quotaLine.trim().split(/\s+/)
      return {
        hasQuota: true,
        softLimit: parts[1] || null,
        hardLimit: parts[2] || null,
        used: parts[0] || null
      }
    }
    
    return {
      hasQuota: false,
      softLimit: null,
      hardLimit: null,
      used: null
    }
  } catch (error) {
    console.error('获取存储配额失败:', error)
    return {
      hasQuota: false,
      softLimit: null,
      hardLimit: null,
      used: null
    }
  }
}

export async function GET(req: NextRequest) {
  // 构建时保护 - 返回默认响应
  if (process.env.NODE_ENV === 'production' && !req.headers.get('authorization')) {
    return Response.json({ 
      success: false, 
      error: '构建时无法访问此API',
      storage: {
        shared: {
          exists: false,
          error: '构建时无法获取存储信息'
        },
        user: {
          exists: false,
          error: '构建时无法获取存储信息'
        }
      }
    })
  }

  try {
    // 验证用户身份
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    // 检查缓存（只缓存共享存储，用户存储单独缓存）
    const now = Date.now()
    const useCache = req.nextUrl.searchParams.get('cache') === 'true'
    
    // 尝试从后台监控系统获取数据
    const monitorData = storageMonitor.getStorageData()
    if (monitorData) {
      const userStorage = storageMonitor.getUserStorage(userInfo.username)
      
      const storageInfo = {
        sharedStorage: monitorData.sharedStorage,
        userStorage: userStorage || {
          exists: false,
          error: '用户存储信息暂不可用'
        },
        quota: await getStorageQuota(userInfo.username, monitorData.sharedStorage.mountPath),
        lastUpdated: new Date(monitorData.lastUpdated).toISOString()
      }

      // 只更新共享存储缓存（不缓存用户特定数据）
      if (!storageCache.data || (now - storageCache.timestamp) >= storageCache.ttl) {
        storageCache.data = {
          sharedStorage: monitorData.sharedStorage,
          lastUpdated: new Date(monitorData.lastUpdated).toISOString()
        }
        storageCache.timestamp = now
      }

      return Response.json({ 
        success: true, 
        storage: storageInfo,
        fromCache: false,
        fromMonitor: true
      })
    }

    // 如果后台监控不可用，使用传统方法
    
    // 加载存储配置
    const config = loadStorageConfig()

    // 获取存储信息（用户存储单独缓存，不依赖全局缓存）
    const [sharedStorage, userStorage, userQuota] = await Promise.all([
      // 共享存储可以使用缓存
      (useCache && storageCache.data?.sharedStorage && (now - storageCache.timestamp) < storageCache.ttl)
        ? Promise.resolve(storageCache.data.sharedStorage)
        : getStorageUsage(config.sharedStorage.mountPath),
      // 用户存储总是实时获取（内部有自己的缓存）
      getUserStorageUsage(userInfo.username, config.userStorage.mountPath, userInfo.role),
      getStorageQuota(userInfo.username, config.userStorage.mountPath)
    ])

    const storageInfo = {
      sharedStorage: {
        ...config.sharedStorage,
        ...sharedStorage
      },
      userStorage: {
        ...config.userStorage,
        ...userStorage
      },
      quota: userQuota,
      lastUpdated: new Date().toISOString()
    }

    // 只更新共享存储缓存（不缓存用户特定数据）
    storageCache.data = {
      sharedStorage: {
        ...config.sharedStorage,
        ...sharedStorage
      },
      lastUpdated: new Date().toISOString()
    }
    storageCache.timestamp = now

    return Response.json({ 
      success: true, 
      storage: storageInfo,
      fromCache: false,
      fromMonitor: false
    })

  } catch (error) {
    console.error('存储信息API错误:', error)
    return Response.json({ 
      success: false, 
      error: '获取存储信息失败' 
    })
  }
} 