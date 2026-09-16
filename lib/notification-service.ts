import { 
  Notification, 
  NotificationType, 
  NotificationPriority, 
  NotificationTemplate,
  NotificationMetadata 
} from '@/lib/notification-types'

// 通知模板定义
const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
  // 作业相关通知模板
  job_status_change: {
    type: 'job_status_change',
    priority: 'medium',
    titleTemplate: '作业状态变化通知',
    messageTemplate: '您的作业 "{{jobName}}" (ID: {{jobId}}) 状态已变更为 {{jobStatus}}',
    actions: [
      { label: '查看详情', url: '/dashboard/jobs/{{jobId}}', style: 'primary' }
    ],
    dismissible: true,
    expirationHours: 72
  },
  
  job_queue_update: {
    type: 'job_queue_update',
    priority: 'low',
    titleTemplate: '队列状态更新',
    messageTemplate: '您的作业 "{{jobName}}" 在队列中的位置发生变化，预计开始时间: {{estimatedStartTime}}',
    dismissible: true,
    expirationHours: 24
  },
  
  job_resource_allocated: {
    type: 'job_resource_allocated',
    priority: 'medium',
    titleTemplate: '资源分配通知',
    messageTemplate: '您的作业 "{{jobName}}" 已分配到节点 {{nodeList}}，即将开始执行',
    actions: [
      { label: '查看详情', url: '/dashboard/jobs/{{jobId}}', style: 'primary' }
    ],
    dismissible: true,
    expirationHours: 48
  },
  
  job_execution_error: {
    type: 'job_execution_error',
    priority: 'high',
    titleTemplate: '作业执行错误',
    messageTemplate: '您的作业 "{{jobName}}" 执行时发生错误: {{errorMessage}}',
    actions: [
      { label: '查看日志', url: '/dashboard/jobs/{{jobId}}', style: 'primary' },
      { label: '重新提交', url: '/dashboard/submit', style: 'secondary' }
    ],
    dismissible: true,
    expirationHours: 168 // 7天
  },
  
  job_time_limit: {
    type: 'job_time_limit',
    priority: 'high',
    titleTemplate: '作业时间限制警告',
    messageTemplate: '您的作业 "{{jobName}}" 即将达到时间限制，剩余时间: {{remainingTime}}',
    actions: [
      { label: '查看详情', url: '/dashboard/jobs/{{jobId}}', style: 'primary' }
    ],
    dismissible: true,
    expirationHours: 2
  },
  
  // 系统资源通知模板
  system_resource_alert: {
    type: 'system_resource_alert',
    priority: 'high',
    titleTemplate: '系统资源警告',
    messageTemplate: '{{resourceType}}使用率已达到 {{currentValue}}%，超过警戒线 {{threshold}}%',
    dismissible: true,
    expirationHours: 12
  },
  
  storage_quota_warning: {
    type: 'storage_quota_warning',
    priority: 'medium',
    titleTemplate: '存储配额警告',
    messageTemplate: '您的存储空间使用率已达到 {{currentValue}}%，请及时清理文件',
    actions: [
      { label: '文件管理', url: '/dashboard/files', style: 'primary' }
    ],
    dismissible: true,
    expirationHours: 48
  },
  
  node_status_change: {
    type: 'node_status_change',
    priority: 'medium',
    titleTemplate: '节点状态变化',
    messageTemplate: '计算节点 {{nodeId}} 状态变更为 {{nodeStatus}}',
    dismissible: true,
    expirationHours: 24
  },
  
  partition_unavailable: {
    type: 'partition_unavailable',
    priority: 'high',
    titleTemplate: '分区不可用',
    messageTemplate: '分区 {{partitionName}} 当前不可用，预计恢复时间: {{estimatedRecoveryTime}}',
    dismissible: true,
    expirationHours: 48
  },
  
  // 系统维护通知模板
  scheduled_maintenance: {
    type: 'scheduled_maintenance',
    priority: 'high',
    titleTemplate: '计划维护通知',
    messageTemplate: '系统将于 {{maintenanceStartTime}} 进行维护，预计持续 {{estimatedDuration}}，请提前保存工作',
    dismissible: false,
    expirationHours: 72
  },
  
  emergency_maintenance: {
    type: 'emergency_maintenance',
    priority: 'urgent',
    titleTemplate: '紧急维护通知',
    messageTemplate: '系统正在进行紧急维护，部分服务可能暂时不可用，预计恢复时间: {{estimatedRecoveryTime}}',
    dismissible: false,
    expirationHours: 24
  },
  
  system_update: {
    type: 'system_update',
    priority: 'medium',
    titleTemplate: '系统更新通知',
    messageTemplate: '系统已更新到新版本，新增功能: {{newFeatures}}',
    dismissible: true,
    expirationHours: 168 // 7天
  },
  
  service_interruption: {
    type: 'service_interruption',
    priority: 'urgent',
    titleTemplate: '服务中断通知',
    messageTemplate: '{{serviceName}} 服务当前不可用，我们正在紧急修复，预计恢复时间: {{estimatedRecoveryTime}}',
    dismissible: false,
    expirationHours: 12
  },
  
  // 安全和政策通知模板
  security_alert: {
    type: 'security_alert',
    priority: 'urgent',
    titleTemplate: '安全警告',
    messageTemplate: '检测到异常登录活动，IP地址: {{ipAddress}}，位置: {{loginLocation}}',
    actions: [
      { label: '修改密码', url: '/dashboard/profile/security', style: 'primary' }
    ],
    dismissible: true,
    expirationHours: 48
  },
  
  policy_update: {
    type: 'policy_update',
    priority: 'medium',
    titleTemplate: '政策更新通知',
    messageTemplate: '使用政策已更新，请查看新的政策条款和使用规范',
    actions: [
      { label: '查看政策', url: '/policies', style: 'primary' }
    ],
    dismissible: true,
    expirationHours: 168 // 7天
  },
  
  account_warning: {
    type: 'account_warning',
    priority: 'high',
    titleTemplate: '账户警告',
    messageTemplate: '您的账户存在违规行为，请遵守使用规范，否则可能影响您的使用权限',
    dismissible: true,
    expirationHours: 168 // 7天
  },
  
  permission_change: {
    type: 'permission_change',
    priority: 'medium',
    titleTemplate: '权限变更通知',
    messageTemplate: '您的账户权限已更新，新权限: {{newPermissions}}',
    dismissible: true,
    expirationHours: 72
  },
  
  // 个人和项目通知模板
  project_update: {
    type: 'project_update',
    priority: 'medium',
    titleTemplate: '项目更新通知',
    messageTemplate: '项目 "{{projectName}}" 信息已更新: {{updateDetails}}',
    dismissible: true,
    expirationHours: 72
  },
  
  file_operation: {
    type: 'file_operation',
    priority: 'low',
    titleTemplate: '文件操作完成',
    messageTemplate: '文件操作已完成: {{operationType}} {{fileName}}',
    actions: [
      { label: '查看文件', url: '/dashboard/files', style: 'primary' }
    ],
    dismissible: true,
    expirationHours: 24
  },
  
  usage_report: {
    type: 'usage_report',
    priority: 'low',
    titleTemplate: '使用报告',
    messageTemplate: '您的{{reportPeriod}}使用报告已生成，总作业数: {{totalJobs}}，计算时长: {{totalComputeTime}}',
    actions: [
      { label: '查看报告', url: '/dashboard/reports', style: 'primary' }
    ],
    dismissible: true,
    expirationHours: 168 // 7天
  },
  
  billing_notification: {
    type: 'billing_notification',
    priority: 'medium',
    titleTemplate: '账单通知',
    messageTemplate: '您的{{billingPeriod}}账单已生成，总费用: {{totalAmount}}',
    actions: [
      { label: '查看账单', url: '/dashboard/billing', style: 'primary' }
    ],
    dismissible: true,
    expirationHours: 168 // 7天
  },
  
  system_announcement: {
    type: 'system_announcement',
    priority: 'medium',
    titleTemplate: '系统公告',
    messageTemplate: '{{announcementContent}}',
    dismissible: true,
    expirationHours: 168 // 7天
  }
}

