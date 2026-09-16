'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { BarChart3, TrendingUp, Calendar, Download, Cpu, Clock, Users, Activity } from 'lucide-react'
import Link from 'next/link'
import { JobsTrendChart } from '@/components/dashboard/JobsTrendChart'
import { useT } from '@/lib/i18n-utils'

export default function JobsReportsPage() {
  const { user } = useAuth()
  const t = useT('jobsReports')
  const tJobs = useT('jobs')
  const tCommon = useT('common')
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<string>('30days')
  const [reportData, setReportData] = useState({
    summary: {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      cancelledJobs: 0,
      avgRunTime: 0,
      totalCpuHours: 0
    },
    trends: [],
    partitionStats: [],
    userStats: []
  })

  // 获取报表数据
  useEffect(() => {
    async function fetchReportData() {
      setLoading(true)
      try {
        const params = new URLSearchParams({
          dateFilter: dateRange,
          report: 'true'
        })
        
        if (user?.role !== 'admin' && user?.username) {
          params.set('user', user.username)
        }
        
        const res = await fetch(`/api/jobs/stats?${params}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        })
        
        const data = await res.json()
        
        if (data.success) {
          setReportData(data.reportData || {
            summary: {
              totalJobs: 0,
              completedJobs: 0,
              failedJobs: 0,
              cancelledJobs: 0,
              avgRunTime: 0,
              totalCpuHours: 0
            },
            trends: [],
            partitionStats: [],
            userStats: []
          })
        } else {
          toast({ title: t('fetchReportDataFailed'), description: data.message, variant: 'destructive' })
        }
      } catch (error) {
        toast({ title: t('networkError'), description: t('cannotConnectToServer'), variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    
    fetchReportData()
  }, [dateRange, user])

  // {t('buttons.exportReport')}
  const handleExportReport = async () => {
    try {
              const params = new URLSearchParams({
          dateFilter: dateRange,
          export: 'true'
        })
      
      if (user?.role !== 'admin' && user?.username) {
        params.set('user', user.username)
      }
      
      const res = await fetch(`/api/jobs/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })
      
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        
        // 使用安全的下载函数
        const { safeDownloadFile } = await import('@/lib/dom-utils');
        const filename = `jobs-report-${dateRange}-${new Date().toISOString().split('T')[0]}.csv`
        safeDownloadFile(url, filename)
        window.URL.revokeObjectURL(url)
        
        toast({ title: tCommon('success'), description: t('exportSuccess') })
      } else {
        throw new Error(t('exportFailed'))
      }
    } catch (error) {
      toast({ title: t('exportFailed'), description: t('networkError'), variant: 'destructive' })
    }
  }

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    return `${hours}h ${mins}m`
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportReport}
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-2" />
            {t('buttons.exportReport')}
          </Button>
          <Link href="/dashboard/jobs">
            <Button variant="outline">
              <Activity className="w-4 h-4 mr-2" />
              {t('license.backToJobList')}
            </Button>
          </Link>
        </div>
      </div>

      {/* 时间范围选择 */}
      <TechCard className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">{t('timeRangeLabel')}</label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">{t('timeRanges.last7Days')}</SelectItem>
                <SelectItem value="30days">{t('timeRanges.last30Days')}</SelectItem>
                <SelectItem value="90days">{t('timeRanges.last90Days')}</SelectItem>
                <SelectItem value="180days">{t('timeRanges.last180Days')}</SelectItem>
                <SelectItem value="365days">{t('timeRanges.lastYear')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </TechCard>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 总体统计 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TechCard>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900">
                    <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('overview.totalJobs')}</p>
                    <p className="text-2xl font-bold">{reportData.summary?.totalJobs || 0}</p>
                  </div>
                </div>
              </CardContent>
            </TechCard>
            
            <TechCard>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg dark:bg-green-900">
                    <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('overview.successRate')}</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatPercentage(reportData.summary?.completedJobs || 0, reportData.summary?.totalJobs || 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </TechCard>
            
            <TechCard>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg dark:bg-orange-900">
                    <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('overview.avgRunTime')}</p>
                    <p className="text-2xl font-bold">{formatTime(reportData.summary?.avgRunTime || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </TechCard>
            
            <TechCard>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900">
                    <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('overview.totalCpuHours')}</p>
                    <p className="text-2xl font-bold">{(reportData.summary?.totalCpuHours || 0).toFixed(1)}</p>
                  </div>
                </div>
              </CardContent>
            </TechCard>
          </div>

          {/* {t('statusDistribution.title')} */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TechCard hover>
          <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  {t('statusDistribution.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t('statusDistribution.completed')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: formatPercentage(reportData.summary?.completedJobs || 0, reportData.summary?.totalJobs || 0) }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {reportData.summary?.completedJobs || 0} ({formatPercentage(reportData.summary?.completedJobs || 0, reportData.summary?.totalJobs || 0)})
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t('statusDistribution.failed')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: formatPercentage(reportData.summary?.failedJobs || 0, reportData.summary?.totalJobs || 0) }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {reportData.summary?.failedJobs || 0} ({formatPercentage(reportData.summary?.failedJobs || 0, reportData.summary?.totalJobs || 0)})
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{t('statusDistribution.cancelled')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-500 h-2 rounded-full"
                          style={{ width: formatPercentage(reportData.summary?.cancelledJobs || 0, reportData.summary?.totalJobs || 0) }}
                        />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {reportData.summary?.cancelledJobs || 0} ({formatPercentage(reportData.summary?.cancelledJobs || 0, reportData.summary?.totalJobs || 0)})
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </TechCard>

            {/* {t('partitionUsage.title')} */}
        <TechCard hover>
          <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  {t('partitionUsage.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {reportData.partitionStats?.length > 0 ? (
                    reportData.partitionStats.map((partition: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="text-sm font-medium">{partition.partition}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full" 
                              style={{ width: `${(partition.total / (reportData.summary?.totalJobs || 1) * 100).toFixed(1)}%` }}
                            />
                          </div>
                          <span className="text-sm w-12 text-right">{partition.total}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-4">{t('partitionNoData')}</div>
                  )}
                </div>
              </CardContent>
            </TechCard>
          </div>

          {/* 作业趋势图 */}
          <JobsTrendChart 
            dateRange={dateRange} 
            userId={user?.role !== 'admin' ? user?.username : undefined}
          />



          {/* {t('userUsage.title')} (仅管理员可见) */}
          {user?.role === 'admin' && reportData.userStats?.length > 0 && (
        <TechCard hover>
          <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {t('userUsage.title')} (TOP 10)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">{t('userUsage.username')}</th>
                        <th className="text-left p-2">{t('userUsage.jobCount')}</th>
                        <th className="text-left p-2">{t('overview.successRate')}</th>
                        <th className="text-left p-2">{t('userUsage.cpuHours')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.userStats.slice(0, 10).map((userStat: any, index: number) => {
                        const successRate = userStat.total > 0 ? (userStat.completed / userStat.total * 100) : 0
                        const cpuHours = userStat.completed * 2 // 简化计算，假设每个作业平均2小时
                        return (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{userStat.user}</td>
                            <td className="p-2">{userStat.total}</td>
                            <td className="p-2">
                              <span className={successRate > 80 ? 'text-green-600' : successRate > 60 ? 'text-yellow-600' : 'text-red-600'}>
                                {successRate.toFixed(1)}%
                              </span>
                            </td>
                            <td className="p-2">{cpuHours.toFixed(1)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </TechCard>
          )}
        </div>
      )}
    </div>
  )
}