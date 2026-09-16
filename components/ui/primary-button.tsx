import * as React from 'react'
import { Button, ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface PrimaryButtonProps extends Omit<ButtonProps, 'variant'> {
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  glowEffect?: boolean
}

/**
 * PrimaryButton - 主操作按钮组件
 * 
 * 特点：
 * - 三色绿色渐变背景
 * - Hover 光晕阴影效果
 * - 扫过光效动画
 * - 内置加载状态
 * - 支持图标
 * 
 * @example
 * <PrimaryButton>提交作业</PrimaryButton>
 * <PrimaryButton loading>加载中...</PrimaryButton>
 * <PrimaryButton icon={<CheckIcon />}>确认</PrimaryButton>
 */
export function PrimaryButton({ 
  children, 
  className,
  disabled,
  loading = false,
  icon,
  iconPosition = 'left',
  glowEffect = true,
  ...props 
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading

  return (
    <Button
      disabled={isDisabled}
      className={cn(
        // 基础样式
        'relative overflow-hidden',
        
        // 渐变背景
        'bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600',
        'hover:from-green-400 hover:via-emerald-500 hover:to-teal-500',
        
        // 阴影和光晕
        glowEffect && 'hover:shadow-lg hover:shadow-green-500/20',
        
        // 过渡动画
        'transition-all duration-300',
        
        // 缩放效果
        'hover:scale-[1.02]',
        
        // 禁用状态
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none',
        
        className
      )}
      {...props}
    >
      {/* 扫过光效 */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      
      {/* 按钮内容 */}
      <span className="relative flex items-center justify-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && iconPosition === 'left' && icon}
        {children}
        {!loading && icon && iconPosition === 'right' && icon}
      </span>
    </Button>
  )
}

/**
 * SecondaryButton - 次要操作按钮（绿色 outline）
 */
export function SecondaryButton({ 
  children, 
  className,
  ...props 
}: ButtonProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        'border-green-400/30',
        'text-green-600 dark:text-green-400',
        'hover:bg-green-500/10',
        'hover:border-green-400/60',
        'hover:text-green-700 dark:hover:text-green-300',
        'transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

/**
 * DangerButton - 危险操作按钮（红色）
 */
export function DangerButton({ 
  children, 
  className,
  ...props 
}: ButtonProps) {
  return (
    <Button
      className={cn(
        'bg-gradient-to-r from-red-500 via-rose-600 to-red-600',
        'hover:from-red-400 hover:via-rose-500 hover:to-red-500',
        'hover:shadow-lg hover:shadow-red-500/20',
        'transition-all duration-300',
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

