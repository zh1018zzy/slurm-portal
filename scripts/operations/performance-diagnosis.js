#!/usr/bin/env node

/**
 * HPC应用性能诊断脚本
 * 用于分析系统性能瓶颈
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class PerformanceDiagnosis {
  constructor() {
    this.reportFile = path.join(__dirname, '../../logs/performance-diagnosis.json');
    this.diagnosis = {
      timestamp: new Date().toISOString(),
      system: {},
      pm2: {},
      database: {},
      network: {},
      recommendations: []
    };
  }

  async diagnoseSystem() {
    console.log('🔍 诊断系统资源...');
    
    try {
      // CPU信息
      const { stdout: cpuInfo } = await execAsync("lscpu | grep 'Model name' | cut -d: -f2 | xargs");
      const { stdout: cpuCores } = await execAsync("nproc");
      const { stdout: cpuUsage } = await execAsync("top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
      
      this.diagnosis.system.cpu = {
        model: cpuInfo.trim(),
        cores: parseInt(cpuCores.trim()),
        usage: parseFloat(cpuUsage.trim()),
        status: parseFloat(cpuUsage.trim()) > 80 ? 'HIGH' : parseFloat(cpuUsage.trim()) > 60 ? 'MEDIUM' : 'LOW'
      };

      // 内存信息
      const { stdout: memInfo } = await execAsync("free -h");
      const memLines = memInfo.trim().split('\n');
      const memData = memLines[1].split(/\s+/);
      
      this.diagnosis.system.memory = {
        total: memData[1],
        used: memData[2],
        free: memData[3],
        usage: parseFloat(memData[2].replace('Gi', '')) / parseFloat(memData[1].replace('Gi', '')) * 100,
        status: parseFloat(memData[2].replace('Gi', '')) / parseFloat(memData[1].replace('Gi', '')) * 100 > 80 ? 'HIGH' : 'NORMAL'
      };

      // 磁盘信息
      const { stdout: diskInfo } = await execAsync("df -h /");
      const diskLines = diskInfo.trim().split('\n');
      const diskData = diskLines[1].split(/\s+/);
      
      this.diagnosis.system.disk = {
        total: diskData[1],
        used: diskData[2],
        available: diskData[3],
        usage: parseInt(diskData[4].replace('%', '')),
        status: parseInt(diskData[4].replace('%', '')) > 90 ? 'CRITICAL' : parseInt(diskData[4].replace('%', '')) > 80 ? 'HIGH' : 'NORMAL'
      };

    } catch (error) {
      console.error('系统诊断失败:', error.message);
    }
  }

  async diagnosePM2() {
    console.log('🔍 诊断PM2进程...');
    
    try {
      const { stdout } = await execAsync('pm2 jlist');
      const pm2Data = JSON.parse(stdout);
      
      this.diagnosis.pm2 = {
        totalInstances: pm2Data.length,
        onlineInstances: pm2Data.filter(app => app.pm2_env.status === 'online').length,
        erroredInstances: pm2Data.filter(app => app.pm2_env.status === 'errored').length,
        stoppedInstances: pm2Data.filter(app => app.pm2_env.status === 'stopped').length,
        totalMemoryUsage: pm2Data.reduce((sum, app) => sum + (app.monit.memory || 0), 0),
        totalCpuUsage: pm2Data.reduce((sum, app) => sum + (app.monit.cpu || 0), 0),
        totalRestarts: pm2Data.reduce((sum, app) => sum + (app.pm2_env.restart_time || 0), 0),
        instances: pm2Data.map(app => ({
          name: app.name,
          status: app.pm2_env.status,
          memory: app.monit.memory,
          cpu: app.monit.cpu,
          restarts: app.pm2_env.restart_time,
          uptime: app.pm2_env.pm_uptime
        }))
      };

    } catch (error) {
      console.error('PM2诊断失败:', error.message);
    }
  }

  async diagnoseDatabase() {
    console.log('🔍 诊断数据库...');
    
    try {
      // 检查PostgreSQL进程
      const { stdout: pgProcesses } = await execAsync("ps aux | grep postgres | grep -v grep | wc -l");
      this.diagnosis.database.postgresProcesses = parseInt(pgProcesses.trim());

      // 检查数据库连接（如果有配置）
      if (process.env.SUPABASE_URL) {
        this.diagnosis.database.connection = 'SUPABASE';
        // 这里可以添加Supabase连接测试
      } else {
        this.diagnosis.database.connection = 'UNKNOWN';
      }

    } catch (error) {
      console.error('数据库诊断失败:', error.message);
    }
  }

  async diagnoseNetwork() {
    console.log('🔍 诊断网络连接...');
    
    try {
      // 检查端口3000的连接
      const { stdout: port3000 } = await execAsync("netstat -an | grep :3000 | wc -l");
      this.diagnosis.network.port3000Connections = parseInt(port3000.trim());

      // 检查网络接口
      const { stdout: networkInterfaces } = await execAsync("ip addr show | grep 'inet ' | grep -v '127.0.0.1'");
      this.diagnosis.network.interfaces = networkInterfaces.trim().split('\n').map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          interface: parts[parts.length - 1],
          address: parts[1]
        };
      });

    } catch (error) {
      console.error('网络诊断失败:', error.message);
    }
  }

  async testAPIPerformance() {
    console.log('🔍 测试API性能...');
    
    const apis = [
      '/api/jobs',
      '/api/jobs/active',
      '/api/dashboard/user-stats',
      '/api/applications/available'
    ];

    this.diagnosis.api = {};

    for (const api of apis) {
      try {
        const startTime = Date.now();
        const response = await fetch(`http://localhost:3000${api}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });
        const endTime = Date.now();
        
        this.diagnosis.api[api] = {
          responseTime: endTime - startTime,
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        this.diagnosis.api[api] = {
          responseTime: -1,
          status: 'error',
          error: error.message,
          timestamp: new Date().toISOString()
        };
      }
    }
  }

  generateRecommendations() {
    console.log('💡 生成优化建议...');
    
    const recommendations = [];

    // CPU建议
    if (this.diagnosis.system.cpu.usage > 80) {
      recommendations.push({
        category: 'CPU',
        priority: 'HIGH',
        issue: 'CPU使用率过高',
        recommendation: '考虑增加CPU核心数或优化代码性能',
        current: `${this.diagnosis.system.cpu.usage}%`,
        target: '< 60%'
      });
    }

    // 内存建议
    if (this.diagnosis.system.memory.usage > 80) {
      recommendations.push({
        category: 'MEMORY',
        priority: 'HIGH',
        issue: '内存使用率过高',
        recommendation: '增加系统内存或优化内存使用',
        current: `${this.diagnosis.system.memory.usage.toFixed(1)}%`,
        target: '< 70%'
      });
    }

    // 磁盘建议
    if (this.diagnosis.system.disk.usage > 90) {
      recommendations.push({
        category: 'DISK',
        priority: 'CRITICAL',
        issue: '磁盘空间不足',
        recommendation: '清理日志文件或增加磁盘空间',
        current: `${this.diagnosis.system.disk.usage}%`,
        target: '< 80%'
      });
    }

    // PM2建议
    if (this.diagnosis.pm2.erroredInstances > 0) {
      recommendations.push({
        category: 'PM2',
        priority: 'HIGH',
        issue: '有进程出错',
        recommendation: '检查错误日志并重启出错进程',
        current: `${this.diagnosis.pm2.erroredInstances}个错误进程`,
        target: '0个错误进程'
      });
    }

    if (this.diagnosis.pm2.totalRestarts > 10) {
      recommendations.push({
        category: 'PM2',
        priority: 'MEDIUM',
        issue: '进程重启次数过多',
        recommendation: '检查进程稳定性，优化错误处理',
        current: `${this.diagnosis.pm2.totalRestarts}次重启`,
        target: '< 5次重启'
      });
    }

    // API建议
    Object.entries(this.diagnosis.api || {}).forEach(([api, data]) => {
      if (data.responseTime > 5000) {
        recommendations.push({
          category: 'API',
          priority: 'HIGH',
          issue: `API响应慢: ${api}`,
          recommendation: '优化API查询逻辑，添加缓存机制',
          current: `${data.responseTime}ms`,
          target: '< 1000ms'
        });
      }
      if (data.status === 'error') {
        recommendations.push({
          category: 'API',
          priority: 'CRITICAL',
          issue: `API错误: ${api}`,
          recommendation: '检查API实现和依赖服务',
          current: 'ERROR',
          target: '200 OK'
        });
      }
    });

    this.diagnosis.recommendations = recommendations;
  }

  async generateReport() {
    console.log('📊 生成诊断报告...');
    
    // 确保日志目录存在
    const logDir = path.dirname(this.reportFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // 写入报告文件
    fs.writeFileSync(this.reportFile, JSON.stringify(this.diagnosis, null, 2));
    
    // 控制台输出摘要
    console.log('\n📋 性能诊断摘要:');
    console.log('='.repeat(50));
    
    console.log(`CPU: ${this.diagnosis.system.cpu?.usage || 'N/A'}% (${this.diagnosis.system.cpu?.status || 'N/A'})`);
    console.log(`内存: ${this.diagnosis.system.memory?.usage?.toFixed(1) || 'N/A'}% (${this.diagnosis.system.memory?.status || 'N/A'})`);
    console.log(`磁盘: ${this.diagnosis.system.disk?.usage || 'N/A'}% (${this.diagnosis.system.disk?.status || 'N/A'})`);
    console.log(`PM2进程: ${this.diagnosis.pm2?.onlineInstances || 0}/${this.diagnosis.pm2?.totalInstances || 0} 在线`);
    console.log(`建议数量: ${this.diagnosis.recommendations?.length || 0} 条`);
    
    if (this.diagnosis.recommendations?.length > 0) {
      console.log('\n🚨 关键建议:');
      this.diagnosis.recommendations
        .filter(rec => rec.priority === 'CRITICAL' || rec.priority === 'HIGH')
        .forEach(rec => {
          console.log(`- ${rec.issue}: ${rec.recommendation}`);
        });
    }
    
    console.log(`\n详细报告已保存到: ${this.reportFile}`);
  }

  async run() {
    console.log('🚀 开始性能诊断...\n');
    
    await this.diagnoseSystem();
    await this.diagnosePM2();
    await this.diagnoseDatabase();
    await this.diagnoseNetwork();
    await this.testAPIPerformance();
    this.generateRecommendations();
    await this.generateReport();
    
    console.log('\n✅ 性能诊断完成!');
  }
}

// 命令行执行
if (require.main === module) {
  const diagnosis = new PerformanceDiagnosis();
  diagnosis.run().catch(error => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
}

module.exports = PerformanceDiagnosis; 