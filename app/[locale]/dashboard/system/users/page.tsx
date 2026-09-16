'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { toast } from '@/hooks/use-toast'
import { Users, Plus, UserX, RefreshCw } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useT } from '@/lib/i18n-utils'

// 动态导入重型组件
// Note: Dynamic imports with loading states - these components will use their own i18n
const UserTable = dynamic(() => import('./components/UserTable'), {
  loading: () => (
    <div className="py-8">
      <LoadingSpinner size="lg" text="加载用户表格..." />
    </div>
  ),
  ssr: false
})

const UserForm = dynamic(() => import('./components/UserForm'), {
  loading: () => (
    <div className="py-4">
      <LoadingSpinner size="md" text="加载表单..." />
    </div>
  ),
  ssr: false
})

const PasswordResetModal = dynamic(() => import('./components/PasswordResetModal'), {
  loading: () => null,
  ssr: false
})

interface User {
  id: string
  username: string
  real_name: string
  email: string
  phone: string
  department: string
  role: string
  is_online: boolean
  last_login_at: string | null
  created_at: string
  status?: string
  webshell_access?: boolean
  gid_number?: number
  home_directory?: string
  login_shell?: string
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuth()
  const isAdmin = currentUser?.role === 'admin'
  const t = useT('system.users')

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pageSize] = useState(10)
  const [selected, setSelected] = useState<string[]>([])
  const [formLoading, setFormLoading] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)

  // 延迟初始化
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialized(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // 获取用户列表
  const fetchUsers = useCallback(async () => {
    if (!initialized) return

    setLoading(true)
    try {
      const res = await fetch(`/api/users?search=${encodeURIComponent(search)}&page=${page}&pageSize=${pageSize}&cache=true`)
      const data = await res.json()
      if (data.success) {
        setUsers(data.users)
        setTotal(data.total)
      }
    } catch (error) {
      console.error(t('actions.getUsersFailed'), error)
    } finally {
      setLoading(false)
    }
  }, [search, page, pageSize, initialized])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 添加或编辑用户
  const handleSubmitUser = useCallback(async (formData: any) => {
    setError('')
    setFormLoading(true)
    
    try {
      if (!formData.username || !formData.real_name || !formData.email) {
        throw new Error(t('validation.requiredFields'))
      }

      if (!/^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
        throw new Error(t('validation.invalidEmail'))
      }

      const url = editUser ? `/api/users/${editUser.id}` : '/api/users'
      const method = editUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      if (data.success) {
        const username = data.user?.username || formData.username
        toast({
          title: editUser ? t('actions.updateSuccess') : t('actions.addSuccess'),
          description: editUser
            ? t('actions.updateSuccessDesc', { username })
            : t('actions.addSuccessDesc', { username })
        })
        setShowAdd(false)
        setShowEdit(false)
        setEditUser(null)
        await fetchUsers()
      } else {
        throw new Error(data.error || t('actions.operationFailed'))
      }
    } catch (error: any) {
      setError(error.message)
      throw error
    } finally {
      setFormLoading(false)
    }
  }, [editUser, fetchUsers])

  // 删除用户
  const handleDeleteUser = useCallback(async (user: User) => {
    if (!confirm(t('actions.confirmDelete', { username: user.username }))) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      const data = await res.json()
      if (data.success) {
        toast({
          title: t('actions.deleteSuccess'),
          description: t('actions.deleteSuccessDesc', { username: user.username })
        })
        await fetchUsers()
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
  }, [fetchUsers, t])

  // 切换用户角色
  const toggleUserRole = useCallback(async (user: User) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    const roleText = newRole === 'admin' ? t('actions.roleAdmin') : t('actions.roleUser')
    if (!confirm(t('actions.confirmRoleChange', { username: user.username, role: roleText }))) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ role: newRole })
      })
      
      const data = await res.json()
      if (data.success) {
        toast({ title: t('actions.roleUpdateSuccess') })
        await fetchUsers()
      } else {
        throw new Error(data.error || t('actions.roleUpdateFailed'))
      }
    } catch (error: any) {
      toast({
        title: t('actions.roleUpdateFailed'),
        description: error.message,
        variant: 'destructive'
      })
    }
  }, [fetchUsers, t])

  // 切换WebShell权限
  const toggleWebShellAccess = useCallback(async (user: User) => {
    const newAccess = !user.webshell_access
    const action = newAccess ? t('actions.enable') : t('actions.disable')
    if (!confirm(t('actions.confirmWebShellChange', { action, username: user.username }))) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ webshell_access: newAccess })
      })
      
      const data = await res.json()
      if (data.success) {
        toast({ title: t('actions.webshellUpdateSuccess') })
        await fetchUsers()
      } else {
        throw new Error(data.error || t('actions.webshellUpdateFailed'))
      }
    } catch (error: any) {
      toast({
        title: t('actions.webshellUpdateFailed'),
        description: error.message,
        variant: 'destructive'
      })
    }
  }, [fetchUsers, t])

  // 重置密码
  const handleResetPassword = useCallback(async (userId: string, newPassword: string) => {
    setPasswordLoading(true)
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ password: newPassword })
      })
      
      const data = await res.json()
      if (data.success) {
        toast({ title: t('actions.passwordResetSuccess') })
      } else {
        throw new Error(data.error || t('actions.passwordResetFailed'))
      }
    } catch (error: any) {
      toast({
        title: t('actions.passwordResetFailed'),
        description: error.message,
        variant: 'destructive'
      })
      throw error
    } finally {
      setPasswordLoading(false)
    }
  }, [t])

  // LDAP用户同步
  const handleSyncUsers = useCallback(async (dryRun = false, force = false) => {
    setSyncLoading(true)
    try {
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ dryRun, force })
      })
      
      const data = await res.json()
      if (data.success) {
        toast({
          title: dryRun ? t('sync.previewComplete') : t('sync.syncComplete'),
          description: data.summary || data.message
        })
        if (!dryRun) {
          await fetchUsers() // 刷新用户列表
        }
      } else {
        throw new Error(data.error || t('sync.syncFailed'))
      }
    } catch (error: any) {
      toast({
        title: t('sync.syncFailed'),
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setSyncLoading(false)
    }
  }, [fetchUsers, t])



  // 事件处理函数
  const handleEdit = useCallback((user: User) => {
    setEditUser(user)
    setShowEdit(true)
  }, [])

  const handleResetPasswordClick = useCallback((user: User) => {
    setEditUser(user)
    setShowPasswordModal(true)
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }, [])

  // 计算分页信息
  const totalPages = Math.ceil(total / pageSize)

  if (!initialized) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-80 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="w-8 h-8" />
            {t('page.title')}
          </h1>
        <p className="text-muted-foreground mt-1">{t('page.subtitle')}</p>
      </div>
        {isAdmin && (
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => handleSyncUsers(true, false)}
              disabled={syncLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
              {t('page.previewSync')}
            </Button>
            <Button
              onClick={() => handleSyncUsers(false, false)}
              disabled={syncLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${syncLoading ? 'animate-spin' : ''}`} />
              {t('page.syncUsers')}
            </Button>

            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('page.addUser')}
            </Button>
          </div>
        )}
      </div>

      <TechCard hover>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('page.userList')} ({total})</CardTitle>
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
          <UserTable
            users={users}
            loading={loading}
            isAdmin={isAdmin}
            selected={selected}
            onToggleSelect={toggleSelect}
            onEdit={handleEdit}
            onDelete={handleDeleteUser}
            onToggleRole={toggleUserRole}
            onToggleWebShell={toggleWebShellAccess}
            onResetPassword={handleResetPasswordClick}
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

      {/* 添加用户表单 */}
      <UserForm
        isOpen={showAdd}
        onClose={() => {
          setShowAdd(false)
          setError('')
        }}
        onSubmit={handleSubmitUser}
        editUser={null}
        error={error}
        loading={formLoading}
      />

      {/* 编辑用户表单 */}
      <UserForm
        isOpen={showEdit}
        onClose={() => {
          setShowEdit(false)
          setEditUser(null)
          setError('')
        }}
        onSubmit={handleSubmitUser}
        editUser={editUser}
        error={error}
        loading={formLoading}
      />

      {/* 密码重置模态框 */}
      <PasswordResetModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false)
          setEditUser(null)
        }}
        onSubmit={handleResetPassword}
        user={editUser}
        loading={passwordLoading}
      />
    </div>
  )
}