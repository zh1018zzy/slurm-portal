#!/bin/bash
# HPC App 完整启动脚本 (PM2方式)
# 包含主应用和WebShell服务

cd "$(dirname "$0")"

echo "====================================="
echo "HPC App 完整部署启动"
echo "====================================="
echo ""

# 检查是否已构建
if [ ! -d ".next" ]; then
    echo "📦 项目未构建，正在构建..."
    npm run build
fi

# 停止旧的进程
echo "🛑 停止旧进程..."
pm2 stop hpc-app 2>/dev/null || true
pm2 delete hpc-app 2>/dev/null || true
pm2 stop webshell-server 2>/dev/null || true
pm2 delete webshell-server 2>/dev/null || true
pm2 stop job-sync 2>/dev/null || true
pm2 delete job-sync 2>/dev/null || true

# 启动主应用
echo ""
echo "🚀 启动主应用 (端口 3000)..."
pm2 start npm --name "hpc-app" -- run start:prod

# 等待主应用启动
sleep 3

# 启动WebShell服务
echo "🚀 启动 WebShell 服务 (端口 3001)..."
pm2 start scripts/tools/webshell-server.js --name "webshell-server"

# 启动作业同步服务
echo "🚀 启动作业同步服务 (60秒轮询)..."
pm2 start scripts/cron/start-job-sync.js \
    --name job-sync \
    --cron-restart="0 3 * * *" \
    --max-memory-restart 200M

# 等待服务启动
sleep 2

# 显示状态
echo ""
echo "📊 服务运行状态:"
pm2 status

# 保存 PM2 配置
echo ""
echo "💾 保存 PM2 配置..."
pm2 save

echo ""
echo "====================================="
echo "✅ HPC App 部署完成"
echo "====================================="
echo ""
echo "📌 运行的服务:"
echo "  - 主应用: http://localhost:3000"
echo "  - WebShell: ws://localhost:3001"
echo "  - 作业同步: 每60秒轮询"
echo ""
echo "📝 常用命令:"
echo "  查看所有日志: pm2 logs"
echo "  查看主应用日志: pm2 logs hpc-app"
echo "  查看WebShell日志: pm2 logs webshell-server"
echo "  查看同步日志: pm2 logs job-sync"
echo "  重启所有服务: pm2 restart all"
echo "  停止所有服务: pm2 stop all"
echo "  监控服务: pm2 monit"
echo ""
echo "⚙️  设置开机自启:"
echo "  pm2 startup"
echo "  然后执行输出的命令"
echo ""
