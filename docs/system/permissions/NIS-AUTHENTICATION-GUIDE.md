# NIS 认证系统配置指南

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

系统现在支持两种认证模式：
- **LDAP 认证** - 使用 LDAP 目录服务
- **Linux/NIS 认证** - 使用本地用户或 NIS（Network Information Service）

## 认证模式配置

### 环境变量配置

在 `.env` 文件中设置认证模式：

```bash
# 认证方式（linux|ldap）
AUTH_MODE=linux  # 或 ldap
```

## NIS 环境要求

### 1. 系统要求

系统需要安装以下工具：
- `getent` - 查询系统用户和组信息（支持 NIS）
- `useradd` - 创建系统用户
- `usermod` - 修改系统用户
- `userdel` - 删除系统用户
- `chpasswd` - 修改用户密码
- `ypdomainname` - 查询 NIS 域名（可选）
- `ypwhich` - 查询 NIS 服务器（可选）

### 2. NIS 配置（如果使用 NIS）

#### NIS 客户端配置

```bash
# 安装 NIS 客户端
sudo apt-get install nis  # Ubuntu/Debian
sudo yum install ypbind   # CentOS/RHEL

# 配置 NIS 域名
sudo ypdomainname my-domain

# 启动 NIS 客户端服务
sudo systemctl start ypbind
sudo systemctl enable ypbind
```

#### /etc/nsswitch.conf 配置

确保 `/etc/nsswitch.conf` 配置了 NIS 查询：

```bash
passwd:     files nis
shadow:     files nis
group:      files nis
```

#### NIS 主服务器配置（如果是 NIS 服务器）

```bash
# 安装 NIS 服务器
sudo apt-get install nis  # Ubuntu/Debian

# 配置为 NIS 主服务器
sudo vi /etc/default/nis
# 设置 NISSERVER=master

# 配置 /var/yp/Makefile
sudo vi /var/yp/Makefile
# 确保包含 passwd, shadow, group 等映射

# 初始化 NIS 数据库
cd /var/yp
sudo make

# 启动 NIS 服务
sudo systemctl start ypserv
sudo systemctl enable ypserv
```

## 功能实现

### 1. 认证功能

#### Linux/NIS 认证流程

文件位置：`lib/auth-linux.ts`

```typescript
authenticateLinux(username: string, password: string)
```

**认证步骤**：
1. 检查用户是否存在（使用 `getent passwd`）
2. 获取用户信息（UID、GID、家目录等）
3. 使用 `su` 命令验证密码（通过 PAM 认证）
4. 查询 Supabase 获取用户角色和权限
5. 返回认证结果

### 2. 用户管理功能

文件位置：`lib/nis-user.ts`

#### 检查 NIS 环境

```typescript
checkNisConfiguration()
```

返回 NIS 配置状态：
- `configured` - 是否配置了 NIS
- `domain` - NIS 域名
- `server` - NIS 服务器地址

#### 添加用户

```typescript
addNisUser(username, password, realName, options)
```

参数：
- `username` - 用户名
- `password` - 密码
- `realName` - 真实姓名（可选）
- `options` - 可选配置
  - `uid` - 指定 UID
  - `gid` - 指定 GID（默认 2000）
  - `home` - 家目录（默认 `/home/${username}`）
  - `shell` - 登录 shell（默认 `/bin/bash`）

返回：
- `success` - 是否成功
- `uid` - 分配的 UID
- `error` - 错误信息（如果失败）

#### 修改密码

```typescript
changeNisPassword(username, newPassword)
```

#### 删除用户

```typescript
deleteNisUser(username, removeHome)
```

参数：
- `username` - 用户名
- `removeHome` - 是否删除家目录（默认 false）

#### 更新用户信息

```typescript
updateNisUser(username, options)
```

可更新的字段：
- `realName` - 真实姓名
- `shell` - 登录 shell
- `home` - 家目录

#### 列出用户

```typescript
listNisUsers()
```

返回所有 UID >= 1000 的普通用户列表。

### 3. API 接口

#### POST /api/users - 添加用户

根据 `AUTH_MODE` 自动选择 LDAP 或 NIS 创建用户。

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "Test@123",
    "real_name": "Test User",
    "email": "test@example.com",
    "department": "IT",
    "role": "user"
  }'
```

#### PUT/PATCH /api/users/[id]/password - 修改密码

根据 `AUTH_MODE` 自动选择修改方式。

```bash
curl -X PUT http://localhost:3000/api/users/{user_id}/password \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewPassword@123"
  }'
```

## 测试步骤

### 1. 测试环境检查

```bash
# 检查 NIS 配置
npm run test:nis-config

# 或手动检查
ypdomainname  # 查看 NIS 域名
ypwhich       # 查看 NIS 服务器
getent passwd # 查看所有用户（包括 NIS 用户）
```

### 2. 测试用户创建

```bash
# 使用测试脚本
npm run test:nis-user-create

