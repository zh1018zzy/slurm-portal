# PM2集群部署完整指南

> 适用范围：部署流程、环境配置与发布运维
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 概述

本指南提供了完整的PM2集群部署方案，能够充分利用服务器多核资源，显著提升HPC管理平台的性能和并发处理能力。

## 🚀 快速部署

### 一键部署命令
```bash
# 1. 安装PM2和依赖
./scripts/deploy-pm2-cluster.sh --install

# 2. 部署集群
./scripts/deploy-pm2-cluster.sh --deploy

# 3. 设置系统服务（需要root权限）
sudo ./scripts/pm2-service.sh install

# 4. 启动监控
./scripts/pm2-monitor.sh watch
```

## 📁 文件说明

### 核心配置文件
- `ecosystem.config.js` - PM2集群配置
- `scripts/deploy-pm2-cluster.sh` - 自动部署脚本
- `scripts/pm2-service.sh` - 系统服务管理
- `scripts/pm2-monitor.sh` - 集群监控脚本

## ⚙️ 详细部署步骤

### 步骤1: 环境准备
```bash
# 检查Node.js版本（需要18+）
node --version

# 检查系统资源
free -h
nproc

# 创建应用用户（如果不存在）
sudo useradd -m -s /bin/bash hpcapp
sudo usermod -aG sudo hpcapp
```

### 步骤2: 安装PM2
```bash
# 全局安装PM2
npm install -g pm2@latest

# 安装PM2日志轮转插件
pm2 install pm2-logrotate

# 配置日志轮转
pm2 set pm2-logrotate:max_size 100M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

### 步骤3: 部署应用
```bash
cd /opt/my-hpcapp

# 使用部署脚本
./scripts/deploy-pm2-cluster.sh --deploy

# 或手动部署
npm install
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
```

### 步骤4: 设置系统服务
```bash
# 安装系统服务（需要root权限）
sudo ./scripts/pm2-service.sh install

# 检查服务状态
sudo systemctl status pm2-hpcapp
```

## 🔧 配置说明

### PM2集群配置 (ecosystem.config.js)

```javascript
module.exports = {
  apps: [{
    name: 'hpc-management-platform',
    script: './node_modules/.bin/next',
    args: 'start',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster', // 集群模式
    max_memory_restart: '2G',
    // ... 其他配置
  }]
}
```

**关键配置项说明：**
- `instances: 'max'` - 自动使用所有CPU核心
- `exec_mode: 'cluster'` - 启用集群模式
- `max_memory_restart: '2G'` - 内存超过2GB自动重启
- `node_args: '--max-old-space-size=2048'` - 设置Node.js内存限制

### 集群模式优势
- ✅ **多核利用**: 自动在所有CPU核心上运行进程
- ✅ **负载均衡**: 自动在进程间分配请求
- ✅ **故障恢复**: 单个进程崩溃不影响整体服务
- ✅ **零停机重启**: `pm2 reload` 实现无缝重启
- ✅ **内存管理**: 自动重启内存泄漏进程

## 📊 性能对比

| 配置方式 | CPU核心利用 | 内存使用 | 并发能力 | 可用性 |
|---------|------------|----------|----------|--------|
| 单进程 | 1/8 (12.5%) | 1.4GB | 50用户 | 低 |
| PM2集群 | 8/8 (100%) | 8-16GB | 400+用户 | 高 |

## 🔍 监控和管理

### 基本监控命令
```bash
# 查看进程列表
pm2 list

# 查看详细信息
pm2 show hpc-management-platform

# 实时监控
pm2 monit

# 查看日志
pm2 logs hpc-management-platform
```

### 自动监控脚本
```bash
# 一次性健康检查
./scripts/pm2-monitor.sh health

# 实时监控界面
./scripts/pm2-monitor.sh watch

# 生成监控报告
./scripts/pm2-monitor.sh report
```

### 设置定时监控
```bash
# 添加到crontab，每5分钟检查一次
*/5 * * * * /opt/my-hpcapp/scripts/pm2-monitor.sh monitor
```

## 🔄 日常运维

### 重启和重载
```bash
# 零停机重载（推荐）
pm2 reload hpc-management-platform

