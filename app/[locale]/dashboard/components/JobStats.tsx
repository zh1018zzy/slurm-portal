'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp } from 'lucide-react'
import { JobInfo } from '@/lib/scheduler-types'
import { useT } from '@/lib/i18n-utils'
import { TechCard } from '@/components/ui/tech-card'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface JobStats {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

interface JobStatsProps {
  className?: string
  stats?: JobStats
  loading?: boolean
  onRefresh?: () => void
  refreshing?: boolean
  userRole?: string
}

export default function JobStats({
  className = '',
  stats = {
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  },
  loading = false,
  onRefresh,
  refreshing = false,
  userRole
}: JobStatsProps) {
  const t = useT('dashboard.jobStats')
  const tCommon = useT('common')

  // 计算成功率
  const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0

  // 格式化时间
  function formatTime(timeStr?: string) {
    if (!timeStr) return '-'
    return new Date(timeStr).toLocaleString()
  }

  if (loading) {
    return (
      <TechCard className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" text={tCommon('loading')} />
          </div>
        </CardContent>
      </TechCard>
    )
  }

  return (
    <TechCard className={className} hover glowEffect>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
            {t('title')}
            {userRole && (
              <span className="text-xs font-normal text-muted-foreground">
                {userRole === 'admin' ? t('clusterAllJobs') : t('yourAllJobs')}
              </span>
            )}
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRefresh}
            disabled={refreshing}
            className="hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400"
          >
            <RefreshCw className={`w-4 h-4 transition-all ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-400/20 hover:border-blue-400/40 transition-all duration-300">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('totalJobs')}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-yellow-500/5 to-amber-500/5 border border-yellow-400/20 hover:border-yellow-400/40 transition-all duration-300">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.pending}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('pending')}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-500/5 to-emerald-500/5 border border-green-400/20 hover:border-green-400/40 transition-all duration-300">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.running}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('running')}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-400/20 hover:border-blue-400/40 transition-all duration-300">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.completed}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('completed')}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-red-500/5 to-rose-500/5 border border-red-400/20 hover:border-red-400/40 transition-all duration-300">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.failed}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('failed')}</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-gray-500/5 to-slate-500/5 border border-gray-400/20 hover:border-gray-400/40 transition-all duration-300">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.cancelled}</div>
              <div className="text-xs text-muted-foreground mt-1">{t('cancelled')}</div>
            </div>
          </div>

          {/* 成功率 */}
          <div className="space-y-2 p-3 rounded-lg bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-400/20">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-green-600 dark:text-green-400">{t('successRate')}</span>
              <span className="text-green-700 dark:text-green-300">{successRate}%</span>
            </div>
            <Progress value={successRate} className="h-2 bg-green-100 dark:bg-green-950">
              <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all" style={{ width: `${successRate}%` }} />
            </Progress>
          </div>
        </div>
      </CardContent>
    </TechCard>
  )
}
