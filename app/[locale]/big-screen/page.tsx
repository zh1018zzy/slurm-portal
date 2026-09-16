'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { 
  Monitor, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Activity,
  Users,
  BarChart3,
  TrendingUp,
  Server,
  Database,
  Zap,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  X,
  Clock,
  PieChart as PieChartIcon,
  Database as DatabaseIcon
} from 'lucide-react'
import { authFetch } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LabelList } from 'recharts'
import { LicenseProtected } from '@/components/LicenseProtected'
import { useT } from '@/lib/i18n-utils'

// 本地GPU图标组件
const GpuIcon = ({ className }: { className?: string }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
    <circle cx="8" cy="8" r="1"/>
    <circle cx="16" cy="8" r="1"/>
    <circle cx="8" cy="12" r="1"/>
    <circle cx="16" cy="12" r="1"/>
  </svg>
)

interface HardwareResources {
  computeNodes: number
  cpuCores: number
  totalMemory: string
  gpuCards: number
  sharedStorage: string
  peakComputePower: string
}

interface NodeResourceUsage {
  cpuUsage: number
  memoryUsage: number
  gpuUsage: number
}

interface ResourceUsage {
  computeNodesUsage: number
  cpuUsage: number
  gpuUsage: number
  memoryUsage: number
  storageUsage: number
}

interface TrendData {
  date: string
  submitted: number
  completed: number
  failed: number
  cancelled: number
  running: number
  pending: number
}

interface TrendSummary {
  totalJobs: number
  completed: number
  failed: number
  cancelled: number
  running: number
  pending: number
  successRate: number
  avgRunTime: number
  totalRunTime: number
  avgWaitTime: number
}

interface FailureData {
  name: string
  value: number
}

interface DepartmentData {
  name: string
  value: number
}

interface SoftwareInfo {
  totalSoftware: number
  topSoftware: Array<{name: string, count: number}>
}

interface UserDistribution {
  registeredUsers: number
  researchTeams: number
  departments: Array<{name: string, count: number}>
  userRankings?: Array<{name: string, count: string | number, dept: string}>
  totalJobs?: number
  activeUsers?: number
  onlineUsers?: number
}

interface OperationalStats {
  submittedJobs: number
  cpuRunTime: string
  gpuRunTime: string
  avgComputeTime: string
  avgQueueTime: string
  runningJobs: number
  queuedJobs: number
  completedJobs: number
  failedJobs: number
  cancelledJobs: number
  _hasJobsStats?: boolean
}

interface SystemInfo {
  hostname: string
  osVersion: string
  kernelVersion: string
  uptime: string
  loadAverage: string
}

interface FailureData {
  name: string
  value: number
}

interface DepartmentData {
  name: string
  value: number
}

export default function BigScreenPage() {
  return (
    <LicenseProtected feature="big_screen">
      <BigScreenContent />
    </LicenseProtected>
  )
}