# 完全重启
pm2 restart hpc-management-platform

# 停止应用
pm2 stop hpc-management-platform

# 启动应用
pm2 start ecosystem.config.js
```

### 日志管理
```bash
# 查看实时日志
pm2 logs hpc-management-platform --lines 100

# 清空日志
pm2 flush

# 查看错误日志
pm2 logs hpc-management-platform --err

# 日志文件位置
ls -la logs/pm2-*.log
```

### 性能调优
```bash
# 调整实例数量（手动设置）
pm2 scale hpc-management-platform 6

# 调整内存限制
pm2 restart hpc-management-platform --max-memory-restart 3G

# 查看资源使用
pm2 monit
```

## 🛠️ 故障排除

### 常见问题

#### 1. PM2进程无法启动
```bash
# 检查Node.js版本
node --version

# 检查端口占用
netstat -tlnp | grep :3000

# 检查错误日志
pm2 logs hpc-management-platform --err
```

#### 2. 内存使用过高
```bash
# 降低实例数量
pm2 scale hpc-management-platform 4

# 调整内存限制
pm2 restart hpc-management-platform --max-memory-restart 1G

# 检查内存泄漏
pm2 monit
```

#### 3. CPU使用率过高
```bash
# 查看进程CPU使用
pm2 monit

# 检查应用日志中的性能问题
pm2 logs hpc-management-platform | grep -i "slow\|timeout\|error"
```

### 紧急恢复
```bash
# 快速重启所有进程
pm2 restart all

# 杀死所有PM2进程并重启
pm2 kill
pm2 start ecosystem.config.js

# 从备份恢复
pm2 resurrect
```

## 📈 性能优化建议

### 1. 硬件配置建议
- **CPU**: 至少8核心，推荐16核心+
- **内存**: 至少16GB，推荐32GB+
- **存储**: SSD硬盘，推荐NVMe SSD
- **网络**: 千兆网卡，推荐万兆网卡

### 2. 系统级优化
```bash
# 增加文件描述符限制
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf

# 优化内核参数
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p
```

### 3. 应用级优化
```bash
# 设置更大的内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 启用Node.js性能监控
export NODE_ENV=production
export UV_THREADPOOL_SIZE=16
```

## 🔐 安全配置

### 1. 用户权限
```bash
# 使用非root用户运行
sudo -u hpcapp pm2 start ecosystem.config.js

# 设置适当的文件权限
chmod 755 /opt/my-hpcapp
chown -R hpcapp:hpcapp /opt/my-hpcapp
```

### 2. 网络安全
```bash
# 配置防火墙
sudo ufw allow 3000/tcp
sudo ufw enable

# 使用Nginx反向代理（推荐）
# 参考: nginx-cluster.conf
```

## 📝 部署检查清单

### 部署前检查
- [ ] Node.js 18+ 已安装
- [ ] 系统内存 ≥ 8GB
- [ ] CPU核心数 ≥ 4
- [ ] 磁盘空间 ≥ 20GB
- [ ] 防火墙配置正确

### 部署后验证
- [ ] PM2进程正常运行
- [ ] 所有实例状态为 "online"
- [ ] HTTP端口(3000)可访问
- [ ] 日志无错误信息
- [ ] 系统服务已启用
- [ ] 监控脚本正常工作

### 性能验证
- [ ] CPU使用率正常分布
- [ ] 内存使用在合理范围
- [ ] 响应时间 < 500ms
- [ ] 并发测试通过
- [ ] 负载测试通过

## 📞 技术支持

### 获取帮助
```bash
# 查看脚本帮助
./scripts/deploy-pm2-cluster.sh --help
./scripts/pm2-service.sh help
./scripts/pm2-monitor.sh help

# 生成详细报告
./scripts/pm2-monitor.sh report
```

### 日志文件位置
- PM2日志: `logs/pm2-*.log`
- 应用日志: `logs/app.log`
- 监控日志: `/var/log/pm2-monitor.log`
- 系统日志: `journalctl -u pm2-hpcapp`

---

通过这套完整的PM2集群部署方案，你的HPC管理平台将能够充分利用服务器的多核资源，实现高性能、高可用的生产环境运行。
