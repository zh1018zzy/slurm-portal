import { supabase } from './supabase'
import { logger } from './logger'

// 通知清理配置
interface NotificationCleanupConfig {
  // 自动清理设置
  autoCleanupEnabled: boolean
  cleanupIntervalHours: number
  
  // 保留时间设置（天）
  retentionPeriods: {
    unreadNotifications: number      // 未读通知保留天数
    readNotifications: number        // 已读通知保留天数
    archivedNotifications: number    // 已归档通知保留天数
    urgentNotifications: number      // 紧急通知保留天数
    highPriorityNotifications: number // 高优先级通知保留天数
    mediumPriorityNotifications: number // 中等优先级通知保留天数
    lowPriorityNotifications: number // 低优先级通知保留天数
  }
  
  // 批量清理设置
  batchSize: number
  maxCleanupDuration: number       // 最大清理时间（分钟）
}

// 默认配置
const DEFAULT_CONFIG: NotificationCleanupConfig = {
  autoCleanupEnabled: true,
  cleanupIntervalHours: parseInt(process.env.NOTIFICATION_CLEANUP_INTERVAL || '24'), // 每24小时清理一次
  
  retentionPeriods: {
    unreadNotifications: parseInt(process.env.UNREAD_RETENTION_DAYS || '30'),        // 未读保留30天
    readNotifications: parseInt(process.env.READ_RETENTION_DAYS || '7'),             // 已读保留7天
    archivedNotifications: parseInt(process.env.ARCHIVED_RETENTION_DAYS || '90'),    // 已归档保留90天
    urgentNotifications: parseInt(process.env.URGENT_RETENTION_DAYS || '180'),       // 紧急通知保留180天
    highPriorityNotifications: parseInt(process.env.HIGH_RETENTION_DAYS || '60'),    // 高优先级保留60天
    mediumPriorityNotifications: parseInt(process.env.MEDIUM_RETENTION_DAYS || '30'), // 中等优先级保留30天
    lowPriorityNotifications: parseInt(process.env.LOW_RETENTION_DAYS || '14')       // 低优先级保留14天
  },
  
  batchSize: parseInt(process.env.CLEANUP_BATCH_SIZE || '1000'),
  maxCleanupDuration: parseInt(process.env.MAX_CLEANUP_DURATION || '30') // 30分钟
}

// 清理统计信息
interface CleanupStats {
  totalDeleted: number
  deletedByStatus: {
    unread: number
    read: number
    archived: number
  }
  deletedByPriority: {
    urgent: number
    high: number
    medium: number
    low: number
  }
  expiredNotifications: number
  oldNotifications: number
  duration: number // 清理耗时（毫秒）
}

class NotificationCleanupService {
  private config: NotificationCleanupConfig
  private cleanupTimer?: NodeJS.Timeout
  private isRunning = false

  constructor(config?: Partial<NotificationCleanupConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    
    if (this.config.autoCleanupEnabled) {
      this.startAutoCleanup()
    }
    
    logger.info('NotificationCleanup', '通知清理服务已初始化', {
      autoCleanupEnabled: this.config.autoCleanupEnabled,
      cleanupIntervalHours: this.config.cleanupIntervalHours,
      retentionPeriods: this.config.retentionPeriods
    })
  }

