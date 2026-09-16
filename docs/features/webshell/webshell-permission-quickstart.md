# WebShell权限系统快速入门

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

WebShell权限系统是一个基于用户的简单访问控制方案，允许管理员控制哪些用户可以访问WebShell功能。

## 快速设置

### 1. 初始化权限
```bash
node scripts/setup-webshell-permissions.js
```

### 2. 管理权限
访问 `/dashboard/system/users` 页面，在用户列表中：
- 查看WebShell权限状态
- 点击终端图标按钮切换权限

### 3. 测试功能
```bash
node scripts/test-webshell-permissions.js
```

## 功能特性

- ✅ 用户级权限控制
- ✅ 管理员界面集成
- ✅ 实时权限检查
- ✅ 权限状态显示

## API接口

### 权限检查
```
GET /api/webshell/check-access
Authorization: Bearer <TOKEN>
```

### 权限管理
```
GET /api/users/webshell-permissions
PUT /api/users/webshell-permissions
```

## 权限控制流程

1. 用户登录 → 检查权限
2. 有权限 → 显示WebShell按钮
3. 点击按钮 → 再次验证权限
4. 访问页面 → 最终权限验证

## 故障排除

**问题**: 用户看不到WebShell按钮
**解决**: 在用户管理页面启用WebShell权限

**问题**: 权限检查失败
**解决**: 检查JWT token和数据库连接 
