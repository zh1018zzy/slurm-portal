'use client'

// API请求管理工具，用于防止重复请求和提供缓存
class APIRequestManager {
  private static instance: APIRequestManager
  private pendingRequests = new Map<string, Promise<any>>()
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>()

  static getInstance(): APIRequestManager {
    if (!APIRequestManager.instance) {
      APIRequestManager.instance = new APIRequestManager()
    }
    return APIRequestManager.instance
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
        return cached.data
      }
    }

    // 检查是否有相同请求正在进行
    if (this.pendingRequests.has(key)) {
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
    } else {
      this.cache.clear()
    }
  }

  // 获取缓存状态
  getCacheInfo() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size
    }
  }
}

export const apiRequestManager = APIRequestManager.getInstance()

// 通知专用请求包装器
export async function fetchNotifications(token: string): Promise<any> {
  const requestKey = `notifications-${token.substring(-8)}` // 使用token后8位作为key的一部分
  
  return apiRequestManager.deduplicateRequest(
    requestKey,
    async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      try {
        const response = await fetch('/api/notifications?limit=20&sortBy=createdAt&sortOrder=desc', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    },
    30000 // 30秒缓存
  )
}

// 通知统计专用请求包装器
export async function fetchNotificationStats(token: string): Promise<any> {
  const requestKey = `notification-stats-${token.substring(-8)}`
  
  return apiRequestManager.deduplicateRequest(
    requestKey,
    async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      try {
        const response = await fetch('/api/notifications?stats=true', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        return await response.json()
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    },
    60000 // 60秒缓存
  )
}