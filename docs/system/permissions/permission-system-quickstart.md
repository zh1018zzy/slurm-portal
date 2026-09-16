# 权限控制系统快速开始指南

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🚀 快速开始

### 1. 初始化数据库

```bash
# 运行初始化脚本
chmod +x scripts/setup-permission-system.sh
./scripts/setup-permission-system.sh
```

### 2. API权限控制

```typescript
// 在API路由中使用权限中间件
import { withPermission } from '@/lib/permission-middleware'

export const GET = withPermission({ 
  resource: 'job', 
  action: 'read', 
  scope: 'all' 
})(async (req: NextRequest) => {
  return Response.json({ success: true, data: [] })
})
```

### 3. 前端权限控制

```tsx
// 使用权限守卫组件
import PermissionGuard from '@/components/PermissionGuard'

<PermissionGuard resource="user" action="create" scope="all">
  <Button onClick={createUser}>创建用户</Button>
</PermissionGuard>

// 使用权限Hook
import { usePermission } from '@/hooks/use-permission'

const { hasPermission } = usePermission('job', 'delete', 'own')
{hasPermission && <Button onClick={deleteJob}>删除作业</Button>}
```

## 📚 核心概念

### 权限结构
- **resource**: 资源类型 (user, job, app, file, system)
- **action**: 操作类型 (create, read, update, delete, admin)
- **scope**: 作用域 (own, department, all)

### 角色层级
- super_admin (100): 超级管理员
- system_admin (80): 系统管理员
- user_admin (60): 用户管理员
- user (20): 普通用户
- guest (10): 访客

## 🔧 常用功能

### API权限检查
```typescript
// 单个权限
withPermission({ resource: 'user', action: 'create', scope: 'all' })

// 批量权限 (AND逻辑)
withMultiplePermissions([
  { resource: 'user', action: 'create', scope: 'all' },
  { resource: 'system', action: 'admin', scope: 'all' }
], true)
```

### 前端权限检查
```tsx
// 基础权限守卫
<PermissionGuard resource="user" action="create" scope="all">
  <CreateUserForm />
</PermissionGuard>

// 管理员守卫
<AdminGuard>
  <AdminPanel />
</AdminGuard>

// 权限Hook
const { hasPermission, loading } = usePermission('job', 'delete', 'own')
```

## 📋 权限矩阵

| 资源/操作 | 创建 | 读取 | 更新 | 删除 | 管理 |
|-----------|------|------|------|------|------|
| 用户 | super_admin | own + admin | own + admin | super_admin | user_admin |
| 作业 | all | own + admin | own + admin | own + admin | job_admin |
| 应用 | app_admin | based on config | app_admin | app_admin | app_admin |
| 文件 | all | own + shared | own | own + admin | storage_admin |
| 系统 | system_admin | admin | system_admin | system_admin | super_admin |

## 🛠️ 最佳实践

1. **最小权限原则**: 用户只获得完成任务所需的最小权限
2. **默认拒绝原则**: 未明确授权的操作一律拒绝
3. **权限分离**: 敏感操作需要多重权限验证
4. **定期审查**: 定期审查权限配置和使用情况

## 🔍 故障排除

### 常见问题
1. **权限检查失败**: 检查用户角色和权限配置
2. **性能问题**: 启用权限缓存，优化查询
3. **权限不一致**: 清理缓存，重新分配角色

### 调试工具
```typescript
// 查看用户权限
const { permissions, roles } = useUserPermissions()
console.log('用户权限:', permissions)
console.log('用户角色:', roles)
```

---

更多详细信息请参考完整文档：
- `docs/permission-control-system.md`
- `docs/permission-control-system-part2.md`
- `docs/permission-control-system-part3.md`
- `docs/permission-control-system-part4.md` 
