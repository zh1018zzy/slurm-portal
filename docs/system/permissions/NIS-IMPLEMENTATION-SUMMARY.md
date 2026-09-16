# NIS 用户管理功能实现总结

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 实现概述

为系统添加了完整的 NIS（Network Information Service）用户管理功能，使系统可以支持基于 Linux/NIS 的用户认证和管理，作为 LDAP 认证的替代方案。

## 实现的功能

### 1. 核心库文件

#### `/opt/my-hpcapp/lib/nis-user.ts`

完整的 NIS 用户管理工具库，包含以下功能：

- **环境检查**
  - `checkNisConfiguration()` - 检查 NIS 环境配置状态
  - 自动检测 NIS 域名和服务器

- **用户管理**
  - `addNisUser()` - 添加 NIS/Linux 用户
  - `deleteNisUser()` - 删除用户（可选删除家目录）
  - `updateNisUser()` - 更新用户信息（姓名、shell、家目录）
  - `changeNisPassword()` - 修改用户密码

- **用户查询**
  - `checkNisUserExists()` - 检查用户是否存在
  - `getNisUserInfo()` - 获取用户详细信息
  - `listNisUsers()` - 列出所有普通用户

- **批量操作**
  - `updateAllUsersHomeDirectory()` - 批量更新用户家目录

**特性**：
- 使用 `getent` 支持本地用户和 NIS 用户查询
- 使用标准的 `useradd`、`usermod`、`userdel` 命令
- 自动分配 UID（从数据库或系统获取最大值并递增）
- 自动更新 NIS 数据库（如果在 NIS 主服务器上）
- 完整的错误处理和日志记录

#### `/opt/my-hpcapp/lib/auth-linux.ts`（增强版）

改进的 Linux/NIS 认证实现：

**改进前的问题**：
- 简单使用 `su` 命令，缺少用户存在性检查
- 没有超时机制
- 错误处理不完善
- 日志记录简单

**改进后的特性**：
- ✅ 先检查用户是否存在（使用 `getent`）
- ✅ 获取用户详细信息（UID、GID、家目录等）
- ✅ 使用 `su` 通过 PAM 验证密码（支持 NIS）
- ✅ 添加 5 秒超时机制
- ✅ 完整的日志记录（使用 logger）
- ✅ 查询 Supabase 获取用户角色和权限
- ✅ 拒绝不在业务表中的用户登录

### 2. API 路由更新

#### `/opt/my-hpcapp/app/api/users/route.ts`

**更新内容**：
- 引入 `nis-user` 模块
- 根据 `AUTH_MODE` 环境变量自动选择 LDAP 或 NIS
- 统一的用户添加接口，支持两种认证模式
- 失败时自动回退（删除已创建的系统用户）

#### `/opt/my-hpcapp/app/api/users/[id]/password/route.ts`

**更新内容**：
- 根据 `AUTH_MODE` 自动选择密码修改方式
- 支持 PUT 和 PATCH 两种 HTTP 方法
- 统一的错误处理

### 3. 文档

#### `/opt/my-hpcapp/docs/system/permissions/NIS-AUTHENTICATION-GUIDE.md`

完整的 NIS 认证配置和使用指南，包含：

- **环境配置**
  - 系统要求
  - NIS 客户端配置
  - NIS 服务器配置
  - nsswitch.conf 配置

- **功能说明**
  - 认证流程详解
  - 用户管理功能说明
  - API 接口文档

- **测试指南**
  - 环境检查步骤
  - 用户创建测试
  - 认证测试
  - 密码修改测试

- **权限配置**
  - root 权限要求
  - sudo 配置建议

- **安全注意事项**
  - 密码安全
  - 日志记录
  - NIS 数据库同步
  - 权限隔离

- **故障排查**
  - 常见问题和解决方案
  - 权限问题
  - NIS 同步问题
  - 认证失败排查

- **与 LDAP 对比**
  - 功能对比表
  - 适用场景建议

### 4. 测试脚本

#### `/opt/my-hpcapp/scripts/test/check-nis-config.js`

NIS 环境配置检查脚本：

**检查项目**：
- ✅ 必需命令（getent, useradd, usermod, userdel, chpasswd）
- ✅ 可选 NIS 命令（ypdomainname, ypwhich, ypcat）
- ✅ NIS 配置状态
- ✅ nsswitch.conf 配置
- ✅ 当前用户权限
- ✅ 用户查询功能
- ✅ NIS 服务器配置
- ✅ 环境变量设置

**特性**：
- 彩色输出，清晰的成功/失败/警告提示
- 详细的检查结果和建议
- 区分必需和可选功能
- 提供安装命令建议

#### `/opt/my-hpcapp/scripts/test/test-nis-users.js`

完整的 NIS 用户管理功能测试：

**测试项目**：
1. ✅ 检查 NIS 环境配置
2. ✅ 列出现有用户
3. ✅ 检查测试用户是否已存在
4. ✅ 添加测试用户
5. ✅ 验证用户已创建
6. ✅ 获取用户信息
7. ✅ 修改用户密码
8. ✅ 测试用户认证（新旧密码）
9. ✅ 删除测试用户
10. ✅ 验证用户已删除

**特性**：
- 自动创建和清理测试用户
- 完整的测试流程覆盖
- 详细的测试结果输出
- 测试失败时返回非零退出码

