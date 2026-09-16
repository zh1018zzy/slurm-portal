'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { useSmartJobSync } from '@/hooks/use-smart-job-sync'
import { JobInfo } from '@/lib/scheduler-types'
import { Monitor, ExternalLink, Eye, Terminal, Cpu, RefreshCw, Calendar, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { VirtualTable } from '@/components/ui/virtual-table'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'
import { TechCard } from '@/components/ui/tech-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SecondaryButton } from '@/components/ui/primary-button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

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

export default function JobsPage() {
  const { user } = useAuth()
  const locale = useLocale()
  const t = useT('jobs')
  const tCommon = useT('common')

  // 状态标签映射函数
  const getStatusLabel = (status: string) => {
    return t(`statusTypes.${status.toLowerCase()}`) || status
  }

  const [jobs, setJobs] = useState<JobInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all')
  const [partitionFilter, setPartitionFilter] = useState<string>('all')
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set())
  const [requestId, setRequestId] = useState(0) // 用于防止竞态条件
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    running: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
  })

  const [partitions, setPartitions] = useState<string[]>([])
  const [syncing, setSyncing] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(200)
  const [totalJobs, setTotalJobs] = useState(0)

  // 状态刷新功能
  const handleRefreshJobs = async () => {
    setSyncing(true)
    try {
      // 直接调用状态刷新API
      const response = await fetch('/api/jobs/smart-sync', {
        method: 'POST',
        body: new URLSearchParams()
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast({
            title: t('refreshComplete'),
            description: t('refreshDescription', { updated: data.stats.updated, total: data.stats.totalJobs })
          })
          // 立即刷新数据
          setRequestId(prev => prev + 1)
        }
      } else {
        throw new Error(t('refreshFailed'))
      }
    } catch (error) {
      console.error('Job refresh error:', error)
      toast({ title: t('refreshFailed'), description: t('networkError'), variant: 'destructive' })
    } finally {
      setSyncing(false)
    }
  }




  // 获取作业列表 - 优化版本
  useEffect(() => {
    let isMounted = true
    let abortController = new AbortController()
    
    async function fetchJobs() {
      if (!isMounted) return
      
      // 增加请求ID，用于防止竞态条件
      const currentRequestId = requestId + 1
      setRequestId(currentRequestId)
      
      setLoading(true)
      try {
        const params = new URLSearchParams({
          // 活跃作业列表：仅 RUNNING + PENDING（队列作业）
          page: String(page),
          pageSize: String(pageSize),
        })
        
        // 添加过滤器参数
        if (statusFilter !== 'all') {
          params.set('status', statusFilter)
        }
        if (jobTypeFilter !== 'all') {
          params.set('jobType', jobTypeFilter)
        }
        if (partitionFilter !== 'all') {
          params.set('partition', partitionFilter)
        }
        if (searchTerm.trim() !== '') {
          params.set('search', searchTerm)
        }
        
        if (user?.role !== 'admin' && user?.username) {
          params.set('user', user.username)
        }
        
        const res = await fetch(`/api/jobs/active?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Cache-Control': 'max-age=30' // 30秒缓存
          },
          signal: abortController.signal
        })
        
        if (!isMounted) return
        
        const data = await res.json()
        
        // 检查这是否是最新的请求
        if (currentRequestId < requestId) {
          return
        }
        
        if (data.success) {
          setJobs(data.jobs || [])
          setStats({
            total: data.total || data.totalJobs || 0,
            pending: data.jobs?.filter((j: JobInfo) => j.status === 'PENDING').length || 0,
            running: data.jobs?.filter((j: JobInfo) => j.status === 'RUNNING').length || 0,
            completed: 0,
            failed: 0,
            cancelled: 0,
          })
          setTotalJobs(data.total || data.totalJobs || (data.jobs?.length || 0))
          
          // 提取分区列表
          const partitions = data.jobs?.map((j: JobInfo) => j.partition).filter((p: string | undefined): p is string => Boolean(p)) || []
          const uniquePartitions = Array.from(new Set(partitions)) as string[]
          setPartitions(uniquePartitions)
          

        } else {
          toast({ title: t('fetchFailed'), description: data.message, variant: 'destructive' })
        }
      } catch (error: any) {
        if (!isMounted || error.name === 'AbortError') return
        toast({ title: tCommon('error'), description: t('networkError'), variant: 'destructive' })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    const startTime = Date.now()
    const timer = setTimeout(fetchJobs, 200) // 减少防抖时间
    
    return () => {
      isMounted = false
      abortController.abort()
      clearTimeout(timer)
    }
  }, [user?.username, statusFilter, jobTypeFilter, partitionFilter, searchTerm, page, pageSize])




  // 直接使用API返回的数据，无需前端再次过滤
  const filteredJobs = jobs

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedJobs(new Set(filteredJobs.map(job => job.jobId)))
    } else {
      setSelectedJobs(new Set())
    }
  }

  // 选择单个作业
  const handleSelectJob = (jobId: string, checked: boolean) => {
    const newSelected = new Set(selectedJobs)
    if (checked) {
      newSelected.add(jobId)
    } else {
      newSelected.delete(jobId)
    }
    setSelectedJobs(newSelected)
  }

  // 批量取消作业
  async function handleBatchCancel() {
    if (selectedJobs.size === 0) {
      toast({ title: t('selectJobsToCancel'), variant: 'destructive' })
      return
    }

    const cancelPromises = Array.from(selectedJobs).map(jobId =>
      fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
    )

    try {
      const results = await Promise.all(cancelPromises)
      const successCount = results.filter(res => res.ok).length

      if (successCount > 0) {
        toast({ title: t('batchCancelSuccess', { count: successCount }) })
        setSelectedJobs(new Set())
        // 刷新作业列表
        window.location.reload()
      } else {
        toast({ title: t('batchCancelFailed'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: tCommon('error'), description: t('batchCancelFailed'), variant: 'destructive' })
    }
  }

  // 取消单个作业
  async function handleCancelJob(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: t('jobCancelled') })
        setJobs(jobs.map(job =>
          job.jobId === jobId
            ? { ...job, status: 'CANCELLED' as const }
            : job
        ))
      } else {
        toast({ title: t('cancelJobFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: t('networkRequestFailed'), variant: 'destructive' })
    }
  }

  // 暂停单个作业
  async function handlePauseJob(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action: 'suspend' })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: t('jobPaused') })
        setJobs(jobs.map(job =>
          job.jobId === jobId
            ? { ...job, status: 'SUSPENDED' as const }
            : job
        ))
      } else {
        toast({ title: t('pauseFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: t('networkRequestFailed'), variant: 'destructive' })
    }
  }

  // 继续单个作业
  async function handleResumeJob(jobId: string) {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action: 'resume' })
      })
      const data = await res.json()
      if (data.success) {
        toast({ title: t('jobResumed') })
        setJobs(jobs.map(job =>
          job.jobId === jobId
            ? { ...job, status: 'RUNNING' as const }
            : job
        ))
      } else {
        toast({ title: t('resumeFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: t('networkRequestFailed'), variant: 'destructive' })
    }
  }

  // 批量暂停（仅对 RUNNING/PENDING 的选中项）
  async function handleBatchPause() {
    const toPause = Array.from(selectedJobs).filter(id => {
      const job = jobs.find(j => j.jobId === id)
      return job && (job.status === 'RUNNING' || job.status === 'PENDING')
    })
    if (toPause.length === 0) {
      toast({ title: t('selectJobsToPause'), variant: 'destructive' })
      return
    }
    try {
      const results = await Promise.all(
        toPause.map(jobId =>
          fetch(`/api/jobs/${jobId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ action: 'suspend' })
          })
        )
      )
      const successCount = results.filter(res => res.ok).length
      const dataList = await Promise.all(results.map(r => r.json()))
      const failMsg = dataList.find(d => !d.success)?.message
      if (successCount > 0) {
        toast({ title: t('batchPauseSuccess', { count: successCount }) })
        setJobs(jobs.map(job =>
          toPause.includes(job.jobId) ? { ...job, status: 'SUSPENDED' as const } : job
        ))
        setSelectedJobs(new Set())
      }
      if (successCount < toPause.length && failMsg) {
        toast({ title: t('batchPauseFailed'), description: failMsg, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: tCommon('error'), description: t('batchPauseFailed'), variant: 'destructive' })
    }
  }

  // 批量继续（仅对 SUSPENDED 的选中项）
  async function handleBatchResume() {
    const toResume = Array.from(selectedJobs).filter(id => {
      const job = jobs.find(j => j.jobId === id)
      return job && job.status === 'SUSPENDED'
    })
    if (toResume.length === 0) {
      toast({ title: t('selectJobsToResume'), variant: 'destructive' })
      return
    }
    try {
      const results = await Promise.all(
        toResume.map(jobId =>
          fetch(`/api/jobs/${jobId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ action: 'resume' })
          })
        )
      )
      const successCount = results.filter(res => res.ok).length
      const dataList = await Promise.all(results.map(r => r.json()))
      const failMsg = dataList.find(d => !d.success)?.message
      if (successCount > 0) {
        toast({ title: t('batchResumeSuccess', { count: successCount }) })
        setJobs(jobs.map(job =>
          toResume.includes(job.jobId) ? { ...job, status: 'RUNNING' as const } : job
        ))
        setSelectedJobs(new Set())
      }
      if (successCount < toResume.length && failMsg) {
        toast({ title: t('batchResumeFailed'), description: failMsg, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: tCommon('error'), description: t('batchResumeFailed'), variant: 'destructive' })
    }
  }

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



  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
        </div>
        <div className="flex gap-2">
          <SecondaryButton
            onClick={handleRefreshJobs}
            disabled={syncing}
            className="min-w-[120px]"
          >
            {syncing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                {tCommon('loading')}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {tCommon('refresh')}
              </>
            )}
          </SecondaryButton>
        </div>
      </div>



      {/* 搜索和过滤 */}
      <TechCard className="mb-6" hover>
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
                className="border-green-500/20 focus:border-green-400/50 focus:ring-green-400/20"
              />
            </div>
            <div className="w-32">
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="border-green-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="PENDING">{getStatusLabel('PENDING')}</SelectItem>
                  <SelectItem value="RUNNING">{getStatusLabel('RUNNING')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Select
                value={jobTypeFilter}
                onValueChange={(value) => {
                  setJobTypeFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="border-green-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTypes')}</SelectItem>
                  <SelectItem value="compute">{t('computeJob')}</SelectItem>
                  <SelectItem value="graphics">{t('graphicsJob')}</SelectItem>
                  <SelectItem value="interactive">{t('interactiveJob')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Select
                value={partitionFilter}
                onValueChange={(value) => {
                  setPartitionFilter(value)
                  setPage(1)
                }}
              >
                <SelectTrigger className="border-green-500/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allPartitions')}</SelectItem>
                  {partitions.map(partition => (
                    <SelectItem key={partition} value={partition}>{partition}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

          </div>
        </CardContent>
      </TechCard>

      {/* 批量操作 */}
      {selectedJobs.size > 0 && (
        <TechCard className="mb-6 border-green-400/30 bg-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {t('selectedJobsCount', { count: selectedJobs.size })}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchPause}
                >
                  {t('batchPause')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBatchResume}
                >
                  {t('batchResume')}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchCancel}
                >
                  {t('batchCancel')}
                </Button>
                <SecondaryButton
                  size="sm"
                  onClick={() => setSelectedJobs(new Set())}
                >
                  {tCommon('cancel')}
                </SecondaryButton>
              </div>
            </div>
          </CardContent>
        </TechCard>
      )}

      {/* 作业列表 - 使用虚拟滚动 */}
      <TechCard hover glowEffect>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
              {t('list')}
            </span>
            <div className="text-sm text-muted-foreground">
              {t('totalRecords', { count: totalJobs || jobs.length })}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VirtualTable
            jobs={filteredJobs}
            loading={loading}
            selectedJobs={selectedJobs}
            onSelectJob={handleSelectJob}
            onSelectAll={handleSelectAll}
            onCancelJob={handleCancelJob}
            onPauseJob={handlePauseJob}
            onResumeJob={handleResumeJob}
            itemHeight={80}
            containerHeight={600}
          />
          {totalJobs > pageSize && (
            <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
              <div>
                {t('showing', {
                  from: (page - 1) * pageSize + 1,
                  to: Math.min(page * pageSize, totalJobs),
                  total: totalJobs,
                })}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  {t('previousPage')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= totalJobs}
                >
                  {t('nextPage')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </TechCard>
    </div>
  )
} 