import * as React from 'react'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  fullScreen?: boolean
  text?: string
  variant?: 'spinner' | 'dots' | 'pulse'
}

/**
 * LoadingSpinner - 绿色加载器组件
 * 
 * 特点：
 * - 绿色主题
 * - 多种尺寸
 * - 多种样式（旋转、点、脉冲）
 * - 可选的全屏模式
 * - 可选的加载文字
 * 
 * @example
 * <LoadingSpinner size="md" />
 * <LoadingSpinner size="lg" text="加载中..." />
 * <LoadingSpinner fullScreen text="正在处理..." />
 */
export function LoadingSpinner({ 
  size = 'md',
  className,
  fullScreen = false,
  text,
  variant = 'spinner'
}: LoadingSpinnerProps) {
  // 尺寸映射
  const sizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  // 文字尺寸映射
  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  }

  const spinner = (() => {
    switch (variant) {
      case 'spinner':
        return (
          <div className={cn(
            'animate-spin rounded-full border-2 border-green-600 border-t-transparent dark:border-green-400',
            sizes[size],
            className
          )} />
        )
      
      case 'dots':
        return (
          <div className="flex items-center space-x-1">
            <div className={cn('rounded-full bg-green-600 dark:bg-green-400 animate-bounce', sizes[size])} style={{ animationDelay: '0ms' }} />
            <div className={cn('rounded-full bg-green-600 dark:bg-green-400 animate-bounce', sizes[size])} style={{ animationDelay: '150ms' }} />
            <div className={cn('rounded-full bg-green-600 dark:bg-green-400 animate-bounce', sizes[size])} style={{ animationDelay: '300ms' }} />
          </div>
        )
      
      case 'pulse':
        return (
          <div className="relative">
            <div className={cn(
              'rounded-full bg-green-600 dark:bg-green-400 animate-pulse',
              sizes[size]
            )} />
            <div className={cn(
              'absolute inset-0 rounded-full bg-green-600 dark:bg-green-400 animate-ping opacity-75',
              sizes[size]
            )} />
          </div>
        )
      
      default:
        return null
    }
  })()

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      {spinner}
      {text && (
        <p className={cn(
          'text-green-600 dark:text-green-400 font-medium',
          textSizes[size]
        )}>
          {text}
        </p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        {content}
      </div>
    )
  }

  return content
}

/**
 * LoadingIcon - 简单的加载图标（使用 lucide-react）
 */
export function LoadingIcon({ 
  size = 'md',
  className
}: Pick<LoadingSpinnerProps, 'size' | 'className'>) {
  const iconSizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
    xl: 'h-8 w-8'
  }

  return (
    <Loader2 className={cn(
      'animate-spin text-green-600 dark:text-green-400',
      iconSizes[size],
      className
    )} />
  )
}

/**
 * PageLoading - 页面级加载组件
 */
export function PageLoading({ text = '加载中...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <LoadingSpinner size="lg" text={text} variant="spinner" />
    </div>
  )
}

/**
 * InlineLoading - 行内加载组件
 */
export function InlineLoading({ text }: { text?: string }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
      <LoadingIcon size="sm" />
      {text && <span>{text}</span>}
    </div>
  )
}

