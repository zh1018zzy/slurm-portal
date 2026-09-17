'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import AdminProtected from '@/components/AdminProtected'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Settings, Upload, Image as ImageIcon, X, Loader2, Eye, Save, CheckCircle, Server } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useT } from '@/lib/i18n-utils'
import { useAuth } from '@/hooks/use-auth'
import { isSuperAdminUser, isAdminUser } from '@/lib/admin-utils'

interface SystemSettings {
  platformName: string
  logoUrl: string
  watermarkText?: string
  watermarkEnabled?: boolean
  webshellCopyPasteEnabled?: boolean
  websiteTitle?: string
  websiteDescription?: string
  applicationsCenterEnabled?: boolean
  bigScreenButtonEnabled?: boolean
  userHomeDirectoryPrefix?: string
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

export default function SystemSettingsPage() {
  const t = useT('system.settingsPage')
  const { user } = useAuth()
  const isSuperAdmin = isSuperAdminUser(user)
  const isAdmin = isAdminUser(user)

  const [platformName, setPlatformName] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 水印设置
  const [watermarkText, setWatermarkText] = useState('')
  const [watermarkEnabled, setWatermarkEnabled] = useState(true)

  // WebShell复制粘贴权限设置
  const [webshellCopyPasteEnabled, setWebshellCopyPasteEnabled] = useState(true)

  // 应用中心设置
  const [applicationsCenterEnabled, setApplicationsCenterEnabled] = useState(true)

  // 大屏按钮设置
  const [bigScreenButtonEnabled, setBigScreenButtonEnabled] = useState(true)

  // 网站设置
  const [websiteTitle, setWebsiteTitle] = useState('')
  const [websiteDescription, setWebsiteDescription] = useState('')

  // 用户家目录设置
  const [userHomeDirectoryPrefix, setUserHomeDirectoryPrefix] = useState('/home')

  // 版权信息设置
  const [companyName, setCompanyName] = useState('')
  const [companyUrl, setCompanyUrl] = useState('')
  const [copyrightText, setCopyrightText] = useState('')
  const [poweredBy, setPoweredBy] = useState('')
  const [showPoweredBy, setShowPoweredBy] = useState(false)

  // 渠道信息设置
  const [channelEnabled, setChannelEnabled] = useState(false)
  const [channelName, setChannelName] = useState('')
  const [channelUrl, setChannelUrl] = useState('')
  const [channelCopyright, setChannelCopyright] = useState('')

  // 客户信息设置
  const [clientEnabled, setClientEnabled] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientUrl, setClientUrl] = useState('')
  const [clientCopyright, setClientCopyright] = useState('')

  // 品牌设置
  const [showFooter, setShowFooter] = useState(true)
  const [footerText, setFooterText] = useState('')
  const [showLoginBranding, setShowLoginBranding] = useState(true)
  const [showDashboardBranding, setShowDashboardBranding] = useState(true)

  // 自动保存状态
  const [autoSaving, setAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 加载系统设置的函数
  const loadSettings = useCallback(async () => {
    // 获取token
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    try {
      const res = await fetch('/api/system/settings', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        cache: 'no-store' // 禁用缓存，确保获取最新数据
      })
      const data: SystemSettings = await res.json()
      
      setPlatformName(data.platformName)
      setLogoUrl(data.logoUrl)
      setLogoPreview(data.logoUrl)
      setWatermarkText(data.watermarkText || '')
      setWatermarkEnabled(data.watermarkEnabled !== false) // 默认启用
      setWebshellCopyPasteEnabled(data.webshellCopyPasteEnabled !== false) // 默认启用
      setApplicationsCenterEnabled(data.applicationsCenterEnabled !== false) // 默认启用
      setBigScreenButtonEnabled(data.bigScreenButtonEnabled !== false) // 默认启用
      setWebsiteTitle(data.websiteTitle || '')
      setWebsiteDescription(data.websiteDescription || '')
      setUserHomeDirectoryPrefix(data.userHomeDirectoryPrefix || '/home')

      // 版权信息（可配置，无厂商硬编码）
      setCompanyName(data.copyright?.companyName || '')
      setCompanyUrl(data.copyright?.companyUrl || '')
      setCopyrightText(data.copyright?.copyrightText || '')
      setPoweredBy(data.copyright?.poweredBy || '')
      setShowPoweredBy(data.copyright?.showPoweredBy === true)

      // 渠道信息设置
      setChannelEnabled(data.channel?.enabled || false)
      setChannelName(data.channel?.channelName || '')
      setChannelUrl(data.channel?.channelUrl || '')
      setChannelCopyright(data.channel?.channelCopyright || '')

      // 客户信息设置
      setClientEnabled(data.client?.enabled || false)
      setClientName(data.client?.clientName || '')
      setClientUrl(data.client?.clientUrl || '')
      setClientCopyright(data.client?.clientCopyright || '')

      // 品牌设置
      setShowFooter(data.branding?.showFooter !== false)
      setFooterText(data.branding?.footerText || '')
      setShowLoginBranding(data.branding?.showLoginBranding !== false)
      setShowDashboardBranding(data.branding?.showDashboardBranding !== false)
    } catch (error) {
      console.error('加载系统设置失败:', error)
    }
  }, [])

