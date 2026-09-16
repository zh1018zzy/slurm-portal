import { useState, useEffect } from 'react'
import { useRef } from 'react'
import { useCallback } from 'react'

interface BigScreenSettings {
  bigScreenButtonEnabled: boolean
}

// 全局缓存和节流控制
let cachedSettings: BigScreenSettings | null = null
let lastFetchTime = 0
let globalFetchPromise: Promise<BigScreenSettings> | null = null
const CACHE_DURATION = 60000 // 1分钟缓存
const MIN_FETCH_INTERVAL = 5000 // 最小请求间隔5秒

async function fetchBigScreenSettings(): Promise<BigScreenSettings> {
  // 检查请求频率
  const now = Date.now()
  if ((now - lastFetchTime) < MIN_FETCH_INTERVAL) {
    console.log('useBigScreenSettings: 请求过于频繁，跳过本次获取')
    throw new Error('请求过于频繁')
  }

  try {
    const token = localStorage.getItem('token')
    console.log('🔍 useBigScreenSettings: 准备获取设置，token存在:', !!token)
    
    const response = await fetch('/api/system/settings', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('🔍 useBigScreenSettings: API响应状态:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🔍 useBigScreenSettings: API错误响应:', errorText)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log('🔍 useBigScreenSettings: 获取到的完整响应:', result)
    
    // 从系统设置中提取大屏按钮设置
    const data = {
      bigScreenButtonEnabled: result.bigScreenButtonEnabled !== false // 默认启用
    }
    console.log('🔍 useBigScreenSettings: 提取的大屏设置:', data)
    
    // 更新缓存
    cachedSettings = data
    lastFetchTime = now
    
    return data
  } catch (error) {
    console.error('获取大屏设置失败:', error)
    throw error
  }
}

export function useBigScreenSettings() {
  const [settings, setSettings] = useState<BigScreenSettings>(() => 
    cachedSettings || { bigScreenButtonEnabled: true }
  )
  const [loading, setLoading] = useState(!cachedSettings)

  useEffect(() => {
    async function loadSettings() {
      try {
        const fetchedSettings = await fetchBigScreenSettings()
        setSettings(fetchedSettings)
      } catch (error) {
        console.error('加载大屏设置失败:', error)
        // 失败时使用默认值
        const defaultSettings = { bigScreenButtonEnabled: true }
        setSettings(defaultSettings)
        console.log('🔍 useBigScreenSettings: 使用默认设置:', defaultSettings)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()

    // 监听系统设置更新事件（降低刷新频率）
    let updateTimeout: NodeJS.Timeout
    const handleSettingsUpdate = () => {
      // 防抖处理，避免频繁更新
      clearTimeout(updateTimeout)
      updateTimeout = setTimeout(() => {
        loadSettings()
      }, 1000)
    }

    window.addEventListener('systemSettingsUpdated', handleSettingsUpdate)
    
    return () => {
      window.removeEventListener('systemSettingsUpdated', handleSettingsUpdate)
      clearTimeout(updateTimeout)
    }
  }, [])

  return { settings, loading }
} 