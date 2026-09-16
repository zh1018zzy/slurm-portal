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
if netstat -tlnp | grep -q ":3000"; then
    echo -e "${YELLOW}⚠️  端口3000已被占用，正在停止现有进程...${NC}"
    pkill -f "next-server" || true
    sleep 3
fi

# 启动应用
echo -e "${GREEN}✅ 启动应用...${NC}"
exec npm start 