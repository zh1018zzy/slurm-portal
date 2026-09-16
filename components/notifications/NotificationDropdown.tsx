'use client'

import React from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { zhCN, enUS } from 'date-fns/locale'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bell,
  Check,
  CheckCircle,
  AlertTriangle,
  Info,
  X,
  ExternalLink,
  Eye
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBadge } from './NotificationBadge'
import { useGlobalNotifications } from '@/contexts/NotificationProvider'
import type { Notification } from '@/hooks/use-notifications'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'

const priorityConfig = {
  urgent: { color: 'text-red-600', bgColor: 'bg-red-50', icon: AlertTriangle },
  high: { color: 'text-orange-600', bgColor: 'bg-orange-50', icon: AlertTriangle },
  medium: { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: Info },
  low: { color: 'text-gray-600', bgColor: 'bg-gray-50', icon: Info }
}

interface NotificationDropdownProps {
  className?: string
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead
  } = useGlobalNotifications()

  const t = useT('dashboard')
  const tNotif = useT('notifications')
  const locale = useLocale()

  const recentNotifications = notifications.slice(0, 5)

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.preventDefault()
    e.stopPropagation()
    await markAsRead([notificationId])
  }

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await markAllAsRead()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'relative h-10 w-10 hover:bg-green-500/10 hover:border-green-400/60 hover:text-green-600 dark:hover:text-green-400 transition-all duration-300',
            unreadCount > 0 && 'border-green-400/30',
            className
          )}
        >
          <Bell className={cn(
            'h-5 w-5 transition-colors duration-300',
            unreadCount > 0 && 'text-green-600 dark:text-green-400'
          )} />
          <NotificationBadge count={unreadCount} className="absolute -top-1 -right-1" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>{t('notifications')}</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount}{tNotif('unread')}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {tNotif('markAllRead')}
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {loading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {tNotif('loading')}
          </div>
        ) : recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {tNotif('noNotifications')}
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="py-1">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  locale={locale}
                />
              ))}
            </div>
          </ScrollArea>
        )}

        {recentNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-xs text-muted-foreground text-center">
              💡 {tNotif('clickToMarkRead')}
            </div>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href="/dashboard/notifications"
            className="flex items-center justify-between w-full cursor-pointer"
          >
            <span>{tNotif('title')}</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (e: React.MouseEvent, id: string) => void
  locale: string
}

function NotificationItem({ notification, onMarkAsRead, locale }: NotificationItemProps) {
  const config = priorityConfig[notification.priority]
  const Icon = config.icon
  const isUnread = notification.status === 'unread'
  const tNotif = useT('notifications')

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), {
    addSuffix: true,
    locale: locale === 'zh' ? zhCN : enUS
  })

  const handleItemClick = (e: React.MouseEvent) => {
    // 阻止事件冒泡，防止下拉菜单关闭
    e.preventDefault()
    e.stopPropagation()
    
    // 如果是未读通知，点击时自动标记为已读
    if (isUnread) {
      onMarkAsRead(e, notification.id)
    }
  }

  return (
    <div
      className={cn(
        'p-3 cursor-pointer transition-colors hover:bg-accent border-b border-border/40 last:border-b-0',
        isUnread && 'bg-blue-50/50 border-l-2 border-l-blue-500'
      )}
      onClick={handleItemClick}
      title={isUnread ? tNotif('clickToMarkRead') : tNotif('title')}
    >
      <div className="flex items-start space-x-3 w-full">
        {/* Icon */}
        <div className={cn(
          'p-1.5 rounded-full flex-shrink-0',
          config.bgColor
        )}>
          <Icon className={cn('h-3 w-3', config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={cn(
              'text-sm font-medium truncate',
              isUnread ? 'text-foreground' : 'text-muted-foreground'
            )}>
              {notification.title}
            </p>
            {isUnread && (
              <div className="flex items-center ml-2 flex-shrink-0">
                <div className="w-2 h-2 bg-blue-500 rounded-full" title={tNotif('unread')} />
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {notification.message}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {timeAgo}
            </span>

            <div className="flex items-center gap-1">
              {notification.priority === 'urgent' && (
                <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
                  {tNotif('priorityUrgent')}
                </Badge>
              )}

              {notification.priority === 'high' && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700">
                  {tNotif('priorityHigh')}
                </Badge>
              )}

              {isUnread && (
                <span className="text-xs text-blue-600 font-medium">
                  {tNotif('clickToMarkRead')}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          {notification.actions && notification.actions.length > 0 && (
            <div className="mt-2 flex gap-2">
              {notification.actions.slice(0, 2).map((action, index) => (
                <Link key={index} href={action.url}>
                  <Button
                    variant={action.style === 'primary' ? 'default' : 'outline'}
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {action.label}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}