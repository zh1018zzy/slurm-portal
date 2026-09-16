'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import AdminProtected from '@/components/AdminProtected'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Plus, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { toast } from '@/hooks/use-toast'
import { useT } from '@/lib/i18n-utils'

// 动态导入重型组件
const AnnouncementForm = dynamic(() => import('./components/AnnouncementForm'), {
  loading: () => (
    <div className="py-8">
      <LoadingSpinner size="lg" text="加载表单..." />
    </div>
  ),
  ssr: false
})

const AnnouncementList = dynamic(() => import('./components/AnnouncementList'), {
  loading: () => (
    <div className="py-8">
      <LoadingSpinner size="lg" text="加载公告列表..." />
    </div>
  ),
  ssr: false
})

interface Announcement {
  id: number
  title: string
  content: string
  type: 'info' | 'warning' | 'success' | 'error' | 'maintenance'
  priority: number
  is_active: boolean
  is_pinned: boolean
  start_time: string
  end_time?: string
  created_by: string
  created_at: string
  updated_at: string
}

export default function AnnouncementsPage() {
  const t = useT('announcements')
  const tCommon = useT('common')
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const { user } = useAuth()

  // 延迟初始化
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialized(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 获取公告列表
  const fetchAnnouncements = useCallback(async () => {
    if (!initialized) return
    
    try {
      setLoading(true)
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch('/api/announcements?all=true&cache=true', {
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
        const error = await response.json()
        toast({
          title: tCommon('error'),
          description: error.error || t('toast.fetchError'),
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching announcements:', error)
      toast({
        title: tCommon('error'),
        description: t('toast.fetchError'),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [initialized])

  useEffect(() => {
    fetchAnnouncements()
  }, [fetchAnnouncements])

  // 提交表单
  const handleSubmit = useCallback(async (formData: any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const url = editingAnnouncement 
        ? `/api/announcements/${editingAnnouncement.id}`
        : '/api/announcements'
      
      const method = editingAnnouncement ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast({
            title: tCommon('success'),
            description: editingAnnouncement ? t('toast.updateSuccess') : t('toast.createSuccess')
          })
          setEditingAnnouncement(null)
          await fetchAnnouncements()
        } else {
          throw new Error(data.error || t('toast.operationFailed'))
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || t('toast.operationFailed'))
      }
    } catch (error: any) {
      console.error('Error submitting announcement:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('toast.operationFailed'),
        variant: 'destructive'
      })
      throw error
    }
  }, [editingAnnouncement, fetchAnnouncements])

  // 删除公告
  const handleDelete = useCallback(async (id: number) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) return

      const response = await fetch(`/api/announcements/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          toast({
            title: tCommon('success'),
            description: t('toast.deleteSuccess')
          })
          // 立即从本地状态移除已删除的公告
          setAnnouncements(prev => prev.filter(a => a.id !== id))
          // 然后刷新获取最新数据（不使用缓存）
          const freshResponse = await fetch('/api/announcements?all=true', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (freshResponse.ok) {
            const freshData = await freshResponse.json()
            if (freshData.success) {
              setAnnouncements(freshData.announcements || [])
            }
          }
        } else {
          throw new Error(data.error || t('toast.operationFailed'))
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || t('toast.operationFailed'))
      }
    } catch (error: any) {
      console.error('Error deleting announcement:', error)
      toast({
        title: tCommon('error'),
        description: error.message || t('toast.operationFailed'),
        variant: 'destructive'
      })
    }
  }, [])

  // 编辑公告
  const handleEdit = useCallback((announcement: Announcement) => {
    setEditingAnnouncement(announcement)
    setIsDialogOpen(true)
  }, [])

  // 新建公告
  const handleCreate = useCallback(() => {
    setEditingAnnouncement(null)
    setIsDialogOpen(true)
  }, [])

  if (!initialized) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <AdminProtected>
      <div className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('subtitle')}
            </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => fetchAnnouncements()}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('refresh')}
          </Button>
          <AnnouncementForm
            editingAnnouncement={editingAnnouncement}
            isDialogOpen={isDialogOpen}
            setIsDialogOpen={setIsDialogOpen}
            onSubmit={handleSubmit}
            trigger={
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                {t('create')}
              </Button>
            }
          />
        </div>
      </div>

      <AnnouncementList
        announcements={announcements}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      </div>
    </AdminProtected>
  )
}