// 通知工具类
export class NotificationService {
  private static baseUrl = process.env.NEXT_PUBLIC_API_URL || ''

  /**
   * 创建通知
   */
  static async createNotification(
    type: NotificationType,
    data: Record<string, any>,
    options?: {
      userId?: string
      userRole?: string[]
      isGlobal?: boolean
      priority?: NotificationPriority
      customTitle?: string
      customMessage?: string
    }
  ): Promise<boolean> {
    try {
      const template = notificationTemplates[type]
      if (!template) {
        console.error(`未找到通知类型 ${type} 的模板`)
        return false
      }

      // 替换模板变量
      const title = options?.customTitle || this.replaceTemplateVariables(template.titleTemplate, data)
      const message = options?.customMessage || this.replaceTemplateVariables(template.messageTemplate, data)

      // 替换操作按钮中的变量
      const actions = template.actions?.map(action => ({
        ...action,
        url: action.url ? this.replaceTemplateVariables(action.url, data) : undefined
      }))

      // 构建通知对象
      const notification: Omit<Notification, 'id' | 'createdAt'> = {
        type,
        title,
        message,
        priority: options?.priority || template.priority,
        status: 'unread',
        userId: options?.userId,
        userRole: options?.userRole,
        isGlobal: options?.isGlobal || false,
        metadata: this.extractMetadata(type, data),
        actions,
        dismissible: template.dismissible,
        source: 'system',
        category: this.getCategoryFromType(type),
        expiresAt: template.expirationHours ? 
          new Date(Date.now() + template.expirationHours * 60 * 60 * 1000).toISOString() : 
          undefined
      }

      // 直接操作数据库
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.SUPABASE_URL || ''
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      const supabase = createClient(supabaseUrl, supabaseKey)

      const { error } = await supabase
        .from('notifications')
        .insert({
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          status: notification.status,
          user_id: notification.userId,
          user_roles: notification.userRole,
          is_global: notification.isGlobal,
          metadata: notification.metadata,
          actions: notification.actions,
          dismissible: notification.dismissible,
          source: notification.source,
          category: notification.category,
          expires_at: notification.expiresAt
        })

      if (error) {
        console.error('创建通知失败:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('创建通知异常:', error)
      return false
    }
  }

  /**
   * 批量创建通知
   */
  static async createBulkNotifications(
    notifications: Array<{
      type: NotificationType
      data: Record<string, any>
      options?: {
        userId?: string
        userRole?: string[]
        isGlobal?: boolean
        priority?: NotificationPriority
        customTitle?: string
        customMessage?: string
      }
    }>
  ): Promise<number> {
    const promises = notifications.map(({ type, data, options }) => 
      this.createNotification(type, data, options)
    )
    
    const results = await Promise.all(promises)
    return results.filter(success => success).length
  }

  /**
   * 作业状态变化通知
   */
  static async notifyJobStatusChange(
    userId: string,
    jobId: string,
    jobName: string,
    oldStatus: string,
    newStatus: string
  ): Promise<boolean> {
    const priority = this.getJobStatusPriority(newStatus)
    
    return this.createNotification('job_status_change', {
      jobId,
      jobName,
      jobStatus: newStatus,
      oldStatus
    }, {
      userId,
      priority
    })
  }

  /**
   * 系统维护通知
   */
  static async notifyScheduledMaintenance(
    maintenanceStartTime: string,
    estimatedDuration: string,
    affectedServices: string[]
  ): Promise<boolean> {
    return this.createNotification('scheduled_maintenance', {
      maintenanceStartTime,
      estimatedDuration,
      affectedServices: affectedServices.join(', ')
    }, {
      isGlobal: true,
      priority: 'high'
    })
  }

  /**
   * 安全警告通知
   */
  static async notifySecurityAlert(
    userId: string,
    ipAddress: string,
    loginLocation: string
  ): Promise<boolean> {
    return this.createNotification('security_alert', {
      ipAddress,
      loginLocation
    }, {
      userId,
      priority: 'urgent'
    })
  }

  /**
   * 存储配额警告
   */
  static async notifyStorageQuotaWarning(
    userId: string,
    currentUsage: number,
    totalQuota: number
  ): Promise<boolean> {
    const usagePercentage = Math.round((currentUsage / totalQuota) * 100)
    
    return this.createNotification('storage_quota_warning', {
      currentValue: usagePercentage.toString(),
      currentUsage: this.formatBytes(currentUsage),
      totalQuota: this.formatBytes(totalQuota)
    }, {
      userId,
      priority: usagePercentage > 90 ? 'high' : 'medium'
    })
  }

  /**
   * 替换模板变量
   */
  private static replaceTemplateVariables(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return data[key] || match
    })
  }

