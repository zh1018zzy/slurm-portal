'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { HardDriveIcon, RefreshCw, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useStorage } from '@/hooks/use-storage'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'

export function StorageInfoCard() {
  const { storageInfo, loading, error, refresh } = useStorage()
  const t = useT('dashboard.storageInfo')
  const locale = useLocale()

  const getUsageColor = (percent: number) => {
    if (percent >= 90) return 'text-red-600'
    if (percent >= 75) return 'text-yellow-600'
    if (percent >= 50) return 'text-orange-600'
    return 'text-green-600'
  }

  const getUsageStatus = (percent: number) => {
    if (percent >= 90) return { icon: AlertTriangle, color: 'text-red-500', text: t('statusLow') }
    if (percent >= 75) return { icon: AlertTriangle, color: 'text-yellow-500', text: t('statusTight') }
    if (percent >= 50) return { icon: Clock, color: 'text-orange-500', text: t('statusNormal') }
    return { icon: CheckCircle, color: 'text-green-500', text: t('statusSufficient') }
  }

  // Translate storage names based on config
  const getStorageName = (storageName: string) => {
    if (storageName === '集群共享存储') return t('sharedStorageName')
    if (storageName === '用户个人存储') return t('userStorageName')
    if (storageName === '临时存储') return t('scratchStorageName')
    return storageName // fallback to original name
  }

  // Translate storage descriptions based on config
  const getStorageDescription = (description: string) => {
    if (description === '集群共享存储空间，供所有用户使用') return t('sharedStorageDesc')
    if (description === '用户个人存储空间') return t('userStorageDesc')
    if (description === '高性能临时存储空间') return t('scratchStorageDesc')
    return description // fallback to original description
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDriveIcon className="w-6 h-6" />
            <span>{t('title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDriveIcon className="w-6 h-6" />
            <span>{t('title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">{error}</p>
            <Button size="sm" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {t('retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!storageInfo) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <HardDriveIcon className="w-6 h-6" />
            <span>{t('title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            {t('noData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  const sharedStorageStatus = getUsageStatus(storageInfo.sharedStorage.usagePercent || 0)
  const userStorageStatus = getUsageStatus(storageInfo.userStorage.usagePercent || 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <HardDriveIcon className="w-6 h-6" />
            <span>{t('title')}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
                  <div className="space-y-4">
            {/* Cluster shared storage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{getStorageName(storageInfo.sharedStorage.name)}</h3>
                {storageInfo.sharedStorage.exists ? (
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const status = getUsageStatus(storageInfo.sharedStorage.usagePercent || 0)
                      return (
                        <>
                          <status.icon className={`w-4 h-4 ${status.color}`} />
                          <Badge variant="outline" className="text-xs">
                            {status.text}
                          </Badge>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <StatusBadge status="error" size="sm">
                    {t('unavailable')}
                  </StatusBadge>
                )}
              </div>
              {storageInfo.sharedStorage.exists ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('totalCapacity')}</span>
                    <span className="font-medium">{storageInfo.sharedStorage.size}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('used')}</span>
                    <span className={`font-medium ${getUsageColor(storageInfo.sharedStorage.usagePercent || 0)}`}>
                      {storageInfo.sharedStorage.used}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('available')}</span>
                    <span className="font-medium">{storageInfo.sharedStorage.available}</span>
                  </div>
                  <Progress
                    value={storageInfo.sharedStorage.usagePercent || 0}
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {t('usageRate')}: {storageInfo.sharedStorage.usagePercent || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getStorageDescription(storageInfo.sharedStorage.description)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {storageInfo.sharedStorage.error || t('pathInaccessible')}
                </div>
              )}
            </div>

            {/* User personal storage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{getStorageName(storageInfo.userStorage.name)}</h3>
                {storageInfo.userStorage.exists ? (
                  <div className="flex items-center space-x-2">
                    {(() => {
                      const status = getUsageStatus(storageInfo.userStorage.usagePercent || 0)
                      return (
                        <>
                          <status.icon className={`w-4 h-4 ${status.color}`} />
                          <StatusBadge status="info" size="sm">
                            {status.text}
                          </StatusBadge>
                        </>
                      )
                    })()}
                  </div>
                ) : (
                  <StatusBadge status="error" size="sm">
                    {t('unavailable')}
                  </StatusBadge>
                )}
              </div>
              {storageInfo.userStorage.exists ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{t('directory')}</span>
                    <span className="font-medium text-xs truncate max-w-32">
                      {storageInfo.userStorage.userPath}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>{t('used')}</span>
                    <span className={`font-medium ${getUsageColor(storageInfo.userStorage.usagePercent || 0)}`}>
                      {storageInfo.userStorage.size}
                    </span>
                  </div>
                  {storageInfo.quota.hasQuota && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>{t('quotaLimit')}</span>
                        <span className="font-medium">{storageInfo.quota.hardLimit}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>{t('softLimit')}</span>
                        <span className="font-medium">{storageInfo.quota.softLimit}</span>
                      </div>
                    </>
                  )}
                  <Progress
                    value={storageInfo.userStorage.usagePercent || 0}
                    className="h-2"
                  />
                  <div className="text-xs text-muted-foreground text-center">
                    {t('usageRate')}: {storageInfo.userStorage.usagePercent || 0}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {getStorageDescription(storageInfo.userStorage.description)}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {storageInfo.userStorage.error || t('userDirInaccessible')}
                </div>
              )}
            </div>

            <div className="text-xs text-muted-foreground text-center pt-2">
              {t('lastUpdated')}: {new Date(storageInfo.lastUpdated).toLocaleString(locale)}
            </div>
          </div>
      </CardContent>
    </Card>
  )
}
