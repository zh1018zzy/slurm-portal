'use client'

// 全局请求管理器，用于统一管理所有API请求的节流和缓存
class GlobalRequestManager {
  private static instance: GlobalRequestManager
  private requestTimestamps = new Map<string, number>()
  private pendingRequests = new Map<string, Promise<any>>()
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  static getInstance(): GlobalRequestManager {
    if (!GlobalRequestManager.instance) {
      GlobalRequestManager.instance = new GlobalRequestManager()
    }
    return GlobalRequestManager.instance
  }

  // 检查请求是否过于频繁
  canMakeRequest(key: string, minInterval: number): boolean {
    const now = Date.now()
    const lastRequest = this.requestTimestamps.get(key) || 0
    const timeSinceLastRequest = now - lastRequest
    
    if (timeSinceLastRequest < minInterval) {
      console.log(`GlobalRequestManager: ${key} 请求过于频繁，跳过本次获取 (${timeSinceLastRequest}ms < ${minInterval}ms)`)
      return false
    }
    
    this.requestTimestamps.set(key, now)
    return true
  }

  // 防抖请求：如果相同的请求正在进行中，返回同一个Promise
  async deduplicateRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    cacheTTL: number = 0
  ): Promise<T> {
    // 检查缓存
    if (cacheTTL > 0) {
      const cached = this.cache.get(key)
      if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
        console.log(`GlobalRequestManager: 使用缓存数据 ${key}`)
        return cached.data
      }
    }

    // 检查是否有相同请求正在进行
    if (this.pendingRequests.has(key)) {
      console.log(`GlobalRequestManager: 请求 ${key} 正在进行中，返回现有Promise`)
      return this.pendingRequests.get(key)!
    }

    // 创建新请求
    const request = requestFn().finally(() => {
      // 请求完成后清除pending状态
      this.pendingRequests.delete(key)
    })

    // 存储pending请求
    this.pendingRequests.set(key, request)

    try {
      const result = await request
      
      // 缓存结果
      if (cacheTTL > 0) {
        this.cache.set(key, {
          data: result,
          timestamp: Date.now(),
          ttl: cacheTTL
        })
      }

      return result
    } catch (error) {
      // 出错时也要清除缓存
      this.cache.delete(key)
      throw error
    }
  }

  // 清除特定缓存
  clearCache(key?: string) {
    if (key) {
      this.cache.delete(key)
      this.requestTimestamps.delete(key)
    } else {
      this.cache.clear()
      this.requestTimestamps.clear()
    }
  }

  // 获取缓存状态
  getCacheInfo() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      requestTimestamps: this.requestTimestamps.size
    }
  }
}

export const globalRequestManager = GlobalRequestManager.getInstance() 