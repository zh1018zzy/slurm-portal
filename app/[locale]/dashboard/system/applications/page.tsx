'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { useT } from '@/lib/i18n-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Filter,
  Monitor,
  Settings,
  Terminal,
  FileText,
  Globe,
  Palette,
  Music,
  Loader2,
  Eye,
  Save,
  X,
  Users,
  Shield,
  EyeOff
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Application {
  id: string
  name: string
  description?: string
  version?: string
  icon?: string
  category?: string
  tags?: string[]
  fields: any[]
  script_template: string
  status?: string
  form_version?: string
  is_published: boolean
  role_ids?: string[]
  department_ids?: string[]
  visible_to_all: boolean
  user_ids?: string[]
  created_by?: string
  created_at: string
  updated_at: string
}

interface FieldConfig {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox'
  required: boolean
  default?: any
  description?: string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
}

export default function ApplicationsManagementPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const t = useT('system.applications')
  
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [publishedFilter, setPublishedFilter] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editingApp, setEditingApp] = useState<Application | null>(null)
  const [formData, setFormData] = useState<Partial<Application>>({
    name: '',
    description: '',
    version: '',
    category: '',
    tags: [],
    fields: [],
    script_template: '',
    status: 'draft',
    form_version: '1',
    is_published: false,
    role_ids: [],
    department_ids: [],
    visible_to_all: false,
    user_ids: []
  })
  const [currentField, setCurrentField] = useState<FieldConfig>({
    name: '',
    label: '',
    type: 'text',
    required: false,
    description: ''
  })

  // 获取应用列表
  useEffect(() => {
    fetchApplications()
  }, [])

  async function fetchApplications() {
    setLoading(true)
    try {
      const response = await fetch('/api/applications')
      const data = await response.json()
      if (data.success) {
        setApplications(data.applications || [])
      } else {
        toast({ title: t('list.fetchFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('list.networkError'), description: t('list.cannotConnect'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // 创建应用
  async function createApplication() {
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          created_by: user?.id
        })
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: t('list.createSuccess'), description: t('list.createSuccessDesc') })
        setShowCreateDialog(false)
        resetForm()
        fetchApplications()
      } else {
        toast({ title: t('list.createFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('list.networkError'), description: t('list.createFailed'), variant: 'destructive' })
    }
  }

  // 更新应用
  async function updateApplication() {
    if (!editingApp) return
    try {
      const response = await fetch(`/api/applications/${editingApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: t('list.updateSuccess'), description: t('list.updateSuccessDesc') })
        setEditingApp(null)
        resetForm()
        fetchApplications()
      } else {
        toast({ title: t('list.updateFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('list.networkError'), description: t('list.updateFailed'), variant: 'destructive' })
    }
  }

  // 删除应用
  async function deleteApplication(id: string) {
    if (!confirm(t('list.confirmDelete'))) return
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: t('list.deleteSuccess'), description: t('list.deleteSuccessDesc') })
        fetchApplications()
      } else {
        toast({ title: t('list.deleteFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('list.networkError'), description: t('list.deleteFailed'), variant: 'destructive' })
    }
  }

  // 重置表单
  function resetForm() {
    setFormData({
      name: '',
      description: '',
      version: '',
      category: '',
      tags: [],
      fields: [],
      script_template: '',
      status: 'draft',
      form_version: '1',
      is_published: false,
      role_ids: [],
      department_ids: [],
      visible_to_all: false,
      user_ids: []
    })
    setCurrentField({
      name: '',
      label: '',
      type: 'text',
      required: false,
      description: ''
    })
  }

  // 编辑应用
  function editApplication(app: Application) {
    setEditingApp(app)
    setFormData({
      name: app.name,
      description: app.description,
      version: app.version,
      category: app.category,
      tags: app.tags,
      fields: app.fields,
      script_template: app.script_template,
      status: app.status,
      form_version: app.form_version,
      is_published: app.is_published,
      role_ids: app.role_ids,
      department_ids: app.department_ids,
      visible_to_all: app.visible_to_all,
      user_ids: app.user_ids
    })
  }

  // 添加字段
  function addField() {
    if (!currentField.name || !currentField.label) {
      toast({ title: t('list.fieldIncomplete'), description: t('list.fieldIncompleteDesc'), variant: 'destructive' })
      return
    }
    
    const newField = { ...currentField }
    setFormData(prev => ({
      ...prev,
      fields: [...(prev.fields || []), newField]
    }))
    setCurrentField({
      name: '',
      label: '',
      type: 'text',
      required: false,
      description: ''
    })
  }

  // 删除字段
  function removeField(index: number) {
    setFormData(prev => ({
      ...prev,
      fields: prev.fields?.filter((_, i) => i !== index) || []
    }))
  }

  // 获取应用图标
  function getAppIcon(appName: string) {
    const iconMap: Record<string, React.ReactNode> = {
      xterm: <Terminal className="w-5 h-5" />,
      gedit: <FileText className="w-5 h-5" />,
      firefox: <Globe className="w-5 h-5" />,
      gimp: <Palette className="w-5 h-5" />,
      vlc: <Music className="w-5 h-5" />,
      libreoffice: <FileText className="w-5 h-5" />
    }
    return iconMap[appName.toLowerCase()] || <Monitor className="w-5 h-5" />
  }

  // 获取状态标签
  function getStatusBadge(app: Application) {
    const badges = []

    // 发布状态
    if (app.is_published) {
      badges.push(<Badge key="published" variant="default" className="text-xs">{t('list.published')}</Badge>)
    } else {
      badges.push(<Badge key="draft" variant="secondary" className="text-xs">{t('list.draft')}</Badge>)
    }

    // 应用状态
    if (app.status) {
      const statusMap = {
        active: { label: t('list.active'), variant: 'default' as const },
        inactive: { label: t('list.inactive'), variant: 'outline' as const },
        draft: { label: t('list.draft'), variant: 'secondary' as const }
      }
      const config = statusMap[app.status as keyof typeof statusMap] || statusMap.draft
      badges.push(<Badge key="status" variant={config.variant} className="text-xs">{config.label}</Badge>)
    }

    return <div className="flex gap-1">{badges}</div>
  }

  // 过滤应用
  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchTerm || 
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || app.category === categoryFilter
    const matchesStatus = statusFilter === 'all' || app.status === statusFilter
    const matchesPublished = publishedFilter === 'all' || 
      (publishedFilter === 'published' && app.is_published) ||
      (publishedFilter === 'unpublished' && !app.is_published)
    return matchesSearch && matchesCategory && matchesStatus && matchesPublished
  })

  // 获取分类列表
  const categories = Array.from(new Set(applications.map(app => app.category).filter(Boolean)))

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin' || user?.isSuperAdmin === true
  if (!user?.role || !isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">{t('list.insufficientPermission')}</h2>
          <p className="text-muted-foreground">{t('list.adminOnly')}</p>
        </div>
      </div>
    )
  }

  // 发布/下线操作
  async function togglePublish(app: Application) {
    try {
      const response = await fetch(`/api/applications/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...app, is_published: !app.is_published })
      })
      const data = await response.json()
      if (data.success) {
        toast({ title: app.is_published ? t('list.unpublished') : t('list.published'), description: t('list.togglePublishDesc', { name: app.name, status: app.is_published ? t('list.unpublished') : t('list.published') }) })
        fetchApplications()
      } else {
        toast({ title: t('list.operationFailed'), description: data.message, variant: 'destructive' })
      }
    } catch (error) {
      toast({ title: t('list.networkError'), description: t('list.operationFailed'), variant: 'destructive' })
    }
  }
  // 权限管理弹窗（占位，后续实现）
  function openPermissionDialog(app: Application) {
    toast({ title: t('list.permissionManagement'), description: t('list.permissionInDevelopment'), variant: 'default' })
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/system/applications/management')}
          >
            <Settings className="w-4 h-4 mr-2" />
            {t('list.hpcManagement')}
          </Button>
          <Button
            onClick={() => router.push('/dashboard/system/applications/new')}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('list.createApp')}
          </Button>
        </div>
      </div>
      {/* 搜索和过滤 */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder={t('list.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-32">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('list.allCategories')}</SelectItem>
                  {categories.filter(category => category).map(category => (
                    <SelectItem key={category} value={category!}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('list.allStatus')}</SelectItem>
                  <SelectItem value="active">{t('list.active')}</SelectItem>
                  <SelectItem value="inactive">{t('list.inactive')}</SelectItem>
                  <SelectItem value="draft">{t('list.draft')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Select value={publishedFilter} onValueChange={setPublishedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('list.allPublished')}</SelectItem>
                  <SelectItem value="published">{t('list.published')}</SelectItem>
                  <SelectItem value="unpublished">{t('list.unpublished')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* 应用列表 */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">{t('list.appList')} ({filteredApplications.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('list.noApps')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('list.application')}</TableHead>
                  <TableHead>{t('list.category')}</TableHead>
                  <TableHead>{t('list.status')}</TableHead>
                  <TableHead>{t('list.permission')}</TableHead>
                  <TableHead>{t('list.fieldCount')}</TableHead>
                  <TableHead>{t('list.createTime')}</TableHead>
                  <TableHead>{t('list.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {getAppIcon(app.name)}
                        <div>
                          <div className="font-medium">{app.name}</div>
                          <div className="text-sm text-muted-foreground">{app.description}</div>
                          {app.version && (
                            <div className="text-xs text-gray-400">v{app.version}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{app.category || '-'}</TableCell>
                    <TableCell>{getStatusBadge(app)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {app.visible_to_all ? (
                          <Badge variant="outline" className="text-green-600">
                            <Eye className="w-3 h-3 mr-1" />
                            {t('list.everyone')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-blue-600">
                            <Shield className="w-3 h-3 mr-1" />
                            {t('list.restricted')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{app.fields?.length || 0}</TableCell>
                    <TableCell>{new Date(app.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/dashboard/system/applications/${app.id}`)}>
                          <Edit className="w-4 h-4" /> {t('list.edit')}
                        </Button>
                        <Button size="sm" variant={app.is_published ? 'secondary' : 'default'} onClick={() => togglePublish(app)}>
                          {app.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          {app.is_published ? t('list.unpublish') : t('list.publish')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openPermissionDialog(app)}>
                          <Shield className="w-4 h-4" /> {t('list.permission')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => deleteApplication(app.id)}>
                          <Trash2 className="w-4 h-4" /> {t('list.delete')}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 