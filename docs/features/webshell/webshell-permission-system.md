# WebShell权限管理系统

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

WebShell权限管理系统是一个基于用户的简单访问控制方案，允许管理员控制哪些用户可以访问WebShell功能。系统通过数据库字段、API接口和前端组件的配合，实现了完整的权限管理功能。

## 功能特性

### 🎯 核心功能
- **用户级权限控制**：基于用户表的`webshell_access`字段控制访问权限
- **管理员界面**：在用户管理页面中直接管理WebShell权限
- **实时权限检查**：前端和后端双重权限验证
- **权限状态显示**：在用户列表中显示每个用户的WebShell权限状态

### 🔐 权限控制层次
1. **前端按钮显示**：只有有权限的用户才能看到WebShell按钮
2. **页面级权限检查**：访问WebShell页面时进行权限验证
3. **后端API权限检查**：WebShell服务器连接时验证权限

## 数据库设计

### users表扩展
```sql
-- 在users表中添加webshell_access字段
ALTER TABLE users ADD COLUMN webshell_access BOOLEAN DEFAULT false;
```

### 字段说明
- `webshell_access`: 布尔值，控制用户是否有WebShell访问权限
  - `true`: 用户有WebShell访问权限
  - `false`: 用户没有WebShell访问权限（默认值）

## API接口

### 1. WebShell权限检查API

**端点**: `GET /api/webshell/check-access`

**功能**: 检查当前用户是否有WebShell访问权限

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "hasAccess": true,
  "error": null
}
```

### 2. 用户WebShell权限管理API

**端点**: `GET /api/users/webshell-permissions`

**功能**: 获取所有用户的WebShell权限列表

**请求头**:
```
Authorization: Bearer <JWT_TOKEN>
```

**响应**:
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "username": "user1",
      "real_name": "用户1",
      "email": "user1@example.com",
      "role": "admin",
      "webshell_access": true
    }
  ]
}
```

**端点**: `PUT /api/users/webshell-permissions`

**功能**: 更新用户的WebShell权限

**请求体**:
```json
{
  "userId": "uuid",
  "hasAccess": true
}
```

