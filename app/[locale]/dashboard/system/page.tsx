'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Settings, Users, Shield, Database, Bell, Dna, FileText, RefreshCw, Monitor, HardDrive, RotateCcw, Server, Zap } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { toast } from 'sonner'

export default function SystemManagementPage() {
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const [syncStats, setSyncStats] = useState<any>(null)
  const locale = useLocale()
  const t = useT('system')

  const handleQuickAction = async (action: string) => {
    setRefreshing(action)

    try {
      switch (action) {
        case 'refresh':
          // Simulate refresh action
          await new Promise(resolve => setTimeout(resolve, 1000))
          window.location.reload()
          break
        case 'cache':
          // Add cache clearing logic here in the future
          console.log('Cache clearing would be implemented here')
          break
        case 'security':
          // Add security check logic here in the future
          console.log('Security check would be implemented here')
          break
        case 'optimize':
          // Add system optimization logic here in the future
          console.log('System optimization would be implemented here')
          break
        case 'smartSync':
          await handleJobSync('smart')
          break
        case 'forceSync':
          await handleJobSync('force')
          break
        case 'fixStaleJobs':
          await handleFixStaleJobs()
          break
      }
    } finally {
      setTimeout(() => setRefreshing(null), 500)
    }
  }

  // 作业智能同步
  const handleJobSync = async (mode: 'smart' | 'force') => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error(t('notLoggedIn') || '未登录')
        return
      }

      const url = mode === 'force'
        ? '/api/jobs/smart-sync?force=true&fullSync=true'
        : '/api/jobs/smart-sync'

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        setSyncStats(result.stats)
        const message = mode === 'force'
          ? `强制同步完成: 新增 ${result.stats.newJobs} 个，更新 ${result.stats.updated} 个${result.stats.staleJobsFixed ? `，修复 ${result.stats.staleJobsFixed} 个过期作业` : ''}`
          : `智能同步完成: 更新 ${result.stats.updated} 个作业${result.stats.staleJobsFixed ? `，修复 ${result.stats.staleJobsFixed} 个过期作业` : ''}`

        toast.success(message)
      } else {
        toast.error(result.error || '同步失败')
      }
    } catch (error) {
      console.error('作业同步失败:', error)
      toast.error('同步请求失败')
    }
  }

  // 修复过期作业
  const handleFixStaleJobs = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error(t('notLoggedIn') || '未登录')
        return
      }

      // 使用强制同步来触发过期作业检测
      const response = await fetch('/api/jobs/smart-sync?force=true', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        const fixed = result.stats.staleJobsFixed || 0
        const checked = result.stats.staleJobsChecked || 0

        if (fixed > 0) {
          toast.success(`修复完成: 检查 ${checked} 个作业，修复 ${fixed} 个过期作业`)
        } else {
          toast.success(`检查完成: 已检查 ${checked} 个作业，无需修复`)
        }
      } else {
        toast.error(result.error || '修复失败')
      }
    } catch (error) {
      console.error('修复过期作业失败:', error)
      toast.error('修复请求失败')
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">
          {t('title')}
        </h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* 管理功能卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* 系统设置 */}
        <TechCard className="h-full flex flex-col" hover>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 flex items-center justify-center group-hover:from-green-500/20 group-hover:to-emerald-500/20 transition-all">
                <Settings className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg font-semibold">{t('systemSettingsCard')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {t('systemSettingsDesc')}
            </p>
            <div className="mt-auto">
              <Link href={`/${locale}/dashboard/system/settings`} className="block">
                <PrimaryButton className="w-full">
                  {t('settings')}
                </PrimaryButton>
              </Link>
            </div>
          </CardContent>
        </TechCard>

        {/* 用户管理 */}
        <TechCard className="h-full flex flex-col" hover>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 flex items-center justify-center group-hover:from-green-500/20 group-hover:to-emerald-500/20 transition-all">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg font-semibold">{t('userManagementCard')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {t('userManagementDesc')}
            </p>
            <div className="mt-auto">
              <Link href={`/${locale}/dashboard/system/users`} className="block">
                <PrimaryButton className="w-full">
                  {t('manageUsers')}
                </PrimaryButton>
              </Link>
            </div>
          </CardContent>
        </TechCard>

        {/* HPC应用管理 */}
        <TechCard className="h-full flex flex-col" hover>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 flex items-center justify-center group-hover:from-green-500/20 group-hover:to-emerald-500/20 transition-all">
                <Dna className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg font-semibold">{t('hpcAppManagement')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {t('hpcAppManagementDesc')}
            </p>
            <div className="mt-auto">
              <Link href={`/${locale}/dashboard/system/applications/management`} className="block">
                <PrimaryButton className="w-full">
                  {t('manageHpcApps')}
                </PrimaryButton>
              </Link>
            </div>
          </CardContent>
        </TechCard>

        {/* 文件权限管理 */}
        <TechCard className="h-full flex flex-col" hover>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 flex items-center justify-center group-hover:from-green-500/20 group-hover:to-emerald-500/20 transition-all">
                <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg font-semibold">{t('filePermissionsCard')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {t('filePermissionsDesc')}
            </p>
            <div className="mt-auto">
              <Link href={`/${locale}/dashboard/system/permissions/file-permissions`} className="block">
                <PrimaryButton className="w-full">
                  {t('manageFilePermissions')}
                </PrimaryButton>
              </Link>
            </div>
          </CardContent>
        </TechCard>

        {/* 公告管理 */}
        <TechCard className="h-full flex flex-col" hover>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 flex items-center justify-center group-hover:from-green-500/20 group-hover:to-emerald-500/20 transition-all">
                <Bell className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg font-semibold">{t('announcements')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {t('announcementsDesc')}
            </p>
            <div className="mt-auto">
              <Link href={`/${locale}/dashboard/system/announcements`} className="block">
                <PrimaryButton className="w-full">
                  {t('manageAnnouncements')}
                </PrimaryButton>
              </Link>
            </div>
          </CardContent>
        </TechCard>

        {/* 系统日志 */}
        <TechCard className="h-full flex flex-col" hover>
          <CardHeader className="pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 flex items-center justify-center group-hover:from-green-500/20 group-hover:to-emerald-500/20 transition-all">
                <FileText className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg font-semibold">{t('systemLogsCard')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed flex-1">
              {t('systemLogsDesc')}
            </p>
            <div className="mt-auto">
              <Link href={`/${locale}/dashboard/system/logs`} className="block">
                <SecondaryButton className="w-full">
                  {t('viewLogs')}
                </SecondaryButton>
              </Link>
            </div>
          </CardContent>
        </TechCard>
      </div>

      {/* 快速操作 */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('quickActions')}</h2>

        {/* 同步统计信息 */}
        {syncStats && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>最后同步:</strong> 更新 {syncStats.updated} 个作业
              {syncStats.staleJobsFixed > 0 && ` · 修复 ${syncStats.staleJobsFixed} 个过期作业`}
              {syncStats.newJobs > 0 && ` · 新增 ${syncStats.newJobs} 个作业`}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors dark:text-gray-200"
            onClick={() => handleQuickAction('refresh')}
            disabled={refreshing === 'refresh'}
          >
            <RefreshCw className={`w-4 h-4 text-blue-600 ${refreshing === 'refresh' ? 'animate-spin' : ''}`} />
            <span className="text-xs dark:text-gray-300">{t('refreshPage')}</span>
          </Button>

          {/* 智能同步 */}
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-cyan-400 dark:hover:border-cyan-500 transition-colors dark:text-gray-200"
            onClick={() => handleQuickAction('smartSync')}
            disabled={refreshing === 'smartSync'}
            title="智能同步作业状态 (快速)"
          >
            <RotateCcw className={`w-4 h-4 text-cyan-600 ${refreshing === 'smartSync' ? 'animate-spin' : ''}`} />
            <span className="text-xs dark:text-gray-300">智能同步</span>
          </Button>

          {/* 强制同步 */}
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors dark:text-gray-200"
            onClick={() => handleQuickAction('forceSync')}
            disabled={refreshing === 'forceSync'}
            title="强制全量同步 (较慢)"
          >
            <Server className={`w-4 h-4 text-indigo-600 ${refreshing === 'forceSync' ? 'animate-spin' : ''}`} />
            <span className="text-xs dark:text-gray-300">强制同步</span>
          </Button>

          {/* 修复过期作业 */}
          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-yellow-400 dark:hover:border-yellow-500 transition-colors dark:text-gray-200"
            onClick={() => handleQuickAction('fixStaleJobs')}
            disabled={refreshing === 'fixStaleJobs'}
            title="检测并修复过期的 RUNNING/PENDING 作业"
          >
            <Zap className={`w-4 h-4 text-yellow-600 ${refreshing === 'fixStaleJobs' ? 'animate-pulse' : ''}`} />
            <span className="text-xs dark:text-gray-300">修复作业</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-green-400 dark:hover:border-green-500 transition-colors dark:text-gray-200"
            onClick={() => handleQuickAction('cache')}
            disabled={refreshing === 'cache'}
          >
            <Database className={`w-4 h-4 text-green-600 ${refreshing === 'cache' ? 'animate-pulse' : ''}`} />
            <span className="text-xs dark:text-gray-300">{t('clearCache')}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-purple-400 dark:hover:border-purple-500 transition-colors dark:text-gray-200"
            onClick={() => handleQuickAction('security')}
            disabled={refreshing === 'security'}
          >
            <Shield className={`w-4 h-4 text-purple-600 ${refreshing === 'security' ? 'animate-pulse' : ''}`} />
            <span className="text-xs dark:text-gray-300">{t('securityCheck')}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-auto py-3 px-4 flex flex-col items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-orange-400 dark:hover:border-orange-500 transition-colors dark:text-gray-200"
            onClick={() => handleQuickAction('optimize')}
            disabled={refreshing === 'optimize'}
          >
            <HardDrive className={`w-4 h-4 text-orange-600 ${refreshing === 'optimize' ? 'animate-pulse' : ''}`} />
            <span className="text-xs dark:text-gray-300">{t('systemOptimization')}</span>
          </Button>

          <Link href={`/${locale}/dashboard/system/logs`} className="w-full">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-auto py-3 px-4 flex flex-col items-center gap-2 border-gray-300 dark:border-gray-600 hover:bg-white dark:hover:bg-gray-700 hover:border-red-400 dark:hover:border-red-500 transition-colors dark:text-gray-200"
            >
              <Monitor className="w-4 h-4 text-red-600" />
              <span className="text-xs dark:text-gray-300">{t('systemMonitor')}</span>
            </Button>
          </Link>

        </div>
      </div>
    </div>
  )
}