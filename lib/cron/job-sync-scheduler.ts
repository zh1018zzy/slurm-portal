/**
 * 作业状态同步定时任务调度器
 * 
 * 分层同步策略：
 * - Layer 1: 手动同步（用户点击"强制同步"按钮）- 最近7天
 * - Layer 2: 每日自动同步（每天23:30）- 当天作业
 * - Layer 3: 每周补充同步（周六22:00）- 最近7天
 */

import cron from 'node-cron'

interface SyncResult {
  success: boolean
  stats?: {
    updated: number
    newJobs: number
    changedJobs: number
    totalJobs: number
    responseTime: number
    syncMode: string
  }
  error?: string
}

class JobSyncScheduler {
  private dailySyncTask: cron.ScheduledTask | null = null
  private weeklySyncTask: cron.ScheduledTask | null = null
  private isRunning = false
  private baseUrl: string
  
  constructor() {
    // 从环境变量获取API基础URL，默认为本地
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  }
  
  /**
   * 启动定时任务
   */
  start() {
    if (this.isRunning) {
      console.log('[JobSyncScheduler] 定时任务已在运行中')
      return
    }
    
    // 每日增量同步：每天 23:30
    this.dailySyncTask = cron.schedule('30 23 * * *', async () => {
      await this.executeDailySync()
    }, {
      timezone: "Asia/Shanghai",
      scheduled: true
    })
    
    // 每周补充同步：每周六 22:00
    this.weeklySyncTask = cron.schedule('0 22 * * 6', async () => {
      await this.executeWeeklySync()
    }, {
      timezone: "Asia/Shanghai",
      scheduled: true
    })
    
    this.isRunning = true
    console.log('[JobSyncScheduler] ✅ 定时任务已启动')
    console.log('  📅 每日同步: 每天 23:30 (同步当天作业)')
    console.log('  📅 每周同步: 周六 22:00 (同步最近7天)')
  }
  
  /**
   * 停止定时任务
   */
  stop() {
    if (this.dailySyncTask) {
      this.dailySyncTask.stop()
      this.dailySyncTask = null
    }
    if (this.weeklySyncTask) {
      this.weeklySyncTask.stop()
      this.weeklySyncTask = null
    }
    this.isRunning = false
    console.log('[JobSyncScheduler] ⏹️  定时任务已停止')
  }
  
  /**
   * 获取运行状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      tasks: [
        {
          name: '每日增量同步',
          schedule: '每天 23:30',
          range: '当天作业',
          timezone: 'Asia/Shanghai',
          active: this.dailySyncTask !== null
        },
        {
          name: '每周补充同步',
          schedule: '周六 22:00',
          range: '最近7天',
          timezone: 'Asia/Shanghai',
          active: this.weeklySyncTask !== null
        }
      ]
    }
  }
  
  /**
   * 执行每日同步
   * 同步当天提交的所有作业
   */
  private async executeDailySync() {
    const startTime = Date.now()
    console.log('\n' + '='.repeat(60))
    console.log('[JobSyncScheduler] 🕐 开始执行每日增量同步（当天作业）...')
    console.log('  时间:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))
    console.log('='.repeat(60))
    
    try {
      const response = await fetch(`${this.baseUrl}/api/jobs/smart-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'force=true&syncToday=true'
      })
      
      const data: SyncResult = await response.json()
      const duration = Date.now() - startTime
      
      if (data.success && data.stats) {
        console.log('[JobSyncScheduler] ✅ 每日同步完成')
        console.log('  ⏱️  耗时:', `${duration}ms`)
        console.log('  📊 统计:')
        console.log(`    - 总作业数: ${data.stats.totalJobs}`)
        console.log(`    - 更新作业: ${data.stats.updated}`)
        console.log(`    - 新增作业: ${data.stats.newJobs}`)
        console.log(`    - 状态变化: ${data.stats.changedJobs}`)
        
        // 记录到日志文件（如果配置了）
        await this.logSyncResult({
          type: 'daily',
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          duration,
          success: true,
          stats: data.stats
        })
      } else {
        console.error('[JobSyncScheduler] ❌ 每日同步失败:', data.error)
        await this.logSyncResult({
          type: 'daily',
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          duration,
          success: false,
          error: data.error
        })
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[JobSyncScheduler] ❌ 每日同步异常:', error.message)
      await this.logSyncResult({
        type: 'daily',
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration,
        success: false,
        error: error.message
      })
    } finally {
      console.log('='.repeat(60) + '\n')
    }
  }
  
  /**
   * 执行每周同步
   * 同步最近7天的所有作业，补充遗漏的状态变更
   */
  private async executeWeeklySync() {
    const startTime = Date.now()
    console.log('\n' + '='.repeat(60))
    console.log('[JobSyncScheduler] 🕐 开始执行每周补充同步（最近7天）...')
    console.log('  时间:', new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }))
    console.log('='.repeat(60))
    
    try {
      const response = await fetch(`${this.baseUrl}/api/jobs/smart-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'force=true&recentDays=7'
      })
      
      const data: SyncResult = await response.json()
      const duration = Date.now() - startTime
      
      if (data.success && data.stats) {
        console.log('[JobSyncScheduler] ✅ 每周同步完成')
        console.log('  ⏱️  耗时:', `${duration}ms`)
        console.log('  📊 统计:')
        console.log(`    - 总作业数: ${data.stats.totalJobs}`)
        console.log(`    - 更新作业: ${data.stats.updated}`)
        console.log(`    - 新增作业: ${data.stats.newJobs}`)
        console.log(`    - 状态变化: ${data.stats.changedJobs}`)
        
        // 记录到日志文件（如果配置了）
        await this.logSyncResult({
          type: 'weekly',
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          duration,
          success: true,
          stats: data.stats
        })
      } else {
        console.error('[JobSyncScheduler] ❌ 每周同步失败:', data.error)
        await this.logSyncResult({
          type: 'weekly',
          startTime: new Date(startTime).toISOString(),
          endTime: new Date().toISOString(),
          duration,
          success: false,
          error: data.error
        })
      }
    } catch (error: any) {
      const duration = Date.now() - startTime
      console.error('[JobSyncScheduler] ❌ 每周同步异常:', error.message)
      await this.logSyncResult({
        type: 'weekly',
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration,
        success: false,
        error: error.message
      })
    } finally {
      console.log('='.repeat(60) + '\n')
    }
  }
  
  /**
   * 记录同步日志
   */
  private async logSyncResult(log: {
    type: 'daily' | 'weekly'
    startTime: string
    endTime: string
    duration: number
    success: boolean
    stats?: any
    error?: string
  }) {
    // 可以记录到数据库或日志文件
    // 这里先输出到控制台，后续可扩展
    const logEntry = {
      ...log,
      timestamp: new Date().toISOString()
    }
    
    // TODO: 可以扩展为写入数据库或文件
    // 例如：await supabase.from('sync_logs').insert(logEntry)
    
    if (!log.success) {
      // 失败时可以发送告警（邮件、钉钉、企业微信等）
      // TODO: 实现告警机制
      console.error('[JobSyncScheduler] 📧 需要告警:', logEntry)
    }
  }
  
  /**
   * 手动触发每日同步（用于测试）
   */
  async triggerDailySync() {
    console.log('[JobSyncScheduler] 手动触发每日同步...')
    await this.executeDailySync()
  }
  
  /**
   * 手动触发每周同步（用于测试）
   */
  async triggerWeeklySync() {
    console.log('[JobSyncScheduler] 手动触发每周同步...')
    await this.executeWeeklySync()
  }
}

// 导出单例
export const jobSyncScheduler = new JobSyncScheduler()

