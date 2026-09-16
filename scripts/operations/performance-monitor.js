#!/usr/bin/env node

/**
 * HPC应用性能监控脚本
 * 用于实时监控系统性能指标
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class PerformanceMonitor {
  constructor() {
    this.logFile = path.join(__dirname, '../../logs/performance.log');
    this.metrics = {
      timestamp: new Date().toISOString(),
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
      pm2Status: {},
      apiResponseTimes: {},
      databaseConnections: 0,
      activeUsers: 0
    };
  }

  async getSystemMetrics() {
    try {
      // CPU使用率
      const { stdout: cpuOutput } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
      this.metrics.cpu = parseFloat(cpuOutput.trim());

      // 内存使用率
      const { stdout: memOutput } = await execAsync("free | grep Mem | awk '{printf \"%.2f\", $3/$2 * 100.0}'");
      this.metrics.memory = parseFloat(memOutput.trim());

      // 磁盘使用率
      const { stdout: diskOutput } = await execAsync("df / | tail -1 | awk '{print $5}' | cut -d'%' -f1");
      this.metrics.disk = parseFloat(diskOutput.trim());

      // 网络连接数
      const { stdout: netOutput } = await execAsync("netstat -an | grep :3000 | wc -l");
      this.metrics.network = parseInt(netOutput.trim());

    } catch (error) {
      console.error('获取系统指标失败:', error.message);
    }
  }

  async getPM2Status() {
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const pm2Data = JSON.parse(stdout);
      
      this.metrics.pm2Status = {
        totalInstances: pm2Data.length,
        onlineInstances: pm2Data.filter(app => app.pm2_env.status === 'online').length,
        memoryUsage: pm2Data.reduce((sum, app) => sum + (app.monit.memory || 0), 0),
        cpuUsage: pm2Data.reduce((sum, app) => sum + (app.monit.cpu || 0), 0),
        restarts: pm2Data.reduce((sum, app) => sum + (app.pm2_env.restart_time || 0), 0)
      };
    } catch (error) {
      console.error('获取PM2状态失败:', error.message);
    }
  }

  async getDatabaseMetrics() {
    try {
      // 检查数据库连接数（需要根据实际数据库配置调整）
      const { stdout } = await execAsync("ps aux | grep postgres | grep -v grep | wc -l");
      this.metrics.databaseConnections = parseInt(stdout.trim());
    } catch (error) {
      console.error('获取数据库指标失败:', error.message);
    }
  }

  async testAPIResponseTime() {
    const apis = [
      '/api/jobs',
      '/api/jobs/active',
      '/api/dashboard/user-stats',
      '/api/applications/available'
    ];

    for (const api of apis) {
      try {
        const startTime = Date.now();
        const response = await fetch(`http://localhost:3000${api}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        const endTime = Date.now();
        
        this.metrics.apiResponseTimes[api] = {
          responseTime: endTime - startTime,
          status: response.status,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        this.metrics.apiResponseTimes[api] = {
          responseTime: -1,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  async logMetrics() {
    this.metrics.timestamp = new Date().toISOString();
    
    const logEntry = {
      ...this.metrics,
      summary: {
        cpuStatus: this.metrics.cpu > 80 ? 'HIGH' : this.metrics.cpu > 60 ? 'MEDIUM' : 'LOW',
        memoryStatus: this.metrics.memory > 80 ? 'HIGH' : this.metrics.memory > 60 ? 'MEDIUM' : 'LOW',
        diskStatus: this.metrics.disk > 90 ? 'CRITICAL' : this.metrics.disk > 80 ? 'HIGH' : 'LOW',
        apiStatus: Object.values(this.metrics.apiResponseTimes).some(api => 
          api.responseTime > 5000 || api.status === 'error'
        ) ? 'SLOW' : 'NORMAL'
      }
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    // 确保日志目录存在
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    fs.appendFileSync(this.logFile, logLine);
    
    // 控制台输出
    console.log(`[${new Date().toISOString()}] 性能监控 - CPU: ${this.metrics.cpu}% | 内存: ${this.metrics.memory}% | 磁盘: ${this.metrics.disk}%`);
    
    // 检查告警条件
    this.checkAlerts(logEntry);
  }

  checkAlerts(metrics) {
    const alerts = [];

    if (metrics.cpu > 80) {
      alerts.push(`CPU使用率过高: ${metrics.cpu}%`);
    }

    if (metrics.memory > 80) {
      alerts.push(`内存使用率过高: ${metrics.memory}%`);
    }

    if (metrics.disk > 90) {
      alerts.push(`磁盘使用率过高: ${metrics.disk}%`);
    }

    Object.entries(metrics.apiResponseTimes).forEach(([api, data]) => {
      if (data.responseTime > 5000) {
        alerts.push(`API响应慢: ${api} (${data.responseTime}ms)`);
      }
      if (data.status === 'error') {
        alerts.push(`API错误: ${api}`);
      }
    });

    if (alerts.length > 0) {
      console.warn('🚨 性能告警:', alerts.join(', '));
    }
  }

  async run() {
    console.log('开始性能监控...');
    
    await this.getSystemMetrics();
    await this.getPM2Status();
    await this.getDatabaseMetrics();
    await this.testAPIResponseTime();
    await this.logMetrics();
  }

  async startContinuousMonitoring(interval = 60000) { // 默认1分钟
    console.log(`启动持续监控，间隔: ${interval/1000}秒`);
    
    // 立即执行一次
    await this.run();
    
    // 设置定时器
    setInterval(async () => {
      await this.run();
    }, interval);
  }
}

// 命令行参数处理
const args = process.argv.slice(2);
const monitor = new PerformanceMonitor();

if (args.includes('--continuous') || args.includes('-c')) {
  const interval = args.find(arg => arg.startsWith('--interval='))?.split('=')[1] || 60000;
  monitor.startContinuousMonitoring(parseInt(interval));
} else {
  monitor.run().then(() => {
    console.log('性能监控完成');
    process.exit(0);
  }).catch(error => {
    console.error('性能监控失败:', error);
    process.exit(1);
  });
}

module.exports = PerformanceMonitor; 