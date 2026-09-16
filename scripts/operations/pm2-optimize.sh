#!/bin/bash

# PM2部署优化脚本
# 解决客户端路由切换时的DOM操作冲突问题

echo "🚀 开始PM2部署优化..."

# 1. 清理构建缓存
echo "📦 清理构建缓存..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo

# 2. 重新安装依赖
echo "📥 重新安装依赖..."
npm ci --production=false

# 3. 构建应用
echo "🔨 构建应用..."
npm run build

# 4. 优化PM2配置
echo "⚙️ 优化PM2配置..."

# 创建优化的PM2配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'hpc-app',
    script: 'npm',
    args: 'start',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // 优化内存使用
      NODE_OPTIONS: '--max-old-space-size=2048 --optimize-for-size',
      // 禁用一些可能导致问题的功能
      NEXT_TELEMETRY_DISABLED: '1',
      // 优化客户端路由
      NEXT_CLIENT_ROUTER_OPTIMIZATION: '1'
    },
    // 错误处理
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // 重启策略
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G',
    
    // 监控
    watch: false,
    ignore_watch: ['node_modules', 'logs', '.next'],
    
    // 优雅关闭
    kill_timeout: 5000,
    listen_timeout: 3000,
    
    // 健康检查
    health_check_grace_period: 3000,
    health_check_fatal_exceptions: true
  }]
}
EOF

# 5. 创建日志目录
echo "📝 创建日志目录..."
mkdir -p logs

# 6. 启动PM2
echo "🚀 启动PM2..."
pm2 delete hpc-app 2>/dev/null || true
pm2 start ecosystem.config.js

# 7. 保存PM2配置
pm2 save

# 8. 设置PM2开机自启
pm2 startup

echo "✅ PM2部署优化完成！"
echo ""
echo "📋 部署信息："
echo "   - 应用名称: hpc-app"
echo "   - 端口: 3000"
echo "   - 日志目录: ./logs/"
echo "   - 监控: pm2 monit"
echo "   - 状态: pm2 status"
echo ""
echo "🔧 常用命令："
echo "   pm2 restart hpc-app    # 重启应用"
echo "   pm2 stop hpc-app       # 停止应用"
echo "   pm2 logs hpc-app       # 查看日志"
echo "   pm2 monit              # 监控面板" 