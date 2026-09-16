'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { JobInfo } from '@/lib/scheduler-types'
import { Monitor, ExternalLink, Eye, Terminal, Cpu, RefreshCw, Calendar, Clock, FileText, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'

// 作业状态映射到StatusBadge类型
const statusTypeMap: Record<string, 'running' | 'pending' | 'completed' | 'failed' | 'cancelled'> = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  TIMEOUT: 'failed',
  NODE_FAIL: 'failed',
  PREEMPTED: 'cancelled',
  SUSPENDED: 'cancelled',
  STOPPED: 'cancelled',
  OUT_OF_MEMORY: 'failed',
  UNKNOWN: 'cancelled',
}

export default function JobsHistoryPage() {
  const { user } = useAuth()
  const locale = useLocale()
  const t = useT('jobs')
  const tCommon = useT('common')
  const [jobs, setJobs] = useState<JobInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false) // 添加同步状态
  const [searchTerm, setSearchTerm] = useState('')
  const [jobIdFilter, setJobIdFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('all')
  const [partitionFilter, setPartitionFilter] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30days') // 7days, 30days, 90days, all
  const [startTime, setStartTime] = useState<string>('') // datetime-local
  const [endTime, setEndTime] = useState<string>('') // datetime-local
  const [userFilter, setUserFilter] = useState<string>('all')
  const [accountFilter, setAccountFilter] = useState<string>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalJobs, setTotalJobs] = useState(0)
  const [requestId, setRequestId] = useState(0)
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    cancelled: 0,
    timeout: 0,
  })

  const [partitions, setPartitions] = useState<string[]>([])

  // 状态标签映射函数
  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      PENDING: t('statusTypes.pending'),
      RUNNING: t('statusTypes.running'),
      COMPLETED: t('statusTypes.completed'),
      FAILED: t('statusTypes.failed'),
      CANCELLED: t('statusTypes.cancelled'),
      TIMEOUT: t('statusTypes.timeout'),
      NODE_FAIL: t('statusTypes.nodeFail'),
      PREEMPTED: t('statusTypes.preempted'),
      SUSPENDED: t('statusTypes.suspended'),
      STOPPED: t('statusTypes.stopped'),
      OUT_OF_MEMORY: t('statusTypes.outOfMemory'),
      UNKNOWN: t('statusTypes.unknown'),
    }
    return statusMap[status] || status
  }

  // 强制同步功能
  const performForceSync = async () => {
    if (syncing) return

    setSyncing(true)
    try {
      const response = await fetch('/api/jobs/smart-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: 'force=true&recentDays=7'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const stats = data.stats
          toast({
            title: t('syncComplete'),
            description: t('syncDescription', { updated: stats.updated, totalJobs: stats.totalJobs }),
          })

          // 同步完成后重新获取数据
          setPage(1) // 重置到第一页
          setRequestId(Date.now()) // 触发重新获取
        } else {
          toast({
            title: t('syncFailed'),
            description: data.error || t('syncError'),
            variant: 'destructive'
          })
        }
      } else {
        toast({
          title: t('syncFailed'),
          description: t('networkRequestFailed'),
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('强制同步失败:', error)
      toast({
        title: t('syncFailed'),
        description: t('syncError'),
        variant: 'destructive'
      })
    } finally {
      setSyncing(false)
    }
  }

  // 页面加载时自动同步 - 保证数据新鲜度
  useEffect(() => {
    const autoSyncOnMount = async () => {
      try {
        await fetch('/api/jobs/smart-sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        // 同步成功，静默处理，不显示通知
      } catch (error) {
        // 自动同步失败，静默处理，不影响页面加载
        console.error('Auto-sync on mount failed:', error)
      }
    }

    autoSyncOnMount()
  }, []) // 仅在组件挂载时执行一次

  // 获取历史作业列表
  useEffect(() => {
    // 等待用户信息加载完成后再发起查询，避免多余的 401 / 重复请求
    if (!user) return

    let isMounted = true
    let abortController = new AbortController()

    async function fetchHistoryJobs() {
      if (!isMounted) return
      
      const currentRequestId = Date.now()
      setRequestId(currentRequestId)
      
      setLoading(true)
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
          dateRange: dateRange,
          history: 'true' // 标记为历史作业查询
        })
        
        // 添加过滤器参数
        if (jobIdFilter.trim() !== '') {
          params.set('jobId', jobIdFilter.trim())
        }
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

        // 起止时间（submit_time）过滤：如果设置了 start/end，则与 dateRange 叠加（后端会优先生效）
        if (startTime) {
          const iso = new Date(startTime).toISOString()
          params.set('startTime', iso)
        }
        if (endTime) {
          const iso = new Date(endTime).toISOString()
          params.set('endTime', iso)
        }

        if (accountFilter.trim() !== '') {
          params.set('account', accountFilter.trim())
        }
        
        if (user?.role !== 'admin' && user?.username) {
          params.set('user', user.username)
        } else if (user?.role === 'admin') {
          if (userFilter !== 'all') {
            params.set('user', userFilter)
          }
        }
        
        const res = await fetch(`/api/jobs?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
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
          setTotalJobs(data.total || 0)
          setStats({
            total: data.total || 0,
            completed: data.stats?.completed || 0,
            failed: data.stats?.failed || 0,
            cancelled: data.stats?.cancelled || 0,
            timeout: data.stats?.timeout || 0,
          })

          // 提取分区列表
          const partitions = data.jobs?.map((j: JobInfo) => j.partition).filter((p: string | undefined): p is string => Boolean(p)) || []
          const uniquePartitions = Array.from(new Set(partitions)) as string[]
          setPartitions(uniquePartitions)
        } else {
          toast({ title: t('fetchFailed'), description: data.message, variant: 'destructive' })
        }
      } catch (error: any) {
        if (!isMounted || error.name === 'AbortError') return
        toast({ title: t('networkError'), description: t('networkError'), variant: 'destructive' })
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    
    fetchHistoryJobs()
    
    return () => {
      isMounted = false
      abortController.abort()
    }
  }, [page, pageSize, statusFilter, jobTypeFilter, partitionFilter, dateRange, searchTerm, user, jobIdFilter, startTime, endTime, userFilter, accountFilter])

  // 格式化时间
  function formatTime(timeStr?: string) {
    if (!timeStr) return '-'
    try {
      return new Date(timeStr).toLocaleString('zh-CN')
    } catch {
      return timeStr
    }
  }

  // 计算运行时间
  function getRunTime(job: JobInfo) {
    // PENDING 状态的作业还未开始运行，不显示运行时长
    if (job.status === 'PENDING') return '-'
    
    if (!job.startTime) return '-'
    const start = new Date(job.startTime)
    // 检查时间戳是否有效（2001年之后）
    if (isNaN(start.getTime()) || start.getTime() < 978307200000) return '-'
    const end = job.endTime ? new Date(job.endTime) : new Date()
    if (isNaN(end.getTime()) || end.getTime() < start.getTime()) return '-'
    const diff = end.getTime() - start.getTime()
    // 过滤异常值：运行时长超过5年的视为无效
    if (diff < 0 || diff > 1000 * 60 * 60 * 24 * 365 * 5) return '-'
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('history')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('historyDescription')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={performForceSync}
            disabled={syncing}
            variant="outline"
            size="sm"
          >
            <RotateCcw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? t('syncing') : t('forceSync')}
          </Button>
          <Link href={`/${locale}/dashboard/jobs`}>
            <Button variant="outline">
              <Monitor className="w-4 h-4 mr-2" />
              {t('backToJobList')}
            </Button>
          </Link>
        </div>
      </div>



      {/* 搜索和过滤 */}
      <TechCard className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="w-44">
              <Input
                placeholder={t('jobId')}
                value={jobIdFilter}
                onChange={(e) => {
                  setJobIdFilter(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="flex-1 min-w-64">
              <Input
                placeholder={t('searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            {user?.role === 'admin' && (
              <div className="w-44">
                <Input
                  placeholder={t('user')}
                  value={userFilter === 'all' ? '' : userFilter}
                  onChange={(e) => {
                    setUserFilter(e.target.value.trim() === '' ? 'all' : e.target.value.trim())
                    setPage(1)
                  }}
                />
              </div>
            )}
            <div className="w-32">
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus')}</SelectItem>
                  <SelectItem value="COMPLETED">{t('statusTypes.completed')}</SelectItem>
                  <SelectItem value="FAILED">{t('statusTypes.failed')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('statusTypes.cancelled')}</SelectItem>
                  <SelectItem value="TIMEOUT">{t('statusTypes.timeout')}</SelectItem>
                  <SelectItem value="NODE_FAIL">{t('statusTypes.nodeFail')}</SelectItem>
                  <SelectItem value="PREEMPTED">{t('statusTypes.preempted')}</SelectItem>
                  <SelectItem value="RUNNING">{t('statusTypes.running')}</SelectItem>
                  <SelectItem value="PENDING">{t('statusTypes.pending')}</SelectItem>
                  <SelectItem value="SUSPENDED">{t('statusTypes.suspended')}</SelectItem>
                  <SelectItem value="STOPPED">{t('statusTypes.stopped')}</SelectItem>
                  <SelectItem value="OUT_OF_MEMORY">{t('statusTypes.outOfMemory')}</SelectItem>
                  <SelectItem value="UNKNOWN">{t('statusTypes.unknown')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger>
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
              <Select value={partitionFilter} onValueChange={setPartitionFilter}>
                <SelectTrigger>
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
            <div className="w-32">
              <Select
                value={dateRange}
                onValueChange={(v) => {
                  setDateRange(v)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">{t('last7Days')}</SelectItem>
                  <SelectItem value="30days">{t('last30Days')}</SelectItem>
                  <SelectItem value="90days">{t('last90Days')}</SelectItem>
                  <SelectItem value="all">{t('allHistory')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-56">
              <Input
                type="datetime-local"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="w-56">
              <Input
                type="datetime-local"
                value={endTime}
                onChange={(e) => {
                  setEndTime(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="w-40">
              <Input
                placeholder="Account"
                value={accountFilter}
                onChange={(e) => {
                  setAccountFilter(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setJobIdFilter('')
                  setStatusFilter('all')
                  setJobTypeFilter('all')
                  setPartitionFilter('all')
                  setDateRange('30days')
                  setStartTime('')
                  setEndTime('')
                  setUserFilter('all')
                  setAccountFilter('')
                  setPage(1)
                }}
              >
                {t('resetFilters')}
              </Button>
            </div>
            <div className="w-32">
              <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="20">20{t('itemsPerPage')}</SelectItem>
                  <SelectItem value="50">50{t('itemsPerPage')}</SelectItem>
                  <SelectItem value="100">100{t('itemsPerPage')}</SelectItem>
                  <SelectItem value="200">200{t('itemsPerPage')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </TechCard>

      {/* 作业列表 */}
      <TechCard hover>
        <CardHeader>
          <CardTitle>{t('queryResults')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('noHistoryRecords')}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">{t('jobId')}</th>
                      <th className="text-left p-3 font-medium">{t('jobName')}</th>
                      <th className="text-left p-3 font-medium">{t('user')}</th>
                      <th className="text-left p-3 font-medium">{tCommon('status')}</th>
                      <th className="text-left p-3 font-medium">{t('partition')}</th>
                      <th className="text-left p-3 font-medium">{t('submitTime')}</th>
                      <th className="text-left p-3 font-medium">{t('startTime')}</th>
                      <th className="text-left p-3 font-medium">{t('endTime')}</th>
                      <th className="text-left p-3 font-medium">{t('runTime')}</th>
                      <th className="text-left p-3 font-medium">{t('nodes')}</th>
                      <th className="text-left p-3 font-medium">{tCommon('actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job, index) => (
                      <tr key={job.jobId} className={`border-b hover:bg-muted/30 ${index % 2 === 0 ? '' : 'bg-muted/10'}`}>
                        <td className="p-3">
                          <div className="font-mono text-sm">{job.jobId}</div>
                        </td>
                        <td className="p-3">
                          <div className="max-w-xs truncate" title={job.jobName}>
                            {job.jobName}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{job.user}</div>
                        </td>
                        <td className="p-3">
                          <StatusBadge status={statusTypeMap[job.status] || 'cancelled'} size="sm">
                            {getStatusLabel(job.status)}
                          </StatusBadge>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{job.partition}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{formatTime(job.submitTime)}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{formatTime(job.startTime)}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{formatTime(job.endTime)}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm">{getRunTime(job)}</div>
                        </td>
                        <td className="p-3">
                          <div className="text-sm max-w-32 truncate" title={Array.isArray(job.nodes) ? job.nodes.join(', ') : job.nodes}>
                            {Array.isArray(job.nodes) ? job.nodes.join(', ') : job.nodes}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <Link href={`/${locale}/dashboard/jobs/${job.jobId}`}>
                              <Button variant="outline" size="sm" title={t('viewDetails')}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            </Link>
                            {job.workDir && (
                              <Link href={`/${locale}/dashboard/files?path=${encodeURIComponent(job.workDir)}`} target="_blank">
                                <Button variant="outline" size="sm" title={t('viewWorkDir')}>
                                  <Terminal className="w-4 h-4" />
                                </Button>
                              </Link>
                            )}
                            {job.logFiles && job.logFiles.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                title={t('viewLogs')}
                                onClick={() => window.open(`/api/files/download?path=${encodeURIComponent(job.logFiles[0])}`, '_blank')}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 分页 */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-600">
                  {t('showing', { from: ((page - 1) * pageSize) + 1, to: Math.min(page * pageSize, totalJobs), total: totalJobs })}
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
            </div>
          )}
        </CardContent>
      </TechCard>
    </div>
  )
} 