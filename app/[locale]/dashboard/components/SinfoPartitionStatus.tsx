'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Progress } from '@/components/ui/progress'
import { RefreshCw, Server, Clock, AlertCircle, CheckCircle, Users, Cpu, Database } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { globalRequestManager } from '@/lib/global-request-manager'
import { useT } from '@/lib/i18n-utils'

interface SinfoPartitionData {
  name: string
  isDefault: boolean
  allocatedNodes: number
  idleNodes: number
  totalNodes: number
  state: string
  timeLimit: string
  nodeList: string
  availability: string
  cpuUtilization?: number
  runningJobs?: number
  queuedJobs?: number
}

interface SinfoStatusProps {
  className?: string
  refreshInterval?: number
  maxRetries?: number
}

// 错误类型
type ErrorInfo = {
  message: string
  code?: string
  retryCount: number
  nextRetryIn?: number
}

// 指数退避配置
const RETRY_CONFIG = {
  baseDelay: 10000, // 基础延迟10秒
  maxDelay: 300000, // 最大延迟5分钟
  maxRetries: 3, // 减少最大重试次数
  backoffMultiplier: 2
}

// 计算退避延迟
function calculateBackoffDelay(retryCount: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount)
  return Math.min(delay, RETRY_CONFIG.maxDelay)
}

const partitionStatusColors = {
  'up': 'bg-orange-500',      // 完全分配 - 橙色
  'idle': 'bg-green-500',     // 空闲 - 绿色
  'alloc': 'bg-orange-500',   // 已分配 - 橙色
  'allocated': 'bg-orange-500', // 已分配 - 橙色
  'down': 'bg-red-500',       // 停机 - 红色
  'drain': 'bg-yellow-500',   // 排空 - 黄色
  'mixed': 'bg-blue-500',     // 混合 - 蓝色
  'mix': 'bg-blue-500',       // SLURM 实际返回的值 - 蓝色
  'unknown': 'bg-gray-500'    // 未知 - 灰色
} as const

// 状态映射到StatusBadge类型
const partitionStatusMap = {
  'up': 'warning' as const,      // 完全分配 - 橙色警告样式
  'idle': 'success' as const,    // 空闲 - 绿色成功样式
  'alloc': 'warning' as const,   // 已分配 - 橙色警告样式
  'allocated': 'warning' as const, // 已分配 - 橙色警告样式
  'down': 'failed' as const,     // 停机 - 红色失败样式
  'drain': 'warning' as const,   // 排空 - 黄色警告样式
  'mixed': 'info' as const,      // 混合 - 蓝色信息样式
  'mix': 'info' as const,        // SLURM 实际返回的值 - 蓝色信息样式
  'unknown': 'cancelled' as const // 未知 - 灰色取消样式
}

// 有效的状态类型
type ValidPartitionState = 'up' | 'idle' | 'alloc' | 'allocated' | 'down' | 'drain' | 'mixed' | 'mix' | 'unknown'

// 状态标准化函数 - 确保状态值是有效的，并将 mix 转换为 mixed，alloc 转换为 allocated
function normalizePartitionState(state: string): ValidPartitionState {
  const normalizedState = state.toLowerCase()

  // 将 SLURM 的 'mix' 状态统一转换为 'mixed'
  if (normalizedState === 'mix') {
    return 'mixed'
  }

  // 将 'alloc' 状态统一转换为 'allocated'（保持翻译一致性）
  if (normalizedState === 'alloc') {
    return 'allocated'
  }

  if (normalizedState in partitionStatusMap) {
    return normalizedState as ValidPartitionState
  }
  return 'unknown'
}