  /**
   * 提取元数据
   */
  private static extractMetadata(type: NotificationType, data: Record<string, any>): NotificationMetadata {
    const metadata: NotificationMetadata = {}

    // 作业相关元数据
    if (data.jobId) metadata.jobId = data.jobId
    if (data.jobName) metadata.jobName = data.jobName
    if (data.jobStatus) metadata.jobStatus = data.jobStatus
    if (data.partition) metadata.partition = data.partition

    // 系统资源元数据
    if (data.nodeId) metadata.nodeId = data.nodeId
    if (data.resourceType) metadata.resourceType = data.resourceType
    if (data.threshold) metadata.threshold = parseFloat(data.threshold)
    if (data.currentValue) metadata.currentValue = parseFloat(data.currentValue)

    // 维护相关元数据
    if (data.maintenanceStartTime) metadata.maintenanceStartTime = data.maintenanceStartTime
    if (data.maintenanceEndTime) metadata.maintenanceEndTime = data.maintenanceEndTime
    if (data.affectedServices) metadata.affectedServices = data.affectedServices.split(',').map((s: string) => s.trim())

    // 安全相关元数据
    if (data.ipAddress) metadata.ipAddress = data.ipAddress
    if (data.loginLocation) metadata.loginLocation = data.loginLocation

    // 项目相关元数据
    if (data.projectId) metadata.projectId = data.projectId
    if (data.projectName) metadata.projectName = data.projectName

    return metadata
  }

  /**
   * 根据类型获取分类
   */
  private static getCategoryFromType(type: NotificationType): string {
    if (type.startsWith('job_')) return 'job'
    if (type.startsWith('system_')) return 'system'
    if (type.startsWith('security_') || type.startsWith('account_') || type.startsWith('permission_')) return 'security'
    if (type.includes('maintenance') || type.includes('update')) return 'maintenance'
    return 'general'
  }

  /**
   * 根据作业状态确定通知优先级
   */
  private static getJobStatusPriority(status: string): NotificationPriority {
    switch (status.toUpperCase()) {
      case 'FAILED':
      case 'CANCELLED':
        return 'high'
      case 'COMPLETED':
      case 'RUNNING':
        return 'medium'
      case 'PENDING':
      default:
        return 'low'
    }
  }

  /**
   * 格式化字节数
   */
  private static formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * 获取认证token
   */
  private static getAuthToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || ''
    }
    return ''
  }
}

// 便捷的通知创建函数
export const createJobNotification = NotificationService.notifyJobStatusChange
export const createMaintenanceNotification = NotificationService.notifyScheduledMaintenance
export const createSecurityNotification = NotificationService.notifySecurityAlert
export const createStorageNotification = NotificationService.notifyStorageQuotaWarning