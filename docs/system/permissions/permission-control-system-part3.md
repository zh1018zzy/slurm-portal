# HPC系统权限控制方案 - 第三部分

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 4. 前端权限控制

### 4.1 权限Hook

```typescript
// hooks/use-permission.ts
import { useState, useEffect } from 'react'
import { useAuth } from './use-auth'

export function usePermission(resource: string, action: string, scope?: string) {
  const { user, token } = useAuth()
  const [hasPermission, setHasPermission] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkPermission() {
      if (!token) {
        setHasPermission(false)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/permissions/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ resource, action, scope })
        })

        const data = await response.json()
        setHasPermission(data.hasPermission)
      } catch (error) {
        console.error('权限检查失败:', error)
        setHasPermission(false)
      } finally {
        setLoading(false)
      }
    }

    checkPermission()
  }, [token, resource, action, scope])

  return { hasPermission, loading }
}
```

### 4.2 权限组件

```typescript
// components/PermissionGuard.tsx
import { ReactNode } from 'react'
import { usePermission } from '@/hooks/use-permission'

interface PermissionGuardProps {
  resource: string
  action: string
  scope?: string
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({ 
  resource, 
  action, 
  scope, 
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { hasPermission, loading } = usePermission(resource, action, scope)

  if (loading) {
    return <div>权限检查中...</div>
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}
```

### 4.3 动态菜单权限控制

```typescript
// components/DynamicMenu.tsx
import { useAuth } from '@/hooks/use-auth'
import { usePermission } from '@/hooks/use-permission'

interface MenuItem {
  href: string
  icon: any
  label: string
  permission?: {
    resource: string
    action: string
    scope?: string
  }
  subItems?: MenuItem[]
}

export function DynamicMenu() {
  const { user } = useAuth()
  
  const menuItems: MenuItem[] = [
    { href: '/dashboard', icon: RocketIcon, label: '仪表盘' },
    { href: '/dashboard/big-screen', icon: ServerIcon, label: '大屏展示' },
    { href: '/dashboard/submit', icon: CalculatorIcon, label: '计算提交' },
    { href: '/dashboard/jobs', icon: CpuIcon, label: '作业管理' },
    { 
      href: '/dashboard/applications', 
      icon: LayersIcon, 
      label: '应用中心',
      permission: { resource: 'app', action: 'read', scope: 'all' }
    },
    { href: '/dashboard/files', icon: FolderIcon, label: '文件管理' },
    { href: '/dashboard/notifications', icon: BellIcon, label: '消息通知' },
    { href: '/dashboard/profile', icon: UserIcon, label: '个人信息' },
    {
      href: '/dashboard/system',
      icon: SettingsIcon,
      label: '系统管理',
      permission: { resource: 'system', action: 'admin', scope: 'all' },
      subItems: [
        { 
          href: '/dashboard/system/settings', 
          icon: SettingsIcon, 
          label: '系统设置',
          permission: { resource: 'system', action: 'update', scope: 'all' }
        },
        { 
          href: '/dashboard/system/applications', 
          icon: AppWindowIcon, 
          label: '应用管理',
          permission: { resource: 'app', action: 'admin', scope: 'all' }
        },
        { 
          href: '/dashboard/system/users', 
          icon: UserIcon, 
          label: '用户管理',
          permission: { resource: 'user', action: 'admin', scope: 'all' }
        },
        { 
          href: '/dashboard/system/logs', 
          icon: ShieldIcon, 
          label: '系统日志',
          permission: { resource: 'system', action: 'read', scope: 'all' }
        },
      ],
    },
  ]

  return (
    <nav className="flex flex-col space-y-2">
      {menuItems.map((item) => (
        <MenuItem key={item.href} item={item} />
      ))}
    </nav>
  )
}

function MenuItem({ item }: { item: MenuItem }) {
  const { hasPermission } = usePermission(
    item.permission?.resource || 'system',
    item.permission?.action || 'read',
    item.permission?.scope
  )

  // 如果没有权限要求或用户有权限，显示菜单项
  if (!item.permission || hasPermission) {
    return (
      <div>
        <Link 
          href={item.href}
          className="flex items-center space-x-2 p-2 rounded-md transition-colors duration-200"
        >
          <item.icon className="w-5 h-5" />
          <span>{item.label}</span>
        </Link>
        {item.subItems && (
          <div className="ml-4 mt-2 space-y-2">
            {item.subItems.map((subItem) => (
              <SubMenuItem key={subItem.href} item={subItem} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return null
}

function SubMenuItem({ item }: { item: MenuItem }) {
  const { hasPermission } = usePermission(
    item.permission?.resource || 'system',
    item.permission?.action || 'read',
    item.permission?.scope
  )

  if (!item.permission || hasPermission) {
    return (
      <Link
        href={item.href}
        className="flex items-center space-x-2 p-2 rounded-md transition-colors duration-200"
      >
        <item.icon className="w-4 h-4" />
        <span>{item.label}</span>
      </Link>
    )
  }

  return null
}
```

## 5. API权限控制

