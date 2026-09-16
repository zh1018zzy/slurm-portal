# 作业状态同步优化实施总结

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 实施日期
2025-10-09

## 问题背景

用户测试 `dashboard/jobs/history` 页面时，发现作业状态存在不同步的情况。经过分析，发现以下核心问题：

1. History 页面默认不自动刷新状态
2. sacct 命令缺少时间范围参数
3. 强制同步的时间范围固定为7天，不够灵活
4. 状态标准化逻辑不完善

## 优化方案

基于性能考虑，采用**分层同步策略**：
- 保持手动同步为7天（性能优先）
- 新增每日自动同步（同步当天作业）
- 新增每周自动同步（补充最近7天）

## 实施内容

### 1. 修复状态标准化逻辑 ✅

**文件**：`app/api/jobs/smart-sync/route.ts`

**修改内容**：
```typescript
function normalizeSlurmStatus(status: string): string {
  const cleanStatus = status.trim().toUpperCase()
  
  const statusMap: Record<string, string> = {
    // 缩写格式
    'R': 'RUNNING',
    'CD': 'COMPLETED',
    // 全名格式（兼容）
    'RUNNING': 'RUNNING',
    'COMPLETED': 'COMPLETED',
    // 特殊格式
    'CANCELLED BY 0': 'CANCELLED',
    // ... 更多状态映射
  }
  
  return statusMap[cleanStatus] || cleanStatus
}
```

**解决问题**：
- 同时支持 Slurm 返回的缩写格式（如 'CD'）和全名格式（如 'COMPLETED'）
- 处理特殊状态格式（如 'CANCELLED BY 0'）
- 避免因状态格式不一致导致的比较失败

### 2. 添加同步锁机制 ✅

**文件**：`app/api/jobs/smart-sync/route.ts`

**实现**：
```typescript
const syncLocks = new Map<string, { locked: boolean; lockTime: number }>()

function acquireSyncLock(key: string, timeout = 600000): boolean {
  const lock = syncLocks.get(key)
  
  if (lock && lock.locked) {
    if (Date.now() - lock.lockTime < timeout) {
      return false // 正在执行中
    }
    // 锁已超时，自动释放
  }
  
  syncLocks.set(key, { locked: true, lockTime: Date.now() })
  return true
}
```

**解决问题**：
- 防止同一类型的同步任务重复执行
- 自动处理超时锁（默认10分钟）
- 提高系统稳定性和资源利用率

### 3. 支持当天同步模式 ✅

**文件**：`app/api/jobs/smart-sync/route.ts`

**新增参数**：`syncToday=true`

**实现**：
```typescript
async function forceSyncJobs(recentDays: number, syncTodayOnly: boolean = false) {
  if (syncTodayOnly) {
    // 只同步当天作业
    const today = new Date()
    startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
    endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
  } else {
    // 同步最近N天
    startDate = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)
    endDate = new Date()
  }
  // ... sacct 同步逻辑
}
```

**解决问题**：
- 每日同步只需要同步当天作业，大幅提升性能
- 避免每次都同步大量历史数据

### 4. 创建定时任务调度器 ✅

**新增文件**：`lib/cron/job-sync-scheduler.ts`

**功能**：
- 每日自动同步：每天 23:30，同步当天作业
- 每周补充同步：周六 22:00，同步最近7天
- 支持手动触发（用于测试）
- 详细的日志记录

**关键代码**：
```typescript
class JobSyncScheduler {
  start() {
    // 每日同步：23:30
    this.dailySyncTask = cron.schedule('30 23 * * *', async () => {
      await this.executeDailySync()
    }, { timezone: "Asia/Shanghai" })
    
    // 每周同步：周六 22:00
    this.weeklySyncTask = cron.schedule('0 22 * * 6', async () => {
      await this.executeWeeklySync()
    }, { timezone: "Asia/Shanghai" })
  }
}
```

### 5. 应用启动时初始化 ✅

**新增文件**：`instrumentation.ts`

**配置**：`next.config.mjs`
```javascript
experimental: {
  instrumentationHook: true,
}
```

**功能**：
- 应用启动时自动启动定时任务
- 无需手动干预

### 6. 创建系统 Cron 脚本 ✅

**新增文件**：
- `scripts/sync-jobs-daily.sh` - 每日同步脚本
- `scripts/sync-jobs-weekly.sh` - 每周同步脚本

**功能**：
- 支持系统级 crontab 部署
- 自动日志管理（轮转、清理）
- 错误处理和退出码

### 7. 创建 API 接口 ✅

**新增接口**：
- `GET /api/cron/status` - 查看定时任务状态
- `POST /api/cron/trigger` - 手动触发同步（测试用）

**示例**：
```bash
# 查看状态
curl http://localhost:3000/api/cron/status

# 手动触发每日同步
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'
```

### 8. 更新依赖 ✅

**package.json**：
```json
{
  "dependencies": {
    "node-cron": "^3.0.3"
  },
  "devDependencies": {
    "@types/node-cron": "^3.0.11"
  }
}
```

### 9. 完善文档 ✅

**新增文档**：
1. `docs/deployment/job-sync-cron-setup.md` - 完整部署指南
2. `docs/deployment/QUICK-START-CRON.md` - 5分钟快速上手
3. `docs/analysis/job-status-sync-strategy.md` - 同步策略详解
4. `docs/analysis/job-status-sync-issues.md` - 问题分析报告
5. `README-CRON-SETUP.md` - 根目录快速指南

