'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Label } from '@/components/ui/label'
import { User, Settings, Shield, Terminal, Clock } from 'lucide-react'
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'

export default function ProfilePage() {
  const { user } = useAuth()
  const locale = useLocale()
  const t = useT('profile')
  const tCommon = useT('common')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdLoading, setPwdLoading] = useState(false)

  // 获取详细用户信息
  useEffect(() => {
    if (!user?.username) return
    fetch(`/api/users/${user.username}`)
      .then(async res => {
        if (!res.ok) return null
        try {
          return await res.json()
        } catch {
          return null
        }
      })
      .then(data => {
        if (data && data.user) setProfile(data.user)
      })
  }, [user])

  if (!profile) return <div className="p-8 text-center text-muted-foreground">{tCommon('loading')}</div>

  function handleChange(field: string, value: string) {
    setProfile((prev: any) => ({ ...prev, [field]: value }))
  }

  async function handleSave() {
    setLoading(true)
    const res = await fetch('/api/users/' + profile.id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, username: profile.username })
    })
    const data = await res.json()
    setLoading(false)
    if (data.success) {
      toast({ title: t('saveSuccess'), description: t('profileUpdated') })
    } else {
      toast({ title: t('saveFailed'), description: data.error || t('retryLater'), variant: 'destructive' })
    }
  }

  async function handleChangePwd(e: React.FormEvent) {
    e.preventDefault()
    setPwdLoading(true)
    const res = await fetch(`/api/users/${profile.id}/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
    })
    const data = await res.json()
    setPwdLoading(false)
    if (data.success) {
      toast({ title: t('passwordChangeSuccess'), description: t('reloginWithNewPassword') })
      setShowPwd(false)
      setOldPwd('')
      setNewPwd('')
    } else {
      toast({ title: t('passwordChangeFailed'), description: data.error || t('retryLater'), variant: 'destructive' })
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <User className="w-8 h-8" />
        <h1 className="text-3xl font-bold">{t('title')}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 左侧：基本信息 */}
        <div className="lg:col-span-2 space-y-6">
          <TechCard hover>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                {t('basicInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">{t('username')}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="username"
                      value={profile.username || ''}
                      disabled
                      className="bg-gray-100 dark:bg-gray-800 dark:text-gray-400 cursor-not-allowed flex-1"
                    />
                    <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                      {profile.role === 'admin' ? 'Admin' : 'User'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label htmlFor="real_name">{t('realName')}</Label>
                  <Input
                    id="real_name"
                    value={profile.real_name || ''}
                    onChange={e => handleChange('real_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t('email')}</Label>
                  <Input
                    id="email"
                    value={profile.email || ''}
                    onChange={e => handleChange('email', e.target.value)}
                    required
                    type="email"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">{t('phone')}</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={e => handleChange('phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="department">{t('department')}</Label>
                  <Input
                    id="department"
                    value={profile.department || ''}
                    onChange={e => handleChange('department', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="login_shell">{t('loginShell')}</Label>
                  <Select
                    value={profile.login_shell || '/bin/bash'}
                    onValueChange={(value) => handleChange('login_shell', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectShell')} />
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
              </div>

              <div className="flex space-x-2 mt-6">
                <PrimaryButton onClick={handleSave} disabled={loading} loading={loading}>
                  {loading ? t('saving') : tCommon('save')}
                </PrimaryButton>
                <Button variant="outline" onClick={() => setShowPwd(true)}>
                  {t('changePassword')}
                </Button>
              </div>
            </CardContent>
          </TechCard>

          {/* 界面偏好设置 */}
          <TechCard hover>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t('preferences')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="theme">{t('themeMode')}</Label>
                  <Select defaultValue="light">
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectTheme')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">{t('lightMode')}</SelectItem>
                      <SelectItem value="dark">{t('darkMode')}</SelectItem>
                      <SelectItem value="auto">{t('autoMode')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="language">{t('language')}</Label>
                  <Select defaultValue="zh-CN">
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectLanguage')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="zh-CN">{t('simplifiedChinese')}</SelectItem>
                      <SelectItem value="en-US">{t('english')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="timezone">{t('timezone')}</Label>
                  <Select defaultValue="Asia/Shanghai">
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectTimezone')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Shanghai">GMT+8</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">GMT-5</SelectItem>
                      <SelectItem value="Europe/London">GMT</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </TechCard>
        </div>

        {/* 右侧：状态信息 */}
        <div className="space-y-6">
          {/* 账户状态 */}
          <TechCard hover>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                {t('accountStatus')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span className="text-sm font-medium">WebShell</span>
                </div>
                <Badge variant={profile.webshell_access ? 'default' : 'secondary'}>
                  {profile.webshell_access ? t('enabled') : t('disabled')}
                </Badge>
              </div>

              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">{t('loginInfo')}</span>
                </div>
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>{t('lastLogin')}</span>
                    <span>{profile.last_login_at ? new Date(profile.last_login_at).toLocaleDateString() : t('never')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('accountCreated')}</span>
                    <span>{profile.created_at ? new Date(profile.created_at).toLocaleDateString() : t('unknown')}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </TechCard>

          {/* 快捷操作 */}
          <TechCard hover>
            <CardHeader>
              <CardTitle>{t('quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowPwd(true)}
              >
                <Shield className="w-4 h-4 mr-2" />
                {t('changePassword')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleSave}
                disabled={loading}
              >
                <Settings className="w-4 h-4 mr-2" />
                {loading ? t('saving') : t('saveSettings')}
              </Button>
            </CardContent>
          </TechCard>
        </div>
      </div>

      {/* 密码修改对话框 */}
      <Dialog open={showPwd} onOpenChange={setShowPwd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('changePassword')}</DialogTitle>
            <DialogDescription>
              {t('passwordChangeDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePwd} className="space-y-4">
            <div>
              <Label htmlFor="oldPwd">{t('oldPassword')}</Label>
              <Input
                id="oldPwd"
                type="password"
                value={oldPwd}
                onChange={e => setOldPwd(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div>
              <Label htmlFor="newPwd">{t('newPassword')}</Label>
              <Input
                id="newPwd"
                type="password"
                value={newPwd}
                onChange={e => setNewPwd(e.target.value)}
                required
                autoComplete="new-password"
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={pwdLoading}>
                {pwdLoading ? t('saving') : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}