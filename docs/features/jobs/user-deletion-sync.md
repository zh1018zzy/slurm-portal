# 用户删除同步功能说明

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 问题背景

在使用Supabase等后端服务时，经常遇到以下问题：
- 删除了数据库 `users` 表中的用户记录
- 但Supabase Auth中的认证账号仍然存在
- 导致用户依然可以登录系统，造成安全风险

## 解决方案

我们实现了完整的用户删除同步机制，确保删除用户时同时清理所有相关数据。

## 功能特性

### 1. 同步删除机制
- **删除用户时自动清理**：删除业务用户时，自动删除对应的Supabase Auth账号
- **LDAP同步**：同时删除LDAP中的用户记录
- **错误容错**：即使某个步骤失败，也会继续执行其他清理操作

### 2. 孤立用户清理
- **批量清理**：清理Supabase Auth中孤立的用户账号
- **预览模式**：可以预览将要删除的用户，不实际执行
- **详细统计**：提供清理操作的详细统计信息

### 3. 登录校验
- **业务表校验**：登录时检查用户是否存在于业务表中
- **拒绝访问**：如果业务表中没有用户记录，直接拒绝登录

## 使用方法

### 1. 删除单个用户

#### Web界面
1. 进入 **系统管理** > **用户管理**
2. 在用户列表中找到要删除的用户
3. 点击删除按钮
4. 系统会自动：
   - 删除Supabase Auth账号
   - 删除LDAP用户记录
   - 删除业务表用户记录

#### API调用
```bash
DELETE /api/users/{userId}
Authorization: Bearer <token>
```

### 2. 批量清理孤立用户

#### Web界面
1. 进入 **系统管理** > **用户管理**
2. 点击 **预览清理** 查看将要删除的孤立用户
3. 确认无误后，点击 **清理孤立用户** 执行实际清理

#### 命令行
```bash
# 预览清理（推荐首次使用）
./scripts/cleanup-orphan-users.sh --dry-run --verbose

# 执行实际清理
./scripts/cleanup-orphan-users.sh

# 仅显示将要删除的用户
node scripts/cleanup-orphan-auth-users.js --dry-run
```

#### API调用
```bash
# 预览清理
POST /api/users/cleanup-orphan
Authorization: Bearer <token>
Content-Type: application/json

{
  "dryRun": true
}

# 执行清理
POST /api/users/cleanup-orphan
Authorization: Bearer <token>
Content-Type: application/json

{
  "dryRun": false
}

# 获取清理状态
GET /api/users/cleanup-orphan
Authorization: Bearer <token>
```

## 技术实现

### 1. 删除用户API (`/api/users/[id]`)

```typescript
// 删除流程
1. 查找用户信息
2. 删除Supabase Auth账号
3. 删除LDAP用户记录
4. 删除业务表用户记录
```

### 2. 清理脚本 (`scripts/cleanup-orphan-auth-users.js`)

```typescript
// 清理流程
1. 获取所有Supabase Auth用户
2. 获取所有业务用户
3. 找出孤立的Auth用户
4. 批量删除孤立用户
```

### 3. 认证校验 (`lib/auth-ldap.ts`)

```typescript
// 登录校验
1. LDAP认证成功
2. 检查业务表中是否存在用户
3. 如果不存在，拒绝登录
```

## 安全注意事项

### 1. 权限控制
- 只有管理员可以执行用户删除和清理操作
- 所有操作都需要有效的认证令牌

### 2. 数据备份
- 执行批量清理前建议备份数据库
- 使用预览模式确认要删除的用户

### 3. 错误处理
- 删除操作具有容错性，单个步骤失败不会影响其他步骤
- 所有操作都有详细的日志记录

## 监控和维护

### 1. 定期清理
建议定期执行孤立用户清理：

```bash
# 每天凌晨2点执行清理
0 2 * * * /path/to/your/project/scripts/cleanup-orphan-users.sh

# 每周执行一次详细清理
0 3 * * 0 /path/to/your/project/scripts/cleanup-orphan-users.sh --verbose
```

### 2. 监控指标
- Auth用户数量 vs 业务用户数量
- 孤立用户数量
- 删除操作成功率

### 3. 日志查看
所有操作都会记录详细日志：
- 删除的用户信息
- 操作结果统计
- 错误信息

## 故障排除

### 1. 常见问题

#### 删除用户失败
- 检查用户是否存在
- 确认有管理员权限
- 查看错误日志

#### 清理脚本失败
- 检查环境变量配置
- 确认Supabase Service Role Key权限
- 验证网络连接

#### 用户仍能登录
- 检查业务表校验逻辑
- 确认认证流程正确
- 查看认证日志

### 2. 调试命令

```bash
# 检查环境配置
./scripts/cleanup-orphan-users.sh --help

# 测试Supabase连接
node -e "
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
supabase.auth.admin.listUsers().then(console.log).catch(console.error)
"

# 查看孤立用户详情
node scripts/cleanup-orphan-auth-users.js --dry-run --verbose
```

## 最佳实践

### 1. 删除用户
- 优先使用Web界面删除，确保完整清理
- 删除前确认用户不再需要访问系统
- 记录删除原因和操作人员

### 2. 批量清理
- 首次使用务必先预览
- 定期执行清理，避免孤立用户积累
- 监控清理结果，及时处理异常

### 3. 系统维护
- 定期检查用户数据一致性
- 监控认证日志，发现异常登录
- 及时更新用户权限和状态

## 总结

通过这套完整的用户删除同步机制，我们确保了：

1. **数据一致性**：删除用户时同步清理所有相关数据
2. **安全性**：防止已删除用户继续访问系统
3. **可维护性**：提供多种清理方式和详细日志
4. **容错性**：单个操作失败不影响整体流程

这套方案有效解决了用户删除后认证信息残留的问题，提高了系统的安全性和可维护性。 
