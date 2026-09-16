import { useState, useEffect } from 'react'
import { jwtDecode } from 'jwt-decode'
import { useRouter } from 'next/navigation'

interface UserInfo {
  username: string
  role?: string
  isAdmin?: boolean
  [key: string]: any
}

/**
 * useAuth hook：管理登录态、用户信息、登出等
 */
export function useAuth() {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserInfo | null>(null)
  const [authLoaded, setAuthLoaded] = useState(false)
  const router = useRouter()

  // 解析token获取用户信息
  function decodeToken(token: string): UserInfo | null {
    try {
      if (!token) {
        console.warn('Token为空，无法解析')
        return null
      }
      
      const decoded = jwtDecode<UserInfo>(token)
      console.log('🔍 Token解析结果:', decoded)
      
      // 验证必要的字段
      if (!decoded || !decoded.username) {
        console.warn('Token解析结果缺少必要字段:', decoded)
        return null
      }
      
      return decoded
    } catch (error) {
      console.error('❌ Token解析失败:', error)
      return null
    }
  }

  // 加载token和用户信息
  useEffect(() => {
    // 确保在客户端环境下执行
    if (typeof window === 'undefined') {
      setAuthLoaded(true)
      return
    }

    try {
      const t = localStorage.getItem('token')
      console.log('🔍 从localStorage获取token:', t ? `存在(长度: ${t.length})` : '不存在')
      
      setToken(t)
      if (t) {
        const userInfo = decodeToken(t)
        console.log('🔍 解析后的用户信息:', userInfo)
        setUser(userInfo)
        
        // 如果token解析失败，清除无效token
        if (!userInfo) {
          console.warn('Token解析失败，清除无效token')
          localStorage.removeItem('token')
          setToken(null)
        }
      } else {
        console.log('🔍 未找到token，设置用户为null')
        setUser(null)
      }
    } catch (error) {
      console.error('❌ 初始化认证状态时出错:', error)
      // 清除可能损坏的token
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
    } finally {
      setAuthLoaded(true)
    }
  }, [])

  // 登录（存储token）
  function login(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token)
    }
    setToken(token)
    setUser(decodeToken(token))
  }

  // 登出（清除token并跳转到登录页）
  function logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token')
    }
    setToken(null)
    setUser(null)
    // 跳转到登录页
    router.push('/')
  }

  // 获取认证token
  function getAuthToken(): string {
    return token || ''
  }

  return { token, user, login, logout, getAuthToken, isAuthenticated: !!token, authLoaded }
} 