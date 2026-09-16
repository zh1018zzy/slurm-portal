# 作业状态同步定时任务部署指南

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 概述

本指南介绍如何部署和配置作业状态同步定时任务，确保历史作业状态数据保持最新。

## 同步策略

系统采用分层同步策略，在性能和数据一致性之间取得平衡：

| 层级 | 触发方式 | 时间 | 同步范围 | 目的 |
|------|---------|------|---------|------|
| Layer 1 | 手动 | 按需 | 最近 7 天 | 用户主动获取最新状态 |
| Layer 2 | 自动 | 每天 23:30 | 当天作业 | 确保当天数据完整 |
| Layer 3 | 自动 | 周六 22:00 | 最近 7 天 | 补充遗漏的状态变更 |

## 部署方式

有两种部署方式可选，推荐根据您的环境选择：

### 方式 1: Node.js Cron（推荐）

#### 优点
- ✅ 与应用集成，易于管理
- ✅ 支持动态配置
- ✅ 可以通过 API 控制
- ✅ 日志统一管理

#### 部署步骤

**1. 安装依赖**
```bash
cd /opt/my-hpcapp
npm install node-cron @types/node-cron --save
```

**2. 启用 instrumentation（Next.js 13+）**

编辑 `next.config.js`，添加 experimental 配置：
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  // ... 其他配置
}

module.exports = nextConfig
```

**3. 重启应用**
```bash
# 使用 PM2
pm2 restart ecosystem.config.js

# 或直接启动
npm run build
npm start
```

**4. 验证定时任务状态**
```bash
# 查看定时任务状态
curl http://localhost:3000/api/cron/status

# 预期输出：
{
  "success": true,
  "scheduler": {
    "isRunning": true,
    "tasks": [
      {
        "name": "每日增量同步",
        "schedule": "每天 23:30",
        "range": "当天作业",
        "timezone": "Asia/Shanghai",
        "active": true
      },
      {
        "name": "每周补充同步",
        "schedule": "周六 22:00",
        "range": "最近7天",
        "timezone": "Asia/Shanghai",
        "active": true
      }
    ]
  },
  "serverTime": "2025-10-09T...",
  "serverTimeZone": "Asia/Shanghai"
}
```

### 方式 2: 系统 Cron

#### 优点
- ✅ 独立于应用运行
- ✅ 系统级可靠性
- ✅ 适合生产环境

#### 部署步骤

**1. 创建日志目录**
```bash
sudo mkdir -p /var/log/hpcapp
sudo chown $(whoami):$(whoami) /var/log/hpcapp
```

**2. 确保脚本有执行权限**
```bash
chmod +x /opt/my-hpcapp/scripts/sync-jobs-daily.sh
chmod +x /opt/my-hpcapp/scripts/sync-jobs-weekly.sh
```

**3. 编辑 crontab**
```bash
crontab -e
```

**4. 添加定时任务**
```bash
# 每日增量同步：每天 23:30
30 23 * * * /opt/my-hpcapp/scripts/sync-jobs-daily.sh

# 每周补充同步：每周六 22:00
0 22 * * 6 /opt/my-hpcapp/scripts/sync-jobs-weekly.sh
```

**5. 验证 crontab**
```bash
crontab -l
```

**6. 查看日志**
```bash
# 每日同步日志
tail -f /var/log/hpcapp/daily-sync.log

# 每周同步日志
tail -f /var/log/hpcapp/weekly-sync.log
```

## 测试验证

### 1. 测试手动触发（Node.js Cron）

```bash
# 测试每日同步
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'

# 测试每周同步
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "weekly"}'
```

### 2. 测试脚本执行（系统 Cron）

```bash
# 测试每日同步脚本
/opt/my-hpcapp/scripts/sync-jobs-daily.sh

# 测试每周同步脚本
/opt/my-hpcapp/scripts/sync-jobs-weekly.sh
```

### 3. 验证同步效果

```bash
# 查看同步结果
curl http://localhost:3000/api/jobs/smart-sync

# 查看历史作业状态
curl http://localhost:3000/api/jobs?history=true&dateRange=7days \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 监控和维护

### 日志管理

**Node.js Cron 方式：**
- 日志输出到应用日志（可通过 PM2 查看）
```bash
pm2 logs hpc-management-platform --lines 100
```

**系统 Cron 方式：**
- 日志文件：`/var/log/hpcapp/daily-sync.log`
- 日志文件：`/var/log/hpcapp/weekly-sync.log`
- 自动轮转：超过 10MB 自动归档
- 自动清理：每日日志保留 30 天，每周日志保留 90 天

### 性能监控

建议监控以下指标：

1. **同步时间**
   - 每日同步：预期 < 30 秒
   - 每周同步：预期 < 2 分钟

2. **作业数量**
   - 总作业数
   - 更新作业数
   - 新增作业数
   - 状态变化数

3. **失败率**
   - 同步成功次数
   - 同步失败次数
   - 失败原因统计

