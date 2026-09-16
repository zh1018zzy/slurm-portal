'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Pin } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { TechCard } from '@/components/ui/tech-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'

interface Announcement {
  id: number
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error' | 'maintenance'
  priority: number
  is_pinned: boolean
  start_time: string
  end_time?: string
  created_by: string
  created_at: string
}

const typeConfig = {
  info: {
    icon: 'ℹ️',
    textColor: 'text-blue-900 dark:text-blue-100'
  },
  warning: {
    icon: '⚠️',
    textColor: 'text-yellow-900 dark:text-yellow-100'
  },
  success: {
    icon: '✅',
    textColor: 'text-green-900 dark:text-green-100'
  },
  error: {
    icon: '❌',
    textColor: 'text-red-900 dark:text-red-100'
  },
  maintenance: {
    icon: '🔧',
    textColor: 'text-orange-900 dark:text-orange-100'
  }
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [isVisible, setIsVisible] = useState(true)
  const { user } = useAuth()
  const t = useT('dashboard.announcement')
  const locale = useLocale()

  useEffect(() => {
    // Temporarily remove date check to ensure component displays properly
    fetchAnnouncements()
  }, [])

  // Monitor user login status changes, clear records on re-login
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' && e.newValue) {
        // User re-logged in, clear announcement display records
        localStorage.removeItem('announcementsLastShown')
      }
    }

    // Monitor storage changes from other tabs
    window.addEventListener('storage', handleStorageChange)

    // Check current token changes
    const currentToken = localStorage.getItem('token')
    if (currentToken) {
      // If current token exists, check if records need clearing
      const lastToken = sessionStorage.getItem('lastToken')
      if (lastToken && lastToken !== currentToken) {
        // Token changed, might be a re-login
        localStorage.removeItem('announcementsLastShown')
      }
      sessionStorage.setItem('lastToken', currentToken)
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Temporarily removed auto-close logic
  // useEffect(() => {
  //   // Auto close announcement after 10 seconds
  //   if (announcements.length > 0 && isVisible) {
  //     const timer = setTimeout(() => {
  //       setIsVisible(false)
  //     }, 10000)
  //
  //     return () => clearTimeout(timer)
  //   }
  // }, [announcements, isVisible])

  const fetchAnnouncements = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await fetch('/api/announcements?cache=true', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setAnnouncements(data.announcements || [])
        }
      } else {
        console.error('Failed to fetch announcements:', response.status)
      }
    } catch (error) {
      console.error('Failed to fetch announcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = (id: number) => {
    setDismissed(prev => new Set(prev).add(id))
  }

  // Get type label
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'maintenance': return t('typeMaintenance')
      case 'warning': return t('typeWarning')
      case 'success': return t('typeSuccess')
      case 'error': return t('typeError')
      default: return t('typeInfo')
    }
  }

  // Filter undismissed announcements
  const visibleAnnouncements = announcements.filter(ann => !dismissed.has(ann.id))

  if (loading) {
    return <div className="p-4 text-center text-sm text-gray-500">{t('loading')}</div>
  }

  if (visibleAnnouncements.length === 0) {
    return <div className="p-4 text-center text-sm text-gray-500">{t('noAnnouncements')}</div>
  }

  return (
    <div className="transition-all duration-500 ease-in-out">
      {/* Announcement panel - suitable for right sidebar display */}
      <TechCard className="overflow-hidden shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900" hover>
        {/* Announcement title bar */}
        <CardHeader className="pb-3 bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 dark:from-green-500/20 dark:via-emerald-500/20 dark:to-teal-500/20 border-b border-green-200/50 dark:border-green-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{t('title')}</h3>
            </div>
            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              {visibleAnnouncements.length} {t('count')}
            </Badge>
          </div>
        </CardHeader>

        {/* Announcement content area */}
        <CardContent className="p-0">
          {visibleAnnouncements.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('noAnnouncements')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {visibleAnnouncements.map((announcement, index) => {
                const config = typeConfig[announcement.type]
                return (
                  <div key={announcement.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Announcement title row */}
                    <div className="flex items-start space-x-3 mb-3">
                      <span className="text-xl mt-0.5 flex-shrink-0">{config.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`${config.textColor} font-semibold text-sm leading-tight mb-1`}>
                          {announcement.title}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={announcement.type === 'maintenance' || announcement.type === 'error' ? 'destructive' : 'secondary'}
                            className="text-xs px-2 py-0.5 h-5"
                          >
                            {getTypeLabel(announcement.type)}
                          </Badge>
                          {announcement.is_pinned && (
                            <div className="flex items-center space-x-1 text-orange-500">
                              <Pin className="w-3 h-3" />
                              <span className="text-xs">{t('pinned')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Announcement content */}
                    <div className={`${config.textColor} text-sm leading-relaxed mb-3 ml-11`}>
                      {announcement.content}
                    </div>

                    {/* Announcement metadata and actions */}
                    <div className="ml-11 flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>
                          {new Date(announcement.created_at).toLocaleString(locale, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDismiss(announcement.id)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>{t('close')}</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </TechCard>
    </div>
  )
}
