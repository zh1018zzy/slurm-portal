'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import LicenseProtected from '@/components/LicenseProtected'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Monitor,
  Trash2,
  ExternalLink,
  Loader2,
  Terminal,
  FileText,
  Globe,
  RefreshCw,
  Eye,
  MonitorIcon,
  Play
} from 'lucide-react'
import { useT } from '@/lib/i18n-utils'

// 动态导入重型组件
const Select = dynamic(() => import('@/components/ui/select').then(mod => ({ default: mod.Select })), {
  loading: () => <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
})
const SelectContent = dynamic(() => import('@/components/ui/select').then(mod => ({ default: mod.SelectContent })), {
  ssr: false
})
const SelectItem = dynamic(() => import('@/components/ui/select').then(mod => ({ default: mod.SelectItem })), {
  ssr: false
})
const SelectTrigger = dynamic(() => import('@/components/ui/select').then(mod => ({ default: mod.SelectTrigger })), {
  ssr: false
})
const SelectValue = dynamic(() => import('@/components/ui/select').then(mod => ({ default: mod.SelectValue })), {
  ssr: false
})

const Tabs = dynamic(() => import('@/components/ui/tabs').then(mod => ({ default: mod.Tabs })), {
  loading: () => <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
})
const TabsContent = dynamic(() => import('@/components/ui/tabs').then(mod => ({ default: mod.TabsContent })), {
  ssr: false
})
const TabsList = dynamic(() => import('@/components/ui/tabs').then(mod => ({ default: mod.TabsList })), {
  ssr: false
})
const TabsTrigger = dynamic(() => import('@/components/ui/tabs').then(mod => ({ default: mod.TabsTrigger })), {
  ssr: false
})

const Dialog = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.Dialog })), {
  ssr: false
})
const DialogContent = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogContent })), {
  ssr: false
})
const DialogHeader = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogHeader })), {
  ssr: false
})
const DialogTitle = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogTitle })), {
  ssr: false
})
const DialogDescription = dynamic(() => import('@/components/ui/dialog').then(mod => ({ default: mod.DialogDescription })), {
  ssr: false
})

interface ApplicationInfo {
  id: string
  name: string
  description?: string
  icon?: string
  category?: string
  fields: any[]
  command?: string
}

interface JobInfo {
  jobId: string
  jobName: string
  user: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  submitTime: string
  startTime?: string
  endTime?: string
  jobType?: 'compute' | 'graphics' | 'interactive'
  vncDisplay?: number
  vncPort?: number
  vncUrl?: string
  appCommand?: string
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  RUNNING: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  CANCELLED: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
}

// 格式化时间函数 - 移到组件外部
function formatTime(timeStr?: string): string {
  if (!timeStr) return '-'
  return new Date(timeStr).toLocaleString('zh-CN')
}

// Application icon mapping - moved outside component for performance
const APP_ICON_MAP: Record<string, React.ReactNode> = {
  'XTerm': <Terminal className="w-8 h-8" />,
  'Firefox': <Globe className="w-8 h-8" />,
  'GEdit': <FileText className="w-8 h-8" />,
  'MATE Desktop': <Monitor className="w-8 h-8" />,
  'VNC Desktop': <Monitor className="w-8 h-8" />
}

// 获取应用图标函数
function getAppIcon(iconUrl?: string, appName?: string): React.ReactNode {
  if (iconUrl) {
    return <Image src={iconUrl} alt="icon" width={32} height={32} className="w-8 h-8" />
  }
  return APP_ICON_MAP[appName || ''] || <Monitor className="w-8 h-8" />
}

// 优化的应用卡片组件
const ApplicationCard = React.memo(function ApplicationCard({
  app,
  onSelect
}: {
  app: ApplicationInfo;
  onSelect: (app: ApplicationInfo) => void
}) {
  const t = useT('vnc')

  const handleClick = useCallback(() => {
    onSelect(app)
  }, [app, onSelect])

  const appIcon = useMemo(() => getAppIcon(app.icon, app.name), [app.icon, app.name])

  // 使用翻译，如果翻译不存在则使用原始值
  const getAppName = () => {
    const translationKey = `apps.${app.id}.name`
    const translated = t(translationKey)
    // 如果翻译键本身被返回，说明翻译失败，使用原始值
    return (translated && !translated.includes('vnc.apps.')) ? translated : app.name
  }

  const getAppDescription = () => {
    const translationKey = `apps.${app.id}.description`
    const translated = t(translationKey)
    return (translated && !translated.includes('vnc.apps.')) ? translated : app.description
  }

  const getAppCategory = () => {
    const translationKey = `apps.${app.id}.category`
    const translated = t(translationKey)
    return (translated && !translated.includes('vnc.apps.')) ? translated : app.category
  }

  return (
    <Card className="cursor-pointer hover:shadow-lg transition" onClick={handleClick}>
      <CardContent className="p-4 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          {appIcon}
          <div className="font-bold text-lg">{getAppName()}</div>
        </div>
        <div className="text-sm text-muted-foreground line-clamp-2">{getAppDescription()}</div>
        <div className="text-xs text-blue-600">{getAppCategory()}</div>
      </CardContent>
    </Card>
  )
})