### 告警配置（可选）

如果同步失败，可以通过以下方式接收告警：

1. **邮件告警**
2. **钉钉/企业微信机器人**
3. **监控平台集成（Prometheus、Grafana 等）**

## 故障排查

### 问题 1: 定时任务未执行

**Node.js Cron：**
```bash
# 检查应用是否启动
pm2 status

# 查看应用日志
pm2 logs hpc-management-platform | grep JobSyncScheduler

# 检查定时任务状态
curl http://localhost:3000/api/cron/status
```

**系统 Cron：**
```bash
# 检查 crontab 是否配置
crontab -l

# 检查 cron 服务状态
sudo systemctl status cron   # Ubuntu/Debian
sudo systemctl status crond   # CentOS/RHEL

# 查看 cron 日志
sudo tail -f /var/log/syslog | grep CRON   # Ubuntu/Debian
sudo tail -f /var/log/cron                  # CentOS/RHEL
```

### 问题 2: 同步失败

检查以下方面：

1. **网络连接**
```bash
# 测试 API 可访问性
curl http://localhost:3000/api/jobs/smart-sync
```

2. **Slurm 命令**
```bash
# 测试 sacct 命令
sacct -o JobID,State,User,Partition,NodeList,Start,End,JobName,Submit -P -n
```

3. **数据库连接**
```bash
# 检查环境变量
echo $SUPABASE_URL
echo $SUPABASE_KEY
```

4. **查看详细日志**
```bash
# Node.js Cron
pm2 logs hpc-management-platform --err --lines 50

# 系统 Cron
tail -100 /var/log/hpcapp/daily-sync.log
tail -100 /var/log/hpcapp/weekly-sync.log
```

### 问题 3: 同步时间过长

如果同步时间超过预期，可以：

1. **优化数据库查询**
   - 检查是否有合适的索引
   - 分析慢查询

2. **调整同步范围**
   - 减少同步天数
   - 只同步活跃状态的作业

3. **增加服务器资源**
   - CPU
   - 内存
   - 数据库连接池

## 配置调整

### 修改同步时间

**Node.js Cron：**

编辑 `lib/cron/job-sync-scheduler.ts`：
```typescript
// 修改每日同步时间（当前是 23:30）
this.dailySyncTask = cron.schedule('30 23 * * *', ...)

// 修改每周同步时间（当前是周六 22:00）
this.weeklySyncTask = cron.schedule('0 22 * * 6', ...)
```

**系统 Cron：**

```bash
crontab -e

# 修改时间（Cron 表达式格式：分 时 日 月 周）
30 23 * * * /opt/my-hpcapp/scripts/sync-jobs-daily.sh
0 22 * * 6 /opt/my-hpcapp/scripts/sync-jobs-weekly.sh
```

### 修改同步范围

编辑对应的脚本或 API 调用参数：

```bash
# 每日同步：syncToday=true（只同步当天）
curl ... -d "force=true&syncToday=true"

# 每周同步：recentDays=7（同步最近7天）
curl ... -d "force=true&recentDays=7"

# 可调整为其他天数
curl ... -d "force=true&recentDays=14"  # 同步最近14天
```

## 安全建议

1. **限制脚本权限**
```bash
chmod 750 /opt/my-hpcapp/scripts/sync-jobs-*.sh
```

2. **日志文件权限**
```bash
chmod 640 /var/log/hpcapp/*.log
```

3. **使用内网地址**
   - API 调用使用 `localhost` 或内网 IP
   - 不要暴露到公网

4. **添加认证（可选）**
   - 为 API 添加认证 Token
   - 在脚本中设置环境变量

## 最佳实践

1. **定期检查日志**
   - 每周查看一次同步日志
   - 关注失败和异常情况

2. **性能基线**
   - 记录正常情况下的同步时间
   - 发现异常时及时处理

3. **备份策略**
   - 定期备份数据库
   - 保留历史日志

4. **文档更新**
   - 记录配置变更
   - 更新运维文档

## 附录

### Cron 表达式说明

```
┌───────────── 分钟 (0 - 59)
│ ┌───────────── 小时 (0 - 23)
│ │ ┌───────────── 日 (1 - 31)
│ │ │ ┌───────────── 月 (1 - 12)
│ │ │ │ ┌───────────── 星期 (0 - 7) (0和7都代表周日)
│ │ │ │ │
* * * * *

示例：
30 23 * * *   # 每天 23:30
0 22 * * 6    # 每周六 22:00
0 2 1 * *     # 每月1号 02:00
0 0 * * 0     # 每周日 00:00
*/15 * * * *  # 每15分钟
```

### 相关文档

- [作业状态同步机制分析](./job-status-sync-issues.md)
- [作业状态同步优化方案](./job-status-sync-strategy.md)
- [Next.js Instrumentation 文档](https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation)

---

**文档版本**: 1.0  
**最后更新**: 2025-10-09  
**维护者**: HPC 管理平台团队

