'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useT } from '@/lib/i18n-utils'

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

interface UserFormProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (formData: any) => Promise<void>
  editUser: User | null
  error: string
  loading: boolean
}

export default function UserForm({
  isOpen,
  onClose,
  onSubmit,
  editUser,
  error,
  loading
}: UserFormProps) {
  const t = useT('system.users')
  const [form, setForm] = useState({
    username: '',
    real_name: '',
    email: '',
    phone: '',
    department: '',
    role: 'user',
    password: '',
    login_shell: '/bin/bash'
  })

  useEffect(() => {
    if (editUser) {
      setForm({
        username: editUser.username,
        real_name: editUser.real_name,
        email: editUser.email,
        phone: editUser.phone,
        department: editUser.department,
        role: editUser.role,
        password: '',
        login_shell: editUser.login_shell || '/bin/bash'
      })
    } else {
      setForm({
        username: '',
        real_name: '',
        email: '',
        phone: '',
        department: '',
        role: 'user',
        password: '',
        login_shell: '/bin/bash'
      })
    }
  }, [editUser, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await onSubmit(form)
      onClose()
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editUser ? t('form.editTitle') : t('form.addTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="username">{t('form.username')} *</Label>
            <Input
              id="username"
              value={form.username}
              onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder={t('form.usernamePlaceholder')}
              required
              disabled={!!editUser}
            />
          </div>

          <div>
            <Label htmlFor="real_name">{t('form.realName')} *</Label>
            <Input
              id="real_name"
              value={form.real_name}
              onChange={(e) => setForm(prev => ({ ...prev, real_name: e.target.value }))}
              placeholder={t('form.realNamePlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="email">{t('form.email')} *</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              placeholder={t('form.emailPlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="phone">{t('form.phone')}</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm(prev => ({ ...prev, phone: e.target.value }))}
              placeholder={t('form.phonePlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="department">{t('form.department')}</Label>
            <Input
              id="department"
              value={form.department}
              onChange={(e) => setForm(prev => ({ ...prev, department: e.target.value }))}
              placeholder={t('form.departmentPlaceholder')}
            />
          </div>

          <div>
            <Label htmlFor="login_shell">{t('form.loginShell')}</Label>
            <Select
              value={form.login_shell}
              onValueChange={(value) => setForm(prev => ({ ...prev, login_shell: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('form.selectShell')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="/bin/bash">Bash</SelectItem>
                <SelectItem value="/bin/sh">Bourne Shell</SelectItem>
                <SelectItem value="/bin/zsh">Z Shell</SelectItem>
                <SelectItem value="/bin/csh">C Shell</SelectItem>
                <SelectItem value="/bin/tcsh">TC Shell</SelectItem>
                <SelectItem value="/bin/fish">Fish Shell</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="role">{t('form.role')}</Label>
            <Select value={form.role} onValueChange={(value) => setForm(prev => ({ ...prev, role: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{t('form.roleUser')}</SelectItem>
                <SelectItem value="admin">{t('form.roleAdmin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!editUser && (
            <div>
              <Label htmlFor="password">{t('form.password')}</Label>
              <Input
                id="password"
                type="password"
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder={t('form.passwordPlaceholder')}
              />
            </div>
          )}

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('form.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('form.processing') : (editUser ? t('form.update') : t('form.add'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}