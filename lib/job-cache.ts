interface JobCacheEntry {
  jobs: any[]
  total: number
  stats: any
  timestamp: number
  ttl: number
}

interface JobCache {
  [key: string]: JobCacheEntry
}

class JobCacheManager {
  private cache: JobCache = {}
  private readonly DEFAULT_TTL = 30000 // 30秒
  private readonly ACTIVE_JOBS_TTL = 8000 // 8秒（更短的缓存时间确保VNC URL及时更新）
  private readonly COMPLETED_JOBS_TTL = 60000 // 1分钟

  private generateKey(params: {
    user?: string
    page: number
    pageSize: number
    status?: string
    jobType?: string
    partition?: string
    dateFilter?: string
  }): string {
    return `jobs:${params.user || 'all'}:${params.page}:${params.pageSize}:${params.status || 'all'}:${params.jobType || 'all'}:${params.partition || 'all'}:${params.dateFilter || 'all'}`
  }

  private getTTL(status?: string): number {
    if (status === 'RUNNING' || status === 'PENDING') {
      return this.ACTIVE_JOBS_TTL
    }
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
      return this.COMPLETED_JOBS_TTL
    }
    return this.DEFAULT_TTL
  }

  get(params: {
    user?: string
    page: number
    pageSize: number
    status?: string
    jobType?: string
    partition?: string
    dateFilter?: string
  }): JobCacheEntry | null {
    const key = this.generateKey(params)
    const entry = this.cache[key]
    
    if (!entry) return null
    
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      delete this.cache[key]
      return null
    }
    
    return entry
  }

  set(params: {
    user?: string
    page: number
    pageSize: number
    status?: string
    jobType?: string
    partition?: string
    dateFilter?: string
  }, data: { jobs: any[]; total: number; stats: any }): void {
    const key = this.generateKey(params)
    const ttl = this.getTTL(params.status)
    
    this.cache[key] = {
      ...data,
      timestamp: Date.now(),
      ttl
    }
  }

  invalidate(user?: string): void {
    const keys = Object.keys(this.cache)
    keys.forEach(key => {
      if (!user || key.includes(`:${user}:`) || key.includes(':all:')) {
        delete this.cache[key]
      }
    })
  }

  clear(): void {
    this.cache = {}
  }

  getStats(): { size: number; keys: string[] } {
    return {
      size: Object.keys(this.cache).length,
      keys: Object.keys(this.cache)
    }
  }

  // 统计缓存方法
  getStatsCache(key: string): any | null {
    const entry = this.cache[key]
    
    if (!entry) return null
    
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      delete this.cache[key]
      return null
    }
    
    return entry.stats
  }

  setStatsCache(key: string, stats: any, ttl: number = 30000): void {
    this.cache[key] = {
      jobs: [],
      total: 0,
      stats,
      timestamp: Date.now(),
      ttl
    }
  }
}

export const jobCache = new JobCacheManager() 