**响应**:
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "username": "user1",
    "webshell_access": true
  },
  "message": "用户 user1 的WebShell权限已启用"
}
```

## 前端实现

### 1. WebShell按钮组件

**文件**: `components/WebShell.tsx`

**功能**:
- 检查用户WebShell权限
- 只有有权限的用户才能看到按钮
- 点击时进行权限验证

**关键代码**:
```typescript
useEffect(() => {
  async function checkWebShellAccess() {
    // 调用权限检查API
    const response = await fetch('/api/webshell/check-access', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    setHasWebShellAccess(data.hasAccess)
  }
  checkWebShellAccess()
}, [user])

// 如果没有权限，不显示按钮
if (loading || !hasWebShellAccess) {
  return null
}
```

### 2. WebShell页面权限控制

**文件**: `app/dashboard/webshell/page.tsx`

**功能**:
- 页面加载时检查权限
- 无权限用户自动跳转到仪表板
- 显示权限检查状态

**关键代码**:
```typescript
useEffect(() => {
  async function checkAccess() {
    const response = await fetch('/api/webshell/check-access', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const data = await response.json()
    if (!data.hasAccess) {
      toast({ title: '权限不足', description: '您没有WebShell访问权限' })
      router.push('/dashboard')
      return
    }
    setHasAccess(true)
  }
  checkAccess()
}, [user, router])
```

### 3. 用户管理页面集成

**文件**: `app/dashboard/system/users/page.tsx`

**功能**:
- 显示用户WebShell权限状态
- 提供权限切换按钮
- 实时更新权限状态

**新增功能**:
- WebShell权限列显示
- 权限切换按钮（终端图标）
- 权限状态徽章

## 使用说明

### 1. 初始设置

运行设置脚本为现有用户配置WebShell权限：

```bash
node scripts/setup-webshell-permissions.js
```

脚本会自动：
- 检查并添加`webshell_access`字段
- 为管理员用户启用WebShell权限
- 显示当前权限状态

### 2. 权限管理

管理员可以在用户管理页面中：

1. **查看权限状态**：在用户列表中查看每个用户的WebShell权限状态
2. **切换权限**：点击终端图标按钮启用/禁用用户的WebShell权限
3. **批量管理**：通过用户管理界面统一管理所有用户的权限

### 3. 权限验证流程

1. **用户登录**：用户登录后，系统检查其WebShell权限
2. **按钮显示**：只有有权限的用户才能看到WebShell按钮
3. **页面访问**：点击按钮时再次验证权限
4. **服务器连接**：WebShell服务器连接时进行最终权限验证

## 测试验证

### 1. 运行测试脚本

```bash
node scripts/test-webshell-permissions.js
```

测试脚本会验证：
- 权限检查API功能
- 权限管理API功能
- 用户列表API集成
- 权限更新和恢复功能

### 2. 手动测试

1. **权限检查测试**：
   ```bash
   curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/webshell/check-access
   ```

2. **权限管理测试**：
   ```bash
   # 获取权限列表
   curl -H "Authorization: Bearer <TOKEN>" http://localhost:3000/api/users/webshell-permissions
   
   # 更新用户权限
   curl -X PUT -H "Authorization: Bearer <TOKEN>" -H "Content-Type: application/json" \
     -d '{"userId":"uuid","hasAccess":true}' \
     http://localhost:3000/api/users/webshell-permissions
   ```

## 安全考虑

### 1. 权限验证
- 前端和后端双重验证
- JWT token验证
- 实时权限检查

### 2. 访问控制
- 无权限用户无法看到WebShell入口
- 页面级权限拦截
- 服务器连接权限验证

### 3. 审计日志
- 权限变更记录
- 访问尝试记录
- 错误日志记录

## 故障排除

### 1. 常见问题

**问题**: 用户看不到WebShell按钮
**解决**: 检查用户是否有`webshell_access`权限，在用户管理页面中启用

**问题**: 权限检查API返回错误
**解决**: 检查JWT token是否有效，数据库连接是否正常

**问题**: 权限更新失败
**解决**: 检查用户ID是否正确，数据库权限是否足够

### 2. 调试方法

1. **检查浏览器控制台**：查看前端权限检查日志
2. **检查服务器日志**：查看后端API调用日志
3. **检查数据库**：直接查询用户权限状态
4. **运行测试脚本**：使用测试脚本验证功能

## 扩展功能

### 1. 可能的扩展
- 基于角色的权限控制
- 时间限制的权限
- 更细粒度的权限控制（如命令限制）
- 权限审计和报告

### 2. 配置选项
- 默认权限设置
- 权限继承规则
- 权限过期时间
- 权限通知设置

## 文件结构

```
├── app/
│   ├── api/
│   │   ├── webshell/
│   │   │   └── check-access/
│   │   │       └── route.ts          # WebShell权限检查API
│   │   └── users/
│   │       ├── route.ts              # 用户列表API（已修改）
│   │       └── webshell-permissions/
│   │           └── route.ts          # WebShell权限管理API
│   ├── dashboard/
│   │   ├── system/
│   │   │   └── users/
│   │   │       └── page.tsx          # 用户管理页面（已修改）
│   │   └── webshell/
│   │       └── page.tsx              # WebShell页面（已修改）
│   └── components/
│       └── WebShell.tsx              # WebShell按钮组件（已修改）
├── scripts/
│   ├── setup-webshell-permissions.js # 权限设置脚本
│   └── test-webshell-permissions.js  # 权限测试脚本
└── docs/
    └── webshell-permission-system.md # 本文档
```

## 总结

WebShell权限管理系统提供了一个简单而有效的用户访问控制方案，通过数据库字段、API接口和前端组件的配合，实现了完整的权限管理功能。系统易于使用、安全可靠，为HPC平台的WebShell功能提供了必要的访问控制。

### 主要优势
1. **简单实用**：基于用户表的简单字段控制
2. **易于管理**：在现有用户管理界面中集成
3. **安全可靠**：前端和后端双重权限验证
4. **向后兼容**：不影响现有功能
5. **易于扩展**：为后续更复杂的权限控制奠定基础 
