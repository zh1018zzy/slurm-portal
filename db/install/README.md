# 数据库脚本目录

## 🎯 推荐使用（已整理）

### 新系统部署

- **`init-complete-simplified.sql`** ⭐⭐⭐ - **简化版数据库初始化脚本（推荐）**
  - 用途：从零开始创建精简的数据库结构
  - 包含：所有核心功能表（~19个表）
  - **移除了**: applications, application_categories, application_tags, application_versions, view_jobs
  - **只使用**: hpc_applications（新一代应用规范）
  - **VNC 功能**: 通过 Slurm 实时查询，无需数据库表
  - 适用于：新系统部署（推荐使用此版本）
  - 外键约束：已正确配置

- **`init-complete.sql`** ⭐⭐ - **完整版数据库初始化脚本**
  - 用途：从零开始创建完整的数据库结构
  - 包含：所有表、索引、触发器、默认数据（~24个表）
  - **包含**: applications 表（用于向后兼容，但很少使用）
  - **不包含**: view_jobs 表（已确认未使用）
  - 适用于：需要完整向后兼容的系统
  - 外键约束：已正确配置

### 问题修复
- **`fix-user-foreign-keys.sql`** ⭐⭐⭐ - **外键约束修复脚本**
  - 用途：修复用户表的外键约束问题
  - 智能：自动检测表是否存在
  - 适用于：现有系统，修复删除用户失败问题

### 状态检查
- **`check-database-status.sql`** ⭐⭐ - **数据库状态检查**
  - 用途：检查数据库完整性
  - 输出：表结构、外键约束、数据量统计
  - 建议：决定使用全新部署还是增量迁移

- **`check-actual-foreign-keys.sql`** ⭐⭐ - **外键约束详细检查**
  - 用途：查看所有引用 users 表的外键约束
  - 输出：约束名称、删除规则、建议修复

## 📚 文档

- **`DATABASE_DEPLOYMENT_GUIDE.md`** ⭐⭐⭐ - **完整部署指南**
  - 新系统部署方案
  - 现有系统迁移方案
  - 常见问题解答

- **`EXECUTE_ME_FIRST.md`** - 快速执行指南（针对外键修复）

## 🗑️ 已废弃（不推荐使用）

以下脚本已过时或被新脚本替代，保留仅供参考：

### 不再需要（已整合到 init-complete.sql）
- `sys.sql` - 已过时的系统表结构
- `create_applications_table.sql` - 应用表创建（已整合）
- `create_notifications_system.sql` - 通知系统（已整合）
- `create_announcements_table.sql` - 公告表（已整合）
- `create_permissions_tables.sql` - 权限表（已整合）
- `setup-permissions-tables.sql` - 权限表设置（已整合）

### 增量更新脚本（仅用于特定场景）
- `add_user_groups_tables.sql` - 添加用户组表
- `add_login_shell_field.sql` - 添加登录shell字段
- `add_theme_preference.sql` - 添加主题偏好字段
- `add_job_type_field.sql` - 添加作业类型字段
- `add_file_copy_permission.sql` - 添加文件复制权限
- `update_theme_preference_field.sql` - 更新主题偏好字段
- `update_application_visibility.sql` - 更新应用可见性
- `fix_application_visibility.sql` - 修复应用可见性

### 迁移脚本（仅用于特定迁移场景）
- `migrate_hpc_applications.sql` - HPC应用迁移
- `migrate_hpc_applications_simple.sql` - HPC应用简化迁移
- `fix_jobs_table_structure.sql` - 作业表结构修复

### 性能优化（可选）
- `optimize_trend_query.sql` - 趋势查询优化
- `notification_performance_optimization.sql` - 通知性能优化

### 特定应用数据（可选）
- `abaqus2022-application.sql` - ABAQUS 应用
- `ansys2022r1-application.sql` - ANSYS 应用
- `comsol62-application.sql` - COMSOL 应用
- `materialsstudio2020-application.sql` - Materials Studio 应用

