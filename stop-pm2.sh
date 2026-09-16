#!/bin/bash
# HPC App 停止脚本 (PM2方式)

echo "====================================="
echo "停止 HPC App 所有服务"
echo "====================================="
echo ""

# 停止所有服务
echo "🛑 停止主应用..."
pm2 stop hpc-app 2>/dev/null || true

echo "🛑 停止 WebShell 服务..."
pm2 stop webshell-server 2>/dev/null || true

echo "🛑 停止作业同步服务..."
pm2 stop job-sync 2>/dev/null || true

# 显示状态
echo ""
echo "📊 当前状态:"
pm2 status

echo ""
echo "====================================="
echo "✅ 所有服务已停止"
echo "====================================="
echo ""
echo "重新启动: ./start-pm2.sh"
echo "完全删除: pm2 delete all"
echo ""
