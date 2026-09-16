import { JobInfo } from '@/lib/scheduler-types'

/**
 * 客户端安全的作业数据提供者
 * 使用API调用获取数据，避免在客户端使用Node.js模块
 */
export class ClientJobDataProvider {
  
  /**
   * 获取用户的所有作业（包括历史和活跃）
   */
  static async getUserJobs(username?: string): Promise<JobInfo[]> {
    try {
      const response = await fetch(`/api/jobs?user=${username || ''}&history=true&dateRange=30days`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.success ? (data.jobs || []) : []
      }
    } catch (error) {
      console.error('获取用户作业失败:', error)
    }
    return []
  }
  
  /**
   * 获取用户的活跃作业
   */
  static async getUserActiveJobs(username?: string): Promise<JobInfo[]> {
    try {
      const response = await fetch(`/api/jobs/active?user=${username || ''}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.success ? (data.jobs || []) : []
      }
    } catch (error) {
      console.error('获取用户活跃作业失败:', error)
    }
    return []
  }
  
  /**
   * 获取作业统计信息
   */
  static async getJobStats(username?: string): Promise<{
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
  }> {
    try {
      // 获取活跃作业统计
      const activeJobs = await this.getUserActiveJobs(username)
      
      // 获取历史作业统计
      const response = await fetch(`/api/jobs/stats?user=${username || ''}&dateFilter=30days`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const dbStats = data.stats
          
          // 结合活跃作业和数据库统计
          return {
            total: dbStats.total,
            pending: activeJobs.filter(job => job.status === 'PENDING').length,
            running: activeJobs.filter(job => job.status === 'RUNNING').length,
            completed: dbStats.completed,
            failed: dbStats.failed,
            cancelled: dbStats.cancelled,
          }
        }
      }
    } catch (error) {
      console.error('获取作业统计失败:', error)
    }
    
    return {
      total: 0,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    }
  }
  
  /**
   * 获取最近作业（按提交时间排序）
   */
  static async getRecentJobs(username?: string, limit: number = 10): Promise<JobInfo[]> {
    try {
      const response = await fetch(`/api/jobs?user=${username || ''}&pageSize=${limit}&history=true&dateRange=7days`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.success ? (data.jobs || []) : []
      }
    } catch (error) {
      console.error('获取最近作业失败:', error)
    }
    return []
  }
  
  /**
   * 获取今日作业
   */
  static async getTodayJobs(username?: string): Promise<JobInfo[]> {
    try {
      const response = await fetch(`/api/jobs?user=${username || ''}&today=true`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        return data.success ? (data.jobs || []) : []
      }
    } catch (error) {
      console.error('获取今日作业失败:', error)
    }
    return []
  }
} 