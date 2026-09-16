# 安装日期防篡改机制部署文档

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 📋 概述

为防止用户通过修改数据库中的 `install_date` 字段来无限延长试用期，我们实施了数据库层面的防篡改机制。

## 🔴 发现的安全漏洞

**问题**: 用户可以直接修改 `system_installation.install_date` 字段来延长试用期。

**测试结果**:
```bash
node scripts/check-db-protection.js
# 结果: ⚠️  更新成功 - 数据库缺少防篡改保护!
```

## 🛡️ 防篡改解决方案

### 实施的保护机制

1. **审计日志表** (`system_installation_audit`)  
   记录所有 `install_date` 的修改，标记可疑操作

2. **数据库触发器** (`prevent_installation_date_tampering`)  
   阻止将安装日期改到未来（延长试用期）

3. **只读视图** (`system_installation_readonly`)  
   提供安全的查询接口

4. **查询函数** (`get_suspicious_installation_changes()`)  
   快速查询所有可疑修改记录

## 📦 部署步骤

### 方法1: 使用Supabase Dashboard (推荐)

1. 登录 Supabase Dashboard
2. 进入 SQL Editor
3. 复制并执行: `scripts/migrations/001_install_date_anti_tampering.sql`

### 方法2: 使用psql

```bash
psql "postgresql://postgres:PASSWORD@192.168.1.10:5432/postgres" \
  -f scripts/migrations/001_install_date_anti_tampering.sql
```

## ✅ 验证部署

```bash
node scripts/test-anti-tampering.js
```

## 📊 监控可疑活动

```sql
SELECT * FROM get_suspicious_installation_changes();
```

详细文档请查看完整版本。