### 5.1 权限API端点

```typescript
// app/api/permissions/check/route.ts
import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/permission-middleware'
import { checkPermission } from '@/lib/permission-checker'

export const POST = withPermission({ resource: 'system', action: 'read', scope: 'all' })(
  async (req: NextRequest) => {
    const { resource, action, scope } = await req.json()
    
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.substring(7)
    const userInfo = verifyJwt(token || '')

    if (!userInfo) {
      return Response.json({ success: false, error: '未登录' }, { status: 401 })
    }

    const hasPermission = await checkPermission(userInfo, { resource, action, scope })
    
    return Response.json({ 
      success: true, 
      hasPermission,
      user: userInfo.username,
      resource,
      action,
      scope
    })
  }
)
```

### 5.2 用户权限管理API

```typescript
// app/api/permissions/users/[id]/roles/route.ts
import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/permission-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// 获取用户角色
export const GET = withPermission({ resource: 'user', action: 'read', scope: 'all' })(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select(`
          role_id,
          expires_at,
          granted_by,
          granted_at,
          roles (
            name,
            display_name,
            description,
            level
          )
        `)
        .eq('user_id', params.id)

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 })
      }

      return Response.json({ success: true, userRoles })
    } catch (error) {
      return Response.json({ success: false, error: '获取用户角色失败' }, { status: 500 })
    }
  }
)

// 分配用户角色
export const POST = withPermission({ resource: 'user', action: 'admin', scope: 'all' })(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const { roleId, expiresAt, grantedBy } = await req.json()

      const { data, error } = await supabase
        .from('user_roles')
        .insert({
          user_id: params.id,
          role_id: roleId,
          expires_at: expiresAt,
          granted_by: grantedBy
        })
        .select()

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 })
      }

      return Response.json({ success: true, userRole: data[0] })
    } catch (error) {
      return Response.json({ success: false, error: '分配角色失败' }, { status: 500 })
    }
  }
)

// 移除用户角色
export const DELETE = withPermission({ resource: 'user', action: 'admin', scope: 'all' })(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const { searchParams } = new URL(req.url)
      const roleId = searchParams.get('roleId')

      if (!roleId) {
        return Response.json({ success: false, error: '角色ID不能为空' }, { status: 400 })
      }

      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', params.id)
        .eq('role_id', roleId)

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 })
      }

      return Response.json({ success: true })
    } catch (error) {
      return Response.json({ success: false, error: '移除角色失败' }, { status: 500 })
    }
  }
)
```

### 5.3 角色权限管理API

```typescript
// app/api/permissions/roles/[id]/permissions/route.ts
import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/permission-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// 获取角色权限
export const GET = withPermission({ resource: 'system', action: 'read', scope: 'all' })(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const { data: rolePermissions, error } = await supabase
        .from('role_permissions')
        .select(`
          permission_id,
          conditions,
          permissions (
            resource,
            action,
            scope,
            description
          )
        `)
        .eq('role_id', params.id)

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 })
      }

      return Response.json({ success: true, rolePermissions })
    } catch (error) {
      return Response.json({ success: false, error: '获取角色权限失败' }, { status: 500 })
    }
  }
)

// 为角色分配权限
export const POST = withPermission({ resource: 'system', action: 'admin', scope: 'all' })(
  async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
      const { permissionId, conditions } = await req.json()

      const { data, error } = await supabase
        .from('role_permissions')
        .insert({
          role_id: params.id,
          permission_id: permissionId,
          conditions: conditions || {}
        })
        .select()

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 })
      }

      return Response.json({ success: true, rolePermission: data[0] })
    } catch (error) {
      return Response.json({ success: false, error: '分配权限失败' }, { status: 500 })
    }
  }
)
```

### 5.4 权限审计API

```typescript
// app/api/permissions/audit/route.ts
import { NextRequest } from 'next/server'
import { withPermission } from '@/lib/permission-middleware'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// 获取权限审计日志
export const GET = withPermission({ resource: 'system', action: 'read', scope: 'all' })(
  async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url)
      const page = parseInt(searchParams.get('page') || '1', 10)
      const pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
      const userId = searchParams.get('userId')
      const resource = searchParams.get('resource')
      const action = searchParams.get('action')
      const startDate = searchParams.get('startDate')
      const endDate = searchParams.get('endDate')

      let query = supabase
        .from('permission_audit_logs')
        .select(`
          *,
          users (
            username,
            real_name
          )
        `, { count: 'exact' })

      // 应用过滤器
      if (userId) {
        query = query.eq('user_id', userId)
      }
      if (resource) {
        query = query.eq('resource', resource)
      }
      if (action) {
        query = query.eq('action', action)
      }
      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      // 分页
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1
      query = query.order('created_at', { ascending: false }).range(from, to)

      const { data, error, count } = await query

      if (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 })
      }

      return Response.json({ 
        success: true, 
        logs: data, 
        total: count,
        page,
        pageSize
      })
    } catch (error) {
      return Response.json({ success: false, error: '获取审计日志失败' }, { status: 500 })
    }
  }
)
``` 
