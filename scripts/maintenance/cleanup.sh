#!/bin/bash
# 项目清理脚本 - 清理不需要的临时文件和旧日志

echo "====================================="
echo "HPC App 项目清理"
echo "====================================="
echo ""

# 创建备份目录
BACKUP_DIR="./archive-$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

echo "📦 备份目录: $BACKUP_DIR"
echo ""

# 1. 清理旧日志文件 (保留最近30天)
echo "🧹 清理旧日志文件..."
find ./logs -name "*.log" -type f -mtime +30 -exec mv {} "$BACKUP_DIR/" \; 2>/dev/null
echo "   已移动 30 天前的日志到备份目录"

# 2. 清理大日志文件 (超过100MB的)
echo "🧹 清理超大日志文件..."
find ./logs -name "*.log" -type f -size +100M -exec mv {} "$BACKUP_DIR/" \; 2>/dev/null
echo "   已移动超过 100MB 的日志到备份目录"

# 3. 移动测试文件到archive
echo "🧹 归档测试文件..."
if [ -f "fix_settings_api.js" ]; then mv fix_settings_api.js "$BACKUP_DIR/"; fi
if [ -f "fix_settings_api_v2.js" ]; then mv fix_settings_api_v2.js "$BACKUP_DIR/"; fi
if [ -f "test-notifications.js" ]; then mv test-notifications.js "$BACKUP_DIR/"; fi
if [ -f "test-upload.js" ]; then mv test-upload.js "$BACKUP_DIR/"; fi
if [ -f "test_upsert.js" ]; then mv test_upsert.js "$BACKUP_DIR/"; fi
if [ -f "fix-vnc-database.sql" ]; then mv fix-vnc-database.sql "$BACKUP_DIR/"; fi
echo "   已归档测试和修复脚本"

# 4. 移动旧的备份文件
echo "🧹 归档旧备份文件..."
find . -maxdepth 1 -name "*.tar.gz" -type f -exec mv {} "$BACKUP_DIR/" \; 2>/dev/null
echo "   已归档 .tar.gz 备份文件"

# 5. 清理临时目录
echo "🧹 清理临时目录..."
rm -rf ./tmp/* 2>/dev/null
echo "   已清理 tmp 目录"

# 6. 清理 PM2 旧日志
echo "🧹 清理 PM2 旧日志..."
pm2 flush 2>/dev/null || true
echo "   已清理 PM2 日志缓存"

# 7. 清理 npm 缓存 (可选)
read -p "是否清理 npm 缓存? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 清理 npm 缓存..."
    npm cache clean --force
    echo "   已清理 npm 缓存"
fi

# 8. 显示磁盘使用情况
echo ""
echo "📊 当前磁盘使用情况:"
du -sh .next node_modules logs "$BACKUP_DIR" 2>/dev/null | sort -h

# 9. 压缩备份目录
echo ""
read -p "是否压缩备份目录? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 压缩备份目录..."
    tar -czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR" 2>/dev/null
    rm -rf "$BACKUP_DIR"
    echo "   备份已压缩: ${BACKUP_DIR}.tar.gz"
fi

echo ""
echo "====================================="
echo "✅ 清理完成"
echo "====================================="
echo ""
echo "建议:"
echo "  - 检查备份目录: $BACKUP_DIR"
echo "  - 定期运行此脚本保持项目整洁"
echo "  - 考虑设置日志轮转: pm2 install pm2-logrotate"
echo ""
