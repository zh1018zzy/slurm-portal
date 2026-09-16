'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'
import { fetchNotifications, fetchNotificationStats } from '@/lib/api-request-manager'
import { globalRequestManager } from '@/lib/global-request-manager'

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'unread' | 'read' | 'archived'
  createdAt: string
  updatedAt?: string
  expiresAt?: string
  userId?: string
  userRole?: string[]
  isGlobal: boolean
  metadata?: any
  actions?: Array<{
    label: string
    url: string
    style: 'primary' | 'secondary'
  }>
  dismissible: boolean
  source: string
  category: string
}

export interface NotificationStats {
  total: number
  unread: number
  byPriority: {
    low: number
    medium: number
    high: number
    urgent: number
  }
  byType: Record<string, number>
  recentCount: number
}

export interface UseNotificationsReturn {
  notifications: Notification[]
  stats: NotificationStats | null
  loading: boolean
  error: string | null
  unreadCount: number
  fetchNotifications: (force?: boolean) => Promise<void>
  markAsRead: (ids: string[]) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotifications: (ids: string[]) => Promise<void>
  refreshStats: () => Promise<void>
}

export function useNotifications(options?: {
  autoFetch?: boolean
  pollInterval?: number
  showToast?: boolean
}): UseNotificationsReturn {
  const { 
    autoFetch = true, 
    pollInterval = 120000, // 改为120秒轮询，与Provider保持一致
    showToast = true 
  } = options || {}

  const { user, getAuthToken } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [stats, setStats] = useState<NotificationStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastNotificationCount, setLastNotificationCount] = useState(0)

  // 使用 useRef 存储时间戳，避免依赖项变化
  const lastFetchTimeRef = useRef(0)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const minFetchInterval = 10000 // 减少到10秒，但仍然防止过于频繁的请求

  const fetchNotificationData = useCallback(async (showLoading = true, force = false) => {
    if (!user) return

    // 节流控制：避免过于频繁的请求（除非强制刷新）
    const now = Date.now()
    if (!force && now - lastFetchTimeRef.current < minFetchInterval) {
      console.log('useNotifications: 请求过于频繁，跳过本次获取')
      return
    }

    if (showLoading) setLoading(true)
    setError(null)

    try {
      const token = getAuthToken()

      // 使用全局请求管理器进行防抖请求（force时跳过缓存）
      const data = force
        ? await fetchNotifications(token)
        : await globalRequestManager.deduplicateRequest(
            'notifications',
            () => fetchNotifications(token),
            60000 // 60秒缓存
          )

      if (data.success) {
        const newNotifications = data.notifications || []
        setNotifications(newNotifications)

        // 检查是否有新通知
        if (showToast && newNotifications.length > lastNotificationCount && lastNotificationCount > 0) {
          const newCount = newNotifications.length - lastNotificationCount
          const urgentNotifications = newNotifications.slice(0, newCount).filter((n: Notification) =>
            n.status === 'unread' && (n.priority === 'urgent' || n.priority === 'high')
          )

          // 只显示最重要的通知，避免过多toast
          if (urgentNotifications.length > 0) {
            const mostUrgent = urgentNotifications[0]
            toast({
              title: mostUrgent.title,
              description: mostUrgent.message,
              variant: mostUrgent.priority === 'urgent' ? 'destructive' : 'default',
              duration: mostUrgent.priority === 'urgent' ? 8000 : 5000
            })
          } else if (newCount > 0 && newCount <= 3) {
            // 只有少量新通知时才显示汇总
            toast({
              title: '新通知',
              description: `您有 ${newCount} 条新通知`,
              duration: 3000
            })
          }
        }

        setLastNotificationCount(newNotifications.length)
        lastFetchTimeRef.current = now
        setRetryCount(0) // 成功后重置重试计数
      } else {
        throw new Error(data.error || '获取通知失败')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '网络错误'

      // 只有在重试次数未达到上限时才设置错误状态
      if (retryCount >= maxRetries) {
        setError(errorMessage)
        console.error('获取通知失败，已达到最大重试次数:', err)
      } else {
        setRetryCount(prev => prev + 1)
        console.warn(`获取通知失败，将重试 (${retryCount + 1}/${maxRetries}):`, errorMessage)

        // 延迟重试
        setTimeout(() => {
          fetchNotificationData(false)
        }, Math.min(1000 * Math.pow(2, retryCount), 10000)) // 指数退避，最大10秒
      }
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [user, getAuthToken, showToast, lastNotificationCount, retryCount, minFetchInterval, maxRetries])

  const refreshStats = useCallback(async () => {
    if (!user) return

    // 统计信息更新频率限制（最多每30秒更新一次）
    const statsUpdateInterval = 30000
    if (Date.now() - lastFetchTimeRef.current < statsUpdateInterval) {
      return
    }

    try {
      const token = getAuthToken()
      const data = await fetchNotificationStats(token)

      if (data.success) {
        setStats(data.stats)
      }
    } catch (err) {
      // 静默处理统计请求错误，不影响主要功能
      console.warn('获取通知统计失败:', err instanceof Error ? err.message : '未知错误')
    }
  }, [user, getAuthToken])

  const markAsRead = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return

    try {
      const token = getAuthToken()
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ids,
          updates: { status: 'read' }
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // 更新本地状态
        setNotifications(prev => 
          prev.map(notification => 
            ids.includes(notification.id) 
              ? { ...notification, status: 'read' as const }
              : notification
          )
        )
        
        // 刷新统计
        await refreshStats()
      } else {
        throw new Error(data.error || '标记已读失败')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '网络错误'
      toast({
        title: '操作失败',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [user, getAuthToken, refreshStats])

  const markAllAsRead = useCallback(async () => {
    const unreadNotifications = notifications.filter(n => n.status === 'unread')
    if (unreadNotifications.length === 0) return

    await markAsRead(unreadNotifications.map(n => n.id))
  }, [notifications, markAsRead])

  const deleteNotifications = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/notifications?ids=${ids.join(',')}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // 更新本地状态
        setNotifications(prev => prev.filter(notification => !ids.includes(notification.id)))
        
        // 刷新统计
        await refreshStats()
        
        toast({
          title: '删除成功',
          description: data.message
        })
      } else {
        throw new Error(data.error || '删除失败')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '网络错误'
      toast({
        title: '删除失败',
        description: errorMessage,
        variant: 'destructive'
      })
    }
  }, [user, getAuthToken, refreshStats])

  // 计算未读数量
  const unreadCount = notifications.filter(n => n.status === 'unread').length

  // 自动获取通知 - 优化依赖项
  useEffect(() => {
    if (autoFetch && user) {
      fetchNotificationData()
      // 延迟获取统计，避免同时发出多个请求
      setTimeout(() => {
        refreshStats()
      }, 2000)
    }
  }, [autoFetch, user, fetchNotificationData, refreshStats])

  // 智能轮询：根据页面可见性调整频率
  useEffect(() => {
    if (!autoFetch || !user || pollInterval <= 0) return

    let interval: NodeJS.Timeout
    let isPageVisible = !document.hidden

    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      const wasVisible = isPageVisible
      isPageVisible = !document.hidden
      
      if (isPageVisible && !wasVisible) {
        // 页面从不可见变为可见时立即刷新一次（但要遵循频率限制）
        fetchNotificationData(false)
      }
      
      // 重新设置轮询间隔
      if (interval) clearInterval(interval)
      startPolling()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 根据页面可见性设置轮询
    const startPolling = () => {
      // 页面不可见时，轮询间隔延长到5倍
      const effectiveInterval = isPageVisible ? pollInterval : pollInterval * 5
      
      interval = setInterval(() => {
        fetchNotificationData(false)
        
        // 每5次通知轮询才更新一次统计，降低频率
        if (Math.random() < 0.2) {
          setTimeout(() => refreshStats(), 1000)
        }
      }, effectiveInterval)
    }

    startPolling()

    return () => {
      if (interval) clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [autoFetch, user, pollInterval, fetchNotificationData, refreshStats])

  return {
    notifications,
    stats,
    loading,
    error,
    unreadCount,
    fetchNotifications: (force = true) => fetchNotificationData(true, force),
    markAsRead,
    markAllAsRead,
    deleteNotifications,
    refreshStats
  }
}