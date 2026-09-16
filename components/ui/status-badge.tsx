import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type StatusType = 'running' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'success' | 'warning' | 'error' | 'info'

interface StatusBadgeProps {
  status: StatusType
  children: React.ReactNode
  className?: string
  pulse?: boolean
  size?: 'sm' | 'md' | 'lg'
}

/**
 * StatusBadge - 统一状态标签组件
 * 
 * 特点：
 * - 统一的绿色科技风格
 * - RUNNING 状态使用新绿色
 * - 渐变背景
 * - 可选的脉冲效果
 * - 支持暗色模式
 * 
 * @example
 * <StatusBadge status="running" pulse>运行中</StatusBadge>
 * <StatusBadge status="pending">等待中</StatusBadge>
 * <StatusBadge status="completed">已完成</StatusBadge>
 */
export function StatusBadge({ 
  status, 
  children, 
  className,
  pulse = false,
  size = 'md'
}: StatusBadgeProps) {
  // 状态样式映射 - 柔和配色，使用柔和的背景色配白色文字
  const variants: Record<StatusType, string> = {
    running: cn(
      'bg-emerald-500/90 dark:bg-emerald-600/80',
      'text-white',
      'border-0',
      'hover:bg-emerald-500 dark:hover:bg-emerald-600',
      'shadow-sm'
    ),
    pending: cn(
      'bg-amber-500/90 dark:bg-amber-600/80',
      'text-white',
      'border-0',
      'hover:bg-amber-500 dark:hover:bg-amber-600',
      'shadow-sm'
    ),
    completed: cn(
      'bg-sky-500/90 dark:bg-sky-600/80',
      'text-white',
      'border-0',
      'hover:bg-sky-500 dark:hover:bg-sky-600',
      'shadow-sm'
    ),
    success: cn(
      'bg-emerald-500/90 dark:bg-emerald-600/80',
      'text-white',
      'border-0',
      'hover:bg-emerald-500 dark:hover:bg-emerald-600',
      'shadow-sm'
    ),
    failed: cn(
      'bg-rose-500/90 dark:bg-rose-600/80',
      'text-white',
      'border-0',
      'hover:bg-rose-500 dark:hover:bg-rose-600',
      'shadow-sm'
    ),
    error: cn(
      'bg-rose-500/90 dark:bg-rose-600/80',
      'text-white',
      'border-0',
      'hover:bg-rose-500 dark:hover:bg-rose-600',
      'shadow-sm'
    ),
    cancelled: cn(
      'bg-slate-500/90 dark:bg-slate-600/80',
      'text-white',
      'border-0',
      'hover:bg-slate-500 dark:hover:bg-slate-600',
      'shadow-sm'
    ),
    warning: cn(
      'bg-orange-500/90 dark:bg-orange-600/80',
      'text-white',
      'border-0',
      'hover:bg-orange-500 dark:hover:bg-orange-600',
      'shadow-sm'
    ),
    info: cn(
      'bg-sky-500/90 dark:bg-sky-600/80',
      'text-white',
      'border-0',
      'hover:bg-sky-500 dark:hover:bg-sky-600',
      'shadow-sm'
    ),
  }

  // 尺寸映射
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  return (
    <div className="relative inline-flex items-center">
      {/* 脉冲效果背景 */}
      {pulse && (status === 'running' || status === 'pending') && (
        <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping">
          <span className={cn(
            "absolute inline-flex h-full w-full rounded-full",
            status === 'running' ? 'bg-green-400' : 'bg-yellow-400'
          )} />
        </span>
      )}
      
      <Badge 
        className={cn(
          'relative transition-all duration-300 font-medium',
          variants[status],
          sizes[size],
          className
        )}
      >
        {children}
      </Badge>
    </div>
  )
}

