# 权限控制系统使用指南

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 概述

本权限控制系统为HPC集群管理系统提供了完整的权限控制解决方案，包括细粒度权限控制、角色管理、权限审计等功能。

## 🚀 快速开始

### 1. 初始化数据库

首先运行初始化脚本创建权限相关的数据表：

```bash
# 确保环境变量已设置
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# 运行初始化脚本
chmod +x scripts/setup-permission-system.sh
./scripts/setup-permission-system.sh
```

### 2. 基础使用

#### API权限控制

```typescript
// 在API路由中使用权限中间件
import { withPermission } from '@/lib/permission-middleware'

// 单个权限检查
export const GET = withPermission({ 
  resource: 'job', 
  action: 'read', 
  scope: 'all' 
})(async (req: NextRequest) => {
  // 只有有权限的用户才能访问此API
  return Response.json({ success: true, data: [] })
})

// 批量权限检查
export const POST = withMultiplePermissions([
  { resource: 'user', action: 'create', scope: 'all' },
  { resource: 'system', action: 'admin', scope: 'all' }
], true)(async (req: NextRequest) => {
  // 需要同时具备两个权限
  return Response.json({ success: true })
})
```

#### 前端权限控制

```tsx
// 使用权限守卫组件
import PermissionGuard, { AdminGuard, PermissionDenied } from '@/components/PermissionGuard'

// 基础权限检查
<PermissionGuard resource="user" action="create" scope="all">
  <Button onClick={createUser}>创建用户</Button>
</PermissionGuard>

// 管理员权限检查
<AdminGuard>
  <div>管理员专用内容</div>
</AdminGuard>

// 自定义权限不足提示
<PermissionGuard 
  resource="system" 
  action="admin" 
  scope="all"
  fallback={<PermissionDenied resource="系统" action="管理" />}
>
  <SystemSettings />
</PermissionGuard>
```

#### 使用权限Hook

```tsx
import { usePermission, useUserPermissions } from '@/hooks/use-permission'

function MyComponent() {
  // 单个权限检查
  const { hasPermission, loading } = usePermission('job', 'delete', 'own')
  
  // 获取用户所有权限
  const { permissions, roles, loading } = useUserPermissions()

  if (loading) return <div>加载中...</div>

  return (
    <div>
      {hasPermission && <Button onClick={deleteJob}>删除作业</Button>}
      <div>您的角色: {roles.join(', ')}</div>
    </div>
  )
}
```

## 📚 详细使用说明

### 权限模型

#### 权限结构
```typescript
interface Permission {
  resource: string    // 资源类型: 'user', 'job', 'app', 'file', 'system'
  action: string      // 操作类型: 'create', 'read', 'update', 'delete', 'admin'
  scope: string       // 作用域: 'own', 'department', 'all'
}
```

#### 角色层级
- **super_admin** (100): 超级管理员，拥有所有权限
- **system_admin** (80): 系统管理员，拥有大部分权限
- **user_admin** (60): 用户管理员
- **app_admin** (60): 应用管理员
- **job_admin** (60): 作业管理员
- **storage_admin** (60): 存储管理员
- **advanced_user** (40): 高级用户
- **researcher** (30): 研究员
- **user** (20): 普通用户
- **guest** (10): 访客

### API权限控制

#### 基础权限中间件

```typescript
// 单个权限检查
export const GET = withPermission({ 
  resource: 'job', 
  action: 'read', 
  scope: 'all' 
})(handler)

// 条件权限检查
export const PUT = withConditionalPermission(
  { resource: 'job', action: 'update', scope: 'all' },
  (req, userInfo) => {
    // 自定义条件逻辑
    return req.method === 'PUT' && userInfo.role === 'admin'
  }
)(handler)
```

#### 批量权限检查