## 使用方法

### 1. 配置认证模式

编辑 `.env` 文件：

```bash
# 使用 Linux/NIS 认证
AUTH_MODE=linux

# 或使用 LDAP 认证
AUTH_MODE=ldap
```

### 2. 检查环境配置

```bash
# 运行环境检查脚本
node scripts/test/check-nis-config.js

# 或使用 npm script（需要在 package.json 中添加）
npm run test:nis-config
```

### 3. 测试用户管理功能

```bash
# 运行完整测试
node scripts/test/test-nis-users.js

# 注意：需要 root 权限或 sudo 权限
sudo node scripts/test/test-nis-users.js
```

### 4. API 使用示例

#### 添加用户

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "username": "newuser",
    "password": "SecurePass@123",
    "real_name": "New User",
    "email": "newuser@example.com",
    "department": "Engineering",
    "role": "user"
  }'
```

#### 修改密码

```bash
curl -X PUT http://localhost:3000/api/users/{user_id}/password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "password": "NewPassword@456"
  }'
```

#### 用户登录

```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "password": "SecurePass@123"
  }'
```

## 技术亮点

### 1. 统一接口设计

- 用户管理 API 自动适配 LDAP 和 NIS 两种模式
- 无需修改前端代码即可切换认证方式
- 通过 `AUTH_MODE` 环境变量轻松配置

### 2. 完善的错误处理

- 操作失败时自动回退（如创建用户失败时删除已创建的系统用户）
- 详细的错误信息返回
- 完整的日志记录

### 3. 兼容性

- 支持纯本地用户（无 NIS）
- 支持 NIS 客户端（查询远程用户）
- 支持 NIS 服务器（自动更新 NIS 数据库）

### 4. 安全性

- 密码通过标准输入传递，避免命令行泄露
- 超时机制防止认证挂起
- 业务表校验，拒绝未授权用户
- 完整的审计日志

### 5. 可维护性

- 模块化设计，职责清晰
- 完整的 TypeScript 类型定义
- 详细的注释和文档
- 自动化测试脚本

## 对比 LDAP 实现

| 功能 | LDAP | NIS/Linux |
|------|------|-----------|
| 认证实现 | ✅ 完善 | ✅ 完善 |
| 用户管理 | ✅ 完整 | ✅ 完整 |
| 添加用户 | ✅ | ✅ |
| 删除用户 | ✅ | ✅ |
| 修改密码 | ✅ | ✅ |
| 更新信息 | ✅ | ✅ |
| 环境检查 | ✅ | ✅ |
| 错误处理 | ✅ | ✅ |
| 日志记录 | ✅ | ✅ |
| 自动化测试 | ✅ | ✅ |
| 文档完整性 | ✅ | ✅ |

## 文件清单

### 新增文件

1. `/opt/my-hpcapp/lib/nis-user.ts` - NIS 用户管理库
2. `/opt/my-hpcapp/docs/system/permissions/NIS-AUTHENTICATION-GUIDE.md` - 配置指南
3. `/opt/my-hpcapp/scripts/test/check-nis-config.js` - 环境检查脚本
4. `/opt/my-hpcapp/scripts/test/test-nis-users.js` - 功能测试脚本

### 修改文件

1. `/opt/my-hpcapp/lib/auth-linux.ts` - 增强认证实现
2. `/opt/my-hpcapp/app/api/users/route.ts` - 添加 NIS 支持
3. `/opt/my-hpcapp/app/api/users/[id]/password/route.ts` - 添加 NIS 支持

## 后续建议

### 1. 添加到 package.json

```json
{
  "scripts": {
    "test:nis-config": "node scripts/test/check-nis-config.js",
    "test:nis-users": "sudo node scripts/test/test-nis-users.js"
  }
}
```

### 2. 配置 sudo 权限

如果不想以 root 运行应用，配置 sudo 权限：

```bash
# /etc/sudoers.d/hpc-app
hpcapp ALL=(ALL) NOPASSWD: /usr/sbin/useradd
hpcapp ALL=(ALL) NOPASSWD: /usr/sbin/usermod
hpcapp ALL=(ALL) NOPASSWD: /usr/sbin/userdel
hpcapp ALL=(ALL) NOPASSWD: /usr/sbin/chpasswd
hpcapp ALL=(ALL) NOPASSWD: /usr/bin/make -C /var/yp
```

### 3. 集成到 CI/CD

在部署流程中添加环境检查：

```bash
# 部署前检查
npm run test:nis-config

# 功能测试（可选）
npm run test:nis-users
```

### 4. 监控和告警

- 监控用户创建/删除操作
- 监控认证失败次数
- 监控 NIS 同步状态

## 总结

✅ 完整实现了 NIS 用户管理功能
✅ 与 LDAP 实现功能对等
✅ 提供了完整的文档和测试工具
✅ 可以作为 LDAP 的替代方案使用
✅ 适合小型集群或单机部署

系统现在支持两种认证模式，用户可以根据实际需求选择：
- **LDAP**：适合大规模集群，需要集中管理
- **Linux/NIS**：适合小型集群或单机，配置简单

---

**实现日期**: 2025-11-11
**实现者**: Claude Code Assistant
**相关文档**: docs/system/permissions/NIS-AUTHENTICATION-GUIDE.md
