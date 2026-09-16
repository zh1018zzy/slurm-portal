# 用户删除外键约束问题 - 修复摘要

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🎯 问题

删除用户时出现以下错误：
```
数据库删除失败: update or delete on table "users" violates foreign key constraint "file_permissions_user_id_fkey" on table "file_permissions"
```

## 🔍 原因分析

数据库中有多个表引用了 `users` 表，但外键约束没有正确设置删除行为（`ON DELETE CASCADE` 或 `ON DELETE SET NULL`），导致删除用户时被数据库阻止。

### 受影响的表

| 表名 | 应有的删除行为 | 说明 |
|-----|--------------|------|
| file_permissions | CASCADE | 用户文件权限，应随用户删除 |
| webshell_permissions | CASCADE | WebShell权限，应随用户删除 |
| clipboard_permissions | CASCADE | 剪贴板权限，应随用户删除 |
| user_group_memberships | CASCADE | 用户组关系，应随用户删除 |
| permission_audit_logs | SET NULL | 审计日志，应保留但user_id设为NULL |
| file_operation_logs | SET NULL | 文件操作日志，应保留 |
| webshell_operation_logs | SET NULL | WebShell日志，应保留 |

## ✅ 解决方案（双重保护）

### 方案一：数据库层修复（推荐优先执行）

**文件位置**: `db/fix-user-foreign-keys.sql`

**执行方式**:

#### 选项 A: Supabase 控制台
1. 登录 Supabase 控制台
2. 打开 SQL Editor
3. 复制并执行 `db/fix-user-foreign-keys.sql` 的内容

#### 选项 B: 命令行 (需要 DATABASE_URL)
```bash
# 设置数据库连接
export DATABASE_URL='postgresql://user:password@host:port/database'

# 执行修复脚本
psql $DATABASE_URL -f db/fix-user-foreign-keys.sql
```

**脚本功能**:
- ✓ 自动检测并删除现有的不正确外键约束
- ✓ 重新创建正确的外键约束（带 CASCADE 或 SET NULL）
- ✓ 显示修复结果和验证信息
- ✓ 使用事务确保操作原子性

### 方案二：应用层修复（已实现，自动生效）

**文件位置**: `app/api/users/[id]/route.ts`

**改进内容**:
修改了 DELETE 接口，在删除用户之前手动清理所有相关数据：

```typescript
// 删除流程
1. 查找用户信息
2. 添加到删除黑名单（防止LDAP重新同步）
3. 删除 Supabase Auth 账号
4. 删除 LDAP 用户
5. 清理相关数据（新增）：
   - 删除 file_permissions
   - 删除 webshell_permissions
   - 删除 clipboard_permissions
   - 删除 user_group_memberships
   - 更新 permission_audit_logs (设为NULL)
   - 更新 file_operation_logs (设为NULL)
   - 更新 webshell_operation_logs (设为NULL)
6. 最后删除用户记录
```

**优势**:
- ✓ 即使外键约束未修复，也能成功删除
- ✓ 详细的日志记录
- ✓ 出错时提供清晰的错误提示

## 🔧 检查工具

### 检查脚本
**文件位置**: `scripts/check-user-foreign-keys.sh`

**使用方法**:
```bash
# 设置数据库连接
export DATABASE_URL='postgresql://user:password@host:port/database'

# 运行检查
./scripts/check-user-foreign-keys.sh
```

**输出示例**:
```
表名                      | 约束名称                              | 删除规则  | 状态
-------------------------|-------------------------------------|----------|------------------
file_permissions         | file_permissions_user_id_fkey       | CASCADE  | ✓ 正确 (级联删除)
webshell_permissions     | webshell_permissions_user_id_fkey   | CASCADE  | ✓ 正确 (级联删除)
permission_audit_logs    | permission_audit_logs_user_id_fkey  | SET NULL | ✓ 正确 (设为NULL)
```

### 手动 SQL 查询
```sql
-- 查看所有引用 users 表的外键约束
SELECT 
    tc.table_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_name LIKE '%_user_id_fkey'
ORDER BY tc.table_name;
```

## 📋 实施步骤

### 快速修复（推荐）

1. **立即可用**（无需任何操作）
   - 应用层修复已经部署，现在就可以删除用户

2. **彻底修复**（建议在维护窗口执行）
   ```bash
   # 1. 备份数据库（重要！）
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   
   # 2. 检查当前状态
   ./scripts/check-user-foreign-keys.sh
   
   # 3. 执行修复脚本
   psql $DATABASE_URL -f db/fix-user-foreign-keys.sql
   
   # 4. 再次检查验证
   ./scripts/check-user-foreign-keys.sh
   ```

### 测试验证

1. **创建测试用户**
   ```bash
   # 在系统中创建一个测试用户
   ```

2. **添加相关数据**
   ```sql
   -- 为测试用户添加一些权限
   INSERT INTO file_permissions (user_id, permission_type, is_enabled) 
   VALUES ('test_user_id', 'file_upload', true);
   ```

3. **测试删除**
   ```bash
   # 通过API删除测试用户，观察是否成功
   ```

4. **验证清理**
   ```sql
   -- 确认用户和相关数据都已删除
   SELECT * FROM users WHERE id = 'test_user_id';
   SELECT * FROM file_permissions WHERE user_id = 'test_user_id';
   ```

## 📚 相关文档

- **详细文档**: `docs/troubleshooting/user-deletion-foreign-key-issue.md`
- **修复脚本**: `db/fix-user-foreign-keys.sql`
- **检查脚本**: `scripts/check-user-foreign-keys.sh`
- **API 代码**: `app/api/users/[id]/route.ts`

## ⚠️ 注意事项

1. **数据备份**: 执行数据库修改前务必备份
2. **测试环境**: 建议先在测试环境验证
3. **生产时间**: 选择低峰期执行数据库修改
4. **性能影响**: 如果用户有大量关联数据，删除可能较慢
5. **日志保留**: 审计和操作日志会被保留（user_id 设为 NULL）

## 🎉 预期结果

修复后：
- ✅ 可以正常删除用户
- ✅ 相关权限数据自动删除
- ✅ 日志数据得以保留
- ✅ 防止 LDAP 重新同步已删除用户
- ✅ 详细的删除日志便于追踪

## 🐛 故障排除

### 如果删除仍然失败

1. **查看 API 错误日志**
   ```bash
   # 检查具体是哪个表导致的问题
   ```

2. **检查是否还有其他表引用 users**
   ```sql
   SELECT 
       tc.table_name,
       tc.constraint_name
   FROM information_schema.table_constraints tc
   JOIN information_schema.constraint_column_usage ccu
       ON tc.constraint_name = ccu.constraint_name
   WHERE ccu.table_name = 'users'
   AND tc.constraint_type = 'FOREIGN KEY';
   ```

3. **手动添加缺失的清理逻辑**
   - 在 `app/api/users/[id]/route.ts` 中添加对新表的清理
   - 在 `db/fix-user-foreign-keys.sql` 中添加新表的约束修复

## 📞 支持

如果遇到问题，请提供：
1. 完整的错误消息
2. 外键约束检查结果
3. API 日志输出
4. 数据库表结构（涉及到 users 的部分）

---

**状态**: ✅ 已修复并测试
**更新时间**: 2025-10-10
**维护者**: HPC 管理平台团队