```typescript
// 需要所有权限 (AND逻辑)
export const POST = withMultiplePermissions([
  { resource: 'user', action: 'create', scope: 'all' },
  { resource: 'system', action: 'admin', scope: 'all' }
], true)(handler)

// 需要任一权限 (OR逻辑)
export const GET = withMultiplePermissions([
  { resource: 'job', action: 'read', scope: 'all' },
  { resource: 'job', action: 'read', scope: 'own' }
], false)(handler)
```

### 前端权限控制

#### 权限守卫组件

```tsx
// 基础权限守卫
<PermissionGuard resource="user" action="create" scope="all">
  <CreateUserForm />
</PermissionGuard>

// 管理员守卫
<AdminGuard>
  <AdminPanel />
</AdminGuard>

// 超级管理员守卫
<SuperAdminGuard>
  <SuperAdminPanel />
</SuperAdminGuard>

// 批量权限守卫
<MultiplePermissionGuard 
  permissions={[
    { resource: 'user', action: 'read', scope: 'all' },
    { resource: 'system', action: 'admin', scope: 'all' }
  ]}
  logic="AND"
>
  <UserManagementPanel />
</MultiplePermissionGuard>

// 条件权限守卫
<ConditionalPermissionGuard 
  condition={() => {
    // 根据当前状态动态决定权限要求
    return isEditing ? 
      { resource: 'user', action: 'update', scope: 'all' } : 
      { resource: 'user', action: 'read', scope: 'all' }
  }}
>
  <UserForm />
</ConditionalPermissionGuard>
```

#### 权限Hook使用

```tsx
// 单个权限检查
const { hasPermission, loading, error } = usePermission('job', 'delete', 'own')

// 批量权限检查
const permissions = [
  { resource: 'user', action: 'create', scope: 'all' },
  { resource: 'system', action: 'admin', scope: 'all' }
]
const results = useMultiplePermissions(permissions)

// 角色检查
const { hasPermission: isAdmin } = useRole('admin')

// 获取用户权限信息
const { permissions, roles, loading } = useUserPermissions()
```

### 权限管理API

#### 权限检查API

```typescript
// 检查单个权限
POST /api/permissions/check
{
  "resource": "user",
  "action": "create",
  "scope": "all"
}

// 批量检查权限
POST /api/permissions/check-multiple
{
  "permissions": [
    { "resource": "user", "action": "create", "scope": "all" },
    { "resource": "system", "action": "admin", "scope": "all" }
  ]
}

// 检查角色
POST /api/permissions/check-role
{
  "roleName": "admin"
}
```

#### 用户权限管理

```typescript
// 获取用户角色
GET /api/permissions/users/{userId}/roles

// 分配用户角色
POST /api/permissions/users/{userId}/roles
{
  "roleId": "role-uuid",
  "expiresAt": "2024-12-31T23:59:59Z",
  "grantedBy": "admin-user-id"
}

// 移除用户角色
DELETE /api/permissions/users/{userId}/roles?roleId={roleId}
```

#### 角色权限管理

```typescript
// 获取角色权限
GET /api/permissions/roles/{roleId}/permissions

// 为角色分配权限
POST /api/permissions/roles/{roleId}/permissions
{
  "permissionId": "permission-uuid",
  "conditions": {}
}
```

#### 权限审计

```typescript
// 获取权限审计日志
GET /api/permissions/audit?page=1&pageSize=20&userId=xxx&resource=user

// 获取权限使用统计
GET /api/permissions/audit/stats?startDate=2024-01-01&endDate=2024-12-31

// 导出审计日志
GET /api/permissions/audit/export?format=csv&startDate=2024-01-01
```

## 🔧 高级功能

### 权限缓存

系统自动缓存权限检查结果以提高性能：

```typescript
// 权限缓存配置
const PERMISSION_CACHE_TTL = 5 * 60 * 1000 // 5分钟

// 手动清理缓存
import { permissionCache } from '@/lib/permission-cache'
permissionCache.clear()
```

