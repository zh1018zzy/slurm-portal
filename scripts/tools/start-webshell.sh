#!/bin/bash

# WebShell 服务启动脚本

echo "🚀 启动 WebShell 服务..."

# 检查 node-pty 依赖
if ! node -e "require('node-pty')" 2>/dev/null; then
    echo "❌ 缺少 node-pty 依赖，正在安装..."
    npm install node-pty
fi

# 检查 socket.io 依赖
if ! node -e "require('socket.io')" 2>/dev/null; then
    echo "❌ 缺少 socket.io 依赖，正在安装..."
    npm install socket.io
fi

# 检查 jsonwebtoken 依赖
if ! node -e "require('jsonwebtoken')" 2>/dev/null; then
    echo "❌ 缺少 jsonwebtoken 依赖，正在安装..."
    npm install jsonwebtoken
fi

# 启动 WebShell 服务
echo "✅ 依赖检查完成，启动 WebShell 服务..."
node scripts/webshell-server.js 