## 文件清单

### 新增文件
```
lib/cron/
  └── job-sync-scheduler.ts              # 定时任务调度器

app/api/cron/
  ├── status/route.ts                    # 状态查询接口
  └── trigger/route.ts                   # 手动触发接口

scripts/
  ├── sync-jobs-daily.sh                 # 每日同步脚本
  └── sync-jobs-weekly.sh                # 每周同步脚本

docs/deployment/
  ├── job-sync-cron-setup.md            # 完整部署指南
  └── QUICK-START-CRON.md               # 快速上手指南

docs/analysis/
  ├── job-status-sync-strategy.md       # 同步策略说明
  ├── job-status-sync-issues.md         # 问题分析报告
  └── job-sync-implementation-summary.md # 本文档

instrumentation.ts                       # Next.js 启动钩子
README-CRON-SETUP.md                    # 快速开始指南
```

### 修改文件
```
app/api/jobs/smart-sync/route.ts        # 核心同步逻辑
next.config.mjs                          # 启用 instrumentation
package.json                             # 添加依赖
```

## 部署步骤

### 快速部署（推荐）

```bash
# 1. 安装依赖
npm install

# 2. 构建应用
npm run build

# 3. 重启应用（PM2）
pm2 restart ecosystem.config.js

# 4. 验证
curl http://localhost:3000/api/cron/status
```

### 传统部署（系统 Cron）

```bash
# 1. 创建日志目录
sudo mkdir -p /var/log/hpcapp
sudo chown $(whoami):$(whoami) /var/log/hpcapp

# 2. 配置 crontab
crontab -e

# 添加：
30 23 * * * /opt/my-hpcapp/scripts/sync-jobs-daily.sh
0 22 * * 6 /opt/my-hpcapp/scripts/sync-jobs-weekly.sh

# 3. 保存退出
```

## 测试验证

### 1. 验证定时任务状态

```bash
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
        "active": true
      },
      {
        "name": "每周补充同步",
        "schedule": "周六 22:00",
        "range": "最近7天",
        "active": true
      }
    ]
  }
}
```

### 2. 手动触发测试

```bash
# 触发每日同步
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'

# 查看日志
pm2 logs hpc-management-platform | grep JobSyncScheduler
```

### 3. 验证同步效果

1. 提交一个测试作业
2. 等待作业完成
3. 触发同步
4. 在 history 页面查看状态是否正确

## 性能影响

### 预期性能指标

| 作业数量 | 每日同步（当天） | 每周同步（7天） |
|---------|----------------|----------------|
| 100     | < 5秒          | < 15秒         |
| 1,000   | < 15秒         | < 30秒         |
| 10,000  | < 30秒         | < 2分钟        |

### 资源消耗

- CPU：低（主要是 I/O 操作）
- 内存：中等（批量数据处理）
- 网络：低（内网通信）
- 数据库：中等（批量写入，已优化）

## 监控建议

### 关键指标

1. **同步成功率**：应 > 99%
2. **同步时间**：应在预期范围内
3. **状态变化数**：正常应较少
4. **错误日志**：应为 0

### 告警阈值

- 同步失败连续 3 次
- 同步时间超过预期 2 倍
- 状态变化数异常（如单次 > 1000）

## 已知限制

1. **时区**：固定为 Asia/Shanghai
2. **并发**：同一类型的同步不能并发执行
3. **历史范围**：默认只保留数据库中的数据，不主动清理

## 未来优化方向

1. **智能调度**
   - 根据系统负载动态调整同步时间
   - 根据作业活跃度调整同步频率

2. **增量优化**
   - 只同步状态可能变化的作业
   - 跳过已终止很久的作业

3. **监控告警**
   - 集成钉钉/企业微信告警
   - 添加 Prometheus 监控指标

4. **数据分析**
   - 同步效率分析
   - 作业状态变化趋势
   - 系统负载分析

## 回滚方案

如果需要回滚：

```bash
# 1. 停止定时任务（Node.js Cron）
# 删除或注释 instrumentation.ts 中的启动代码

# 2. 停止定时任务（系统 Cron）
crontab -e
# 注释或删除相关行

# 3. 重启应用
pm2 restart ecosystem.config.js

# 4. 恢复原代码
git checkout <commit-hash>
npm install
npm run build
```

## 验收标准

✅ **功能验收**
- [ ] 定时任务能正常启动
- [ ] 每日同步能正确执行
- [ ] 每周同步能正确执行
- [ ] 手动触发功能正常
- [ ] 状态查询接口正常

✅ **性能验收**
- [ ] 同步时间在预期范围内
- [ ] 不影响应用正常运行
- [ ] 内存占用正常

✅ **稳定性验收**
- [ ] 连续运行7天无异常
- [ ] 日志记录完整
- [ ] 错误处理正确

✅ **文档验收**
- [ ] 部署文档完整
- [ ] 测试步骤清晰
- [ ] 故障排查指南可用

## 联系方式

如有问题，请联系：
- 开发团队：[邮箱/钉钉群]
- 文档仓库：[GitHub/GitLab 地址]

---

**实施者**：AI Assistant  
**审核者**：待定  
**实施日期**：2025-10-09  
**文档版本**：1.0

