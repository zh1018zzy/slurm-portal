"use client"
import { useState, useEffect, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Calendar } from 'lucide-react'
import { authFetch } from '@/lib/utils'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'

interface TrendData {
  date: string
  submitted: number
  completed: number
  failed: number
  cancelled: number
  running: number
  pending: number
}

interface TrendChartProps {
  dateRange?: string
  userId?: string
  height?: number
}

const COLORS = {
  submitted: '#3b82f6',
  completed: '#10b981',
  failed: '#ef4444',
  cancelled: '#6b7280',
  running: '#f59e0b',
  pending: '#8b5cf6'
}

export function JobsTrendChart({ dateRange = '30days', userId, height = 400 }: TrendChartProps) {
  const [data, setData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [chartType, setChartType] = useState<'line' | 'bar' | 'area'>('line')
  const t = useT('dashboard.jobTrendChart')
  const locale = useLocale()

  // Parse dateRange prop to actual number of days
  const actualDays = useMemo(() => {
    if (!dateRange) return 30
    const match = dateRange.match(/^(\d+)days?$/)
    return match ? parseInt(match[1]) : 30
  }, [dateRange])

  // Fetch trend data
  useEffect(() => {
    async function fetchTrendData() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          days: actualDays.toString()
        })

        if (userId) {
          params.set('user', userId)
        }

        const res = await authFetch(`/api/jobs/trend?${params}`)
        const result = await res.json()

        if (result.success) {
          setData(result.trend || [])
        } else {
          setError(result.error || t('dataFetchFailed'))
        }
      } catch (error) {
        console.error('Failed to fetch trend data:', error)
        setError(t('networkError'))
      } finally {
        setLoading(false)
      }
    }

    fetchTrendData()
  }, [actualDays, userId, t])

  // Calculate summary data
  const summary = useMemo(() => {
    if (!data.length) return null

    const total = data.reduce((sum, item) => sum + item.submitted, 0)
    const completed = data.reduce((sum, item) => sum + item.completed, 0)
    const failed = data.reduce((sum, item) => sum + item.failed, 0)
    const cancelled = data.reduce((sum, item) => sum + item.cancelled, 0)

    return {
      total,
      completed,
      failed,
      cancelled,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      failureRate: total > 0 ? Math.round(((failed + cancelled) / total) * 100) : 0
    }
  }, [data])

  // Format date display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00') // Ensure correct date parsing
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {formatDate(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Status distribution pie chart data
  const pieData = useMemo(() => {
    if (!summary) return []

    return [
      { name: t('completed'), value: summary.completed, color: COLORS.completed },
      { name: t('failed'), value: summary.failed, color: COLORS.failed },
      { name: t('cancelled'), value: summary.cancelled, color: COLORS.cancelled }
    ].filter(item => item.value > 0)
  }, [summary, t])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">{t('loading')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-500 mb-2">{t('loadFailed')}</p>
              <p className="text-sm text-gray-500">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <p className="text-gray-500">{t('noData')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('title')}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={actualDays.toString()} disabled>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t('last7Days')}</SelectItem>
                <SelectItem value="30">{t('last30Days')}</SelectItem>
                <SelectItem value="90">{t('last90Days')}</SelectItem>
                <SelectItem value="180">{t('last180Days')}</SelectItem>
                <SelectItem value="365">{t('lastYear')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trend" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trend" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              {t('trendTab')}
            </TabsTrigger>
            <TabsTrigger value="distribution" className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4" />
              {t('distributionTab')}
            </TabsTrigger>
            <TabsTrigger value="summary" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              {t('summaryTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="space-y-4">
            <div className="flex items-center gap-4">
              <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">{t('lineChart')}</SelectItem>
                  <SelectItem value="bar">{t('barChart')}</SelectItem>
                  <SelectItem value="area">{t('areaChart')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-80">
              {chartType === 'line' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="submitted"
                      stroke={COLORS.submitted}
                      name={t('submitted')}
                      strokeWidth={2}
                      dot={{ fill: COLORS.submitted, strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="completed"
                      stroke={COLORS.completed}
                      name={t('completed')}
                      strokeWidth={2}
                      dot={{ fill: COLORS.completed, strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="failed"
                      stroke={COLORS.failed}
                      name={t('failed')}
                      strokeWidth={2}
                      dot={{ fill: COLORS.failed, strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {chartType === 'bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="submitted" fill={COLORS.submitted} name={t('submitted')} />
                    <Bar dataKey="completed" fill={COLORS.completed} name={t('completed')} />
                    <Bar dataKey="failed" fill={COLORS.failed} name={t('failed')} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartType === 'area' && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="submitted"
                      stackId="1"
                      stroke={COLORS.submitted}
                      fill={COLORS.submitted}
                      fillOpacity={0.6}
                      name={t('submitted')}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stackId="1"
                      stroke={COLORS.completed}
                      fill={COLORS.completed}
                      fillOpacity={0.6}
                      name={t('completed')}
                    />
                    <Area
                      type="monotone"
                      dataKey="failed"
                      stackId="1"
                      stroke={COLORS.failed}
                      fill={COLORS.failed}
                      fillOpacity={0.6}
                      name={t('failed')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </TabsContent>

          <TabsContent value="distribution" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">{t('distributionDetails')}</h3>
                <div className="space-y-3">
                  {pieData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">{item.value}</div>
                        <div className="text-sm text-gray-500">
                          {summary ? Math.round((item.value / summary.total) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="space-y-4">
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <span className="font-medium">{t('totalJobs')}</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mt-2">{summary.total}</div>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="font-medium">{t('successRate')}</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mt-2">{summary.successRate}%</div>
                </div>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-red-600" />
                    <span className="font-medium">{t('failureRate')}</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600 mt-2">{summary.failureRate}%</div>
                </div>

                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-purple-600" />
                    <span className="font-medium">{t('timeRange')}</span>
                  </div>
                  <div className="text-lg font-bold text-purple-600 mt-2">
                    {actualDays === 7 && t('last7Days')}
                    {actualDays === 30 && t('last30Days')}
                    {actualDays === 90 && t('last90Days')}
                    {actualDays === 180 && t('last180Days')}
                    {actualDays === 365 && t('lastYear')}
                    {![7, 30, 90, 180, 365].includes(actualDays) && `${actualDays} ${t('days')}`}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
