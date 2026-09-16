'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { RefreshCw, Activity, Server, AlertCircle, CheckCircle } from 'lucide-react'
import { useT } from '@/lib/i18n-utils'
import { TechCard } from '@/components/ui/tech-card'
import { SecondaryButton } from '@/components/ui/primary-button'
import { LoadingSpinner, InlineLoading } from '@/components/ui/loading-spinner'
import { StatusBadge } from '@/components/ui/status-badge'

interface NodeInfo {
  name: string
  state: string
  cpuTotal: number
  cpuAlloc: number
  cpuIdle: number
  cpuUtilization: number
  cpuLoad: number
  freeMemory: number
  features: string
  gres: string
}

interface PartitionInfo {
  name: string
  nodeCount: number
  cpuTotal: number
  cpuAlloc: number
  cpuIdle: number
  cpuUtilization: number
  gres: string
  timeLimit: string
  state: string
}

interface MonitorData {
  timestamp: string
  cluster: {
    nodes: {
      total: number
      healthy: number
      availability_percent: number
    }
    cpus: {
      total: number
      allocated: number
      idle: number
      utilization_percent: number
    }
    memory: {
      total_mb: number
    }
  }
  jobs: {
    running_count: number
    running_cpus: number
  }
  nodes: NodeInfo[]
  partitions: PartitionInfo[]
  jobResourceUsage: any[]
}

const statusColors = {
  'idle': 'bg-green-500',    // 空闲 - 绿色
  'alloc': 'bg-orange-500',  // 已分配 - 橙色
  'mix': 'bg-blue-500',      // 混合 - 蓝色
  'down': 'bg-red-500',      // 停机 - 红色
  'drain': 'bg-gray-500',    // 排空 - 灰色
  'unknown': 'bg-gray-400'   // 未知 - 灰色
} as const

// 节点状态映射到StatusBadge类型
const nodeStatusMap = {
  'idle': 'success' as const,    // 空闲 - 绿色
  'alloc': 'warning' as const,   // 已分配 - 橙色
  'mix': 'info' as const,        // 混合 - 蓝色
  'down': 'failed' as const,     // 停机 - 红色
  'drain': 'cancelled' as const, // 排空 - 灰色
  'unknown': 'cancelled' as const // 未知 - 灰色
}

// 分区状态映射到StatusBadge类型
const partitionStatusMap = (state: string) => {
  switch (state.toLowerCase()) {
    case 'up':
      return 'warning' as const      // 完全分配 - 橙色
    case 'idle':
      return 'success' as const      // 空闲 - 绿色
    case 'alloc':
    case 'allocated':
      return 'warning' as const      // 已分配 - 橙色
    case 'mix':
    case 'mixed':
      return 'info' as const         // 混合 - 蓝色
    case 'down':
      return 'failed' as const       // 停机 - 红色
    case 'drain':
      return 'failed' as const       // 排空 - 红色
    default:
      return 'cancelled' as const    // 未知 - 灰色
  }
}

