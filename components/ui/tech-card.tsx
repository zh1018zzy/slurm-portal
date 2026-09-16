import * as React from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TechCardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glowEffect?: boolean
  cornerDecoration?: boolean
}

/**
 * TechCard - 科技感卡片组件
 * 
 * 特点：
 * - 绿色边框和装饰
 * - 顶部装饰条
 * - 可选的角落装饰
 * - Hover 光晕效果
 * - 统一的绿色科技风格
 * 
 * @example
 * <TechCard>
 *   <CardHeader>
 *     <CardTitle>标题</CardTitle>
 *   </CardHeader>
 *   <CardContent>内容</CardContent>
 * </TechCard>
 */
export function TechCard({ 
  children, 
  className, 
  hover = true,
  glowEffect = false,
  cornerDecoration = true
}: TechCardProps) {
  return (
    <div className="relative group">
      {/* 外层光晕效果（可选） */}
      {glowEffect && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-lg opacity-0 group-hover:opacity-10 blur transition duration-500" />
      )}
      
      <Card className={cn(
        "relative border-green-500/10 transition-all duration-300",
        hover && "hover:border-green-400/20 hover:shadow-md hover:shadow-green-500/3",
        className
      )}>
        {/* 顶部装饰条 */}
        <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent" />
        
        {/* 角落装饰 */}
        {cornerDecoration && (
          <>
            <div className="absolute top-3 left-3 w-2 h-2 border-l border-t border-green-400/30" />
            <div className="absolute top-3 right-3 w-2 h-2 border-r border-t border-green-400/30" />
            <div className="absolute bottom-3 left-3 w-2 h-2 border-l border-b border-green-400/30" />
            <div className="absolute bottom-3 right-3 w-2 h-2 border-r border-b border-green-400/30" />
          </>
        )}
        
        {children}
      </Card>
    </div>
  )
}

// 导出子组件，方便使用
TechCard.Header = CardHeader
TechCard.Title = CardTitle
TechCard.Description = CardDescription
TechCard.Content = CardContent
TechCard.Footer = CardFooter

