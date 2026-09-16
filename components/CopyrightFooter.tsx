'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface CopyrightFooterProps {
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

export default function CopyrightFooter({ className }: CopyrightFooterProps) {
  const [settings, setSettings] = useState<SystemSettings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取token（如果存在）
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    fetch('/api/system/settings', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
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
    return (
      <footer className={cn("border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="animate-pulse bg-muted h-4 w-48 rounded"></div>
            <div className="animate-pulse bg-muted h-4 w-32 rounded"></div>
          </div>
        </div>
      </footer>
    )
  }

  // 如果禁用了页脚显示，则不渲染
  if (settings.branding?.showFooter === false) {
    return null
  }

  // 如果启用了仪表板品牌显示，则不显示版权页脚（避免重复）
  if (settings.branding?.showDashboardBranding === true) {
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
    <footer className={cn("border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container mx-auto px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          {/* 左侧：版权信息 */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {copyrightInfo.url && copyrightInfo.name ? (
              <>
                <span>{copyrightInfo.text.replace(copyrightInfo.name, '')}</span>
                <Link 
                  href={copyrightInfo.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  {copyrightInfo.name}
                </Link>
              </>
            ) : (
              <span>{copyrightInfo.text}</span>
            )}
          </div>

          {/* 右侧：Powered by 信息 */}
          <div className="flex items-center gap-4">
            {settings.branding?.footerText && (
              <span className="text-xs">{settings.branding.footerText}</span>
            )}
            {settings.copyright?.showPoweredBy && (
              <span className="text-xs">
                {settings.copyright.poweredBy || 'Powered by HPC Platform'}
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  )
} 