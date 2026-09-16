# HPC 管理平台数据库部署指南

## 📋 概述

本指南提供完整的数据库部署方案，适用于：
- ✅ 新系统部署（从零开始）
- ✅ 现有系统迁移
- ✅ 数据库结构更新

## 🆕 方案一：全新部署（推荐用于新系统）

### 1. 使用完整初始化脚本

**文件**: `db/init-complete.sql`

这是一个从零开始的完整数据库初始化脚本，包含：
- ✅ 所有必要的表结构
- ✅ 正确的外键约束（CASCADE 和 SET NULL）
- ✅ 完整的索引和触发器
- ✅ 默认数据（管理员账户、分类、标签等）
- ✅ 实用函数

### 2. 执行方法

#### 方法 A: Supabase 控制台（推荐）

```
1. 登录 Supabase 控制台
2. 进入 SQL Editor
3. 点击 "New query"
4. 复制 db/init-complete.sql 的全部内容
5. 粘贴并点击 "Run"
6. 等待执行完成（约 5-10 秒）
7. 查看成功提示信息
```

#### 方法 B: 命令行

```bash
# 设置数据库连接
export DATABASE_URL='postgresql://user:password@host:port/database'

# 执行初始化脚本
psql $DATABASE_URL -f db/init-complete.sql

# 查看执行结果
echo $?  # 0 表示成功
```

### 3. 验证部署

执行以下 SQL 验证数据库结构：

```sql
-- 检查表数量
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
-- 应该显示约 25-30 个表

-- 检查外键约束
SELECT 
    COUNT(*) as constraint_count,
    COUNT(CASE WHEN delete_rule = 'CASCADE' THEN 1 END) as cascade_count,
    COUNT(CASE WHEN delete_rule = 'SET NULL' THEN 1 END) as set_null_count
FROM information_schema.referential_constraints;

-- 检查默认管理员
SELECT username, email, role FROM users WHERE username = 'admin';
```

## 🔄 方案二：现有系统迁移

### 1. 检查现有数据库状态

使用检查脚本评估现有数据库：

```bash
# 运行检查脚本
psql $DATABASE_URL -f db/check-database-status.sql
```

### 2. 决策树

```
现有数据库有重要数据？
├─ 是 → 执行增量迁移
│   ├─ 备份现有数据
│   ├─ 执行缺失表创建脚本
│   └─ 运行外键修复脚本 (db/fix-user-foreign-keys.sql)
│
└─ 否 → 全新部署
    ├─ 删除现有表
    └─ 执行完整初始化脚本
```

### 3. 增量迁移步骤

#### 步骤 1: 备份现有数据

```bash
# 备份整个数据库
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 或只备份数据（不包括结构）
pg_dump $DATABASE_URL --data-only > data_backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 步骤 2: 创建缺失的表

根据检查结果，选择性执行以下脚本：

```bash
# 如果缺少权限表
psql $DATABASE_URL -f db/create_permissions_tables.sql

# 如果缺少通知表
psql $DATABASE_URL -f docker/supabase/volumes/db/hpc-notifications.sql

# 如果缺少用户组表
psql $DATABASE_URL -f db/add_user_groups_tables.sql

