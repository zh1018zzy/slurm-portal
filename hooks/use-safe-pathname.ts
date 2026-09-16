import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

/**
 * 安全的pathname hook，避免SSR水合不匹配
 */
export function useSafePathname() {
  const [isClient, setIsClient] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    setIsClient(true)
  }, [])

  // 在服务端和客户端水合阶段返回一个默认值
  // 只有在客户端完全加载后才返回真实的pathname
  return isClient ? pathname : '/dashboard'
}