export default function NodesManagementPage() {
  const t = useT('nodes')
  const tCommon = useT('common')
  const [monitorData, setMonitorData] = useState<MonitorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filteredNodes, setFilteredNodes] = useState<NodeInfo[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterState, setFilterState] = useState<string>('all')
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [refreshing, setRefreshing] = useState(false)

  // 获取节点监控数据
  const fetchNodeData = useCallback(async () => {
    try {
      setRefreshing(true)
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error(t('notLoggedIn'))
      }

      const response = await fetch('/api/system/nodes?detailed=true', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(t('fetchNodeDataFailed'))
      }

      const result = await response.json()
      if (result.success) {
        setMonitorData(result.data)
        setError(null)
      } else {
        throw new Error(result.error || t('fetchNodeDataFailed'))
      }

    } catch (err) {
      console.error('获取节点监控数据失败:', err)
      setError(err instanceof Error ? err.message : tCommon('error'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // 更新节点状态
  const updateNodeStatus = async (nodes: string[], action: string, reason?: string) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('未登录')
      }

      const response = await fetch('/api/system/nodes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, nodes, reason })
      })

      const result = await response.json()
      if (result.success) {
        // 刷新数据
        fetchNodeData()
        alert(result.message)
      } else {
        throw new Error(result.error)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败')
    }
  }

  // 过滤节点
  useEffect(() => {
    if (!monitorData) return

    let filtered = [...monitorData.nodes]

    // 按名称搜索
    if (searchTerm) {
      filtered = filtered.filter(node =>
        node.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // 按状态过滤
    if (filterState !== 'all') {
      filtered = filtered.filter(node => node.state === filterState)
    }

    setFilteredNodes(filtered)
  }, [monitorData, searchTerm, filterState])

  // 初始加载和定时刷新
  useEffect(() => {
    fetchNodeData()
    const interval = setInterval(fetchNodeData, 60000) // 每60秒刷新一次（与API缓存时间匹配）
    return () => clearInterval(interval)
  }, [fetchNodeData])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" text={t('loadingNodes')} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <TechCard>
          <CardContent className="p-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center text-red-600 dark:text-red-400">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{t('loadFailed')}: {error}</span>
              </div>
              <SecondaryButton onClick={fetchNodeData}>
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('retry')}
              </SecondaryButton>
            </div>
          </CardContent>
        </TechCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 集群概览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <TechCard hover>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalNodes')}</CardTitle>
            <Server className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{monitorData?.cluster.nodes.total}</div>
            <p className="text-xs text-muted-foreground">
              {t('healthyNodes')}: {monitorData?.cluster.nodes.healthy}
            </p>
          </CardContent>
        </TechCard>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('nodeAvailability')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitorData?.cluster.nodes.availability_percent}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('clusterHealth')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('cpuUtilization')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {monitorData?.cluster.cpus.utilization_percent}%
            </div>
            <p className="text-xs text-muted-foreground">
              {monitorData?.cluster.cpus.allocated}/{monitorData?.cluster.cpus.total} {t('cores')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('runningJobs')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monitorData?.jobs.running_count}</div>
            <p className="text-xs text-muted-foreground">
              {t('usedCpuCores', { count: monitorData?.jobs.running_cpus })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 节点管理工具栏 */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('title')}</CardTitle>
            <Button
              onClick={fetchNodeData}
              disabled={refreshing}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? t('refreshing') : t('refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* 过滤和搜索 */}
          <div className="flex space-x-4 mb-4">
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={tCommon('filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatus')}</SelectItem>
                <SelectItem value="idle">{t('statusLabels.idle')}</SelectItem>
                <SelectItem value="alloc">{t('statusLabels.alloc')}</SelectItem>
                <SelectItem value="mix">{t('statusLabels.mix')}</SelectItem>
                <SelectItem value="down">{t('statusLabels.down')}</SelectItem>
                <SelectItem value="drain">{t('statusLabels.drain')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 批量操作 */}
          {selectedNodes.length > 0 && (
            <div className="flex space-x-2 mb-4 p-3 bg-muted rounded">
              <span className="text-sm">{t('selectedNodes', { count: selectedNodes.length })}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateNodeStatus(selectedNodes, 'drain')}
              >
                {t('drain')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateNodeStatus(selectedNodes, 'resume')}
              >
                {t('resume')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateNodeStatus(selectedNodes, 'down')}
              >
                {t('down')}
              </Button>
            </div>
          )}

          {/* 节点列表 */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={filteredNodes.length > 0 && selectedNodes.length === filteredNodes.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedNodes(filteredNodes.map(node => node.name))
                      } else {
                        setSelectedNodes([])
                      }
                    }}
                  />
                </TableHead>
                <TableHead>{t('nodeName')}</TableHead>
                <TableHead>{t('status')}</TableHead>
                <TableHead>{t('cpuUsage')}</TableHead>
                <TableHead>{t('cpuLoad')}</TableHead>
                <TableHead>{t('memory')}</TableHead>
                <TableHead>{t('features')}</TableHead>
                <TableHead>{t('gpu')}</TableHead>
                <TableHead>{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNodes.map((node) => (
                <TableRow key={node.name}>
                  <TableCell>
                    <Checkbox
                      checked={selectedNodes.includes(node.name)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedNodes([...selectedNodes, node.name])
                        } else {
                          setSelectedNodes(selectedNodes.filter(n => n !== node.name))
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{node.name}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={nodeStatusMap[node.state as keyof typeof nodeStatusMap] || 'cancelled'}
                      size="sm"
                    >
                      {t(`statusLabels.${node.state as 'idle' | 'alloc' | 'mix' | 'down' | 'drain' | 'unknown'}`) || node.state}
                    </StatusBadge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span>{node.cpuAlloc}/{node.cpuTotal}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-600 rounded-full"
                          style={{ width: `${node.cpuUtilization}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {node.cpuUtilization}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{node.cpuLoad.toFixed(2)}</TableCell>
                  <TableCell>{node.freeMemory} MB</TableCell>
                  <TableCell className="max-w-32 truncate" title={node.features}>
                    {node.features || 'N/A'}
                  </TableCell>
                  <TableCell>{node.gres || 'N/A'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      {node.state === 'idle' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateNodeStatus([node.name], 'drain')}
                        >
                          {t('drain')}
                        </Button>
                      )}
                      {(node.state === 'drain' || node.state === 'down') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateNodeStatus([node.name], 'resume')}
                        >
                          {t('resume')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredNodes.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {t('noMatchingNodes')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分区概览 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('partitionOverview')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('partitionName')}</TableHead>
                <TableHead>{t('nodeCount')}</TableHead>
                <TableHead>{t('cpuTotal')}</TableHead>
                <TableHead>{t('cpuUtilization')}</TableHead>
                <TableHead>{t('gpuResources')}</TableHead>
                <TableHead>{t('timeLimit')}</TableHead>
                <TableHead>{t('status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monitorData?.partitions.map((partition) => (
                <TableRow key={partition.name}>
                  <TableCell className="font-medium">{partition.name}</TableCell>
                  <TableCell>{partition.nodeCount}</TableCell>
                  <TableCell>{partition.cpuTotal}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span>{partition.cpuAlloc}/{partition.cpuTotal}</span>
                      <div className="w-16 h-2 bg-gray-200 rounded-full">
                        <div
                          className="h-2 bg-blue-600 rounded-full"
                          style={{ width: `${partition.cpuUtilization}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {partition.cpuUtilization}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{partition.gres || 'N/A'}</TableCell>
                  <TableCell>{partition.timeLimit || t('noLimit')}</TableCell>
                  <TableCell>
                    {(() => {
                      const stateString = String(partition.state)
                      const labelKey = `partitionStatusLabels.${stateString}`
                      return (
                        <StatusBadge status={partitionStatusMap(partition.state)} size="sm">
                          {t(labelKey as any) || stateString}
                        </StatusBadge>
                      )
                    })()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 数据时间戳 */}
      {monitorData && (
        <div className="text-xs text-muted-foreground text-center">
          {t('dataUpdatedAt', { time: new Date(monitorData.timestamp).toLocaleString() })}
        </div>
      )}
    </div>
  )
}