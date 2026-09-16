#!/bin/bash
# HPC App 重启脚本 (PM2方式)

echo "====================================="
echo "重启 HPC App 所有服务"
echo "====================================="
echo ""

# 重启所有服务
echo "🔄 重启主应用..."
pm2 restart hpc-app 2>/dev/null || {
    echo "⚠️  主应用未运行，启动新实例..."
    pm2 start npm --name "hpc-app" -- run start:prod
}

echo "🔄 重启 WebShell 服务..."
pm2 restart webshell-server 2>/dev/null || {
    echo "⚠️  WebShell 服务未运行，启动新实例..."
    pm2 start scripts/tools/webshell-server.js --name "webshell-server"
}

echo "🔄 重启作业同步服务..."
pm2 restart job-sync 2>/dev/null || {
    echo "⚠️  作业同步服务未运行，启动新实例..."
    pm2 start scripts/cron/start-job-sync.js \
        --name job-sync \
        --cron-restart="0 3 * * *" \
        --max-memory-restart 200M
}

# 显示状态
echo ""
echo "📊 服务运行状态:"
pm2 status

# 保存配置
pm2 save

echo ""
echo "====================================="
echo "✅ 所有服务已重启"
echo "====================================="
echo ""
echo "查看日志: pm2 logs"
echo "监控服务: pm2 monit"
echo ""
