'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
}

interface PasswordResetModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (userId: string, newPassword: string) => Promise<void>
  user: User | null
  loading: boolean
}

export default function PasswordResetModal({
  isOpen,
  onClose,
  onSubmit,
  user,
  loading
}: PasswordResetModalProps) {
  const t = useT('system.users')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setNewPassword('')
      setConfirmPassword('')
      setError('')
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!newPassword) {
      setError(t('validation.enterNewPassword'))
      return
    }

    if (newPassword.length < 6) {
      setError(t('validation.minLength'))
      return
    }

    if (newPassword !== confirmPassword) {
      setError(t('validation.passwordMismatch'))
      return
    }

    if (!user) return

    try {
      await onSubmit(user.id, newPassword)
      onClose()
    } catch (error) {
      // Error handling is done in parent component
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('passwordReset.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-gray-600">
            {t('passwordReset.userLabel')} <strong>{user?.username}</strong> {t('passwordReset.resetPasswordFor')}
          </div>

          <div>
            <Label htmlFor="newPassword">{t('passwordReset.newPassword')}</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('passwordReset.newPasswordPlaceholder')}
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">{t('passwordReset.confirmPassword')}</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('passwordReset.confirmPasswordPlaceholder')}
              required
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('passwordReset.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('passwordReset.resetting') : t('passwordReset.reset')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}