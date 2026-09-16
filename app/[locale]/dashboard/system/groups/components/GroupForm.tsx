'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { X, Plus, Users, Search } from 'lucide-react'
import { useT } from '@/lib/i18n-utils'

interface Group {
  id: string
  name: string
  description: string
  gid_number: number
  ldap_dn: string
  created_at: string
  updated_at?: string
  members?: string[]
  group_members?: Array<{
    id: string
    username: string
    added_at: string
  }>
}

interface GroupFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (groupData: Partial<Group>) => void
  editGroup: Group | null
  error: string
  loading: boolean
}

export default function GroupForm({
  isOpen,
  onClose,
  onSubmit,
  editGroup,
  error,
  loading
}: GroupFormProps) {
  const t = useT('system.groups')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [members, setMembers] = useState<string[]>([])
  const [newMember, setNewMember] = useState('')
  const [users, setUsers] = useState<Array<{ username: string; display_name?: string; email?: string }>>([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(false)

  // 当编辑组时，填充表单数据
  useEffect(() => {
    if (editGroup) {
      setName(editGroup.name)
      setDescription(editGroup.description || '')
      setMembers(editGroup.group_members?.map(m => m.username) || [])
    } else {
      setName('')
      setDescription('')
      setMembers([])
    }
    setNewMember('')
  }, [editGroup, isOpen])

  // 获取用户列表
  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await fetch('/api/users?pageSize=1000')
      const data = await response.json()
      if (data.success) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error(t('actions.fetchUsersFailed'), error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      members
    })
  }

  const addMember = () => {
    if (newMember.trim() && !members.includes(newMember.trim())) {
      setMembers([...members, newMember.trim()])
      setNewMember('')
    }
  }

  const removeMember = (username: string) => {
    setMembers(members.filter(m => m !== username))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addMember()
    }
  }

  const toggleMember = (username: string) => {
    if (members.includes(username)) {
      setMembers(members.filter(m => m !== username))
    } else {
      setMembers([...members, username])
    }
  }

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(userSearchTerm.toLowerCase())
  )

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {editGroup ? t('form.editTitle') : t('form.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('form.groupNameRequired')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('form.groupNamePlaceholder')}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('form.description')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('form.descriptionPlaceholder')}
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('form.members')}</Label>

            {/* 用户搜索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder={t('form.searchUsers')}
                className="pl-10"
                disabled={loading}
              />
            </div>

            {/* 用户列表 */}
            <div className="border rounded-md p-2 max-h-60 overflow-y-auto">
              {loadingUsers ? (
                <div className="text-center text-gray-500 py-4">{t('form.loadingUsers')}</div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center text-gray-500 py-4">{t('form.noUsersFound')}</div>
              ) : (
                <div className="grid grid-cols-2 gap-1">
                  {filteredUsers.map((user) => (
                    <div key={user.username} className="flex items-center space-x-2 p-1 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={`user-${user.username}`}
                        checked={members.includes(user.username)}
                        onCheckedChange={() => toggleMember(user.username)}
                        disabled={loading}
                      />
                      <Label
                        htmlFor={`user-${user.username}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {user.username}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 已选成员显示 */}
            {members.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-gray-600">{t('form.selectedMembers', { count: members.length })}</Label>
                <div className="flex flex-wrap gap-2">
                  {members.map((username) => (
                    <Badge key={username} variant="secondary" className="flex items-center gap-1">
                      {username}
                      <button
                        type="button"
                        onClick={() => removeMember(username)}
                        className="ml-1 hover:text-red-600"
                        disabled={loading}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? t('form.processing') : (editGroup ? t('form.update') : t('form.create'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 