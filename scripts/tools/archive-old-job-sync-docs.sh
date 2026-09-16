#!/bin/bash

# HPC 文档归档脚本 - 作业同步系统过期文档
# 创建日期: 2025-11-07
# 用途: 将过期的作业同步文档移动到归档目录

set -e

BASE_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
ARCHIVE_DIR="$BASE_DIR/docs/archive/job-sync-legacy-2025"

echo "🗂️  HPC 文档归档工具"
echo "================================"
echo ""
echo "此脚本将移动以下过期文档到归档目录:"
echo "  - docs/features/jobs/ (11个文件)"
echo "  - docs/deployment/ (1个文件)"
echo "  - docs/analysis/ (3个文件)"
echo ""
echo "归档目录: $ARCHIVE_DIR"
echo ""
read -p "继续? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消"
    exit 1
fi

# 创建归档目录
echo "📁 创建归档目录..."
mkdir -p "$ARCHIVE_DIR"

# 归档过期文档
echo "📦 归档过期文档..."

ARCHIVED_COUNT=0

# 归档 features/jobs/ 下的文档
if [ -f "$BASE_DIR/docs/features/jobs/smart-job-sync-system.md" ]; then
    mv "$BASE_DIR/docs/features/jobs/smart-job-sync-system.md" "$ARCHIVE_DIR/"
    echo "  ✓ smart-job-sync-system.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

if [ -f "$BASE_DIR/docs/features/jobs/slurm-job-sync-mechanism.md" ]; then
    mv "$BASE_DIR/docs/features/jobs/slurm-job-sync-mechanism.md" "$ARCHIVE_DIR/"
    echo "  ✓ slurm-job-sync-mechanism.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

if [ -f "$BASE_DIR/docs/features/jobs/improved-sync-mechanism.md" ]; then
    mv "$BASE_DIR/docs/features/jobs/improved-sync-mechanism.md" "$ARCHIVE_DIR/"
    echo "  ✓ improved-sync-mechanism.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

if [ -f "$BASE_DIR/docs/features/jobs/incremental-sync-implementation.md" ]; then
    mv "$BASE_DIR/docs/features/jobs/incremental-sync-implementation.md" "$ARCHIVE_DIR/"
    echo "  ✓ incremental-sync-implementation.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

if [ -f "$BASE_DIR/docs/features/jobs/jobs-sync-mechanism.md" ]; then
    mv "$BASE_DIR/docs/features/jobs/jobs-sync-mechanism.md" "$ARCHIVE_DIR/"
    echo "  ✓ jobs-sync-mechanism.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

if [ -f "$BASE_DIR/docs/features/jobs/jobs-sync-issues-fix.md" ]; then
    mv "$BASE_DIR/docs/features/jobs/jobs-sync-issues-fix.md" "$ARCHIVE_DIR/"
    echo "  ✓ jobs-sync-issues-fix.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

if [ -f "$BASE_DIR/docs/features/jobs/sync-trigger-mechanism.md" ]; then
    mv "$BASE_DIR/docs/features/jobs/sync-trigger-mechanism.md" "$ARCHIVE_DIR/"
    echo "  ✓ sync-trigger-mechanism.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

# 归档 deployment/ 下的文档
if [ -f "$BASE_DIR/docs/deployment/job-sync-cron-setup.md" ]; then
    mv "$BASE_DIR/docs/deployment/job-sync-cron-setup.md" "$ARCHIVE_DIR/"
    echo "  ✓ job-sync-cron-setup.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

# 归档 analysis/ 下的文档
if [ -f "$BASE_DIR/docs/analysis/job-status-sync-issues.md" ]; then
    mv "$BASE_DIR/docs/analysis/job-status-sync-issues.md" "$ARCHIVE_DIR/"
    echo "  ✓ job-status-sync-issues.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

if [ -f "$BASE_DIR/docs/analysis/job-status-sync-strategy.md" ]; then
    mv "$BASE_DIR/docs/analysis/job-status-sync-strategy.md" "$ARCHIVE_DIR/"
    echo "  ✓ job-status-sync-strategy.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

if [ -f "$BASE_DIR/docs/analysis/job-sync-implementation-summary.md" ]; then
    mv "$BASE_DIR/docs/analysis/job-sync-implementation-summary.md" "$ARCHIVE_DIR/"
    echo "  ✓ job-sync-implementation-summary.md"
    ARCHIVED_COUNT=$((ARCHIVED_COUNT + 1))
fi

# 创建归档索引
echo ""
echo "📝 创建归档索引..."
cat > "$ARCHIVE_DIR/README.md" <<EOF
# 作业同步系统 - 历史文档归档

> **归档日期**: $(date +%Y-%m-%d)
> **归档原因**: 系统升级到 v3.0，文档已过时或重复
> **归档文件数**: $ARCHIVED_COUNT

---

## 📚 当前有效文档

请参考以下最新文档：

- **主文档**: \`docs/system/JOB-SYNC-MECHANISM.md\` (v3.0 完整技术文档)
- **优化记录**: \`docs/system/JOB-SYNC-OPTIMIZATION.md\` (最新优化和问题修复)
- **快速开始**: \`docs/features/jobs/smart-sync-quickstart.md\`
- **API 文档**: \`docs/features/jobs/smart-sync-api.md\`

---

## 📂 归档文件列表

这些文档记录了作业同步系统的历史演进过程，保留作为参考。

### features/jobs/ 目录

$(ls -1 "$ARCHIVE_DIR" | grep -v README.md | grep -E "^(smart-job-sync|slurm-job|improved-sync|incremental|jobs-sync|sync-trigger)" | while read file; do
    echo "- \`$file\` - $(head -1 "$ARCHIVE_DIR/$file" 2>/dev/null | sed 's/^# //')"
done)

### deployment/ 目录

$(ls -1 "$ARCHIVE_DIR" | grep -v README.md | grep "job-sync-cron" | while read file; do
    echo "- \`$file\` - $(head -1 "$ARCHIVE_DIR/$file" 2>/dev/null | sed 's/^# //')"
done)

### analysis/ 目录

$(ls -1 "$ARCHIVE_DIR" | grep -v README.md | grep "job-.*sync" | while read file; do
    echo "- \`$file\` - $(head -1 "$ARCHIVE_DIR/$file" 2>/dev/null | sed 's/^# //')"
done)

---

## 🔍 文档演进历史

### v1.0 (2024-07)
- 基础同步功能
- SLURM 集成
- 数据库同步

### v2.0 (2024-08)
- 智能同步系统上线
- 支持三种同步模式
- 集成通知系统
- 性能优化和缓存机制

### v3.0 (2025-11-07)
- **新增**: 过期作业自动检测和修复
- **优化**: 智能同步每5分钟自动检查 RUNNING/PENDING 状态
- **修复**: 长时间运行作业完成后状态不更新的问题
- **改进**: 日志优化，减少无用警告

---

**归档时间**: $(date '+%Y-%m-%d %H:%M:%S')
**维护者**: HPC Platform Team
EOF

echo ""
echo "✅ 归档完成！"
echo ""
echo "📊 归档统计:"
echo "  - 归档文件数: $ARCHIVED_COUNT"
echo "  - 归档目录: $ARCHIVE_DIR"
echo ""
echo "📁 归档文件列表:"
ls -1 "$ARCHIVE_DIR" | grep -v README.md | while read file; do
    echo "  - $file"
done
echo ""
echo "📖 查看归档索引:"
echo "  cat $ARCHIVE_DIR/README.md"
echo ""
echo "🎉 文档整理完成！现在的作业同步文档更加简洁清晰。"
