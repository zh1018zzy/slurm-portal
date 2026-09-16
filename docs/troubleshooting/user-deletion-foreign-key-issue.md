# 用户删除外键约束问题解决方案

> 适用范围：历史故障案例与问题追溯（参考用）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

删除用户时出现以下错误：

```
数据库删除失败: update or delete on table "users" violates foreign key constraint "file_permissions_user_id_fkey" on table "file_permissions"
```

这是因为 `file_permissions` 表（以及其他多个表）引用了 `users` 表的 `id` 字段，当尝试删除用户时，如果外键约束没有设置正确的删除行为（`ON DELETE CASCADE` 或 `ON DELETE SET NULL`），数据库会拒绝删除操作。

## 涉及的表

以下表都引用了 `users` 表，可能导致删除失败：

### 应该级联删除的表 (ON DELETE CASCADE)
这些表的数据与用户紧密相关，删除用户时应一并删除：

1. **file_permissions** - 用户文件权限
2. **webshell_permissions** - 用户WebShell权限
3. **clipboard_permissions** - 用户剪贴板权限
4. **user_group_memberships** - 用户组成员关系

### 应该保留的表 (ON DELETE SET NULL)
这些是日志表，删除用户时应保留记录，但将 user_id 设为 NULL：

1. **permission_audit_logs** - 权限审计日志
2. **file_operation_logs** - 文件操作日志
3. **webshell_operation_logs** - WebShell操作日志

## 解决方案

### 方案一：修复数据库外键约束（推荐）

执行 `/opt/my-hpcapp/db/fix-user-foreign-keys.sql` 脚本修复所有外键约束：

#### 在 Supabase 控制台执行

1. 登录 Supabase 控制台
2. 进入 SQL Editor
3. 复制 `db/fix-user-foreign-keys.sql` 的内容并执行

#### 或使用 psql 命令行

```bash
psql -h <host> -p <port> -U <user> -d <database> -f /opt/my-hpcapp/db/fix-user-foreign-keys.sql
```

#### 脚本执行内容

脚本会自动：
- 删除所有现有的不正确的外键约束
- 重新创建带有正确删除行为的外键约束
- 验证修复结果并显示详细信息

### 方案二：代码层面处理（已实现）

即使外键约束没有正确设置，API 代码也会在删除用户之前手动清理所有相关数据。

修改后的删除逻辑（`app/api/users/[id]/route.ts`）：

1. **查找用户信息**
2. **添加到删除黑名单**（防止LDAP重新同步）
3. **删除 Supabase Auth 账号**
4. **删除 LDAP 用户**
5. **清理相关数据**：
   - 删除文件权限
   - 删除WebShell权限
   - 删除剪贴板权限
   - 删除用户组成员关系
   - 更新审计日志（设为NULL）
   - 更新文件操作日志（设为NULL）
   - 更新WebShell操作日志（设为NULL）
6. **最后删除用户记录**

这样即使外键约束有问题，也能成功删除用户。

## 如何检查外键约束状态

使用以下 SQL 查询检查当前的外键约束设置：

```sql
SELECT 
    tc.table_name,
    tc.constraint_name,
    rc.delete_rule,
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '✓ 正确 (级联删除)'
        WHEN rc.delete_rule = 'SET NULL' THEN '✓ 正确 (设为NULL)'
        WHEN rc.delete_rule = 'RESTRICT' THEN '✗ 问题 (限制删除)'
        WHEN rc.delete_rule = 'NO ACTION' THEN '✗ 问题 (无操作)'
        ELSE '⚠ 需要检查'
    END as status
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_name LIKE '%_user_id_fkey'
ORDER BY tc.table_name;
```

## 预期结果

修复后，查询应该显示：

| table_name | constraint_name | delete_rule | status |
|-----------|----------------|-------------|--------|
| clipboard_permissions | clipboard_permissions_user_id_fkey | CASCADE | ✓ 正确 (级联删除) |
| file_operation_logs | file_operation_logs_user_id_fkey | SET NULL | ✓ 正确 (设为NULL) |
| file_permissions | file_permissions_user_id_fkey | CASCADE | ✓ 正确 (级联删除) |
| permission_audit_logs | permission_audit_logs_user_id_fkey | SET NULL | ✓ 正确 (设为NULL) |
| user_group_memberships | user_group_memberships_user_id_fkey | CASCADE | ✓ 正确 (级联删除) |
| webshell_operation_logs | webshell_operation_logs_user_id_fkey | SET NULL | ✓ 正确 (设为NULL) |
| webshell_permissions | webshell_permissions_user_id_fkey | CASCADE | ✓ 正确 (级联删除) |

## 其他可能引用 users 表的情况

### 使用 username 字段的表

某些旧的数据库脚本（如 `docker-deployments/shared/db/init.sql`）使用 `username` 字段而不是 `user_id`。如果您的数据库使用这些表，也需要注意：

```sql
-- 检查使用 username 的外键约束
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE kcu.column_name = 'username'
AND tc.constraint_type = 'FOREIGN KEY';
```

## 测试删除功能

修复后，测试删除用户：

1. 创建一个测试用户
2. 为该用户添加一些权限记录
3. 尝试删除该用户
4. 验证用户及相关数据都已正确删除或更新

```sql
-- 查看用户及其相关数据
SELECT 
    u.id,
    u.username,
    COUNT(DISTINCT fp.id) as file_permissions_count,
    COUNT(DISTINCT wp.id) as webshell_permissions_count,
    COUNT(DISTINCT cp.id) as clipboard_permissions_count,
    COUNT(DISTINCT ugm.id) as group_memberships_count
FROM users u
LEFT JOIN file_permissions fp ON u.id = fp.user_id
LEFT JOIN webshell_permissions wp ON u.id = wp.user_id
LEFT JOIN clipboard_permissions cp ON u.id = cp.user_id
LEFT JOIN user_group_memberships ugm ON u.id = ugm.user_id
WHERE u.username = 'test_user'
GROUP BY u.id, u.username;
```

## 注意事项

1. **备份数据**：在执行数据库修改脚本之前，请务必备份数据库
2. **生产环境**：在生产环境执行前，建议先在测试环境验证
3. **性能影响**：级联删除可能会影响性能，如果用户有大量相关数据
4. **日志保留**：审计日志和操作日志使用 `SET NULL` 而不是 `CASCADE`，确保历史记录不丢失

## 相关文件

- `/opt/my-hpcapp/db/fix-user-foreign-keys.sql` - 外键约束修复脚本
- `/opt/my-hpcapp/app/api/users/[id]/route.ts` - 用户删除API（已增强）
- `/opt/my-hpcapp/db/create_permissions_tables.sql` - 权限表创建脚本
- `/opt/my-hpcapp/docker/supabase/volumes/db/hpc-permissions.sql` - Supabase权限表定义

## 问题反馈

如果执行修复脚本后仍然遇到删除失败的问题，请：

1. 检查错误消息，确定具体是哪个表的外键约束
2. 使用上述 SQL 查询检查该表的约束状态
3. 查看 API 日志，确认哪一步失败
4. 如果是新的表，需要添加到修复脚本和API清理逻辑中

## 总结

通过双重保护机制（数据库外键约束 + API手动清理），确保用户删除操作的可靠性：

- ✅ 数据库层面：正确的外键约束自动处理级联删除
- ✅ 应用层面：API手动清理相关数据作为兜底
- ✅ 日志保留：审计和操作日志得以保留
- ✅ 防止重复：删除黑名单防止LDAP重新同步被删除的用户

