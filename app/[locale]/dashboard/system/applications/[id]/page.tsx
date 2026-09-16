"use client"
import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, Save, ArrowLeft, Eye, EyeOff, Shield, Edit, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n-utils'

export default function ApplicationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const t = useT('system.applications.detail')
  const [loading, setLoading] = useState(true)
  const [app, setApp] = useState<any>(null)
  const [tab, setTab] = useState('info')
  const [editData, setEditData] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [permissionOpen, setPermissionOpen] = useState(false)
  const [permData, setPermData] = useState<any>(null)

  useEffect(() => {
    fetchApp()
    // eslint-disable-next-line
  }, [params.id])

  async function fetchApp() {
    setLoading(true)
    const res = await fetch(`/api/applications/${params.id}`)
    const data = await res.json()
    if (data.success) {
      setApp(data.application)
      setEditData(data.application)
    } else {
      toast({ title: t('loadFailed'), description: data.message, variant: 'destructive' })
    }
    setLoading(false)
  }

  async function saveInfo() {
    setSaving(true)
    const res = await fetch(`/api/applications/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    })
    const data = await res.json()
    if (data.success) {
      toast({ title: t('saveSuccess') })
      setApp(data.application)
    } else {
      toast({ title: t('saveFailed'), description: data.message, variant: 'destructive' })
    }
    setSaving(false)
  }

  async function saveFields() {
    setSaving(true)
    const res = await fetch(`/api/applications/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...app, fields: editData.fields })
    })
    const data = await res.json()
    if (data.success) {
      toast({ title: t('formSaved') })
      setApp(data.application)
      setEditData(data.application)
    } else {
      toast({ title: t('saveFailed'), description: data.message, variant: 'destructive' })
    }
    setSaving(false)
  }

  async function togglePublish() {
    const res = await fetch(`/api/applications/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...app, is_published: !app.is_published })
    })
    const data = await res.json()
    if (data.success) {
      toast({ title: data.application.is_published ? t('published') : t('unpublished') })
      setApp(data.application)
      setEditData(data.application)
    } else {
      toast({ title: t('operationFailed'), description: data.message, variant: 'destructive' })
    }
  }

  function openPermissionDialog() {
    setPermData({
      role_ids: app.role_ids || [],
      department_ids: app.department_ids || [],
      user_ids: app.user_ids || [],
      visible_to_all: app.visible_to_all || false
    })
    setPermissionOpen(true)
  }
  async function savePermission() {
    const res = await fetch(`/api/applications/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...app, ...permData })
    })
    const data = await res.json()
    if (data.success) {
      toast({ title: t('permissionUpdated') })
      setApp(data.application)
      setEditData(data.application)
      setPermissionOpen(false)
    } else {
      toast({ title: t('saveFailed'), description: data.message, variant: 'destructive' })
    }
  }

  if (loading || !app) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin" /></div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-100">{t('title')}</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="text-gray-100 border-gray-500 bg-gray-800 hover:bg-gray-700 hover:text-white disabled:text-gray-500 disabled:bg-gray-800 disabled:border-gray-700"
            disabled={false}
            onClick={openPermissionDialog}
          >{t('permissionManagement')}</Button>
          <Button
            variant="outline"
            className="text-gray-100 border-gray-500 bg-gray-800 hover:bg-gray-700 hover:text-white disabled:text-gray-500 disabled:bg-gray-800 disabled:border-gray-700"
            disabled={false}
          >{app.is_published ? t('unpublish') : t('publish')}</Button>
          <Button variant="ghost" className="text-gray-300 hover:text-white" onClick={() => router.back()}>{t('back')}</Button>
        </div>
      </div>
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-gray-800 rounded-lg p-1">
          <TabsTrigger value="info" className="text-gray-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md px-4 py-1">{t('appInfo')}</TabsTrigger>
          <TabsTrigger value="form" className="text-gray-100 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-md px-4 py-1">{t('formConfig')}</TabsTrigger>
        </TabsList>
        <TabsContent value="info">
          {/* 应用信息表单 */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <Label>{t('appName')} *</Label>
              <Input value={editData.name} onChange={e => setEditData((d: any) => ({ ...d, name: e.target.value }))} />
            </div>
            <div>
              <Label>{t('version')}</Label>
              <Input value={editData.version || ''} onChange={e => setEditData((d: any) => ({ ...d, version: e.target.value }))} />
            </div>
            <div>
              <Label>{t('category')}</Label>
              <Input value={editData.category || ''} onChange={e => setEditData((d: any) => ({ ...d, category: e.target.value }))} />
            </div>
            <div>
              <Label>{t('status')}</Label>
              <Select value={editData.status || 'draft'} onValueChange={v => setEditData((d: any) => ({ ...d, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{t('draft')}</SelectItem>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>{t('description')}</Label>
              <Textarea value={editData.description || ''} onChange={e => setEditData((d: any) => ({ ...d, description: e.target.value }))} rows={3} />
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={saveInfo} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {t('save')}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="form">
          <div className="flex gap-6 items-start">
            {/* 表单字段编辑区（左侧） */}
            <div className="flex-1 min-w-[340px]">
              <DraggableFieldEditor fields={editData.fields || []} setFields={fields => setEditData((d: any) => ({ ...d, fields }))} />
              <div className="flex justify-end mt-4">
                <Button className="text-white bg-blue-600 hover:bg-blue-700 rounded-md px-6 py-2" onClick={saveFields}>{t('saveForm')}</Button>
              </div>
            </div>
            {/* 脚本模板编辑区（右侧） */}
            <div className="w-1/2 max-w-xl">
              <Label className="text-gray-100">{t('scriptTemplate')}</Label>
              <Textarea
                className="font-mono min-h-[240px] bg-gray-900 text-gray-100 placeholder:text-gray-400 border border-gray-700 rounded-md"
                value={editData.script_template || ''}
                onChange={e => setEditData((d: any) => ({ ...d, script_template: e.target.value }))}
                placeholder="#SBATCH ...\nmodule load ...\n..."
              />
              <p className="text-sm text-gray-400 mt-1">
                {t('scriptTemplateHint')}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <Dialog open={permissionOpen} onOpenChange={setPermissionOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('permissionManagement')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={permData?.visible_to_all} onChange={e => setPermData((d: any) => ({ ...d, visible_to_all: e.target.checked }))} />
              <Label>{t('visibleToAll')}</Label>
            </div>
            <div>
              <Label>{t('roleIds')}</Label>
              <Input value={permData?.role_ids?.join(',') || ''} onChange={e => setPermData((d: any) => ({ ...d, role_ids: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }))} />
            </div>
            <div>
              <Label>{t('departmentIds')}</Label>
              <Input value={permData?.department_ids?.join(',') || ''} onChange={e => setPermData((d: any) => ({ ...d, department_ids: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }))} />
            </div>
            <div>
              <Label>{t('userIds')}</Label>
              <Input value={permData?.user_ids?.join(',') || ''} onChange={e => setPermData((d: any) => ({ ...d, user_ids: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPermissionOpen(false)}>{t('cancel')}</Button>
              <Button onClick={savePermission}>{t('save')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 拖拽排序字段编辑器
function DraggableFieldEditor({ fields, setFields }: { fields: any[]; setFields: (fields: any[]) => void }) {
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const t = useT('system.applications.detail')

  function handleDragStart(idx: number) {
    dragItem.current = idx
  }
  function handleDragEnter(idx: number) {
    dragOverItem.current = idx
  }
  function handleDragEnd() {
    const from = dragItem.current
    const to = dragOverItem.current
    if (from === null || to === null || from === to) return
    const updated = [...fields]
    const [removed] = updated.splice(from, 1)
    updated.splice(to, 0, removed)
    setFields(updated)
    dragItem.current = null
    dragOverItem.current = null
  }
  function updateField(idx: number, key: string, value: any) {
    setFields(fields.map((f, i) => i === idx ? { ...f, [key]: value } : f))
  }
  function addField() {
    setFields([...fields, { name: '', label: '', type: 'text', required: false }])
  }
  function removeField(idx: number) {
    setFields(fields.filter((_, i) => i !== idx))
  }
  // 表单字段类型选项
  const FIELD_TYPE_OPTIONS = [
    { value: 'text', label: t('fieldTypeText') },
    { value: 'number', label: t('fieldTypeNumber') },
    { value: 'select', label: t('fieldTypeSelect') },
    { value: 'checkbox', label: t('fieldTypeCheckbox') },
    { value: 'textarea', label: t('fieldTypeTextarea') },
    { value: 'file', label: t('fieldTypeFile') },
    { value: 'date', label: t('fieldTypeDate') },
    { value: 'divider', label: t('fieldTypeDivider') },
  ]
  return (
    <div className="space-y-2">
      {fields.map((f, i) => (
        <div
          key={i}
          className="flex gap-2 items-center cursor-move bg-gray-800 rounded p-2 text-gray-100"
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragEnter={() => handleDragEnter(i)}
          onDragEnd={handleDragEnd}
        >
          <span className="text-gray-400 cursor-grab">☰</span>
          <input className="border px-2 py-1 rounded w-24 bg-gray-900 text-gray-100 placeholder:text-gray-400 border-gray-700 focus:ring-2 focus:ring-blue-500" value={f.name} onChange={e => updateField(i, 'name', e.target.value)} placeholder={t('fieldNamePlaceholder')} />
          <input className="border px-2 py-1 rounded w-24 bg-gray-900 text-gray-100 placeholder:text-gray-400 border-gray-700 focus:ring-2 focus:ring-blue-500" value={f.label} onChange={e => updateField(i, 'label', e.target.value)} placeholder={t('fieldLabelPlaceholder')} />
          {/* 美化下拉菜单，深色高对比，圆角，hover/active */}
          <select className="border px-2 py-1 rounded bg-gray-900 text-gray-100 border-gray-700 focus:ring-2 focus:ring-blue-500 appearance-none" value={f.type} onChange={e => updateField(i, 'type', e.target.value)}>
            {FIELD_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value} className="bg-gray-900 text-gray-100 hover:bg-blue-600 hover:text-white">{opt.label}</option>
            ))}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={f.required} onChange={e => updateField(i, 'required', e.target.checked)} />
            <span className="text-gray-200">{t('required')}</span>
          </label>
          <button className="text-red-400 hover:text-red-300 font-medium" onClick={() => removeField(i)}>{t('delete')}</button>
        </div>
      ))}
      <button className="text-blue-400 hover:text-blue-300 font-medium mt-2" onClick={addField}>+ {t('addField')}</button>
    </div>
  )
} 