import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'
import { NextRequest } from 'next/server'
export const dynamic = 'force-dynamic'


// 简单的分区缓存
const partitionCache = {
  data: null as any,
  timestamp: 0,
  ttl: 120000, // 2分钟
  
  get() {
    if (!this.data) return null
    const now = Date.now()
    if (now - this.timestamp > this.ttl) {
      this.data = null
      return null
    }
    return this.data
  },
  
  set(data: any) {
    this.data = data
    this.timestamp = Date.now()
  },
  
  clear() {
    this.data = null
    this.timestamp = 0
  }
}
 
// GET /api/jobs/partitions 获取分区列表
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  const searchParams = req.nextUrl.searchParams
  
  try {
    // 构建缓存键
    const cacheKey = 'partitions:all'
    
    // 检查缓存
    const useCache = searchParams.get('cache') !== 'false'
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    if (useCache && !forceRefresh) {
      const cachedPartitions = partitionCache.get()
      if (cachedPartitions) {
        return Response.json({
          success: true,
          partitions: cachedPartitions,
          fromCache: true,
          responseTime: Date.now() - startTime
        })
      }
    }
    
    if (forceRefresh) {
      partitionCache.clear()
    }
    
    // 获取分区数据
    const partitions = await slurmAdapter.listPartitions()
    
    const endTime = Date.now()
    
    // 缓存分区数据
    partitionCache.set(partitions)
    
    return Response.json({
      success: true,
      partitions,
      responseTime: endTime - startTime
    })
    
  } catch (error: any) {
    console.error('获取分区信息失败:', error)
    return Response.json({ 
      success: false, 
      error: error.message || '获取分区信息失败' 
    })
  }
} 