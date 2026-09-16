# LDAP用户同步功能说明

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

LDAP用户同步功能允许将LDAP目录中的用户自动同步到Supabase数据库中，确保两个系统的用户数据保持一致。

## 功能特性

- 🔄 **双向同步**: 支持从LDAP到数据库的同步
- 👀 **预览模式**: 可以预览将要进行的操作而不实际执行
- 🛡️ **安全删除**: 可选的强制删除模式，删除数据库中存在但LDAP中不存在的用户
- 📊 **详细统计**: 提供同步操作的详细统计信息
- 🔐 **权限控制**: 只有管理员可以执行同步操作
- 🚀 **API接口**: 提供REST API接口供前端调用

## 环境配置

### 必需的环境变量

在 `.env.local` 文件中配置以下环境变量：

```bash
# LDAP配置
LDAP_URL=ldap://localhost:389
LDAP_BASE_DN=dc=my-hpc,dc=com
LDAP_BIND_DN=cn=admin,dc=my-hpc,dc=com
LDAP_BIND_PASSWORD=admin

# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### LDAP用户结构要求

LDAP中的用户应该具有以下属性：

- `cn`: 用户名（必需）
- `sn`: 姓氏
- `displayName`: 显示名称
- `mail`: 邮箱地址
- `objectClass`: 必须包含 `inetOrgPerson`

示例LDAP用户条目：
```
dn: cn=john.doe,ou=users,dc=my-hpc,dc=com
objectClass: inetOrgPerson
cn: john.doe
sn: Doe
givenName: John
displayName: John Doe
mail: john.doe@my-hpc.com
```

## 使用方法

### 1. 命令行使用

#### 基本同步（推荐首次使用）
```bash
# 预览同步操作
./scripts/cron/sync-ldap-users.sh --dry-run

# 执行同步（不删除用户）
./scripts/cron/sync-ldap-users.sh

# 强制同步（包括删除）
./scripts/cron/sync-ldap-users.sh --force

# 测试LDAP连接
./scripts/cron/sync-ldap-users.sh --test
```

#### 直接使用Node.js脚本
```bash
# 预览模式
node scripts/ldap-sync.js --dry-run

# 正常同步
node scripts/ldap-sync.js

# 强制同步
node scripts/ldap-sync.js --force
```

### 2. Web界面使用

1. 登录系统并确保具有管理员权限
2. 进入 **系统管理** > **用户管理** 页面
3. 在页面顶部可以看到同步按钮：
   - **预览同步**: 显示将要进行的操作，不实际执行
   - **同步用户**: 执行实际的同步操作

### 3. API接口使用

#### 触发同步
```bash
POST /api/users/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "dryRun": false,
  "force": false
}
```

#### 检查同步状态
```bash
GET /api/users/sync
Authorization: Bearer <token>
```

## 同步逻辑

### 新增用户
- 在LDAP中存在但在数据库中不存在的用户会被添加到数据库
- 新用户默认角色为 `user`
- 自动生成UUID作为用户ID

### 更新用户
- 如果LDAP中的用户信息与数据库中的不一致，会更新数据库中的信息
- 主要更新字段：`real_name`, `email`

### 删除用户（仅强制模式）
- 仅在 `--force` 模式下执行
- 删除数据库中存在但LDAP中不存在的用户
- **⚠️ 危险操作，请谨慎使用**

## 同步示例

### 预览同步
```bash
$ ./scripts/cron/sync-ldap-users.sh --dry-run

[2024-01-15T10:30:00.000Z] [INFO] 检查环境配置...
[2024-01-15T10:30:00.000Z] [SUCCESS] 环境检查通过
[2024-01-15T10:30:00.000Z] [INFO] 测试LDAP连接...
[2024-01-15T10:30:00.000Z] [SUCCESS] LDAP连接测试成功
[2024-01-15T10:30:00.000Z] [INFO] 开始执行LDAP用户同步...
[2024-01-15T10:30:00.000Z] [INFO] 参数: --dry-run
[2024-01-15T10:30:01.000Z] [INFO] 开始LDAP用户同步...
[2024-01-15T10:30:01.000Z] [INFO] 模式: DRY-RUN
[2024-01-15T10:30:01.000Z] [INFO] 从LDAP读取到 5 个用户
[2024-01-15T10:30:01.000Z] [INFO] 从数据库读取到 3 个用户
[2024-01-15T10:30:01.000Z] [INFO] [DRY-RUN] 将添加用户: john.doe
[2024-01-15T10:30:01.000Z] [INFO] [DRY-RUN] 将添加用户: jane.smith
[2024-01-15T10:30:01.000Z] [INFO] [DRY-RUN] 将更新用户: admin
[2024-01-15T10:30:01.000Z] [SUCCESS] 同步完成！
[2024-01-15T10:30:01.000Z] [INFO] 统计: 新增=2, 更新=1
[2024-01-15T10:30:01.000Z] [SUCCESS] LDAP用户同步完成
```

### 实际同步
```bash
$ ./scripts/cron/sync-ldap-users.sh

[2024-01-15T10:35:00.000Z] [INFO] 开始LDAP用户同步...
[2024-01-15T10:35:00.000Z] [INFO] 模式: 实际执行
[2024-01-15T10:35:01.000Z] [INFO] 从LDAP读取到 5 个用户
[2024-01-15T10:35:01.000Z] [INFO] 从数据库读取到 3 个用户
[2024-01-15T10:35:01.000Z] [SUCCESS] 添加用户成功: john.doe
[2024-01-15T10:35:01.000Z] [SUCCESS] 添加用户成功: jane.smith
[2024-01-15T10:35:01.000Z] [SUCCESS] 更新用户成功: admin
[2024-01-15T10:35:01.000Z] [SUCCESS] 同步完成！
[2024-01-15T10:35:01.000Z] [INFO] 统计: 新增=2, 更新=1
```

## 故障排除

### 常见问题

1. **LDAP连接失败**
   - 检查LDAP服务是否运行
   - 验证LDAP配置信息是否正确
   - 确认网络连接正常

2. **权限错误**
   - 确保LDAP绑定DN和密码正确
   - 检查用户是否具有管理员权限

3. **数据库连接失败**
   - 验证Supabase配置
   - 检查网络连接

4. **同步超时**
   - 检查LDAP服务器响应时间
   - 考虑分批同步大量用户

### 日志查看

同步脚本会输出详细的日志信息，包括：
- 环境检查结果
- LDAP连接状态
- 同步操作详情
- 错误信息

### 调试模式

使用 `--verbose` 参数可以获得更详细的输出：
```bash
node scripts/ldap-sync.js --dry-run --verbose
```

## 安全注意事项

1. **权限控制**: 只有管理员可以执行同步操作
2. **预览模式**: 首次使用建议先使用预览模式
3. **备份数据**: 执行强制同步前建议备份数据库
4. **网络安全**: 确保LDAP连接使用安全协议（如LDAPS）

## 自动化

### 定时同步

可以设置cron任务定期执行同步：

```bash
# 每天凌晨2点执行同步
0 2 * * * /path/to/your/project/scripts/cron/sync-ldap-users.sh

# 每小时执行一次预览同步
0 * * * * /path/to/your/project/scripts/cron/sync-ldap-users.sh --dry-run
```

### 监控

建议监控同步操作的执行结果，可以通过以下方式：
- 检查脚本退出码
- 解析日志输出
- 监控数据库用户数量变化

## 技术支持

如果遇到问题，请：
1. 查看详细的错误日志
2. 检查环境配置
3. 验证LDAP和数据库连接
4. 联系系统管理员 
