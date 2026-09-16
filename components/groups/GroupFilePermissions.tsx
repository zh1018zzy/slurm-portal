'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  File, 
  Upload, 
  Download, 
  Trash2, 
  Eye, 
  Share, 
  Copy,
  Shield,
  Loader2
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Group {
  id: string
  name: string
  description?: string
  gid_number: number
}

interface FilePermission {
  id: string
  group_id: string
  permission_type: string
  is_enabled: boolean
  created_at: string
  updated_at: string
}

interface GroupFilePermissionsProps {
  isOpen: boolean
  onClose: () => void
  group: Group | null
  onSave?: () => void
}

const PERMISSION_TYPES = [
  { value: 'file_upload', label: '文件上传', icon: Upload, description: '允许上传文件到服务器' },
  { value: 'file_download', label: '文件下载', icon: Download, description: '允许下载服务器上的文件' },
  { value: 'file_preview', label: '文件预览', icon: Eye, description: '允许预览文件内容' },
  { value: 'file_delete', label: '文件删除', icon: Trash2, description: '允许删除文件' },
  { value: 'file_share', label: '文件分享', icon: Share, description: '允许分享文件给其他用户' },
  { value: 'file_export', label: '文件导出', icon: File, description: '允许导出文件到本地' },
  { value: 'file_copy', label: '文件复制', icon: Copy, description: '允许复制文件内容' }
]

// 获取管理员token
async function getAdminTokenForClient(): Promise<string> {
  try {
    // 携带当前登录用户 token 请求，后端仅向已登录的管理员签发
    const userToken = localStorage.getItem('token')
    if (!userToken) {
      console.error('未登录，无法获取管理员token')
      return ''
    }
    const response = await fetch('/api/admin/token', {
      headers: { 'Authorization': `Bearer ${userToken}` }
    })
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        return data.token
      }
    }
  } catch (error) {
    console.error('获取管理员token失败:', error)
  }
  
  // API 获取失败时不内置硬编码凭据，交由调用方错误分支处理
  return '' // 安全: 禁止硬编码管理员token, API 不可用时由调用方错误分支处理
}

export default function GroupFilePermissions({
  isOpen,
  onClose,
  group,
  onSave
}: GroupFilePermissionsProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState<FilePermission[]>([])
  const [permissionStates, setPermissionStates] = useState<Record<string, boolean>>({})

  // 获取用户组文件权限
  const fetchGroupFilePermissions = useCallback(async () => {
    if (!group) return

    try {
      setLoading(true)
      const adminToken = await getAdminTokenForClient()
      
      const response = await fetch(`/api/groups/${group.id}/file-permissions?groupId=${group.id}`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      })
      
      const data = await response.json()
      
      if (data.success) {
        setPermissions(data.permissions || [])
        
        // 初始化权限状态
        const states: Record<string, boolean> = {}
        data.permissions?.forEach((perm: FilePermission) => {
          states[perm.permission_type] = perm.is_enabled
        })
        
        // 确保所有权限类型都有状态
        PERMISSION_TYPES.forEach(type => {
          if (!(type.value in states)) {
            states[type.value] = false
          }
        })
        
        setPermissionStates(states)
      } else {
        throw new Error(data.error || '获取权限失败')
      }
    } catch (error) {
      console.error('获取用户组文件权限失败:', error)
      toast({
        title: '获取权限失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [group])

  // 更新单个权限
  const updatePermission = async (permissionType: string, isEnabled: boolean) => {
    if (!group) return

    try {
      const adminToken = await getAdminTokenForClient()
      
      const response = await fetch(`/api/groups/${group.id}/file-permissions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupId: group.id,
          permissionType,
          isEnabled
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        // 更新本地状态
        setPermissionStates(prev => ({
          ...prev,
          [permissionType]: isEnabled
        }))
        
        toast({
          title: '权限更新成功',
          description: `${isEnabled ? '启用' : '禁用'}${PERMISSION_TYPES.find(p => p.value === permissionType)?.label}权限`
        })
      } else {
        throw new Error(data.error || '更新失败')
      }
    } catch (error) {
      console.error('更新权限失败:', error)
      toast({
        title: '更新失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
      
      // 回滚状态
      setPermissionStates(prev => ({
        ...prev,
        [permissionType]: !isEnabled
      }))
    }
  }

  // 批量保存所有权限
  const saveAllPermissions = async () => {
    if (!group) return

    try {
      setSaving(true)
      const adminToken = await getAdminTokenForClient()
      
      const response = await fetch(`/api/groups/${group.id}/file-permissions`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupId: group.id,
          permissions: permissionStates
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: '保存成功',
          description: `用户组 "${group.name}" 的文件权限已更新`
        })
        
        onSave?.()
        onClose()
      } else {
        throw new Error(data.error || '保存失败')
      }
    } catch (error) {
      console.error('保存权限失败:', error)
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // 重置状态
  const resetPermissions = () => {
    const states: Record<string, boolean> = {}
    permissions.forEach(perm => {
      states[perm.permission_type] = perm.is_enabled
    })
    setPermissionStates(states)
  }

  // 监听弹窗打开状态
  useEffect(() => {
    if (isOpen && group) {
      fetchGroupFilePermissions()
    }
  }, [isOpen, group, fetchGroupFilePermissions])

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setPermissions([])
      setPermissionStates({})
    }
  }, [isOpen])

  const getPermissionIcon = (type: string) => {
    const permission = PERMISSION_TYPES.find(p => p.value === type)
    const Icon = permission?.icon || File
    return <Icon className="w-4 h-4" />
  }

  const enabledCount = Object.values(permissionStates).filter(Boolean).length

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            文件权限管理 - {group?.name}
          </DialogTitle>
          {group?.description && (
            <p className="text-sm text-muted-foreground">{group.description}</p>
          )}
        </DialogHeader>

        <div className="space-y-6">
          {/* 权限概览 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">权限概览</CardTitle>
              <CardDescription>
                管理用户组 &quot;{group?.name}&quot; 的文件操作权限
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="text-sm">
                    GID: {group?.gid_number}
                  </Badge>
                  <Badge variant="secondary" className="text-sm">
                    已启用权限: {enabledCount}/{PERMISSION_TYPES.length}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 权限配置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">权限配置</CardTitle>
              <CardDescription>
                启用或禁用用户组的文件操作权限
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  加载权限配置...
                </div>
              ) : (
                <div className="space-y-4">
                  {PERMISSION_TYPES.map((permissionType) => {
                    const isEnabled = permissionStates[permissionType.value] || false
                    
                    return (
                      <div key={permissionType.value} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {getPermissionIcon(permissionType.value)}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{permissionType.label}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {permissionType.description}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => {
                              setPermissionStates(prev => ({
                                ...prev,
                                [permissionType.value]: checked
                              }))
                            }}
                            disabled={saving}
                          />
                          <Badge variant={isEnabled ? "default" : "secondary"} className="min-w-[60px]">
                            {isEnabled ? "已启用" : "已禁用"}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex items-center gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button variant="outline" onClick={resetPermissions} disabled={loading || saving}>
            重置
          </Button>
          <Button onClick={saveAllPermissions} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                保存中...
              </>
            ) : (
              '保存设置'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}