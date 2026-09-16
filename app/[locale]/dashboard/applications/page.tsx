'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useSystemSettings } from '@/hooks/use-system-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Search,
  Play,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Terminal,
  Monitor,
  Cpu,
  Zap,
  Upload
} from 'lucide-react'
import { HpcApplicationSpec, ApplicationCategory, ApplicationType } from '@/lib/hpc-application-spec'
import { useT } from '@/lib/i18n-utils'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { StatusBadge } from '@/components/ui/status-badge'
// import { ResourceRecommendation } from '@/components/applications/DynamicForm'

// 动态导入重型组件
const SimpleForm = dynamic(() => import('@/components/applications/SimpleForm').then(mod => ({ default: mod.SimpleForm })), {
  loading: () => (
    <Card>
      <CardHeader>
        <CardTitle>{/* Loading form */}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </CardContent>
    </Card>
  ),
  ssr: false
})

// 延迟导入应用图标组件
const ApplicationIcon = dynamic(() => import('./components/ApplicationIcon'), {
  loading: () => <div className="h-5 w-5 bg-gray-200 rounded animate-pulse"></div>,
  ssr: false
})

interface ApplicationCardProps {
  application: HpcApplicationSpec
  onSelect: (app: HpcApplicationSpec) => void
}

const ApplicationCard = React.memo(function ApplicationCard({ application, onSelect }: ApplicationCardProps) {
  const t = useT('hpcApplications')
  const tRoot = useTranslations() // 根级别翻译，用于完整路径的翻译键

  // 添加数据验证，防止渲染错误
  if (!application?.metadata) {
    console.warn('Application data format error:', application)
    return null
  }

  const { metadata } = application

  // 使用智能翻译：优先使用翻译键，回退到硬编码文本
  // 注意：displayNameKey 和 descriptionKey 是完整路径，需要使用 tRoot
  const displayName = metadata.displayNameKey
    ? tRoot(metadata.displayNameKey as any)
    : (metadata.displayName || metadata.name || t('unknownApp'))

  const description = metadata.descriptionKey
    ? tRoot(metadata.descriptionKey as any)
    : (metadata.description || t('noDescription'))

  const version = metadata.version || '1.0'
  const tags = Array.isArray(metadata.tags) ? metadata.tags : []
  const types = Array.isArray(metadata.type) ? metadata.type : []

  return (
    <div onClick={() => onSelect(application)} className="cursor-pointer h-full">
      <TechCard
        className="h-full flex flex-col min-h-[180px]"
        hover
      >
      {/* 卡片头部 */}
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-start gap-2">
          {/* 图标 */}
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-green-500/20 group-hover:to-emerald-500/20 group-hover:border-green-400/40 transition-all duration-300">
            <ApplicationIcon
              category={metadata.category}
              iconConfig={metadata.icon}
            />
          </div>

          {/* 标题和版本 */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-1 line-clamp-1">
              {displayName}
            </CardTitle>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600">
                {version}
              </Badge>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 truncate max-w-[80px]">
                {getCategoryLabel(metadata.category, t)}
              </Badge>
            </div>
          </div>
        </div>

        {/* 描述 - 固定高度 */}
        <CardDescription className="text-xs text-gray-600 dark:text-gray-400 leading-snug mt-2 line-clamp-2 h-8">
          {description}
        </CardDescription>
      </CardHeader>

      {/* 卡片内容 */}
      <CardContent className="pt-0 pb-2 flex-1 flex flex-col min-h-0">

        {/* 底部信息 */}
        <div className="mt-auto pt-2 border-t border-green-500/10 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground min-w-0 flex-1">
              {getTypeIcons(types)}
              {metadata.author && (
                <span className="truncate">by {metadata.author}</span>
              )}
            </div>
            <PrimaryButton
              size="sm"
              className="h-6 text-[10px] px-2 flex-shrink-0"
            >
              <Play className="h-2.5 w-2.5 mr-0.5" />
              {t('start')}
            </PrimaryButton>
          </div>
        </div>
      </CardContent>
      </TechCard>
    </div>
  )
})

export default function HpcApplicationCenter() {
  const { user, authLoaded } = useAuth()
  const { toast } = useToast()
  const { settings } = useSystemSettings()
  const t = useT('hpcApplications')
  const tCommon = useT('common')
  const tRoot = useTranslations() // 根级别翻译，用于完整路径的翻译键
  const locale = useLocale()
  const searchParams = useSearchParams()

  // 如果应用中心被禁用，重定向到概览页面
  useEffect(() => {
    if (settings && settings.applicationsCenterEnabled === false) {
      toast({
        title: t('accessDenied'),
        description: t('centerDisabled'),
        variant: "destructive"
      })
      window.location.href = `/${locale}/dashboard`
    }
  }, [settings, toast, t, locale])

  // 状态管理
  const [applications, setApplications] = useState<HpcApplicationSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<HpcApplicationSpec | null>(null)

  // 过滤和搜索状态
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ApplicationCategory | 'all'>('all')
  const [selectedType, setSelectedType] = useState<ApplicationType | 'all'>('all')

  // 处理URL参数自动选择应用
  useEffect(() => {
    const selectedAppId = searchParams.get('selected')
    if (selectedAppId && applications.length > 0 && !selectedApp) {
      const app = applications.find(a => `${a.metadata.name}@${a.metadata.version}` === selectedAppId)
      if (app) {
        setSelectedApp(app)
        // 清除URL参数
        window.history.replaceState({}, '', '/dashboard/applications')
      }
    }
  }, [searchParams, applications, selectedApp])

  // 表单和推荐状态
  const [isSubmitting, setIsSubmitting] = useState(false)
  // const [isRecommending, setIsRecommending] = useState(false)
  // const [recommendation, setRecommendation] = useState<ResourceRecommendation | undefined>()
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [initStatus, setInitStatus] = useState<any>(null)

  // 使用useMemo优化过滤逻辑
  const filteredApps = useMemo(() => {
    let filtered = applications

    // 搜索过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(app => 
        app.metadata.name.toLowerCase().includes(term) ||
        app.metadata.displayName?.toLowerCase().includes(term) ||
        app.metadata.description.toLowerCase().includes(term) ||
        app.metadata.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }

    // 分类过滤
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(app => app.metadata.category === selectedCategory)
    }

    // 类型过滤
    if (selectedType !== 'all') {
      filtered = filtered.filter(app => app.metadata.type.includes(selectedType))
    }

    return filtered
  }, [applications, searchTerm, selectedCategory, selectedType])

  // 按板块分组应用
  const categories = useMemo(() => {
    return Array.from(new Set(applications.map(app => app.metadata.category)))
  }, [applications])

  // 按板块分组应用 - 基于原始应用列表,不受搜索/过滤影响
  const groupedApplications = useMemo(() => {
    const groups = {
      ai: [] as HpcApplicationSpec[],
      hpc: [] as HpcApplicationSpec[]
    }

    // 使用原始applications而不是filteredApps,确保板块始终显示
    applications.forEach(app => {
      const category = app.metadata.category
      const tags = app.metadata.tags || []

      // AI工具识别：category包含ai/ml/dl 或 明确的AI开发工具
      if (
        category.includes('machine-learning') ||
        category.includes('deep-learning') ||
        category === 'development-tools' && (tags.includes('ai') || tags.includes('jupyter'))
      ) {
        groups.ai.push(app)
      }
      // 其他HPC应用（包括生信、仿真计算等）
      else {
        groups.hpc.push(app)
      }
    })

    return groups
  }, [applications])

  // 对每个分组应用搜索和过滤
  const filteredGroupedApplications = useMemo(() => {
    const applyFilters = (apps: HpcApplicationSpec[]) => {
      let filtered = apps

      // 搜索过滤
      if (searchTerm) {
        const term = searchTerm.toLowerCase()
        filtered = filtered.filter(app =>
          app.metadata.name.toLowerCase().includes(term) ||
          app.metadata.displayName?.toLowerCase().includes(term) ||
          app.metadata.description.toLowerCase().includes(term) ||
          app.metadata.tags.some(tag => tag.toLowerCase().includes(term))
        )
      }

      // 分类过滤
      if (selectedCategory !== 'all') {
        filtered = filtered.filter(app => app.metadata.category === selectedCategory)
      }

      // 类型过滤
      if (selectedType !== 'all') {
        filtered = filtered.filter(app => app.metadata.type.includes(selectedType))
      }

      return filtered
    }

    return {
      ai: applyFilters(groupedApplications.ai),
      hpc: applyFilters(groupedApplications.hpc)
    }
  }, [groupedApplications, searchTerm, selectedCategory, selectedType])

  // 延迟加载状态
  const [initialized, setInitialized] = useState(false)

  // 延迟初始化，避免首次渲染过重
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialized(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 加载应用列表
  useEffect(() => {
    if (authLoaded && initialized) {
      fetchApplications()
      // 延迟加载初始化状态检查
      const timeoutId = setTimeout(() => {
        checkInitializationStatus()
      }, 1000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [authLoaded, initialized])

  // 重置搜索条件时清空搜索词

  const checkInitializationStatus = async () => {
    try {
      const response = await fetch('/api/applications/initialize')
      const result = await response.json()
      
      if (result.success) {
        setInitStatus(result.data)
      }
    } catch (error) {
      // 静默处理错误
    }
  }

  const handleInitializeApps = async () => {
    try {
      setIsInitializing(true)
      
      const response = await fetch('/api/applications/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: t('initSuccess'),
          description: `${t('discovered', { count: result.data.registered })} - ${result.data.duration}`
        })
        // 刷新应用列表和初始化状态
        await fetchApplications()
        await checkInitializationStatus()
      } else {
        throw new Error(result.message || t('initFailed'))
      }
    } catch (error) {
      toast({
        title: t('initFailed'),
        description: error instanceof Error ? error.message : t('loadFailed'),
        variant: 'destructive'
      })
    } finally {
      setIsInitializing(false)
    }
  }

  const fetchApplications = async () => {
    try {
      setLoading(true)
      
      // 添加用户参数以启用可见性过滤
      const userParam = user?.username ? `forUser=${encodeURIComponent(user.username)}` : ''
      const url = userParam ? `/api/applications?${userParam}` : '/api/applications'
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setApplications(data.data || [])
        console.log(`[Application Center] Loaded ${(data.data || []).length} applications for user ${user?.username}`)
      } else {
        throw new Error(data.message || t('loadFailed'))
      }
    } catch (error) {
      toast({
        title: t('loadFailed'),
        description: error instanceof Error ? error.message : t('loadFailed'),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApplicationSelect = useCallback((app: HpcApplicationSpec) => {
    setSelectedApp(app)
    // setRecommendation(undefined)
  }, [])

  const handleFormSubmit = async (formData: any) => {
    if (!selectedApp) return

    try {
      setIsSubmitting(true)
      
      // 检查是否是FormData（包含文件上传）
      const isFormData = formData instanceof FormData
      
      let response: Response
      
      if (isFormData) {
        // 添加版本信息到FormData
        formData.append('version', selectedApp.metadata.version)
        
        response = await fetch(`/api/applications/${selectedApp.metadata.name}/submit`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        })
      } else {
        // 使用JSON提交
        response = await fetch(`/api/applications/${selectedApp.metadata.name}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            ...formData,
            version: selectedApp.metadata.version
          })
        })
      }

      // 检查响应状态
      if (!response.ok) {
        const contentType = response.headers.get('content-type')
        let errorMessage = t('submitFailed')

        if (contentType?.includes('application/json')) {
          const errorData = await response.json()
          errorMessage = errorData.message || errorData.error || errorMessage
        } else {
          // HTML error page or other content
          errorMessage = `${t('submitFailed')} (HTTP ${response.status})`
        }

        throw new Error(errorMessage)
      }

      const result = await response.json()

      if (result.success) {
        toast({
          title: t('submitSuccess'),
          description: `${t('jobId')}: ${result.data.jobId}，${t('redirecting')}`
        })
        setSelectedApp(null)

        // 延迟跳转，让用户看到成功提示
        setTimeout(() => {
          window.location.href = `/${locale}/dashboard/jobs`
        }, 1500)
      } else {
        throw new Error(result.message || t('submitFailed'))
      }
    } catch (error) {
      toast({
        title: t('submitFailed'),
        description: error instanceof Error ? error.message : t('submitFailed'),
        variant: 'destructive'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 资源推荐功能暂时隐藏，功能还不完善
  // const handleGetRecommendation = async (formData: any) => {
  //   if (!selectedApp) return

  //   try {
  //     setIsRecommending(true)
      
  //     const response = await fetch(`/api/applications/${selectedApp.metadata.name}/recommend`, {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${localStorage.getItem('token')}`
  //       },
  //       body: JSON.stringify({
  //         ...formData,
  //         version: selectedApp.metadata.version
  //       })
  //     })

  //     const result = await response.json()
      
  //     if (result.success) {
  //       setRecommendation(result.recommendation)
  //       toast({
  //         title: '资源推荐已生成',
  //         description: `置信度: ${Math.round(result.recommendation.confidence * 100)}%`
  //       })
  //     } else {
  //       throw new Error(result.message || '获取推荐失败')
  //     }
  //   } catch (error) {
  //     toast({
  //       title: '推荐失败',
  //       description: error instanceof Error ? error.message : '未知错误',
  //       variant: 'destructive'
  //     })
  //   } finally {
  //     setIsRecommending(false)
  //   }
  // }

  const handleDiscovery = async () => {
    try {
      setIsDiscovering(true)
      
      const response = await fetch('/api/applications/discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ source: 'modules' })
      })

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: t('discoverComplete'),
          description: `${t('discovered', { count: result.summary.discovered })} ${result.summary.converted} ${t('noApplications')}`
        })
        // 刷新应用列表
        fetchApplications()
      } else {
        throw new Error(result.message || t('initFailed'))
      }
    } catch (error) {
      toast({
        title: t('initFailed'),
        description: error instanceof Error ? error.message : t('submitFailed'),
        variant: 'destructive'
      })
    } finally {
      setIsDiscovering(false)
    }
  }

  if (selectedApp) {
    // 使用智能翻译获取应用名称和描述
    // 注意：displayNameKey 和 descriptionKey 是完整路径，需要使用 tRoot
    const appDisplayName = selectedApp.metadata.displayNameKey
      ? tRoot(selectedApp.metadata.displayNameKey as any)
      : (selectedApp.metadata.displayName || selectedApp.metadata.name)

    const appDescription = selectedApp.metadata.descriptionKey
      ? tRoot(selectedApp.metadata.descriptionKey as any)
      : selectedApp.metadata.description

    return (
      <div className="p-6 max-w-full">
        <div className="flex items-center gap-4 mb-6">
          <SecondaryButton
            onClick={() => setSelectedApp(null)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('backToCenter')}
          </SecondaryButton>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
              {getApplicationIcon(selectedApp.metadata.category)}
              {appDisplayName}
            </h1>
            <p className="text-muted-foreground">{appDescription}</p>
          </div>
        </div>

        <SimpleForm
          application={selectedApp}
          layout={selectedApp.interface.layout}
          onSubmit={handleFormSubmit}
          // onLayoutChange={(layout) => {
          //   // 可选：允许用户保存布局更改
          // }}
          isSubmitting={isSubmitting}
        />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('description')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* 初始化按钮 */}
          {initStatus && !initStatus.isInitialized && (
            <PrimaryButton
              onClick={handleInitializeApps}
              disabled={isInitializing}
              loading={isInitializing}
            >
              {!isInitializing && <Upload className="h-4 w-4 mr-2" />}
              {isInitializing ? t('initializing') : t('initBioApps')}
            </PrimaryButton>
          )}
          
          <SecondaryButton
            onClick={handleDiscovery}
            disabled={isDiscovering}
          >
            {isDiscovering ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isDiscovering ? t('discovering') : t('discoverApps')}
          </SecondaryButton>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={(value: any) => setSelectedCategory(value)}>
            <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder={t('selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allCategories')}</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {getCategoryLabel(category, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedType} onValueChange={(value: any) => setSelectedType(value)}>
            <SelectTrigger className="w-full sm:w-48 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder={t('selectType')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTypes')}</SelectItem>
              {Object.values(ApplicationType).map(type => (
                <SelectItem key={type} value={type}>
                  {getTypeLabel(type, t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 初始化提示 */}
      {initStatus && !initStatus.isInitialized && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">{t('bioAppsNotInitialized')}</h3>
              <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                {t('bioAppsNotInitializedDesc', { total: initStatus.total })}
              </p>
            </div>
            <Button
              onClick={handleInitializeApps}
              disabled={isInitializing}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isInitializing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              {t('initBioApps')}
            </Button>
          </div>
        </div>
      )}

      {/* 应用列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">{t('loadingApps')}</p>
          </div>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            {applications.length === 0
              ? t('noApplications')
              : searchTerm
                ? t('noMatchingApps')
                : t('noApplications')
            }
          </div>
          {searchTerm && (
            <Button
              variant="outline"
              onClick={() => setSearchTerm('')}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('clearSearch')}
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* AI工具板块 - 仅当有应用时显示 */}
          {filteredGroupedApplications.ai.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-orange-700 dark:text-orange-300">
                  <Zap className="h-5 w-5" />
                  {t('aiTools')}
                  <Badge variant="outline" className="ml-2">{filteredGroupedApplications.ai.length}</Badge>
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = '/dashboard/applications/ai'}
                  className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                >
                  查看更多 →
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {filteredGroupedApplications.ai.map((app) => (
                  <ApplicationCard
                    key={`${app.metadata.name}@${app.metadata.version}`}
                    application={app}
                    onSelect={handleApplicationSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* HPC应用板块 - 仅当有应用时显示 */}
          {filteredGroupedApplications.hpc.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Cpu className="h-5 w-5" />
                {t('hpcApps')}
                <Badge variant="outline" className="ml-2">{filteredGroupedApplications.hpc.length}</Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {filteredGroupedApplications.hpc.map((app) => (
                  <ApplicationCard
                    key={`${app.metadata.name}@${app.metadata.version}`}
                    application={app}
                    onSelect={handleApplicationSelect}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 应用统计信息 */}
          {filteredApps.length > 0 && (
            <div className="mt-6 text-center text-sm text-muted-foreground">
              {t('totalAppsCount', {
                total: filteredApps.length,
                ai: filteredGroupedApplications.ai.length,
                hpc: filteredGroupedApplications.hpc.length
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Helper functions - need to receive translation function
function getCategoryLabel(category: ApplicationCategory, t: any): string {
  // Convert 'scientific-computing' to 'SCIENTIFIC_COMPUTING' for translation key
  const normalizedKey = category.toUpperCase().replace(/-/g, '_')

  try {
    // 直接使用 t() 函数，它会自动添加 hpcApplications 前缀
    const translated = t(`categories.${normalizedKey}`)
    // 检查翻译是否成功（避免返回键本身）
    if (translated && !translated.includes('categories.')) {
      return translated
    }
  } catch (e) {
    // 翻译失败，使用后备方案
  }

  // 后备：返回格式化的原始值
  return category.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

function getTypeLabel(type: ApplicationType, t: any): string {
  // Convert 'batch' to 'BATCH' for translation key
  const normalizedKey = type.toUpperCase().replace(/-/g, '_')

  try {
    const translated = t(`types.${normalizedKey}`)
    // 检查翻译是否成功
    if (translated && !translated.includes('types.')) {
      return translated
    }
  } catch (e) {
    // 翻译失败，使用后备方案
  }

  // 后备：返回格式化的原始值
  return type.split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

// 优化：将图标映射移到组件外部，避免重复创建
const TYPE_ICON_MAP: Partial<Record<ApplicationType, React.ComponentType<{className?: string}>>> = {
  [ApplicationType.BATCH]: Terminal,
  [ApplicationType.INTERACTIVE]: Play,
  [ApplicationType.GUI]: Monitor,
  [ApplicationType.WEB]: Terminal,
  [ApplicationType.SERVICE]: Terminal,
  [ApplicationType.MPI]: Cpu,
  [ApplicationType.OPENMP]: Cpu,
  [ApplicationType.GPU]: Zap,
  [ApplicationType.JUPYTER]: Terminal,
  [ApplicationType.CONTAINER]: Terminal,
  [ApplicationType.WORKFLOW]: Terminal
}

function getTypeIcons(types: ApplicationType[] = []) {
  return types.slice(0, 3).map((type, index) => {
    const IconComponent = TYPE_ICON_MAP[type]
    return IconComponent ? (
      <IconComponent key={`${type}-${index}`} className="h-3 w-3" />
    ) : null
  }).filter(Boolean)
}

function getApplicationIcon(category: ApplicationCategory) {
  const iconMap: Partial<Record<ApplicationCategory, React.ComponentType<{className?: string}>>> = {
    [ApplicationCategory.SCIENTIFIC_COMPUTING]: Cpu,
    [ApplicationCategory.MACHINE_LEARNING]: Zap,
    [ApplicationCategory.DEEP_LEARNING]: Zap,
    [ApplicationCategory.QUANTUM_CHEMISTRY]: Terminal,
    [ApplicationCategory.COMPUTATIONAL_FLUID_DYNAMICS]: Monitor,
    [ApplicationCategory.BIOINFORMATICS]: Terminal,
    [ApplicationCategory.CAD_CAE]: Monitor,
    [ApplicationCategory.VISUALIZATION]: Monitor,
    [ApplicationCategory.BIG_DATA]: Terminal,
    [ApplicationCategory.COMPILERS]: Terminal,
    [ApplicationCategory.DATABASES]: Terminal,
    [ApplicationCategory.WEB_SERVICES]: Monitor,
    [ApplicationCategory.DEVELOPMENT_TOOLS]: Terminal,
    [ApplicationCategory.SYSTEM_UTILITIES]: Terminal
  }
  
  const IconComponent = iconMap[category] || Terminal
  return <IconComponent className="h-5 w-5" />
}