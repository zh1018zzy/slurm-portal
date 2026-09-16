import { 
  CheckCircle,
  Clock,
  Server,
  XCircle,
  AlertTriangle,
  Calendar,
  Info,
  Shield,
  FileText,
  User,
  Bell
} from 'lucide-react'
import { NotificationPriority, NotificationStatus } from '@/lib/notification-types'

// 通知类型图标映射
export const typeIcons: Record<string, any> = {
  job_status_change: CheckCircle,
  job_queue_update: Clock,
  job_resource_allocated: Server,
  job_execution_error: XCircle,
  job_time_limit: AlertTriangle,
  system_resource_alert: Server,
  storage_quota_warning: AlertTriangle,
  node_status_change: Server,
  partition_unavailable: XCircle,
  scheduled_maintenance: Calendar,
  emergency_maintenance: AlertTriangle,
  system_update: Info,
  service_interruption: XCircle,
  security_alert: Shield,
  policy_update: FileText,
  account_warning: User,
  permission_change: Shield,
  project_update: FileText,
  file_operation: FileText,
  usage_report: FileText,
  billing_notification: FileText,
  system_announcement: Bell
}

// 优先级颜色映射
export const priorityColors: Record<NotificationPriority, string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
}

// 状态颜色映射
export const statusColors: Record<NotificationStatus, string> = {
  unread: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  read: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  archived: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
}

// 通知类型中文标签
export const typeLabels: Record<string, string> = {
  job_status_change: '作业状态变更',
  job_queue_update: '队列更新',
  job_resource_allocated: '资源分配',
  job_execution_error: '作业执行错误',
  job_time_limit: '时间限制',
  system_resource_alert: '系统资源警告',
  storage_quota_warning: '存储配额警告',
  node_status_change: '节点状态变更',
  partition_unavailable: '分区不可用',
  scheduled_maintenance: '计划维护',
  emergency_maintenance: '紧急维护',
  system_update: '系统更新',
  service_interruption: '服务中断',
  security_alert: '安全警告',
  policy_update: '策略更新',
  account_warning: '账户警告',
  permission_change: '权限变更',
  project_update: '项目更新',
  file_operation: '文件操作',
  usage_report: '使用报告',
  billing_notification: '账单通知',
  system_announcement: '系统公告'
}

// 优先级中文标签
export const priorityLabels: Record<NotificationPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
  urgent: '紧急'
}

// 状态中文标签
export const statusLabels: Record<NotificationStatus, string> = {
  unread: '未读',
  read: '已读',
  archived: '已归档'
}