'use client'

import { useState, useEffect, useRef } from 'react'
import { getRecentJobStats } from '@/lib/job-stats'
import { authFetch } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { globalRequestManager } from '@/lib/global-request-manager'

// 全局缓存管理
let globalDashboardCache: {
  data: DashboardData | null
  timestamp: number
  loading: boolean
} = {
  data: null,
  timestamp: 0,
  loading: false
}

const CACHE_DURATION = 300000 // 5分钟缓存
const MIN_FETCH_INTERVAL = 10000 // 最小请求间隔10秒

interface JobStats {
  total: number
  pending: number
  running: number
  completed: number
  failed: number
  cancelled: number
}

interface SystemStats {
  totalNodes: number
  availableNodes: number
  runningJobs: number
  pendingJobs: number
  cpuUsage: number
  memoryUsage: number
  gpuUsage: number
}

interface PartitionInfo {
  name: string
  nodeCount: number
  healthyNodes: number
  running: number
  pending: number
  cpuUsage: number
  memoryUsage: number
  gpuUsage: number
}

interface DashboardData {
  stats: JobStats
  recentJobs: any[]
  systemStats: SystemStats
  partitions: PartitionInfo[]
  userStats: { totalUsers: number; activeUsers: number }
  loading: boolean
  error: string | null
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(() => globalDashboardCache.data)
  const [loading, setLoading] = useState(() => !globalDashboardCache.data)
  const [error, setError] = useState<string | null>(null)
  const lastFetchTimeRef = useRef(0)
  
  // 获取用户认证信息
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' ||
                  user?.role === 'super_admin' ||
                  user?.isAdmin === true ||
                  user?.isSuperAdmin === true