function BigScreenContent() {
  const { user, authLoaded } = useAuth()
  const t = useT('bigScreen')
  
  const [hardwareResources, setHardwareResources] = useState<HardwareResources>({
    computeNodes: 0,
    cpuCores: 0,
    totalMemory: '0GB',
    gpuCards: 0,
    sharedStorage: '0GB',
    peakComputePower: '0TFLOPS'
  })
  
  const [resourceUsage, setResourceUsage] = useState<ResourceUsage>({
    computeNodesUsage: 0,
    cpuUsage: 0,
    gpuUsage: 0,
    memoryUsage: 0,
    storageUsage: 0
  })
  
  const [nodeResourceUsage, setNodeResourceUsage] = useState<NodeResourceUsage>({
    cpuUsage: 0,
    memoryUsage: 0,
    gpuUsage: 0
  })
  
  const [softwareInfo, setSoftwareInfo] = useState<SoftwareInfo>({
    totalSoftware: 0,
    topSoftware: []
  })
  
  const [userDistribution, setUserDistribution] = useState<UserDistribution>({
    registeredUsers: 0,
    researchTeams: 0,
    departments: [],
    totalJobs: 0,
    userRankings: [],
    activeUsers: 0,
    onlineUsers: 0
  })
  
  const [operationalStats, setOperationalStats] = useState<OperationalStats>({
    submittedJobs: 0,
    cpuRunTime: `0${t('units.coreHours')}`,
    gpuRunTime: `0${t('units.cardHours')}`,
    avgComputeTime: `0${t('units.hours')}`,
    avgQueueTime: `0${t('units.hours')}`,
    runningJobs: 0,
    queuedJobs: 0,
    completedJobs: 0,
    failedJobs: 0,
    cancelledJobs: 0
  })

  const [systemInfo, setSystemInfo] = useState<SystemInfo>({
    hostname: '--',
    osVersion: '--',
    kernelVersion: '--',
    uptime: '--',
    loadAverage: '--'
  })

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([])
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [trendSummary, setTrendSummary] = useState<TrendSummary | null>(null)
  const [weekSummary, setWeekSummary] = useState<TrendSummary | null>(null)
  const [failureData, setFailureData] = useState<FailureData[]>([])

  // 获取硬件资源和系统信息
  const getSystemData = async () => {
    try {
      // 通过API获取真实的系统数据
      const response = await authFetch('/api/system/info')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          const { hardwareResources: hw, systemInfo: sys } = result.data
          
          if (hw) {
            setHardwareResources(hw)
          }
          
          if (sys) {
            setSystemInfo(sys)
          }
          
          console.log(t('consoleLog.systemDataReceived'), { hardwareResources: hw, systemInfo: sys })
        }
      } else {
        console.warn(t('consoleLog.systemInfoFetchFailed'))
        // 如果API失败，使用默认值
        setHardwareResources({
          computeNodes: 0, // 移除硬编码值，与dashboard页面保持一致
          cpuCores: 0,
          totalMemory: '0GB',
          gpuCards: 0,
          sharedStorage: '0GB',
          peakComputePower: '0 TFLOPS'
        })
        
        setSystemInfo({
          hostname: 'HPC-Cluster',
          osVersion: 'Linux',
          kernelVersion: '5.x',
          uptime: t('system.running'),
          loadAverage: '0.00 0.00 0.00'
        })
      }
    } catch (error) {
      console.error(t('consoleLog.systemDataFetchFailed'), error)
      // 出错时使用默认值
      setHardwareResources({
        computeNodes: 0, // 移除硬编码值，与dashboard页面保持一致
        cpuCores: 0,
        totalMemory: '0GB',
        gpuCards: 0,
        sharedStorage: '0GB',
        peakComputePower: '0 TFLOPS'
      })
      
      setSystemInfo({
        hostname: 'HPC-Cluster',
        osVersion: 'Linux',
        kernelVersion: '5.x',
        uptime: t('system.running'),
        loadAverage: '0.00 0.00 0.00'
      })
    }
  }

  // 数据获取函数
  const fetchData = async (forceRefresh = false) => {
    if (!authLoaded || !user?.username) {
      return
    }
    
    setIsRefreshing(true)
    setDataError(null)
    
    try {
      // 并行获取所有必要数据
      const results = await Promise.allSettled([
        authFetch(`/api/jobs/stats?cache=true&days=0${forceRefresh ? '&refresh=true' : ''}`),
        authFetch('/api/jobs/partitions?cache=true'),
        authFetch(`/api/jobs/trend?range=all&cache=true${forceRefresh ? '&refresh=true' : ''}`), // 获取全部历史数据用于第一个成功率
        authFetch(`/api/jobs/trend?range=week&cache=true${forceRefresh ? '&refresh=true' : ''}`), // 获取最近7天数据用于第二个成功率
        authFetch('/api/dashboard/user-stats?cache=true'),
        authFetch('/api/dashboard/software-stats?cache=true'),
        authFetch('/api/system/info')
      ])

      // 1. 处理作业统计数据（核心数据）
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        try {
          const statsResult = await results[0].value.json()
          console.log('作业统计API返回数据:', statsResult)
          if (statsResult.success && statsResult.data) {
            const newStats = {
              runningJobs: statsResult.data.runningJobs || 0,
              queuedJobs: statsResult.data.queuedJobs || 0,
              submittedJobs: statsResult.data.submittedJobs || 0,
              cpuRunTime: statsResult.data.cpuRunTime || '0核时',
              gpuRunTime: statsResult.data.gpuRunTime || '0卡时',
              avgComputeTime: statsResult.data.avgComputeTime || '0小时',
              avgQueueTime: statsResult.data.avgQueueTime || '0小时',
              completedJobs: statsResult.data.completedJobs || 0,
              failedJobs: statsResult.data.failedJobs || 0,
              cancelledJobs: statsResult.data.cancelledJobs || 0
            }
            console.log('设置作业统计数据:', newStats)
            setOperationalStats(newStats)
          }
        } catch (error) {
          console.error('解析作业统计数据失败:', error)
        }
      }

      // 2. 处理分区数据（资源使用率）
      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        try {
          const partitionsResult = await results[1].value.json()
          if (partitionsResult.success && partitionsResult.partitions) {
            const partitions = partitionsResult.partitions
            
            // 计算{t('resourceUsage.title')}
            let totalNodes = 0
            let systemCpuUsage = 0
            let systemMemoryUsage = 0
            let systemGpuUsage = 0
            let systemStorageUsage = 0
            let totalWeight = 0
            
            partitions.forEach((p: any) => {
              const weight = p.nodeCount || 0
              totalNodes += weight
              totalWeight += weight
              systemCpuUsage += (p.cpuUsage || 0) * weight
              systemMemoryUsage += (p.memoryUsage || 0) * weight
              systemGpuUsage += (p.gpuUsage || 0) * weight
              systemStorageUsage += (p.storageUsage || 0) * weight
            })
            
            if (totalWeight > 0) {
              systemCpuUsage = Math.round(systemCpuUsage / totalWeight)
              systemMemoryUsage = Math.round(systemMemoryUsage / totalWeight)
              systemGpuUsage = Math.round(systemGpuUsage / totalWeight)
              systemStorageUsage = Math.round(systemStorageUsage / totalWeight)
            }

            // 计算已使用节点数（有作业运行的节点）
            const usedNodes = partitions.reduce((sum: number, p: any) => {
              // 如果节点有CPU使用率，说明有作业运行
              return sum + (p.cpuUsage > 0 ? 1 : 0)
            }, 0)

            setResourceUsage(prev => ({
              ...prev,
              cpuUsage: systemCpuUsage,
              memoryUsage: systemMemoryUsage,
              gpuUsage: systemGpuUsage,
              storageUsage: systemStorageUsage,
              computeNodesUsage: totalNodes > 0 ? Math.round((usedNodes / totalNodes) * 100) : 0
            }))
          }
        } catch (error) {
          console.error('解析分区数据失败:', error)
        }
      }

      // 3. 处理全部历史趋势数据（用于第一个成功率）
      if (results[2].status === 'fulfilled' && results[2].value.ok) {
        try {
          const trendResult = await results[2].value.json()
          console.log('全部历史趋势数据API返回:', trendResult)
          if (trendResult.success && trendResult.data) {
            // 保存summary数据用于第一个成功率（累计成功率）
            if (trendResult.data.summary) {
              setTrendSummary(trendResult.data.summary)
              console.log('设置全部历史趋势汇总数据:', trendResult.data.summary)
            } else {
              console.warn('全部历史趋势数据中没有summary字段:', trendResult.data)
              setTrendSummary(null)
            }
          } else {
            console.warn('全部历史趋势数据格式不正确:', trendResult)
            setTrendSummary(null)
          }
        } catch (error) {
          console.error('解析全部历史趋势数据失败:', error)
          setTrendSummary(null)
        }
      } else {
        console.warn('全部历史趋势数据API调用失败:', results[2])
        setTrendSummary(null)
      }

      // 4. 处理最近7天趋势数据（用于第二个成功率）
      if (results[3].status === 'fulfilled' && results[3].value.ok) {
        try {
          const trendResult = await results[3].value.json()
          if (trendResult.success && trendResult.data) {
            // 保存dailyData用于第二个成功率（7天成功率）
            setTrendData(trendResult.data.dailyData || [])
            // 保存7天汇总数据用于7天成功率计算（不覆盖全部历史数据）
            if (trendResult.data.summary) {
              setWeekSummary(trendResult.data.summary)
              console.log('设置7天汇总数据:', trendResult.data.summary)
            }
            console.log('7天趋势数据获取成功:', {
              dailyDataLength: trendResult.data.dailyData?.length || 0,
              dailyData: trendResult.data.dailyData?.slice(0, 3) || [],
              summary: trendResult.data.summary
            })
          } else {
            console.warn('7天趋势数据格式不正确:', trendResult)
            setTrendData([])
          }
        } catch (error) {
          console.error('解析7天趋势数据失败:', error)
          setTrendData([])
        }
      } else {
        console.warn('7天趋势数据API调用失败:', results[3])
        setTrendData([])
      }

      // 5. 处理用户统计数据
      if (results[4].status === 'fulfilled' && results[4].value.ok) {
        try {
          const userStatsResult = await results[4].value.json()
          if (userStatsResult.success && userStatsResult.data) {
            setUserDistribution(prev => ({ ...prev, ...userStatsResult.data }))
          }
        } catch (error) {
          console.error('解析用户统计数据失败:', error)
        }
      }

      // 6. 处理软件统计数据
      if (results[5].status === 'fulfilled' && results[5].value.ok) {
        try {
          const softwareStatsResult = await results[5].value.json()
          if (softwareStatsResult.success && softwareStatsResult.data) {
            setSoftwareInfo(prev => ({
              ...prev,
              totalSoftware: softwareStatsResult.data.totalSoftware || 0,
              topSoftware: softwareStatsResult.data.topSoftware || []
            }))
          }
        } catch (error) {
          console.error('解析软件统计数据失败:', error)
        }
      }

      // 7. 处理系统信息数据
      if (results[6].status === 'fulfilled' && results[6].value.ok) {
        try {
          const systemResult = await results[6].value.json()
          if (systemResult.success && systemResult.data) {
            const { hardwareResources: hw, systemInfo: sys } = systemResult.data
            
            if (hw) {
              setHardwareResources(hw)
            }
            
            if (sys) {
              setSystemInfo(sys)
            }
            
            console.log('获取到系统数据:', { hardwareResources: hw, systemInfo: sys })
          }
        } catch (error) {
          console.error('解析系统信息失败:', error)
        }
      }

      setLastUpdateTime(new Date())
      setDataLoading(false)
      
      // 延迟记录数据获取成功的日志，确保状态更新完成
      setTimeout(() => {
        console.log('数据获取完成（延迟检查）:', {
          operationalStats: operationalStats,
          resourceUsage: resourceUsage,
          trendDataLength: trendData.length,
          trendSummary: trendSummary,
          userCount: userDistribution.registeredUsers,
          softwareCount: softwareInfo.totalSoftware
        })
      }, 100)
    } catch (error) {
      console.error(t('consoleLog.dataFetchFailed'), error)
      setDataError(t('consoleLog.dataFetchFailedNetwork'))
      setDataLoading(false)
    } finally {
      setIsRefreshing(false)
    }
  }



  // 客户端检测
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 初始化数据
  useEffect(() => {
    if (isClient && authLoaded && user?.username) {
      fetchData()
    }
  }, [isClient, authLoaded, user?.username])

  // 轮询更新
  useEffect(() => {
    if (!isClient || !authLoaded || !user?.username) return
    
    const interval = setInterval(() => {
      fetchData()
    }, 120000) // 2分钟更新一次

    return () => clearInterval(interval)
  }, [isClient, authLoaded, user?.username])

  // 全屏切换
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        await document.documentElement.requestFullscreen()
        setIsFullscreen(true)
      } else {
        // 退出全屏
        await document.exitFullscreen()
        setIsFullscreen(false)
      }
    } catch (error) {
      console.error(t('consoleLog.fullscreenToggleFailed'), error)
      // 如果浏览器不支持全屏API，手动切换全屏状态
      setIsFullscreen(!isFullscreen)
    }
  }

  // 全屏状态变化监听
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // 数据一致性检查
  const validateDataConsistency = () => {
    const issues = []
    
    // 检查作业数据一致性
    if (operationalStats.submittedJobs < operationalStats.runningJobs + operationalStats.queuedJobs) {
      issues.push(t('consoleLog.dataValidationSubmittedLessThanRunningQueued'))
    }

    // 检查资源使用率合理性
    if (resourceUsage.cpuUsage > 100 || resourceUsage.memoryUsage > 100 || resourceUsage.gpuUsage > 100) {
      issues.push(t('consoleLog.dataValidationResourceUsageOver100'))
    }

    // 检查硬件资源合理性
    if (hardwareResources.computeNodes < 0 || hardwareResources.cpuCores < 0) {
      issues.push(t('consoleLog.dataValidationHardwareAbnormal'))
    }
    
    return issues
  }

  // 计算系统资源使用情况
  const getSystemResourceStatus = () => {
    const cpuStatus = resourceUsage.cpuUsage < 80 ? 'good' : resourceUsage.cpuUsage < 95 ? 'warning' : 'critical'
    const memoryStatus = resourceUsage.memoryUsage < 80 ? 'good' : resourceUsage.memoryUsage < 95 ? 'warning' : 'critical'
    const gpuStatus = resourceUsage.gpuUsage < 80 ? 'good' : resourceUsage.gpuUsage < 95 ? 'warning' : 'critical'
    const storageStatus = resourceUsage.storageUsage < 80 ? 'good' : resourceUsage.storageUsage < 95 ? 'warning' : 'critical'
    
    if (cpuStatus === 'critical' || memoryStatus === 'critical' || gpuStatus === 'critical' || storageStatus === 'critical') return 'critical'
    if (cpuStatus === 'warning' || memoryStatus === 'warning' || gpuStatus === 'warning' || storageStatus === 'warning') return 'warning'
    return 'good'
  }

  const systemResourceStatus = getSystemResourceStatus()
  const statusColors = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400'
  }

  if (!authLoaded || dataLoading) {
  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <LoadingSpinner size="lg" text={!authLoaded ? t('loading.auth') : t('loading.data')} />
          <p className="text-blue-100 text-sm mt-4">
            {!authLoaded ? t('loading.authMessage') : t('loading.dataMessage')}
          </p>
        </div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 text-lg mb-4 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 mr-2" />
            {dataError}
          </div>
          <button
            onClick={() => fetchData(true)}
            className="px-4 py-2 bg-blue-600/95 hover:bg-blue-700 rounded text-white font-medium shadow-lg transition-colors"
          >
            {t('loading.retryData')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      {/* Client detection status */}
        {!isClient && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            <div className="text-center text-white">
              <LoadingSpinner size="md" text={t('loading.initializing')} />
            </div>
          </div>
        )}

        {/* Header area */}
        <div className="text-center mb-6 pt-20">
        {/* Main title and system resource status */}
          <div className="flex items-center justify-center space-x-4 mb-2">
            <h1 className="text-3xl font-bold text-white drop-shadow-lg">{t('title')}</h1>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[systemResourceStatus]} bg-gray-800/90 backdrop-blur-sm border border-gray-600/50`}>
            {t(`status.${systemResourceStatus}`)}
            </div>
          </div>

          {/* System information and update time */}
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-300 drop-shadow-sm">
            <span>{t('system.hostname')}: {systemInfo.hostname}</span>
            <span className="text-gray-500">•</span>
            <span>{t('system.uptime')}: {systemInfo.uptime}</span>
            <span className="text-gray-500">•</span>
            <span>{t('system.loadAverage')}: {systemInfo.loadAverage}</span>
            <span className="text-gray-500">•</span>
          <span>{t('system.updateTime')}: {lastUpdateTime ? lastUpdateTime.toLocaleString('zh-CN', {hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : '--:--'}</span>
          </div>

        {/* Real-time status indicators */}
        <div className="flex items-center justify-center space-x-6 mt-3">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${operationalStats.runningJobs > 0 ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-300">{t('status.running')}: {operationalStats.runningJobs}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${operationalStats.queuedJobs > 0 ? 'bg-yellow-400 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className="text-sm text-gray-300">{t('status.queued')}: {operationalStats.queuedJobs}</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${resourceUsage.cpuUsage > 80 ? 'bg-red-400 animate-pulse' : resourceUsage.cpuUsage > 60 ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
            <span className="text-sm text-gray-300">CPU: {resourceUsage.cpuUsage}%</span>
          </div>
        </div>

        {/* Data status check - development environment only */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-center text-xs text-gray-500 mt-2">
            {t('consoleLog.dataStatusAuth')}={authLoaded ? t('consoleLog.dataStatusCompleted') : t('consoleLog.dataStatusLoading')}, {t('consoleLog.dataStatusUser')}={user?.username || t('consoleLog.dataStatusNotLoggedIn')}, {t('consoleLog.dataStatusClient')}={isClient ? t('consoleLog.dataStatusYes') : t('consoleLog.dataStatusNo')}, {t('consoleLog.dataStatusLoading')}={dataLoading ? t('consoleLog.dataStatusLoading2') : t('consoleLog.dataStatusCompleted')}, {t('consoleLog.dataStatusError')}={dataError || t('consoleLog.dataStatusNone')}
            {(() => {
              const issues = validateDataConsistency()
              return issues.length > 0 ? ` | ${t('consoleLog.dataAbnormalPrefix')} ${issues.join(', ')}` : ` | ${t('consoleLog.dataNormal')}`
            })()}
          </div>
        )}
        

        </div>

        {/* 控制按钮 */}
          <div className="absolute top-4 right-4 flex items-center space-x-2 z-20">
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-3 py-1 bg-blue-600/95 hover:bg-blue-700 disabled:bg-gray-600/95 rounded text-sm transition-colors backdrop-blur-sm text-white font-medium shadow-lg"
              title={t('buttons.forceRefresh')}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? t('buttons.refreshing') : t('buttons.refresh')}</span>
            </button>
        <button
          onClick={() => {
            // 强制清除作业统计标记，重新获取数据
            setOperationalStats(prev => ({ ...prev, _hasJobsStats: false }))
            fetchData(true)
          }}
          className="flex items-center space-x-1 px-3 py-1 bg-orange-600/95 hover:bg-orange-700 rounded text-sm transition-colors backdrop-blur-sm text-white font-medium shadow-lg"
          title={t('buttons.forceJobRefresh')}
        >
          <RefreshCw className="w-4 h-4" />
          <span>{t('buttons.jobData')}</span>
        </button>


        <button
          onClick={toggleFullscreen}
          className="flex items-center space-x-1 px-3 py-1 bg-green-600/95 hover:bg-green-700 rounded text-sm transition-colors backdrop-blur-sm text-white font-medium shadow-lg"
          title={t('buttons.fullscreenTitle')}
        >
          <Maximize2 className="w-4 h-4" />
          <span>{t('buttons.fullscreen')}</span>
        </button>
                  </div>



      {/* 主要内容区域 */}
      {isFullscreen ? (
        // 全屏时的优化布局 - 展示所有图表
        <div className="flex-1 p-4 overflow-hidden">

          
          {/* 硬件资源概览 - 紧凑的6列布局 */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            <Card className="bg-teal-500/20 backdrop-blur-xl border-teal-400/30 shadow-xl">
              <CardContent className="p-2 text-center">
                <Server className="w-5 h-5 mx-auto mb-1 text-teal-300" />
                <div className="text-lg font-bold text-teal-200 mb-1">{hardwareResources.computeNodes || 1}</div>
                <div className="text-xs text-teal-100">{t('hardware.computeNodes')}</div>
                <div className="text-xs text-teal-300">{resourceUsage.computeNodesUsage}%</div>
              </CardContent>
            </Card>
            
            <Card className="bg-blue-500/20 backdrop-blur-xl border-blue-400/30 shadow-xl">
              <CardContent className="p-2 text-center">
                <Cpu className="w-5 h-5 mx-auto mb-1 text-blue-300" />
                <div className="text-lg font-bold text-blue-200 mb-1">{hardwareResources.cpuCores}</div>
                <div className="text-xs text-blue-100">{t('hardware.cpuCores')}</div>
                <div className="text-xs text-blue-300">{resourceUsage.cpuUsage}%</div>
              </CardContent>
            </Card>
            
            <Card className="bg-emerald-500/20 backdrop-blur-xl border-emerald-400/30 shadow-xl">
              <CardContent className="p-2 text-center">
                <MemoryStick className="w-5 h-5 mx-auto mb-1 text-emerald-300" />
                <div className="text-lg font-bold text-emerald-200 mb-1">{hardwareResources.totalMemory}</div>
                <div className="text-xs text-emerald-100">{t('hardware.memory')}</div>
                <div className="text-xs text-emerald-300">{resourceUsage.memoryUsage}%</div>
              </CardContent>
            </Card>
            
            <Card className="bg-violet-500/20 backdrop-blur-xl border-violet-400/30 shadow-xl">
              <CardContent className="p-2 text-center">
                <GpuIcon className="w-5 h-5 mx-auto mb-1 text-violet-300" />
                <div className="text-lg font-bold text-violet-200 mb-1">{hardwareResources.gpuCards}</div>
                <div className="text-xs text-violet-100">{t('hardware.gpuCards')}</div>
                <div className="text-xs text-violet-300">{resourceUsage.gpuUsage}%</div>
              </CardContent>
            </Card>
            
            <Card className="bg-amber-500/20 backdrop-blur-xl border-amber-400/30 shadow-xl">
              <CardContent className="p-2 text-center">
                <HardDrive className="w-5 h-5 mx-auto mb-1 text-amber-300" />
                <div className="text-lg font-bold text-amber-200 mb-1">{hardwareResources.sharedStorage}</div>
                <div className="text-xs text-amber-100">{t('hardware.storage')}</div>
                <div className="text-xs text-amber-300">{resourceUsage.storageUsage}%</div>
              </CardContent>
            </Card>
            
            <Card className="bg-indigo-500/20 backdrop-blur-xl border-indigo-400/30 shadow-xl">
              <CardContent className="p-2 text-center">
                <Zap className="w-5 h-5 mx-auto mb-1 text-indigo-300" />
                <div className="text-lg font-bold text-indigo-200 mb-1">{hardwareResources.peakComputePower}</div>
                <div className="text-xs text-indigo-100">{t('hardware.peakPower')}</div>
                <div className="text-xs text-indigo-300">{t(`status.${systemResourceStatus}`)}</div>
              </CardContent>
            </Card>
          </div>
          
                              {/* 主要图表和信息区域 - 3列布局，与未全屏时保持一致 */}
          <div className="grid grid-cols-3 gap-4">
            {/* 第一列：{t('resourceUsage.title')} */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-sky-400" />
                  {t('resourceUsage.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 text-sm">{t('labels.cpuUsage')}</span>
                    <span className="text-sky-300 font-bold text-lg">{resourceUsage.cpuUsage}%</span>
                  </div>
                  <Progress value={resourceUsage.cpuUsage} className="h-3 bg-white/10" />

                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 text-sm">{t('labels.memoryUsage')}</span>
                    <span className="text-emerald-300 font-bold text-lg">{resourceUsage.memoryUsage}%</span>
                  </div>
                  <Progress value={resourceUsage.memoryUsage} className="h-3 bg-white/10" />

                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 text-sm">{t('labels.gpuUsage')}</span>
                    <span className="text-violet-300 font-bold text-lg">{resourceUsage.gpuUsage}%</span>
                  </div>
                  <Progress value={resourceUsage.gpuUsage} className="h-3 bg-white/10" />

                  <div className="flex items-center justify-between">
                    <span className="text-slate-200 text-sm">{t('labels.storageUsage')}</span>
                    <span className="text-amber-300 font-bold text-lg">{resourceUsage.storageUsage}%</span>
                  </div>
                  <Progress value={resourceUsage.storageUsage} className="h-3 bg-white/10" />
                    </div>
              </CardContent>
            </Card>
            
            {/* 第二列：{t('jobStats.title')} */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-400" />
                  {t('jobStats.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-4 bg-sky-500/20 backdrop-blur-sm rounded-xl border border-sky-400/30 shadow-lg">
                    <div className="text-3xl font-bold text-sky-200 mb-1">{operationalStats.runningJobs}</div>
                    <div className="text-sky-100 text-sm">{t('jobStats.runningJobs')}</div>
                    </div>
                  <div className="text-center p-4 bg-amber-500/20 backdrop-blur-sm rounded-xl border border-amber-400/30 shadow-lg">
                    <div className="text-3xl font-bold text-amber-200 mb-1">{operationalStats.queuedJobs}</div>
                    <div className="text-amber-100 text-sm">{t('jobStats.queuedJobs')}</div>
                  </div>
                </div>
                <div className="text-center p-4 bg-emerald-500/20 backdrop-blur-sm rounded-xl border border-emerald-400/30 shadow-lg">
                  <div className="text-3xl font-bold text-emerald-200 mb-1">{operationalStats.submittedJobs}</div>
                  <div className="text-emerald-100 text-sm">{t('jobStats.submittedJobs')}</div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="text-center p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                    <div className="text-lg font-bold text-white">{operationalStats.avgComputeTime}</div>
                    <div className="text-slate-200">{t('jobStats.avgComputeTime')}</div>
                  </div>
                  <div className="text-center p-2 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
                    <div className="text-lg font-bold text-white">
                      {trendSummary?.successRate !== undefined 
                        ? `${trendSummary.successRate}%` 
                        : '--'}
                    </div>
                    <div className="text-slate-200">{t('jobStats.cumulativeSuccessRate')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 第三列：{t('userDistribution.title')} */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-400" />
                  {t('userDistribution.title')}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* 用户统计指标 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-900/95 to-blue-800/95 border border-blue-600/80 rounded-lg">
                    <div className="text-2xl font-bold text-blue-200">{userDistribution.registeredUsers}</div>
                    <div className="text-xs text-blue-300 font-medium">{t('userDistribution.registeredUsers')}</div>
                    </div>
                  <div className="text-center p-3 bg-gradient-to-br from-cyan-900/95 to-cyan-800/95 border border-cyan-600/80 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-200">{userDistribution.onlineUsers || 0}</div>
                    <div className="text-xs text-cyan-300 font-medium">{t('userDistribution.onlineUsers')}</div>
                  </div>
                </div>
                
                {/* {t('userDistribution.jobSubmitRanking')} */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                  <div className="text-sm text-white mb-2 font-medium">{t('userDistribution.jobSubmitRanking')}</div>
                  {(() => {
                    // 调试信息
                    console.log('用户排行数据:', userDistribution.userRankings)
                    
                    if (userDistribution.userRankings && userDistribution.userRankings.length > 0) {
                      // 处理数据格式，确保count是数字类型，并按提交次数从高到低排序
                      const rawData = userDistribution.userRankings.map(user => ({
                        name: user.name || t('userDistribution.unknownUser'),
                        count: typeof user.count === 'string' ? parseInt(user.count) || 0 : user.count,
                        dept: user.dept || ''
                      }))
                      console.log('原始数据:', rawData)
                      
                      const sortedData = rawData.sort((a, b) => b.count - a.count) // 按提交次数从高到低排序
                      console.log('排序后数据:', sortedData)
                      
                      // 为横向布局调整数据，交换name和count的位置
                      const chartData = sortedData.slice(0, 5).map(item => ({
                        name: item.name,
                        count: item.count,
                        dept: item.dept
                      }))
                      console.log('最终图表数据:', chartData)
                      
                      // 动态计算柱状图参数
                      const maxCount = Math.max(...chartData.map(item => item.count))
                      
                      // 设置最大作业数占用的柱状图宽度
                      const maxBarWidth = 350 // 最大作业数占用250px宽度
                      
                      return (
                        <div className="h-32">
                          <ResponsiveContainer width="100%" height="100%">
                            <svg width="100%" height="100%">
                              {/* 自定义横向柱状图 */}
                              {chartData.map((item, index) => {
                                const barHeight = 20
                                const barSpacing = 25
                                const startY = index * barSpacing + 10
                                
                                // 根据作业数量比例计算柱状图长度
                                const barLength = maxCount > 0 ? (item.count / maxCount) * maxBarWidth : 0
                                
                                return (
                                  <g key={item.name}>
                                    {/* 用户名称 */}
                                    <text 
                                      x="10" 
                                      y={startY + barHeight/2 + 4} 
                                      fill="#e2e8f0" 
                                      fontSize="10"
                                      textAnchor="start"
                                    >
                                      {item.name}
                                    </text>
                                    
                                    {/* 柱状图 */}
                                    <rect
                                      x="80"
                                      y={startY}
                                      width={barLength}
                                      height={barHeight}
                                      fill="#0ea5e9"
                                      rx="4"
                                      ry="4"
                                    />
                                    
                                    {/* 数值标签 */}
                                    <text 
                                      x={85 + barLength} 
                                      y={startY + barHeight/2 + 4}
                                      fill="#e2e8f0"
                                      fontSize="10"
                                      textAnchor="start"
                                    >
                                      {item.count}{t('common.times')}
                                    </text>
                                  </g>
                                )
                              })}
                            </svg>
                          </ResponsiveContainer>
                        </div>
                      )
                    } else {
                      return (
                        <div className="h-32 flex items-center justify-center text-gray-400 text-xs">
                          {t('common.noRankingData')}
                        </div>
                      )
                    }
                  })()}
                </div>
              </CardContent>
            </Card>

            {/* 第四列：作业趋势分析 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-violet-400" />
                  {t('labels.last7DaysJobTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendData.length > 0 ? (
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData} margin={{ top: 10, right: 20, left: 20, bottom: 30 }}>
                        <XAxis dataKey="date" stroke="#e2e8f0" fontSize={12} />
                        <YAxis stroke="#e2e8f0" fontSize={12} />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.1)', 
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '12px',
                            color: '#ffffff',
                            fontSize: '12px',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                          }}
                        />
                        <Bar dataKey="submitted" fill="#0ea5e9" radius={[6, 6, 0, 0]} name={t('labels.submittedJobs')} />
                        <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} name={t('labels.completedJobs2')} />
                        <Bar dataKey="failed" fill="#ef4444" radius={[6, 6, 0, 0]} name={t('labels.failedJobs')} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-40 flex items-center justify-center">
                    <div className="text-center text-slate-300">
                      <TrendingUp className="w-16 h-16 mx-auto mb-3 opacity-50" />
                      <div className="text-lg">{t('common.noData')}</div>
                </div>
                  </div>
                )}
                <div className="text-center text-xs text-slate-300 bg-white/10 backdrop-blur-sm rounded-lg p-2 mt-3 border border-white/20">
                  {t('common.showLast7Days')}
                </div>
              </CardContent>
            </Card>
            
            {/* 第五列：作业状态分布 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-amber-400" />
                  {t('labels.jobStatusDistribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  {(() => {
                    // 检查是否有有效数据
                    const hasValidData = operationalStats.runningJobs > 0 || 
                                       operationalStats.queuedJobs > 0 || 
                                       operationalStats.completedJobs > 0 || 
                                       operationalStats.failedJobs > 0 || 
                                       operationalStats.cancelledJobs > 0
                    
                    if (hasValidData) {
                      return (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t('labels.running'), value: operationalStats.runningJobs, color: '#10b981' },
                          { name: t('labels.queued'), value: operationalStats.queuedJobs, color: '#f59e0b' },
                          { name: t('labels.completed'), value: operationalStats.completedJobs, color: '#10b981' },
                          { name: t('labels.failed'), value: operationalStats.failedJobs, color: '#ef4444' },
                          { name: t('labels.cancelled'), value: operationalStats.cancelledJobs, color: '#8b5cf6' }
                        ].filter(item => item.value > 0)} // 只显示有数据的项目
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        fontSize={11}
                      >
                        {[
                          { name: t('status.running'), value: operationalStats.runningJobs, color: '#10b981' },
                          { name: t('status.queued'), value: operationalStats.queuedJobs, color: '#f59e0b' },
                          { name: t('jobStats.completed'), value: operationalStats.completedJobs, color: '#10b981' },
                          { name: t('jobStats.failed'), value: operationalStats.failedJobs, color: '#ef4444' },
                          { name: t('operations.cancelledJobs'), value: operationalStats.cancelledJobs, color: '#8b5cf6' }
                        ].filter(item => item.value > 0).map((entry, idx) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '12px',
                          color: '#ffffff',
                          backdropFilter: 'blur(20px)',
                          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                      )
                    } else {
                      return (
                        <div className="h-full flex items-center justify-center">
                          <div className="text-center text-slate-300">
                            <PieChartIcon className="w-16 h-16 mx-auto mb-3 opacity-50" />
                            <div className="text-lg">{t('loading.noJobData')}</div>
                            <div className="text-sm text-slate-400">{t('loading.noJobDataMessage')}</div>
                          </div>
                        </div>
                      )
                    }
                  })()}
                </div>
              </CardContent>
            </Card>
            
            {/* 第六列：软件使用情况 */}
            <Card className="bg-white/5 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <DatabaseIcon className="w-5 h-5 text-emerald-400" />
                  {t('softwareUsage.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-3 bg-emerald-500/20 backdrop-blur-sm rounded-xl border border-emerald-400/30 shadow-lg mb-4">
                  <div className="text-2xl font-bold text-emerald-200 mb-1">{softwareInfo.totalSoftware}</div>
                  <div className="text-emerald-100 text-sm">{t('softwareUsage.sharedSoftware')}</div>
                </div>
                {softwareInfo.topSoftware && softwareInfo.topSoftware.length > 0 ? (
                  <div className="space-y-2">
                    <div className="text-sm text-slate-200 mb-2">{t('softwareUsage.top3')}:</div>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <svg width="100%" height="100%">
                          {/* 自定义横向柱状图 */}
                          {softwareInfo.topSoftware.slice(0, 3).map((software, index) => {
                            const maxCount = Math.max(...softwareInfo.topSoftware.slice(0, 3).map(s => s.count))
                            const barHeight = 20
                            const barSpacing = 25
                            const startY = index * barSpacing + 10
                            const barLength = maxCount > 0 ? (software.count / maxCount) * 200 : 0
                            
                            return (
                              <g key={software.name}>
                                {/* 软件名称 */}
                                <text 
                                  x="10" 
                                  y={startY + barHeight/2 + 4} 
                                  fill="#e2e8f0" 
                                  fontSize="10"
                                  textAnchor="start"
                                >
                                  {software.name}
                                </text>
                                
                                {/* 柱状图 */}
                                <rect
                                  x="80"
                                  y={startY}
                                  width={barLength}
                                  height={barHeight}
                                  fill="#10b981"
                                  rx="4"
                                  ry="4"
                                />
                                
                                {/* 数值标签 */}
                                <text 
                                  x={85 + barLength} 
                                  y={startY + barHeight/2 + 4}
                                  fill="#e2e8f0"
                                  fontSize="10"
                                  textAnchor="start"
                                >
                                  {software.count}{t('common.times')}
                                </text>
                              </g>
                            )
                          })}
                        </svg>
                      </ResponsiveContainer>
                        </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-300 py-4">
                    <DatabaseIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">{t('common.noSoftwareData')}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        // 非全屏时的完整内容
        <div className="container mx-auto p-4">
        {/* 硬件资源概览 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    {/* {t('hardware.computeNodes')} - 移到最左边 */}
          <Card className="bg-teal-900/50 border-teal-600">
            <CardContent className="p-4 text-center">
              <Server className="w-8 h-8 mx-auto mb-2 text-teal-300" />
              <div className="text-2xl font-bold text-teal-200">
                {hardwareResources.computeNodes || 1}
              </div>
              <div className="text-sm text-teal-200">{t('hardware.computeNodes')}</div>
              
              {/* Node usage information */}
                <div className="text-xs text-teal-400 mt-1">
                   {(() => {
                       const totalNodes = hardwareResources.computeNodes || 1
                       const usedNodes = Math.round(totalNodes * (resourceUsage.computeNodesUsage / 100))
                  if (resourceUsage.computeNodesUsage > 0) {
                    return `${t('labels.used')}: ${usedNodes}/${totalNodes} | ${t('common.usageRate')}: ${resourceUsage.computeNodesUsage}%`
                  } else {
                    return `${t('labels.used')}: 0/${totalNodes} | ${t('common.usageRate')}: 0%`
                     }
                   })()}
                  </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-900/50 border-blue-600">
            <CardContent className="p-4 text-center">
              <Cpu className="w-8 h-8 mx-auto mb-2 text-blue-300" />
              <div className="text-2xl font-bold text-blue-200">{hardwareResources.cpuCores}</div>
              <div className="text-sm text-blue-200">{t('hardware.cpuCores')}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-900/50 border-green-600">
            <CardContent className="p-4 text-center">
              <MemoryStick className="w-8 h-8 mx-auto mb-2 text-green-300" />
              <div className="text-2xl font-bold text-green-200">{hardwareResources.totalMemory}</div>
              <div className="text-sm text-green-200">{t('hardware.memory')}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-900/50 border-purple-600">
            <CardContent className="p-4 text-center">
              <GpuIcon className="w-8 h-8 mx-auto mb-2 text-purple-300" />
              <div className="text-2xl font-bold text-purple-200">{hardwareResources.gpuCards}</div>
              <div className="text-sm text-purple-200">{t('hardware.gpuCards')}</div>
            </CardContent>
          </Card>
                  </div>

        {/* 扩展硬件资源信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="bg-teal-900/50 border-teal-600">
            <CardContent className="p-4 text-center">
              <HardDrive className="w-8 h-8 mx-auto mb-2 text-teal-300" />
              <div className="text-2xl font-bold text-teal-200">{hardwareResources.sharedStorage}</div>
              <div className="text-sm text-teal-200">{t('hardware.sharedStorage')}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-indigo-900/50 border-indigo-600">
            <CardContent className="p-4 text-center">
              <Zap className="w-8 h-8 mx-auto mb-2 text-indigo-300" />
              <div className="text-2xl font-bold text-indigo-200">{hardwareResources.peakComputePower}</div>
              <div className="text-sm text-indigo-200">{t('hardware.peakPower')}</div>
            </CardContent>
          </Card>
                    </div>

        {/* System performance metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Average compute time card */}
          <Card className="bg-gray-900/90 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 group">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-blue-600/20 rounded-xl mx-auto flex items-center justify-center group-hover:bg-blue-600/30 transition-colors duration-300">
                  <Clock className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>

              <div className="text-3xl font-bold text-white mb-2 font-mono tracking-tight">
                {operationalStats.avgComputeTime}
                </div>
              <div className="text-sm text-gray-300 font-medium uppercase tracking-wider">{t('jobStats.avgComputeTime')}</div>

              {/* Bottom decoration line */}
              <div className="mt-4 w-16 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto"></div>
              </CardContent>
            </Card>

          {/* Average queue time card */}
          <Card className="bg-gray-900/90 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-emerald-500/10 transition-all duration-300 group">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-emerald-600/20 rounded-xl mx-auto flex items-center justify-center group-hover:bg-emerald-600/30 transition-colors duration-300">
                  <Clock className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>

              <div className="text-3xl font-bold text-white mb-2 font-mono tracking-tight">
                {operationalStats.avgQueueTime}
              </div>
              <div className="text-sm text-gray-300 font-medium uppercase tracking-wider">{t('labels.avgQueueTime')}</div>

              {/* Bottom decoration line */}
              <div className="mt-4 w-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent mx-auto"></div>
            </CardContent>
          </Card>

          {/* Job success rate card */}
          <Card className="bg-gray-900/90 border border-gray-700/50 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300 group">
            <CardContent className="p-6 text-center">
              <div className="mb-4">
                <div className="w-12 h-12 bg-purple-600/20 rounded-xl mx-auto flex items-center justify-center group-hover:bg-purple-600/30 transition-colors duration-300">
                  <TrendingUp className="w-6 h-6 text-purple-400" />
                </div>
              </div>

              <div className="text-3xl font-bold text-white mb-2 font-mono tracking-tight">
                {trendSummary?.successRate !== undefined
                  ? `${trendSummary.successRate}%`
                  : '--'}
              </div>
              <div className="text-sm text-gray-300 font-medium uppercase tracking-wider">{t('labels.jobSuccessRate')}</div>

              {/* Bottom decoration line */}
              <div className="mt-4 w-16 h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent mx-auto"></div>
            </CardContent>
          </Card>
        </div>

        {/* System resource usage */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Activity className="w-5 h-5" />
                {t('resourceUsage.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                  <div>
                <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-4 h-4 text-blue-300" />
                        <span className="text-sm font-medium text-gray-200">{t('labels.cpuUsage')}</span>
                      </div>
                      <span className={`font-bold text-lg ${resourceUsage.cpuUsage > 80 ? 'text-red-300' : resourceUsage.cpuUsage > 60 ? 'text-yellow-300' : 'text-green-300'}`}>
                        {resourceUsage.cpuUsage}%
                      </span>
                    </div>
                    <Progress
                      value={resourceUsage.cpuUsage}
                      className={`h-2 ${resourceUsage.cpuUsage > 80 ? 'bg-red-900' : resourceUsage.cpuUsage > 60 ? 'bg-yellow-900' : 'bg-green-900'}`}
                    />
                  </div>

                  <div>
                <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <MemoryStick className="w-4 h-4 text-purple-300" />
                        <span className="text-sm font-medium text-gray-200">{t('labels.memoryUsage')}</span>
                      </div>
                      <span className={`font-bold text-lg ${resourceUsage.memoryUsage > 80 ? 'text-red-300' : resourceUsage.memoryUsage > 60 ? 'text-yellow-300' : 'text-green-300'}`}>
                        {resourceUsage.memoryUsage}%
                      </span>
                    </div>
                    <Progress
                      value={resourceUsage.memoryUsage}
                      className={`h-2 ${resourceUsage.memoryUsage > 80 ? 'bg-red-900' : resourceUsage.memoryUsage > 60 ? 'bg-yellow-900' : 'bg-green-900'}`}
                    />
                  </div>

                  <div>
                <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                    <GpuIcon className="w-4 h-4 text-orange-300" />
                    <span className="text-sm font-medium text-gray-200">{t('labels.gpuUsage')}</span>
                      </div>
                  <span className={`font-bold text-lg ${resourceUsage.gpuUsage > 80 ? 'text-red-300' : resourceUsage.gpuUsage > 60 ? 'text-yellow-300' : 'text-green-300'}`}>
                    {resourceUsage.gpuUsage}%
                      </span>
                    </div>
                    <Progress
                  value={resourceUsage.gpuUsage}
                  className={`h-2 ${resourceUsage.gpuUsage > 80 ? 'bg-red-900' : resourceUsage.gpuUsage > 60 ? 'bg-yellow-900' : 'bg-green-900'}`}
                    />
                  </div>

                  <div>
                <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-green-300" />
                    <span className="text-sm font-medium text-gray-200">{t('labels.storageUsage')}</span>
                      </div>
                  <span className={`font-bold text-lg ${resourceUsage.storageUsage > 80 ? 'text-red-300' : resourceUsage.storageUsage > 60 ? 'text-yellow-300' : 'text-green-300'}`}>
                    {resourceUsage.storageUsage}%
                      </span>
                    </div>
                    <Progress
                  value={resourceUsage.storageUsage}
                  className={`h-2 ${resourceUsage.storageUsage > 80 ? 'bg-red-900' : resourceUsage.storageUsage > 60 ? 'bg-yellow-900' : 'bg-green-900'}`}
                    />
                  </div>

                  <div className="pt-2 border-t border-gray-700">
                <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Monitor className="w-4 h-4 text-blue-300" />
                        <span className="text-sm font-medium text-gray-200">{t('labels.nodeUsage')}</span>
                      </div>
                  <span className={`font-bold text-lg ${resourceUsage.computeNodesUsage > 80 ? 'text-red-300' : resourceUsage.computeNodesUsage > 60 ? 'text-yellow-300' : 'text-green-300'}`}>
                          {resourceUsage.computeNodesUsage}%
                        </span>
                          </div>
                <Progress
                  value={resourceUsage.computeNodesUsage}
                  className={`h-2 ${resourceUsage.computeNodesUsage > 80 ? 'bg-red-900' : resourceUsage.computeNodesUsage > 60 ? 'bg-yellow-900' : 'bg-green-900'}`}
                />
                </div>
              </CardContent>
            </Card>

          <Card className="bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <BarChart3 className="w-5 h-5" />
                {t('jobStats.title')}
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-900/50 rounded">
                  <div className="text-2xl font-bold text-blue-300">{operationalStats.runningJobs}</div>
                  <div className="text-sm text-blue-200">{t('status.running')}</div>
                  </div>
                <div className="text-center p-3 bg-yellow-900/50 rounded">
                  <div className="text-2xl font-bold text-yellow-300">{operationalStats.queuedJobs}</div>
                  <div className="text-sm text-yellow-200">{t('status.queued')}</div>
                  </div>
                </div>

              <div className="text-center p-3 bg-green-900/50 rounded">
                <div className="text-2xl font-bold text-green-300">{operationalStats.submittedJobs}</div>
                <div className="text-sm text-green-200">{t('jobStats.submittedJobs')}</div>
                </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-purple-900/50 rounded">
                  <div className="text-lg font-bold text-purple-300">{operationalStats.cpuRunTime}</div>
                  <div className="text-sm text-purple-200">{t('labels.cpuRunTime')}</div>
                      </div>
                <div className="text-center p-3 bg-indigo-900/50 rounded">
                  <div className="text-lg font-bold text-indigo-300">{operationalStats.gpuRunTime}</div>
                  <div className="text-sm text-indigo-200">{t('labels.gpuRunTime')}</div>
                  </div>
                </div>

              {/* Job completion statistics */}
              <div className="pt-2 border-t border-gray-700">
                <div className="text-center p-3 bg-emerald-900/50 rounded">
                  <div className="text-lg font-bold text-emerald-300">
                    {(() => {
                      const completed = Math.max(0, operationalStats.submittedJobs - operationalStats.runningJobs - operationalStats.queuedJobs)
                      return completed > 0 ? completed : '0'
                    })()}
                  </div>
                  <div className="text-sm text-emerald-200">{t('labels.completedJobs')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* User statistics and software information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card className="bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Users className="w-5 h-5" />
                {t('userDistribution.title')}
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
                {/* User statistics metrics */}
              <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gradient-to-br from-blue-900/95 to-blue-800/95 border border-blue-600/80 rounded-lg">
                    <div className="text-2xl font-bold text-blue-200">{userDistribution.registeredUsers}</div>
                    <div className="text-xs text-blue-300 font-medium">{t('userDistribution.registeredUsers')}</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-cyan-900/95 to-cyan-800/95 border border-cyan-600/80 rounded-lg">
                  <div className="text-2xl font-bold text-cyan-200">{userDistribution.onlineUsers || 0}</div>
                    <div className="text-xs text-cyan-300 font-medium">{t('userDistribution.onlineUsers')}</div>
                  </div>
                </div>

                {/* Job submission ranking */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-200">{t('userDistribution.jobSubmitRanking')} TOP8</h4>
                    <div className="text-xs text-gray-400">
                      {t('common.total')}: {userDistribution.userRankings?.reduce((sum, user) => sum + (typeof user.count === 'string' ? parseInt(user.count) || 0 : user.count), 0) || 0} {t('labels.jobsUnit')}
                    </div>
                  </div>
                  <div className="h-40 sm:h-48">
                    {userDistribution.userRankings && userDistribution.userRankings.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={userDistribution.userRankings.slice(0, 8)}
                          margin={{ top: 10, right: 20, left: 20, bottom: 50 }}
                        >
                          <XAxis
                            dataKey="name"
                            stroke="#6b7280"
                            fontSize={11}
                            tick={{ fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            angle={-30}
                            textAnchor="end"
                            height={50}
                            interval={0}
                          />
                          <YAxis
                            stroke="#6b7280"
                            fontSize={11}
                            tick={{ fill: '#9ca3af' }}
                            axisLine={false}
                            tickLine={false}
                            domain={[0, 'dataMax + 10']}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1f2937',
                              border: '1px solid #374151',
                              borderRadius: '8px',
                              color: '#f9fafb',
                              fontSize: '12px'
                            }}
                          formatter={(value, name) => [value, t('labels.jobsUnit')]}
                          labelFormatter={(label) => `${t('chart.userLabel')}: ${label}`}
                            cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                          />
                          <Bar
                            dataKey="count"
                            fill="url(#orangeGradient)"
                            radius={[6, 6, 0, 0]}
                            maxBarSize={35}
                          >
                            <LabelList
                              dataKey="count"
                              position="top"
                              style={{ fontSize: '10px', fill: '#f59e0b', fontWeight: 'bold' }}
                            formatter={(value: any) => value > 0 ? value : ''}
                            />
                          </Bar>
                          <defs>
                            <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#f59e0b" />
                              <stop offset="100%" stopColor="#d97706" />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                          <LoadingSpinner size="sm" text={t('loading.rankingData')} className="text-gray-400" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

          <Card className="bg-gray-900/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Database className="w-5 h-5" />
                {t('softwareUsage.title')}
                </CardTitle>
              </CardHeader>
            <CardContent className="space-y-4">
                {/* Software overview */}
                <div className="text-center p-3 bg-gradient-to-br from-green-900/95 to-green-800/95 border border-green-600/80 rounded-lg">
                  <div className="text-2xl font-bold text-green-200">{softwareInfo.totalSoftware}</div>
                  <div className="text-xs text-green-300 font-medium">{t('softwareUsage.sharedSoftware')}</div>
                </div>

                {/* Software usage ranking */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/50">
                  <h4 className="text-sm font-semibold text-gray-200 mb-2">{t('softwareUsage.usageRanking')}</h4>
                  <div className="space-y-2">
                  {softwareInfo.topSoftware && softwareInfo.topSoftware.slice(0, 10).map((software, index) => {
                      const maxCount = softwareInfo.topSoftware[0]?.count || 1
                      const percentage = (software.count / maxCount) * 100

                      return (
                        <div key={software.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center min-w-0 flex-1">
                              <span className="text-gray-400 w-3 mr-1 font-medium">{index + 1}</span>
                              <span className="truncate text-gray-100 font-medium">{software.name}</span>
                            </div>
                            <span className="text-green-200 font-bold ml-1">{software.count}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-green-500 to-green-400 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        {/* Trend charts and department distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Job trend analysis */}


          {trendData.length > 0 ? (
            <Card className="bg-gray-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <TrendingUp className="w-5 h-5" />
                    {t('labels.last7DaysJobTrend')}
                  </CardTitle>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => fetchData(true)}
                      className="px-2 py-1 text-xs bg-blue-600/50 hover:bg-blue-600/70 rounded border border-blue-500/50 text-blue-200 transition-colors"
                      title={t('common.refreshData')}
                    >
                      {t('common.refresh')}
                    </button>
        </div>
      </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Trend chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trendData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        fontSize={11}
                        tick={{ fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#9ca3af"
                        fontSize={11}
                        tick={{ fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.9)',
                          border: '1px solid rgba(75, 85, 99, 0.5)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '12px'
                        }}
                        formatter={(value, name) => [value, name]}
                        labelFormatter={(label) => `${t('labels.dateLabel')} ${label}`}
                      />
                      <Bar dataKey="submitted" fill="#3b82f6" name={t('labels.submittedJobs')} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="completed" fill="#10b981" name={t('labels.completedJobs2')} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="failed" fill="#ef4444" name={t('labels.failedJobs')} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Time range description */}
                <div className="text-center text-xs text-gray-400 bg-gray-800/20 rounded p-2">
                  {t('common.showLast7Days')}
                </div>

                {/* Statistics summary */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="text-center p-2 bg-blue-900/30 rounded border border-blue-600/30">
                    <div className="text-lg font-bold text-blue-300">
                      {trendData.reduce((sum, day) => sum + day.submitted, 0)}
                    </div>
                    <div className="text-blue-200">{t('labels.totalSubmitted')}</div>
                  </div>
                  <div className="text-center p-2 bg-green-900/30 rounded border border-green-600/30">
                    <div className="text-lg font-bold text-green-300">
                      {trendData.reduce((sum, day) => sum + day.completed, 0)}
                    </div>
                    <div className="text-green-200">{t('labels.totalCompleted')}</div>
                  </div>
                  <div className="text-center p-2 bg-red-900/30 rounded border border-red-600/30">
                    <div className="text-lg font-bold text-red-300">
                      {trendData.reduce((sum, day) => sum + day.failed, 0)}
                    </div>
                    <div className="text-red-200">{t('labels.totalFailed')}</div>
                  </div>
                  <div className="text-center p-2 bg-yellow-900/30 rounded border border-yellow-600/30">
                    <div className="text-lg font-bold text-yellow-300">
                      {(() => {
                        const completed = trendData.reduce((sum, day) => sum + day.completed, 0)
                        const failed = trendData.reduce((sum, day) => sum + day.failed, 0)
                        const cancelled = trendData.reduce((sum, day) => sum + day.cancelled, 0)
                        
                        // 调试信息
                        console.log('7天成功率计算:', { 
                          completed, 
                          failed, 
                          cancelled, 
                          trendDataLength: trendData.length,
                          trendData: trendData.slice(0, 3) // 显示前3天的数据
                        })
                        
                        // 7天成功率计算
                        let successRate = 0
                        if (weekSummary) {
                          // 使用7天汇总数据的成功率
                          successRate = weekSummary.successRate || 0
                          console.log('使用7天汇总数据的成功率:', successRate)
                        } else {
                          // 如果没有汇总数据，手动计算
                          const totalFinished = completed + failed + cancelled
                          successRate = totalFinished > 0 ? Math.round((completed / totalFinished) * 100) : 0
                          console.log('7天成功率手动计算:', { completed, failed, cancelled, totalFinished, successRate })
                        }
                        return successRate
                      })()}%
                    </div>
                    <div className="text-yellow-200">{t('labels.successRate')}</div>
                  </div>
                </div>


              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <TrendingUp className="w-5 h-5" />
                  {t('labels.last7DaysJobTrend')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">{t('common.noTrendData')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Department distribution */}
          {userDistribution.departments && userDistribution.departments.length > 0 ? (
            <Card className="bg-gray-900/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Users className="w-5 h-5" />
                    {t('labels.departmentDistribution')}
                  </CardTitle>
                  <div className="text-xs text-gray-400">
                    {t('common.total')} {userDistribution.researchTeams} {t('labels.totalDepartments')}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Department statistics summary */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="text-center p-2 bg-blue-900/30 rounded border border-blue-600/30">
                    <div className="text-lg font-bold text-blue-300">
                      {userDistribution.registeredUsers}
                    </div>
                    <div className="text-blue-200">{t('userDistribution.registeredUsers')}</div>
                  </div>
                  <div className="text-center p-2 bg-green-900/30 rounded border border-green-600/30">
                    <div className="text-lg font-bold text-green-300">
                      {userDistribution.activeUsers || 0}
                    </div>
                    <div className="text-green-200">{t('labels.activeUsers')}</div>
                  </div>
                </div>

                {/* Department distribution pie chart */}
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistribution.departments}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={70}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {userDistribution.departments.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][index % 6]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          border: '1px solid rgba(75, 85, 99, 0.5)',
                          borderRadius: '8px',
                          color: '#ffffff !important',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                        formatter={(value, name) => [value, t('labels.usersCount')]}
                        labelFormatter={(label) => `${t('labels.departmentLabel')} ${label}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Department details list */}
                <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-600/30">
                  <h4 className="text-sm font-semibold text-gray-200 mb-2">{t('labels.departmentDetails')}</h4>
                  <div className="space-y-2 max-h-24 overflow-y-auto">
                    {userDistribution.departments.map((dept, index) => (
                        <div key={dept.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center min-w-0 flex-1">
                            <span className="text-gray-400 w-3 mr-1 font-medium">{index + 1}</span>
                            <span className="truncate text-gray-100 font-medium">{dept.name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-blue-200 font-bold">{dept.count}</span>
                          </div>
                        </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-900/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <Users className="w-5 h-5" />
                  {t('labels.departmentDistribution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">{t('common.noDepartmentData')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          </div>


        </div>
      )}
    </div>
  )
}