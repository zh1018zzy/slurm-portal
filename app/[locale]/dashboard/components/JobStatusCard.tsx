'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PlayCircle, PauseCircle, AlertCircle, Clock } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { JobInfo } from '@/lib/scheduler-types'
import { useT } from '@/lib/i18n-utils'

export function JobStatusCard() {
  const { user } = useAuth()
  const t = useT('dashboard')
  const [jobStats, setJobStats] = useState({
    running: 0,
    queued: 0,
    paused: 0,
    error: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchJobStats() {
      if (!user?.username) return

      setLoading(true)
      try {
        // Use cache API to reduce Slurm command calls
        const res = await fetch(`/api/jobs?user=${user.username}&pageSize=100&cache=true`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })
        const data = await res.json()
        if (data.success) {
          const jobs = data.jobs || []
          const stats = {
            running: jobs.filter((j: JobInfo) => j.status === 'RUNNING').length,
            queued: jobs.filter((j: JobInfo) => j.status === 'PENDING').length,
            paused: jobs.filter((j: JobInfo) => j.status === 'CANCELLED').length,
            error: jobs.filter((j: JobInfo) => j.status === 'FAILED').length
          }
          setJobStats(stats)
        }
      } catch (error) {
        console.error('Failed to fetch job status:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchJobStats()

    // Periodic refresh
    const interval = setInterval(fetchJobStats, 60000) // Increased to 60 seconds to reduce API calls
    return () => clearInterval(interval)
  }, [user?.username])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="w-6 h-6" />
            <span>{t('jobStatusCard.title')}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Clock className="w-6 h-6" />
          <span>{t('jobStatusCard.title')}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <PlayCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">{t('jobStatusCard.running')}</p>
              <p className="text-2xl font-bold">{jobStats.running}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium">{t('jobStatusCard.queued')}</p>
              <p className="text-2xl font-bold">{jobStats.queued}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <PauseCircle className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium">{t('jobStatusCard.paused')}</p>
              <p className="text-2xl font-bold">{jobStats.paused}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-medium">{t('jobStatusCard.error')}</p>
              <p className="text-2xl font-bold">{jobStats.error}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}