  useEffect(() => {
    async function fetchData() {
      const now = Date.now()
      
      // 检查缓存
      if (globalDashboardCache.data && (now - globalDashboardCache.timestamp) < CACHE_DURATION) {
        console.log('useDashboardData: 使用缓存的dashboard数据')
        setData(globalDashboardCache.data)
        setLoading(false)
        return
      }
      
      // 使用全局请求管理器检查请求频率
      if (!globalRequestManager.canMakeRequest('dashboard-data', MIN_FETCH_INTERVAL)) {
        return
      }
      
      // 如果正在加载，避免重复请求
      if (globalDashboardCache.loading) {
        console.log('useDashboardData: dashboard数据正在加载中，跳过重复请求')
        return
      }

      try {
        globalDashboardCache.loading = true
        setLoading(true)
        setError(null)
        console.log('useDashboardData: 开始获取dashboard数据...')
        lastFetchTimeRef.current = now

        // 根据用户角色构建API调用参数
        const userParam = isAdmin ? '' : `&user=${user?.username || ''}`
        
        // 调试日志：检查用户角色和API参数
        console.log('用户角色检查:', {
          username: user?.username,
          role: user?.role,
          isAdmin: user?.isAdmin,
          calculatedIsAdmin: isAdmin,
          userParam: userParam
        })

        // 使用全局请求管理器进行防抖请求
        const results = await globalRequestManager.deduplicateRequest(
          'dashboard-data',
          async () => {
            return await Promise.allSettled([
              // 获取作业状态统计（包含完成、失败、取消数量）- 查询10年数据
              authFetch(`/api/jobs/stats?cache=true&days=3650${userParam}`).then(res => res.json()),
              // 获取作业趋势数据 - 查询10年数据
              authFetch(`/api/jobs/trend?days=3650${userParam}`).then(res => res.json()),
              // 获取真正的最近作业数据
              authFetch(`/api/jobs?user=${user?.username || ''}&pageSize=5&cache=true`).then(res => res.json()),
              authFetch('/api/dashboard/user-stats').then(res => res.json()),
              authFetch('/api/dashboard/software-stats').then(res => res.json()),
              authFetch('/api/jobs/partitions?cache=true').then(res => res.json())
            ])
          },
          60000 // 60秒缓存
        )

        console.log('Dashboard API调用结果:', results.map(r => r.status))

        // 处理作业状态统计（包含完成、失败、取消数量）
        let jobStatusStats = { completedJobs: 0, failedJobs: 0, cancelledJobs: 0, submittedJobs: 0, queuedJobs: 0, runningJobs: 0 }
        if (results[0].status === 'fulfilled' && results[0].value.success) {
          jobStatusStats = results[0].value.data || jobStatusStats
          console.log('作业状态统计:', jobStatusStats)
        } else if (results[0].status === 'rejected') {
          console.error('作业状态统计API调用失败:', results[0].reason)
        }

        // 处理趋势数据
        let trendData = { summary: { completed: 0, failed: 0, cancelled: 0 }, dailyData: [] }
        if (results[1].status === 'fulfilled' && results[1].value.success) {
          trendData = results[1].value
          console.log('趋势数据:', trendData)
        } else if (results[1].status === 'rejected') {
          console.error('趋势API调用失败:', results[1].reason)
        }

        // 处理最近作业数据
        let recentJobs = []
        if (results[2].status === 'fulfilled' && results[2].value.success) {
          const jobsData = results[2].value.jobs || []
          // 确保作业数据有正确的字段映射
          recentJobs = jobsData.map((job: any) => ({
            jobId: job.jobId || job.job_id || '',
            jobName: job.jobName || job.job_name || '未命名作业',
            status: job.status || 'UNKNOWN',
            partition: job.partition || 'default',
            startTime: job.startTime || job.start_time || '',
            endTime: job.endTime || job.end_time || '',
            user: job.user || job.user_id || '',
            submitTime: job.submitTime || job.submit_time || ''
          }))
          console.log('最近作业数据:', recentJobs)
        } else if (results[2].status === 'rejected') {
          console.error('最近作业API调用失败:', results[2].reason)
        }

        // 处理用户统计
        let userStats = { totalUsers: 0, activeUsers: 0 }
        if (results[3].status === 'fulfilled' && results[3].value.success) {
          userStats = results[3].value.data || userStats
          console.log('用户统计:', userStats)
        } else if (results[3].status === 'rejected') {
          console.error('用户统计API调用失败:', results[3].reason)
        }

        // 处理软件统计
        let softwareStats = { totalSoftware: 0, topSoftware: [] }
        if (results[4].status === 'fulfilled' && results[4].value.success) {
          softwareStats = results[4].value.data || softwareStats
          console.log('软件统计:', softwareStats)
        } else if (results[4].status === 'rejected') {
          console.error('软件统计API调用失败:', results[4].reason)
        }

        // 处理分区数据
        let partitions = []
        if (results[5].status === 'fulfilled' && results[5].value.success) {
          partitions = results[5].value.partitions || []
          console.log('分区数据:', partitions)
        } else if (results[5].status === 'rejected') {
          console.error('分区API调用失败:', results[5].reason)
        }

        // 检查API调用失败情况
        const failedApis = results.filter(result => result.status === 'rejected').length
        if (failedApis > 0) {
          console.warn(`${failedApis} 个API调用失败，使用可用数据构建dashboard`)
          if (failedApis === results.length) {
            setError('所有数据源都无法访问，请检查网络连接')
          } else {
            setError('部分数据获取失败，显示可能不完整')
          }
        }

        // 调试：详细显示分区数据
        console.log('分区数据详细信息:', partitions.map(p => ({
          name: p.name,
          nodeCount: p.nodeCount,
          healthyNodes: p.healthyNodes,
          cpuUsage: p.cpuUsage,
          memoryUsage: p.memoryUsage,
          gpuUsage: p.gpuUsage
        })))

        // 计算节点统计
        const totalNodes = partitions.reduce((sum: number, p: any) => sum + (p.nodeCount || 0), 0)
        const availableNodes = partitions.reduce((sum: number, p: any) => sum + (p.healthyNodes || 0), 0)
        
        console.log('节点统计计算:', {
          totalNodes,
          availableNodes,
          usedNodes: totalNodes - availableNodes,
          usagePercentage: totalNodes > 0 ? Math.round(((totalNodes - availableNodes) / totalNodes) * 100) : 0
        })

        // 构建dashboard数据，使用更准确的逻辑
        const dashboardData: DashboardData = {
          stats: {
            total: jobStatusStats.submittedJobs || 0,
            pending: jobStatusStats.queuedJobs || 0,
            running: jobStatusStats.runningJobs || 0,
            completed: jobStatusStats.completedJobs || 0,
            failed: jobStatusStats.failedJobs || 0,
            cancelled: jobStatusStats.cancelledJobs || 0,
          },
          recentJobs: recentJobs, // 使用实际获取的最近作业数据
          systemStats: {
            // 使用预先计算的节点统计
            totalNodes: totalNodes,
            availableNodes: availableNodes,
            runningJobs: jobStatusStats.runningJobs || 0,
            pendingJobs: jobStatusStats.queuedJobs || 0,
            cpuUsage: partitions.length > 0 ? Math.round(partitions.reduce((sum: number, p: any) => sum + (p.cpuUsage || 0), 0) / partitions.length) : 0,
            memoryUsage: partitions.length > 0 ? Math.round(partitions.reduce((sum: number, p: any) => sum + (p.memoryUsage || 0), 0) / partitions.length) : 0,
            gpuUsage: partitions.length > 0 ? Math.round(partitions.reduce((sum: number, p: any) => sum + (p.gpuUsage || 0), 0) / partitions.length) : 0,
          },
          partitions: partitions.length > 0 ? partitions : [
            {
              name: 'default',
              nodeCount: 0,
              healthyNodes: 0,
              running: jobStatusStats.runningJobs || 0,
              pending: jobStatusStats.queuedJobs || 0,
              cpuUsage: 0,
              memoryUsage: 0,
              gpuUsage: 0,
            }
          ],
          userStats: userStats,
          loading: false,
          error: null,
        }

        // 更新全局缓存
        globalDashboardCache = {
          data: dashboardData,
          timestamp: now,
          loading: false
        }

        console.log('构建的dashboard数据:', dashboardData)
        setData(dashboardData)
        
      } catch (err) {
        console.error('获取dashboard数据失败:', err)
        setError(err instanceof Error ? err.message : '获取数据失败')
        
        // 设置默认数据，避免页面完全空白
        const defaultData = {
          stats: { total: 0, pending: 0, running: 0, completed: 0, failed: 0, cancelled: 0 },
          recentJobs: [],
          systemStats: { totalNodes: 0, availableNodes: 0, runningJobs: 0, pendingJobs: 0, cpuUsage: 0, memoryUsage: 0, gpuUsage: 0 },
          partitions: [],
          userStats: { totalUsers: 0, activeUsers: 0 },
          loading: false,
          error: null,
        }
        setData(defaultData)
        
        // 也更新缓存为默认数据
        globalDashboardCache = {
          data: defaultData,
          timestamp: now,
          loading: false
        }
      } finally {
        globalDashboardCache.loading = false
        setLoading(false)
      }
    }

    fetchData()
  }, [isAdmin, user?.username]) // 添加依赖项以在用户变化时重新获取

  return { data, loading, error }
} 