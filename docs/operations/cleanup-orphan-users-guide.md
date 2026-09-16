# 清理孤立用户脚本使用指南

> 适用范围：线上运行维护、故障排查、部署与运维操作
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题背景

当删除数据库中的用户记录时，Supabase Auth中的认证账号可能仍然存在，导致：
- 用户依然可以登录系统
- 造成安全风险
- 数据不一致

## 解决方案

我们提供了专门的脚本来清理这些孤立的认证用户账号。

## 脚本位置

- **主脚本**: `scripts/cleanup-orphan-auth-users.js`
- **Shell包装器**: `scripts/cleanup-orphan-users.sh`

## 使用方法

### 1. 预览清理（推荐首次使用）

```bash
# 使用Shell脚本（推荐）
./scripts/cleanup-orphan-users.sh --dry-run --verbose

# 或直接使用Node.js脚本
node scripts/cleanup-orphan-auth-users.js --dry-run --verbose
```

**输出示例**：
```
[INFO] 开始清理孤立的认证用户账号...
[INFO] 模式: DRY-RUN
[INFO] 获取Supabase Auth用户列表...
[INFO] Auth用户总数: 24
[INFO] 获取业务用户列表...
[INFO] 业务用户总数: 18
[INFO] 发现 7 个孤立的认证用户
[VERBOSE] 孤立用户: testuser20@my-hpc.com (ID: 0d1785e1-f183-48b7-a51a-6e34f1b502b1)
[VERBOSE] 孤立用户: testuser20@example.com (ID: f0afbcbe-c6c9-4a99-8307-0393b05b7d71)
...
[INFO] [DRY-RUN] 将删除认证用户: testuser20@my-hpc.com
[INFO] [DRY-RUN] 将删除认证用户: testuser20@example.com
...
[SUCCESS] 统计结果: 删除=7
```

### 2. 执行实际清理

```bash
# 使用Shell脚本（推荐）
./scripts/cleanup-orphan-users.sh

# 或直接使用Node.js脚本
node scripts/cleanup-orphan-auth-users.js
```

**输出示例**：
```
[INFO] 开始清理孤立的认证用户账号...
[INFO] 模式: 实际执行
[INFO] 获取Supabase Auth用户列表...
[INFO] Auth用户总数: 24
[INFO] 获取业务用户列表...
[INFO] 业务用户总数: 18
[INFO] 发现 7 个孤立的认证用户
[SUCCESS] 已删除认证用户: testuser20@my-hpc.com
[SUCCESS] 已删除认证用户: testuser20@example.com
...
[SUCCESS] 统计结果: 删除=7
```

### 3. 查看帮助信息

```bash
# Shell脚本帮助
./scripts/cleanup-orphan-users.sh --help

# Node.js脚本帮助
node scripts/cleanup-orphan-auth-users.js --help
```

## 脚本选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `--dry-run` | 仅预览操作，不实际执行 | `./scripts/cleanup-orphan-users.sh --dry-run` |
| `--verbose` | 显示详细信息 | `./scripts/cleanup-orphan-users.sh --verbose` |
| `--help` | 显示帮助信息 | `./scripts/cleanup-orphan-users.sh --help` |

## 环境要求

### 必需的环境变量

确保以下环境变量已正确配置：

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# 或者使用私有部署配置
SUPABASE_URL=http://your-supabase-host:8000
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 权限要求

- 需要 `SUPABASE_SERVICE_ROLE_KEY` 权限
- 只有Service Role Key才能删除认证用户

## 工作原理

### 1. 数据收集
- 获取所有Supabase Auth用户
- 获取所有业务表用户

### 2. 对比分析
- 找出Auth中存在但业务表中不存在的用户
- 通过用户ID和邮箱进行匹配

### 3. 清理操作
- 批量删除孤立的认证用户
- 提供详细的操作日志

## 安全注意事项

### ⚠️ 重要提醒

1. **备份数据**
   - 执行清理前建议备份数据库
   - 确保有数据恢复方案

2. **预览模式**
   - 首次使用务必先运行 `--dry-run` 模式
   - 确认要删除的用户列表

3. **权限控制**
   - 只有管理员可以执行清理操作
   - 确保脚本在安全环境中运行

4. **测试环境**
   - 建议先在测试环境验证
   - 确认无误后再在生产环境执行

## 自动化部署

### 定时清理

可以设置cron任务定期执行清理：

```bash
# 编辑crontab
crontab -e

# 每天凌晨2点执行清理
0 2 * * * /opt/my-hpcapp/scripts/cleanup-orphan-users.sh

# 每周日凌晨3点执行详细清理
0 3 * * 0 /opt/my-hpcapp/scripts/cleanup-orphan-users.sh --verbose
```

### 监控脚本

```bash
#!/bin/bash
# 监控清理结果

LOG_FILE="/var/log/cleanup-orphan-users.log"
SCRIPT_PATH="/opt/my-hpcapp/scripts/cleanup-orphan-users.sh"

# 执行清理并记录日志
$SCRIPT_PATH >> $LOG_FILE 2>&1

# 检查执行结果
if [ $? -eq 0 ]; then
    echo "$(date): 清理成功" >> $LOG_FILE
else
    echo "$(date): 清理失败" >> $LOG_FILE
    # 可以添加告警通知
fi
```

## 故障排除

### 常见问题

1. **权限错误**
   ```bash
   [ERROR] SUPABASE_SERVICE_ROLE_KEY 未设置
   ```
   **解决方案**: 检查环境变量配置

2. **连接失败**
   ```bash
   [ERROR] 获取Auth用户失败: connection refused
   ```
   **解决方案**: 检查网络连接和Supabase服务状态

3. **脚本权限**
   ```bash
   -bash: ./scripts/cleanup-orphan-users.sh: Permission denied
   ```
   **解决方案**: 
   ```bash
   chmod +x scripts/cleanup-orphan-users.sh
   ```

### 调试命令

```bash
# 检查环境配置
./scripts/cleanup-orphan-users.sh --help

# 测试Supabase连接
node -e "
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
supabase.auth.admin.listUsers().then(result => {
  console.log('连接成功，用户数量:', result.data.users.length)
}).catch(error => {
  console.error('连接失败:', error.message)
})
"

# 查看详细日志
node scripts/cleanup-orphan-auth-users.js --dry-run --verbose
```

## 最佳实践

### 1. 定期清理
- 建议每周执行一次清理
- 避免孤立用户积累过多

### 2. 监控告警
- 设置清理结果监控
- 异常情况及时通知

### 3. 文档记录
- 记录清理操作日志
- 保存清理统计信息

### 4. 测试验证
- 清理后验证系统功能
- 确认用户登录正常

## 联系支持

如果遇到问题，请：
1. 查看详细错误日志
2. 检查环境配置
3. 联系系统管理员

---

**注意**: 此脚本会永久删除认证用户，请谨慎使用！ 