  /**
   * 启动自动清理定时任务
   */
  startAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }

    const intervalMs = this.config.cleanupIntervalHours * 60 * 60 * 1000
    
    this.cleanupTimer = setInterval(async () => {
      if (!this.isRunning) {
        await this.performCleanup()
      }
    }, intervalMs)

    logger.info('NotificationCleanup', '自动清理定时任务已启动', {
      intervalHours: this.config.cleanupIntervalHours,
      nextCleanup: new Date(Date.now() + intervalMs).toISOString()
    })
  }

  /**
   * 停止自动清理
   */
  stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
      logger.info('NotificationCleanup', '自动清理定时任务已停止')
    }
  }

  /**
   * 执行通知清理
   */
  async performCleanup(): Promise<CleanupStats> {
    if (this.isRunning) {
      logger.warn('NotificationCleanup', '清理任务正在运行中，跳过本次执行')
      throw new Error('清理任务正在运行中')
    }

    this.isRunning = true
    const startTime = Date.now()
    
    logger.info('NotificationCleanup', '开始执行通知清理任务')

    const stats: CleanupStats = {
      totalDeleted: 0,
      deletedByStatus: { unread: 0, read: 0, archived: 0 },
      deletedByPriority: { urgent: 0, high: 0, medium: 0, low: 0 },
      expiredNotifications: 0,
      oldNotifications: 0,
      duration: 0
    }

    try {
      // 1. 清理过期通知（使用数据库函数）
      const expiredResult = await this.cleanupExpiredNotifications()
      stats.expiredNotifications = expiredResult.deletedCount
      stats.totalDeleted += expiredResult.deletedCount

      // 2. 按状态清理旧通知
      const statusCleanupResults = await Promise.all([
        this.cleanupNotificationsByStatus('unread', this.config.retentionPeriods.unreadNotifications),
        this.cleanupNotificationsByStatus('read', this.config.retentionPeriods.readNotifications),
        this.cleanupNotificationsByStatus('archived', this.config.retentionPeriods.archivedNotifications)
      ])

      statusCleanupResults.forEach((result, index) => {
        const status = ['unread', 'read', 'archived'][index] as keyof typeof stats.deletedByStatus
        stats.deletedByStatus[status] = result.deletedCount
        stats.oldNotifications += result.deletedCount
        stats.totalDeleted += result.deletedCount
      })

      // 3. 按优先级清理旧通知（如果按状态清理后还需要进一步清理）
      const priorityCleanupResults = await Promise.all([
        this.cleanupNotificationsByPriority('urgent', this.config.retentionPeriods.urgentNotifications),
        this.cleanupNotificationsByPriority('high', this.config.retentionPeriods.highPriorityNotifications),
        this.cleanupNotificationsByPriority('medium', this.config.retentionPeriods.mediumPriorityNotifications),
        this.cleanupNotificationsByPriority('low', this.config.retentionPeriods.lowPriorityNotifications)
      ])

      priorityCleanupResults.forEach((result, index) => {
        const priority = ['urgent', 'high', 'medium', 'low'][index] as keyof typeof stats.deletedByPriority
        stats.deletedByPriority[priority] = result.deletedCount
      })

      stats.duration = Date.now() - startTime

      logger.info('NotificationCleanup', '通知清理任务完成', {
        totalDeleted: stats.totalDeleted,
        expiredNotifications: stats.expiredNotifications,
        oldNotifications: stats.oldNotifications,
        duration: `${stats.duration}ms`,
        deletedByStatus: stats.deletedByStatus
      })

      return stats

    } catch (error) {
      logger.error('NotificationCleanup', '通知清理任务失败', error as Error)
      throw error
    } finally {
      this.isRunning = false
    }
  }

  /**
   * 清理过期通知
   */
  private async cleanupExpiredNotifications(): Promise<{ deletedCount: number }> {
    try {
      // 使用数据库函数清理过期通知
      const { data, error } = await supabase.rpc('cleanup_expired_notifications')
      
      if (error) {
        throw new Error(`清理过期通知失败: ${error.message}`)
      }

      const deletedCount = data || 0
      logger.debug('NotificationCleanup', '已清理过期通知', { deletedCount })
      
      return { deletedCount }
    } catch (error) {
      logger.error('NotificationCleanup', '清理过期通知时出错', error as Error)
      throw error
    }
  }

  /**
   * 按状态清理旧通知
   */
  private async cleanupNotificationsByStatus(status: string, retentionDays: number): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('status', status)
        .lt('created_at', cutoffDate.toISOString())

      if (error) {
        throw new Error(`清理${status}通知失败: ${error.message}`)
      }

      const deletedCount = 0 // Supabase delete doesn't return deleted count
      logger.debug('NotificationCleanup', `已清理${status}状态的旧通知`, {
        status,
        retentionDays,
        deletedCount,
        cutoffDate: cutoffDate.toISOString()
      })

      return { deletedCount }
    } catch (error) {
      logger.error('NotificationCleanup', `清理${status}状态通知时出错`, error as Error)
      throw error
    }
  }

  /**
   * 按优先级清理旧通知
   */
  private async cleanupNotificationsByPriority(priority: string, retentionDays: number): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    try {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('priority', priority)
        .lt('created_at', cutoffDate.toISOString())

      if (error) {
        throw new Error(`清理${priority}优先级通知失败: ${error.message}`)
      }

      const deletedCount = 0 // Supabase delete doesn't return deleted count
      logger.debug('NotificationCleanup', `已清理${priority}优先级的旧通知`, {
        priority,
        retentionDays,
        deletedCount,
        cutoffDate: cutoffDate.toISOString()
      })

      return { deletedCount }
    } catch (error) {
      logger.error('NotificationCleanup', `清理${priority}优先级通知时出错`, error as Error)
      return { deletedCount: 0 }
    }
  }

  /**
   * 手动清理指定用户的通知
   */
  async cleanupUserNotifications(userId: string, options?: {
    olderThanDays?: number
    status?: string[]
    priority?: string[]
  }): Promise<{ deletedCount: number }> {
    const olderThanDays = options?.olderThanDays || 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    try {
      let query = supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString())

      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status)
      }

      if (options?.priority && options.priority.length > 0) {
        query = query.in('priority', options.priority)
      }

      const { data, error } = await query

      if (error) {
        throw new Error(`清理用户通知失败: ${error.message}`)
      }

      const deletedCount = 0 // Supabase delete doesn't return deleted count
      logger.info('NotificationCleanup', '已清理用户通知', {
        userId,
        deletedCount,
        options,
        cutoffDate: cutoffDate.toISOString()
      })

      return { deletedCount }
    } catch (error) {
      logger.error('NotificationCleanup', '清理用户通知时出错', error as Error, { userId })
      throw error
    }
  }

  /**
   * 获取清理统计信息
   */
  async getCleanupStatistics(): Promise<{
    totalNotifications: number
    notificationsByStatus: Record<string, number>
    notificationsByPriority: Record<string, number>
    oldestNotification: string | null
    estimatedCleanupCount: number
  }> {
    try {
      // 获取总通知数
      const { count: totalNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })

      // 按状态统计
      const { data: statusStats } = await supabase
        .from('notifications')
        .select('status')
        .not('status', 'is', null)

      // 按优先级统计
      const { data: priorityStats } = await supabase
        .from('notifications')
        .select('priority')
        .not('priority', 'is', null)

      // 获取最旧的通知
      const { data: oldestData } = await supabase
        .from('notifications')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)

      // 统计可清理的通知数量
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - Math.min(...Object.values(this.config.retentionPeriods)))
      
      const { count: estimatedCleanupCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString())

      // 统计数据处理
      const notificationsByStatus: Record<string, number> = {}
      statusStats?.forEach((item: any) => {
        notificationsByStatus[item.status] = (notificationsByStatus[item.status] || 0) + 1
      })

      const notificationsByPriority: Record<string, number> = {}
      priorityStats?.forEach((item: any) => {
        notificationsByPriority[item.priority] = (notificationsByPriority[item.priority] || 0) + 1
      })

      return {
        totalNotifications: totalNotifications || 0,
        notificationsByStatus,
        notificationsByPriority,
        oldestNotification: oldestData?.[0]?.created_at || null,
        estimatedCleanupCount: estimatedCleanupCount || 0
      }
    } catch (error) {
      logger.error('NotificationCleanup', '获取清理统计信息失败', error as Error)
      throw error
    }
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<NotificationCleanupConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    logger.info('NotificationCleanup', '清理配置已更新', { newConfig })

    // 重启自动清理（如果启用）
    if (this.config.autoCleanupEnabled) {
      this.startAutoCleanup()
    } else {
      this.stopAutoCleanup()
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): NotificationCleanupConfig {
    return { ...this.config }
  }

  /**
   * 获取运行状态
   */
  getStatus(): {
    isRunning: boolean
    autoCleanupEnabled: boolean
    nextCleanupTime: string | null
  } {
    const nextCleanupTime = this.cleanupTimer
      ? new Date(Date.now() + this.config.cleanupIntervalHours * 60 * 60 * 1000).toISOString()
      : null

    return {
      isRunning: this.isRunning,
      autoCleanupEnabled: this.config.autoCleanupEnabled,
      nextCleanupTime
    }
  }

  /**
   * 关闭服务
   */
  shutdown(): void {
    this.stopAutoCleanup()
    logger.info('NotificationCleanup', '通知清理服务已关闭')
  }
}

// 创建全局清理服务实例
export const notificationCleanupService = new NotificationCleanupService()

// 进程退出时关闭服务
process.on('exit', () => {
  notificationCleanupService.shutdown()
})

process.on('SIGINT', () => {
  notificationCleanupService.shutdown()
  process.exit(0)
})

process.on('SIGTERM', () => {
  notificationCleanupService.shutdown()
  process.exit(0)
})

export default notificationCleanupService