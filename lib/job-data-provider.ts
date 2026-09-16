import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'
import { JobInfo } from '@/lib/scheduler-types'

/**
 * 统一的作业数据提供者
 * 确保所有地方使用相同的数据源，避免数据不一致
 */
export class JobDataProvider {
  
  /**
   * 获取用户的所有作业（包括历史和活跃）
   */
  static async getUserJobs(username?: string): Promise<JobInfo[]> {
    try {
      return await slurmAdapter.listJobs(username)
    } catch (error) {
      console.error('获取用户作业失败:', error)
      return []
    }
  }
  
  /**
   * 获取用户的活跃作业
   */
  static async getUserActiveJobs(username?: string): Promise<JobInfo[]> {
    try {
      // 修正：slurmAdapter.listActiveJobs 方法不存在，改用 listJobs 方法并过滤活跃作业
      const jobs = await slurmAdapter.listJobs(username)
      return jobs.filter(job => job.status === 'RUNNING')
    } catch (error) {
      console.error('获取用户活跃作业失败:', error)
      return []
    }
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
      const jobs = await this.getUserJobs(username)
      
      return {
        total: jobs.length,
        pending: jobs.filter(job => job.status === 'PENDING').length,
        running: jobs.filter(job => job.status === 'RUNNING').length,
        completed: jobs.filter(job => job.status === 'COMPLETED').length,
        failed: jobs.filter(job => job.status === 'FAILED').length,
        cancelled: jobs.filter(job => job.status === 'CANCELLED').length,
      }
    } catch (error) {
      console.error('获取作业统计失败:', error)
      return {
        total: 0,
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      }
    }
  }
  
  /**
   * 获取最近作业（按提交时间排序）
   */
  static async getRecentJobs(username?: string, limit: number = 10): Promise<JobInfo[]> {
    try {
      const jobs = await this.getUserJobs(username)
      
      // 按提交时间倒序排列
      return jobs
        .sort((a, b) => {
          const aTime = new Date(a.submitTime || 0).getTime()
          const bTime = new Date(b.submitTime || 0).getTime()
          return bTime - aTime
        })
        .slice(0, limit)
    } catch (error) {
      console.error('获取最近作业失败:', error)
      return []
    }
  }
  
  /**
   * 获取指定时间范围内的作业
   */
  static async getJobsByDateRange(
    username: string | undefined, 
    startDate: Date, 
    endDate: Date
  ): Promise<JobInfo[]> {
    try {
      const jobs = await this.getUserJobs(username)
      
      return jobs.filter(job => {
        if (!job.submitTime) return false
        const submitTime = new Date(job.submitTime)
        return submitTime >= startDate && submitTime <= endDate
      })
    } catch (error) {
      console.error('获取时间范围作业失败:', error)
      return []
    }
  }
  
  /**
   * 获取今日作业
   */
  static async getTodayJobs(username?: string): Promise<JobInfo[]> {
    const today = new Date()
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1)
    
    return this.getJobsByDateRange(username, startOfDay, endOfDay)
  }
  
  /**
   * 获取本周作业
   */
  static async getThisWeekJobs(username?: string): Promise<JobInfo[]> {
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay()) // 设置为本周第一天
    startOfWeek.setHours(0, 0, 0, 0)
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)
    
    return this.getJobsByDateRange(username, startOfWeek, endOfWeek)
  }
  
  /**
   * 获取本月作业
   */
  static async getThisMonthJobs(username?: string): Promise<JobInfo[]> {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999)
    
    return this.getJobsByDateRange(username, startOfMonth, endOfMonth)
  }
} 