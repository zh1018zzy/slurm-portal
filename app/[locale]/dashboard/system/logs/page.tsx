'use client'

import AdminProtected from '@/components/AdminProtected'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { FileText, AlertCircle, Info, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n-utils'

interface LogResponse {
  success: boolean
  logs: string[]
  error?: string
  logFile?: string
  logSource?: string
  totalLines?: number
  suggestion?: string
}

export default function SystemLogsPage() {
  const t = useT('system.logs')

  const LOG_TYPES = [
    { key: 'system', label: t('systemLog'), api: '/api/system-logs', icon: FileText, color: 'blue' },
    { key: 'app', label: t('appLog'), api: '/api/app-logs', icon: FileText, color: 'green' },
  ]

  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logType, setLogType] = useState<'system' | 'app'>('system')
  const [logInfo, setLogInfo] = useState<{ file?: string, source?: string, total?: number }>({})

  async function fetchLogs(type = logType) {
    setLoading(true)
    setError(null)
    setLogInfo({})

    try {
      const api = LOG_TYPES.find(t => t.key === type)?.api || '/api/system-logs'
      const res = await fetch(api)
      const data: LogResponse = await res.json()

      if (data.success) {
        setLogs(data.logs)
        setLogInfo({
          file: data.logFile,
          source: data.logSource,
          total: data.totalLines
        })
      } else {
        setError(data.error || t('fetchFailed'))
        setLogs([])
        if (data.suggestion) {
          setError(data.error + '\n\n' + data.suggestion)
        }
      }
    } catch (e: any) {
      setError(`网络请求失败: ${e.message}`)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(logType)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logType])

  const currentLogType = LOG_TYPES.find(t => t.key === logType)

  return (
    <AdminProtected>
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
          <p className="text-gray-600">{t('subtitle')}</p>
        </div>

        {/* Log Type Selection and Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex gap-2">
          {LOG_TYPES.map(t => {
            const Icon = t.icon
            return (
              <Button
                key={t.key}
                variant={logType === t.key ? "default" : "outline"}
                size="sm"
                onClick={() => setLogType(t.key as any)}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </Button>
            )
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchLogs()}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>

        {/* Log Info */}
        {logInfo.file && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Info className="w-4 h-4" />
            <span>{t('file')}: {logInfo.file}</span>
            {logInfo.total && <span>| {t('totalLines')}: {logInfo.total}</span>}
          </div>
        )}
      </div>

      {/* Main Log Display */}
      <TechCard className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              {currentLogType && <currentLogType.icon className="w-6 h-6" />}
              <span>{currentLogType?.label}</span>
              {logInfo.source && (
                <Badge variant="outline" className="text-xs">
                  {logInfo.source}
                </Badge>
              )}
            </CardTitle>

            {logs.length > 0 && (
              <Badge variant="secondary">
                {t('showing', { count: logs.length })}
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-700 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-medium">{t('fetchFailed')}</span>
              </div>
              <div className="text-red-600 text-sm whitespace-pre-line">
                {error}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3 text-gray-500">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{t('loading')}</span>
              </div>
            </div>
          ) : (
            <div className="relative">
              <pre className="text-xs max-h-[70vh] overflow-auto bg-gray-900 text-gray-100 p-4 rounded-lg border">
                {logs.length === 0 ? (
                  <div className="text-gray-400 text-center py-8">
                    {error ? t('noLogsOrError') : t('noLogs')}
                  </div>
                ) : (
                  logs.join('\n')
                )}
              </pre>
            </div>
          )}
        </CardContent>
      </TechCard>
      </div>
    </AdminProtected>
  )
}