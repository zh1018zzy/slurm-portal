# 外键约束修复说明

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🚨 更新：脚本已优化

修复脚本已更新，现在会**自动跳过不存在的表**，不会因为某些表不存在而报错。

## 📝 问题说明

如果您在执行修复脚本时遇到类似错误：
```
ERROR: 42P01: relation "webshell_permissions" does not exist
```

这是**正常的**！这表示您的数据库中没有这个表，脚本会自动跳过它。

## ✅ 使用最新版脚本

最新的 `db/fix-user-foreign-keys.sql` 脚本已经优化：

### 特性
1. ✅ 自动检测表是否存在
2. ✅ 显示哪些表存在、哪些不存在  
3. ✅ 只修复存在的表
4. ✅ 跳过不存在的表，不会报错
5. ✅ 详细的执行日志

### 执行输出示例

```
========================================
检查数据库中的表...
========================================
✓ file_permissions 表存在
✗ webshell_permissions 表不存在
✗ clipboard_permissions 表不存在
✗ user_group_memberships 表不存在
✗ permission_audit_logs 表不存在
✗ file_operation_logs 表不存在
✗ webshell_operation_logs 表不存在
========================================
找到 1 个相关表，将进行修复
========================================

已删除 file_permissions 的旧外键约束
已为 file_permissions 添加新的外键约束 (ON DELETE CASCADE)
跳过 webshell_permissions：表不存在
跳过 clipboard_permissions：表不存在
...
```

## 🔍 检查当前数据库状态

在执行修复前，可以先检查数据库中实际存在的外键约束：

### 方法 1: 使用检查 SQL
在 Supabase SQL Editor 中执行：
```sql
-- 复制 db/check-actual-foreign-keys.sql 的内容并执行
```

### 方法 2: 快速查询
```sql
SELECT 
    tc.table_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'users'
AND tc.constraint_type = 'FOREIGN KEY';
```

## 🔧 执行修复步骤

### 步骤 1: 在 Supabase 控制台执行

1. 登录 [Supabase 控制台](https://app.supabase.com)
2. 选择您的项目
3. 点击左侧菜单 "SQL Editor"
4. 点击 "New query"
5. 复制 `/opt/my-hpcapp/db/fix-user-foreign-keys.sql` 的全部内容
6. 粘贴到编辑器中
7. 点击 "Run" 按钮
8. 查看输出日志

### 步骤 2: 查看执行结果

脚本执行后会显示：
- ✓ 哪些表存在并已修复
- ✗ 哪些表不存在（已跳过）
- 修复后的外键约束列表
- 最终的验证结果

### 步骤 3: 验证修复

执行检查脚本确认修复成功：
```sql
-- 复制 db/check-actual-foreign-keys.sql 并执行
```

或者使用命令行工具（如果配置了 DATABASE_URL）：
```bash
./scripts/check-user-foreign-keys.sh
```

## 📊 常见情况

### 情况 1: 只有 file_permissions 表
```
✓ file_permissions 表存在
✗ 其他表不存在
```
**结果**: 只会修复 file_permissions 的外键约束，这就够了！

### 情况 2: 有多个权限表
```
✓ file_permissions 表存在
✓ webshell_permissions 表存在
✓ clipboard_permissions 表存在
```
**结果**: 会修复所有存在的表的外键约束

### 情况 3: 没有权限表
```
✗ 所有权限表都不存在
```
**结果**: 脚本会跳过所有修复，但这意味着您的数据库可能使用不同的表结构

## 🎯 重点提示

### 不用担心错误信息
如果看到 "表不存在" 的提示，这是**正常的**：
- ✅ 脚本会自动跳过
- ✅ 不会影响其他表的修复
- ✅ 只修复实际存在的表

### 核心目标
只要修复了 **file_permissions** 表的外键约束（这是报错中提到的表），用户删除功能就能正常工作了。

### 应用层保护
即使数据库约束没有完全修复，**API 代码已经添加了保护逻辑**，会在删除用户前手动清理相关数据，所以：
- ✅ 现在就可以删除用户
- ✅ 不会因为外键约束而失败
- ✅ 执行数据库修复脚本会让操作更高效

## 📚 相关文件

1. **修复脚本**: `db/fix-user-foreign-keys.sql` - 智能修复外键约束
2. **检查脚本**: `db/check-actual-foreign-keys.sql` - 查看当前状态
3. **检查工具**: `scripts/check-user-foreign-keys.sh` - 命令行检查
4. **详细文档**: `docs/troubleshooting/user-deletion-foreign-key-issue.md`
5. **快速指南**: `QUICK_FIX_GUIDE.md`

## 💡 下一步操作

1. **立即可用**: 现在就可以删除用户（API 已保护）
2. **数据库修复**: 执行更新后的 `fix-user-foreign-keys.sql`
3. **验证结果**: 使用检查脚本确认修复成功
4. **测试功能**: 尝试删除一个测试用户

## ❓ FAQ

**Q: 为什么会有表不存在？**  
A: 不同的部署可能使用不同的功能模块，某些权限表只在启用相应功能时才会创建。

**Q: 只修复了 file_permissions，其他表不修复可以吗？**  
A: 完全可以！只要修复了报错中提到的表就够了。

**Q: 脚本执行失败了怎么办？**  
A: 不用担心，API 代码已经提供了保护，用户删除功能仍然可以正常使用。

**Q: 如何知道修复是否成功？**  
A: 执行检查脚本，或者尝试删除一个测试用户，如果成功就说明修复好了。

---

**现在可以放心执行修复脚本了！** 🎉

