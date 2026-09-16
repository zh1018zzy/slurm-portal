'use client'

import { useEffect } from 'react'

export function GlobalErrorHandler() {
  useEffect(() => {
    // 捕获未处理的Promise拒绝
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason)
      event.preventDefault()
    }

    // 捕获全局错误
    const handleError = (event: ErrorEvent) => {
      console.error('Global Error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      })
    }

    // 捕获资源加载错误
    const handleResourceError = (event: Event) => {
      const target = event.target as HTMLElement
      console.error('Resource Error:', {
        tagName: target.tagName,
        src: (target as HTMLImageElement).src || (target as HTMLScriptElement).src,
        href: (target as HTMLLinkElement).href
      })
    }

    // 添加事件监听器
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)
    window.addEventListener('error', handleResourceError, true)

    // 清理函数
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
      window.removeEventListener('error', handleResourceError, true)
    }
  }, [])

  return null
} 