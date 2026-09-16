# HPC 文档整理 - 过期文档清单

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

> **整理日期**: 2025-11-07
> **整理原因**: 作业同步系统升级到 v3.0，需要清理过期和重复文档

---

## 📂 作业同步相关文档

### ✅ 保留文档 (最新)

| 文件 | 状态 | 说明 |
|------|------|------|
| `docs/system/JOB-SYNC-MECHANISM.md` | ✅ **主文档** | v3.0 完整技术文档 (2025-11-07) |
| `docs/system/JOB-SYNC-OPTIMIZATION.md` | ✅ 保留 | 优化记录和问题分析 (2025-11-07) |

### ⚠️  需要更新的文档

| 文件 | 状态 | 问题 | 建议 |
|------|------|------|------|
| `docs/features/jobs/smart-sync-quickstart.md` | ⚠️ 需更新 | 缺少过期作业检测说明 | 更新快速开始指南 |
| `docs/features/jobs/smart-sync-api.md` | ⚠️ 需更新 | API 响应缺少新字段 | 更新 API 文档 |
| `docs/features/jobs/smart-sync-deployment.md` | ⚠️ 需更新 | 部署步骤可能过时 | 验证并更新 |

### ❌ 建议删除的过期文档

| 文件 | 原因 | 替代文档 |
|------|------|----------|
| `docs/features/jobs/smart-job-sync-system.md` | 内容重复，版本过时 | `JOB-SYNC-MECHANISM.md` |
| `docs/features/jobs/slurm-job-sync-mechanism.md` | 功能已整合到智能同步 | `JOB-SYNC-MECHANISM.md` |
| `docs/features/jobs/improved-sync-mechanism.md` | 优化内容已过时 | `JOB-SYNC-OPTIMIZATION.md` |
| `docs/features/jobs/incremental-sync-implementation.md` | 增量同步已是标准功能 | `JOB-SYNC-MECHANISM.md` § 智能同步 |
| `docs/features/jobs/jobs-sync-mechanism.md` | 旧版机制文档 | `JOB-SYNC-MECHANISM.md` |
| `docs/features/jobs/jobs-sync-issues-fix.md` | 问题已解决，历史参考 | 移至 archive/ |
| `docs/features/jobs/sync-trigger-mechanism.md` | 触发机制已整合 | `JOB-SYNC-MECHANISM.md` § 定时任务 |
| `docs/deployment/job-sync-cron-setup.md` | Cron 配置已整合 | `JOB-SYNC-MECHANISM.md` § 定时任务配置 |
| `docs/analysis/job-status-sync-issues.md` | 历史问题分析 | 移至 archive/ |
| `docs/analysis/job-status-sync-strategy.md` | 策略已更新 | `JOB-SYNC-MECHANISM.md` § 同步模式 |
| `docs/analysis/job-sync-implementation-summary.md` | 实现总结，已过时 | 移至 archive/ |

### 📁 其他作业相关文档 (非同步)

| 文件 | 状态 | 说明 |
|------|------|------|
| `docs/features/jobs/sync-test-guide.md` | ✅ 保留 | 测试指南仍然有效 |
| `docs/features/jobs/ldap-user-sync.md` | ✅ 保留 | LDAP 用户同步，不同功能 |
| `docs/features/jobs/user-deletion-sync.md` | ✅ 保留 | 用户删除同步，不同功能 |
| `docs/features/jobs/user-home-directory-sync.md` | ✅ 保留 | 用户目录同步，不同功能 |

---

## 🗑️ 清理脚本

### 方案1: 移动到归档目录

