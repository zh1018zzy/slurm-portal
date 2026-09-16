'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton, DangerButton } from '@/components/ui/primary-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { JobInfo } from '@/lib/scheduler-types'
import Link from 'next/link'
import Watermark from '@/components/Watermark'
import { Download, Archive, CheckSquare, Square } from 'lucide-react'
import { useT } from '@/lib/i18n-utils'
import { useCurrentLocale } from '@/lib/i18n-client-utils'
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
  SUSPENDED: 'pending',
  STOPPED: 'cancelled',
  OUT_OF_MEMORY: 'failed',
  UNKNOWN: 'cancelled',
}

interface ResourceUsage {
  cpu: number
  memory: number
  gpu: number
  nodes: string[]
  timestamp: string
}

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const currentLocale = useCurrentLocale()
  const { user } = useAuth()
  const t = useT('jobs')
  const tCommon = useT('common')
  const tFiles = useT('files')
  const jobId = params.id as string

  // Status label mapping function for translations
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

  const [job, setJob] = useState<JobInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [suspending, setSuspending] = useState(false)
  const [resuming, setResuming] = useState(false)
  const [logs, setLogs] = useState<{ stdout: string; stderr: string }>({ stdout: '', stderr: '' })
  const [logsLoading, setLogsLoading] = useState(true) // 首次加载为 true
  const [logError, setLogError] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'logs' | 'files' | 'history'>('info')
  const [resourceData, setResourceData] = useState<ResourceUsage | null>(null)
  const [resourceLoading, setResourceLoading] = useState(false)
  const [resourceHistory, setResourceHistory] = useState<ResourceUsage[]>([])
  const [jobHistory, setJobHistory] = useState<JobInfo[]>([])
  const [logTab, setLogTab] = useState<'stdout' | 'stderr'>('stdout')
  const logContainerRef = useRef<HTMLPreElement>(null)
  const prevLog = useRef<string>('')
  
  // 添加防抖机制，避免频繁API调用
  const lastApiCallRef = useRef<number>(0)
  const API_CALL_THROTTLE = 5000 // 5秒内不重复调用

  // 作业文件Tab相关状态
  const [fileList, setFileList] = useState<any[]>([])
  const [filePath, setFilePath] = useState<string>('')
  const [filePreview, setFilePreview] = useState<string>('')
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState('')
  const [fileDirStack, setFileDirStack] = useState<string[]>([])
  const [realDir, setRealDir] = useState<string>('')
  
  // 文件下载相关状态
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [downloadLoading, setDownloadLoading] = useState(false)

  // 获取作业详情
  useEffect(() => {
    if (!jobId) return
    
    let isMounted = true
    
    async function fetchJobDetail() {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        const data = await res.json()
        if (isMounted) {
          if (data.success) {
            setJob(data.job)
          } else {
            toast({ title: t('fetchJobDetailFailed'), description: data.message, variant: 'destructive' })
          }
        }
      } catch (error) {
        if (isMounted) {
          toast({ title: t('networkError'), description: tCommon('error'), variant: 'destructive' })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchJobDetail()
    
    return () => {
      isMounted = false
    }
  }, [jobId])
  
  // 优化轮询逻辑，减少API调用频率（含暂停状态以便恢复后更新）
  useEffect(() => {
    if (!job || !['PENDING', 'RUNNING', 'SUSPENDED'].includes(job.status)) {
      return
    }
    
    // 根据作业状态调整轮询频率
    const interval = setInterval(async () => {
      const now = Date.now()
      // 防抖：5秒内不重复调用
      if (now - lastApiCallRef.current < API_CALL_THROTTLE) {
        return
      }
      lastApiCallRef.current = now
      
      try {
        const res = await fetch(`/api/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        const data = await res.json()
        if (data.success) {
          // 只有当状态发生变化时才更新
          if (data.job.status !== job.status) {
            setJob(data.job)
          }
        }
      } catch (error) {
        console.error('轮询作业状态失败:', error)
      }
    }, job.status === 'RUNNING' ? 30000 : 60000) // 运行中30秒，等待中60秒

    return () => clearInterval(interval)
  }, [jobId, job?.status])

  // 暂停作业
  async function handlePauseJob() {
    if (!jobId) return
    setSuspending(true)
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
        const refreshRes = await fetch(`/api/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        const refreshData = await refreshRes.json()
        if (refreshData.success) setJob(refreshData.job)
      } else {
        toast({ title: t('pauseFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: tCommon('error'), variant: 'destructive' })
    } finally {
      setSuspending(false)
    }
  }

  // 继续作业
  async function handleResumeJob() {
    if (!jobId) return
    setResuming(true)
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
        const refreshRes = await fetch(`/api/jobs/${jobId}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
        const refreshData = await refreshRes.json()
        if (refreshData.success) setJob(refreshData.job)
      } else {
        toast({ title: t('resumeFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: tCommon('error'), variant: 'destructive' })
    } finally {
      setResuming(false)
    }
  }

  // 延迟获取作业历史，只在用户切换到history tab时获取
  const [historyLoaded, setHistoryLoaded] = useState(false)
  
  useEffect(() => {
    if (activeTab === 'history' && job && !historyLoaded) {
      fetchJobHistory()
    }
  }, [activeTab, job?.jobId, historyLoaded])
  
  async function fetchJobHistory() {
    if (!job?.user) return
    try {
      // 优化：减少查询量，只查询最近50条记录
      const res = await fetch(`/api/jobs?user=${job.user}&pageSize=50`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await res.json()
      if (data.success) {
        // 获取同名作业的历史记录
        const history = data.jobs.filter((j: JobInfo) => 
          j.jobName === job.jobName && j.jobId !== job.jobId
        ).slice(0, 10) // 只显示最近10条
        setJobHistory(history)
        setHistoryLoaded(true)
      }
    } catch (error) {
      console.error('获取作业历史失败:', error)
    }
  }

  // 优化日志获取逻辑
  async function fetchJobLogs(isFirst = false) {
    if (!jobId) return
    if (isFirst) setLogsLoading(true)
    try {
      const res = await fetch(`/api/jobs/${jobId}/logs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await res.json()
      if (data.success) {
        // 只有内容变化时才 setLogs，避免闪烁
        if (data.logs.stdout !== logs.stdout || data.logs.stderr !== logs.stderr) {
          setLogs(data.logs)
        }
        setLogError('')
      } else {
        setLogError(t('noOutput'))
      }
    } catch {
      setLogError(t('fetchFailed'))
    }
    if (isFirst) setLogsLoading(false)
  }

  // 当切换到日志标签页时获取日志
  useEffect(() => {
    if (activeTab === 'logs' && job) {
      fetchJobLogs(true)
    }
  }, [activeTab, job?.jobId])

  // 如果作业正在运行，定期刷新日志
  useEffect(() => {
    if (activeTab === 'logs' && job?.status === 'RUNNING') {
      const interval = setInterval(() => {
        fetchJobLogs(false)
      }, 5000) // 增加到5秒，减少API调用频率
      return () => clearInterval(interval)
    }
  }, [activeTab, job?.status, job?.jobId])

  // 日志自动滚动到底部（tail -f 效果）
  useEffect(() => {
    const el = logContainerRef.current
    if (!el) return
    // 判断用户是否在底部
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 10
    // 只有内容变化且用户在底部时才自动滚动
    if (isAtBottom || prevLog.current !== logs[logTab]) {
      el.scrollTop = el.scrollHeight
    }
    prevLog.current = logs[logTab]
  }, [logs, logTab])

  // 获取资源使用情况
  async function fetchResourceData() {
    if (!job) return
    
    setResourceLoading(true)
    try {
      // 模拟资源数据
      const mockData: ResourceUsage = {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        gpu: job.nodes && job.nodes.length > 0 ? Math.floor(Math.random() * 100) : 0,
        nodes: job.nodes || [],
        timestamp: new Date().toISOString(),
      }
      setResourceData(mockData)

      // 添加到历史记录
      setResourceHistory(prev => [...prev.slice(-19), mockData]) // 保留最近20个数据点
    } catch (error) {
      toast({ title: tCommon('error'), description: t('networkError'), variant: 'destructive' })
    } finally {
      setResourceLoading(false)
    }
  }

  // 只在切换到files tab时加载文件列表
  const [filesLoaded, setFilesLoaded] = useState(false)
  
  useEffect(() => {
    if (activeTab === 'files' && job?.jobId && !filesLoaded) {
      fetchJobFiles('')
      setFilesLoaded(true)
    }
  }, [activeTab, job?.jobId, filesLoaded])

  // 获取作业文件列表
  async function fetchJobFiles(dirPath = '') {
    if (!job) return
    setFileLoading(true)
    setFileError('')
    try {
      const res = await fetch(`/api/files?username=${job.user}&path=my-jobs/job_${job.jobId}${dirPath ? '/' + dirPath : ''}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      const data = await res.json()
      if (data.files) {
        setFileList(data.files)
        setFilePath(dirPath)
        setFilePreview('')
        setRealDir(data.realDir || '')
        if (data.error) {
          setFileError(data.error)
          if (typeof window !== 'undefined') (window as any).lastFileApiError = data.error
        } else {
          if (typeof window !== 'undefined') (window as any).lastFileApiError = ''
        }
      } else {
        setFileError(data.error || tFiles('noPermission'))
        if (typeof window !== 'undefined') (window as any).lastFileApiError = data.error || tFiles('noPermission')
      }
    } catch (e) {
      setFileError(tFiles('noPermission'))
      if (typeof window !== 'undefined') (window as any).lastFileApiError = tFiles('noPermission')
    } finally {
      setFileLoading(false)
    }
  }

  // 预览文件内容
  async function handlePreviewFile(file: any) {
    if (!job) return
    setFileLoading(true)
    setFileError('')
    try {
      // 用真实物理路径请求
      const fileFullPath = realDir ? `${realDir}/${file.name}` : `my-jobs/job_${job.jobId}${filePath ? '/' + filePath : ''}/${file.name}`
      const res = await fetch(`/api/files?username=${job.user}&file=${encodeURIComponent(fileFullPath)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      )
      const data = await res.json()
      if (data.content !== undefined) {
        setFilePreview(data.content === '' ? '（文件为空）' : data.content)
        if (typeof window !== 'undefined') (window as any).lastFileApiError = ''
      } else {
        setFilePreview('')
        setFileError(data.error || tFiles('noPreviewPermission'))
        if (typeof window !== 'undefined') (window as any).lastFileApiError = data.error || tFiles('noPreviewPermission')
      }
    } catch (e) {
      setFilePreview('')
      setFileError(tFiles('noPreviewPermission'))
      if (typeof window !== 'undefined') (window as any).lastFileApiError = tFiles('noPreviewPermission')
    } finally {
      setFileLoading(false)
    }
  }

  // 进入子目录
  function handleEnterDir(dir: any) {
    setFileDirStack([...fileDirStack, dir.name])
    fetchJobFiles([...fileDirStack, dir.name].join('/'))
  }
  // 返回上级目录
  function handleBackDir() {
    const newStack = fileDirStack.slice(0, -1)
    setFileDirStack(newStack)
    fetchJobFiles(newStack.join('/'))
  }

  // 下载单个文件或文件夹
  const downloadFile = async (file: any) => {
    if (!job) return
    
    setDownloadLoading(true)
    try {
      const fileFullPath = realDir ? `${realDir}/${file.name}` : `my-jobs/job_${job.jobId}${filePath ? '/' + filePath : ''}/${file.name}`
      const downloadUrl = `/api/files/download?username=${job.user}&file=${encodeURIComponent(fileFullPath)}`
      
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || tFiles('downloadFailed'))
      }

      // 创建下载链接
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = file.isDirectory ? `${file.name}.zip` : file.name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: t('downloadSuccess'),
        description: t('downloadedFile', { name: file.name })
      })
    } catch (error: any) {
      console.error('下载失败:', error)
      toast({
        title: tFiles('downloadFailed'),
        description: error.message || tFiles('downloadFailed'),
        variant: 'destructive'
      })
    } finally {
      setDownloadLoading(false)
    }
  }

  // 下载选中的文件
  const downloadSelectedFiles = async () => {
    if (!job || selectedFiles.size === 0) return
    
    setDownloadLoading(true)
    try {
      const basePath = realDir || `my-jobs/job_${job.jobId}${filePath ? '/' + filePath : ''}`
      const paths = Array.from(selectedFiles).map(fileName => {
        return `${basePath}/${fileName}`
      })
      
      const response = await fetch('/api/files/download-batch', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: job.user,
          paths: paths,
          archiveName: `job_${job.jobId}_files_${Date.now()}.zip`
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || tFiles('batchDownloadFailed'))
      }

      // 创建下载链接
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `job_${job.jobId}_files_${Date.now()}.zip`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: t('downloadSuccess'),
        description: t('downloadedFiles', { count: selectedFiles.size })
      })

      // 清空选择
      setSelectedFiles(new Set())
    } catch (error: any) {
      console.error('下载失败:', error)
      toast({
        title: tFiles('downloadFailed'),
        description: error.message || tFiles('batchDownloadFailed'),
        variant: 'destructive'
      })
    } finally {
      setDownloadLoading(false)
    }
  }

  // 切换文件选择状态
  const toggleFileSelection = (fileName: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(fileName)) {
      newSelected.delete(fileName)
    } else {
      newSelected.add(fileName)
    }
    setSelectedFiles(newSelected)
  }

  // 全选/取消全选文件
  const toggleSelectAllFiles = () => {
    if (selectedFiles.size === fileList.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(fileList.map(f => f.name)))
    }
  }

  // 取消作业
  async function handleCancelJob() {
    if (!job) return
    
    setCancelling(true)
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
        // 刷新作业状态
        const refreshRes = await fetch(`/api/jobs/${jobId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        const refreshData = await refreshRes.json()
        if (refreshData.success) {
          setJob(refreshData.job)
        }
      } else {
        toast({ title: t('cancelJobFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), description: tCommon('error'), variant: 'destructive' })
    } finally {
      setCancelling(false)
    }
  }

  // 重新提交作业
  function handleResubmit() {
    if (!job) return
    // 跳转到作业提交页面，预填充参数
    const params = new URLSearchParams({
      jobName: `${job.jobName}_retry`,
      partition: job.partition || '',
      // 其他参数可以从作业信息中提取或使用默认值
    })
    window.open(`/${currentLocale}/dashboard/submit?${params.toString()}`, '_blank')
  }

  // 格式化时间
  function formatTime(timeStr?: string | null) {
    if (!timeStr) return '-'
    const d = new Date(timeStr)
    if (isNaN(d.getTime()) || d.getTime() < 1000000000) return '-'
    return d.toLocaleString()
  }

  // 计算运行时长
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
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)
    return `${hours}h ${minutes}m ${seconds}s`
  }

  // 计算作业效率
  function getJobEfficiency(job: JobInfo) {
    if (!job.startTime || !job.endTime) return null
    const start = new Date(job.startTime)
    const end = new Date(job.endTime)
    const submit = job.submitTime ? new Date(job.submitTime) : start
    const totalTime = end.getTime() - submit.getTime()
    const runTime = end.getTime() - start.getTime()
    return totalTime > 0 ? Math.round((runTime / totalTime) * 100) : 0
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">{t('jobNotFound')}</h2>
          <p className="text-muted-foreground mb-4">{t('jobNotFoundDesc')}</p>
          <Button onClick={() => router.push(`/${currentLocale}/dashboard/jobs`)}>
            {t('backToJobList')}
          </Button>
        </div>
      </div>
    )
  }

  const efficiency = getJobEfficiency(job)

  return (
    <div className="container mx-auto p-6">
      {/* 头部信息 */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <SecondaryButton
              size="sm"
              onClick={() => router.push(`/${currentLocale}/dashboard/jobs`)}
            >
              {t('backToList')}
            </SecondaryButton>
            <h1 className="text-3xl font-bold">{job.jobName}</h1>
            <StatusBadge status={statusTypeMap[job.status] || 'cancelled'} size="md">
              {getStatusLabel(job.status)}
            </StatusBadge>
          </div>
          <div className="text-muted-foreground">
            {t('jobId')}: {job.jobId} | {t('user')}: {job.user} | {t('partition')}: {job.partition || '-'}
          </div>
        </div>
        <div className="flex gap-2">
          {(job.status === 'PENDING' || job.status === 'RUNNING') && (
            <>
              <Button
                variant="outline"
                onClick={handlePauseJob}
                disabled={suspending || resuming}
              >
                {suspending ? t('pausing') : t('pause')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelJob}
                disabled={cancelling}
              >
                {cancelling ? t('cancelling') : t('cancel')}
              </Button>
            </>
          )}
          {job.status === 'SUSPENDED' && (
            <Button
              variant="outline"
              onClick={handleResumeJob}
              disabled={suspending || resuming}
            >
              {resuming ? t('resuming') : t('resume')}
            </Button>
          )}
          <SecondaryButton
            onClick={handleResubmit}
          >
            {t('resubmit')}
          </SecondaryButton>
        </div>
      </div>

      {/* 作业概览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">{t('submitTime')}</div>
            <div className="font-medium">{formatTime(job.submitTime)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">{t('runTime')}</div>
            <div className="font-medium">{getRunTime(job)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground mb-1">{t('efficiency')}</div>
            <div className="font-medium">
              {efficiency !== null ? `${efficiency}%` : '-'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 标签页内容 */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="info">{t('jobInfo')}</TabsTrigger>
          <TabsTrigger value="logs">{t('jobLogs')}</TabsTrigger>
          <TabsTrigger value="files">{t('jobFiles')}</TabsTrigger>
          <TabsTrigger value="history">{t('jobHistorySameName')}</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('detailsTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('jobName')}</div>
                  <div className="font-medium">{job.jobName}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('jobId')}</div>
                  <div className="font-medium">{job.jobId}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('user')}</div>
                  <div className="font-medium">{job.user}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('partition')}</div>
                  <div className="font-medium">{job.partition || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{tCommon('status')}</div>
                  <div className="font-medium">
                    <StatusBadge status={statusTypeMap[job.status] || 'cancelled'} size="md">
                      {getStatusLabel(job.status)}
                    </StatusBadge>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('nodes')}</div>
                  {/* 优化：节点为空且作业为RUNNING时，显示友好提示 */}
                  <div className="font-medium">
                    {Array.isArray(job.nodes) && job.nodes.length > 0
                      ? job.nodes.join(', ')
                      : job.status === 'RUNNING'
                        ? t('nodesSyncing')
                        : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('scriptPath')}</div>
                  <div className="font-medium break-all">{job.params?.scriptPath || job.extra?.scriptPath || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('stdoutPath')}</div>
                  <div className="font-medium break-all">{job.params?.stdoutPath || job.extra?.stdoutPath || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('stderrPath')}</div>
                  <div className="font-medium break-all">{job.params?.stderrPath || job.extra?.stderrPath || '-'}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('timeInfo')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('submitTime')}</div>
                  <div className="font-medium">{formatTime(job.submitTime)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('startTime')}</div>
                  <div className="font-medium">{formatTime(job.startTime)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('endTime')}</div>
                  <div className="font-medium">{formatTime(job.endTime)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">{t('runTime')}</div>
                  <div className="font-medium">{getRunTime(job)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {job.reason && (
            <Card>
              <CardHeader>
                <CardTitle>{t('failureReason')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-red-600 bg-red-50 dark:bg-red-950 p-3 rounded">
                  {job.reason}
                </div>
              </CardContent>
            </Card>
          )}

          {/* scontrol show job 原始内容展示 */}
          {job.extra?.scontrol && (
            <Card>
              <CardHeader>
                <CardTitle>{t('scontrolInfo')}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded overflow-x-auto whitespace-pre-wrap">
                  {job.extra.scontrol}
                </pre>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('jobLogs')}</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : (
                <Tabs value={logTab} onValueChange={v => setLogTab(v as 'stdout' | 'stderr')} className="w-full">
                  <TabsList>
                    <TabsTrigger value="stdout">{t('stdout')}</TabsTrigger>
                    <TabsTrigger value="stderr">{t('stderr')}</TabsTrigger>
                  </TabsList>
                  <TabsContent value="stdout" className="mt-4">
                    <pre
                      ref={logTab === 'stdout' ? logContainerRef : undefined}
                      className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-sm min-h-[120px] max-h-[60vh] overflow-y-auto whitespace-pre-wrap transition-all"
                    >
                      {logError ? logError : (logs.stdout || t('noOutput'))}
                    </pre>
                  </TabsContent>
                  <TabsContent value="stderr" className="mt-4">
                    <pre
                      ref={logTab === 'stderr' ? logContainerRef : undefined}
                      className="bg-red-50 dark:bg-red-950 p-4 rounded font-mono text-sm min-h-[120px] max-h-[60vh] overflow-y-auto text-red-600 whitespace-pre-wrap transition-all"
                    >
                      {logError ? logError : (logs.stderr || t('noErrorOutput'))}
                    </pre>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {t('jobFiles')}
                  {selectedFiles.size > 0 && (
                    <Badge variant="secondary">
                      {t('filesSelected', { count: selectedFiles.size })}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedFiles.size > 0 && (
                    <Button
                      size="sm"
                      onClick={downloadSelectedFiles}
                      disabled={downloadLoading}
                      className="flex items-center gap-1"
                    >
                      {downloadLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          {t('downloading')}
                        </>
                      ) : (
                        <>
                          <Archive className="w-4 h-4" />
                          {tCommon('download')}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 调试日志：直接输出 fileList 的内容 */}
              {/* <pre className="bg-yellow-50 text-xs text-yellow-800 p-2 rounded mb-2 max-h-40 overflow-auto">{JSON.stringify(fileList, null, 2)}</pre> */}
              {fileLoading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : fileError ? (
                <div className="text-red-600">{fileError}</div>
              ) : (fileList.length === 0 && !filePreview ? (
                <div className="text-muted-foreground text-sm">{t('noFiles')}</div>
              ) : (
                    <div>
                  <div className="mb-2 flex items-center gap-2">
                    {fileDirStack.length > 0 && (
                      <Button size="sm" variant="outline" onClick={handleBackDir}>{t('backToParent')}</Button>
                    )}
                    <span className="text-xs text-muted-foreground">{`/home/${job?.user}/my-jobs/job_${job?.jobId}${filePath ? '/' + filePath : ''}`}</span>
                  </div>
                  {fileList.length > 0 && (
                    <div className="mb-3 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectAllFiles}
                        className="flex items-center gap-1"
                      >
                        {selectedFiles.size === fileList.length ? (
                          <>
                            <Square className="w-4 h-4" />
                            {t('deselectAll')}
                          </>
                        ) : (
                          <>
                            <CheckSquare className="w-4 h-4" />
                            {t('selectAll')}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 min-w-[220px] max-w-xs border rounded p-2 bg-gray-50 dark:bg-gray-900">
                      {fileList.length === 0 ? (
                        <div className="text-muted-foreground text-sm">{t('noFiles')}</div>
                      ) : (
                        <ul>
                          {fileList.map(file => (
                            <li key={file.name} className="flex items-center gap-2 py-1 border-b last:border-b-0">
                              <div className="flex items-center gap-2 flex-1">
                                <input
                                  type="checkbox"
                                  checked={selectedFiles.has(file.name)}
                                  onChange={() => toggleFileSelection(file.name)}
                                  className="w-4 h-4"
                                  onClick={(e) => e.stopPropagation()}
                                />
                                {file.isDirectory ? (
                                  <Button size="sm" variant="ghost" onClick={() => handleEnterDir(file)}>
                                    📁 {file.name}
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="link" onClick={() => handlePreviewFile(file)}>
                                    📄 {file.name}
                                  </Button>
                                )}
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">{file.isDirectory ? t('directory') : `${file.size}B`}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    downloadFile(file)
                                  }}
                                  disabled={downloadLoading}
                                  className="p-1 h-6 w-6"
                                  title={t('downloadFile', { name: file.name })}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex-1 min-w-[300px]">
                      {fileError ? (
                        <div className="text-red-600 bg-red-50 dark:bg-red-950 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto whitespace-pre-wrap">
                          {fileError}
                    </div>
                      ) : (
                        <Watermark username={user?.username || ''}>
                          <pre className="bg-gray-100 dark:bg-gray-900 p-4 rounded font-mono text-xs max-h-96 overflow-y-auto whitespace-pre-wrap">
                            {filePreview}
                          </pre>
                        </Watermark>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('jobHistorySameName')}</CardTitle>
            </CardHeader>
            <CardContent>
              {!historyLoaded ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              ) : jobHistory.length > 0 ? (
                <div className="space-y-4">
                  {jobHistory.map((historyJob) => (
                    <div key={historyJob.jobId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Link
                              href={`/${currentLocale}/dashboard/jobs/${historyJob.jobId}`}
                              className="font-medium hover:text-primary transition-colors"
                            >
                              {historyJob.jobName}
                            </Link>
                            <StatusBadge status={statusTypeMap[historyJob.status] || 'cancelled'} size="sm">
                              {getStatusLabel(historyJob.status)}
                            </StatusBadge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {t('jobId')}: {historyJob.jobId} | {t('submittedAt')}: {formatTime(historyJob.submitTime)} | {t('runningFor')}: {getRunTime(historyJob)}
                          </div>
                        </div>
                        <Link href={`/${currentLocale}/dashboard/jobs/${historyJob.jobId}`}>
                          <Button size="sm" variant="outline">{t('viewJob')}</Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {t('noSameNameHistory')}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 