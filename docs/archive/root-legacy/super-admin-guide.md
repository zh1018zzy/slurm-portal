# 超级管理员账户使用指南

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 概述

系统已配置独立的超级管理员账户，该账户：
- **不依赖于现有的认证系统**（Linux/LDAP）
- **拥有系统最高权限**
- **绕过所有许可证和并发登录限制**
- **独立的认证逻辑**

## 超级管理员凭证

- **用户名**: `vtadmin`
- **密码**: `Vtkj2407`

## 主要特点

### 1. 独立认证
超级管理员使用独立的认证模块 (`lib/super-admin.ts`)，不依赖 Linux 系统用户或 LDAP。

### 2. 最高权限
登录后的用户信息包含：
```json
{
  "id": "super-admin-001",
  "username": "vtadmin",
  "role": "super_admin",
  "isAdmin": true,
  "isSuperAdmin": true
}
```

### 3. 绕过限制
超级管理员登录时会：
- 跳过许可证并发登录限制
- 跳过试用版用户数量限制
- 不记录到 Supabase 用户表
- 不受任何认证模式（Linux/LDAP）影响

### 4. 权限识别
系统在以下位置识别超级管理员权限：
- **前端组件**: `AdminProtected` 组件
- **前端布局**: Dashboard 布局（系统管理菜单、大屏按钮等）
- **前端钩子**: `use-dashboard-data` 和其他使用 `useAuth` 的地方
- **后端中间件**: `permission-middleware.ts` 中的 `isAdmin()` 和 `isSuperAdmin()` 函数
- **权限检查器**: `permission-checker.ts` 中的 `checkPermission()` 函数
- **辅助函数**: `admin-utils.ts` 提供统一的管理员验证函数

## 技术实现

### 认证流程

1. 用户提交登录请求到 `/api/auth`
2. 系统首先检查是否为超级管理员凭证
3. 如果是超级管理员，直接返回 JWT token，绕过所有其他检查
4. 如果不是，继续执行普通用户的认证流程

### 权限验证逻辑

系统使用以下条件判断管理员权限（包括超级管理员）：
```typescript
const isAdmin = user?.role === 'admin' ||
                user?.role === 'super_admin' ||
                user?.isAdmin === true ||
                user?.isSuperAdmin === true
```

推荐使用 `lib/admin-utils.ts` 中的辅助函数：
```typescript
import { isAdminUser, isSuperAdminUser } from '@/lib/admin-utils'

// 检查是否为管理员（包括超级管理员）
if (isAdminUser(user)) {
  // 管理员操作
}

// 检查是否为超级管理员
if (isSuperAdminUser(user)) {
  // 超级管理员专属操作
}
```

### 安全性

- 密码使用 SHA256 哈希存储
- 凭证硬编码在 `lib/super-admin.ts` 中
- JWT token 包含 `isSuperAdmin` 标识

### 相关文件

**核心文件**:
- **认证模块**: `/opt/my-hpcapp/lib/super-admin.ts`
- **登录路由**: `/opt/my-hpcapp/app/api/auth/route.ts`
- **辅助函数**: `/opt/my-hpcapp/lib/admin-utils.ts`

**前端验证**:
- **认证 Hook**: `/opt/my-hpcapp/hooks/use-auth.ts`
- **权限组件**: `/opt/my-hpcapp/components/AdminProtected.tsx`
- **仪表盘布局**: `/opt/my-hpcapp/app/[locale]/dashboard/layout.tsx`
- **仪表盘数据**: `/opt/my-hpcapp/hooks/use-dashboard-data.ts`

**后端验证**:
- **权限中间件**: `/opt/my-hpcapp/lib/permission-middleware.ts`
- **权限检查器**: `/opt/my-hpcapp/lib/permission-checker.ts`

## 使用建议

1. **紧急访问**: 当 Linux/LDAP 认证系统出现问题时使用
2. **系统维护**: 执行需要最高权限的管理任务
3. **安全管理**: 妥善保管超级管理员凭证，避免泄露

## 修改密码

如需修改超级管理员密码，请：

1. 编辑 `/opt/my-hpcapp/lib/super-admin.ts`
2. 更新 `SUPER_ADMIN_CONFIG.passwordHash` 为新密码的 SHA256 哈希值
3. 重启应用

生成新密码哈希的方法：
```bash
echo -n "新密码" | sha256sum
```

或使用 Node.js：
```javascript
const crypto = require('crypto');
const hash = crypto.createHash('sha256').update('新密码').digest('hex');
console.log(hash);
```

## 注意事项

⚠️ **安全警告**:
- 超级管理员账户拥有最高权限，请妥善保管凭证
- 建议定期更换密码
- 不要在日志中记录超级管理员密码
- 限制超级管理员账户的使用场景

## 已更新的文件列表

以下文件已更新以支持超级管理员权限：

1. ✅ `lib/super-admin.ts` - 超级管理员认证模块（新建）
2. ✅ `lib/admin-utils.ts` - 管理员验证辅助函数（新建）
3. ✅ `app/api/auth/route.ts` - 登录路由，优先检查超级管理员
4. ✅ `components/AdminProtected.tsx` - 前端权限保护组件
5. ✅ `lib/permission-middleware.ts` - 后端权限中间件
6. ✅ `lib/permission-checker.ts` - 权限检查器
7. ✅ `hooks/use-dashboard-data.ts` - 仪表盘数据钩子
8. ✅ `app/[locale]/dashboard/layout.tsx` - 仪表盘布局
9. ✅ `app/[locale]/dashboard/system/applications/page.tsx` - 应用管理页面

## 测试验证

系统已通过以下测试：
- ✅ 正确凭证可以成功登录
- ✅ 错误密码无法登录
- ✅ 错误用户名无法登录
- ✅ 成功登录后返回正确的用户信息和权限标识
- ✅ 前端正确识别超级管理员权限
- ✅ 后端正确识别超级管理员权限
- ✅ 超级管理员可以访问所有管理功能

## 常见问题

### Q: 登录成功但没有管理员权限？
A: 请检查浏览器控制台，查看用户信息是否包含 `isSuperAdmin: true` 和 `role: 'super_admin'`。如果没有，请清除浏览器缓存和 localStorage，重新登录。

### Q: 如何验证超级管理员身份？
A: 在浏览器开发者工具的控制台中运行：
```javascript
const token = localStorage.getItem('token')
const decoded = JSON.parse(atob(token.split('.')[1]))
console.log(decoded)
```
应该看到 `isSuperAdmin: true` 和 `role: 'super_admin'`。

### Q: 超级管理员能看到所有用户的作业吗？
A: 是的，超级管理员拥有最高权限，可以查看和管理所有用户的作业、文件和系统设置。