export function SinfoPartitionStatus({
  className,
  refreshInterval = 600000, // 默认10分钟轮询，进一步减少API调用频率
  maxRetries = RETRY_CONFIG.maxRetries
}: SinfoStatusProps) {
  const t = useT('dashboard.partitionStatus')

  const [partitionData, setPartitionData] = useState<SinfoPartitionData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ErrorInfo | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [nextRetryCountdown, setNextRetryCountdown] = useState(0)
  const [isPageVisible, setIsPageVisible] = useState(true) // 页面可见性状态

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const lastRequestTimeRef = useRef<number>(0)
  const hasReceivedDataRef = useRef<boolean>(false) // 是否曾成功拿到过分区数据，用于首屏/无数据时不节流

  // 最小请求间隔 (10秒)，仅在有数据后生效，避免首屏或 Strict Mode 重挂载后永远不请求
  const MIN_REQUEST_INTERVAL = 10000

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = !document.hidden
      setIsPageVisible(visible)
      console.log('页面可见性变化:', visible)

      // 如果页面变为可见且没有错误，立即刷新数据
      if (visible && !error) {
        fetchSinfoData(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [error])

  // 清理定时器和取消请求
  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }, [])

  // 开始重试倒计时
  const startRetryCountdown = useCallback((delayMs: number) => {
    setNextRetryCountdown(Math.ceil(delayMs / 1000))

    countdownRef.current = setInterval(() => {
      setNextRetryCountdown(prev => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // 获取分区数据
  const fetchSinfoData = useCallback(async (isRetry: boolean = false, isManualRefresh: boolean = false) => {
    const now = Date.now()
    const timeSinceLastRequest = now - lastRequestTimeRef.current
    // 仅在“已有数据且非手动刷新”时做节流，保证首屏和手动刷新总能请求
    const shouldThrottle =
      !isRetry &&
      !isManualRefresh &&
      hasReceivedDataRef.current &&
      timeSinceLastRequest < MIN_REQUEST_INTERVAL
    if (shouldThrottle) {
      console.log('SinfoPartitionStatus: 请求过于频繁，跳过本次获取')
      return
    }

    // 如果页面不可见，跳过请求
    if (!isPageVisible) {
      console.log('SinfoPartitionStatus: 页面不可见，跳过数据获取')
      return
    }
    // 如果是重试且已达到最大重试次数，则停止
    if (isRetry && retryCount >= maxRetries) {
      console.warn('SinfoPartitionStatus: 已达到最大重试次数，停止重试')
      return
    }

    try {
      if (!isRetry) {
        setRefreshing(true)
        setError(null)
      }

      // 更新最后请求时间
      lastRequestTimeRef.current = now

      // 取消之前的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // 创建新的取消控制器
      abortControllerRef.current = new AbortController()
      const { signal } = abortControllerRef.current

      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('未登录')
      }

      console.log('获取分区数据...', { isRetry, retryCount })

      const response = await fetch('/api/system/nodes?detailed=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal // 添加取消信号
      })

      // 检查响应状态
      if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试')
      }

      if (response.status === 504) {
        throw new Error('系统响应超时')
      }

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText || '获取分区数据失败'}`)
      }

      const result = await response.json()
      if (result.success && result.data?.partitions) {
        // 使用真实的分区数据
        const sinfoData: SinfoPartitionData[] = result.data.partitions.map((partition: any) => {
          // 计算资源使用情况
          const runningJobsInPartition = result.data.jobResourceUsage?.filter(
            (job: any) => job.partition === partition.name
          ) || []

          // 根据实际分配的 CPU 和节点数量计算已分配节点数
          // 如果分区有分配的 CPU，说明有节点被使用
          const allocatedNodeCount = partition.cpuAlloc > 0 
            ? Math.ceil((partition.cpuAlloc / (partition.cpuTotal / partition.nodeCount)) || 0)
            : 0
          const idleNodeCount = Math.max(0, (partition.nodeCount || 0) - allocatedNodeCount)

          // 确定分区状态：根据节点使用情况
          let displayState = partition.state || 'unknown'
          if (partition.state === 'up' || partition.state === 'UP') {
            if (allocatedNodeCount > 0 && idleNodeCount > 0) {
              displayState = 'mixed' // 有分配也有空闲
            } else if (allocatedNodeCount > 0) {
              displayState = 'up' // 全部分配
            } else {
              displayState = 'idle' // 全部空闲
            }
          }

          // 使用 API 返回的节点列表，如果没有则使用默认格式
          const nodeList = partition.nodeList || (partition.nodeCount > 0 
            ? `n[001-${String(partition.nodeCount).padStart(3, '0')}]`
            : '')

          return {
            name: partition.name,
            isDefault: partition.name === 'compute' || partition.name.endsWith('*'),
            allocatedNodes: Math.min(allocatedNodeCount, partition.nodeCount || 0),
            idleNodes: idleNodeCount,
            totalNodes: partition.nodeCount || 0,
            state: displayState,
            timeLimit: partition.timeLimit === 'infinite' ? 'infinite' : (partition.timeLimit || 'infinite'),
            nodeList: nodeList,
            availability: partition.state || 'up',
            cpuUtilization: partition.cpuUtilization || 0,
            runningJobs: runningJobsInPartition.length,
            queuedJobs: 0 // TODO: 获取排队作业数
          }
        })

        // 若节点 API 返回分区为空，尝试用 /api/jobs/partitions 作为降级数据源（与提交页一致）
        if (sinfoData.length === 0) {
          try {
            const fallbackRes = await fetch('/api/jobs/partitions?cache=true', {
              headers: { 'Authorization': `Bearer ${token}` }
            })
            const fallbackJson = await fallbackRes.json()
            if (fallbackJson.success && Array.isArray(fallbackJson.partitions) && fallbackJson.partitions.length > 0) {
              const fallbackData: SinfoPartitionData[] = fallbackJson.partitions.map((p: any) => ({
                name: p.name || '',
                isDefault: (p.name && (p.name === 'compute' || p.name.endsWith('*'))) || false,
                allocatedNodes: 0,
                idleNodes: p.nodeCount ?? p.healthyNodes ?? 0,
                totalNodes: p.nodeCount ?? 0,
                state: (p.state || p.status || 'unknown').toLowerCase(),
                timeLimit: 'infinite',
                nodeList: '',
                availability: p.state || p.status || 'up',
                cpuUtilization: p.cpuUsage ?? 0,
                runningJobs: p.running ?? 0,
                queuedJobs: p.pending ?? 0
              }))
              setPartitionData(fallbackData)
              console.log('分区数据来自降级接口 /api/jobs/partitions:', fallbackData.length)
            } else {
              setPartitionData(sinfoData)
            }
          } catch (fallbackErr) {
            console.warn('降级获取分区失败:', fallbackErr)
            setPartitionData(sinfoData)
          }
        } else {
          setPartitionData(sinfoData)
        }
        hasReceivedDataRef.current = true

        // 重置重试计数
        setRetryCount(0)
        setError(null)
        setLastUpdated(new Date())

        console.log('分区数据获取成功:', {
          partitionCount: sinfoData.length,
          cached: result.data?.metadata?.cached || false,
          processingTime: result.data?.metadata?.processingTime
        })
      } else {
        console.warn('API响应格式错误:', result)
        throw new Error('API返回数据格式错误')
      }

    } catch (err) {
      // 如果请求被取消，不处理错误
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('请求被取消')
        return
      }

      const errorMessage = err instanceof Error ? err.message : '未知错误'
      console.error('获取分区数据失败:', {
        error: errorMessage,
        isRetry,
        retryCount,
        willRetry: retryCount < maxRetries
      })

      const newRetryCount = isRetry ? retryCount : retryCount + 1
      setRetryCount(newRetryCount)

      const errorInfo: ErrorInfo = {
        message: errorMessage,
        retryCount: newRetryCount
      }

      // 如果还有重试机会，设置重试
      if (newRetryCount <= maxRetries) {
        const delayMs = calculateBackoffDelay(newRetryCount - 1)
        errorInfo.nextRetryIn = Math.ceil(delayMs / 1000)

        console.log(`将在 ${delayMs}ms 后重试 (${newRetryCount}/${maxRetries})`)

        // 开始倒计时
        startRetryCountdown(delayMs)

        // 设置重试
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(newRetryCount)
          fetchSinfoData(true)
        }, delayMs)
      }

      setError(errorInfo)
    } finally {
      setRefreshing(false)
      setLoading(false)
    }
  }, [maxRetries, startRetryCountdown, isPageVisible]) // 移除 lastRequestTime 依赖

  // 手动刷新：传入 isManualRefresh=true 绕过 10 秒节流，保证点击后立即请求
  const handleRefresh = useCallback(() => {
    if (refreshing) return

    console.log('手动刷新分区数据')
    cleanup() // 清理现有定时器
    setRetryCount(0) // 重置重试计数
    setNextRetryCountdown(0)
    fetchSinfoData(false, true)
  }, [refreshing, fetchSinfoData, cleanup])

  // 取消重试
  const cancelRetry = useCallback(() => {
    console.log('取消重试')
    cleanup()
    setError(null)
    setRetryCount(0)
    setNextRetryCountdown(0)
  }, [cleanup])

  // 设置轮询
  useEffect(() => {
    // 初始加载
    fetchSinfoData(false)

    // 设置轮询（只有在没有错误或重试时才轮询）
    const setupPolling = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        // 只有在没有活跃错误且页面可见时才自动刷新
        if ((!error || error.retryCount > maxRetries) && isPageVisible) {
          fetchSinfoData(false)
          setupPolling() // 递归设置下一次轮询
        } else if (!isPageVisible) {
          // 如果页面不可见，设置一个较短的检查间隔
          setupPolling()
        }
      }, isPageVisible ? refreshInterval : 30000) // 页面不可见时30秒检查一次
    }

    // 如果没有错误，开始轮询
    if (!error) {
      setupPolling()
    }

    return cleanup
  }, [refreshInterval, error, maxRetries, cleanup, isPageVisible])

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-600" />
              <span className="font-medium">{t('title')}</span>
              {lastUpdated && (
                <span className="text-sm text-gray-500">
                  {t('updatedAt')} {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {error && error.retryCount <= maxRetries && nextRetryCountdown > 0 && (
                <div className="flex items-center gap-1 text-sm text-yellow-600">
                  <Clock className="h-4 w-4" />
                  <span>{t('retryIn', { seconds: nextRetryCountdown })}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cancelRetry}
                    className="h-6 px-2 text-xs"
                  >
                    {t('cancel')}
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? t('refreshing') : t('refresh')}
              </Button>
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* 统计信息 - 移到顶部 */}
        {partitionData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-4 border-b">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {partitionData.length}
              </div>
              <div className="text-sm text-gray-600">{t('totalPartitions')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {partitionData.reduce((sum, p) => sum + p.totalNodes, 0)}
              </div>
              <div className="text-sm text-gray-600">{t('totalNodes')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {partitionData.reduce((sum, p) => sum + (p.runningJobs || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">{t('runningJobs')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(partitionData.reduce((sum, p) => sum + (p.cpuUtilization || 0), 0) / partitionData.length)}%
              </div>
              <div className="text-sm text-gray-600">{t('avgCpuUtilization')}</div>
            </div>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert className={`${error.retryCount > maxRetries ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
            }`}>
            <AlertCircle className={`h-4 w-4 ${error.retryCount > maxRetries ? 'text-red-600' : 'text-yellow-600'
              }`} />
            <AlertTitle className="text-sm font-medium">
              {error.retryCount > maxRetries ? t('connectionFailed') : t('temporarilyUnavailable')}
            </AlertTitle>
            <AlertDescription className="text-sm">
              <div>{error.message}</div>
              {error.retryCount <= maxRetries && (
                <div className="mt-1 text-xs">
                  {t('retryAttempt', { current: error.retryCount, max: maxRetries })}
                  {error.nextRetryIn && error.nextRetryIn > 0 && (
                    <span> • {t('autoRetryIn', { seconds: error.nextRetryIn })}</span>
                  )}
                </div>
              )}
              {error.retryCount > maxRetries && (
                <div className="mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    className="text-xs"
                  >
                    {t('retryNow')}
                  </Button>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}

        {loading && !refreshing && (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>{t('loadingPartitionInfo')}</span>
          </div>
        )}

        {!loading && partitionData.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Database className="h-8 w-8 mb-2" />
            <span>{t('noPartitionData')}</span>
          </div>
        )}

        {/* 分区表格 */}
        {partitionData.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">{t('partitionName')}</TableHead>
                  <TableHead className="text-center">{t('status')}</TableHead>
                  <TableHead className="text-center">{t('nodeUsage')}</TableHead>
                  <TableHead className="text-center">{t('cpuUtilization')}</TableHead>
                  <TableHead className="text-center">{t('runningJobsCount')}</TableHead>
                  <TableHead className="text-center">{t('timeLimit')}</TableHead>
                  <TableHead className="min-w-[140px]">{t('nodeList')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partitionData.map((partition) => (
                  <TableRow key={partition.name} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{partition.name}</span>
                        {partition.isDefault && (
                          <StatusBadge status="info" size="sm">
                            {t('defaultPartition')}
                          </StatusBadge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <StatusBadge
                                status={partitionStatusMap[normalizePartitionState(partition.state)] || 'cancelled'}
                                size="sm"
                              >
                                {t(`statusLabels.${normalizePartitionState(partition.state)}`)}
                              </StatusBadge>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('partitionState')}: {partition.state}</p>
                            <p>{t('availability')}: {partition.availability}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell className="text-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="space-y-1">
                              <div className="text-sm font-medium">
                                {partition.allocatedNodes}/{partition.totalNodes}
                              </div>
                              <Progress
                                value={partition.totalNodes > 0 ? (partition.allocatedNodes / partition.totalNodes) * 100 : 0}
                                className="h-2"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{t('allocated')}: {partition.allocatedNodes} {t('nodes')}</p>
                            <p>{t('idle')}: {partition.idleNodes} {t('nodes')}</p>
                            <p>{t('total')}: {partition.totalNodes} {t('nodes')}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {partition.cpuUtilization || 0}%
                        </div>
                        <Progress
                          value={partition.cpuUtilization || 0}
                          className="h-2"
                        />
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-green-700">
                          {partition.runningJobs || 0}
                        </span>
                        {(partition.queuedJobs || 0) > 0 && (
                          <>
                            <span className="text-gray-400">|</span>
                            <Clock className="h-4 w-4 text-yellow-600" />
                            <span className="font-medium text-yellow-700">
                              {partition.queuedJobs}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-xs">
                        {partition.timeLimit}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded cursor-pointer">
                              {partition.nodeList.length > 20
                                ? `${partition.nodeList.substring(0, 20)}...`
                                : partition.nodeList
                              }
                            </code>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="break-all">{partition.nodeList}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
