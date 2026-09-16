'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Monitor, ExternalLink, Eye, Terminal, Cpu } from 'lucide-react'
import Link from 'next/link'

/** 暂停图标（与 lucide Pause 一致，避免版本导出问题） */
function PauseIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="14" y="4" width="4" height="16" rx="1" />
      <rect x="6" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

/** 播放图标（与 lucide Play 一致） */
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}
import { JobInfo } from '@/lib/scheduler-types'
import { StatusBadge } from '@/components/ui/status-badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'

interface VirtualTableProps {
  jobs: JobInfo[]
  loading: boolean
  selectedJobs: Set<string>
  onSelectJob: (jobId: string, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onCancelJob: (jobId: string) => void
  onPauseJob?: (jobId: string) => void
  onResumeJob?: (jobId: string) => void
  itemHeight?: number
  containerHeight?: number
}

// 作业状态映射到 StatusBadge 类型
const statusTypeMap: Record<string, 'running' | 'pending' | 'completed' | 'failed' | 'cancelled'> = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  SUSPENDED: 'pending',
  UNKNOWN: 'cancelled',
}

export function VirtualTable({
  jobs,
  loading,
  selectedJobs,
  onSelectJob,
  onSelectAll,
  onCancelJob,
  onPauseJob,
  onResumeJob,
  itemHeight = 80,
  containerHeight = 600
}: VirtualTableProps) {
  const t = useT('jobs')
  const locale = useLocale()
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // 状态标签映射函数
  const getStatusLabel = (status: string) => {
    return t(`statusTypes.${status.toLowerCase()}`) || status
  }
  
  // 计算可见区域
  const visibleCount = Math.ceil(containerHeight / itemHeight)
  const startIndex = Math.floor(scrollTop / itemHeight)
  const endIndex = Math.min(startIndex + visibleCount + 2, jobs.length) // +2 for buffer
  
  // 获取可见的作业
  const visibleJobs = jobs.slice(startIndex, endIndex)
  
  // 计算偏移量
  const offsetY = startIndex * itemHeight
  
  // 处理滚动
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])
  
  // 格式化时间
  function formatTime(timeStr?: string) {
    if (!timeStr) return '-'
    return new Date(timeStr).toLocaleString()
  }
  
  // 计算运行时长
  function getRunTime(job: JobInfo) {
    // PENDING 状态的作业还未开始运行，不显示运行时长
    if (job.status === 'PENDING') return '-'
    
    if (!job.startTime) return '-'
    
    const start = new Date(job.startTime)
    // 检查时间戳是否有效（2001年之后）
    if (isNaN(start.getTime()) || start.getTime() < 978307200000) return '-'
    
    // 关键修复：对于 RUNNING 状态的作业，强制使用当前时间，忽略 endTime
    // 因为 Slurm 的 End 字段可能返回的是 TimeLimit（最大允许运行时间），而不是实际结束时间
    const end = job.status === 'RUNNING' 
      ? new Date() 
      : (job.endTime ? new Date(job.endTime) : new Date())
    
    if (isNaN(end.getTime()) || end.getTime() < start.getTime()) return '-'
    
    const diff = end.getTime() - start.getTime()
    
    // 过滤异常值：运行时长超过30天的视为无效
    if (diff < 0 || diff > 1000 * 60 * 60 * 24 * 30) return '-'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    // 格式化输出：超过24小时显示天数
    if (hours >= 24) {
      const days = Math.floor(hours / 24)
      const remainingHours = hours % 24
      return `${days}d ${remainingHours}h ${minutes}m`
    }
    
    return `${hours}h ${minutes}m`
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" text={t('loading') || '加载中...'} />
      </div>
    )
  }
  
  if (jobs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {t('noJobs') || '暂无作业'}
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* 表头 */}
      <div className="grid grid-cols-12 gap-4 p-4 bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-400/20 rounded-lg font-medium text-sm">
        <div className="col-span-1">
          <Checkbox
            checked={selectedJobs.size === jobs.length && jobs.length > 0}
            onCheckedChange={onSelectAll}
          />
        </div>
        <div className="col-span-3 text-green-700 dark:text-green-300">{t('jobInfo') || '作业信息'}</div>
        <div className="col-span-2 text-green-700 dark:text-green-300">{t('status') || '状态'}</div>
        <div className="col-span-2 text-green-700 dark:text-green-300">{t('userPartition') || '用户/分区'}</div>
        <div className="col-span-2 text-green-700 dark:text-green-300">{t('timeInfo') || '时间信息'}</div>
        <div className="col-span-2 text-green-700 dark:text-green-300">{t('actions') || '操作'}</div>
      </div>
      
      {/* 虚拟滚动容器 */}
      <div
        ref={containerRef}
        style={{ height: containerHeight, overflow: 'auto' }}
        onScroll={handleScroll}
        className="border rounded-lg"
      >
        {/* 总高度占位 */}
        <div style={{ height: jobs.length * itemHeight }}>
          {/* 可见内容 */}
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleJobs.map((job, index) => {
              const actualIndex = startIndex + index
              return (
                <div
                  key={job.jobId}
                  style={{ height: itemHeight }}
                  className="grid grid-cols-12 gap-4 p-4 border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {/* 选择框 */}
                  <div className="col-span-1 flex items-center">
                    <Checkbox
                      checked={selectedJobs.has(job.jobId)}
                      onCheckedChange={(checked) => onSelectJob(job.jobId, checked as boolean)}
                    />
                  </div>
                  
                  {/* 作业信息 */}
                  <div className="col-span-3">
                    <div className="flex items-center gap-2 mb-1">
                      {job.jobType === 'graphics' ? (
                        <Monitor className="w-4 h-4 text-blue-500" />
                      ) : job.jobType === 'interactive' ? (
                        <Terminal className="w-4 h-4 text-green-500" />
                      ) : (
                        <Cpu className="w-4 h-4 text-gray-500" />
                      )}
                      <Link 
                        href={`/${locale}/dashboard/jobs/${job.jobId}`}
                        className="font-medium hover:text-green-600 dark:hover:text-green-400 transition-colors text-sm"
                      >
                        {job.jobName}
                      </Link>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ID: {job.jobId}
                    </div>
                  </div>
                  
                  {/* 状态 */}
                  <div className="col-span-2 flex items-center gap-1">
                    <StatusBadge 
                      status={statusTypeMap[job.status] || 'cancelled'} 
                      size="sm"
                      pulse={job.status === 'RUNNING'}
                    >
                      {getStatusLabel(job.status)}
                    </StatusBadge>
                    {job.jobType === 'graphics' && (
                      <Badge variant="outline" className="text-blue-600 dark:text-blue-400 border-blue-400/30 text-xs">
                        {t('graphics') || '图形'}
                      </Badge>
                    )}
                  </div>
                  
                  {/* 用户/分区 */}
                  <div className="col-span-2 text-sm">
                    <div>{job.user}</div>
                    <div className="text-muted-foreground">{job.partition || '-'}</div>
                  </div>
                  
                  {/* 时间信息 */}
                  <div className="col-span-2 text-sm">
                    <div className="text-muted-foreground">{t('submitTime') || '提交'}: {formatTime(job.submitTime)}</div>
                    <div className="text-muted-foreground">{t('runtime') || '运行'}: {getRunTime(job)}</div>
                  </div>
                  
                  {/* 操作 */}
                  <div className="col-span-2 flex gap-1 flex-wrap">
                    <Link href={`/${locale}/dashboard/jobs/${job.jobId}`}>
                      <Button size="sm" variant="outline" className="border-green-400/30 hover:bg-green-500/10 hover:border-green-400/60 hover:text-green-600 dark:hover:text-green-400">
                        <Eye className="w-3 h-3" />
                      </Button>
                    </Link>
                    {job.jobType === 'graphics' && job.status === 'RUNNING' && job.vncUrl && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          const url = typeof job.vncUrl === 'string' ? job.vncUrl : ''
                          if (url) window.open(url, '_blank')
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    )}
                    {(job.status === 'PENDING' || job.status === 'RUNNING') && onPauseJob && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onPauseJob(job.jobId)}
                        title={t('pause')}
                      >
                        <PauseIcon className="w-3 h-3" />
                      </Button>
                    )}
                    {job.status === 'SUSPENDED' && onResumeJob && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => onResumeJob(job.jobId)}
                        title={t('resume')}
                      >
                        <PlayIcon className="w-3 h-3" />
                      </Button>
                    )}
                    {(job.status === 'PENDING' || job.status === 'RUNNING') && (
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => onCancelJob(job.jobId)}
                      >
                        {t('cancel')}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
} 