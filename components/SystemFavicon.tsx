'use client'

import { useState, useEffect } from 'react'
import DynamicFavicon from './DynamicFavicon'

interface SystemFaviconProps {
  className?: string;
}

interface SystemSettings {
  logoUrl: string;
}

export default function SystemFavicon({ className }: SystemFaviconProps) {
  const [logoUrl, setLogoUrl] = useState<string>('')

  useEffect(() => {
    const fetchSettings = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

      fetch('/api/system/settings', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
        .then(res => res.json())
        .then((data: SystemSettings) => {
          // 添加时间戳以强制浏览器重新加载 favicon
          const urlWithTimestamp = data.logoUrl ? `${data.logoUrl}?v=${Date.now()}` : ''
          setLogoUrl(urlWithTimestamp)
        })
        .catch(() => {
          // 如果获取失败，使用默认favicon
          setLogoUrl('')
        })
    }

    // 初始加载
    fetchSettings()

    // 监听系统设置更新事件
    const handleSettingsUpdate = () => {
      fetchSettings()
    }

    window.addEventListener('systemSettingsUpdated', handleSettingsUpdate)

    return () => {
      window.removeEventListener('systemSettingsUpdated', handleSettingsUpdate)
    }
  }, [])

  return <DynamicFavicon logoUrl={logoUrl} />
} 