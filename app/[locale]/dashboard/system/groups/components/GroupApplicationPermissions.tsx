'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Plus, Search, Shield, Users, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface ApplicationPermission {
  id: string
  application_name: string
  permission_type: string
  created_at: string
  created_by: string
}

interface Application {
  name: string
  displayName?: string
  description?: string
  category?: string
  version?: string
  metadata?: {
    name: string
    displayName?: string
    description?: string
    category?: string
    version?: string
  }
}

interface GroupApplicationPermissionsProps {
  isOpen: boolean
  onClose: () => void
  groupId: string
  groupName: string
}

export default function GroupApplicationPermissions({
  isOpen,
  onClose,
  groupId,
  groupName
}: GroupApplicationPermissionsProps) {
  // 状态管理
  const [permissions, setPermissions] = useState<ApplicationPermission[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 搜索和过滤
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set())
  const [permissionType, setPermissionType] = useState<string>('access')
  
  // 当前标签页
  const [activeTab, setActiveTab] = useState('current')

  // 获取当前权限列表
  const fetchCurrentPermissions = useCallback(async () => {
    if (!groupId) return
    
    try {
      setLoading(true)
      const response = await fetch(`/api/groups/${groupId}/applications`)
      const data = await response.json()
      
      if (data.success) {
        setPermissions(data.permissions || [])
      } else {
        throw new Error(data.error || '获取权限失败')
      }
    } catch (error) {
      console.error('获取组应用权限失败:', error)
      toast({
        title: '获取权限失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [groupId]) // 移除 toast 依赖

  // 获取可用应用列表
  const fetchAvailableApplications = async () => {
    try {
      const response = await fetch('/api/applications')
      const data = await response.json()
      
      if (data.success) {
        // 处理新版和旧版API响应格式
        const apps = data.data || data.applications || []
        const formattedApps = apps.map((app: any) => {
          // 兼容新版HPC规范和旧版格式
          if (app.metadata) {
            // 新版HPC规范
            return {
              name: app.metadata.name,
              displayName: app.metadata.displayName || app.metadata.name,
              description: app.metadata.description,
              category: app.metadata.category,
              version: app.metadata.version
            }
          } else {
            // 旧版格式
            return {
              name: app.name,
              displayName: app.name,
              description: app.description,
              category: app.category,
              version: app.version
            }
          }
        })
        
        setApplications(formattedApps)
      } else {
        throw new Error(data.error || '获取应用列表失败')
      }
    } catch (error) {
      console.error('获取应用列表失败:', error)
      toast({
        title: '获取应用失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    }
  }

  // 初始化数据
  useEffect(() => {
    if (isOpen && groupId) {
      fetchCurrentPermissions()
      fetchAvailableApplications()
    }
  }, [isOpen, groupId, fetchCurrentPermissions]) // 现在可以安全地包含 fetchCurrentPermissions

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('')
      setSelectedApps(new Set())
      setPermissionType('access')
      setActiveTab('current')
    }
  }, [isOpen])

  // 过滤应用
  const filteredApplications = applications.filter(app => {
    const searchLower = searchTerm.toLowerCase()
    return (
      app.name.toLowerCase().includes(searchLower) ||
      (app.displayName && app.displayName.toLowerCase().includes(searchLower)) ||
      (app.description && app.description.toLowerCase().includes(searchLower)) ||
      (app.category && app.category.toLowerCase().includes(searchLower))
    )
  })

  // 获取已有权限的应用名称集合
  const existingPermissionApps = new Set(
    permissions
      .filter(p => p.permission_type === permissionType)
      .map(p => p.application_name)
  )

  // 可添加的应用（排除已有权限的）
  const availableApplications = filteredApplications.filter(
    app => !existingPermissionApps.has(app.name)
  )

  // 切换应用选择
  const toggleAppSelection = (appName: string) => {
    const newSelected = new Set(selectedApps)
    if (newSelected.has(appName)) {
      newSelected.delete(appName)
    } else {
      newSelected.add(appName)
    }
    setSelectedApps(newSelected)
  }

  // 添加权限
  const handleAddPermissions = async () => {
    if (selectedApps.size === 0) {
      toast({
        title: '请选择应用',
        description: '请至少选择一个应用',
        variant: 'destructive'
      })
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/groups/${groupId}/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applications: Array.from(selectedApps),
          permissionType: permissionType,
          createdBy: 'admin' // 可以从用户context获取
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: '添加成功',
          description: `成功为组 &quot;${groupName}&quot; 添加 ${selectedApps.size} 个应用权限`
        })
        
        // 重新获取权限列表
        await fetchCurrentPermissions()
        
        // 清空选择
        setSelectedApps(new Set())
        
        // 切换到当前权限标签页
        setActiveTab('current')
      } else {
        throw new Error(data.error || '添加权限失败')
      }
    } catch (error) {
      console.error('添加应用权限失败:', error)
      toast({
        title: '添加失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  // 移除权限
  const handleRemovePermission = async (applicationNames: string[], permType?: string) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/groups/${groupId}/applications`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applications: applicationNames,
          permissionType: permType
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast({
          title: '移除成功',
          description: `成功移除 ${applicationNames.length} 个应用权限`
        })
        
        // 重新获取权限列表
        await fetchCurrentPermissions()
      } else {
        throw new Error(data.error || '移除权限失败')
      }
    } catch (error) {
      console.error('移除应用权限失败:', error)
      toast({
        title: '移除失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            管理应用权限 - {groupName}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="current" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              当前权限
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              添加权限
            </TabsTrigger>
          </TabsList>

          {/* 当前权限标签页 */}
          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">当前应用权限</CardTitle>
                <CardDescription>
                  用户组 &quot;{groupName}&quot; 当前拥有的应用访问权限
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-gray-500">加载中...</div>
                ) : permissions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                    该用户组暂无应用权限
                  </div>
                ) : (
                  <div className="space-y-3">
                    {['access', 'submit', 'manage'].map(permType => {
                      const typePermissions = permissions.filter(p => p.permission_type === permType)
                      if (typePermissions.length === 0) return null

                      return (
                        <div key={permType} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">
                              {permType === 'access' && '访问权限'}
                              {permType === 'submit' && '提交权限'}
                              {permType === 'manage' && '管理权限'}
                              <span className="ml-2 text-sm text-gray-500">
                                ({typePermissions.length} 个应用)
                              </span>
                            </h4>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemovePermission(
                                typePermissions.map(p => p.application_name),
                                permType
                              )}
                              disabled={saving}
                            >
                              批量移除
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {typePermissions.map((perm) => (
                              <Badge
                                key={`${perm.application_name}-${perm.permission_type}`}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {perm.application_name}
                                <button
                                  onClick={() => handleRemovePermission([perm.application_name], perm.permission_type)}
                                  className="ml-1 hover:text-red-600"
                                  disabled={saving}
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 添加权限标签页 */}
          <TabsContent value="add" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">添加应用权限</CardTitle>
                <CardDescription>
                  为用户组 &quot;{groupName}&quot; 添加新的应用访问权限
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 权限类型选择 */}
                <div className="space-y-2">
                  <Label>权限类型</Label>
                  <Select value={permissionType} onValueChange={setPermissionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="access">访问权限</SelectItem>
                      <SelectItem value="submit">提交权限</SelectItem>
                      <SelectItem value="manage">管理权限</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 应用搜索 */}
                <div className="space-y-2">
                  <Label>搜索应用</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="搜索应用名称、描述或分类..."
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* 应用列表 */}
                <div className="space-y-2">
                  <Label>
                    可用应用 
                    {selectedApps.size > 0 && (
                      <span className="ml-2 text-sm text-blue-600">
                        已选择 {selectedApps.size} 个
                      </span>
                    )}
                  </Label>
                  
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
                    {availableApplications.length === 0 ? (
                      <div className="text-center text-gray-500 py-4">
                        {searchTerm ? '没有找到匹配的应用' : '没有可添加的应用'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {availableApplications.map((app) => (
                          <div
                            key={app.name}
                            className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded border"
                          >
                            <Checkbox
                              id={`app-${app.name}`}
                              checked={selectedApps.has(app.name)}
                              onCheckedChange={() => toggleAppSelection(app.name)}
                            />
                            <div className="flex-1 min-w-0">
                              <Label 
                                htmlFor={`app-${app.name}`} 
                                className="block cursor-pointer"
                              >
                                <div className="font-medium truncate">
                                  {app.displayName || app.name}
                                </div>
                                {app.description && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {app.description}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 mt-1">
                                  {app.category && (
                                    <Badge variant="outline" className="text-xs">
                                      {app.category}
                                    </Badge>
                                  )}
                                  {app.version && (
                                    <Badge variant="secondary" className="text-xs">
                                      {app.version}
                                    </Badge>
                                  )}
                                </div>
                              </Label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 已选应用显示 */}
                {selectedApps.size > 0 && (
                  <div className="space-y-2">
                    <Label>已选择的应用:</Label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(selectedApps).map((appName) => (
                        <Badge key={appName} variant="default" className="flex items-center gap-1">
                          {appName}
                          <button
                            onClick={() => toggleAppSelection(appName)}
                            className="ml-1 hover:text-red-200"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            关闭
          </Button>
          {activeTab === 'add' && (
            <Button 
              onClick={handleAddPermissions} 
              disabled={saving || selectedApps.size === 0}
            >
              {saving ? '添加中...' : `添加权限 (${selectedApps.size})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}