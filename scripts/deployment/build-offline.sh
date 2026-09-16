#!/bin/bash
# 离线构建脚本 - 解决网络依赖问题

set -e

echo "🚀 开始离线构建..."

# 设置环境变量，禁用网络请求
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=4096"

# 清理之前的构建
echo "🧹 清理之前的构建..."
rm -rf .next
rm -rf out

# 设置离线模式
echo "📡 设置离线模式..."
export NODE_ENV=production
export NEXT_PUBLIC_OFFLINE_MODE=true

# 构建应用
echo "🔨 开始构建..."
npm run build

echo "✅ 构建完成！"
echo "📁 构建输出目录: .next/"
echo "�� 启动命令: npm start" 