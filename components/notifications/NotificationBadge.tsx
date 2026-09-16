'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface NotificationBadgeProps {
  count: number
  className?: string
  variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  maxCount?: number
  showZero?: boolean
  pulse?: boolean
}

export function NotificationBadge({
  count,
  className,
  variant = 'destructive',
  maxCount = 99,
  showZero = false,
  pulse = true
}: NotificationBadgeProps) {
  if (count === 0 && !showZero) {
    return null
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()
  
  return (
    <Badge
      variant={variant}
      className={cn(
        'absolute -top-2 -right-2 h-5 min-w-[1.25rem] px-1 text-xs font-medium flex items-center justify-center rounded-full',
        pulse && count > 0 && 'animate-pulse',
        count > 0 && 'bg-red-500 text-white border-red-500',
        className
      )}
    >
      {displayCount}
    </Badge>
  )
}