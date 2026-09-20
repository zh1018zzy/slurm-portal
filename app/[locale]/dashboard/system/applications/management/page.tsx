'use client'

import React, { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useAuth } from '@/hooks/use-auth'
import AdminProtected from '@/components/AdminProtected'
import { useToast } from '@/hooks/use-toast'
import { useT } from '@/lib/i18n-utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { 
  Search, 
  Settings, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Loader2,
  Database,
  Cpu,
  Zap,
  Monitor,
  Terminal,
  BookOpen,
  Dna,
  Image as ImageIcon,
  Upload,
  Link,
  Palette,
  Menu,
  Settings as Star,
  Clock,
  FileText
} from 'lucide-react'
import { HpcApplicationSpec, ApplicationCategory } from '@/lib/hpc-application-spec'
import { VersionManager } from '@/components/application-management/version-manager'
import { UnifiedLayoutDesigner } from '@/components/applications/UnifiedLayoutDesigner'
import ApplicationAccessControl from '@/components/application-management/ApplicationAccessControl'
import { generateDefaultLayout } from '@/lib/simple-form-layout'

interface ApplicationManagementProps {}

export default function ApplicationManagement({}: ApplicationManagementProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const t = useT('system.applications.management')

  const [applications, setApplications] = useState<HpcApplicationSpec[]>([])
  const [filteredApps, setFilteredApps] = useState<HpcApplicationSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApp, setSelectedApp] = useState<HpcApplicationSpec | null>(null)
  const [viewMode, setViewMode] = useState<'view' | 'edit' | 'versions'>('view')
  const [isSaveAs, setIsSaveAs] = useState(false)
  const [isNewApplication, setIsNewApplication] = useState(false)
  
  // 权限设置状态
  const [showAccessControl, setShowAccessControl] = useState(false)
  const [accessControlApp, setAccessControlApp] = useState<HpcApplicationSpec | null>(null)

  useEffect(() => {
    fetchApplications()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let filtered = applications
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(app => 
        app.metadata.name.toLowerCase().includes(term) ||
        app.metadata.displayName?.toLowerCase().includes(term) ||
        app.metadata.description.toLowerCase().includes(term) ||
        app.metadata.tags.some(tag => tag.toLowerCase().includes(term))
      )
    }
    
    setFilteredApps(filtered)
  }, [applications, searchTerm])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      console.log('[应用管理] 开始获取应用列表...')
      
      const response = await fetch('/api/applications')
      const data = await response.json()
      
      console.log('[应用管理] API响应:', { success: data.success, count: data.data?.length || 0 })
      
      if (data.success) {
        // 确保所有应用都有 visibility 字段，兼容 access 字段
        const appsWithVisibility = (data.data || []).map((app: HpcApplicationSpec) => ({
          ...app,
          visibility: app.visibility || app.access || {
            isPublic: true,
            allowedUsers: [],
            allowedGroups: [],
            allowedDepartments: []
          }
        }))
        
        console.log('[应用管理] 设置应用列表，数量:', appsWithVisibility.length)
        setApplications(appsWithVisibility)
      } else {
        toast({
          title: t('loadFailed'),
          description: data.message || t('cannotLoadList'),
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching applications:', error)
      toast({
        title: t('networkError'),
        description: t('cannotConnect'),
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewApplication = (app: HpcApplicationSpec) => {
    setSelectedApp(app)
    setViewMode('view')
    setIsNewApplication(false)
  }

  const handleEditApplication = (app: HpcApplicationSpec) => {
    setSelectedApp(app)
    setViewMode('edit')
    setIsSaveAs(false)
    setIsNewApplication(false)
  }

  // 权限设置相关函数
  const handleManageAccess = (app: HpcApplicationSpec) => {
    setAccessControlApp(app)
    setShowAccessControl(true)
  }

  const handleSaveAccessControl = async (visibility: any) => {
    if (!accessControlApp) return false

    try {
      // 更新应用的可见性设置
      const updatedApp = {
        ...accessControlApp,
        visibility,
        originalName: accessControlApp.metadata.name,
        originalVersion: accessControlApp.metadata.version
      }

      const response = await fetch('/api/applications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedApp)
      })

      const result = await response.json()
      
      if (result.success) {
        // 刷新应用列表
        await fetchApplications()
        
        // 如果有权限变更，同步到权限表
        await syncApplicationPermissions(accessControlApp.metadata.name, visibility)
        
        return true
      } else {
        throw new Error(result.error || result.message || '更新失败')
      }
    } catch (error) {
      console.error('保存访问权限失败:', error)
      toast({
        title: t('saveFailed'),
        description: error instanceof Error ? error.message : t('unknownError'),
        variant: 'destructive'
      })
      return false
    }
  }

  // 同步权限到权限表
  const syncApplicationPermissions = async (appName: string, visibility: any) => {
    try {
      if (visibility.allowedGroups?.length > 0) {
        // 为有权限的用户组添加权限
        const response = await fetch('/api/applications/sync-permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            applicationName: appName,
            allowedGroups: visibility.allowedGroups
          })
        })

        if (!response.ok) {
          console.warn('权限同步失败，但应用更新成功')
        }
      } else {
        // 清除所有权限
        const response = await fetch('/api/applications/sync-permissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            applicationName: appName,
            allowedGroups: []
          })
        })

        if (!response.ok) {
          console.warn('权限清除失败，但应用更新成功')
        }
      }
    } catch (error) {
      console.warn('权限同步出错:', error)
    }
  }

  const handleDeleteApplication = async (app: HpcApplicationSpec) => {
    const confirmed = window.confirm(
      t('confirmDelete', { name: app.metadata.displayName || app.metadata.name })
    )
    
    if (!confirmed) return
    
    try {
      console.log('[应用管理] 开始删除应用:', { name: app.metadata.name, version: app.metadata.version })
      
      const response = await fetch(`/api/applications?name=${encodeURIComponent(app.metadata.name)}&version=${encodeURIComponent(app.metadata.version)}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      console.log('[应用管理] 删除API响应:', result)
      
      if (result.success) {
        toast({
          title: t('deleteSuccess'),
          description: t('deleteSuccessDesc')
        })
        
        // 强制刷新应用列表，清除可能的缓存
        await fetchApplications()
        
        // 如果删除的是当前选中的应用，返回列表
        if (selectedApp && selectedApp.metadata.name === app.metadata.name && selectedApp.metadata.version === app.metadata.version) {
          setSelectedApp(null)
          setIsNewApplication(false)
        }
        
        // 从本地状态中移除被删除的应用
        setApplications(prevApps => {
          const filteredApps = prevApps.filter(prevApp => 
            !(prevApp.metadata.name === app.metadata.name && prevApp.metadata.version === app.metadata.version)
          )
          console.log('[应用管理] 本地状态更新:', { 
            删除前: prevApps.length, 
            删除后: filteredApps.length,
            删除的应用: `${app.metadata.name}@${app.metadata.version}`
          })
          return filteredApps
        })
        
        // 同时更新 filteredApps 状态，确保立即生效
        setFilteredApps(prevFiltered => 
          prevFiltered.filter(prevApp => 
            !(prevApp.metadata.name === app.metadata.name && prevApp.metadata.version === app.metadata.version)
          )
        )
      } else {
        throw new Error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('Error deleting application:', error)
      toast({
        title: t('deleteFailed'),
        description: error instanceof Error ? error.message : t('unknownError'),
        variant: 'destructive'
      })
    }
  }

  const handleSaveApplication = async (updatedApp: HpcApplicationSpec) => {
    try {
      // 检查是否是编辑现有应用
      const isEditingExisting = selectedApp && 
        applications.some(app => 
          app.metadata.name === selectedApp.metadata.name && 
          app.metadata.version === selectedApp.metadata.version
        )
      
      // 如果是编辑现有应用且应用是公开状态，检查是否有实质性修改
      if (isEditingExisting && !isSaveAs) {
        const originalApp = applications.find(app => 
          app.metadata.name === selectedApp.metadata.name && 
          app.metadata.version === selectedApp.metadata.version
        )
        
        // 检查应用是否从非公开改为公开（这是允许的）
        const wasPrivate = originalApp?.visibility?.isPublic === false
        const isNowPublic = updatedApp.visibility?.isPublic !== false
        
        // 如果原来是公开的，现在还是公开的，且没有其他实质性修改，则阻止保存
        if (originalApp?.visibility?.isPublic !== false && isNowPublic) {
          // 检查是否有其他实质性修改（除了可见性设置）
          const hasSubstantialChanges = JSON.stringify({
            ...originalApp,
            visibility: updatedApp.visibility
          }) !== JSON.stringify(updatedApp)
          
          if (!hasSubstantialChanges) {
            toast({
              title: t('saveBlocked'),
              description: t('saveBlockedDesc'),
              variant: 'destructive'
            })
            return
          }
        }
      }
      
      let response
      
      if (isSaveAs) {
        // 另存为模式，总是创建新应用
        response = await fetch('/api/applications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatedApp)
        })
      } else {
        if (isEditingExisting) {
          // 编辑现有应用，使用PUT方法并传递必要的标识信息
          response = await fetch('/api/applications', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...updatedApp,
              // 添加原始应用的标识信息用于更新
              originalName: selectedApp.metadata.name,
              originalVersion: selectedApp.metadata.version
            })
          })
        } else {
          // 创建新应用，使用POST方法
          response = await fetch('/api/applications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedApp)
          })
        }
      }

      const result = await response.json()
      
      if (result.success) {
        toast({
          title: isSaveAs ? t('saveAsSuccess') : (isEditingExisting ? t('updateSuccess') : t('createSuccess')),
          description: isSaveAs ? t('newAppCreated') : (isEditingExisting ? t('appConfigUpdated') : t('newAppCreated'))
        })
        setSelectedApp(updatedApp)
        setIsSaveAs(false)
        await fetchApplications()
      } else {
        throw new Error(result.message || result.error || t('saveFailed'))
      }
    } catch (error) {
      console.error('Error saving application:', error)
      toast({
        title: t('operationFailed'),
        description: error instanceof Error ? error.message : t('unknownError'),
        variant: 'destructive'
      })
    }
  }

  const getApplicationIcon = (category: ApplicationCategory) => {
    const iconMap = {
      [ApplicationCategory.SCIENTIFIC_COMPUTING]: <Cpu className="h-5 w-5 text-blue-600" />,
      [ApplicationCategory.MACHINE_LEARNING]: <Zap className="h-5 w-5 text-purple-600" />,
      [ApplicationCategory.VISUALIZATION]: <Monitor className="h-5 w-5 text-green-600" />,
      [ApplicationCategory.DEVELOPMENT_TOOLS]: <Terminal className="h-5 w-5 text-orange-600" />,
      [ApplicationCategory.QUANTUM_CHEMISTRY]: <BookOpen className="h-5 w-5 text-indigo-600" />,
      [ApplicationCategory.BIOINFORMATICS]: <Dna className="h-5 w-5 text-emerald-600" />
    }
    return (iconMap as any)[category] || <Settings className="h-5 w-5 text-gray-600" />
  }

  return (
    <AdminProtected>
    <div>
    {selectedApp ? (() => {
    // 如果是版本管理模式，显示版本管理器
    if (viewMode === 'versions') {
      const mockVersions = [
        {
          id: '1',
          version: '1.0.0',
          name: selectedApp.metadata.name,
          displayName: selectedApp.metadata.displayName,
          description: '初始版本',
          author: selectedApp.metadata.author || 'Unknown',
          createdAt: new Date().toISOString(),
          status: 'active' as const,
          changes: ['初始创建', '基本功能实现'],
          isPublic: selectedApp.visibility?.isPublic !== false
        }
      ]

      return (
        <div className="p-6">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedApp(null)
              setIsNewApplication(false)
              setViewMode('view')
            }}
            className="mb-6"
          >
            {t('backToList')}
          </Button>
          
          <VersionManager
            applicationName={selectedApp.metadata.displayName || selectedApp.metadata.name}
            currentVersion={selectedApp.metadata.version}
            versions={mockVersions}
            onVersionSelect={(version) => {
              console.log('选择版本:', version)
            }}
            onVersionCreate={(baseVersion, newVersion) => {
              console.log('创建新版本:', baseVersion, newVersion)
            }}
            onVersionDelete={(versionId) => {
              console.log('删除版本:', versionId)
            }}
            onVersionPublish={(versionId) => {
              console.log('发布版本:', versionId)
            }}
          />
        </div>
      )
    }

    return (
      <div className="p-6 max-w-full">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedApp(null)
              setIsNewApplication(false)
            }}
          >
            {t('backToList')}
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {getApplicationIcon(selectedApp.metadata.category)}
              {selectedApp.metadata.displayName || selectedApp.metadata.name}
            </h1>
            <p className="text-muted-foreground">{selectedApp.metadata.description}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant={viewMode === 'edit' ? 'default' : 'outline'}
              onClick={() => setViewMode(viewMode === 'view' ? 'edit' : 'view')}
            >
              {viewMode === 'view' ? <Edit className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {viewMode === 'view' ? t('edit') : t('view')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setViewMode('versions')}
            >
              <Clock className="h-4 w-4 mr-2" />
              {t('versionManagement')}
            </Button>
          </div>
        </div>

        <ApplicationDetailView 
          application={selectedApp} 
          mode={viewMode} 
          onSave={handleSaveApplication}
          isSaveAs={isSaveAs}
          onSaveAs={(app) => {
            setIsSaveAs(true)
            setSelectedApp(app)
          }}
          isNewApplication={isNewApplication}
        />
      </div>
    )
  })() : (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="default"
            onClick={() => {
              // 创建新应用的默认结构
              const newApp: HpcApplicationSpec = {
                metadata: {
                  name: 'new-application',
                  displayName: '新应用',
                  version: '1.0.0',
                  description: '新创建的应用',
                  category: ApplicationCategory.SCIENTIFIC_COMPUTING,
                  type: ['batch' as any],
                  tags: [],
                  author: '',
                  license: '',
                  icon: {
                    type: 'lucide',
                    name: 'Settings',
                    url: '',
                    color: '#6B7280'
                  }
                },
                resources: {
                  default: {
                    name: 'default',
                    nodes: 1,
                    cpusPerTask: 1,
                    memory: '8GB',
                    walltime: '1:00:00',
                    partition: 'compute'
                  },
                  profiles: []
                },
                execution: {
                  templates: [
                    {
                      name: 'default',
                      description: '默认执行模板',
                      template: '#!/bin/bash\n#SBATCH --job-name={{jobName}}\n#SBATCH --nodes={{nodes}}\n#SBATCH --cpus-per-task={{cpusPerTask}}\n#SBATCH --mem={{memory}}\n#SBATCH --time={{walltime}}\n#SBATCH --partition={{partition}}\n\n# 加载环境模块\n{{#modules}}\nmodule load {{{.}}}\n{{/modules}}\n\n# 执行应用\necho "Starting application..."\n# 在此添加具体的应用执行命令\n'
                    }
                  ]
                },
                interface: {
                  form: [
                    {
                      name: 'jobName',
                      label: '作业名称',
                      type: 'text',
                      required: true,
                      default: 'my-job',
                      description: '为此作业指定一个名称',
                      placeholder: '请输入作业名称'
                    }
                  ]
                },
                requirements: {
                  modules: [],
                  software: [],
                  containers: [],
                  installPath: '',
                  executablePath: '',
                  pathDirs: [],
                  environmentVars: {}
                },
                visibility: {
                  isPublic: true,
                  allowedUsers: [],
                  allowedGroups: [],
                  allowedDepartments: []
                }
              }
              setSelectedApp(newApp)
              setViewMode('edit')
              setIsNewApplication(true)
            }}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('addNewApp')}
          </Button>
          <Button
            variant="outline"
            onClick={fetchApplications}
            disabled={loading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t('refresh')}
          </Button>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 dark:text-white focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>



      {/* 应用列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">{t('loadingApps')}</p>
          </div>
        </div>
      ) : filteredApps.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-gray-500 dark:text-gray-400 mb-4">
            {applications.length === 0 ? t('noApps') : t('noMatchingApps')}
          </div>
          {searchTerm && (
            <Button
              variant="outline"
              onClick={() => setSearchTerm('')}
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('clearSearch')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {filteredApps.map((app, index) => (
            <TechCard key={`${app.metadata.name}@${app.metadata.version}`} className="h-full flex flex-col" hover>
              <CardHeader className="pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900 transition-colors">
                    {getApplicationIcon(app.metadata.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                      {app.metadata.displayName || app.metadata.name}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-blue-200 dark:border-blue-700">
                        {app.metadata.version}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {app.metadata.category}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2 flex-1">
                  {app.metadata.description}
                </p>
                

                
                {/* 可见性状态 */}
                <div>
                  {app.visibility?.isPublic !== false ? (
                    <Badge variant="default" className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 border-green-200 dark:border-green-700 text-xs">
                      {t('publicApp')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-200 border-orange-200 dark:border-orange-700 text-xs">
                      {t('restrictedAccess')}
                    </Badge>
                  )}
                </div>

                {/* 作者信息 */}
                {app.metadata.author && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('author')}: {app.metadata.author}
                  </div>
                )}

                {/* 操作按钮 - 统一排列在底部 */}
                <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewApplication(app)}
                      className="border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900 dark:text-gray-200"
                    >
                      <Eye className="h-3 w-3 mr-1.5" />
                      {t('view')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditApplication(app)}
                      className="border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900 dark:text-gray-200"
                    >
                      <Edit className="h-3 w-3 mr-1.5" />
                      {t('edit')}
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleManageAccess(app)}
                      className="border-gray-300 dark:border-gray-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900 dark:text-gray-200"
                    >
                      <Settings className="h-3 w-3 mr-1.5" />
                      {t('permission')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteApplication(app)
                      }}
                      className="border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900"
                    >
                      <Trash2 className="h-3 w-3 mr-1.5" />
                      {t('delete')}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </TechCard>
          ))}
        </div>
      )}
      
      {/* 权限设置弹窗 */}
      <ApplicationAccessControl
        isOpen={showAccessControl}
        onClose={() => {
          setShowAccessControl(false)
          setAccessControlApp(null)
        }}
        applicationName={accessControlApp?.metadata.name || ''}
        applicationDisplayName={accessControlApp?.metadata.displayName || accessControlApp?.metadata.name || ''}
        initialVisibility={accessControlApp?.visibility}
        onSave={handleSaveAccessControl}
      />
    </div>
    )}
    </div>
    </AdminProtected>
  )
}

// 拖拽排序的表单字段编辑器组件
function DraggableFormFieldEditor({
  fields,
  onFieldsChange
}: {
  fields: any[]
  onFieldsChange: (fields: any[]) => void
}) {
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)
  const t = useT('system.applications.management.fieldEditor')

  // 拖拽处理函数
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
    onFieldsChange(updated)
    
    dragItem.current = null
    dragOverItem.current = null
  }

  // 字段操作函数
  function updateField(idx: number, key: string, value: any) {
    const updated = fields.map((f, i) => i === idx ? { ...f, [key]: value } : f)
    onFieldsChange(updated)
  }

  function addField() {
    const newField = {
      name: 'newField',
      label: '新字段',
      type: 'text' as const,
      required: false,
      description: '',
      placeholder: ''
    }
    onFieldsChange([...fields, newField])
  }

  function removeField(idx: number) {
    onFieldsChange(fields.filter((_, i) => i !== idx))
  }

  function moveField(idx: number, direction: 'up' | 'down') {
    if ((direction === 'up' && idx === 0) || (direction === 'down' && idx === fields.length - 1)) {
      return
    }
    
    const updated = [...fields]
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[updated[idx], updated[targetIdx]] = [updated[targetIdx], updated[idx]]
    onFieldsChange(updated)
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div
          key={index}
          className="group border rounded-lg p-4 bg-white hover:shadow-md transition-shadow duration-200"
        >
          {/* 拖拽手柄区域 */}
          <div 
            className="cursor-move p-2 -m-2 rounded hover:bg-gray-50 transition-colors mb-4"
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 transition-colors">
                  ☰
                </div>
                <h4 className="font-medium">字段 {index + 1}</h4>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveField(index, 'up')}
                  disabled={index === 0}
                  className="h-8 w-8 p-0"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => moveField(index, 'down')}
                  disabled={index === fields.length - 1}
                  className="h-8 w-8 p-0"
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeField(index)}
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 字段配置表单 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700">字段名</label>
              <Input
                value={field.name}
                onChange={(e) => updateField(index, 'name', e.target.value)}
                className="mt-1"
                placeholder="例如: inputFile"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">显示标签</label>
              <Input
                value={field.label}
                onChange={(e) => updateField(index, 'label', e.target.value)}
                className="mt-1"
                placeholder="例如: 输入文件"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">字段类型</label>
              <select
                value={field.type}
                onChange={(e) => updateField(index, 'type', e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="text">文本输入</option>
                <option value="number">数字输入</option>
                <option value="textarea">多行文本</option>
                <option value="select">下拉选择</option>
                <option value="file">文件上传</option>
                <option value="checkbox">复选框</option>
              </select>
            </div>
          </div>

          {/* 字段属性配置 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700">默认值</label>
              <Input
                value={field.default || ''}
                onChange={(e) => updateField(index, 'default', e.target.value)}
                className="mt-1"
                placeholder="可选"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">占位符</label>
              <Input
                value={field.placeholder || ''}
                onChange={(e) => updateField(index, 'placeholder', e.target.value)}
                className="mt-1"
                placeholder="例如: 请输入文件路径"
              />
            </div>
          </div>

          {/* 字段描述 */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700">字段描述</label>
            <textarea
              value={field.description || ''}
              onChange={(e) => updateField(index, 'description', e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="字段的详细说明"
            />
          </div>

          {/* 字段选项 */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={field.required || false}
                onChange={(e) => updateField(index, 'required', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">必填字段</span>
            </label>

            {field.type === 'number' && (
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600">最小值</label>
                  <Input
                    type="number"
                    value={field.min || ''}
                    onChange={(e) => updateField(index, 'min', Number(e.target.value))}
                    className="mt-1 w-20"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">最大值</label>
                  <Input
                    type="number"
                    value={field.max || ''}
                    onChange={(e) => updateField(index, 'max', Number(e.target.value))}
                    className="mt-1 w-20"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 下拉选项配置 */}
          {field.type === 'select' && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">选项配置</label>
              <textarea
                value={(field.options || []).map(opt => `${opt.value}:${opt.label}`).join('\n')}
                onChange={(e) => {
                  const options = e.target.value.split('\n')
                    .filter(line => line.trim())
                    .map(line => {
                      const [value, label] = line.split(':')
                      return { value: value?.trim() || '', label: label?.trim() || value?.trim() || '' }
                    })
                  updateField(index, 'options', options)
                }}
                rows={4}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="每行一个选项，格式: value:label\n例如:\noption1:选项1\noption2:选项2"
              />
            </div>
          )}
        </div>
      ))}

      {/* 添加新字段按钮 */}
      <Button
        type="button"
        variant="outline"
        onClick={addField}
        className="w-full h-12 border-dashed border-2 border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        <Plus className="h-4 w-4 mr-2" />
        添加表单字段
      </Button>

      {/* 拖拽提示 */}
      {fields.length > 1 && (
        <div className="text-center text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
          💡 提示：拖拽字段可以调整顺序，也可以使用 ↑↓ 按钮快速调整
        </div>
      )}
    </div>
  )
}

// 应用详情查看组件
function ApplicationDetailView({ 
  application, 
  mode,
  onSave,
  isSaveAs = false,
  onSaveAs,
  isNewApplication = false
}: { 
  application: HpcApplicationSpec
  mode: 'view' | 'edit'
  onSave?: (app: HpcApplicationSpec) => void
  isSaveAs?: boolean
  onSaveAs?: (app: HpcApplicationSpec) => void
  isNewApplication?: boolean
}): React.ReactElement {
  const [editedApp, setEditedApp] = useState<HpcApplicationSpec>(application)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // 确保应用有 visibility 字段，兼容 access 字段
    const appWithVisibility = {
      ...application,
      visibility: application.visibility || (application.access ? {
        isPublic: !application.access.users && !application.access.groups && !application.access.departments,
        isActive: true,
        isListed: true,
        allowedUsers: application.access.users || [],
        allowedGroups: application.access.groups || [],
        allowedDepartments: application.access.departments || []
      } : {
        isPublic: true,
        allowedUsers: [],
        allowedGroups: [],
        allowedDepartments: []
      })
    }
    setEditedApp(appWithVisibility)
  }, [application])

  const handleSave = async () => {
    if (onSave) {
      setIsSaving(true)
      try {
        await onSave(editedApp)
      } finally {
        setIsSaving(false)
      }
    }
  }

  // 检查是否有未保存的更改
  const hasUnsavedChanges = JSON.stringify(editedApp) !== JSON.stringify(application)

  const isPublished = editedApp.visibility?.isPublic ?? true
  const isFieldDisabled = mode !== 'edit' || isPublished

  const updateMetadata = (field: string, value: any) => {
    setEditedApp(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [field]: value
      }
    }))
  }

  const updateResources = (field: string, value: any) => {
    setEditedApp(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        default: {
          ...prev.resources.default,
          [field]: value
        }
      }
    }))
  }

  return (
    <div className="space-y-6">
      {mode === 'edit' && (
        <div className="flex items-center justify-end gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => setEditedApp(application)}
          >
            重置
          </Button>
          {!isSaveAs && (
            <Button 
              type="button" 
              variant="outline"
              onClick={() => {
                // 启用另存为模式，生成新的名称和版本
                const newName = `${editedApp.metadata.name}-copy`
                const newVersion = `${editedApp.metadata.version}-copy`
                setEditedApp(prev => ({
                  ...prev,
                  metadata: {
                    ...prev.metadata,
                    name: newName,
                    version: newVersion
                  }
                }))
                if (onSaveAs) {
                  onSaveAs(editedApp)
                }
              }}
            >
              另存为
            </Button>
          )}
          <Button 
            type="button" 
            onClick={handleSave}
            disabled={isSaving || editedApp.visibility?.isPublic}
            variant="default"
          >
            {isSaving ? '保存中...' : (
              isSaveAs ? '另存为' : '保存'
            )}
          </Button>
          
          {/* 发布状态开关 */}
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">发布状态：</div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editedApp.visibility?.isPublic ?? true}
                onCheckedChange={async (checked) => {
                  if (checked && hasUnsavedChanges) {
                    // 如果要发布且有未保存的更改，先保存
                    try {
                      await handleSave() // 先保存更改
                      // 保存成功后再更新发布状态
                      setEditedApp(prev => ({
                        ...prev,
                        visibility: { 
                          ...prev.visibility, 
                          isPublic: checked
                        }
                      }))
                      // 再次保存发布状态
                      const updatedApp = {
                        ...editedApp,
                        visibility: { 
                          ...editedApp.visibility, 
                          isPublic: checked
                        }
                      }
                      await onSave(updatedApp)
                    } catch (error) {
                      // 如果保存失败，不更新状态
                      console.error('保存失败，无法发布:', error)
                      return
                    }
                  } else {
                    // 如果是取消发布或没有未保存更改，直接更新状态并保存
                    const updatedApp = {
                      ...editedApp,
                      visibility: { 
                        ...editedApp.visibility, 
                        isPublic: checked
                      }
                    }
                    setEditedApp(updatedApp)
                    
                    // 立即保存发布状态更改
                    if (onSave) {
                      onSave(updatedApp)
                    }
                  }
                }}
                disabled={isSaving}
              />
              <div className="flex items-center gap-2">
                <Badge 
                  variant={editedApp.visibility?.isPublic ? "default" : "secondary"}
                  className="text-xs"
                >
                  {editedApp.visibility?.isPublic ? '已发布' : '草稿'}
                </Badge>
                {editedApp.visibility?.isPublic && (
                  <div className="text-xs text-amber-600 font-medium">
                    · 不可编辑
                  </div>
                )}
                {hasUnsavedChanges && !editedApp.visibility?.isPublic && (
                  <div className="text-xs text-orange-600 font-medium">
                    · 有未保存更改
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 发布状态提示 */}
      {mode === 'edit' && (
        <>
          {editedApp.visibility?.isPublic && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-amber-900 mb-2">📢 应用已发布</h4>
              <p className="text-sm text-amber-800">
                当前应用已发布，对所有用户可见。发布状态下不允许编辑，请先切换为草稿状态才能修改应用配置。
              </p>
            </div>
          )}
          {!editedApp.visibility?.isPublic && hasUnsavedChanges && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-orange-900 mb-2">⚠️ 有未保存的更改</h4>
              <p className="text-sm text-orange-800">
                当前应用有未保存的更改。请先点击&ldquo;保存&rdquo;按钮保存所有修改，然后再切换发布状态。
              </p>
            </div>
          )}
        </>
      )}
      
      <Tabs defaultValue="interface" className="space-y-6">
        <TabsList>
          <TabsTrigger value="metadata">基本信息</TabsTrigger>
          <TabsTrigger value="interface">界面设计</TabsTrigger>
          <TabsTrigger value="execution">执行模板</TabsTrigger>
        </TabsList>

        <TabsContent value="metadata" className="space-y-4">
          <TechCard hover>
            <CardHeader>
              <CardTitle>应用元数据</CardTitle>
              {isNewApplication && (
                <CardDescription>
                  新建应用：您可以编辑所有字段，包括应用名称和版本。
                </CardDescription>
              )}
              {!isNewApplication && mode === 'edit' && (
                <CardDescription>
                  编辑应用：应用名称和版本不可编辑，请使用&ldquo;另存为&rdquo;功能创建副本。
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">应用名称</label>
                  {mode === 'edit' ? (
                    <Input
                      value={editedApp.metadata.name}
                      onChange={(e) => updateMetadata('name', e.target.value)}
                      className="mt-1"
                      disabled={isFieldDisabled || (!isSaveAs && !isNewApplication)}
                      title={
                        isPublished ? '已发布状态不可编辑' : 
                        (!isSaveAs && !isNewApplication ? '应用名称不可编辑，请使用"另存为"功能' : '')
                      }
                      placeholder="例如: abaqus2022, comsol62"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.metadata.name}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">显示名称</label>
                  {mode === 'edit' ? (
                    <Input
                      value={editedApp.metadata.displayName || ''}
                      onChange={(e) => updateMetadata('displayName', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.metadata.displayName || '未设置'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">版本</label>
                  {mode === 'edit' ? (
                    <Input
                      value={editedApp.metadata.version}
                      onChange={(e) => updateMetadata('version', e.target.value)}
                      className="mt-1"
                      disabled={!isSaveAs && !isNewApplication}
                      title={!isSaveAs && !isNewApplication ? '版本不可编辑，请使用"另存为"功能' : ''}
                      placeholder="例如: 1.0.0, 2.1.3"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.metadata.version}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">分类</label>
                  {mode === 'edit' ? (
                    <select
                      value={editedApp.metadata.category}
                      onChange={(e) => updateMetadata('category', e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="scientific-computing">科学计算</option>
                      <option value="machine-learning">机器学习</option>
                      <option value="deep-learning">深度学习</option>
                      <option value="quantum-chemistry">量子化学</option>
                      <option value="bioinformatics">生物信息学</option>
                      <option value="visualization">数据可视化</option>
                      <option value="cad-cae">CAD/CAE</option>
                      <option value="development-tools">开发工具</option>
                    </select>
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.metadata.category}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">作者</label>
                  {mode === 'edit' ? (
                    <Input
                      value={editedApp.metadata.author || ''}
                      onChange={(e) => updateMetadata('author', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.metadata.author || '未知'}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">许可证</label>
                  {mode === 'edit' ? (
                    <Input
                      value={editedApp.metadata.license || ''}
                      onChange={(e) => updateMetadata('license', e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.metadata.license || '未指定'}
                    </div>
                  )}
                </div>
              </div>
              
              {/* 应用图标设置 */}
              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">应用图标设置</h4>
                
                {mode === 'edit' ? (
                  <div className="space-y-4">
                    {/* 图标类型选择 */}
                    <div>
                      <label className="text-sm font-medium">图标类型</label>
                      <select
                        value={editedApp.metadata.icon?.type || 'lucide'}
                        onChange={(e) => {
                          const iconType = e.target.value as 'lucide' | 'upload' | 'emoji'
                          updateMetadata('icon', {
                            ...editedApp.metadata.icon,
                            type: iconType,
                            name: iconType === 'lucide' ? 'Settings' : '',
                            filePath: iconType === 'upload' ? '' : '',
                            emoji: iconType === 'emoji' ? '⚙️' : ''
                          })
                        }}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="lucide">Lucide 图标</option>
                        <option value="upload">上传图片</option>
                        <option value="emoji">Emoji 表情</option>
                      </select>
                    </div>
                    
                    {/* 图标预览和设置 */}
                    <div className="flex items-start gap-4">
                      <div>
                        <label className="text-sm font-medium">预览</label>
                        <div className="mt-1 w-16 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                          {editedApp.metadata.icon?.type === 'lucide' && editedApp.metadata.icon.name && (
                            React.createElement(require('lucide-react')[editedApp.metadata.icon.name] || Settings, {
                              className: "h-8 w-8",
                              style: { color: editedApp.metadata.icon.color || '#6B7280' }
                            })
                          )}
                          {editedApp.metadata.icon?.type === 'upload' && editedApp.metadata.icon.filePath && (
                            <Image 
                              src={`/api/files/uploads/${editedApp.metadata.icon.filePath}`} 
                              alt="应用图标" 
                              width={64}
                              height={64}
                              className="w-full h-full object-cover rounded"
                            />
                          )}
                          {editedApp.metadata.icon?.type === 'emoji' && (
                            <span className="text-2xl">
                              {editedApp.metadata.icon.emoji || '⚙️'}
                            </span>
                          )}
                          {(!editedApp.metadata.icon?.type || 
                            (editedApp.metadata.icon.type === 'upload' && !editedApp.metadata.icon.filePath) ||
                            (editedApp.metadata.icon.type === 'lucide' && !editedApp.metadata.icon.name)) && (
                            <ImageIcon className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        {editedApp.metadata.icon?.type === 'lucide' && (
                          <>
                            <div>
                              <label className="text-sm font-medium">Lucide 图标名</label>
                              <select
                                value={editedApp.metadata.icon.name || 'Settings'}
                                onChange={(e) => updateMetadata('icon', {
                                  ...editedApp.metadata.icon,
                                  name: e.target.value
                                })}
                                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                              >
                                <option value="Settings">Settings (设置)</option>
                                <option value="Terminal">Terminal (终端)</option>
                                <option value="Database">Database (数据库)</option>
                                <option value="Cpu">Cpu (处理器)</option>
                                <option value="Zap">Zap (闪电)</option>
                                <option value="Monitor">Monitor (显示器)</option>
                                <option value="BookOpen">BookOpen (书本)</option>
                                <option value="Dna">Dna (DNA)</option>
                                <option value="Palette">Palette (调色板)</option>
                                <option value="Image">Image (图片)</option>
                                <option value="Upload">Upload (上传)</option>
                                <option value="Link">Link (链接)</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">图标颜色</label>
                              <div className="mt-1 flex items-center gap-2">
                                <input
                                  type="color"
                                  value={editedApp.metadata.icon.color || '#6B7280'}
                                  onChange={(e) => updateMetadata('icon', {
                                    ...editedApp.metadata.icon,
                                    color: e.target.value
                                  })}
                                  className="w-10 h-8 rounded border"
                                />
                                <Input
                                  value={editedApp.metadata.icon.color || '#6B7280'}
                                  onChange={(e) => updateMetadata('icon', {
                                    ...editedApp.metadata.icon,
                                    color: e.target.value
                                  })}
                                  placeholder="#6B7280"
                                  className="flex-1"
                                />
                              </div>
                            </div>
                          </>
                        )}
                        
                        {editedApp.metadata.icon?.type === 'upload' && (
                          <div>
                            <label className="text-sm font-medium">上传图片</label>
                            <div className="mt-1 space-y-2">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/svg+xml"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    try {
                                      const formData = new FormData()
                                      formData.append('file', file)
                                      formData.append('type', 'application-icon')
                                      
                                      const response = await fetch('/api/files/upload', {
                                        method: 'POST',
                                        body: formData
                                      })
                                      
                                      // 检查响应状态
                                      if (!response.ok) {
                                        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                                      }
                                      
                                      // 检查响应内容类型
                                      const contentType = response.headers.get('content-type')
                                      if (!contentType || !contentType.includes('application/json')) {
                                        throw new Error('服务器返回的不是JSON格式数据')
                                      }
                                      
                                      const result = await response.json()
                                      if (result.success) {
                                        updateMetadata('icon', {
                                          ...editedApp.metadata.icon,
                                          filePath: result.data.filename
                                        })
                                      } else {
                                        alert('文件上传失败: ' + result.message)
                                      }
                                    } catch (error) {
                                      console.error('文件上传错误:', error)
                                      alert('文件上传失败: ' + (error instanceof Error ? error.message : String(error)))
                                    }
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                              {editedApp.metadata.icon.filePath && (
                                <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                                  <span className="text-sm text-green-800">
                                    已上传: {editedApp.metadata.icon.filePath}
                                  </span>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => updateMetadata('icon', {
                                      ...editedApp.metadata.icon,
                                      filePath: ''
                                    })}
                                  >
                                    删除
                                  </Button>
                                </div>
                              )}
                              <p className="text-xs text-gray-600">
                                支持PNG、JPG、SVG格式，建议64x64像素，文件大小小于1MB
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {editedApp.metadata.icon?.type === 'emoji' && (
                          <div>
                            <label className="text-sm font-medium">Emoji 表情</label>
                            <Input
                              value={editedApp.metadata.icon.emoji || ''}
                              onChange={(e) => updateMetadata('icon', {
                                ...editedApp.metadata.icon,
                                emoji: e.target.value
                              })}
                              placeholder="⚙️"
                              className="mt-1"
                            />
                            <p className="text-xs text-gray-600 mt-1">
                              输入一个Emoji表情作为应用图标
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 查看模式 */
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                      {application.metadata.icon?.type === 'lucide' && application.metadata.icon.name && (
                        React.createElement(require('lucide-react')[application.metadata.icon.name] || Settings, {
                          className: "h-8 w-8",
                          style: { color: application.metadata.icon.color || '#6B7280' }
                        })
                      )}
                      {application.metadata.icon?.type === 'upload' && application.metadata.icon.filePath && (
                        <Image 
                          src={`/api/files/uploads/${application.metadata.icon.filePath}`} 
                          alt="应用图标" 
                          width={64}
                          height={64}
                          className="w-full h-full object-cover rounded"
                        />
                      )}
                      {application.metadata.icon?.type === 'emoji' && (
                        <span className="text-2xl">
                          {application.metadata.icon.emoji || '⚙️'}
                        </span>
                      )}
                      {!application.metadata.icon?.type && (
                        <Settings className="h-8 w-8 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium">
                        类型: {
                          application.metadata.icon?.type === 'lucide' ? 'Lucide 图标' :
                          application.metadata.icon?.type === 'upload' ? '自定义图片' :
                          application.metadata.icon?.type === 'emoji' ? 'Emoji 表情' :
                          '默认图标'
                        }
                      </div>
                      {application.metadata.icon?.type === 'lucide' && (
                        <div className="text-xs text-gray-600">
                          图标: {application.metadata.icon.name} | 颜色: {application.metadata.icon.color}
                        </div>
                      )}
                      {(application.metadata.icon as any)?.type === 'url' && (
                        <div className="text-xs text-gray-600 break-all">
                          URL: {(application.metadata.icon as any)?.url}
                        </div>
                      )}
                      {application.metadata.icon?.type === 'emoji' && (
                        <div className="text-xs text-gray-600">
                          表情: {application.metadata.icon.emoji}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <label className="text-sm font-medium">描述</label>
                {mode === 'edit' ? (
                  <textarea
                    value={editedApp.metadata.description}
                    onChange={(e) => updateMetadata('description', e.target.value)}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                ) : (
                  <div className="mt-1 p-2 bg-gray-50 rounded border min-h-[60px]">
                    {application.metadata.description}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">应用类型</label>
                {mode === 'edit' ? (
                  <div className="mt-1 space-y-2">
                    {['batch', 'interactive', 'gui', 'web', 'mpi', 'gpu', 'jupyter'].map(type => (
                      <label key={type} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={editedApp.metadata.type.includes(type as any)}
                          onChange={(e) => {
                            const newTypes = e.target.checked
                              ? [...editedApp.metadata.type, type as any]
                              : editedApp.metadata.type.filter(t => t !== type)
                            updateMetadata('type', newTypes)
                          }}
                        />
                        <span className="text-sm">{type}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {application.metadata.type.map(type => (
                      <Badge key={type} variant="secondary">
                        {type}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">标签 (用逗号分隔)</label>
                {mode === 'edit' ? (
                  <Input
                    value={editedApp.metadata.tags.join(', ')}
                    onChange={(e) => updateMetadata('tags', e.target.value.split(',').map(tag => tag.trim()).filter(Boolean))}
                    className="mt-1"
                    placeholder="标签1, 标签2, 标签3"
                  />
                ) : (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {application.metadata.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </TechCard>
        </TabsContent>

                {/* <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>默认资源配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">节点数</label>
                  {mode === 'edit' ? (
                    <Input
                      type="number"
                      value={editedApp.resources.default.nodes}
                      onChange={(e) => updateResources('nodes', Number(e.target.value))}
                      className="mt-1"
                      min={1}
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.resources.default.nodes}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">CPU核心数</label>
                  {mode === 'edit' ? (
                    <Input
                      type="number"
                      value={editedApp.resources.default.cpusPerTask}
                      onChange={(e) => updateResources('cpusPerTask', Number(e.target.value))}
                      className="mt-1"
                      min={1}
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.resources.default.cpusPerTask}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">内存</label>
                  {mode === 'edit' ? (
                    <Input
                      value={editedApp.resources.default.memory}
                      onChange={(e) => updateResources('memory', e.target.value)}
                      className="mt-1"
                      placeholder="例如: 8GB, 16GB"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.resources.default.memory}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">运行时间</label>
                  {mode === 'edit' ? (
                    <Input
                      value={editedApp.resources.default.walltime}
                      onChange={(e) => updateResources('walltime', e.target.value)}
                      className="mt-1"
                      placeholder="格式: HH:MM:SS"
                    />
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.resources.default.walltime}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium">分区</label>
                  {mode === 'edit' ? (
                    <select
                      value={editedApp.resources.default.partition}
                      onChange={(e) => updateResources('partition', e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="compute">compute</option>
                      <option value="gpu">gpu</option>
                      <option value="highmem">highmem</option>
                      <option value="interactive">interactive</option>
                    </select>
                  ) : (
                    <div className="mt-1 p-2 bg-gray-50 rounded border">
                      {application.resources.default.memory}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </TechCard>

          <Card>
            <CardHeader>
              <CardTitle>预设配置方案</CardTitle>
              <CardDescription>
                管理和编辑应用的预设资源配置方案
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mode === 'edit' ? (
                <div className="space-y-4">
                  {(editedApp.resources.profiles || []).map((profile, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <Input
                          placeholder="配置名称"
                          value={profile.name}
                          onChange={(e) => {
                            const newProfiles = [...(editedApp.resources.profiles || [])]
                            newProfiles[index] = { ...newProfiles[index], name: e.target.value }
                            setEditedApp(prev => ({
                              ...prev,
                              resources: { ...prev.resources, profiles: newProfiles }
                            }))
                          }}
                          className="font-medium"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            const newProfiles = (editedApp.resources.profiles || []).filter((_, i) => i !== index)
                            setEditedApp(prev => ({
                              ...prev,
                              resources: { ...prev.resources, profiles: newProfiles }
                            }))
                          }}
                        >
                          删除
                        </Button>
                      </div>
                      
                      <textarea
                        placeholder="配置描述"
                        value={profile.description}
                        onChange={(e) => {
                          const newProfiles = [...(editedApp.resources.profiles || [])]
                          newProfiles[index] = { ...newProfiles[index], description: e.target.value }
                          setEditedApp(prev => ({
                            ...prev,
                            resources: { ...prev.resources, profiles: newProfiles }
                          }))
                        }}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs font-medium">节点数</label>
                          <Input
                            type="number"
                            value={profile.nodes}
                            onChange={(e) => {
                              const newProfiles = [...(editedApp.resources.profiles || [])]
                              newProfiles[index] = { ...newProfiles[index], nodes: Number(e.target.value) }
                              setEditedApp(prev => ({
                                ...prev,
                                resources: { ...prev.resources, profiles: newProfiles }
                              }))
                            }}
                            className="mt-1"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">CPU核心</label>
                          <Input
                            type="number"
                            value={profile.cpusPerTask}
                            onChange={(e) => {
                              const newProfiles = [...(editedApp.resources.profiles || [])]
                              newProfiles[index] = { ...newProfiles[index], cpusPerTask: Number(e.target.value) }
                              setEditedApp(prev => ({
                                ...prev,
                                resources: { ...prev.resources, profiles: newProfiles }
                              }))
                            }}
                            className="mt-1"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">内存</label>
                          <Input
                            value={profile.memory}
                            onChange={(e) => {
                              const newProfiles = [...(editedApp.resources.profiles || [])]
                              newProfiles[index] = { ...newProfiles[index], memory: e.target.value }
                              setEditedApp(prev => ({
                                ...prev,
                                resources: { ...prev.resources, profiles: newProfiles }
                              }))
                            }}
                            className="mt-1"
                            placeholder="8GB"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium">运行时间</label>
                          <Input
                            value={field.max || ''}
                            onChange={(e) => {
                              const newProfiles = [...(editedApp.resources.profiles || [])]
                              newProfiles[index] = { ...newProfiles[index], walltime: e.target.value }
                              setEditedApp(prev => ({
                                ...prev,
                                resources: { ...prev.resources, profiles: newProfiles }
                              }))
                            }}
                            className="mt-1"
                            placeholder="1:00:00"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newProfile = {
                        name: '新配置',
                        description: '',
                        nodes: 1,
                        cpusPerTask: 1,
                        memory: '8GB',
                        walltime: '1:00:00'
                      }
                      setEditedApp(prev => ({
                        ...prev,
                        resources: {
                          ...prev.resources,
                          profiles: [...(prev.resources.profiles || []), newProfile]
                        }
                      }))
                    }}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    添加预设配置
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {application.resources.profiles?.map((profile, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-2">{profile.name}</h4>
                      <p className="text-sm text-gray-600 mb-3">{profile.description}</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div><strong>节点:</strong> {profile.nodes}</div>
                        <div><strong>CPU:</strong> {profile.cpusPerTask}</div>
                        <div><strong>内存:</strong> {profile.memory}</div>
                        <div><strong>时间:</strong> {profile.walltime}</div>
                      </div>
                    </div>
                  ))}
                  {(!application.resources.profiles || application.resources.profiles.length === 0) && (
                    <div className="text-gray-500 text-center py-4">无预设配置</div>
                  )}
                </div>
              )}
            </CardContent>
          </TechCard>
        </TabsContent> */}

      <TabsContent value="execution" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>执行模板</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {application.execution.templates.map((template, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">{template.name}</h4>
                  <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                  <div>
                    <label className="text-sm font-medium">脚本模板:</label>
                    {mode === 'edit' ? (
                      <textarea
                        value={editedApp.execution.templates[index]?.template || template.template}
                        onChange={(e) => {
                          const newTemplates = [...editedApp.execution.templates]
                          if (newTemplates[index]) {
                            newTemplates[index] = { ...newTemplates[index], template: e.target.value }
                          }
                          setEditedApp(prev => ({
                            ...prev,
                            execution: { ...prev.execution, templates: newTemplates }
                          }))
                        }}
                        rows={12}
                        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs"
                      />
                    ) : (
                      <pre className="mt-1 p-3 bg-gray-50 rounded border text-xs overflow-x-auto whitespace-pre-wrap">
                        {template.template}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="interface" className="space-y-4">
        <div className="h-[800px]">
          <UnifiedLayoutDesigner
            application={editedApp}
            onFieldsChange={(fields) => {
              if (!isPublished) {
                setEditedApp(prev => ({
                  ...prev,
                  interface: { ...prev.interface, form: fields }
                }))
              }
            }}
            onLayoutChange={(layout) => {
              if (!isPublished) {
                setEditedApp(prev => ({
                  ...prev,
                  interface: { ...prev.interface, layout }
                }))
              }
            }}
            mode={isPublished ? 'view' : mode}
          />
        </div>
      </TabsContent>

    </Tabs>
    </div>
  )
}