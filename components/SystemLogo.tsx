'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Terminal, Cpu } from 'lucide-react'

interface SystemSettings {
  platformName: string
  logoUrl: string
}

interface SystemLogoProps {
  collapsed?: boolean
}

export function SystemLogo({ collapsed = false }: SystemLogoProps) {
  const [settings, setSettings] = useState<SystemSettings>({
    platformName: 'Slurm 门户',
    logoUrl: '/logo.png'
  })
  const [loading, setLoading] = useState(true)
  const [imageKey, setImageKey] = useState<string>(Date.now().toString())

  useEffect(() => {
    const fetchSettings = () => {
      setLoading(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

      fetch('/api/system/settings', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
        .then(res => res.json())
        .then((data: SystemSettings) => {
          setSettings(data)
          // 更新时间戳以强制浏览器重新加载图片
          setImageKey(Date.now().toString())
          setLoading(false)
        })
        .catch(() => {
          setLoading(false)
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

  if (loading) {
    return (
      <Link href="/dashboard" className="flex items-center space-x-3 group">
        <div className="relative">
          {/* 外圈脉冲效果 */}
          <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-lg blur-sm group-hover:blur-md transition-all duration-300" />
          {/* Logo 容器 */}
          <div className="relative w-10 h-10 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
            <Cpu className="h-6 w-6 text-white" />
          </div>
        </div>
        {!collapsed && (
          <span className="font-bold text-xl bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
            Slurm 门户
          </span>
        )}
      </Link>
    )
  }

  return (
    <Link href="/dashboard" className="flex items-center space-x-3 group">
      {settings.logoUrl && settings.logoUrl !== '/logo.png' ? (
        <div className="relative">
          {/* 外圈脉冲效果 */}
          <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-lg blur-sm group-hover:blur-md transition-all duration-300" />
          {/* Logo 图片容器 */}
          <div className="relative w-10 h-10 rounded-lg overflow-hidden ring-2 ring-green-400/30 group-hover:ring-green-400/60 transition-all duration-300">
            <Image
              src={settings.logoUrl}
              alt="Logo"
              width={40}
              height={40}
              className="w-full h-full object-cover rounded-full"
              key={imageKey}
            />
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* 外圈脉冲效果 */}
          <div className="absolute inset-0 w-10 h-10 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-lg blur-sm group-hover:blur-md transition-all duration-300" />
          {/* Logo 容器 */}
          <div className="relative w-10 h-10 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/20 group-hover:shadow-green-500/40 transition-all duration-300">
            <Cpu className="h-6 w-6 text-white" />
          </div>
        </div>
      )}
      {!collapsed && (
        <span className="font-bold text-xl bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent group-hover:from-green-300 group-hover:via-emerald-300 group-hover:to-teal-300 transition-all duration-300">
          {settings.platformName}
        </span>
      )}
    </Link>
  )
} 