  // 初始加载设置
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // 监听系统设置更新事件，重新加载设置
  useEffect(() => {
    const handleSettingsUpdate = () => {
      loadSettings()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('systemSettingsUpdated', handleSettingsUpdate)
      return () => {
        window.removeEventListener('systemSettingsUpdated', handleSettingsUpdate)
      }
    }
  }, [loadSettings])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  // 更新页面head标签（title和meta描述）
  useEffect(() => {
    // 更新页面标题
    if (websiteTitle || platformName) {
      document.title = websiteTitle || platformName || '高性能计算管理平台'
    }

    // 更新meta描述
    if (websiteDescription) {
      let metaDescription = document.querySelector('meta[name="description"]')
      if (!metaDescription) {
        metaDescription = document.createElement('meta')
        metaDescription.setAttribute('name', 'description')
        document.head.appendChild(metaDescription)
      }
      metaDescription.setAttribute('content', websiteDescription)
    }

    // 更新Open Graph标题
    let ogTitle = document.querySelector('meta[property="og:title"]')
    if (!ogTitle) {
      ogTitle = document.createElement('meta')
      ogTitle.setAttribute('property', 'og:title')
      document.head.appendChild(ogTitle)
    }
    ogTitle.setAttribute('content', websiteTitle || platformName || '高性能计算管理平台')

    // 更新Open Graph描述
    if (websiteDescription) {
      let ogDescription = document.querySelector('meta[property="og:description"]')
      if (!ogDescription) {
        ogDescription = document.createElement('meta')
        ogDescription.setAttribute('property', 'og:description')
        document.head.appendChild(ogDescription)
      }
      ogDescription.setAttribute('content', websiteDescription)
    }

    // 更新Twitter卡片标题
    let twitterTitle = document.querySelector('meta[name="twitter:title"]')
    if (!twitterTitle) {
      twitterTitle = document.createElement('meta')
      twitterTitle.setAttribute('name', 'twitter:title')
      document.head.appendChild(twitterTitle)
    }
    twitterTitle.setAttribute('content', websiteTitle || platformName || '高性能计算管理平台')

    // 更新Twitter卡片描述
    if (websiteDescription) {
      let twitterDescription = document.querySelector('meta[name="twitter:description"]')
      if (!twitterDescription) {
        twitterDescription = document.createElement('meta')
        twitterDescription.setAttribute('name', 'twitter:description')
        document.head.appendChild(twitterDescription)
      }
      twitterDescription.setAttribute('content', websiteDescription)
    }
  }, [websiteTitle, platformName, websiteDescription])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      setError('')

      // 预览图片
      const reader = new FileReader()
      reader.onload = ev => setLogoPreview(ev.target?.result as string)
      reader.readAsDataURL(file)

