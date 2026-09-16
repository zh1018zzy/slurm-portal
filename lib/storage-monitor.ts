import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// 存储监控数据缓存
interface StorageData {
  sharedStorage: any
  userStorages: Map<string, any>
  lastUpdated: number
}

class StorageMonitor {
  private storageData: StorageData | null = null
  private isRunning = false
  private updateInterval = 5 * 60 * 1000 // 5分钟更新一次
  private config: any

  constructor() {
    this.loadConfig()
  }

  // 加载配置
  private loadConfig() {
    try {
      const configPath = path.join(process.cwd(), 'config', 'storage-config.json')
      const configData = fs.readFileSync(configPath, 'utf8')
      this.config = JSON.parse(configData)
    } catch (error) {
      console.error('加载存储配置失败:', error)
      this.config = {
        sharedStorage: { mountPath: '/shared' },
        userStorage: { mountPath: '/home' }
      }
    }
  }

  // 启动监控
  async start() {
    if (this.isRunning) return
    
    this.isRunning = true
    
    // 立即执行一次更新
    await this.updateStorageData()
    
    // 设置定时更新
    setInterval(async () => {
      if (this.isRunning) {
        await this.updateStorageData()
      }
    }, this.updateInterval)
  }

  // 停止监控
  stop() {
    this.isRunning = false
  }

  // 更新存储数据
  private async updateStorageData() {
    try {
      
      // 获取共享存储信息
      const sharedStorage = await this.getSharedStorageInfo()
      
      // 获取用户存储信息（异步，不阻塞）
      this.updateUserStoragesAsync()
      
      this.storageData = {
        sharedStorage,
        userStorages: new Map(),
        lastUpdated: Date.now()
      }
      
    } catch (error) {
      console.error('更新存储数据失败:', error)
    }
  }

  // 获取共享存储信息
  private async getSharedStorageInfo(): Promise<any> {
    try {
      const mountPath = this.config.sharedStorage.mountPath
      const { stdout } = await execAsync(`df -h "${mountPath}" | tail -1`)
      const parts = stdout.trim().split(/\s+/)
      
      if (parts.length >= 6) {
        const [source, size, used, avail, pcent, target] = parts
        return {
          ...this.config.sharedStorage,
          exists: true,
          source,
          size,
          used,
          available: avail,
          usagePercent: parseInt(pcent.replace('%', '')),
          mountPoint: target
        }
      }
    } catch (error) {
      console.error('获取共享存储信息失败:', error)
    }
    
    return {
      ...this.config.sharedStorage,
      exists: false,
      error: '无法获取共享存储信息'
    }
  }

  // 异步更新用户存储信息
  private async updateUserStoragesAsync() {
    try {
      const mountPath = this.config.userStorage.mountPath
      
      // 获取所有用户目录
      const { stdout } = await execAsync(`ls -1 "${mountPath}" | head -50`) // 限制用户数量
      const users = stdout.trim().split('\n').filter(Boolean)
      
      // 并发获取用户存储信息（限制并发数）
      const batchSize = 5
      for (let i = 0; i < users.length; i += batchSize) {
        const batch = users.slice(i, i + batchSize)
        await Promise.allSettled(
          batch.map(username => this.getUserStorageInfo(username, mountPath))
        )
        
        // 批次间延迟，避免系统负载过高
        if (i + batchSize < users.length) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    } catch (error) {
      console.error('更新用户存储信息失败:', error)
    }
  }

  // 获取单个用户存储信息
  private async getUserStorageInfo(username: string, mountPath: string): Promise<void> {
    try {
      const userPath = path.join(mountPath, username)
      
      // 使用 df 命令（快速）
      const { stdout } = await execAsync(`df -h "${userPath}" | tail -1`)
      const parts = stdout.trim().split(/\s+/)
      
      if (parts.length >= 6) {
        const [source, size, used, avail, pcent, target] = parts
        const userData = {
          ...this.config.userStorage,
          exists: true,
          userPath,
          size: used,
          usagePercent: parseInt(pcent.replace('%', '')),
          totalSize: size,
          available: avail
        }
        
        if (this.storageData) {
          this.storageData.userStorages.set(username, userData)
        }
      }
         } catch (error) {
       // 静默处理错误，不影响其他用户
     }
  }

  // 获取存储数据
  getStorageData(): StorageData | null {
    return this.storageData
  }

  // 获取特定用户的存储信息
  getUserStorage(username: string): any {
    if (!this.storageData) return null
    return this.storageData.userStorages.get(username)
  }

  // 手动刷新
  async refresh() {
    await this.updateStorageData()
  }
}

// 创建全局实例
export const storageMonitor = new StorageMonitor()

// 启动监控（如果不在测试环境）
if (process.env.NODE_ENV !== 'test') {
  storageMonitor.start().catch(console.error)
} 