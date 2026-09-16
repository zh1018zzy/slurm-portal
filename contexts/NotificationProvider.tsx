'use client'

import React, { createContext, useContext, ReactNode } from 'react'
import { useNotifications, UseNotificationsReturn } from '@/hooks/use-notifications'

interface NotificationContextType extends UseNotificationsReturn {
  // 可以添加额外的全局通知方法
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export interface NotificationProviderProps {
  children: ReactNode
  options?: {
    autoFetch?: boolean
    pollInterval?: number
    showToast?: boolean
  }
}

export function NotificationProvider({ 
  children, 
  options = {} 
}: NotificationProviderProps) {
  const notificationHook = useNotifications({
    autoFetch: true,
    pollInterval: 120000, // 增加到2分钟轮询，进一步减少服务器压力
    showToast: true,
    ...options
  })

  return (
    <NotificationContext.Provider value={notificationHook}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext(): NotificationContextType {
  const context = useContext(NotificationContext)
  
  if (context === undefined) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  
  return context
}

// 便捷的hooks，可以选择性使用context或直接使用hook
export function useGlobalNotifications() {
  try {
    return useNotificationContext()
  } catch {
    // 如果没有Provider，fallback到直接使用hook，但使用相同的配置
    return useNotifications({
      autoFetch: true,
      pollInterval: 120000, // 使用与Provider相同的配置
      showToast: true
    })
  }
}