      // 立即上传文件
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('purpose', 'logo') // 标记为系统 logo 上传

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        })

        const result = await res.json()

        if (result.success) {
          setLogoUrl(result.url)
          setLogoPreview(result.url)
          // 自动保存新的 logoUrl 到系统设置
          autoSave({ logoUrl: result.url })
          toast({
            title: t('logoUploadSuccess'),
            description: t('logoAutoSaved'),
          })
        } else {
          setError(result.error || t('uploadFailed'))
          setLogoFile(null)
          setLogoPreview(logoUrl)
        }
      } catch (err) {
        setError(t('uploadFailedRetry'))
        setLogoFile(null)
        setLogoPreview(logoUrl)
      } finally {
        setUploading(false)
      }
    }
  }

  function handleRemoveLogo() {
    setLogoFile(null)
    setLogoPreview('/uploads/system-logo.png')
    setLogoUrl('/uploads/system-logo.png')
    setError('')
    // 自动保存恢复默认 logo 的设置
    autoSave({ logoUrl: '/uploads/system-logo.png' })
    toast({
      title: t('logoRestored'),
      description: t('logoRestoredDefault'),
    })
  }

  // 使用 ref 来存储最新的状态值
  const stateRef = useRef({
    platformName,
    logoUrl,
    watermarkText,
    watermarkEnabled,
    webshellCopyPasteEnabled,
    applicationsCenterEnabled,
    bigScreenButtonEnabled,
    websiteTitle,
    websiteDescription,
    userHomeDirectoryPrefix,
    companyName,
    companyUrl,
    copyrightText,
    poweredBy,
    showPoweredBy,
    channelEnabled,
    channelName,
    channelUrl,
    channelCopyright,
    clientEnabled,
    clientName,
    clientUrl,
    clientCopyright,
    showFooter,
    footerText,
    showLoginBranding,
    showDashboardBranding
  })

  // 每次渲染时更新 ref
  useEffect(() => {
    stateRef.current = {
      platformName,
      logoUrl,
      watermarkText,
      watermarkEnabled,
      webshellCopyPasteEnabled,
      applicationsCenterEnabled,
      bigScreenButtonEnabled,
      websiteTitle,
      websiteDescription,
      userHomeDirectoryPrefix,
      companyName,
      companyUrl,
      copyrightText,
      poweredBy,
      showPoweredBy,
      channelEnabled,
      channelName,
      channelUrl,
      channelCopyright,
      clientEnabled,
      clientName,
      clientUrl,
      clientCopyright,
      showFooter,
      footerText,
      showLoginBranding,
      showDashboardBranding
    }
  })

  // 自动保存函数 - 使用 ref 来获取最新状态
  const autoSave = useCallback(async (partialSettings: Partial<SystemSettings>) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      // 检查权限，如果没有管理员权限，不执行自动保存
      if (!isAdmin) {
        return
      }

      setAutoSaving(true)
      try {
        // 获取token
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

        // 从 ref 获取最新的状态值，避免闭包问题
        const currentState = stateRef.current

        // 根据权限构建设置对象
        // 基本信息：管理员可以修改
        const baseSettings: Partial<SystemSettings> = {
          platformName: currentState.platformName,
          logoUrl: currentState.logoUrl,
          websiteTitle: currentState.websiteTitle,
          websiteDescription: currentState.websiteDescription,
        }

        // 敏感字段：仅超级管理员可以修改
        let sensitiveSettings: Partial<SystemSettings> = {}
        // 用户家目录前缀：管理员可以修改
        if (isAdmin) {
          baseSettings.userHomeDirectoryPrefix = currentState.userHomeDirectoryPrefix
        }
        if (isSuperAdmin) {
          sensitiveSettings = {
            watermarkText: currentState.watermarkText,
            watermarkEnabled: currentState.watermarkEnabled,
            webshellCopyPasteEnabled: currentState.webshellCopyPasteEnabled,
            applicationsCenterEnabled: currentState.applicationsCenterEnabled,
            bigScreenButtonEnabled: currentState.bigScreenButtonEnabled,
            copyright: {
              companyName: currentState.companyName,
              companyUrl: currentState.companyUrl,
              copyrightText: currentState.copyrightText,
              poweredBy: currentState.poweredBy,
              showPoweredBy: currentState.showPoweredBy
            },
            channel: {
              enabled: currentState.channelEnabled,
              channelName: currentState.channelName,
              channelUrl: currentState.channelUrl,
              channelCopyright: currentState.channelCopyright
            },
            client: {
              enabled: currentState.clientEnabled,
              clientName: currentState.clientName,
              clientUrl: currentState.clientUrl,
              clientCopyright: currentState.clientCopyright
            },
            branding: {
              showFooter: currentState.showFooter,
              footerText: currentState.footerText,
              showLoginBranding: currentState.showLoginBranding,
              showDashboardBranding: currentState.showDashboardBranding
            }
          }
        }

        // 合并设置，传入的部分设置覆盖当前状态
        const fullSettings = {
          ...baseSettings,
          ...sensitiveSettings,
          ...partialSettings
        }

        const res = await fetch('/api/system/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(fullSettings)
        })

        if (res.ok) {
          setLastSaved(new Date())
          toast({
            title: t('settingsAutoSaved'),
            description: t('configSavedSuccess'),
          })
          // 通知其他组件刷新设置
          window.dispatchEvent(new CustomEvent('systemSettingsUpdated'))
        } else {
          const result = await res.json()
          toast({
            title: t('autoSaveFailed'),
            description: result.error || t('autoSaveFailedHint'),
            variant: 'destructive'
          })
        }
      } catch (err) {
        toast({
          title: t('autoSaveFailed'),
          description: t('networkErrorSaveManually'),
          variant: 'destructive'
        })
      } finally {
        setAutoSaving(false)
      }
    }, 1000) // 1秒延迟自动保存
  }, [t, isAdmin, isSuperAdmin])

  // 手动保存基本信息函数
  async function handleSave() {
    setLoading(true)
    setError('')

    try {
      // 获取token
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

      // 根据权限构建请求体
      // 基本信息：管理员可以修改
      const baseSettings: Partial<SystemSettings> = {
        platformName,
        logoUrl,
        websiteTitle,
        websiteDescription,
        userHomeDirectoryPrefix
      }

      // 敏感字段：仅超级管理员可以修改
      let sensitiveSettings: Partial<SystemSettings> = {}
      if (isSuperAdmin) {
        sensitiveSettings = {
          watermarkText,
          watermarkEnabled,
          webshellCopyPasteEnabled,
          applicationsCenterEnabled,
          bigScreenButtonEnabled,
          copyright: {
            companyName,
            companyUrl,
            copyrightText,
            poweredBy,
            showPoweredBy
          },
          channel: {
            enabled: channelEnabled,
            channelName,
            channelUrl,
            channelCopyright
          },
          client: {
            enabled: clientEnabled,
            clientName,
            clientUrl,
            clientCopyright
          },
          branding: {
            showFooter,
            footerText,
            showLoginBranding,
            showDashboardBranding
          }
        }
      }

      const requestBody = {
        ...baseSettings,
        ...sensitiveSettings
      }

      const res = await fetch('/api/system/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(requestBody)
      })

      if (res.ok) {
        setSuccess(true)
        setLastSaved(new Date())
        toast({
          title: t('basicInfoSaveSuccess'),
          description: t('basicInfoSaved'),
        })
        // 通过自定义事件通知其他组件刷新设置，而不是刷新整个页面
        window.dispatchEvent(new CustomEvent('systemSettingsUpdated'))
      } else {
        const result = await res.json()
        setError(result.error || t('uploadFailed'))
      }
    } catch (err) {
      setError(t('uploadFailedRetry'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AdminProtected>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-foreground">{t('title')}</h1>
              <p className="text-muted-foreground">{t('subtitle')}</p>
            </div>
          <div className="flex items-center gap-4">
            {autoSaving && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('autoSaving')}
              </div>
            )}
            {lastSaved && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                {t('saved')} {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* 基本信息设置 */}
        <TechCard hover>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5 text-blue-600" />
              <span>{t('basicInfo')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block mb-2 font-medium text-sm">{t('platformName')}</label>
              <Input
                value={platformName}
                onChange={e => setPlatformName(e.target.value)}
                placeholder={t('platformNamePlaceholder')}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('platformNameHint')}
              </p>
            </div>

            <div>
              <label className="block mb-2 font-medium text-sm">{t('websiteTitle')}</label>
              <Input
                value={websiteTitle}
                onChange={e => setWebsiteTitle(e.target.value)}
                placeholder={t('websiteTitlePlaceholder')}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('websiteTitleHint')}
              </p>
            </div>

            <div>
              <label className="block mb-2 font-medium text-sm">{t('websiteDescription')}</label>
              <Input
                value={websiteDescription}
                onChange={e => setWebsiteDescription(e.target.value)}
                placeholder={t('websiteDescriptionPlaceholder')}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('websiteDescriptionHint')}
              </p>
            </div>

            <div>
              <label className="block mb-3 font-medium text-sm">{t('systemLogo')}</label>
              <div className="flex items-start space-x-4">
                <div className="relative">
                  <div className="w-24 h-24 border-2 border-gray-200 rounded-full overflow-hidden bg-muted relative">
                    <Image
                      src={logoPreview || '/logo.png'}
                      alt="Logo"
                      width={96}
                      height={96}
                      className="w-full h-full object-cover"
                    />
                    {uploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    {t('currentLogo')}
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    disabled={uploading}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full"
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('uploading')}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        {t('selectNewLogo')}
                      </>
                    )}
                  </Button>

                  {(logoFile || logoPreview !== '/logo.png') && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleRemoveLogo}
                      className="w-full"
                      disabled={uploading}
                    >
                      <X className="w-4 h-4 mr-2" />
                      {t('restoreDefaultLogo')}
                    </Button>
                  )}

                  <div className="text-xs text-muted-foreground">
                    <p>{t('logoHintSize')}</p>
                    <p>{t('logoHintFormat')}</p>
                    <p>{t('logoHintMaxSize')}</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="text-red-600 text-sm mt-3 p-2 bg-red-50 rounded border border-red-200">
                  {error}
                </div>
              )}
            </div>

            {/* 基本信息保存按钮 */}
            <div className="pt-6 border-t">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('basicInfoHint')}
                </div>
                <Button
                  onClick={handleSave}
                  disabled={loading || uploading || !isAdmin}
                  className="px-6"
                  title={!isAdmin ? '需要管理员权限才能保存' : ''}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('saveBasicInfo')}
                    </>
                  )}
                </Button>
              </div>

              {success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-green-800 text-sm font-medium">{t('basicInfoSaveSuccessShort')}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </TechCard>

        {/* 系统配置 */}
        <TechCard hover>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Server className="w-5 h-5 text-purple-600" />
              <span>{t('systemConfig')}</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {t('systemConfigHint')}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block mb-2 font-medium text-sm">{t('userHomeDirectoryPrefix')}</label>
              <Input
                value={userHomeDirectoryPrefix}
                onChange={e => {
                  const value = e.target.value
                  setUserHomeDirectoryPrefix(value)
                }}
                placeholder={t('userHomeDirectoryPlaceholder')}
                className="text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t('userHomeDirectoryHint')}
              </p>

              {/* 重要提示 */}
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div className="text-xs text-amber-800">
                    <p className="font-medium mb-1">{t('importantNotice')}</p>
                    <ul className="space-y-1">
                      <li>• {t('homeDirectoryNotice1')}</li>
                      <li>• {t('homeDirectoryNotice2')}</li>
                      <li>• {t('homeDirectoryNotice3')}</li>
                      <li>• {t('homeDirectoryNotice4')}</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 手动保存按钮 - 管理员可用 */}
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t('homeDirectoryHint')}
                </div>
                <Button
                  onClick={async () => {
                    try {
                      setLoading(true)
                      // 获取token
                      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

                      // 根据权限构建请求体
                      // 基本信息：管理员可以修改
                      const baseSettings: Partial<SystemSettings> = {
                        platformName,
                        logoUrl,
                        websiteTitle,
                        websiteDescription,
                        userHomeDirectoryPrefix
                      }

                      // 敏感字段：仅超级管理员可以修改
                      let sensitiveSettings: Partial<SystemSettings> = {}
                      if (isSuperAdmin) {
                        sensitiveSettings = {
                          watermarkText,
                          watermarkEnabled,
                          webshellCopyPasteEnabled,
                          applicationsCenterEnabled,
                          bigScreenButtonEnabled,
                          copyright: {
                            companyName,
                            companyUrl,
                            copyrightText,
                            poweredBy,
                            showPoweredBy
                          },
                          channel: {
                            enabled: channelEnabled,
                            channelName,
                            channelUrl,
                            channelCopyright
                          },
                          client: {
                            enabled: clientEnabled,
                            clientName,
                            clientUrl,
                            clientCopyright
                          },
                          branding: {
                            showFooter,
                            footerText,
                            showLoginBranding,
                            showDashboardBranding
                          }
                        }
                      }

                      const requestBody = {
                        ...baseSettings,
                        ...sensitiveSettings
                      }

                      const res = await fetch('/api/system/settings', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                        },
                        body: JSON.stringify(requestBody)
                      })

                      if (res.ok) {
                        toast({
                          title: t('homeDirectorySaveSuccess'),
                          description: t('homeDirectorySynced'),
                        })
                        // 通知其他组件刷新设置
                        window.dispatchEvent(new CustomEvent('systemSettingsUpdated'))
                      } else {
                        const result = await res.json()
                        toast({
                          title: t('uploadFailed'),
                          description: result.error || t('uploadFailedRetry'),
                          variant: 'destructive'
                        })
                      }
                    } catch (err) {
                      toast({
                        title: t('uploadFailed'),
                        description: t('networkErrorSaveManually'),
                        variant: 'destructive'
                      })
                    } finally {
                      setLoading(false)
                    }
                  }}
                  disabled={loading || !isAdmin}
                  className="px-4"
                  title={!isAdmin ? '需要管理员权限才能保存' : ''}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('saveHomeDirectory')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </TechCard>

        {/* 安全设置 - 仅超级管理员可见 */}
        {isSuperAdmin && (
          <TechCard hover>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="w-5 h-5 text-green-600" />
                <span>{t('securitySettings')}</span>
              </CardTitle>
              <p className="text-xs text-amber-600 mt-2">
                🔒 仅超级管理员可见和修改
              </p>
            </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="font-medium text-sm">{t('filePreviewWatermark')}</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('watermarkHint')}
                  </p>
                </div>
                <Switch
                  checked={watermarkEnabled}
                  onCheckedChange={(checked) => {
                    setWatermarkEnabled(checked)
                    autoSave({ watermarkEnabled: checked })
                  }}
                />
              </div>

              {watermarkEnabled && (
                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium">{t('watermarkText')}</label>
                    <Input
                      value={watermarkText}
                      onChange={e => {
                        const value = e.target.value
                        setWatermarkText(value)
                      }}
                      placeholder={t('watermarkTextPlaceholder')}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('watermarkTextHint')}
                    </p>
                  </div>

                  {/* 水印预览 */}
                  <div>
                    <label className="block mb-2 text-sm font-medium">{t('previewEffect')}</label>
                    <div className="p-4 bg-gray-50 rounded-lg relative overflow-hidden border h-32">
                      <div className="text-sm text-gray-800 mb-2">
                        {t('previewContent')}
                      </div>
                      <div className="text-sm text-gray-600">
                        {t('watermarkPreviewHint')}
                      </div>
                      <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: `repeating-linear-gradient(
                            45deg,
                            transparent,
                            transparent 60px,
                            rgba(0,0,0,0.02) 60px,
                            rgba(0,0,0,0.02) 120px
                          )`
                        }}
                      >
                        {/* 优化的预览网格水印 */}
                        {Array.from({ length: 2 }, (_, row) =>
                          Array.from({ length: 3 }, (_, col) => {
                            const rowOffset = row % 2 === 0 ? 0 : 15; // 奇数行偏移
                            const top = 30 + row * 35; // 2行：30%, 65%
                            const left = 20 + col * 30 + rowOffset; // 3列：20%, 50%, 80% (+ 偏移)
                            const rotation = (row + col) % 3 === 0 ? -45 : (row + col) % 3 === 1 ? 45 : -30;
                            const fontSize = 9 + (row + col) % 2; // 9-10px

                            return (
                              <div
                                key={`preview-${row}-${col}`}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                                style={{
                                  top: `${Math.min(top, 90)}%`,
                                  left: `${Math.min(left, 90)}%`,
                                  transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                                  color: 'rgba(156, 163, 175, 0.35)',
                                  fontSize: `${fontSize}px`,
                                  letterSpacing: '1px',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.08)',
                                  fontWeight: '500',
                                  userSelect: 'none',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {watermarkText || t('watermarkUsername')}
                              </div>
                            );
                          })
                        )}

                        {/* 补充的小水印 */}
                        {[
                          { top: 20, left: 70, rotation: -60 },
                          { top: 50, left: 30, rotation: 60 },
                          { top: 80, left: 60, rotation: -30 },
                        ].map(({ top, left, rotation }, index) => (
                          <div
                            key={`preview-extra-${index}`}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2"
                            style={{
                              top: `${top}%`,
                              left: `${left}%`,
                              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                              color: 'rgba(156, 163, 175, 0.25)',
                              fontSize: '8px',
                              letterSpacing: '1px',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.06)',
                              fontWeight: '400',
                              userSelect: 'none',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {watermarkText || t('watermarkUsername')}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* WebShell复制粘贴权限 */}
            <div className="pt-6 border-t">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="font-medium text-sm">{t('webshellCopyPaste')}</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('webshellCopyPasteHint')}
                  </p>
                </div>
                <Switch
                  checked={webshellCopyPasteEnabled}
                  onCheckedChange={(checked) => {
                    setWebshellCopyPasteEnabled(checked)
                    autoSave({ webshellCopyPasteEnabled: checked })
                  }}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <p>• {t('webshellEnabled')}</p>
                <p>• {t('webshellDisabled')}</p>
              </div>
            </div>

            {/* 应用中心开关 */}
            <div className="pt-6 border-t">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="font-medium text-sm">{t('applicationsCenter')}</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('applicationsCenterHint')}
                  </p>
                </div>
                <Switch
                  checked={applicationsCenterEnabled}
                  onCheckedChange={(checked) => {
                    setApplicationsCenterEnabled(checked)
                    autoSave({ applicationsCenterEnabled: checked })
                  }}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <p>• {t('applicationsCenterEnabled')}</p>
                <p>• {t('applicationsCenterDisabled')}</p>
              </div>
            </div>

            {/* 大屏按钮开关 */}
            <div className="pt-6 border-t">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="font-medium text-sm">{t('bigScreenButton')}</label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('bigScreenButtonHint')}
                  </p>
                </div>
                <Switch
                  checked={bigScreenButtonEnabled}
                  onCheckedChange={(checked) => {
                    setBigScreenButtonEnabled(checked)
                    autoSave({ bigScreenButtonEnabled: checked })
                  }}
                />
              </div>

              <div className="text-xs text-muted-foreground">
                <p>• {t('bigScreenEnabled')}</p>
                <p>• {t('bigScreenDisabled')}</p>
              </div>
            </div>
          </CardContent>
        </TechCard>
        )}
      </div>

      {/* 版权信息配置 - 仅超级管理员可见 */}
      {isSuperAdmin && (
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t('copyrightConfig')}
            </CardTitle>
            <p className="text-xs text-amber-600 mt-2">
              🔒 仅超级管理员可见和修改
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 公司版权信息 */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">{t('companyCopyright')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 font-medium text-sm">{t('companyName')}</label>
                  <Input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder={t('companyNamePlaceholder')}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-sm">{t('companyUrl')}</label>
                  <Input
                    value={companyUrl}
                    onChange={e => setCompanyUrl(e.target.value)}
                    placeholder={t('companyUrlPlaceholder')}
                    className="text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block mb-2 font-medium text-sm">{t('copyrightText')}</label>
                  <Input
                    value={copyrightText}
                    onChange={e => {
                      const value = e.target.value
                      setCopyrightText(value)
                    }}
                    placeholder={t('copyrightTextPlaceholder')}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block mb-2 font-medium text-sm">{t('poweredBy')}</label>
                  <Input
                    value={poweredBy}
                    onChange={e => {
                      const value = e.target.value
                      setPoweredBy(value)
                    }}
                    placeholder={t('poweredByPlaceholder')}
                    className="text-sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-sm">{t('showPoweredBy')}</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('showPoweredByHint')}
                    </p>
                  </div>
                  <Switch
                    checked={showPoweredBy}
                    onCheckedChange={(checked) => {
                      setShowPoweredBy(checked)
                      autoSave({ copyright: { companyName, companyUrl, copyrightText, poweredBy, showPoweredBy: checked } })
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 渠道信息配置 */}
            <div className="pt-6 border-t space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{t('channelInfo')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('channelInfoHint')}
                  </p>
                </div>
                <Switch
                  checked={channelEnabled}
                  onCheckedChange={(checked) => {
                    setChannelEnabled(checked)
                    autoSave({ channel: { enabled: checked, channelName, channelUrl, channelCopyright } })
                  }}
                />
              </div>

              {channelEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-medium text-sm">{t('channelName')}</label>
                    <Input
                      value={channelName}
                      onChange={e => {
                        const value = e.target.value
                        setChannelName(value)
                      }}
                      placeholder={t('channelNamePlaceholder')}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-sm">{t('channelUrl')}</label>
                    <Input
                      value={channelUrl}
                      onChange={e => {
                        const value = e.target.value
                        setChannelUrl(value)
                      }}
                      placeholder={t('channelUrlPlaceholder')}
                      className="text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-2 font-medium text-sm">{t('channelCopyright')}</label>
                    <Input
                      value={channelCopyright}
                      onChange={e => {
                        const value = e.target.value
                        setChannelCopyright(value)
                      }}
                      placeholder={t('channelCopyrightPlaceholder')}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 客户信息配置 */}
            <div className="pt-6 border-t space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">{t('clientInfo')}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('clientInfoHint')}
                  </p>
                </div>
                <Switch
                  checked={clientEnabled}
                  onCheckedChange={(checked) => {
                    setClientEnabled(checked)
                    autoSave({ client: { enabled: checked, clientName, clientUrl, clientCopyright } })
                  }}
                />
              </div>

              {clientEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 font-medium text-sm">{t('clientName')}</label>
                    <Input
                      value={clientName}
                      onChange={e => {
                        const value = e.target.value
                        setClientName(value)
                      }}
                      placeholder={t('clientNamePlaceholder')}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-medium text-sm">{t('clientUrl')}</label>
                    <Input
                      value={clientUrl}
                      onChange={e => {
                        const value = e.target.value
                        setClientUrl(value)
                      }}
                      placeholder={t('clientUrlPlaceholder')}
                      className="text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-2 font-medium text-sm">{t('clientCopyright')}</label>
                    <Input
                      value={clientCopyright}
                      onChange={e => {
                        const value = e.target.value
                        setClientCopyright(value)
                      }}
                      placeholder={t('clientCopyrightPlaceholder')}
                      className="text-sm"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 品牌显示设置 */}
            <div className="pt-6 border-t space-y-4">
              <h3 className="text-lg font-medium">{t('brandingSettings')}</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-sm">{t('showFooter')}</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('showFooterHint')}
                    </p>
                  </div>
                  <Switch
                    checked={showFooter}
                    onCheckedChange={(checked) => {
                      setShowFooter(checked)
                      autoSave({ branding: { showFooter: checked, footerText, showLoginBranding, showDashboardBranding } })
                    }}
                  />
                </div>

                <div>
                  <label className="block mb-2 font-medium text-sm">{t('footerAdditionalText')}</label>
                  <Input
                    value={footerText}
                    onChange={e => {
                      const value = e.target.value
                      setFooterText(value)
                    }}
                    placeholder={t('footerAdditionalTextPlaceholder')}
                    className="text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-sm">{t('loginPageBranding')}</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('loginPageBrandingHint')}
                    </p>
                  </div>
                  <Switch
                    checked={showLoginBranding}
                    onCheckedChange={(checked) => {
                      setShowLoginBranding(checked)
                      autoSave({ branding: { showFooter, footerText, showLoginBranding: checked, showDashboardBranding } })
                    }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <label className="font-medium text-sm">{t('dashboardBranding')}</label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('dashboardBrandingHint')}
                    </p>
                  </div>
                  <Switch
                    checked={showDashboardBranding}
                    onCheckedChange={(checked) => {
                      setShowDashboardBranding(checked)
                      autoSave({ branding: { showFooter, footerText, showLoginBranding, showDashboardBranding: checked } })
                    }}
                  />
                </div>
              </div>
            </div>

            {/* 版权信息保存按钮 - 仅超级管理员可见 */}
            <div className="pt-6 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-medium">{t('copyrightConfigSave')}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('copyrightConfigHint')}
                  </p>
                </div>
                <Button
                  onClick={handleSave}
                  disabled={loading || !isSuperAdmin}
                  className="min-w-[120px]"
                  title={!isSuperAdmin ? '需要超级管理员权限才能保存' : ''}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      {t('saveSettings')}
                    </>
                  )}
                </Button>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-700">
                    <X className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              {success && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-4 h-4" />
                    <span className="text-sm">{t('copyrightSaveSuccess')}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      )}

      {/* 页面底部说明 */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>{t('copyrightAutoSave')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>{t('systemConfigAutoSave')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>{t('securityAutoSave')}</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          <p>{t('autoSaveTip')}</p>
        </div>
      </div>
      </div>
    </AdminProtected>
  )
}
