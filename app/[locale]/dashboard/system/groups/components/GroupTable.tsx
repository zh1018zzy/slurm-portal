'use client'

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Users, Settings, File } from 'lucide-react'

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

interface GroupTableProps {
  groups: Group[]
  loading: boolean
  onEdit: (group: Group) => void
  onDelete: (groupId: string) => void
  onManagePermissions: (group: Group) => void
  onManageFilePermissions: (group: Group) => void
}

export default function GroupTable({
  groups,
  loading,
  onEdit,
  onDelete,
  onManagePermissions,
  onManageFilePermissions
}: GroupTableProps) {
  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded"></div>
        ))}
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>组名</TableHead>
          <TableHead>描述</TableHead>
          <TableHead>GID</TableHead>
          <TableHead>成员数</TableHead>
          <TableHead>创建时间</TableHead>
          <TableHead>操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-gray-400">
              <Users className="mx-auto mb-2 w-8 h-8 text-gray-300" />
              暂无用户组
            </TableCell>
          </TableRow>
        ) : (
          groups.map(group => (
            <TableRow key={group.id}>
              <TableCell>
                <div className="font-medium">{group.name}</div>
                <div className="text-sm text-gray-500">{group.ldap_dn}</div>
              </TableCell>
              <TableCell>
                <div className="max-w-xs truncate" title={group.description}>
                  {group.description || '无描述'}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{group.gid_number}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-500" />
                  <span>{group.group_members?.length || 0}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-gray-500">
                  {new Date(group.created_at).toLocaleDateString('zh-CN')}
                </div>
                {group.updated_at && (
                  <div className="text-xs text-gray-400">
                    更新: {new Date(group.updated_at).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onManagePermissions(group)}
                    title="管理应用权限"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onManageFilePermissions(group)}
                    title="管理文件权限"
                  >
                    <File className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(group)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(group.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
} 