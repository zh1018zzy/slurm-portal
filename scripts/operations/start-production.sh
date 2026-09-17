#!/bin/bash

# HPC应用生产环境启动脚本

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 启动HPC应用生产环境...${NC}"

# 检查环境
if [ ! -f ".next/prerender-manifest.json" ]; then
    echo -e "${YELLOW}⚠️  缺少prerender-manifest.json，正在创建...${NC}"
    echo '{"preview":{"previewModeId":"process.env.__NEXT_PREVIEW_MODE_ID","previewModeSigningKey":"process.env.__NEXT_PREVIEW_MODE_SIGNING_KEY","previewModeEncryptionKey":"process.env.__NEXT_PREVIEW_MODE_ENCRYPTION_KEY"},"routes":{}}' > .next/prerender-manifest.json
fi

# 设置环境变量
export NODE_ENV=production
export PORT=3000
export NODE_OPTIONS="--max-old-space-size=4096"

# 检查端口是否被占用
if netstat -tlnp 2>/dev/null | grep -q ":3000"; then
    echo -e "${YELLOW}⚠️  端口3000已被占用，正在停止现有进程...${NC}"
    pkill -f "next-server" || true
    sleep 3
fi

# 启动应用（优先 standalone，避免 next start 与 output:standalone 冲突告警）
echo -e "${GREEN}✅ 启动应用...${NC}"
if [ -f ".next/standalone/server.js" ]; then
  mkdir -p .next/standalone/.next
  if [ -d ".next/static" ]; then
    rm -rf .next/standalone/.next/static
    cp -a .next/static .next/standalone/.next/static
  fi
  if [ -d "public" ]; then
    rm -rf .next/standalone/public
    cp -a public .next/standalone/public
  fi
  # standalone 需能读到项目根的 .env*
  export HOSTNAME=0.0.0.0
  cd .next/standalone
  exec node server.js
fi
exec npm start
