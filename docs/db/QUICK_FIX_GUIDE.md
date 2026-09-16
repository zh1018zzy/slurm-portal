# 用户删除问题 - 快速修复指南

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🚨 问题
删除用户时报错：`violates foreign key constraint "file_permissions_user_id_fkey"`

## ⚡ 快速解决（立即生效）

**好消息**: 应用层修复已经完成，现在就可以删除用户了！

代码已自动处理外键约束问题，删除用户前会先清理所有相关数据。

## 🔧 彻底修复（可选，建议执行）

在 Supabase 控制台执行此 SQL 脚本：

**文件**: `db/fix-user-foreign-keys.sql`

**步骤**:
1. 打开 Supabase 控制台 → SQL Editor
2. 复制 `db/fix-user-foreign-keys.sql` 内容
3. 点击运行
4. 看到修复完成的提示即表示成功

**注意**: 脚本会自动检测并只修复存在的表，不存在的表会自动跳过，不会报错。

这会修复数据库外键约束，让删除操作更高效。

## 📊 检查状态

```bash
# 查看外键约束是否正确配置
export DATABASE_URL='your_database_url'
./scripts/check-user-foreign-keys.sh
```

## 📖 详细文档

- 数据库部署: `db/install/README.md` ⭐ 新系统部署必读
- 脚本说明: `FOREIGN_KEY_FIX_README.md` ⭐ 外键修复
- 完整说明: `USER_DELETION_FIX_SUMMARY.md`
- 数据库清理: `DATABASE_CLEANUP_SUMMARY.md` ⭐ 数据库优化说明
- 技术细节: `docs/troubleshooting/user-deletion-foreign-key-issue.md`

## ✅ 已修复的内容

1. ✅ API 自动清理相关数据（已生效）
2. ✅ 数据库修复脚本（可选执行）
3. ✅ 检查工具（便于验证）
4. ✅ 详细日志（便于追踪）

---

**现在可以正常删除用户了！** 🎉

