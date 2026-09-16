'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Edit, Trash2, Pin, Calendar, User } from 'lucide-react'
import { useT } from '@/lib/i18n-utils'

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

interface AnnouncementListProps {
  announcements: Announcement[]
  loading: boolean
  onEdit: (announcement: Announcement) => void
  onDelete: (id: number) => Promise<void>
}

const AnnouncementItem = React.memo(function AnnouncementItem({
  announcement,
  onEdit,
  onDelete
}: {
  announcement: Announcement
  onEdit: (announcement: Announcement) => void
  onDelete: (id: number) => Promise<void>
}) {
  const t = useT('announcements')

  const typeOptions = [
    { value: 'info', label: t('types.info'), color: 'bg-blue-100 text-blue-800' },
    { value: 'warning', label: t('types.warning'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'success', label: t('types.success'), color: 'bg-green-100 text-green-800' },
    { value: 'error', label: t('types.error'), color: 'bg-red-100 text-red-800' },
    { value: 'maintenance', label: t('types.maintenance'), color: 'bg-orange-100 text-orange-800' }
  ]

  const typeOption = typeOptions.find(opt => opt.value === announcement.type)

  return (
    <div className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="font-medium">{announcement.title}</h3>
            {announcement.is_pinned && <Pin className="w-4 h-4 text-orange-500" />}
            <Badge className={typeOption?.color}>
              {typeOption?.label}
            </Badge>
            <Badge variant={announcement.is_active ? 'default' : 'secondary'}>
              {announcement.is_active ? t('status.active') : t('status.inactive')}
            </Badge>
            <Badge variant="outline">
              {t('status.priority')}: {announcement.priority}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {announcement.content}
          </p>
          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <div className="flex items-center space-x-1">
              <User className="w-3 h-3" />
              <span>{announcement.created_by}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>
                {new Date(announcement.start_time).toLocaleString('zh-CN')}
                {announcement.end_time && (
                  <> - {new Date(announcement.end_time).toLocaleString('zh-CN')}</>
                )}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(announcement)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirmDelete')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('confirmDeleteDesc', { title: announcement.title })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(announcement.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {t('delete')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  )
})

export default function AnnouncementList({
  announcements,
  loading,
  onEdit,
  onDelete
}: AnnouncementListProps) {
  const t = useT('announcements')

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('announcementList')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">{t('loading')}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('announcementListCount', { count: announcements.length })}</CardTitle>
      </CardHeader>
      <CardContent>
        {announcements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t('noAnnouncements')}
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <AnnouncementItem
                key={announcement.id}
                announcement={announcement}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}