'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

interface RouteProtectionProps {
  children: React.ReactNode
}

export function RouteProtection({ children }: RouteProtectionProps) {
  const pathname = usePathname()
  const previousPathname = useRef<string>('')
  const isNavigating = useRef<boolean>(false)

  useEffect(() => {
    // 检测路由变化
    if (previousPathname.current && previousPathname.current !== pathname) {
      console.log('🔄 路由切换:', previousPathname.current, '->', pathname)
      isNavigating.current = true
      
      // 只暂停可能导致冲突的DOM操作，允许正常的UI交互
      const pauseCriticalDOMOperations = () => {
        // 只标记动态favicon元素为暂停状态
        const dynamicElements = document.querySelectorAll('[data-dynamic-favicon="true"]')
        dynamicElements.forEach(el => {
          el.setAttribute('data-paused', 'true')
        })
        
        console.log('⏸️ 暂停关键DOM操作，等待路由切换完成')
      }
      
      pauseCriticalDOMOperations()
      
      // 缩短恢复时间，避免影响正常UI交互
      setTimeout(() => {
        isNavigating.current = false
        
        // 恢复DOM操作
        const resumeDOMOperations = () => {
          const pausedElements = document.querySelectorAll('[data-paused="true"]')
          pausedElements.forEach(el => {
            el.removeAttribute('data-paused')
          })
          
          console.log('▶️ 恢复DOM操作')
        }
        
        resumeDOMOperations()
      }, 200) // 减少到200ms，避免影响正常交互
    }
    
    previousPathname.current = pathname
  }, [pathname])

  // 提供全局状态，让其他组件知道是否正在导航
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ;(window as any).__isNavigating = isNavigating.current
    }
  }, [isNavigating.current])

  return <>{children}</>
} 