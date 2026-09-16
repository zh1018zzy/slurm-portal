'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
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

interface AnnouncementFormProps {
  editingAnnouncement: Announcement | null
  isDialogOpen: boolean
  setIsDialogOpen: (open: boolean) => void
  onSubmit: (formData: any) => Promise<void>
  trigger: React.ReactNode
}

export default function AnnouncementForm({
  editingAnnouncement,
  isDialogOpen,
  setIsDialogOpen,
  onSubmit,
  trigger
}: AnnouncementFormProps) {
  const t = useT('announcements')
  const tCommon = useT('common')

  const typeOptions = [
    { value: 'info', label: t('types.info') },
    { value: 'warning', label: t('types.warning') },
    { value: 'success', label: t('types.success') },
    { value: 'error', label: t('types.error') },
    { value: 'maintenance', label: t('types.maintenance') }
  ]
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'info' as 'info' | 'warning' | 'success' | 'error' | 'maintenance',
    priority: 0,
    is_active: true,
    is_pinned: false,
    start_time: new Date().toISOString().slice(0, 16),
    end_time: ''
  })

  React.useEffect(() => {
    if (editingAnnouncement) {
      setFormData({
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        type: editingAnnouncement.type,
        priority: editingAnnouncement.priority,
        is_active: editingAnnouncement.is_active,
        is_pinned: editingAnnouncement.is_pinned,
        start_time: editingAnnouncement.start_time.slice(0, 16),
        end_time: editingAnnouncement.end_time?.slice(0, 16) || ''
      })
    } else {
      setFormData({
        title: '',
        content: '',
        type: 'info',
        priority: 0,
        is_active: true,
        is_pinned: false,
        start_time: new Date().toISOString().slice(0, 16),
        end_time: ''
      })
    }
  }, [editingAnnouncement, isDialogOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: tCommon('error'),
        description: t('form.emptyError'),
        variant: 'destructive'
      })
      return
    }

    try {
      await onSubmit(formData)
      setIsDialogOpen(false)
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingAnnouncement ? t('edit') : t('create')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">{t('form.title')}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('form.titlePlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="content">{t('form.content')}</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder={t('form.contentPlaceholder')}
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">{t('form.type')}</Label>
              <Select
                value={formData.type}
                onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {typeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">{t('form.priority')}</Label>
              <Input
                id="priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
                min="0"
                max="100"
                placeholder={t('form.priorityPlaceholder')}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">{t('form.startTime')}</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="end_time">{t('form.endTime')}</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">{t('form.active')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_pinned"
                checked={formData.is_pinned}
                onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, is_pinned: checked }))}
              />
              <Label htmlFor="is_pinned">{t('form.pinned')}</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('cancel')}
            </Button>
            <Button type="submit">
              {editingAnnouncement ? t('update') : tCommon('submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}