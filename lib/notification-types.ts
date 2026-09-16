// 通知系统的类型定义

export type NotificationType = 
  // 作业相关通知
  | 'job_status_change'     // 作业状态变化
  | 'job_queue_update'      // 队列状态更新
  | 'job_resource_allocated'// 资源分配
  | 'job_execution_error'   // 执行错误
  | 'job_time_limit'        // 时间限制警告
  
  // 系统资源通知
  | 'system_resource_alert' // 系统资源警告
  | 'storage_quota_warning' // 存储配额警告
  | 'node_status_change'    // 节点状态变化
  | 'partition_unavailable' // 分区不可用
  
  // 系统维护通知
  | 'scheduled_maintenance' // 计划维护
  | 'emergency_maintenance' // 紧急维护
  | 'system_update'         // 系统更新
  | 'service_interruption'  // 服务中断
  
  // 安全和政策通知
  | 'security_alert'        // 安全警告
  | 'policy_update'         // 政策更新
  | 'account_warning'       // 账户警告
  | 'permission_change'     // 权限变更
  
  // 个人和项目通知
  | 'project_update'        // 项目更新
  | 'file_operation'        // 文件操作完成
  | 'usage_report'          // 使用报告
  | 'billing_notification'  // 账单通知
  | 'system_announcement'   // 系统公告

export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent'

export type NotificationStatus = 'unread' | 'read' | 'archived'

export interface NotificationAction {
  label: string
  url?: string
  action?: string
  style?: 'primary' | 'secondary' | 'destructive'
}

export interface NotificationMetadata {
  // 作业相关元数据
  jobId?: string
  jobName?: string
  jobStatus?: string
  partition?: string
  
  // 系统资源元数据
  nodeId?: string
  resourceType?: string
  threshold?: number
  currentValue?: number
  
  // 维护相关元数据
  maintenanceStartTime?: string
  maintenanceEndTime?: string
  affectedServices?: string[]
  
  // 安全相关元数据
  ipAddress?: string
  loginLocation?: string
  
  // 项目相关元数据
  projectId?: string
  projectName?: string
  
  // 通用元数据
  severity?: string
  estimatedDuration?: string
  affectedUsers?: number
}

export interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  priority: NotificationPriority
  status: NotificationStatus
  createdAt: string
  updatedAt?: string
  expiresAt?: string
  
  // 目标用户
  userId?: string
  userRole?: string[]  // 针对特定角色的通知
  isGlobal?: boolean   // 全局通知
  
  // 通知元数据
  metadata?: NotificationMetadata
  
  // 可操作按钮
  actions?: NotificationAction[]
  
  // 是否可关闭
  dismissible?: boolean
  
  // 通知来源
  source?: string
  category?: string
}

// 通知偏好设置
export interface NotificationPreferences {
  userId: string
  
  // 通知方式偏好
  emailNotifications: boolean
  webNotifications: boolean
  mobileNotifications?: boolean
  
  // 按类型的通知设置
  jobNotifications: {
    statusChanges: boolean
    queueUpdates: boolean
    errors: boolean
    timeWarnings: boolean
  }
  
  systemNotifications: {
    resourceAlerts: boolean
    maintenance: boolean
    outages: boolean
  }
  
  securityNotifications: {
    loginAlerts: boolean
    policyChanges: boolean
    accountWarnings: boolean
  }
  
  // 优先级过滤
  minimumPriority: NotificationPriority
  
  // 工作时间设置
  quietHours?: {
    enabled: boolean
    startTime: string // HH:mm
    endTime: string   // HH:mm
    timezone: string
  }
  
  // 批量通知设置
  batchNotifications?: {
    enabled: boolean
    interval: number // 分钟
    maxBatchSize: number
  }
}

// 通知模板
export interface NotificationTemplate {
  type: NotificationType
  priority: NotificationPriority
  titleTemplate: string    // 支持变量替换，如 "作业 {{jobName}} 已完成"
  messageTemplate: string
  actions?: NotificationAction[]
  dismissible: boolean
  expirationHours?: number // 通知过期时间（小时）
}

// 通知统计
export interface NotificationStats {
  total: number
  unread: number
  byPriority: Record<NotificationPriority, number>
  byType: Record<NotificationType, number>
  recentCount: number // 最近24小时
}

// 通知查询参数
export interface NotificationQuery {
  userId?: string
  status?: NotificationStatus
  type?: NotificationType
  priority?: NotificationPriority
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
  sortBy?: 'createdAt' | 'priority'
  sortOrder?: 'asc' | 'desc'
}

// 批量操作
export interface NotificationBatchOperation {
  action: 'mark_read' | 'mark_unread' | 'archive' | 'delete'
  notificationIds: string[]
  userId: string
}