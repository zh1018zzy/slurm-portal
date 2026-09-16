'use client'

import React, { useEffect, useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/hooks/use-toast'
import { Users, Plus, UserX, RefreshCw, Settings } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import AdminProtected from '@/components/AdminProtected'
import { useT } from '@/lib/i18n-utils'

// 动态导入组件
const GroupTable = dynamic(() => import('./components/GroupTable'), {
  loading: () => (
    <div className="py-8">
      <LoadingSpinner size="lg" text="加载组列表..." />
    </div>
  ),
  ssr: false
})

const GroupForm = dynamic(() => import('./components/GroupForm'), {
  loading: () => (
    <div className="py-4">
      <LoadingSpinner size="md" text="加载表单..." />
    </div>
  ),
  ssr: false
})

const GroupApplicationPermissions = dynamic(() => import('./components/GroupApplicationPermissions'), {
  loading: () => (
    <div className="py-4">
      <LoadingSpinner size="md" text="加载应用权限..." />
    </div>
  ),
  ssr: false
})

const GroupFilePermissions = dynamic(() => import('@/components/groups/GroupFilePermissions'), {
  loading: () => (
    <div className="py-4">
      <LoadingSpinner size="md" text="加载文件权限..." />
    </div>
  ),
  ssr: false
})

interface Group {
  id: string
  name: string
  description: string
  gid_number: number
  ldap_dn: string
  created_at: string
  updated_at?: string
  group_members?: Array<{
    id: string
    username: string
    added_at: string
  }>
}

export default function GroupManagementPage() {
  const { user: currentUser } = useAuth()
  const t = useT('system.groups')

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showPermissions, setShowPermissions] = useState(false)
  const [showFilePermissions, setShowFilePermissions] = useState(false)
  const [editGroup, setEditGroup] = useState<Group | null>(null)
  const [permissionGroup, setPermissionGroup] = useState<Group | null>(null)
  const [filePermissionGroup, setFilePermissionGroup] = useState<Group | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(10)
  const [formLoading, setFormLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)

  // 获取用户组列表
  const fetchGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/groups?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}`)
      const data = await res.json()
      if (data.success) {
        setGroups(data.groups)
        setTotal(data.total)
      }
    } catch (error) {
      console.error(t('actions.fetchFailed'), error)
    } finally {
      setLoading(false)
    }
  }, [search, page, pageSize])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  // 提交用户组表单
  const handleSubmitGroup = useCallback(async (groupData: Partial<Group>) => {
    setFormLoading(true)
    try {
      const url = '/api/groups'
      const method = editGroup ? 'PUT' : 'POST'
      
      // 如果是编辑模式，添加组ID到请求体
      const requestBody = editGroup ? { ...groupData, id: editGroup.id } : groupData
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })
      
      const data = await res.json()
      if (data.success) {
        toast({
          title: editGroup ? t('actions.updateSuccess') : t('actions.createSuccess'),
          description: editGroup ? t('actions.updateSuccessDesc') : t('actions.createSuccessDesc')
        })
        setShowAdd(false)
        setShowEdit(false)
        setEditGroup(null)
        await fetchGroups()
      } else {
        throw new Error(data.error || t('actions.operationFailed'))
      }
    } catch (error: any) {
      setError(error.message)
      toast({
        title: t('actions.operationFailed'),
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setFormLoading(false)
    }
  }, [editGroup, fetchGroups])

  // 删除用户组
  const handleDeleteGroup = useCallback(async (groupId: string) => {
    if (!confirm(t('actions.deleteConfirm'))) {
      return
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: groupId })
      })
      const data = await res.json()

      if (data.success) {
        toast({ title: t('actions.deleteSuccess'), description: t('actions.deleteSuccessDesc') })
        await fetchGroups()
      } else {
        throw new Error(data.error || t('actions.deleteFailed'))
      }
    } catch (error: any) {
      toast({
        title: t('actions.deleteFailed'),
        description: error.message,
        variant: 'destructive'
      })
    }
  }, [fetchGroups])

  // LDAP用户组同步
  const handleSyncGroups = useCallback(async (dryRun = false) => {
    setSyncLoading(true)
    try {
      const res = await fetch('/api/groups/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ dryRun })
      })
      
      const data = await res.json()
      if (data.success) {
        // 构建显示消息
        let description = data.message || t('sync.syncComplete')

        if (dryRun && data.preview) {
          // 预览模式
          const preview = data.preview
          description = t('sync.willCreate', { created: preview.created, updated: preview.updated })
          if (preview.errors > 0) {
            description += t('sync.withErrors', { errors: preview.errors })
          }
        } else if (!dryRun && data.summary) {
          // 执行同步模式
          const summary = data.summary
          description = t('sync.successCreate', { created: summary.created, updated: summary.updated })
          if (summary.errors > 0) {
            description += t('sync.withErrors', { errors: summary.errors })
          }
          description += t('sync.totalProcessed', { total: summary.totalLdapGroups })
        }

        toast({
          title: dryRun ? t('sync.previewComplete') : t('sync.syncComplete'),
          description
        })

        if (!dryRun) {
          await fetchGroups() // 刷新用户组列表
        }
      } else {
        throw new Error(data.error || t('sync.syncFailed'))
      }
    } catch (error: any) {
      console.error(t('sync.syncFailed'), error)
      toast({
        title: t('sync.syncFailed'),
        description: error.message || t('sync.unknownError'),
        variant: 'destructive'
      })
    } finally {
      setSyncLoading(false)
    }
  }, [fetchGroups])

  // 事件处理函数
  const handleEdit = useCallback((group: Group) => {
    setEditGroup(group)
    setShowEdit(true)
  }, [])

  const handleManagePermissions = useCallback((group: Group) => {
    setPermissionGroup(group)
    setShowPermissions(true)
  }, [])

  const handleManageFilePermissions = useCallback((group: Group) => {
    setFilePermissionGroup(group)
    setShowFilePermissions(true)
  }, [])

  // 计算分页信息
  const totalPages = Math.ceil(total / pageSize)

  return (
    <AdminProtected>
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="w-8 h-8" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => handleSyncGroups(true)}
            disabled={syncLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
            {t('page.previewSync')}
          </Button>
          <Button
            onClick={() => handleSyncGroups(false)}
            disabled={syncLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
            {t('page.syncLdap')}
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('page.createGroup')}
          </Button>
        </div>
      </div>

      <TechCard hover>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('page.groupList')} ({total})</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                placeholder={t('page.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <GroupTable
            groups={groups}
            loading={loading}
            onEdit={handleEdit}
            onDelete={handleDeleteGroup}
            onManagePermissions={handleManagePermissions}
            onManageFilePermissions={handleManageFilePermissions}
          />
          
          {/* 分页控件 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4 mt-4">
              <div className="text-sm text-muted-foreground">
                {t('page.totalRecords', { total, page, totalPages })}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  {t('page.previousPage')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= totalPages}
                >
                  {t('page.nextPage')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </TechCard>

      {/* 创建用户组表单 */}
      <GroupForm
        isOpen={showAdd}
        onClose={() => {
          setShowAdd(false)
          setError('')
        }}
        onSubmit={handleSubmitGroup}
        editGroup={null}
        error={error}
        loading={formLoading}
      />

      {/* 编辑用户组表单 */}
      <GroupForm
        isOpen={showEdit}
        onClose={() => {
          setShowEdit(false)
          setEditGroup(null)
          setError('')
        }}
        onSubmit={handleSubmitGroup}
        editGroup={editGroup}
        error={error}
        loading={formLoading}
      />

      {/* 应用权限管理弹窗 */}
      <GroupApplicationPermissions
        isOpen={showPermissions}
        onClose={() => {
          setShowPermissions(false)
          setPermissionGroup(null)
        }}
        groupId={permissionGroup?.id || ''}
        groupName={permissionGroup?.name || ''}
      />

      {/* 文件权限管理弹窗 */}
      <GroupFilePermissions
        isOpen={showFilePermissions}
        onClose={() => {
          setShowFilePermissions(false)
          setFilePermissionGroup(null)
        }}
        group={filePermissionGroup}
        onSave={() => {
          // 可以在这里添加刷新逻辑
          console.log('文件权限已保存')
        }}
      />
    </div>
    </AdminProtected>
  )
} 