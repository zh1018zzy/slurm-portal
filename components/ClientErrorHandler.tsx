'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface ClientErrorHandlerProps {
  children: React.ReactNode
}

export function ClientErrorHandler({ children }: ClientErrorHandlerProps) {
  const router = useRouter()
  const errorCount = useRef(0)
  const lastErrorTime = useRef(0)

  useEffect(() => {
    // 处理客户端路由错误
    const handleRouteError = (event: ErrorEvent) => {
      const now = Date.now()
      
      // 检查是否是路由相关的错误
      if (event.error?.message?.includes('removeChild') || 
          event.error?.message?.includes('Cannot read properties of null') ||
          event.error?.message?.includes('client-side exception') ||
          event.error?.stack?.includes('removeChild')) {
        
        console.warn('🚨 检测到客户端路由错误:', {
          message: event.error.message,
          stack: event.error.stack,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: new Date().toISOString()
        })
        
        // 防止错误重复触发
        if (now - lastErrorTime.current < 1000) {
          console.warn('⚠️ 错误重复触发，忽略')
          event.preventDefault()
          return false
        }
        
        lastErrorTime.current = now
        errorCount.current++
        
        // 如果错误次数过多，强制刷新页面
        if (errorCount.current > 5) {
          console.error('❌ 错误次数过多，强制刷新页面')
          window.location.reload()
          return false
        }
        
        // 尝试恢复路由状态
        setTimeout(() => {
          try {
            const currentPath = window.location.pathname
            console.log('🔄 尝试恢复路由到:', currentPath)
            
            if (currentPath) {
              // 使用replace而不是push，避免历史记录堆积
              router.replace(currentPath)
            }
          } catch (error) {
            console.error('❌ 路由恢复失败:', error)
            // 如果恢复失败，刷新页面
            window.location.reload()
          }
        }, 100)
        
        // 阻止错误继续传播
        event.preventDefault()
        return false
      }
    }

    // 处理未捕获的Promise拒绝
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const now = Date.now()
      
      if (event.reason?.message?.includes('removeChild') ||
          event.reason?.message?.includes('Cannot read properties of null') ||
          event.reason?.message?.includes('client-side exception')) {
        
        console.warn('🚨 检测到未处理的Promise拒绝:', {
          reason: event.reason,
          timestamp: new Date().toISOString()
        })
        
        // 防止错误重复触发
        if (now - lastErrorTime.current < 1000) {
          console.warn('⚠️ Promise拒绝重复触发，忽略')
          event.preventDefault()
          return false
        }
        
        lastErrorTime.current = now
        errorCount.current++
        
        // 如果错误次数过多，强制刷新页面
        if (errorCount.current > 5) {
          console.error('❌ Promise拒绝次数过多，强制刷新页面')
          window.location.reload()
          return false
        }
        
        // 尝试恢复
        setTimeout(() => {
          try {
            const currentPath = window.location.pathname
            console.log('🔄 尝试恢复Promise拒绝后的路由到:', currentPath)
            
            if (currentPath) {
              router.replace(currentPath)
            }
          } catch (error) {
            console.error('❌ Promise拒绝恢复失败:', error)
            window.location.reload()
          }
        }, 100)
        
        event.preventDefault()
        return false
      }
    }

    // 处理DOM操作错误
    const handleDOMError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('removeChild') ||
          event.error?.message?.includes('appendChild') ||
          event.error?.message?.includes('insertBefore')) {
        
        console.warn('🚨 检测到DOM操作错误:', {
          message: event.error.message,
          stack: event.error.stack,
          timestamp: new Date().toISOString()
        })
        
        // 延迟处理，避免立即冲突
        setTimeout(() => {
          try {
            // 清理可能残留的DOM元素
            const orphanedElements = document.querySelectorAll('[data-orphaned="true"]')
            orphanedElements.forEach(el => {
              if (el.parentNode) {
                el.parentNode.removeChild(el)
              }
            })
            
            console.log('🧹 清理了', orphanedElements.length, '个残留DOM元素')
          } catch (error) {
            console.error('❌ DOM清理失败:', error)
          }
        }, 50)
      }
    }

    // 添加事件监听器
    window.addEventListener('error', handleRouteError)
    window.addEventListener('error', handleDOMError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    // 定期重置错误计数
    const resetInterval = setInterval(() => {
      if (errorCount.current > 0) {
        console.log('🔄 重置错误计数:', errorCount.current, '-> 0')
        errorCount.current = 0
      }
    }, 60000) // 每分钟重置一次

    // 清理函数
    return () => {
      window.removeEventListener('error', handleRouteError)
      window.removeEventListener('error', handleDOMError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      clearInterval(resetInterval)
    }
  }, [router])

  return <>{children}</>
} 