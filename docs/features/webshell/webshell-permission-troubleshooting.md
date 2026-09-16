# WebShell 权限问题故障排除

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 问题描述

用户点击WebShell后，页面提示检查权限，然后跳转到登录页面。

## 问题分析

### 1. 权限检查流程

WebShell页面的权限检查流程如下：

1. **用户信息检查**：验证`useAuth` hook中的用户信息
2. **Token获取**：从localStorage获取JWT token
3. **API权限检查**：调用`/api/webshell/check-access`接口
4. **权限验证**：检查数据库中的`webshell_access`字段
5. **结果处理**：根据权限结果决定是否允许访问

### 2. 可能的问题点

#### A. 用户信息问题
- `useAuth` hook中的用户信息为空
- JWT token解析失败
- 用户认证状态丢失

#### B. Token问题
- localStorage中的token不存在
- Token格式错误
- Token已过期

#### C. API权限检查问题
- JWT验证失败
- 数据库查询失败
- 用户权限字段不存在

#### D. 数据库权限问题
- `webshell_access`字段为false
- 用户记录不存在
- 数据库连接问题

## 解决方案

### 1. 检查用户权限

#### 方法一：使用管理界面
1. 访问 `/dashboard/system/users`
2. 找到对应用户
3. 点击"WebShell"列的开关按钮启用权限

#### 方法二：使用API
```bash
# 启用用户WebShell权限
curl -X POST http://localhost:3000/api/users/webshell-permissions \
  -H "Content-Type: application/json" \
  -d '{"userId": "用户ID", "hasAccess": true}'
```

#### 方法三：直接数据库操作
```sql
-- 启用特定用户的WebShell权限
UPDATE users SET webshell_access = true WHERE username = '用户名';

-- 启用所有管理员用户的WebShell权限
UPDATE users SET webshell_access = true WHERE role = 'admin';
```

### 2. 检查JWT配置

#### 验证JWT_SECRET
```bash
# 检查环境变量
echo $JWT_SECRET

# 如果没有设置，添加环境变量
export JWT_SECRET="my-hpcapp-secret"
```

#### 验证Token有效性
```javascript
// 在浏览器控制台中检查
console.log('Token:', localStorage.getItem('token'))
console.log('User:', JSON.parse(localStorage.getItem('user')))
```

### 3. 调试权限检查

#### 添加调试日志
WebShell页面已添加详细的调试日志，可以在浏览器控制台中查看：

```javascript
// 控制台输出示例
🔍 开始WebShell权限检查...
用户信息: {username: "sc_admin", role: "admin", ...}
Token存在: true
📡 发送权限检查请求...
响应状态: 200
响应数据: {hasAccess: true}
✅ 权限检查通过
```

#### 手动测试API
```bash
# 使用有效的token测试权限检查API
curl -X GET http://localhost:3000/api/webshell/check-access \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 常见错误及解决方法

#### 错误：未登录
**原因**：JWT token验证失败
**解决**：
1. 检查JWT_SECRET环境变量
2. 重新登录获取新token
3. 清除浏览器缓存

#### 错误：用户不存在
**原因**：数据库中找不到用户记录
**解决**：
1. 检查用户是否正确创建
2. 验证用户名拼写
3. 检查数据库连接

#### 错误：权限不足
**原因**：`webshell_access`字段为false
**解决**：
1. 在用户管理页面启用权限
2. 使用API更新权限
3. 直接修改数据库

## 预防措施

### 1. 权限管理
- 定期检查用户权限设置
- 为新用户设置默认权限
- 建立权限审计机制

### 2. 监控和日志
- 监控权限检查失败率
- 记录权限变更日志
- 设置权限异常告警

### 3. 用户体验
- 提供清晰的错误提示
- 简化权限申请流程
- 优化权限检查性能

## 测试验证

### 1. 功能测试
```bash
# 运行WebShell权限测试
node scripts/test-webshell-permissions.js
```

### 2. 集成测试
1. 登录系统
2. 访问WebShell页面
3. 验证权限检查流程
4. 确认水印功能正常

### 3. 权限测试
- 测试有权限用户访问
- 测试无权限用户访问
- 测试权限变更后的访问

## 相关文档

- [WebShell功能指南](./webshell-feature-guide.md)
- [WebShell权限系统](./webshell-permission-system.md)
- [WebShell集成文档](./webshell-integration.md)
- [权限控制系统](../../system/permissions/permission-control-system.md) 
