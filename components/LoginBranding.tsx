'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LoginBrandingProps {
  className?: string;
}

interface SystemSettings {
  copyright?: {
    companyName?: string;
    companyUrl?: string;
    copyrightText?: string;
    poweredBy?: string;
    showPoweredBy?: boolean;
  };
  channel?: {
    enabled?: boolean;
    channelName?: string;
    channelLogo?: string;
    channelUrl?: string;
    channelCopyright?: string;
  };
  client?: {
    enabled?: boolean;
    clientName?: string;
    clientLogo?: string;
    clientUrl?: string;
    clientCopyright?: string;
  };
  branding?: {
    showFooter?: boolean;
    footerText?: string;
    showLoginBranding?: boolean;
    showDashboardBranding?: boolean;
  };
}

export default function LoginBranding({ className }: LoginBrandingProps) {
  const [settings, setSettings] = useState<SystemSettings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    fetch('/api/system/settings', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then((data) => {
        setSettings(data)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return null
  }

  // 如果禁用了登录页面品牌显示，则不渲染
  if (settings.branding?.showLoginBranding === false) {
    return null
  }

  // 确定版权信息显示优先级：客户 > 渠道 > 公司
  const getCopyrightInfo = () => {
    if (settings.client?.enabled && settings.client.clientCopyright) {
      return {
        text: settings.client.clientCopyright,
        name: settings.client.clientName,
        url: settings.client.clientUrl
      }
    }
    if (settings.channel?.enabled && settings.channel.channelCopyright) {
      return {
        text: settings.channel.channelCopyright,
        name: settings.channel.channelName,
        url: settings.channel.channelUrl
      }
    }
    return {
      text: settings.copyright?.copyrightText || '© 2024 HPC Platform. 保留所有权利.',
      name: settings.copyright?.companyName || 'HPC Platform',
      url: settings.copyright?.companyUrl
    }
  }

  const copyrightInfo = getCopyrightInfo()

  return (
    <div className={cn("text-center space-y-2", className)}>
      {/* 版权信息 */}
      <div className="text-xs text-gray-300/90">
        {copyrightInfo.url && copyrightInfo.name ? (
          <>
            <span>{copyrightInfo.text.replace(copyrightInfo.name, '')}</span>
            <Link 
              href={copyrightInfo.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors underline"
            >
              {copyrightInfo.name}
            </Link>
          </>
        ) : (
          <span>{copyrightInfo.text}</span>
        )}
      </div>

      {/* Powered by 信息 */}
      {settings.copyright?.showPoweredBy && (
        <div className="text-xs text-gray-400/80">
          {settings.copyright.poweredBy || 'Powered by HPC Platform'}
        </div>
      )}

      {/* 页脚附加文本 */}
      {settings.branding?.footerText && (
        <div className="text-xs text-gray-400/80">
          {settings.branding.footerText}
        </div>
      )}
    </div>
  )
} 