# 如果缺少黑名单表
psql $DATABASE_URL << 'EOF'
CREATE TABLE IF NOT EXISTS deleted_users_blacklist (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_by VARCHAR(255),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_deleted_users_blacklist_username ON deleted_users_blacklist(username);
EOF
```

#### 步骤 3: 修复外键约束

```bash
# 执行外键约束修复
psql $DATABASE_URL -f db/fix-user-foreign-keys.sql
```

#### 步骤 4: 验证迁移

```bash
# 运行检查脚本
./scripts/check-user-foreign-keys.sh

# 或使用 SQL 检查
psql $DATABASE_URL -f db/check-actual-foreign-keys.sql
```

## 🧹 方案三：清理重建（适用于测试/开发环境）

### ⚠️ 警告：此操作会删除所有数据！

```sql
-- 方法 1: 删除所有表（谨慎使用）
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- 方法 2: 删除并重建 schema
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
```

然后执行完整初始化脚本：

```bash
psql $DATABASE_URL -f db/init-complete.sql
```

## 📊 数据库结构说明

### 核心表（8个）
1. **users** - 用户信息
2. **user_groups** - 用户组
3. **user_group_memberships** - 用户组成员关系
4. **deleted_users_blacklist** - 删除用户黑名单
5. **jobs** - 作业信息
6. **job_status_history** - 作业状态历史
7. **applications** - 应用程序（完整版包含，简化版不包含）
8. **hpc_applications** - HPC应用规范

### 权限系统表（6个）
10. **file_permissions** - 文件权限
11. **webshell_permissions** - WebShell权限
12. **clipboard_permissions** - 剪贴板权限
13. **permission_audit_logs** - 权限审计日志
14. **file_operation_logs** - 文件操作日志
15. **webshell_operation_logs** - WebShell操作日志

### 通知系统表（3个）
16. **notifications** - 通知
17. **notification_preferences** - 通知偏好
18. **notification_templates** - 通知模板

### 应用管理表（4个）
19. **application_categories** - 应用分类
20. **application_tags** - 应用标签
21. **application_versions** - 应用版本历史
22. **hpc_application_usage** - 应用使用统计

### 系统监控表（3个）
23. **announcements** - 系统公告
24. **hpc_resource_history** - 资源历史
25. **hpc_discovered_modules** - 发现的模块

## 📝 VNC 桌面功能说明

**重要**: VNC 桌面功能**不依赖数据库表**，而是通过以下方式实现：
- ✅ 作业脚本包含 VNC 启动命令
- ✅ 从 Slurm 实时查询作业状态和节点信息
- ✅ 解析作业脚本提取 VNC display 和 port
- ✅ 动态生成 noVNC 访问 URL

因此 **`view_jobs` 表已从初始化脚本中移除**（未被使用）。

## 🔑 关键外键约束说明

### 级联删除 (ON DELETE CASCADE)
删除用户时自动删除相关数据：
- file_permissions
- webshell_permissions
- clipboard_permissions
- user_group_memberships

### 保留日志 (ON DELETE SET NULL)
删除用户时保留日志记录，user_id 设为 NULL：
- permission_audit_logs
- file_operation_logs
- webshell_operation_logs

## ✅ 部署后检查清单

- [ ] 所有表已创建
- [ ] 外键约束正确设置
- [ ] 索引已创建
- [ ] 触发器已创建
- [ ] 默认管理员账户存在
- [ ] 默认分类和标签已插入
- [ ] 可以成功创建和删除测试用户

## 🐛 常见问题

### Q1: 执行脚本时报错 "relation already exists"
A: 正常情况，脚本使用 `IF NOT EXISTS`，不会影响已存在的表。

### Q2: 外键约束错误
A: 执行 `db/fix-user-foreign-keys.sql` 修复约束。

### Q3: 某些表不存在
A: 使用增量迁移方案，逐个创建缺失的表。

### Q4: 如何回滚？
A: 使用之前创建的备份文件恢复：
```bash
psql $DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

## 📞 获取帮助

如果遇到问题：
1. 查看执行日志中的错误信息
2. 运行检查脚本诊断问题
3. 查看 `docs/troubleshooting/` 目录下的文档
4. 联系系统管理员

## 📚 相关文档

- `db/init-complete.sql` - 完整初始化脚本
- `db/fix-user-foreign-keys.sql` - 外键约束修复
- `db/check-actual-foreign-keys.sql` - 约束检查
- `FOREIGN_KEY_FIX_README.md` - 外键问题说明
- `USER_DELETION_FIX_SUMMARY.md` - 用户删除修复总结

---

**建议**: 对于新系统部署，直接使用 `db/init-complete.sql` 是最快捷的方案！