### 权限审计

所有权限检查操作都会记录到审计日志：

```typescript
// 查看权限审计日志
const { logs, total } = await getPermissionAuditLogs({
  userId: 'user-id',
  resource: 'user',
  action: 'create',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  page: 1,
  pageSize: 20
})

// 获取权限使用统计
const stats = await getPermissionUsageStats('2024-01-01', '2024-12-31')
console.log('权限授权率:', stats.grantRate)
```

### 自定义权限条件

```typescript
// 在角色权限关联表中设置条件
{
  "timeRestriction": {
    "startTime": "09:00",
    "endTime": "18:00"
  },
  "ipRestriction": ["192.168.1.0/24"],
  "departmentRestriction": ["IT", "HR"]
}

// 在权限检查时验证条件
const hasPermission = await checkPermissionWithConditions(userInfo, permission, {
  currentTime: new Date(),
  clientIP: req.ip,
  userDepartment: userInfo.department
})
```

## 🛠️ 最佳实践

### 1. 权限设计原则

- **最小权限原则**: 用户只获得完成任务所需的最小权限
- **默认拒绝原则**: 未明确授权的操作一律拒绝
- **权限分离**: 敏感操作需要多重权限验证

### 2. 性能优化

- 使用权限缓存减少数据库查询
- 批量检查多个权限
- 合理设置缓存TTL

### 3. 安全考虑

- 定期审查权限配置
- 监控异常权限使用
- 记录所有权限操作

### 4. 错误处理

```typescript
// API错误处理
export const GET = withPermission({ resource: 'job', action: 'read', scope: 'all' })(
  async (req: NextRequest) => {
    try {
      // 业务逻辑
      return Response.json({ success: true, data: [] })
    } catch (error) {
      console.error('API错误:', error)
      return Response.json({ 
        success: false, 
        error: '操作失败' 
      }, { status: 500 })
    }
  }
)

// 前端错误处理
const { hasPermission, loading, error } = usePermission('job', 'delete', 'own')

if (error) {
  return <div className="text-red-500">权限检查失败: {error}</div>
}
```

## 📝 迁移指南

### 从现有权限系统迁移

1. **保留现有用户角色**
```sql
-- 将现有admin用户升级为system_admin
UPDATE users SET role = 'system_admin' WHERE role = 'admin';
```

2. **逐步添加权限控制**
```typescript
// 迁移前
export async function GET(req: NextRequest) {
  // 原有逻辑
}

// 迁移后
export const GET = withPermission({ 
  resource: 'job', 
  action: 'read', 
  scope: 'all' 
})(async (req: NextRequest) => {
  // 原有逻辑
})
```

3. **更新前端组件**
```tsx
// 迁移前
{user.role === 'admin' && <AdminPanel />}

// 迁移后
<AdminGuard>
  <AdminPanel />
</AdminGuard>
```

## 🔍 故障排除

### 常见问题

1. **权限检查失败**
   - 检查用户角色是否正确分配
   - 验证权限配置是否正确
   - 查看权限审计日志

2. **性能问题**
   - 启用权限缓存
   - 优化数据库查询
   - 减少不必要的权限检查

3. **权限不一致**
   - 清理权限缓存
   - 重新分配用户角色
   - 检查权限继承关系

### 调试工具

```typescript
// 权限调试工具
import { debugPermissions } from '@/lib/permission-debug'

const debug = debugPermissions(userId)
const userRoles = await debug.getUserRoles()
const userPermissions = await debug.getUserPermissions()
const hasSpecificPermission = await debug.checkSpecificPermission(permission)
```

## 📞 支持

如果您在使用过程中遇到问题，请：

1. 查看权限审计日志
2. 检查用户角色和权限配置
3. 参考本文档的最佳实践
4. 联系系统管理员

---

通过遵循本指南，您可以充分利用权限控制系统的功能，确保系统安全和数据保护。 
