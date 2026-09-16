import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'

interface WebShellPermissions {
  copy: boolean
  paste: boolean
  download: boolean
  upload: boolean
  execute: boolean
}

interface PermissionConfig {
  permissions: {
    [role: string]: WebShellPermissions
  }
  default_role: string
  session_timeout: number
  max_sessions_per_user: number
}

export function useWebShellPermissions() {
  const { user } = useAuth()
  const [permissions, setPermissions] = useState<WebShellPermissions>({
    copy: false,
    paste: false,
    download: false,
    upload: false,
    execute: false
  })
  const [config, setConfig] = useState<PermissionConfig | null>(null)

  // 加载权限配置
  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const response = await fetch('/api/webshell/permissions')
        if (response.ok) {
          const configData = await response.json()
          setConfig(configData)
        }
      } catch (error) {
        console.error('加载权限配置失败:', error)
        // 使用默认配置
        setConfig({
          permissions: {
            admin: { copy: true, paste: true, download: true, upload: true, execute: true },
            user: { copy: true, paste: false, download: false, upload: false, execute: true },
            guest: { copy: false, paste: false, download: false, upload: false, execute: false }
          },
          default_role: 'user',
          session_timeout: 3600,
          max_sessions_per_user: 3
        })
      }
    }

    loadPermissions()
  }, [])

  // 根据用户角色设置权限
  useEffect(() => {
    if (config && user) {
      const userRole = user.role || config.default_role
      const userPermissions = config.permissions[userRole] || config.permissions[config.default_role]
      setPermissions(userPermissions)
    }
  }, [config, user])

  return {
    permissions,
    config,
    hasPermission: (permission: keyof WebShellPermissions) => permissions[permission],
    canCopy: permissions.copy,
    canPaste: permissions.paste,
    canDownload: permissions.download,
    canUpload: permissions.upload,
    canExecute: permissions.execute
  }
} 