### 其他
- `view_jobs.sql` - VNC作业视图（已整合到 init-complete.sql）
- `add_group_file_permissions.sql` - 组文件权限
- `add_group_application_permissions.sql` - 组应用权限

## 🚀 快速开始

### 场景 1: 新系统部署（推荐使用简化版）

```bash
# 推荐：使用简化版（只包含真正使用的表）
psql $DATABASE_URL -f db/init-complete-simplified.sql

# 或在 Supabase 控制台执行
# 打开 SQL Editor，复制 init-complete-simplified.sql 的内容并运行

# 完整版（如果需要向后兼容）
psql $DATABASE_URL -f db/init-complete.sql
```

### 场景 2: 现有系统（有用户删除问题）

```bash
# 1. 检查状态
psql $DATABASE_URL -f db/check-database-status.sql

# 2. 修复外键约束
psql $DATABASE_URL -f db/fix-user-foreign-keys.sql

# 3. 验证修复
./scripts/check-user-foreign-keys.sh
```

### 场景 3: 现有系统（需要完整迁移）

```bash
# 1. 检查状态
psql $DATABASE_URL -f db/check-database-status.sql

# 2. 备份数据
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 3. 根据检查结果决定：
#    - 如果无重要数据：清理并重新初始化
#    - 如果有重要数据：增量迁移（参考 DATABASE_DEPLOYMENT_GUIDE.md）
```

## 📊 脚本依赖关系

```
init-complete.sql (独立，无依赖)
    ├─ 包含所有核心表
    ├─ 包含所有权限表
    ├─ 包含所有通知表
    ├─ 包含正确的外键约束
    └─ 包含默认数据

fix-user-foreign-keys.sql (修复脚本，依赖已存在的表)
    └─ 修复 users 表的外键约束

check-database-status.sql (检查脚本，只读)
    └─ 分析现有数据库结构
```

## 🔍 如何选择脚本

| 情况 | 推荐脚本 |
|------|---------|
| 新系统，数据库为空 | `init-complete-simplified.sql` ⭐ 推荐 |
| 需要向后兼容 applications 表 | `init-complete.sql` |
| 有删除用户问题 | `fix-user-foreign-keys.sql` |
| 不确定数据库状态 | `check-database-status.sql` → 根据建议操作 |
| 需要迁移旧系统 | 查看 `DATABASE_DEPLOYMENT_GUIDE.md` |

## 📊 版本对比

| 特性 | 简化版 | 完整版 |
|------|--------|--------|
| 总表数 | ~19 个 | ~24 个 |
| 核心功能 | ✅ 完整 | ✅ 完整 |
| hpc_applications | ✅ 使用 | ✅ 使用 |
| applications 表 | ❌ 不包含 | ✅ 包含（很少使用） |
| application_categories | ❌ 不包含 | ✅ 包含 |
| application_tags | ❌ 不包含 | ✅ 包含 |
| application_versions | ❌ 不包含 | ✅ 包含 |
| view_jobs 表 | ❌ 不包含（未使用） | ❌ 不包含（未使用） |
| VNC 桌面功能 | ✅ 通过 Slurm 实时查询 | ✅ 通过 Slurm 实时查询 |
| 向后兼容 | ❌ 不支持旧API | ✅ 支持 legacy=true |
| 推荐使用 | ⭐⭐⭐ | ⭐⭐ |

## ⚠️ 重要提示

1. **备份**: 在执行任何数据库修改前，务必备份数据
2. **测试**: 建议先在测试环境验证脚本
3. **外键约束**: `init-complete.sql` 已包含正确的外键约束配置
4. **增量更新**: 如果使用旧脚本，注意外键约束可能不正确

## 📞 获取帮助

- 查看 `DATABASE_DEPLOYMENT_GUIDE.md` 获取详细部署指南
- 查看 `docs/troubleshooting/` 目录查找常见问题
- 运行检查脚本诊断问题

---

**最后更新**: 2025-10-10
**维护者**: HPC 管理平台团队

