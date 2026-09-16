import { authFetch } from '@/lib/utils'

// 客户端安全的作业统计接口
export interface JobStats {
  submittedJobs: number
  cpuRunTime: string
  gpuRunTime: string
  avgComputeTime: string
  avgQueueTime: string
  runningJobs: number
  queuedJobs: number
}

/**
 * 获取作业统计数据 - 客户端版本，通过API获取
 * @param days 天数，如果为0或负数则获取所有历史数据
 */
export async function getRecentJobStats(days: number = 30): Promise<JobStats> {
  try {
    // 使用authFetch确保包含认证头
    const response = await authFetch(`/api/jobs/stats?days=${days}`)
    if (!response.ok) {
      throw new Error('获取作业统计失败')
    }
    
    const data = await response.json()
    if (data.success) {
      return data.data
    } else {
      throw new Error(data.error || '获取数据失败')
    }
  } catch (error) {
    console.error('获取作业统计数据失败:', error)
    // 返回默认值
    return {
      submittedJobs: 0,
      cpuRunTime: '0核时',
      gpuRunTime: '0卡时',
      avgComputeTime: '0小时',
      avgQueueTime: '0小时',
      runningJobs: 0,
      queuedJobs: 0
    }
  }
}

/**
 * 获取所有历史作业统计数据 - 用于大屏页面
 */
export async function getAllTimeJobStats(): Promise<JobStats> {
  return getRecentJobStats(0) // 传入0表示获取所有历史数据
}

/**
 * 获取历史作业趋势数据 - 与dashboard页面保持一致
 */
export async function getJobTrendData(days: number = 30) {
  try {
    const response = await authFetch(`/api/jobs/trend?days=${days}`)
    if (!response.ok) {
      throw new Error('获取作业趋势数据失败')
    }
    
    const data = await response.json()
    if (data.success) {
      return data.data
    } else {
      throw new Error(data.error || '获取数据失败')
    }
  } catch (error) {
    console.error('获取作业趋势数据失败:', error)
    return {
      trend: [],
      totalSubmitted: 0,
      totalCompleted: 0,
      totalFailed: 0,
      avgComputeTime: 0,
      avgQueueTime: 0
    }
  }
} 