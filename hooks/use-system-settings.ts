import { useState, useEffect } from 'react'

interface SystemSettings {
  platformName: string
  logoUrl: string
  watermarkText?: string
  watermarkEnabled?: boolean
  webshellCopyPasteEnabled?: boolean
  websiteTitle?: string
  websiteDescription?: string
  applicationsCenterEnabled?: boolean
  userHomeDirectoryPrefix?: string
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSettings() {
      try {
        setLoading(true)
        // 获取token（如果存在）
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

        const response = await fetch('/api/system/settings', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        })
        if (response.ok) {
          const data = await response.json()
          setSettings(data)
        } else {
          setError('Failed to load system settings')
        }
      } catch (err) {
        setError('Failed to load system settings')
      } finally {
        setLoading(false)
      }
    }

    // 初始加载
    fetchSettings()

    // 监听系统设置更新事件 (仅在客户端)
    const handleSettingsUpdate = () => {
      fetchSettings()
    }

    // 只在客户端环境添加事件监听器
    if (typeof window !== 'undefined') {
      window.addEventListener('systemSettingsUpdated', handleSettingsUpdate)

      return () => {
        window.removeEventListener('systemSettingsUpdated', handleSettingsUpdate)
      }
    }
  }, [])

  return { settings, loading, error }
} 