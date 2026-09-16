'use client'

import { useState, useEffect } from 'react'
import { Cpu, Zap } from 'lucide-react'
import { useT } from '@/lib/i18n-utils'

interface LoginHeaderProps {
  className?: string;
}

interface SystemSettings {
  platformName: string;
  logoUrl: string;
}

export default function LoginHeader({ className }: LoginHeaderProps) {
  const t = useT('login');
  const [settings, setSettings] = useState<SystemSettings>({
    platformName: t('title'),
    logoUrl: '/logo.png'
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    fetch('/api/system/settings', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then((data: SystemSettings) => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className={`text-center mb-10 animate-fade-in-up ${className}`}>
        <div className="flex justify-center items-center mb-6">
          <div className="relative group">
            {/* 外圈旋转光环 */}
            <div className="absolute inset-0 animate-spin-slow">
              <div className="w-20 h-20 border-2 border-transparent border-t-green-400 border-r-emerald-400 rounded-full" />
            </div>
            
            {/* Logo容器 */}
            <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/30 animate-float">
              {/* 内部光效 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-2xl" />
              <Cpu className="w-10 h-10 text-white relative z-10" />
              
              {/* 状态指示器 */}
              <div className="absolute -top-1 -right-1 flex items-center justify-center">
                <div className="absolute w-5 h-5 bg-green-400/30 rounded-full animate-ping" />
                <div className="w-3 h-3 bg-gradient-to-br from-green-300 to-green-500 rounded-full border-2 border-white/50 flex items-center justify-center">
                  <Zap className="w-2 h-2 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 标题 */}
        <h1 className="text-3xl md:text-4xl font-bold mb-3 animate-slide-in relative">
          <span className="text-foreground">
            {t('title')}
          </span>
          {/* 文字下划线装饰 */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent rounded-full" />
        </h1>
        
        {/* 副标题 */}
        <p className="text-gray-400 text-sm md:text-base font-medium tracking-wide">
          {t('subtitle')}
        </p>
      </div>
    )
  }

  return (
    <div className={`text-center mb-10 animate-fade-in-up ${className}`}>
      <div className="flex justify-center items-center mb-6">
        <div className="relative group">
          {/* 外圈旋转光环 */}
          <div className="absolute inset-0 animate-spin-slow">
            <div className="w-20 h-20 border-2 border-transparent border-t-green-400 border-r-emerald-400 rounded-full" />
          </div>
          
          {/* Logo容器 */}
          <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 via-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-green-500/30 animate-float">
            {/* 内部光效 */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent rounded-2xl" />
            <Cpu className="w-10 h-10 text-white relative z-10" />
            
            {/* 状态指示器 */}
            <div className="absolute -top-1 -right-1 flex items-center justify-center">
              <div className="absolute w-5 h-5 bg-green-400/30 rounded-full animate-ping" />
              <div className="w-3 h-3 bg-gradient-to-br from-green-300 to-green-500 rounded-full border-2 border-white/50 flex items-center justify-center">
                <Zap className="w-2 h-2 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* 标题 */}
      <h1 className="text-3xl md:text-4xl font-bold mb-3 animate-slide-in relative">
        <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
          {settings.platformName}
        </span>
        {/* 文字下划线装饰 */}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-transparent via-green-400 to-transparent rounded-full" />
      </h1>
      
      {/* 副标题 */}
      <p className="text-gray-400 text-sm md:text-base font-medium tracking-wide">
        {t('subtitle')}
      </p>
    </div>
  )
} 