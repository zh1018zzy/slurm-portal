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
      NODE_OPTIONS: '--max-old-space-size=2048',
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