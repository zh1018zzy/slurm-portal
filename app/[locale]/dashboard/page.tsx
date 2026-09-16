'use client'
import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { LoadingSpinner, InlineLoading } from '@/components/ui/loading-spinner'
import { FileText, Activity, Folder, ChevronRight } from 'lucide-react'
// 动态导入JobsTrendChart组件
const JobsTrendChart = dynamic(() => import('@/components/dashboard/JobsTrendChart').then(mod => ({ default: mod.JobsTrendChart })), {
  ssr: false
})
// 延迟加载公告横幅
const AnnouncementBanner = dynamic(() => import('@/components/dashboard/AnnouncementBanner').then(mod => ({ default: mod.AnnouncementBanner })), {
  ssr: false
})
// 延迟加载存储信息卡片
const StorageInfoCard = dynamic(() => import('@/components/dashboard/StorageInfoCard').then(mod => ({ default: mod.StorageInfoCard })), {
  ssr: false
})

// 动态导入组件 - 优化加载策略
const SinfoPartitionStatus = dynamic(() => import('./components/SinfoPartitionStatus').then(mod => ({ default: mod.SinfoPartitionStatus })), {
  ssr: false
})

const AlertInfo = dynamic(() => import('./components/AlertInfo'), {
  ssr: false
})

const JobStats = dynamic(() => import('./components/JobStats'), {
  ssr: false
})

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, loading, error } = useDashboardData()
  const locale = useLocale()
  const t = useT('dashboard')
  const tCommon = useT('common')
  
  // 从新的数据结构中提取信息
  const stats = data?.stats || {
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0
  }
  
  // 延迟加载非关键数据
  const [delayedComponentsReady, setDelayedComponentsReady] = useState(false)

  useEffect(() => {
    // 延迟500ms后开始加载非关键组件
    const timer = setTimeout(() => {
      setDelayedComponentsReady(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  // 移除单独的活跃用户 API 调用，因为数据已经包含在 dashboard 数据中
  // useEffect(() => {
  //   // 延迟2秒后加载活跃用户数据
  //   if (!delayedComponentsReady) return
  //   
  //   const timer = setTimeout(() => {
  //     authFetch('/api/users?stats=active')
  //       .then(res => res.json())
  //       .then(res => res.success && setActiveUsers(res.activeUsers || 0))
  //       .catch(() => setActiveUsers(0))
  //   }, 2000)

  //   return () => clearTimeout(timer)
  // }, [delayedComponentsReady])

  return (
    <div className="container mx-auto p-4">
      <div className="mb-4">
        <h1 className="text-3xl font-bold">{t('pageTitle')}</h1>
        <p className="text-muted-foreground mt-2">{t('pageSubtitle')}</p>

        {/* 改进的加载和错误状态显示 */}
        {loading && (
          <div className="mt-2">
            <InlineLoading text={t('loadingData')} />
          </div>
        )}

        {error && (
          <div className="mt-2 flex items-center gap-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-400/30">
            <div className="flex-shrink-0">⚠️</div>
            <span className="flex-1">{t('dataError')}: {error}</span>
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              className="bg-red-600 hover:bg-red-700"
            >
              {t('retry')}
            </Button>
          </div>
        )}
      </div>

      {/* 主要内容区域 - 两列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧：作业管理和快速操作 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 快速操作 */}
          <TechCard hover glowEffect>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-green-600 dark:text-green-400" />
                {t('quickActions')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Link href={`/${locale}/dashboard/submit`} className="block">
                  <PrimaryButton className="w-full">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('submitNewJob')}
                  </PrimaryButton>
                </Link>
                <Link href={`/${locale}/dashboard/jobs`} className="block">
                  <SecondaryButton className="w-full">
                    <Activity className="h-4 w-4 mr-2" />
                    {t('viewAllJobs')}
                  </SecondaryButton>
                </Link>
                <Link href={`/${locale}/dashboard/files`} className="block">
                  <SecondaryButton className="w-full">
                    <Folder className="h-4 w-4 mr-2" />
                    {t('fileManagement')}
                  </SecondaryButton>
                </Link>
              </div>
            </CardContent>
          </TechCard>

          {/* 最近作业列表 - 暂时隐藏 */}
          {/* <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span>最近作业</span>
                <Link href="/dashboard/jobs">
                  <Button variant="outline" size="sm">查看全部</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-12 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : recentJobs.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  暂无作业记录
                </div>
              ) : (
                <div className="space-y-2">
                  {recentJobs.slice(0, 5).map((job) => (
                    <div key={job.jobId} className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Link 
                            href={`/dashboard/jobs/${job.jobId}`}
                            className="font-medium hover:text-primary transition-colors text-sm truncate"
                          >
                            {job.jobName}
                          </Link>
                          <Badge className={`${statusColors[job.status]} text-xs px-1.5 py-0.5`}>
                            {statusLabels[job.status]}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ID: {job.jobId} | 分区: {job.partition || '-'}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground ml-2">
                        {getRunTime(job)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card> */}

          {/* 分区状态 - 使用增强的 sinfo 显示 */}
          <SinfoPartitionStatus className="" />

          {/* 作业趋势图表 - 移动到分区状态下方 */}
          <Suspense fallback={
            <TechCard hover>
              <CardHeader>
                <CardTitle className="text-base">{t('jobTrend')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-64 flex items-center justify-center">
                  <LoadingSpinner size="lg" text={t('loadingChart')} />
                </div>
              </CardContent>
            </TechCard>
          }>
            <JobsTrendChart
              dateRange="month"
              userId={user?.role !== 'admin' ? user?.username : undefined}
            />
          </Suspense>
        </div>

        {/* 右侧：统计信息和用户数据 */}
        <div className="space-y-4">
          {/* 系统公告 */}
          {delayedComponentsReady && <AnnouncementBanner />}
          
          {/* 作业统计 */}
          <JobStats 
            stats={stats}
            loading={loading}
            onRefresh={() => window.location.reload()}
            refreshing={loading}
            userRole={user?.role}
          />

          {/* 存储信息 - 延迟加载 */}
          {delayedComponentsReady && <StorageInfoCard />}
        </div>
      </div>

      {/* 移除底部的作业趋势图表 */}
    </div>
  )
}

function ResourceCard({ title }: { title: string }) {
  const tCommon = useT('common')
  return (
    <TechCard>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <InlineLoading text={tCommon('loading')} />
      </CardContent>
    </TechCard>
  )
}