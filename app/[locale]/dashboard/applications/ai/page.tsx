'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useT } from '@/lib/i18n-utils'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Zap,
  Cpu,
  RefreshCw,
  Loader2,
  Upload,
  CheckCircle,
  XCircle,
  Activity,
  BarChart3,
  TrendingUp
} from 'lucide-react'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { StatusBadge } from '@/components/ui/status-badge'

interface AIApplication {
  metadata: {
    name: string
    displayNameKey: string
    version: string
    description: string
    descriptionKey?: string
    category: string
    tags: string[]
    icon?: {
      type: string
      emoji: string
    }
  }
  requirements: {
    hardware?: {
      gpu?: {
        required: boolean
        count?: {
          min: number
          max: number
          default: number
        }
      }
    }
  }
}

interface AIStats {
  total: number
  deepLearning: number
  machineLearning: number
  interactive: number
  gpuRequired: number
  gpuOptional: number
}

export default function AIApplicationsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const t = useT('aiApplications')
  const tRoot = useTranslations() // 根级别翻译，用于完整路径的翻译键

  const [apps, setApps] = useState<AIApplication[]>([])
  const [stats, setStats] = useState<AIStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isRegistering, setIsRegistering] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchAIApplications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchAIApplications = async () => {
    try {
      setLoading(true)

      const response = await fetch('/api/applications/ai', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const result = await response.json()

      if (result.success) {
        setApps(result.data.all || [])
        setStats(result.data.metadata)
      } else {
        throw new Error(result.error || 'Failed to fetch AI applications')
      }
    } catch (error) {
      console.error('获取AI应用失败:', error)
      toast({
        title: t('loadFailed'),
        description: error instanceof Error ? error.message : t('unknownError'),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterApps = async () => {
    try {
      setIsRegistering(true)

      const response = await fetch('/api/applications/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: t('registerSuccess'),
          description: result.message
        })
        // 刷新列表
        await fetchAIApplications()
      } else {
        throw new Error(result.message || t('registerFailed'))
      }
    } catch (error) {
      console.error('注册AI应用失败:', error)
      toast({
        title: t('registerFailed'),
        description: error instanceof Error ? error.message : t('unknownError'),
        variant: 'destructive'
      })
    } finally {
      setIsRegistering(false)
    }
  }

  const handleClearCache = async () => {
    try {
      const response = await fetch('/api/applications/ai', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: t('cacheCleared'),
          description: result.message
        })
        // 刷新列表
        await fetchAIApplications()
      }
    } catch (error) {
      console.error('清除缓存失败:', error)
    }
  }

  const getAppIcon = (app: AIApplication) => {
    if (app.metadata.icon?.emoji) {
      return <span className="text-2xl">{app.metadata.icon.emoji}</span>
    }

    // 默认图标
    if (app.metadata.tags.includes('deep-learning')) return <Activity className="h-6 w-6" />
    if (app.metadata.tags.includes('llm')) return <Zap className="h-6 w-6" />
    if (app.metadata.tags.includes('jupyter')) return <Cpu className="h-6 w-6" />
    return <BarChart3 className="h-6 w-6" />
  }

  const getGPUBadge = (app: AIApplication) => {
    const gpuRequired = app.requirements.hardware?.gpu?.required

    if (gpuRequired) {
      return (
        <Badge variant="default" className="bg-orange-500 hover:bg-orange-600">
          <Zap className="h-3 w-3 mr-1" />
          GPU必需
        </Badge>
      )
    }

    return (
      <Badge variant="outline" className="text-gray-600 dark:text-gray-300">
        GPU可选
      </Badge>
    )
  }

  const filteredApps = apps.filter(app => {
    if (activeTab === 'all') return true
    if (activeTab === 'deep-learning') return app.metadata.category === 'deep-learning'
    if (activeTab === 'machine-learning') return app.metadata.category === 'machine-learning'
    if (activeTab === 'interactive') return app.metadata.category === 'development-tools'
    if (activeTab === 'gpu-required') return app.requirements.hardware?.gpu?.required === true
    return true
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>需要登录</CardTitle>
            <CardDescription>请先登录以访问AI应用中心</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
            AI应用中心
          </h1>
          <p className="text-muted-foreground mt-1">
            深度学习框架、大模型推理、交互式开发环境
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === 'admin' && (
            <PrimaryButton
              onClick={handleRegisterApps}
              disabled={isRegistering}
              loading={isRegistering}
            >
              {!isRegistering && <Upload className="h-4 w-4 mr-2" />}
              {isRegistering ? '注册中...' : '注册AI应用'}
            </PrimaryButton>
          )}

          <SecondaryButton
            onClick={fetchAIApplications}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            刷新
          </SecondaryButton>
        </div>
      </div>

      {/* 统计卡片 */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <TechCard>
            <CardHeader className="pb-3">
              <CardDescription>总应用数</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <TrendingUp className="h-4 w-4 mr-1 text-green-500" />
                AI计算工具
              </div>
            </CardContent>
          </TechCard>

          <TechCard>
            <CardHeader className="pb-3">
              <CardDescription>深度学习</CardDescription>
              <CardTitle className="text-3xl">{stats.deepLearning}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Activity className="h-4 w-4 mr-1 text-blue-500" />
                神经网络训练
              </div>
            </CardContent>
          </TechCard>

          <TechCard>
            <CardHeader className="pb-3">
              <CardDescription>机器学习</CardDescription>
              <CardTitle className="text-3xl">{stats.machineLearning}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <BarChart3 className="h-4 w-4 mr-1 text-purple-500" />
                模型推理
              </div>
            </CardContent>
          </TechCard>

          <TechCard>
            <CardHeader className="pb-3">
              <CardDescription>GPU必需</CardDescription>
              <CardTitle className="text-3xl">{stats.gpuRequired}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center text-sm text-muted-foreground">
                <Zap className="h-4 w-4 mr-1 text-orange-500" />
                GPU加速计算
              </div>
            </CardContent>
          </TechCard>
        </div>
      )}

      {/* 标签页 */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">
            全部 ({apps.length})
          </TabsTrigger>
          <TabsTrigger value="deep-learning">
            深度学习 ({stats?.deepLearning || 0})
          </TabsTrigger>
          <TabsTrigger value="machine-learning">
            机器学习 ({stats?.machineLearning || 0})
          </TabsTrigger>
          <TabsTrigger value="interactive">
            交互式 ({stats?.interactive || 0})
          </TabsTrigger>
          <TabsTrigger value="gpu-required">
            GPU必需 ({stats?.gpuRequired || 0})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 应用列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">加载AI应用...</p>
          </div>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            暂无AI应用
          </div>
          {user?.role === 'admin' && (
            <PrimaryButton onClick={handleRegisterApps} disabled={isRegistering}>
              {isRegistering ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              注册AI应用
            </PrimaryButton>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApps.map((app) => (
            <TechCard key={`${app.metadata.name}@${app.metadata.version}`} hover>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-400/20 flex items-center justify-center">
                      {getAppIcon(app)}
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {app.metadata.displayNameKey ? tRoot(app.metadata.displayNameKey as any) : app.metadata.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        v{app.metadata.version}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {app.metadata.descriptionKey ? tRoot(app.metadata.descriptionKey as any) : app.metadata.description}
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {getGPUBadge(app)}
                  {app.metadata.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {app.requirements.hardware?.gpu?.count && (
                      <>
                        GPU: {app.requirements.hardware.gpu.count.min}-{app.requirements.hardware.gpu.count.max}
                      </>
                    )}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      // 跳转到主应用中心并自动打开该应用
                      const appId = `${app.metadata.name}@${app.metadata.version}`
                      window.location.href = `/dashboard/applications?selected=${encodeURIComponent(appId)}`
                    }}
                  >
                    启动应用
                  </Button>
                </div>
              </CardContent>
            </TechCard>
          ))}
        </div>
      )}

      {/* 底部提示 */}
      {user?.role === 'admin' && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                管理员提示
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-200">
                您可以通过&ldquo;注册AI应用&rdquo;按钮批量注册PyTorch、vLLM、Jupyter Lab等AI工具。
                注册后,用户可在应用中心看到并使用这些应用。
              </p>
              <div className="mt-2">
                <Button
                  variant="link"
                  size="sm"
                  className="text-blue-600 dark:text-blue-400 p-0 h-auto"
                  onClick={handleClearCache}
                >
                  清除缓存
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
