# 文件权限页面Token无效问题修复

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

在 `/dashboard/system/permissions/file-permissions` 页面出现以下错误：

```
GET http://192.168.31.242:3000/api/admin/file-permissions?userId=14483636-59ae-452f-9f0c-e1f0b0fe5ae8 401 (Unauthorized)
获取用户权限失败: 401 {error: '无效的token'}
```

## 问题原因

1. **JWT_SECRET环境变量缺失**: 环境变量文件中没有配置 `JWT_SECRET`
2. **硬编码Token签名错误**: 页面中硬编码的 `ADMIN_TOKEN` 使用了错误的签名密钥
3. **Token过期**: 原有的硬编码token可能已经过期

## 修复方案

### 1. 添加JWT_SECRET环境变量

在 `.env` 文件中添加：
```bash
JWT_SECRET=my-hpcapp-secret
```

### 2. 创建管理员配置系统

创建了 `lib/admin-config.ts` 文件，提供：
- 管理员token生成函数
- 管理员token获取函数
- 管理员token验证函数

### 3. 创建管理员Token API端点

创建了 `app/api/admin/token/route.ts` 端点，用于：
- 安全地获取管理员token
- 避免在客户端硬编码token

### 4. 更新文件权限页面

修改了 `app/dashboard/system/permissions/file-permissions/page.tsx`：
- 移除硬编码的 `ADMIN_TOKEN`
- 使用动态获取的token
- 添加错误处理和备用token机制

## 修复后的架构

```
客户端页面
    ↓
调用 /api/admin/token 获取管理员token
    ↓
使用获取的token调用文件权限API
    ↓
服务器端验证JWT_SECRET并处理请求
```

## 验证结果

通过测试脚本验证：
- ✅ JWT配置正确
- ✅ Token生成和验证正常
- ✅ 管理员token API正常工作
- ✅ 文件权限API调用成功

## 安全改进

1. **移除硬编码**: 不再在客户端代码中硬编码敏感token
2. **动态生成**: token可以动态生成和更新
3. **环境变量**: 使用环境变量管理JWT密钥
4. **错误处理**: 添加了完善的错误处理机制

## 注意事项

1. 在生产环境中，应该使用更强的JWT_SECRET
2. 可以考虑添加token刷新机制
3. 可以添加IP白名单等额外的安全措施
4. 建议定期轮换JWT_SECRET

## 相关文件

- `.env` - 环境变量配置
- `lib/admin-config.ts` - 管理员配置系统
- `lib/jwt.ts` - JWT工具函数
- `app/api/admin/token/route.ts` - 管理员token API
- `app/dashboard/system/permissions/file-permissions/page.tsx` - 文件权限页面 
