'use client'

import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Shield, User, Terminal, UserX } from 'lucide-react'
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

interface UserTableProps {
  users: User[]
  loading: boolean
  isAdmin: boolean
  selected: string[]
  onToggleSelect: (id: string) => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onToggleRole: (user: User) => void
  onToggleWebShell: (user: User) => void
  onResetPassword: (user: User) => void
}

const UserRow = React.memo(function UserRow({
  user,
  isAdmin,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggleRole,
  onToggleWebShell,
  onResetPassword
}: {
  user: User
  isAdmin: boolean
  isSelected: boolean
  onToggleSelect: (id: string) => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onToggleRole: (user: User) => void
  onToggleWebShell: (user: User) => void
  onResetPassword: (user: User) => void
}) {
  const t = useT('system.users')

  return (
    <TableRow className="hover:bg-cyan-50 dark:hover:bg-gray-800/60 transition-colors">
      {isAdmin && (
        <TableCell>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(user.id)}
          />
        </TableCell>
      )}
      <TableCell>{user.username}</TableCell>
      <TableCell>{user.real_name}</TableCell>
      <TableCell>{user.email}</TableCell>
      <TableCell>{user.department}</TableCell>
      <TableCell>
        <Badge
          variant={user.role === 'admin' ? 'default' : 'secondary'}
          className={user.role === 'admin' ? 'bg-blue-600 text-white' : ''}
        >
          {user.role === 'admin' ? t('table.admin') : t('table.user')}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className="text-xs">
          {user.gid_number ? t('table.gidLabel', { gid: user.gid_number }) : t('table.gidUnassigned')}
        </Badge>
      </TableCell>
      <TableCell>
        {user.login_shell ? (
          <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-800 dark:bg-slate-800 dark:text-slate-100">
            {user.login_shell}
          </span>
        ) : (
          <Badge variant="outline" className="text-xs text-red-500 border-red-300">
            {t('table.shellMissing')}
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <Badge
          variant={user.webshell_access ? 'default' : 'secondary'}
          className={user.webshell_access ? 'bg-green-600 text-white' : ''}
        >
          {user.webshell_access ? t('table.webshellEnabled') : t('table.webshellDisabled')}
        </Badge>
      </TableCell>
      <TableCell>
        {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '-'}
      </TableCell>
      <TableCell>
        <span className={`inline-flex items-center ${user.is_online ? 'text-green-500' : 'text-gray-400'}`}>
          <span className={`w-2 h-2 rounded-full mr-1 ${user.is_online ? 'bg-green-400' : 'bg-gray-400'}`}></span>
          {user.is_online ? t('table.online') : t('table.offline')}
        </span>
      </TableCell>
      <TableCell>
        {isAdmin && (
          <div className="flex items-center space-x-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(user)} title={t('table.edit')}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onResetPassword(user)}
              title={t('table.resetPassword')}
            >
              {t('table.resetPassword')}
            </Button>
            <Button
              size="sm"
              variant={user.role === 'admin' ? 'default' : 'outline'}
              onClick={() => onToggleRole(user)}
              title={user.role === 'admin' ? t('table.setAsUser') : t('table.setAsAdmin')}
              className={user.role === 'admin' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            >
              {user.role === 'admin' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant={user.webshell_access ? 'default' : 'outline'}
              onClick={() => onToggleWebShell(user)}
              title={user.webshell_access ? t('table.disableWebShell') : t('table.enableWebShell')}
              className={user.webshell_access ? 'bg-green-600 text-white hover:bg-green-700' : ''}
            >
              <Terminal className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(user)} title={t('table.delete')}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  )
})

export default function UserTable({
  users,
  loading,
  isAdmin,
  selected,
  onToggleSelect,
  onEdit,
  onDelete,
  onToggleRole,
  onToggleWebShell,
  onResetPassword
}: UserTableProps) {
  const t = useT('system.users')

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
          {isAdmin && <TableHead>{t('table.select')}</TableHead>}
          <TableHead>{t('table.username')}</TableHead>
          <TableHead>{t('table.name')}</TableHead>
          <TableHead>{t('table.email')}</TableHead>
          <TableHead>{t('table.department')}</TableHead>
          <TableHead>{t('table.role')}</TableHead>
          <TableHead>{t('table.userGroup')}</TableHead>
          <TableHead>{t('table.shell')}</TableHead>
          <TableHead>{t('table.webshell')}</TableHead>
          <TableHead>{t('table.lastLogin')}</TableHead>
          <TableHead>{t('table.status')}</TableHead>
          <TableHead>{t('table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.length === 0 ? (
          <TableRow>
            <TableCell colSpan={isAdmin ? 12 : 11} className="text-center py-8 text-gray-400">
              <UserX className="mx-auto mb-2 w-8 h-8 text-gray-300" />
              {t('table.noUsers')}
            </TableCell>
          </TableRow>
        ) : (
          users.map(user => (
            <UserRow
              key={user.id}
              user={user}
              isAdmin={isAdmin}
              isSelected={selected.includes(user.id)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleRole={onToggleRole}
              onToggleWebShell={onToggleWebShell}
              onResetPassword={onResetPassword}
            />
          ))
        )}
      </TableBody>
    </Table>
  )
}