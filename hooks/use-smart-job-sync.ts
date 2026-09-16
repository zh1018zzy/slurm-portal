import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from '@/hooks/use-toast'

interface SyncState {
  hasActiveJobs: boolean
  activeJobCount: number
  lastCheck: number
  activeJobIds: string[]
}

interface SyncStats {
  hasActiveJobs: boolean
  activeJobCount: number
  updated: number
  newJobs: number
  changedJobs: number
  totalJobs: number
  responseTime: number
}

export function useSmartJobSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    hasActiveJobs: false,
    activeJobCount: 0,
    lastCheck: 0,
    activeJobIds: []
  })
  
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // 检查同步状态
  const checkSyncState = useCallback(async () => {
    try {
      const response = await fetch('/api/jobs/smart-sync')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSyncState(data.syncState)
          return data.syncState
        }
      }
    } catch (error) {
      console.error('检查同步状态失败:', error)
    }
    return null
  }, [])
  
  // 执行增量同步
  const performSync = useCallback(async () => {
    if (isSyncing) {
      return
    }
    
    setIsSyncing(true)
    try {
      const response = await fetch('/api/jobs/smart-sync', {
        method: 'POST',
        body: new URLSearchParams()
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const stats: SyncStats = data.stats
          setLastSyncTime(Date.now())
          
          // 更新同步状态
          setSyncState(prev => ({
            ...prev,
            hasActiveJobs: stats.hasActiveJobs,
            activeJobCount: stats.activeJobCount
          }))
          
          // 显示同步结果
          if (stats.updated > 0) {
            toast({
              title: '增量同步完成',
              description: `更新了 ${stats.updated} 个作业状态 (总计: ${stats.totalJobs})`,
            })
          }
          
          return stats
        }
      }
    } catch (error) {
      console.error('增量同步失败:', error)
      toast({
        title: '同步失败',
        description: '作业状态同步失败，请重试',
        variant: 'destructive'
      })
    } finally {
      setIsSyncing(false)
    }
    return null
  }, [isSyncing])
  
  // 启动自动同步
  const startAutoSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    
    // 立即检查一次
    checkSyncState().then(state => {
      if (state?.hasActiveJobs) {
        // 有活跃作业，立即同步一次
        performSync()
      }
    })
    
    // 重新启用自动同步，使用更长的间隔
    intervalRef.current = setInterval(async () => {
      const state = await checkSyncState()
      if (state?.hasActiveJobs) {
        // 有活跃作业，执行同步
        await performSync()
      }
    }, 120000) // 2分钟
    
  }, [checkSyncState, performSync])
  
  // 停止自动同步
  const stopAutoSync = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])
  
  // 强制同步（现在就是增量同步）
  const forceSync = useCallback(async () => {
    return await performSync()
  }, [performSync])
  
  // 启用自动启动，但使用更长的延迟避免页面加载时的重复同步
  useEffect(() => {
    // 延迟启动自动同步，避免与页面初始同步冲突
    const timer = setTimeout(() => {
      startAutoSync()
    }, 5000) // 5秒后启动自动同步
    
    // 组件卸载时清理
    return () => {
      clearTimeout(timer)
      stopAutoSync()
    }
  }, [startAutoSync, stopAutoSync])
  
  // 启用页面可见性变化时的自动同步
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时停止同步
        stopAutoSync()
      } else {
        // 页面显示时重新启动同步
        startAutoSync()
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [startAutoSync, stopAutoSync])
  
  return {
    syncState,
    isSyncing,
    lastSyncTime,
    performSync,
    forceSync,
    startAutoSync,
    stopAutoSync,
    checkSyncState
  }
} 