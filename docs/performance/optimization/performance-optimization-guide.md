# 🚀 HPC应用性能优化完整指南

> 适用范围：性能优化、容量规划与调优实践
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 目录
1. [问题诊断](#问题诊断)
2. [优化方案](#优化方案)
3. [部署步骤](#部署步骤)
4. [监控和维护](#监控和维护)
5. [故障排除](#故障排除)

## 🔍 问题诊断

### 1. 快速诊断命令

```bash
# 运行性能诊断
npm run diagnose

# 持续监控性能
npm run monitor:continuous

# 查看PM2状态
npm run pm2:monit
```

### 2. 常见性能瓶颈

#### 系统层面
- **CPU使用率过高**: > 80%
- **内存不足**: 使用率 > 80%
- **磁盘空间不足**: 使用率 > 90%
- **网络连接数过多**: 超过系统限制

#### 应用层面
- **API响应慢**: > 5秒
- **数据库查询慢**: 缺乏索引
- **缓存未生效**: 重复查询
- **前端渲染慢**: 大量DOM操作

#### PM2层面
- **进程重启频繁**: 内存泄漏
- **实例数量不当**: 资源竞争
- **监控未启用**: 无法及时发现问题

## 🎯 优化方案

### 1. PM2配置优化

#### 优化前问题
```javascript
// 问题配置
instances: 'max', // 可能导致资源竞争
max_memory_restart: '2G', // 内存限制过低
monitoring: false, // 监控未启用
```

#### 优化后配置
```javascript
// 优化配置
instances: 4, // 固定实例数量
max_memory_restart: '4G', // 增加内存限制
monitoring: true, // 启用监控
load_balancing_method: 'least-connection' // 负载均衡
```

### 2. Next.js配置优化

#### 图片优化
```javascript
images: {
  formats: ['image/webp', 'image/avif'], // 现代图片格式
  deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  minimumCacheTTL: 60 * 60 * 24 * 30, // 30天缓存
}
```

#### 代码分割
```javascript
webpack: (config, { dev, isServer }) => {
  if (!dev && !isServer) {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        }
      }
    }
  }
  return config
}
```

### 3. 数据库优化

#### 索引优化
```sql
-- 作业表索引
CREATE INDEX IF NOT EXISTS idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_submit_time ON jobs(submit_time DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_partition ON jobs(partition);

-- 应用表索引
CREATE INDEX IF NOT EXISTS idx_hpc_apps_metadata_name ON hpc_applications ((metadata->>'name'));
CREATE INDEX IF NOT EXISTS idx_hpc_apps_status ON hpc_applications (status);
```

#### 查询优化
```typescript
// 优化前：查询所有字段
let dbQuery = supabase.from('jobs').select('*')

// 优化后：只查询必要字段
let dbQuery = supabase.from('jobs').select('job_id,status,user_id,submit_time,start_time,end_time,nodes,partition')
```

### 4. 缓存策略

#### 内存缓存
```typescript
// 不同状态的缓存时间
const ACTIVE_JOBS_TTL = 10000    // 10秒
const COMPLETED_JOBS_TTL = 60000 // 1分钟
const DEFAULT_TTL = 30000        // 30秒
```

#### 客户端缓存
```typescript
// 前端缓存策略
const CACHE_DURATION = 30 * 1000 // 30秒
const cache = new Map<string, { data: any, timestamp: number }>()
```

## 🚀 部署步骤

### 1. 一键优化部署

```bash
# 运行优化部署脚本
npm run optimize
```

### 2. 手动部署步骤

#### 步骤1: 备份配置
```bash
# 备份当前配置
cp ecosystem.config.js backup/ecosystem.config.js.backup
cp next.config.mjs backup/next.config.mjs.backup
```

#### 步骤2: 应用优化配置
```bash
# 重新构建应用
npm run build

# 重启PM2服务
npm run pm2:reload
```

#### 步骤3: 验证部署
```bash
# 检查服务状态
npm run pm2:monit

# 测试API响应
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/jobs"
```

### 3. 系统级优化

#### 内核参数优化
```bash
# 增加文件描述符限制
echo "hpcapp soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "hpcapp hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# 优化网络参数
echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 📊 监控和维护

### 1. 性能监控

#### 实时监控
```bash
# 启动持续监控
npm run monitor:continuous -- --interval=30000

# 查看PM2监控
npm run pm2:monit
```

#### 定期诊断
```bash
# 每周运行性能诊断
npm run diagnose

# 查看诊断报告
cat logs/performance-diagnosis.json
```

### 2. 监控指标

#### 系统指标
- **CPU使用率**: < 60%
- **内存使用率**: < 70%
- **磁盘使用率**: < 80%
- **网络连接数**: < 1000

#### 应用指标
- **API响应时间**: < 1000ms
- **页面加载时间**: < 3秒
- **缓存命中率**: > 80%
- **错误率**: < 1%

#### PM2指标
- **进程状态**: 全部online
- **重启次数**: < 5次/天
- **内存使用**: < 4GB/实例
- **CPU使用**: < 50%/实例

### 3. 维护任务

#### 日常维护
```bash
# 清理日志文件
find ./logs -name "*.log" -mtime +7 -delete

# 清理临时文件
rm -rf ./tmp/*

# 清理Next.js缓存
rm -rf .next/cache
```

#### 定期维护
```bash
# 每周性能诊断
npm run diagnose

# 每月清理node_modules
rm -rf node_modules package-lock.json
npm install --production

# 每季度更新依赖
npm update
```

## 🔧 故障排除

### 1. 常见问题

#### PM2进程重启频繁
```bash
# 查看错误日志
npm run pm2:logs

# 检查内存使用
pm2 monit

# 增加内存限制
# 修改ecosystem.config.js中的max_memory_restart
```

#### API响应慢
```bash
# 检查数据库连接
node test-db-connection.js

# 查看慢查询日志
tail -f logs/performance.log

# 优化数据库查询
# 参考docs/backend-query-optimization.md
```

#### 内存泄漏
```bash
# 使用Node.js内存分析
node --inspect app.js

# 检查内存使用趋势
pm2 monit

# 定期重启服务
pm2 restart hpc-management-platform
```

### 2. 性能调优

#### 数据库调优
```sql
-- 分析表统计信息
ANALYZE jobs;
ANALYZE hpc_applications;

-- 重建索引
REINDEX TABLE jobs;
REINDEX TABLE hpc_applications;

-- 清理过期数据
DELETE FROM jobs WHERE end_time < NOW() - INTERVAL '90 days';
```

#### 应用调优
```typescript
// 优化缓存策略
const CACHE_TTL = process.env.NODE_ENV === 'production' ? 60000 : 30000

// 优化并发控制
const MAX_CONCURRENT_REQUESTS = 10
const REQUEST_TIMEOUT = 30000
```

### 3. 紧急处理

#### 服务不可用
```bash
# 快速重启
pm2 restart hpc-management-platform

# 检查端口占用
netstat -tlnp | grep :3000

# 查看系统资源
top -p $(pgrep -f "hpc-management-platform")
```

#### 性能严重下降
```bash
# 临时减少实例数
pm2 scale hpc-management-platform 2

# 增加内存限制
# 修改ecosystem.config.js

# 重启服务
pm2 reload hpc-management-platform
```

## 📈 性能基准

### 1. 目标性能指标

#### 页面加载时间
- **首屏加载**: < 2秒
- **交互响应**: < 100ms
- **API响应**: < 1000ms

#### 系统资源使用
- **CPU使用率**: < 60%
- **内存使用率**: < 70%
- **磁盘I/O**: < 80%

#### 用户体验
- **页面可用性**: > 99.9%
- **错误率**: < 0.1%
- **缓存命中率**: > 80%

### 2. 性能测试

#### 负载测试
```bash
# 使用ab进行压力测试
ab -n 1000 -c 10 http://localhost:3000/api/jobs

# 使用wrk进行基准测试
wrk -t12 -c400 -d30s http://localhost:3000/api/jobs
```

#### 监控测试
```bash
# 测试监控脚本
node scripts/performance-monitor.js

# 测试诊断脚本
node scripts/performance-diagnosis.js
```

## 🎯 最佳实践

### 1. 开发阶段
- 使用性能监控工具
- 定期进行性能测试
- 优化数据库查询
- 实现合理的缓存策略

### 2. 部署阶段
- 使用PM2集群模式
- 配置合理的资源限制
- 启用监控和日志
- 设置自动重启策略

### 3. 运维阶段
- 定期性能诊断
- 监控关键指标
- 及时处理告警
- 持续优化配置

## 📚 相关文档

- [PM2配置优化](../../operations/storage-monitoring.md)
- [数据库性能优化](./backend-query-optimization.md)
- [前端性能优化](./large-data-list-optimization.md)
- [API性能优化](./trend-api-optimization.md)
- [监控和告警](../../operations/storage-monitoring.md)

---

**注意**: 本指南基于当前系统配置编写，请根据实际环境调整参数和配置。 
