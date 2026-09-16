'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  Notification,
  NotificationStats,
  NotificationPriority,
  NotificationType,
  NotificationStatus
} from '@/lib/notification-types'
import {
  typeIcons,
  priorityColors,
  statusColors,
  typeLabels,
  priorityLabels,
  statusLabels
} from '@/lib/notification-constants'
import { NotificationCard } from '@/components/notifications/NotificationCard'
import { StatsCards } from '@/components/notifications/StatsCards'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Settings,
  Check,
  Archive,
  Trash2,
  Filter,
  Eye,
  EyeOff,
  RefreshCw,
  Clock
} from 'lucide-react'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'
import { useGlobalNotifications } from '@/contexts/NotificationProvider'

export default function NotificationsPage() {
  const { user } = useAuth()
  const locale = useLocale()
  const t = useT('notifications')
  const tCommon = useT('common')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set())

  // 获取全局通知上下文，用于同步更新顶部通知按钮
  const globalNotifications = useGlobalNotifications()
  

  
  // 过滤和分页状态
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  // 获取通知列表
  useEffect(() => {
    fetchNotifications()
    fetchStats()
  }, [user?.username, statusFilter, typeFilter, priorityFilter, searchTerm, page])

  // 键盘快捷键
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Ctrl/Cmd + A: 全选/取消全选
      if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        event.preventDefault()
        handleSelectAll()
      }
      // Ctrl/Cmd + R: 刷新
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault()
        handleRefresh()
      }
      // Ctrl/Cmd + Enter: 标记所有未读为已读
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        handleMarkAllRead()
      }
      // Delete: 删除选中的通知
      if (event.key === 'Delete' && selectedNotifications.size > 0) {
        event.preventDefault()
        handleDelete()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [notifications, selectedNotifications])

  async function fetchNotifications() {
    if (!user?.username) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: ((page - 1) * pageSize).toString()
      })
      
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (searchTerm.trim()) params.set('search', searchTerm)
      
      const res = await fetch(`/api/notifications?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      const data = await res.json()
      if (data.success) {
        setNotifications(data.notifications || [])
        setTotal(data.total || 0)
      } else {
        toast({ title: t('fetchFailed'), description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: t('cannotConnect'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  async function fetchStats() {
    if (!user?.username) return
    
    try {
      const res = await fetch('/api/notifications?stats=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      const data = await res.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error(t('fetchStatsFailed'), error)
    }
  }



  // 批量操作
  async function handleBatchOperation(action: 'mark_read' | 'mark_unread' | 'archive') {
    if (selectedNotifications.size === 0) {
      toast({ title: t('selectToOperate'), variant: 'destructive' })
      return
    }

    try {
      const ids = Array.from(selectedNotifications)

      if (action === 'mark_read') {
        // 使用全局的 markAsRead 方法
        await globalNotifications.markAsRead(ids)
      } else {
        // 其他操作手动调用API
        const res = await fetch('/api/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            ids,
            updates: {
              status: action === 'mark_unread' ? 'unread' : 'archived'
            }
          })
        })

        const data = await res.json()
        if (!data.success) {
          throw new Error(data.error || t('operationFailed'))
        }

        // 刷新全局通知
        await globalNotifications.fetchNotifications()
      }

      toast({ title: t('operationSuccess'), description: t('operationSuccess') })
      setSelectedNotifications(new Set())
      fetchNotifications()
      fetchStats()
    } catch (error) {
      toast({ title: t('networkError'), description: t('operationFailed'), variant: 'destructive' })
    }
  }

  // 单个通知状态切换 - 只允许未读变为已读
  async function handleMarkAsRead(notificationId: string, currentStatus: string) {
    // 如果已经是已读状态，不做任何操作
    if (currentStatus === 'read') {
      return
    }

    try {
      // 直接使用全局的 markAsRead 方法，它会自动更新全局状态
      await globalNotifications.markAsRead([notificationId])

      // 同时更新本地状态，保证页面立即响应
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, status: 'read' } : n
      ))
      fetchStats()

      toast({ title: t('operationSuccess'), description: t('markedAsRead') })
    } catch (error) {
      toast({ title: t('networkError'), description: t('operationFailed'), variant: 'destructive' })
    }
  }

  // 强制切换通知状态（用于特殊操作，如右键菜单或管理员功能）
  async function handleToggleStatus(notificationId: string, currentStatus: string) {
    try {
      const newStatus = currentStatus === 'unread' ? 'read' : 'unread'

      // 直接使用全局的 markAsRead 方法
      if (newStatus === 'read') {
        await globalNotifications.markAsRead([notificationId])
      } else {
        // 对于标记为未读，需要手动调用API
        const res = await fetch('/api/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            ids: [notificationId],
            updates: { status: 'unread' }
          })
        })

        const data = await res.json()
        if (!data.success) {
          throw new Error(data.error || t('operationFailed'))
        }

        // 刷新全局通知
        await globalNotifications.fetchNotifications()
      }

      // 同时更新本地状态
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, status: newStatus } : n
      ))
      fetchStats()
    } catch (error) {
      toast({ title: t('networkError'), description: t('operationFailed'), variant: 'destructive' })
    }
  }

  // 全选/取消全选
  function handleSelectAll() {
    if (selectedNotifications.size === notifications.length) {
      setSelectedNotifications(new Set())
    } else {
      setSelectedNotifications(new Set(notifications.map(n => n.id)))
    }
  }

  // 快速操作：标记所有未读为已读
  async function handleMarkAllRead() {
    const unreadNotifications = notifications.filter(n => n.status === 'unread')
    if (unreadNotifications.length === 0) {
      toast({ title: t('noUnreadNotifications'), variant: 'destructive' })
      return
    }

    try {
      // 直接使用全局的 markAllAsRead 方法
      await globalNotifications.markAllAsRead()

      // 同时更新本地状态
      fetchNotifications()
      fetchStats()

      toast({ title: t('operationSuccess'), description: t('markedCount', { count: unreadNotifications.length }) })
    } catch (error) {
      toast({ title: t('networkError'), description: t('operationFailed'), variant: 'destructive' })
    }
  }

  // 快速操作：标记所有已读为未读
  async function handleMarkAllUnread() {
    const readNotifications = notifications.filter(n => n.status === 'read')
    if (readNotifications.length === 0) {
      toast({ title: t('noReadNotifications'), variant: 'destructive' })
      return
    }

    try {
      const res = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ids: readNotifications.map(n => n.id),
          updates: { status: 'unread' }
        })
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: t('operationSuccess'), description: t('markedCountUnread', { count: readNotifications.length }) })
        fetchNotifications()
        fetchStats()
        // 主动刷新全局通知状态，立即更新顶部通知按钮
        globalNotifications.fetchNotifications()
      } else {
        toast({ title: t('operationFailed'), description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: t('operationFailed'), variant: 'destructive' })
    }
  }

  // 刷新通知列表
  async function handleRefresh() {
    setLoading(true)
    await Promise.all([fetchNotifications(), fetchStats()])
    toast({ title: t('refreshSuccess'), description: t('listUpdated') })
  }

  // 删除通知
  async function handleDelete() {
    if (selectedNotifications.size === 0) {
      toast({ title: t('selectToDelete'), variant: 'destructive' })
      return
    }

    // 确认删除
    const confirmed = window.confirm(
      t('confirmDeleteMultiple', { count: selectedNotifications.size })
    )

    if (!confirmed) {
      return
    }

    try {
      const res = await fetch(`/api/notifications?ids=${Array.from(selectedNotifications).join(',')}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: t('deleteSuccess'), description: data.message })
        setSelectedNotifications(new Set())
        fetchNotifications()
        fetchStats()
      } else {
        toast({ title: t('deleteFailed'), description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: t('deleteFailed'), variant: 'destructive' })
    }
  }

  // 单个通知删除
  async function handleDeleteSingle(notificationId: string, notificationTitle: string) {
    const confirmed = window.confirm(
      t('confirmDeleteSingle', { title: notificationTitle })
    )

    if (!confirmed) {
      return
    }

    try {
      const res = await fetch(`/api/notifications?ids=${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: t('deleteSuccess'), description: data.message })
        fetchNotifications()
        fetchStats()
      } else {
        toast({ title: t('deleteFailed'), description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: t('deleteFailed'), variant: 'destructive' })
    }
  }

  // 清空所有通知
  async function handleClearAll() {
    if (notifications.length === 0) {
      toast({ title: t('noNotificationsToClear'), variant: 'destructive' })
      return
    }

    const confirmed = window.confirm(
      t('confirmClearAll', { count: notifications.length })
    )

    if (!confirmed) {
      return
    }

    try {
      const allIds = notifications.map(n => n.id)
      const res = await fetch(`/api/notifications?ids=${allIds.join(',')}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const data = await res.json()
      if (data.success) {
        toast({ title: t('clearSuccess'), description: data.message })
        fetchNotifications()
        fetchStats()
      } else {
        toast({ title: t('clearFailed'), description: data.error, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: t('clearFailed'), variant: 'destructive' })
    }
  }

  // 格式化时间
  function formatTime(timeStr: string) {
    const date = new Date(timeStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) {
      return t('daysAgo', { days: diffDays })
    } else if (diffHours > 0) {
      return t('hoursAgo', { hours: diffHours })
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return diffMinutes > 0 ? t('minutesAgo', { minutes: diffMinutes }) : t('justNow')
    }
  }

  // 创建测试通知
  const handleCreateTestNotifications = async () => {
    if (!user) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: t('testNotificationCreated'),
          description: data.message
        })
        // 刷新通知列表
        await handleRefresh()
      } else {
        toast({
          title: t('createTestFailed'),
          description: data.error,
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: t('networkError'),
        description: t('createTestFailed'),
        variant: 'destructive'
      })
    }
  }
  function getTypeDisplayName(type: NotificationType) {
    const typeNames: Record<NotificationType, string> = {
      job_status_change: t('typeJobStatusChange'),
      job_queue_update: t('typeJobQueueUpdate'),
      job_resource_allocated: t('typeJobResourceAllocated'),
      job_execution_error: t('typeJobExecutionError'),
      job_time_limit: t('typeJobTimeLimit'),
      system_resource_alert: t('typeSystemResourceAlert'),
      storage_quota_warning: t('typeStorageQuotaWarning'),
      node_status_change: t('typeNodeStatusChange'),
      partition_unavailable: t('typePartitionUnavailable'),
      scheduled_maintenance: t('typeScheduledMaintenanceFull'),
      emergency_maintenance: t('typeEmergencyMaintenance'),
      system_update: t('typeSystemUpdate'),
      service_interruption: t('typeServiceInterruption'),
      security_alert: t('typeSecurityAlertFull'),
      policy_update: t('typePolicyUpdate'),
      account_warning: t('typeAccountWarning'),
      permission_change: t('typePermissionChange'),
      project_update: t('typeProjectUpdate'),
      file_operation: t('typeFileOperation'),
      usage_report: t('typeUsageReport'),
      billing_notification: t('typeBillingNotification'),
      system_announcement: t('typeSystemAnnouncement')
    }
    return typeNames[type] || type
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCreateTestNotifications}>
            <Bell className="h-4 w-4 mr-2" />
            {t('createTest')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {tCommon('refresh')}
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            {t('notificationSettings')}
          </Button>
        </div>
      </div>

      {/* 通知统计 */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <TechCard className="p-3" hover>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('totalNotifications')}</span>
              <span className="text-xl font-bold">{stats.total}</span>
            </div>
          </TechCard>
          <TechCard className="p-3" hover>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('unread')}</span>
              <span className="text-xl font-bold text-green-600">{stats.unread}</span>
            </div>
          </TechCard>
          <TechCard className="p-3" hover>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('highPriority')}</span>
              <span className="text-xl font-bold text-orange-600">{stats.byPriority.high + stats.byPriority.urgent}</span>
            </div>
          </TechCard>
          <TechCard className="p-3" hover>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t('recent24h')}</span>
              <span className="text-xl font-bold">{stats.recentCount}</span>
            </div>
          </TechCard>
        </div>
      )}

      {/* 过滤和搜索 */}
      <TechCard className="mb-4" hover>
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap items-center">
            <div className="flex-1 min-w-48">
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="w-28">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="unread">{t('statusUnread')}</SelectItem>
                  <SelectItem value="read">{t('statusRead')}</SelectItem>
                  <SelectItem value="archived">{t('statusArchived')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-28">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allPriority')}</SelectItem>
                  <SelectItem value="urgent">{t('priorityUrgent')}</SelectItem>
                  <SelectItem value="high">{t('priorityHigh')}</SelectItem>
                  <SelectItem value="medium">{t('priorityMedium')}</SelectItem>
                  <SelectItem value="low">{t('priorityLow')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  <SelectItem value="job_status_change">{t('typeJobStatus')}</SelectItem>
                  <SelectItem value="system_resource_alert">{t('typeSystemResource')}</SelectItem>
                  <SelectItem value="scheduled_maintenance">{t('typeScheduledMaintenance')}</SelectItem>
                  <SelectItem value="security_alert">{t('typeSecurityAlert')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={notifications.filter(n => n.status === 'unread').length === 0}
                className="h-8 px-3"
              >
                <Eye className="h-3 w-3 mr-1" />
                {t('markAllRead')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleMarkAllUnread}
                disabled={notifications.filter(n => n.status === 'read').length === 0}
                className="h-8 px-3"
              >
                <EyeOff className="h-3 w-3 mr-1" />
                {t('markAllUnread')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                {t('clearAll')}
              </Button>
            </div>
          </div>
        </CardContent>
      </TechCard>

      {/* 批量操作 */}
      {selectedNotifications.size > 0 && (
        <TechCard className="mb-4 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-blue-800 dark:text-blue-200">
                {t('selected', { count: selectedNotifications.size })}
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBatchOperation('mark_read')} className="h-7 px-2">
                  <Check className="h-3 w-3 mr-1" />
                  {t('markRead')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBatchOperation('mark_unread')} className="h-7 px-2">
                  <Clock className="h-3 w-3 mr-1" />
                  {t('markUnread')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBatchOperation('archive')} className="h-7 px-2">
                  <Archive className="h-3 w-3 mr-1" />
                  {t('archive')}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleDelete} className="h-7 px-2">
                  <Trash2 className="h-3 w-3 mr-1" />
                  {tCommon('delete')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedNotifications(new Set())} className="h-7 px-2">
                  {t('cancelSelection')}
                </Button>
              </div>
            </div>
          </CardContent>
        </TechCard>
      )}

      {/* 通知列表 */}
      <TechCard hover>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>{t('notificationList')}</span>
              {notifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedNotifications.size === notifications.length && notifications.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">{t('selectAll')}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="hidden lg:flex items-center gap-2">
                <span>{t('shortcuts')}</span>
                <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+A</kbd>
                <span>{t('shortcutSelectAll')}</span>
                <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+R</kbd>
                <span>{t('shortcutRefresh')}</span>
                <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Ctrl+Enter</kbd>
                <span>{t('shortcutMarkAllRead')}</span>
                <kbd className="px-1 py-0.5 text-xs bg-muted rounded">Delete</kbd>
                <span>{t('shortcutDelete')}</span>
              </div>
              <div>
                {t('totalCount', { count: total })}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t('loading')}</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('emptyState')}
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const IconComponent = typeIcons[notification.type] || Bell
                const isUnread = notification.status === 'unread'
                return (
                  <div
                    key={notification.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      isUnread ? 'border-l-4 border-l-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedNotifications.has(notification.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedNotifications)
                          if (checked) {
                            newSelected.add(notification.id)
                          } else {
                            newSelected.delete(notification.id)
                          }
                          setSelectedNotifications(newSelected)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />

                      <div className="flex-shrink-0 mt-0.5">
                        <IconComponent className="h-4 w-4 text-muted-foreground" />
                      </div>

                      <div
                        className="flex-1 min-w-0 cursor-pointer hover:bg-muted/30 -m-2 p-2 rounded"
                        onClick={() => handleMarkAsRead(notification.id, notification.status)}
                        title={isUnread ? t('clickToMarkRead') : t('emptyState')}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-sm font-medium flex-1 min-w-0 ${isUnread ? 'font-semibold' : ''}`}>
                            <span className="truncate block">{notification.title}</span>
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge className={`text-xs px-1.5 py-0.5 ${priorityColors[notification.priority]}`}>
                              {notification.priority === 'urgent' ? t('priorityUrgent') :
                               notification.priority === 'high' ? t('priorityHigh') :
                               notification.priority === 'medium' ? t('priorityMedium') : t('priorityLow')}
                            </Badge>
                            <Badge className={`text-xs px-1.5 py-0.5 ${statusColors[notification.status]}`}>
                              {notification.status === 'unread' ? t('statusUnread') :
                               notification.status === 'read' ? t('statusRead') : t('statusArchived')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            {isUnread ? (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                                <span className="hidden sm:inline text-blue-600 font-medium">{t('clickToMarkRead')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1">
                                <EyeOff className="h-3 w-3" />
                                <span className="hidden sm:inline">{t('alreadyRead')}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                          {notification.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="hidden md:inline">{getTypeDisplayName(notification.type)}</span>
                            <span>•</span>
                            <span>{formatTime(notification.createdAt)}</span>
                            {notification.metadata?.jobId && (
                              <>
                                <span>•</span>
                                <span className="hidden lg:inline">ID: {notification.metadata.jobId}</span>
                              </>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {notification.actions && notification.actions.length > 0 && (
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                {notification.actions.map((action, index) => (
                                  <Button
                                    key={index}
                                    size="sm"
                                    variant={action.style === 'primary' ? 'default' : 'outline'}
                                    className="h-6 px-2 text-xs"
                                    onClick={() => {
                                      if (action.url) {
                                        window.open(action.url, '_blank')
                                      }
                                    }}
                                  >
                                    {action.label}
                                  </Button>
                                ))}
                              </div>
                            )}

                            {/* 状态切换按钮（高级操作） */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Settings className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(notification.id, notification.status)}
                                >
                                  {isUnread ? (
                                    <>
                                      <Eye className="mr-2 h-3 w-3" />
                                      {t('markAsRead')}
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="mr-2 h-3 w-3" />
                                      {t('markUnread')}
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSingle(notification.id, notification.title)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="mr-2 h-3 w-3" />
                                  {t('deleteNotificationAction')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 分页 */}
          {total > 0 && (
            <div className="flex justify-between items-center mt-6">
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div>
                  {t('page', { page })}，{t('totalPages', { total: Math.ceil(total / pageSize) })}，{t('totalItems', { total })}
                </div>
                <div className="flex items-center gap-2">
                  <span>{t('itemsPerPage')}</span>
                  <Select value={pageSize.toString()} onValueChange={(value) => {
                    setPageSize(parseInt(value))
                    setPage(1) // 重置到第一页
                  }}>
                    <SelectTrigger className="w-16 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                  <span>{t('items')}</span>
                </div>
              </div>
              {total > pageSize && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    {t('previousPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(total / pageSize)}
                  >
                    {t('nextPage')}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </TechCard>
    </div>
  )
}