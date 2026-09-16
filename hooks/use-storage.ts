import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'
import { useTranslations } from 'next-intl'

interface StorageInfo {
  sharedStorage: {
    name: string
    mountPath: string
    description: string
    quotaEnabled: boolean
    warningThreshold: number
    criticalThreshold: number
    exists: boolean
    source?: string
    size?: string
    used?: string
    available?: string
    usagePercent?: number
    mountPoint?: string
    error?: string
  }
  userStorage: {
    name: string
    mountPath: string
    description: string
    quotaEnabled: boolean
    warningThreshold: number
    criticalThreshold: number
    exists: boolean
    userPath?: string
    size?: string
    usagePercent?: number
    error?: string
  }
  quota: {
    hasQuota: boolean
    softLimit: string | null
    hardLimit: string | null
    used: string | null
  }
  lastUpdated: string
}

export function useStorage() {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()
  const t = useTranslations('dashboard.storageInfo')

  const fetchStorageInfo = async () => {
    try {
      setLoading(true)
      setError(null)

      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/storage?cache=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setStorageInfo(data.storage)
        } else {
          setError(data.error || t('fetchFailed'))
        }
      } else {
        setError(t('fetchFailed'))
      }
    } catch (err) {
      console.error('Failed to fetch storage info:', err)
      setError(t('fetchFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStorageInfo()
  }, [token])

  return {
    storageInfo,
    loading,
    error,
    refresh: fetchStorageInfo
  }
} 