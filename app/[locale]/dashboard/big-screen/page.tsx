'use client'
import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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
  X
} from 'lucide-react'
import { authFetch } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, LabelList } from 'recharts'
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
}

interface SoftwareInfo {
  totalSoftware: number
  topSoftware: Array<{name: string, count: number}>
}

interface UserDistribution {
  registeredUsers: number
  researchTeams: number
  departments: Array<{name: string, count: number}>
  userRankings?: Array<{name: string, count: number, dept: string}>
  totalJobs?: number
}

interface OperationalStats {
  submittedJobs: number
  cpuRunTime: string
  gpuRunTime: string
  avgComputeTime: string
  avgQueueTime: string
  runningJobs: number
  queuedJobs: number
}

interface SystemInfo {
  hostname: string
  osVersion: string
  kernelVersion: string
  uptime: string
  loadAverage: string
}

interface TrendData {
  date: string
  submitted: number
  completed: number
  failed: number
}

interface FailureData {
  name: string
  value: number
}

interface DepartmentData {
  name: string
  value: number
}

export default function BigScreenDashboard() {
  const { user } = useAuth()
  const t = useT('bigScreen')
  
  // 修复：移除硬编码的初始值，使用空状态
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
    memoryUsage: 0
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
    userRankings: []
  })
  
  const [operationalStats, setOperationalStats] = useState<OperationalStats>({
    submittedJobs: 0,
    cpuRunTime: '0核时',
    gpuRunTime: '0卡时',
    avgComputeTime: '0小时',
    avgQueueTime: '0小时',
    runningJobs: 0,
    queuedJobs: 0
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
  
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([])

  // 修复：改进的数据获取函数
  const fetchData = async (forceRefresh = false) => {
    if (!user?.username) {
      return
    }
    
    setIsRefreshing(true)
    setDataError(null)
    
    try {
      // 并行获取所有数据，添加错误处理
      const results = await Promise.allSettled([
        authFetch(`/api/jobs/stats?cache=true${forceRefresh ? '&refresh=true' : ''}`),
        authFetch('/api/jobs/partitions?cache=true'),
        authFetch(`/api/dashboard/big-screen${forceRefresh ? '?force=true' : ''}`)
      ])

      // 处理作业统计数据
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        try {
          const statsResult = await results[0].value.json()
          if (statsResult.success && statsResult.data) {
            setOperationalStats(prev => ({
              ...prev,
              runningJobs: statsResult.data.runningJobs || 0,
              queuedJobs: statsResult.data.queuedJobs || 0,
              submittedJobs: statsResult.data.submittedJobs || 0,
              cpuRunTime: statsResult.data.cpuRunTime || '0核时',
              gpuRunTime: statsResult.data.gpuRunTime || '0万卡时',
              avgComputeTime: statsResult.data.avgComputeTime || '0小时',
              avgQueueTime: statsResult.data.avgQueueTime || '0小时'
            }))
          } else {
            console.warn('作业统计API返回数据格式不正确:', statsResult)
          }
        } catch (error) {
          console.error('解析作业统计数据失败:', error)
        }
      } else if (results[0].status === 'rejected') {
        console.error('作业统计API调用失败:', results[0].reason)
      }

      // 处理分区数据（用于资源使用率）
      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        try {
          const partitionsResult = await results[1].value.json()
          if (partitionsResult.success && partitionsResult.partitions) {
            const partitions = partitionsResult.partitions
            
            // 计算系统资源使用率
            let totalNodes = 0
            let systemCpuUsage = 0
            let systemMemoryUsage = 0
            let systemGpuUsage = 0
            let totalWeight = 0
            
            partitions.forEach((p: any) => {
              const weight = p.nodeCount || 0
              totalNodes += weight
              totalWeight += weight
              systemCpuUsage += (p.cpuUsage || 0) * weight
              systemMemoryUsage += (p.memoryUsage || 0) * weight
              systemGpuUsage += (p.gpuUsage || 0) * weight
            })
            
            if (totalWeight > 0) {
              systemCpuUsage = Math.round(systemCpuUsage / totalWeight)
              systemMemoryUsage = Math.round(systemMemoryUsage / totalWeight)
              systemGpuUsage = Math.round(systemGpuUsage / totalWeight)
            }

            setResourceUsage(prev => ({
              ...prev,
              cpuUsage: systemCpuUsage,
              memoryUsage: systemMemoryUsage,
              gpuUsage: systemGpuUsage,
              computeNodesUsage: totalNodes > 0 ? Math.round((totalNodes - partitions.reduce((sum: number, p: any) => sum + (p.healthyNodes || 0), 0)) / totalNodes * 100) : 0
            }))
          } else {
            console.warn('分区API返回数据格式不正确:', partitionsResult)
          }
        } catch (error) {
          console.error('解析分区数据失败:', error)
        }
      } else if (results[1].status === 'rejected') {
        console.error('分区API调用失败:', results[1].reason)
      }

      // 处理大屏数据（硬件资源和系统信息）
      if (results[2].status === 'fulfilled' && results[2].value.ok) {
        try {
          const bigScreenResult = await results[2].value.json()
          if (bigScreenResult.success && bigScreenResult.data) {
            const { hardwareResources: hw, systemInfo: sys, resourceUsage: res, nodeResourceUsage: nodeRes, operationalStats: ops } = bigScreenResult.data
            
            // 更新硬件资源
            if (hw) {
              setHardwareResources(hw)
            }
            
            // 更新系统信息
            if (sys) {
              setSystemInfo(sys)
            }
            
            // 更新集群资源使用率（如果分区数据不可用，使用大屏API的数据）
            if (res && results[1].status !== 'fulfilled') {
              setResourceUsage(res)
            }
            
            // 更新节点资源使用率
            if (nodeRes) {
              setNodeResourceUsage(nodeRes)
            }
            
            // 更新运行统计（如果作业统计不可用，使用大屏API的数据）
            if (ops && results[0].status !== 'fulfilled') {
              setOperationalStats(ops)
            }
          } else {
            console.warn('大屏API返回数据格式不正确:', bigScreenResult)
          }
        } catch (error) {
          console.error('解析大屏数据失败:', error)
        }
      } else if (results[2].status === 'rejected') {
        console.error('大屏API调用失败:', results[2].reason)
      }

      // 检查是否有API调用失败
      const failedApis = results.filter(result => result.status === 'rejected').length
      if (failedApis > 0) {
        console.warn(`${failedApis} 个API调用失败，使用缓存或默认数据`)
        if (failedApis === results.length) {
          setDataError('所有数据源都无法访问，请检查网络连接')
        } else {
          setDataError('部分数据获取失败，显示可能不完整')
        }
      } else {
        setDataError(null)
      }

      // 更新最后更新时间
      setLastUpdateTime(new Date())
      setDataLoading(false)

    } catch (error) {
      console.error('获取数据失败:', error)
      setDataError('数据获取失败，请检查网络连接或稍后重试')
      setDataLoading(false)
    } finally {
      setIsRefreshing(false)
    }
  }

  // 修复：改进的静态数据初始化
  const initializeStaticData = async () => {
    if (!user?.username) return

    try {
      // 获取静态数据：软件信息、用户统计、部门分布等
      const results = await Promise.allSettled([
        authFetch('/api/dashboard/software-stats'),
        authFetch('/api/dashboard/user-stats'),
        authFetch('/api/users?stats=department')
      ])

      // 处理软件信息
      if (results[0].status === 'fulfilled' && results[0].value.ok) {
        try {
          const softwareResult = await results[0].value.json()
          if (softwareResult.success && softwareResult.data) {
            setSoftwareInfo(softwareResult.data)
          }
        } catch (error) {
          console.error('解析软件信息失败:', error)
        }
      }

      // 处理用户统计
      if (results[1].status === 'fulfilled' && results[1].value.ok) {
        try {
          const userResult = await results[1].value.json()
          if (userResult.success && userResult.data) {
            setUserDistribution(userResult.data)
          }
        } catch (error) {
          console.error('解析用户统计失败:', error)
        }
      }

      // 处理部门分布数据
      if (results[2].status === 'fulfilled' && results[2].value.ok) {
        try {
          const deptResult = await results[2].value.json()
          if (deptResult.success && deptResult.departmentStats) {
            const departments = Object.entries(deptResult.departmentStats).map(([name, value]) => ({ 
              name, 
              value: Number(value) 
            }))
            setDepartmentData(departments)
          }
        } catch (error) {
          console.error('解析部门分布数据失败:', error)
        }
      }


    } catch (error) {
      console.error('初始化静态数据失败:', error)
    }
  }

  // 全屏切换
  const toggleFullscreen = async () => {
    try {
  
      if (!document.fullscreenElement) {
        // 进入全屏
        await document.documentElement.requestFullscreen()
        
        // 手动检查全屏状态变化（防止事件不触发）
        setTimeout(() => {
          if (document.fullscreenElement && !isFullscreen) {
            setIsFullscreen(true)
            // 手动执行全屏逻辑
            handleFullscreenEnter()
            
            // 额外检查大屏内容是否可见
            setTimeout(() => {
              const content = document.querySelector('.big-screen-content') as HTMLElement
              if (content) {
                // 检查子元素
                const children = content.children
                Array.from(children).forEach((child, index) => {
                  const el = child as HTMLElement
                  if (el.style.display === 'none') {
                    el.style.display = ''
                  }
                  if (el.style.visibility === 'hidden') {
                    el.style.visibility = 'visible'
                  }
                  if (el.style.opacity === '0') {
                    el.style.opacity = '1'
                  }
                })
                
                // 强制显示所有子元素
                Array.from(children).forEach(child => {
                  const el = child as HTMLElement
                  if (el.style.display === 'none') {
                    el.style.display = ''
                  }
                  if (el.style.visibility === 'hidden') {
                    el.style.visibility = 'visible'
                  }
                  if (el.style.opacity === '0') {
                    el.style.opacity = '1'
                  }
                })
                
                // 如果仍然有问题，强制显示
                if (content.style.display === 'none' || content.style.visibility === 'hidden') {
                  content.style.display = 'block'
                  content.style.visibility = 'visible'
                  content.style.opacity = '1'
                }
              }
            }, 50)
          }
        }, 100)
        
      } else {
        // 退出全屏
        await document.exitFullscreen()
        
        // 手动检查退出全屏状态
        setTimeout(() => {
          if (!document.fullscreenElement && isFullscreen) {
            setIsFullscreen(false)
            // 手动执行退出全屏逻辑
            handleFullscreenExit()
          }
        }, 100)
      }
    } catch (error) {
      console.error('全屏切换失败:', error)
      // 如果浏览器不支持全屏API，手动切换全屏状态
      setIsFullscreen(!isFullscreen)
    }
  }


  // 客户端检测
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 初始化数据
  useEffect(() => {
    if (isClient && user?.username) {
      initializeStaticData()
      fetchData()
    }
  }, [user?.username, isClient])

  // 简化的轮询 - 只在需要时更新
  useEffect(() => {
    if (!isClient || !user?.username) return
    
    const interval = setInterval(() => {
      fetchData()
    }, 120000) // 2分钟更新一次，大幅减少API调用

    return () => {
      clearInterval(interval)
    }
  }, [user?.username, isClient])

  // 计算系统健康度（基于集群整体资源使用率）
  const getSystemHealth = () => {
    const cpuHealth = resourceUsage.cpuUsage < 80 ? 'good' : resourceUsage.cpuUsage < 95 ? 'warning' : 'critical'
    const memoryHealth = resourceUsage.memoryUsage < 80 ? 'good' : resourceUsage.memoryUsage < 95 ? 'warning' : 'critical'
    const gpuHealth = resourceUsage.gpuUsage < 80 ? 'good' : resourceUsage.gpuUsage < 95 ? 'warning' : 'critical'
    
    if (cpuHealth === 'critical' || memoryHealth === 'critical' || gpuHealth === 'critical') return 'critical'
    if (cpuHealth === 'warning' || memoryHealth === 'warning' || gpuHealth === 'warning') return 'warning'
    return 'good'
  }

  const systemHealth = getSystemHealth()
  const healthColors = {
    good: 'text-green-400',
    warning: 'text-yellow-400',
    critical: 'text-red-400'
  }
  const healthLabels = {
    good: t('status.systemNormal'),
    warning: t('status.systemBusy'),
    critical: t('status.systemOverload')
  }

  const [isFullscreen, setIsFullscreen] = useState(false)

  // 全屏进入逻辑
  const handleFullscreenEnter = useCallback(() => {
    // 简化全屏逻辑，只设置必要的样式
    document.body.style.overflow = 'hidden'
  }, [])

  // 全屏退出逻辑
  const handleFullscreenExit = useCallback(() => {
    // 简化退出逻辑，只恢复必要的样式
    document.body.style.overflow = ''
  }, [])

  // 监听全屏状态变化和键盘事件
  useEffect(() => {
    if (!isClient) return
    
    const handleFullscreenChange = () => {
      const isFullscreenActive = !!document.fullscreenElement
      setIsFullscreen(isFullscreenActive)
      
      if (isFullscreenActive) {
        handleFullscreenEnter()
      } else {
        handleFullscreenExit()
      }
    }

    // 键盘事件处理
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        toggleFullscreen()
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isFullscreen])

  return (
    <div 
      className="big-screen-content bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white relative transition-all duration-300 p-4"
      style={isClient && isFullscreen ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        padding: '1rem',
        overflow: 'auto'
      } : {}}
    >
      {/* 科技感背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 网格背景 */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>
        
        {/* 动态光效 - 增强科技感 */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-indigo-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-cyan-500/20 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{animationDelay: '6s'}}></div>
        
        {/* 科技线条 - 增强几何元素 */}
        <div className="absolute top-20 left-10 w-32 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-pulse"></div>
        <div className="absolute top-20 left-10 w-px h-32 bg-gradient-to-b from-transparent via-blue-400/50 to-transparent animate-pulse"></div>
        <div className="absolute top-20 right-10 w-32 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-20 right-10 w-px h-32 bg-gradient-to-b from-transparent via-indigo-400/50 to-transparent animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-20 left-10 w-32 h-px bg-gradient-to-r from-transparent via-purple-400/50 to-transparent animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 left-10 w-px h-32 bg-gradient-to-b from-transparent via-purple-400/50 to-transparent animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute bottom-20 right-10 w-32 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" style={{animationDelay: '3s'}}></div>
        <div className="absolute bottom-20 right-10 w-px h-32 bg-gradient-to-b from-transparent via-cyan-400/50 to-transparent animate-pulse" style={{animationDelay: '3s'}}></div>
        
        {/* 额外的科技装饰线条 */}
        <div className="absolute top-1/2 left-0 w-16 h-px bg-gradient-to-r from-transparent via-green-400/30 to-transparent animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute top-1/2 right-0 w-16 h-px bg-gradient-to-l from-transparent via-green-400/30 to-transparent animate-pulse" style={{animationDelay: '4s'}}></div>
        <div className="absolute top-0 left-1/2 w-px h-16 bg-gradient-to-b from-transparent via-yellow-400/30 to-transparent animate-pulse" style={{animationDelay: '5s'}}></div>
        <div className="absolute bottom-0 left-1/2 w-px h-16 bg-gradient-to-t from-transparent via-yellow-400/30 to-transparent animate-pulse" style={{animationDelay: '5s'}}></div>
      </div>

      {/* 内容区域 */}
      <div className="relative z-10 flex flex-col h-screen">

        

        
        {/* 数据加载状态 */}
        {dataLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-blue-200">{t('loading.systemData')}</p>
              <p className="text-blue-100 text-sm mt-2">{t('loading.systemDataMessage')}</p>
            </div>
          </div>
        )}

        {/* 数据错误状态 */}
        {dataError && !dataLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            <div className="text-center">
              <div className="text-red-400 text-lg mb-4 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 mr-2" />
                {dataError}
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => fetchData(true)}
                  className="px-4 py-2 bg-blue-600/95 hover:bg-blue-700 rounded text-white font-medium shadow-lg transition-colors"
                >
                  {t('error.retryButton')}
                </button>
                <button
                  onClick={() => setDataError(null)}
                  className="px-4 py-2 bg-gray-600/95 hover:bg-gray-700 rounded text-white font-medium shadow-lg transition-colors ml-3"
                >
                  {t('error.continueButton')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 客户端检测状态 */}
        {!isClient && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-blue-200">{t('loading.initializing')}</p>
            </div>
          </div>
        )}

        {/* 标题区域 - 非全屏时显示 */}
        {!isFullscreen && (
        <div className="text-center mb-2 pt-1">
          {/* 主标题、状态和关键指标 - 一行显示 */}
          <div className="flex items-center justify-center space-x-4 mb-1">
            <h1 className="text-2xl font-bold text-white drop-shadow-lg">{t('title')}</h1>
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${healthColors[systemHealth]} bg-gray-800/90 backdrop-blur-sm border border-gray-600/50`}>
              {healthLabels[systemHealth]}
            </div>
            <span className="text-gray-400">•</span>
            <span className="text-sm font-medium text-blue-300">CPU: {nodeResourceUsage.cpuUsage}%</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm font-medium text-green-300">{t('resourceUsage.memoryUsage')}: {nodeResourceUsage.memoryUsage}%</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm font-medium text-orange-300">GPU: {nodeResourceUsage.gpuUsage}%</span>
          </div>

          {/* 系统信息和更新时间 - 一行显示 */}
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-300 drop-shadow-sm">
            <span>{t('system.hostname')}: {systemInfo.hostname}</span>
            <span className="text-gray-500">•</span>
            <span>{t('system.uptime')}: {systemInfo.uptime}</span>
            <span className="text-gray-500">•</span>
            <span>{t('system.loadAverage')}: {systemInfo.loadAverage}</span>
            <span className="text-gray-500">•</span>
              <span>{t('system.updateTime')}: {lastUpdateTime ? lastUpdateTime.toLocaleString('zh-CN', {hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'}) : '--:--'}</span>
          </div>
        </div>
        )}

        {/* 控制按钮 - 右上角（非全屏时显示） */}
        {!isFullscreen && (
        <div className="absolute top-2 right-2 flex items-center space-x-2 z-20">
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center space-x-1 px-2 py-1 bg-blue-600/95 hover:bg-blue-700 disabled:bg-gray-600/95 rounded text-xs transition-colors backdrop-blur-sm text-white font-medium shadow-lg"
            title={t('buttons.forceRefresh')}
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? t('buttons.refreshing') : t('buttons.refresh')}</span>
          </button>
          <button
            onClick={toggleFullscreen}
              className="flex items-center space-x-1 px-2 py-1 bg-green-600/95 hover:bg-green-700 rounded text-xs transition-colors backdrop-blur-sm text-white font-medium shadow-lg"
            title={t('buttons.fullscreenTitle')}
          >
            <Maximize2 className="w-3 h-3" />
            <span>{t('buttons.fullscreen')}</span>
          </button>
        </div>
        )}

        {/* 全屏时的退出提示（只在全屏时显示） */}
        {isFullscreen && (
          <div className="absolute top-2 right-2 z-20">
            <div className="px-2 py-1 bg-yellow-600/95 rounded text-xs text-white font-medium shadow-lg backdrop-blur-sm">
              {t('buttons.fullscreenMode')}
            </div>
          </div>
        )}



        {/* 调试信息 - 临时添加，用于诊断全屏问题 */}
        {isFullscreen && (
          <div className="absolute top-16 left-4 z-30 bg-red-900/90 p-3 rounded text-xs text-white">
            <div>调试信息:</div>
            <div>dataLoading: {dataLoading ? 'true' : 'false'}</div>
            <div>dataError: {dataError || 'null'}</div>
            <div>isClient: {isClient ? 'true' : 'false'}</div>
            <div>hardwareResources: {JSON.stringify(hardwareResources).substring(0, 100)}...</div>

          </div>
        )}

        {/* 主要内容区域 - 均衡三列布局，支持响应式 */}
        <div className={`flex-1 grid transition-all duration-300 ${
          isFullscreen 
            ? 'grid-cols-2 xl:grid-cols-3 gap-4 p-4' 
            : 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4'
        }`}>
            {/* 左侧：硬件资源和系统状态 */}
          <div className="space-y-4">
            {/* 硬件资源总览 */}
            <Card className="bg-gray-900/95 border-gray-700/80 backdrop-blur-md shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:border-blue-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center space-x-2 text-blue-200 font-semibold text-sm">
                  <Server className="w-4 h-4" />
                  <span>{t('hardware.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`grid gap-3 ${
                  isFullscreen ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                }`}>
                  <div className="text-center p-3 bg-gradient-to-br from-blue-900/95 to-blue-800/95 border border-blue-600/80 rounded-lg">
                    <Monitor className="w-6 h-6 mx-auto mb-2 text-blue-200" />
                    <div className="text-xl font-bold text-white drop-shadow-sm">{hardwareResources.computeNodes}+</div>
                    <div className="text-xs text-blue-200 font-medium">{t('hardware.computeNodes')}</div>
                  </div>

                  <div className="text-center p-3 bg-gradient-to-br from-green-900/95 to-green-800/95 border border-green-600/80 rounded-lg">
                    <Cpu className="w-6 h-6 mx-auto mb-2 text-green-200" />
                    <div className="text-xl font-bold text-white drop-shadow-sm">{hardwareResources.cpuCores}+</div>
                    <div className="text-xs text-green-200 font-medium">{t('hardware.cpuCores')}</div>
                  </div>

                  <div className="text-center p-3 bg-gradient-to-br from-purple-900/95 to-purple-800/95 border border-purple-600/80 rounded-lg">
                    <MemoryStick className="w-6 h-6 mx-auto mb-2 text-purple-200" />
                    <div className="text-xl font-bold text-white drop-shadow-sm">{hardwareResources.totalMemory}</div>
                    <div className="text-xs text-purple-200 font-medium">{t('hardware.totalMemory')}</div>
                  </div>

                  <div className="text-center p-3 bg-gradient-to-br from-orange-900/95 to-orange-800/95 border border-orange-600/80 rounded-lg">
                    <GpuIcon className="w-6 h-6 mx-auto mb-2 text-orange-200" />
                    <div className="text-xl font-bold text-white drop-shadow-sm">{hardwareResources.gpuCards}+</div>
                    <div className="text-xs text-orange-200 font-medium">{t('hardware.gpuCards')}</div>
                  </div>

                  <div className={`col-span-2 grid gap-3 ${
                    isFullscreen ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                  }`}>
                    <div className="text-center p-3 bg-gradient-to-br from-red-900/95 to-red-800/95 border border-red-600/80 rounded-lg">
                      <HardDrive className="w-6 h-6 mx-auto mb-2 text-red-200" />
                      <div className="text-xl font-bold text-white drop-shadow-sm">{hardwareResources.sharedStorage}</div>
                      <div className="text-xs text-red-200 font-medium">{t('hardware.sharedStorage')}</div>
                    </div>

                    <div className="text-center p-3 bg-gradient-to-br from-indigo-900/95 to-indigo-800/95 border border-indigo-600/80 rounded-lg">
                      <Zap className="w-6 h-6 mx-auto mb-2 text-indigo-200" />
                      <div className="text-xl font-bold text-white drop-shadow-sm">{hardwareResources.peakComputePower}</div>
                      <div className="text-xs text-indigo-200 font-medium">{t('hardware.peakPower')}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 系统健康状态 */}
            <Card className="bg-gray-900/95 border-gray-700/80 backdrop-blur-md shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:border-blue-500/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-cyan-200 font-semibold text-sm">
                  <Activity className="w-4 h-4" />
                  <span>{t('health.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {/* 系统健康度指示器 */}
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${systemHealth === 'good' ? 'bg-green-900/70 border border-green-600/50' :
                    systemHealth === 'warning' ? 'bg-yellow-900/70 border border-yellow-600/50' :
                    'bg-red-900/70 border border-red-600/50'}`}>
                    {systemHealth === 'good' ? <CheckCircle className="w-5 h-5 text-green-300" /> :
                     systemHealth === 'warning' ? <AlertTriangle className="w-5 h-5 text-yellow-300" /> :
                     <AlertTriangle className="w-5 h-5 text-red-300" />}
                    <span className={`font-bold text-lg ${healthColors[systemHealth]}`}>
                      {healthLabels[systemHealth]}
                    </span>
                  </div>
                </div>

                {/* 资源使用率 */}
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-4 h-4 text-blue-300" />
                        <span className="text-sm font-medium text-gray-200">{t('resourceUsage.cpuUsage')}</span>
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
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <MemoryStick className="w-4 h-4 text-purple-300" />
                        <span className="text-sm font-medium text-gray-200">{t('resourceUsage.memoryUsage')}</span>
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
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <GpuIcon className="w-4 h-4 text-orange-300" />
                        <span className="text-sm font-medium text-gray-200">{t('resourceUsage.gpuUsage')}</span>
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

                  <div className="pt-2 border-t border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Monitor className="w-4 h-4 text-blue-300" />
                        <span className="text-sm font-medium text-gray-200">{t('resourceUsage.nodeUsage')}</span>
                      </div>
                      <span className="font-bold text-lg text-blue-300">
                        {resourceUsage.computeNodesUsage}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 中间：集群运行情况和作业状态 */}
          <div className="space-y-4">
            {/* 集群运行情况 */}
            <Card className="bg-gray-900/95 border-gray-700/80 backdrop-blur-md shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:border-blue-500/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-yellow-200 font-semibold text-sm">
                  <TrendingUp className="w-4 h-4" />
                  <span>{t('operations.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                {/* 核心指标 */}
                <div className={`grid gap-3 ${
                  isFullscreen ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                }`}>
                  <div className="text-center p-3 bg-gradient-to-br from-blue-900/95 to-blue-800/95 border border-blue-600/80 rounded-lg">
                    <div className="text-2xl font-bold text-blue-200">{operationalStats.submittedJobs.toLocaleString()}</div>
                    <div className="text-xs text-blue-300 font-medium">{t('operations.submittedJobs')}</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-green-900/95 to-green-800/95 border border-green-600/80 rounded-lg">
                    <div className="text-2xl font-bold text-green-200">{Math.max(0, operationalStats.submittedJobs - operationalStats.runningJobs - operationalStats.queuedJobs).toLocaleString()}</div>
                    <div className="text-xs text-green-300 font-medium">{t('operations.completedJobs')}</div>
                  </div>
                </div>

                {/* 运行时长统计 */}
                <div className={`grid gap-3 ${
                  isFullscreen ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                }`}>
                  <div className="text-center p-3 bg-gradient-to-br from-purple-900/95 to-purple-800/95 border border-purple-600/80 rounded-lg">
                    <div className="text-lg font-bold text-purple-200">{operationalStats.cpuRunTime}</div>
                    <div className="text-xs text-purple-300 font-medium">{t('operations.cpuRunTime')}</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-orange-900/95 to-orange-800/95 border border-orange-600/80 rounded-lg">
                    <div className="text-lg font-bold text-orange-200">{operationalStats.gpuRunTime}</div>
                    <div className="text-xs text-orange-300 font-medium">{t('operations.gpuRunTime')}</div>
                  </div>
                </div>

                {/* 当前状态 */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/50">
                  <h4 className="text-sm font-semibold text-gray-200 mb-2">{t('operations.currentStatus')}</h4>
                  <div className={`grid gap-3 text-sm ${
                    isFullscreen ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-1'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">{t('operations.runningJobs')}:</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="font-bold text-green-300">{operationalStats.runningJobs}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300">{t('operations.queuedJobs')}:</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="font-bold text-yellow-300">{operationalStats.queuedJobs}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 平均时间 */}
                <div className={`grid gap-3 ${
                  isFullscreen ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                }`}>
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg border border-gray-600/50">
                    <div className="text-xs font-semibold text-gray-200 mb-1">{t('operations.avgComputeTime')}</div>
                    <div className="text-lg font-bold text-blue-300">{operationalStats.avgComputeTime}</div>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg border border-gray-600/50">
                    <div className="text-xs font-semibold text-gray-200 mb-1">{t('operations.avgQueueTime')}</div>
                    <div className="text-lg font-bold text-orange-300">{operationalStats.avgQueueTime}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 作业状态分布 */}
            <Card className="bg-gray-900/95 border-gray-700/80 backdrop-blur-md shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:border-blue-500/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-blue-200 font-semibold text-sm">
                  <BarChart3 className="w-4 h-4" />
                  <span>{t('jobStats.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={`${isFullscreen ? 'h-64' : 'h-48 sm:h-56'}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: t('jobStats.running'), value: operationalStats.runningJobs, color: '#10b981' },
                          { name: t('jobStats.queued'), value: operationalStats.queuedJobs, color: '#f59e0b' },
                          { name: t('jobStats.completed'), value: Math.max(0, operationalStats.submittedJobs - operationalStats.runningJobs - operationalStats.queuedJobs), color: '#3b82f6' },
                          { name: t('jobStats.failed'), value: Math.floor(operationalStats.submittedJobs * 0.05), color: '#ef4444' }
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                        fontSize={11}
                      >
                        {[
                          { name: t('jobStats.running'), value: operationalStats.runningJobs, color: '#10b981' },
                          { name: t('jobStats.queued'), value: operationalStats.queuedJobs, color: '#f59e0b' },
                          { name: t('jobStats.completed'), value: Math.max(0, operationalStats.submittedJobs - operationalStats.runningJobs - operationalStats.queuedJobs), color: '#3b82f6' },
                          { name: t('jobStats.failed'), value: Math.floor(operationalStats.submittedJobs * 0.05), color: '#ef4444' }
                        ].map((entry, idx) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#f9fafb'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧：用户统计、软件信息和排行榜 */}
          <div className="space-y-4">
            {/* 用户统计情况 */}
            <Card className="bg-gray-900/95 border-gray-700/80 backdrop-blur-md shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:border-blue-500/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-purple-200 font-semibold text-sm">
                  <Users className="w-4 h-4" />
                  <span>{t('userDistribution.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* 用户统计指标 */}
                <div className={`grid gap-3 ${
                  isFullscreen ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'
                }`}>
                  <div className="text-center p-3 bg-gradient-to-br from-blue-900/95 to-blue-800/95 border border-blue-600/80 rounded-lg">
                    <div className="text-2xl font-bold text-blue-200">{userDistribution.registeredUsers}</div>
                    <div className="text-xs text-blue-300 font-medium">{t('userDistribution.registeredUsers')}</div>
                  </div>
                  <div className="text-center p-3 bg-gradient-to-br from-cyan-900/95 to-cyan-800/95 border border-cyan-600/80 rounded-lg">
                    <div className="text-2xl font-bold text-cyan-200">{Math.floor(userDistribution.registeredUsers * 0.25)}</div>
                    <div className="text-xs text-cyan-300 font-medium">{t('userDistribution.onlineUsers')}</div>
                  </div>
                </div>

                {/* 作业提交排行 */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/50">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-200">{t('userDistribution.jobSubmitRanking')}</h4>
                    <div className="text-xs text-gray-400">
                      {t('userDistribution.totalJobs')}: {userDistribution.userRankings?.reduce((sum, user) => sum + user.count, 0) || 0} {t('userDistribution.jobsLabel')}
                    </div>
                  </div>
                  <div className={`${isFullscreen ? 'h-56' : 'h-40 sm:h-48'}`}>
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
                            formatter={(value, name) => [value, t('chart.jobCount')]}
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
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto mb-1"></div>
                          <p className="text-xs text-gray-400">{t('loading.rankingData')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 软件使用情况 */}
            <Card className="bg-gray-900/95 border-gray-700/80 backdrop-blur-md shadow-2xl hover:shadow-blue-500/20 transition-all duration-300 hover:border-blue-500/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center space-x-2 text-green-200 font-semibold text-sm">
                  <Database className="w-4 h-4" />
                  <span>{t('softwareUsage.title')}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {/* 软件总览 */}
                <div className="text-center p-3 bg-gradient-to-br from-green-900/95 to-green-800/95 border border-green-600/80 rounded-lg">
                  <div className="text-2xl font-bold text-green-200">{softwareInfo.totalSoftware}</div>
                  <div className="text-xs text-green-300 font-medium">{t('softwareUsage.sharedSoftware')}</div>
                </div>

                {/* 软件使用排行榜 */}
                <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-600/50">
                  <h4 className="text-sm font-semibold text-gray-200 mb-2">{t('softwareUsage.usageRanking')}</h4>
                  <div className="space-y-2">
                    {softwareInfo.topSoftware.slice(0, 10).map((software, index) => {
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
        </div>
      </div>
    </div>
  )
}
 