```bash
#!/bin/bash
# 将过期文档移动到归档目录

ARCHIVE_DIR="/opt/my-hpcapp/docs/archive/job-sync-legacy"
mkdir -p "$ARCHIVE_DIR"

# 移动过期文档
mv docs/features/jobs/smart-job-sync-system.md "$ARCHIVE_DIR/"
mv docs/features/jobs/slurm-job-sync-mechanism.md "$ARCHIVE_DIR/"
mv docs/features/jobs/improved-sync-mechanism.md "$ARCHIVE_DIR/"
mv docs/features/jobs/incremental-sync-implementation.md "$ARCHIVE_DIR/"
mv docs/features/jobs/jobs-sync-mechanism.md "$ARCHIVE_DIR/"
mv docs/features/jobs/jobs-sync-issues-fix.md "$ARCHIVE_DIR/"
mv docs/features/jobs/sync-trigger-mechanism.md "$ARCHIVE_DIR/"
mv docs/deployment/job-sync-cron-setup.md "$ARCHIVE_DIR/"
mv docs/analysis/job-status-sync-issues.md "$ARCHIVE_DIR/"
mv docs/analysis/job-status-sync-strategy.md "$ARCHIVE_DIR/"
mv docs/analysis/job-sync-implementation-summary.md "$ARCHIVE_DIR/"

# 创建归档索引
cat > "$ARCHIVE_DIR/README.md" <<EOF
# 作业同步系统 - 历史文档归档

> **归档日期**: $(date +%Y-%m-%d)
> **归档原因**: 系统升级到 v3.0，文档已过时或重复

## 归档文件说明

这些文档记录了作业同步系统的历史演进过程，保留作为参考。

**当前有效文档**:
- \`docs/system/JOB-SYNC-MECHANISM.md\` (v3.0)
- \`docs/system/JOB-SYNC-OPTIMIZATION.md\`

## 归档文件列表

$(ls -1)
EOF

echo "✅ 文档已归档到: $ARCHIVE_DIR"
```

### 方案2: 直接删除

```bash
#!/bin/bash
# 直接删除过期文档 (谨慎使用)

echo "⚠️  警告: 此操作将永久删除过期文档！"
echo "建议先使用归档脚本。按 Ctrl+C 取消，或回车继续..."
read

rm -f docs/features/jobs/smart-job-sync-system.md
rm -f docs/features/jobs/slurm-job-sync-mechanism.md
rm -f docs/features/jobs/improved-sync-mechanism.md
rm -f docs/features/jobs/incremental-sync-implementation.md
rm -f docs/features/jobs/jobs-sync-mechanism.md
rm -f docs/features/jobs/jobs-sync-issues-fix.md
rm -f docs/features/jobs/sync-trigger-mechanism.md
rm -f docs/deployment/job-sync-cron-setup.md
rm -f docs/analysis/job-status-sync-issues.md
rm -f docs/analysis/job-status-sync-strategy.md
rm -f docs/analysis/job-sync-implementation-summary.md

echo "✅ 过期文档已删除"
```

---

## 📝 文档更新任务清单

### 高优先级

- [ ] 更新 `smart-sync-quickstart.md` - 添加过期作业检测说明
- [ ] 更新 `smart-sync-api.md` - 更新 API 响应格式
- [ ] 验证 `smart-sync-deployment.md` - 确保部署步骤正确

### 中优先级

- [ ] 更新 `docs/CLAUDE.md` - 引用新的文档路径
- [ ] 创建文档索引 `docs/INDEX.md` - 便于快速查找
- [ ] 更新 README.md - 指向最新文档

### 低优先级

- [ ] 清理 `scripts/` 目录中的过期脚本
- [ ] 整理 `docs/analysis/` 目录

---

## 🎯 推荐操作流程

### 步骤1: 创建归档

```bash
cd /opt/my-hpcapp
bash docs/archive/archive-old-job-sync-docs.sh
```

### 步骤2: 验证归档

```bash
ls -la docs/archive/job-sync-legacy/
cat docs/archive/job-sync-legacy/README.md
```

### 步骤3: 更新引用

```bash
# 搜索可能的文档引用
grep -r "smart-job-sync-system.md" docs/
grep -r "slurm-job-sync-mechanism.md" docs/

# 更新引用到新文档
# (手动编辑相关文件)
```

### 步骤4: 验证系统

```bash
# 确保文档链接有效
grep -r "JOB-SYNC-MECHANISM.md" docs/

# 测试同步功能
curl -X POST http://localhost:3000/api/jobs/smart-sync
```

---

## 📊 文档统计

### 清理前

- 作业同步相关文档: **17个**
- 过期/重复文档: **11个** (65%)
- 需要更新文档: **3个** (18%)
- 最新有效文档: **2个** (12%)

### 清理后

- 最新文档: **2个** (主文档 + 优化记录)
- 需更新文档: **3个**
- 归档文档: **11个**
- 其他有效文档: **4个** (测试、LDAP等)

**文档精简率**: 65% → 归档到 `archive/` 目录

---

**创建日期**: 2025-11-07
**下次审查**: 2025-12-07 (1个月后)
