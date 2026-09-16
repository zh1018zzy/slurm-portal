'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NotificationBadge } from '@/components/notifications/NotificationBadge'
import { useGlobalNotifications } from '@/contexts/NotificationProvider'

interface NavItemProps {
  href: string
  label: string
  icon: React.ComponentType<any>
  isActive: boolean
  collapsed: boolean
  showNotificationBadge?: boolean
}

export function NavItem({ 
  href, 
  label, 
  icon: Icon, 
  isActive, 
  collapsed, 
  showNotificationBadge = false 
}: NavItemProps) {
  // Always call the hook, but only use the result when needed
  const { unreadCount } = useGlobalNotifications()
  
  // Only show badge when both conditions are met
  const shouldShowBadge = showNotificationBadge && unreadCount > 0

  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start text-base py-3 relative group transition-all duration-300",
          collapsed ? "px-2" : "px-4",
          isActive 
            ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 dark:text-green-400 font-medium border-l-2 border-green-500 shadow-sm" 
            : "hover:bg-green-500/5 hover:text-green-600 dark:hover:text-green-400"
        )}
      >
        <div className="relative">
          <Icon className={cn(
            "h-5 w-5 transition-all duration-300",
            isActive 
              ? "text-green-600 dark:text-green-400" 
              : "group-hover:text-green-500 group-hover:scale-110"
          )} />
          {shouldShowBadge && (
            <NotificationBadge 
              count={unreadCount} 
              className="absolute -top-2 -right-2"
            />
          )}
        </div>
        {!collapsed && (
          <span className={cn(
            "ml-3 text-base transition-all duration-300",
            isActive && "font-medium"
          )}>
            {label}
          </span>
        )}
        {/* 活跃状态右侧装饰 */}
        {isActive && !collapsed && (
          <div className="ml-auto w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-500 rounded-full" />
        )}
      </Button>
    </Link>
  )
}