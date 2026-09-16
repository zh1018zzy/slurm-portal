'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Search, Users, Shield, Settings } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Group {
  id: string
  name: string
  description: string
  gid_number: number
  group_members?: Array<{
    username: string
  }>
}

interface ApplicationAccessControlProps {
  isOpen: boolean
  onClose: () => void
  applicationName: string
  applicationDisplayName: string
  initialVisibility?: {
    isPublic?: boolean
    isActive?: boolean
    isListed?: boolean
    allowedGroups?: string[]
    allowedUsers?: string[]
    allowedDepartments?: string[]
  }
  onSave: (visibility: any) => Promise<boolean>
}

export default function ApplicationAccessControl({
  isOpen,
  onClose,
  applicationName,
  applicationDisplayName,
  initialVisibility,
  onSave
}: ApplicationAccessControlProps) {
  // 状态管理
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  
  // 用户组权限
  const [groups, setGroups] = useState<Group[]>([])
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set())
  const [groupSearchTerm, setGroupSearchTerm] = useState('')

  // 初始化数据
  useEffect(() => {
    if (isOpen) {
      if (initialVisibility) {
        setSelectedGroups(new Set(initialVisibility.allowedGroups || []))
      } else {
        setSelectedGroups(new Set())
      }
      fetchGroups()
    }
  }, [isOpen, initialVisibility])

  // 重置状态
  useEffect(() => {
    if (!isOpen) {
      setGroupSearchTerm('')
    }
  }, [isOpen])

  // 获取用户组列表
  const fetchGroups = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/groups?pageSize=100')
      const data = await response.json()
      
      if (data.success) {
        setGroups(data.groups || [])
      } else {
        throw new Error(data.error || '获取用户组列表失败')
      }
    } catch (error) {
      console.error('获取用户组列表失败:', error)
      toast({
        title: '获取用户组失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // 过滤用户组
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(groupSearchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(groupSearchTerm.toLowerCase()))
  )

  // 切换用户组选择
  const toggleGroupSelection = (groupName: string) => {
    const newSelected = new Set(selectedGroups)
    if (newSelected.has(groupName)) {
      newSelected.delete(groupName)
    } else {
      newSelected.add(groupName)
    }
    setSelectedGroups(newSelected)
  }

  // 保存权限设置
  const handleSave = async () => {
    try {
      setSaving(true)
      
      const visibility = {
        ...initialVisibility, // 保留原有的所有设置
        allowedGroups: Array.from(selectedGroups)
      }

      const success = await onSave(visibility)
      
      if (success) {
        toast({
          title: '保存成功',
          description: `应用 "${applicationDisplayName}" 的访问权限已更新`
        })
        onClose()
      }
    } catch (error) {
      console.error('保存权限设置失败:', error)
      toast({
        title: '保存失败',
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            访问权限设置 - {applicationDisplayName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 用户组权限设置 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-4 h-4" />
                用户组访问权限
              </CardTitle>
              <CardDescription>
                选择可以访问此应用的用户组
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* 用户组搜索 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    value={groupSearchTerm}
                    onChange={(e) => setGroupSearchTerm(e.target.value)}
                    placeholder="搜索用户组..."
                    className="pl-10"
                  />
                </div>

                {/* 用户组列表 */}
                <div className="border rounded-md p-3 max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="text-center text-gray-500 py-4">加载用户组中...</div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="text-center text-gray-500 py-4">没有找到用户组</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredGroups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                        >
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={selectedGroups.has(group.name)}
                            onCheckedChange={() => toggleGroupSelection(group.name)}
                          />
                          <div className="flex-1 min-w-0">
                            <Label 
                              htmlFor={`group-${group.id}`} 
                              className="block cursor-pointer"
                            >
                              <div className="font-medium">{group.name}</div>
                              {group.description && (
                                <div className="text-sm text-gray-500 truncate">
                                  {group.description}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  GID: {group.gid_number}
                                </Badge>
                                {group.group_members && (
                                  <Badge variant="secondary" className="text-xs">
                                    {group.group_members.length} 成员
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

                {/* 已选择的用户组 */}
                {selectedGroups.size > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      已选择的用户组 ({selectedGroups.size})
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(selectedGroups).map((groupName) => (
                        <Badge key={groupName} variant="default" className="flex items-center gap-1">
                          {groupName}
                          <button
                            onClick={() => toggleGroupSelection(groupName)}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存设置'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}