# 或通过 API
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser001",
    "password": "Test@123",
    "real_name": "Test User 001"
  }'
```

### 3. 测试用户认证

```bash
# 使用测试脚本
npm run test:nis-auth

# 或通过登录 API
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser001",
    "password": "Test@123"
  }'
```

### 4. 测试密码修改

```bash
# 通过 API
curl -X PUT http://localhost:3000/api/users/{user_id}/password \
  -H "Content-Type: application/json" \
  -d '{
    "password": "NewPassword@456"
  }'
```

## 权限要求

### 应用程序权限

应用程序需要以 root 权限运行或配置 sudo 权限，因为用户管理操作需要：

1. **创建用户**：需要 `useradd` 权限
2. **修改密码**：需要 `chpasswd` 权限
3. **删除用户**：需要 `userdel` 权限
4. **更新 NIS 数据库**：需要访问 `/var/yp` 并执行 `make`

### Sudo 配置（推荐）

如果不想以 root 运行应用，可以配置特定的 sudo 权限：

```bash
# /etc/sudoers.d/hpc-app
hpcapp ALL=(ALL) NOPASSWD: /usr/sbin/useradd
hpcapp ALL=(ALL) NOPASSWD: /usr/sbin/usermod
hpcapp ALL=(ALL) NOPASSWD: /usr/sbin/userdel
hpcapp ALL=(ALL) NOPASSWD: /usr/sbin/chpasswd
hpcapp ALL=(ALL) NOPASSWD: /usr/bin/make -C /var/yp
```

## 安全注意事项

### 1. 密码安全

- 密码通过标准输入传递给 `chpasswd`，避免命令行泄露
- 建议配置强密码策略
- 定期审计用户密码

### 2. 日志记录

所有用户操作都会记录到系统日志：
- 用户创建
- 密码修改
- 用户删除
- 认证成功/失败

### 3. NIS 数据库同步

- 用户操作后自动执行 `cd /var/yp && make`
- 如果不在 NIS 主服务器上，此操作会失败但不影响用户创建
- 建议定期检查 NIS 数据库同步状态

### 4. 权限隔离

- 普通用户只能修改自己的密码
- 管理员可以管理所有用户
- 使用 JWT 验证所有 API 请求

## 故障排查

### 1. 用户创建失败

**问题**：`useradd: cannot lock /etc/passwd`

**解决**：
```bash
# 检查权限
ls -l /etc/passwd /etc/shadow

# 确保应用有足够权限
sudo chown root:root /etc/passwd /etc/shadow
sudo chmod 644 /etc/passwd
sudo chmod 640 /etc/shadow
```

### 2. NIS 数据库更新失败

**问题**：`make: *** No targets specified and no makefile found`

**解决**：
```bash
# 检查是否在 NIS 主服务器上
ypwhich -m

# 如果不在主服务器上，这个错误可以忽略
# 用户仍然会在本地系统创建，只是不会同步到 NIS
```

### 3. 认证失败

**问题**：用户存在但无法登录

**解决**：
```bash
# 检查用户是否存在
getent passwd username

# 检查 PAM 配置
ls -l /etc/pam.d/

# 测试 su 命令
su - username

# 检查用户 shell
grep username /etc/passwd

# 检查家目录权限
ls -ld /home/username
```

### 4. UID 冲突

**问题**：`useradd: UID 2000 already exists`

**解决**：
- 系统会自动从数据库和系统中获取最大 UID 并递增
- 如果仍然冲突，检查是否有孤立的系统用户
- 可以手动清理或指定 UID 范围

## 与 LDAP 的对比

| 功能 | LDAP | NIS/Linux |
|------|------|-----------|
| **集中管理** | ✅ 完全集中 | ⚠️ 需要 NIS 服务器 |
| **扩展性** | ✅ 优秀 | ⚠️ 有限 |
| **配置复杂度** | ⚠️ 较高 | ✅ 简单 |
| **性能** | ✅ 高 | ✅ 高 |
| **安全性** | ✅ 支持 SSL/TLS | ⚠️ 基础安全 |
| **用户管理** | ✅ 完整 | ✅ 完整 |
| **适用场景** | 大规模部署 | 小型集群 |

## 最佳实践

1. **小型部署（< 50 用户）**：使用 Linux/NIS 认证即可
2. **中大型部署（> 50 用户）**：建议使用 LDAP 认证
3. **混合环境**：可以在不同环境使用不同认证模式
4. **定期备份**：备份 `/etc/passwd`、`/etc/shadow` 和 Supabase 数据库
5. **监控日志**：定期检查认证日志和用户操作日志

## 相关文档

- [LDAP 认证配置指南](../authentication/user-group-management.md)
- [用户权限管理](./deployment-auth-checklist.md)
- [系统安全配置](../../operations/troubleshooting.md)