// 优化的作业卡片组件
const JobCard = React.memo(function JobCard({
  job,
  onViewLogs,
  onCancel
}: {
  job: JobInfo;
  onViewLogs: (job: JobInfo) => void;
  onCancel: (jobId: string) => void;
}) {
  const { toast } = useToast()
  const t = useT('vnc')
  const tJobs = useT('jobs')

  const handleViewLogs = useCallback(() => {
    onViewLogs(job)
  }, [job, onViewLogs])

  const handleCancel = useCallback(() => {
    onCancel(job.jobId)
  }, [job.jobId, onCancel])

  const handleOpenVnc = useCallback(() => {
    if (job.vncUrl) {
      window.open(job.vncUrl, '_blank')
    }
  }, [job.vncUrl])

  const handleCopyUrl = useCallback(() => {
    if (job.vncUrl) {
      navigator.clipboard.writeText(job.vncUrl)
      toast({ title: t('urlCopied'), description: t('urlCopiedDesc') })
    }
  }, [job.vncUrl, toast, t])

  return (
    <div className="border rounded-lg p-4 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <MonitorIcon className="w-8 h-8 text-blue-500" />
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{job.jobName}</span>
              <Badge className={statusColors[job.status]}>
                {tJobs(`statusTypes.${job.status.toLowerCase()}`)}
              </Badge>
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                {t('desktopSession')}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              ID: {job.jobId} | {t('user')}: {job.user}
              {job.vncDisplay && (
                <span> | {t('display')}: :{job.vncDisplay}</span>
              )}
              {job.vncPort && (
                <span> | {t('port')}: {job.vncPort}</span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {t('startTime')}: {formatTime(job.submitTime)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleViewLogs}
          >
            <Eye className="w-4 h-4 mr-1" />
            {t('logs')}
          </Button>
          {job.status === 'RUNNING' && job.vncUrl && (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                onClick={handleOpenVnc}
                className="bg-green-600 hover:bg-green-700 text-white font-medium"
                title={`${t('openDesktop')}: ${job.vncUrl}`}
              >
                <Monitor className="w-4 h-4 mr-1" />
                {t('openDesktop')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyUrl}
                className="text-gray-500 hover:text-gray-700"
                title={t('copyUrl')}
              >
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          )}
          {job.status === 'RUNNING' && !job.vncUrl && (
            <Button
              size="sm"
              variant="outline"
              disabled
              className="text-gray-400"
            >
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              {t('desktopStarting')}
            </Button>
          )}
          {(job.status === 'PENDING' || job.status === 'RUNNING') && (
            <Button
              size="sm"
              variant="destructive"
              onClick={handleCancel}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              {job.status === 'PENDING' ? t('statusLabels.CANCELLED') : t('close')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

export default function VncApplicationsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const t = useT('vnc')
  const tCommon = useT('common')
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<ApplicationInfo[]>([])
  const [jobs, setJobs] = useState<JobInfo[]>([])
  const [selectedApp, setSelectedApp] = useState<ApplicationInfo | null>(null)
  const [formValues, setFormValues] = useState<Record<string, any>>({})
  const [submitResult, setSubmitResult] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [vncConfig, setVncConfig] = useState<any>(null)
  const [showLogsDialog, setShowLogsDialog] = useState(false)
  const [selectedJobLogs, setSelectedJobLogs] = useState<JobInfo | null>(null)
  const [jobLogs, setJobLogs] = useState({ stdout: '', stderr: '' })
  const [logLoading, setLogLoading] = useState(false)
  const [logError, setLogError] = useState('')
  const logContainerRef = useRef<HTMLPreElement>(null)
  
  // 移除标签页状态管理，改为上下结构

  // 初始化数据
  useEffect(() => {
    if (!user?.username) return

    async function fetchInitialData() {
      setLoading(true)
      
      try {
        // 并行获取应用列表、VNC配置和作业列表
        const [appsResponse, configResponse, jobsResponse] = await Promise.allSettled([
          fetch('/api/applications/available', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          }),
          fetch('/api/vnc-config'),
          fetch('/api/vnc/jobs/realtime', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
          })
        ])
        
        // 处理应用列表
        if (appsResponse.status === 'fulfilled') {
          const data = await appsResponse.value.json()
          if (data.success) {
            const desktopApps = data.apps?.filter((app: ApplicationInfo) => 
              app.id === 'vnc-desktop'
            ) || []
            setApplications(desktopApps)
          }
        }
        
        // 处理VNC配置
        if (configResponse.status === 'fulfilled') {
          const data = await configResponse.value.json()
          if (data.success) {
            setVncConfig(data.config)
          }
        }
        
        // 处理作业列表
        if (jobsResponse.status === 'fulfilled') {
          const data = await jobsResponse.value.json()
          if (data.success) {
            setJobs(data.jobs || [])
          }
        }
        
      } catch (error) {
        console.error('Failed to fetch initial data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchInitialData()
  }, [user?.username])

  // 使用SSE替代轮询 - 实时获取VNC作业状态更新
  const [sseConnected, setSseConnected] = useState(false)

  // 使用useCallback优化回调函数
  const fetchJobs = useCallback(async () => {
    try {
      const response = await fetch('/api/vnc/jobs/realtime', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await response.json()
      if (data.success) {
        setJobs(data.jobs || [])
      } else {
        console.error('Failed to fetch VNC jobs:', data.error)
        setJobs([])
      }
    } catch (error) {
      console.error('Failed to fetch VNC job list:', error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [])

  // 使用useMemo优化活跃作业计算
  const activeJobs = useMemo(() => 
    jobs.filter(job => 
      (job.status === 'PENDING' || job.status === 'RUNNING') && job.jobType === 'graphics'
    ), [jobs]
  )

  // SSE连接和事件处理
  useEffect(() => {
    if (!user?.username || typeof window === 'undefined') return

    // 立即获取一次作业列表
    fetchJobs()

    // 建立SSE连接 - 使用URL参数传递token
    const token = localStorage.getItem('token')
    const eventSource = new EventSource(`/api/vnc/jobs/events?token=${encodeURIComponent(token || '')}`)

    eventSource.onopen = () => {
      setSseConnected(true)
      // 连接建立后立即刷新一次，确保显示最新状态
      fetchJobs()
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'connected') {
          console.log('SSE connection established')
        } else if (data.type === 'job_submitted' || data.type === 'job_updated') {
          // 收到作业更新，刷新列表
          fetchJobs()
          
          // 如果新作业是运行状态，延迟再次刷新（因为运行中状态变化较少）
          if (data.job && data.job.status === 'RUNNING') {
            setTimeout(() => {
              fetchJobs()
            }, 5000) // 5秒后再次刷新
          }
        }
      } catch (error) {
        console.error('Failed to parse SSE message:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error)
      setSseConnected(false)
    }

    return () => {
      eventSource.close()
      setSseConnected(false)
    }
  }, [user?.username, fetchJobs])

  // 表单字段处理
  const partition = formValues.partition || 'graphics'
  const cpusPerTask = formValues.cpusPerTask || 2
  const time = formValues.time || '02:00:00'
  
  // 处理时间值，所有时间值都是标准的Slurm格式
  const getSlurmTime = (timeValue: string) => {
    // 现在所有时间值都是标准的Slurm格式，直接返回
    return timeValue
  }

  async function handleSubmit() {
    if (!selectedApp) return
    setSubmitting(true)
    setSubmitResult(null)
    
    try {
      const response = await fetch(`/api/applications/${selectedApp.id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formValues,
          partition,
          cpusPerTask,
          time: getSlurmTime(time)
        })
      })
      const data = await response.json()
      if (data.success) {
        // 提交成功，显示通知
        toast({
          title: t('submitSuccess'),
          description: t('submitSuccessDesc', { jobId: data.job.jobId })
        })

        // 关闭弹窗
        setSelectedApp(null)
        setFormValues({})
        setSubmitResult(null)

        // 立即刷新作业列表
        fetchJobs()

        // 延迟再次刷新，确保获取到最新状态（绕过缓存）
        setTimeout(() => {
          fetchJobs()
        }, 1000)
      } else {
        // 处理各种错误情况
        if (response.status === 409) {
          // VNC作业限制错误
          toast({
            title: t('submitFailed'),
            description: data.message || t('submitFailedDesc'),
            variant: 'destructive',
            duration: 5000 // 延长显示时间
          })

          // 如果有现有作业信息，刷新作业列表让用户查看
          if (data.existingJob) {
            setTimeout(() => {
              fetchJobs()
            }, 1000)
          }
        } else {
          // 其他错误
          toast({
            title: t('submitFailed'),
            description: data.message || t('submitFailedGeneric'),
            variant: 'destructive'
          })
        }
      }
    } catch (error) {
      toast({ title: t('networkError'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  // 使用useMemo计算活跃作业数量
  const activeJobsCount = useMemo(() => 
    jobs.filter(job => job.status === 'PENDING' || job.status === 'RUNNING').length,
    [jobs]
  )

  // 作业日志轮询 - 修复闪烁问题
  useEffect(() => {
    if (!showLogsDialog || !selectedJobLogs) return
    
    let timer: NodeJS.Timeout
    let stopped = false
    let currentLogs = { stdout: '', stderr: '' }
    let isFirstLoad = true
    
    async function fetchLogs() {
      if (stopped || !selectedJobLogs) return
      
      try {
        // 只在第一次加载时显示loading状态，避免闪烁
        if (isFirstLoad) {
          setLogLoading(true)
          isFirstLoad = false
        }
        
        const res = await fetch(`/api/jobs/${selectedJobLogs.jobId}/logs`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        const data = await res.json()
        
        if (data.success) {
          const newLogs = {
            stdout: data.logs.stdout || '',
            stderr: data.logs.stderr || ''
          }
          
          // 只有当日志内容发生变化时才更新
          if (newLogs.stdout !== currentLogs.stdout || newLogs.stderr !== currentLogs.stderr) {
            currentLogs = newLogs
            setJobLogs(newLogs)
            
            // 自动滚动到底部
            if (logContainerRef.current) {
              logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
            }
          }
          setLogLoading(false) // 加载完成
        } else {
          setLogError(data.message || 'Failed to load logs')
          setLogLoading(false)
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error)
        setLogError('Failed to load logs')
        setLogLoading(false)
      }
    }
    
    // 立即获取一次
    fetchLogs()
    
    // 设置轮询
    timer = setInterval(fetchLogs, 2000)
    
    return () => {
      stopped = true
      if (timer) clearInterval(timer)
    }
  }, [showLogsDialog, selectedJobLogs])

  // 查看作业日志
  function handleViewJobLogs(job: JobInfo) {
    setSelectedJobLogs(job)
    setJobLogs({ stdout: '', stderr: '' })
    setLogLoading(true) // 立即显示loading状态
    setLogError('')
    setShowLogsDialog(true)
  }

  // 取消作业
  async function handleCancelJob(jobId: string) {
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      const data = await response.json()
      if (data.success) {
        toast({ title: t('jobCancelled'), description: t('sessionStopped') })
        fetchJobs() // 刷新列表
      } else {
        toast({ title: t('cancelFailed'), description: data.message || t('cancelFailedDesc'), variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('networkError'), variant: 'destructive' })
    }
  }

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loadingApps')}</p>
        </div>
      </div>
    )
  }

  return (
    <LicenseProtected feature="vnc_access">
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
        </div>

      {/* 桌面应用部分 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Monitor className="w-5 h-5 mr-2" />
            {t('availableApps')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {applications.map((app) => (
              <ApplicationCard
                key={app.id}
                app={app}
                onSelect={setSelectedApp}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 桌面会话列表部分 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Terminal className="w-5 h-5 mr-2" />
              {t('sessionList')}
              {activeJobsCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeJobsCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant={sseConnected ? "default" : "outline"}
                disabled
                title={sseConnected ? t('realtimeConnected') : t('connecting')}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${sseConnected ? 'animate-pulse' : 'animate-spin'}`} />
                {sseConnected ? t('realtimeUpdate') : t('connecting')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={fetchJobs}
                disabled={loading}
                title={t('manualRefresh')}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-y-auto max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t('loadingSessions')}</p>
              </div>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <Terminal className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">{t('noSessions')}</p>
              <p className="text-sm text-muted-foreground">{t('noSessionsHint')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.jobId}
                  job={job}
                  onViewLogs={handleViewJobLogs}
                  onCancel={handleCancelJob}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 应用详情与动态表单弹窗 */}
      <Dialog open={!!selectedApp} onOpenChange={open => {
        if (!open) {
          setSelectedApp(null);
          setFormValues({});
          setSubmitResult(null)
        }
      }}>
        <DialogContent className="max-w-lg">
          {selectedApp && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-blue-600" />
                  {selectedApp.name}
                </DialogTitle>
                <DialogDescription>
                  {t('configureSession')}
                </DialogDescription>
              </DialogHeader>
              <div className="mb-4 text-muted-foreground">{selectedApp.description}</div>
              <form className="space-y-4" onSubmit={e => {
                e.preventDefault();
                handleSubmit()
              }}>
                {/* 动态表单字段 */}
                {selectedApp.fields?.map((field: any) => {
                  const { name, label, type, required, default: def, options, description } = field
                  const value = formValues[name] ?? def ?? ''
                  
                  switch (type) {
                    case 'text':
                      return (
                        <div key={name} className="space-y-1">
                          <Label>{label}</Label>
                          <Input
                            value={value}
                            required={required}
                            onChange={e => setFormValues(v => ({ ...v, [name]: e.target.value }))}
                            placeholder={description}
                          />
                        </div>
                      )
                    case 'select':
                      return (
                        <div key={name} className="space-y-1">
                          <Label>{label}</Label>
                          <Select value={value} onValueChange={val => setFormValues(v => ({ ...v, [name]: val }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {options?.map((opt: any) => (
                                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    default:
                      return null
                  }
                })}

                {/* 桌面会话配置 */}
                <div className="space-y-3 border-t pt-4">
                  <h3 className="font-medium text-blue-600">{t('desktopConfig')}</h3>
                  <div>
                    <Label>{t('partition')}</Label>
                    <Input
                      value={formValues.partition || 'graphics'}
                      onChange={e => setFormValues(v => ({ ...v, partition: e.target.value }))}
                      placeholder={t('partitionPlaceholder')}
                    />
                  </div>
                  <div>
                    <Label>{t('cpusPerTask')}</Label>
                    <Input
                      type="number"
                      min={1}
                      max={16}
                      value={formValues.cpusPerTask || 2}
                      onChange={e => setFormValues(v => ({ ...v, cpusPerTask: Number(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label>{t('timeLimit')}</Label>
                    <Select
                      value={formValues.time || '04:00:00'}
                      onValueChange={val => setFormValues(v => ({ ...v, time: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectTimeLimit')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01:00:00">{t('oneHour')}</SelectItem>
                        <SelectItem value="02:00:00">{t('twoHours')}</SelectItem>
                        <SelectItem value="04:00:00">{t('fourHours')}</SelectItem>
                        <SelectItem value="08:00:00">{t('eightHours')}</SelectItem>
                        <SelectItem value="24:00:00">{t('twentyFourHours')}</SelectItem>
                        <SelectItem value="7-00:00:00">{t('sevenDays')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('timeLimitHint')}
                    </p>
                  </div>
                </div>

                <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700">
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  {t('startSession')}
                </Button>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 日志查看弹窗 */}
      <Dialog open={showLogsDialog} onOpenChange={(open) => {
        if (!open) {
          setShowLogsDialog(false)
          setSelectedJobLogs(null)
          setJobLogs({ stdout: '', stderr: '' })
          setLogLoading(false)
          setLogError('')
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{t('sessionLogs')}</DialogTitle>
            <DialogDescription>
              {t('sessionLogsDesc')}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[calc(85vh-120px)]">
            <Tabs defaultValue="stdout" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="stdout">{t('stdout')}</TabsTrigger>
                <TabsTrigger value="stderr">{t('stderr')}</TabsTrigger>
              </TabsList>
              <TabsContent value="stdout" className="mt-4">
                <pre
                  ref={logContainerRef}
                  className="bg-gray-100 p-3 rounded text-sm overflow-auto min-h-[300px] max-h-[60vh] transition-all"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                  {logLoading
                    ? t('logsLoading')
                    : logError
                      ? logError
                      : (jobLogs.stdout || t('noOutput'))}
                </pre>
              </TabsContent>
              <TabsContent value="stderr" className="mt-4">
                <pre
                  className="bg-red-50 p-3 rounded text-sm overflow-auto min-h-[300px] max-h-[60vh] transition-all"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                  {logLoading
                    ? t('logsLoading')
                    : logError
                      ? logError
                      : (jobLogs.stderr || t('noError'))}
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </LicenseProtected>
  )
}