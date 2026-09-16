#!/bin/bash
# HPC项目文件清理脚本 - 阶段一：安全清理
set -e

echo "🧹 开始HPC项目文件清理 - 阶段一：安全清理"

# 1. 清理日志文件
echo "📝 清理日志文件..."
find . -name "*.log" -not -path "./node_modules/*" -delete 2>/dev/null || true
rm -rf logs/
mkdir -p logs && touch logs/.gitkeep

# 2. 清理临时文件
echo "🗂️  清理临时文件..."
find . -name "*.tmp" -delete 2>/dev/null || true
find . -name "*.temp" -delete 2>/dev/null || true
find . -name "*~" -delete 2>/dev/null || true
find . -name ".DS_Store" -delete 2>/dev/null || true
rm -rf tmp/
mkdir -p tmp/uploads && touch tmp/uploads/.gitkeep

# 3. 清理TypeScript构建缓存
echo "⚡ 清理构建缓存..."
find . -name "*.tsbuildinfo" -delete 2>/dev/null || true

# 4. 清理备份文件
echo "💾 清理备份文件..."
find . -name "*.backup" -delete 2>/dev/null || true
find . -name "*.bak" -delete 2>/dev/null || true

# 5. 清理空目录
echo "📁 清理空目录..."
find . -type d -empty -not -path "./.git/*" -delete 2>/dev/null || true

echo "✅ 阶段一清理完成！"
echo "📊 建议运行: git status 查看变化"