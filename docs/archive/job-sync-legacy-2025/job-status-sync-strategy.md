# 作业状态同步优化方案

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 背景
- 保持现有7天同步逻辑（性能考虑）
- 增加定期全量同步任务，确保历史数据最终一致性
- 在低峰期（周六晚上）执行，不影响日常使用

## 推荐方案：分层同步策略

### 策略概览

```
┌─────────────────────────────────────────────────────────┐
│             作业状态同步分层策略                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │ Layer 1: 手动/实时同步（按需触发）              │   │
│  │ - 范围: 最近 7 天                               │   │
│  │ - 触发: 用户点击"强制同步"                      │   │
│  │ - 目的: 快速获取活跃作业最新状态                 │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │ Layer 2: 每日增量同步（自动）                   │   │
│  │ - 范围: 当天作业（Today）                       │   │
│  │ - 时间: 每天 23:30                              │   │
│  │ - 目的: 同步当天作业最终状态                     │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────────────────────────────────────┐   │
│  │ Layer 3: 每周补充同步（自动）                   │   │
│  │ - 范围: 最近 7 天                               │   │
│  │ - 时间: 每周六 22:00                            │   │
│  │ - 目的: 补充遗漏的作业状态变更                   │   │
│  └────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 实施细节

#### Layer 1: 手动/实时同步（已有，保持不变）
```typescript
// 当前实现：app/dashboard/jobs/history/page.tsx
const performForceSync = async () => {
  await fetch('/api/jobs/smart-sync', {
    method: 'POST',
    body: 'force=true&recentDays=7'  // 保持7天
  })
}
```

#### Layer 2: 每日增量同步（新增）
```typescript
// 每天 23:30 同步当天作业
// 同步当天提交的所有作业状态
```

#### Layer 3: 每周补充同步（新增）
```typescript
// 每周六晚上 22:00 同步最近 7 天
// 补充遗漏的作业状态变更，确保数据一致性
```

## 技术实现方案

### 方案 1: 使用 Node.js Cron（推荐）

#### 1.1 安装依赖
```bash
npm install node-cron
npm install @types/node-cron --save-dev
```

#### 1.2 创建定时任务管理器
```typescript
// lib/cron/job-sync-scheduler.ts
import cron from 'node-cron'

class JobSyncScheduler {
  private dailySyncTask: cron.ScheduledTask | null = null
  private weeklySyncTask: cron.ScheduledTask | null = null
  private isRunning = false
  
  // 启动定时任务
  start() {
    if (this.isRunning) {
      console.log('[JobSyncScheduler] 定时任务已在运行中')
      return
    }
    
    // 每日增量同步：每天 23:30
    this.dailySyncTask = cron.schedule('30 23 * * *', async () => {
      await this.executeDailySync()
    }, {
      timezone: "Asia/Shanghai"
    })
    
    // 每周补充同步：每周六 22:00
    this.weeklySyncTask = cron.schedule('0 22 * * 6', async () => {
      await this.executeWeeklySync()
    }, {
      timezone: "Asia/Shanghai"
    })
    
    this.isRunning = true
    console.log('[JobSyncScheduler] 定时任务已启动')
    console.log('  - 每日同步: 每天 23:30 (当天作业)')
    console.log('  - 每周同步: 周六 22:00 (最近7天)')
  }
  
  // 停止定时任务
  stop() {
    if (this.dailySyncTask) {
      this.dailySyncTask.stop()
      this.dailySyncTask = null
    }
    if (this.weeklySyncTask) {
      this.weeklySyncTask.stop()
      this.weeklySyncTask = null
    }
    this.isRunning = false
    console.log('[JobSyncScheduler] 定时任务已停止')
  }
  
  // 执行每日同步
  private async executeDailySync() {
    const startTime = Date.now()
    console.log('[JobSyncScheduler] 开始执行每日增量同步（当天作业）...')
    
    try {
      const response = await fetch('http://localhost:3000/api/jobs/smart-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'force=true&syncToday=true'
      })
      
      const data = await response.json()
      const duration = Date.now() - startTime
      
      if (data.success) {
        console.log(`[JobSyncScheduler] 每日同步完成 (${duration}ms)`)
        console.log(`  - 更新作业数: ${data.stats?.updated || 0}`)
        console.log(`  - 新增作业数: ${data.stats?.newJobs || 0}`)
        console.log(`  - 状态变化数: ${data.stats?.changedJobs || 0}`)
      } else {
        console.error('[JobSyncScheduler] 每日同步失败:', data.error)
      }
    } catch (error) {
      console.error('[JobSyncScheduler] 每日同步异常:', error)
    }
  }
  
  // 执行每周同步
  private async executeWeeklySync() {
    const startTime = Date.now()
    console.log('[JobSyncScheduler] 开始执行每周补充同步（最近7天）...')
    
    try {
      const response = await fetch('http://localhost:3000/api/jobs/smart-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'force=true&recentDays=7'
      })
      
      const data = await response.json()
      const duration = Date.now() - startTime
      
      if (data.success) {
        console.log(`[JobSyncScheduler] 每周同步完成 (${duration}ms)`)
        console.log(`  - 更新作业数: ${data.stats?.updated || 0}`)
        console.log(`  - 新增作业数: ${data.stats?.newJobs || 0}`)
        console.log(`  - 状态变化数: ${data.stats?.changedJobs || 0}`)
        
        // 记录同步日志到数据库（可选）
        await this.logSyncResult({
          type: 'weekly',
          duration,
          stats: data.stats
        })
      } else {
        console.error('[JobSyncScheduler] 每周同步失败:', data.error)
      }
    } catch (error) {
      console.error('[JobSyncScheduler] 每周同步异常:', error)
    }
  }
  
  // 记录同步日志
  private async logSyncResult(result: any) {
    // TODO: 将同步结果记录到数据库
    // 可用于监控和分析
  }
  
  // 手动触发每日同步（用于测试）
  async triggerDailySync() {
    await this.executeDailySync()
  }
  
  // 手动触发每周同步（用于测试）
  async triggerWeeklySync() {
    await this.executeWeeklySync()
  }
}

export const jobSyncScheduler = new JobSyncScheduler()
```

#### 1.3 在应用启动时初始化
```typescript
// app/api/init/route.ts（新建）
import { NextRequest, NextResponse } from 'next/server'
import { jobSyncScheduler } from '@/lib/cron/job-sync-scheduler'

// 应用启动时调用
export async function POST(req: NextRequest) {
  try {
    jobSyncScheduler.start()
    return NextResponse.json({
      success: true,
      message: '定时任务已启动'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    })
  }
}

// 获取定时任务状态
export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    scheduler: {
      isRunning: true,
      tasks: [
        { name: '每日增量同步', schedule: '每天 02:00', range: '最近30天' },
        { name: '每周全量同步', schedule: '周六 22:00', range: '最近90天' }
      ]
    }
  })
}
```

#### 1.4 在服务器启动脚本中初始化
```typescript
// server.ts 或 instrumentation.ts（Next.js 13+）
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { jobSyncScheduler } = await import('./lib/cron/job-sync-scheduler')
    jobSyncScheduler.start()
  }
}
```

### 方案 2: 使用系统 Cron（适用于生产环境）

#### 2.1 创建同步脚本
```bash
# scripts/sync-jobs-daily.sh
#!/bin/bash
# 每日增量同步脚本

curl -X POST http://localhost:3000/api/jobs/smart-sync \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "force=true&recentDays=30" \
  >> /var/log/hpcapp/daily-sync.log 2>&1

echo "Daily sync completed at $(date)" >> /var/log/hpcapp/daily-sync.log
```

```bash
# scripts/sync-jobs-weekly.sh
#!/bin/bash
# 每周全量同步脚本

curl -X POST http://localhost:3000/api/jobs/smart-sync \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "force=true&recentDays=90" \
  >> /var/log/hpcapp/weekly-sync.log 2>&1

echo "Weekly sync completed at $(date)" >> /var/log/hpcapp/weekly-sync.log
```

#### 2.2 配置系统 Cron
```bash
# 编辑 crontab
crontab -e

# 添加定时任务
# 每日增量同步：每天 23:30
30 23 * * * /opt/my-hpcapp/scripts/sync-jobs-daily.sh

# 每周补充同步：每周六 22:00
0 22 * * 6 /opt/my-hpcapp/scripts/sync-jobs-weekly.sh
```

### 方案 3: 使用 PM2（推荐用于 Node.js 应用）

```json
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'hpcapp',
    script: 'npm',
    args: 'start',
    cron_restart: '0 2 * * *', // 每天凌晨2点重启（可选）
  }],
  
  // 定时任务
  cron_jobs: [
    {
      name: 'daily-job-sync',
      script: './scripts/sync-jobs.js',
      cron: '0 2 * * *',
      args: '--days=30'
    },
    {
      name: 'weekly-job-sync',
      script: './scripts/sync-jobs.js',
      cron: '0 22 * * 6',
      args: '--days=90'
    }
  ]
}
```

## 需要修复的其他问题

### 问题 1: 状态标准化逻辑（必须修复）

**当前问题**：
```typescript
// normalizeSlurmStatus('COMPLETED') 会返回 'COMPLETED'
// 但如果映射表中没有，可能导致比较失败
```

**修复方案**：
```typescript
function normalizeSlurmStatus(status: string): string {
  const cleanStatus = status.trim().toUpperCase()
  
  const statusMap: Record<string, string> = {
    // 缩写格式
    'R': 'RUNNING',
    'PD': 'PENDING',
    'CG': 'COMPLETING',
    'CD': 'COMPLETED',
    'F': 'FAILED',
    'CA': 'CANCELLED',
    'TO': 'TIMEOUT',
    'NF': 'NODE_FAIL',
    'PR': 'PREEMPTED',
    'S': 'SUSPENDED',
    'ST': 'STOPPED',
    'OOM': 'OUT_OF_MEMORY',
    // 全名格式（兼容）
    'RUNNING': 'RUNNING',
    'PENDING': 'PENDING',
    'COMPLETING': 'COMPLETING',
    'COMPLETED': 'COMPLETED',
    'FAILED': 'FAILED',
    'CANCELLED': 'CANCELLED',
    'TIMEOUT': 'TIMEOUT',
    'NODE_FAIL': 'NODE_FAIL',
    'PREEMPTED': 'PREEMPTED',
    'SUSPENDED': 'SUSPENDED',
    'STOPPED': 'STOPPED',
    'OUT_OF_MEMORY': 'OUT_OF_MEMORY',
    // 特殊格式
    'CANCELLED BY 0': 'CANCELLED',
    'CANCELLED+': 'CANCELLED'
  }
  
  return statusMap[cleanStatus] || cleanStatus
}
```

### 问题 2: sacct 命令性能优化

**当前问题**：
- 大量作业时，sacct 可能很慢
- 需要优化查询字段和格式

**优化建议**：
```typescript
// 只查询必要的字段
const { stdout } = await execFileAsync('sacct', [
  '-j', jobIds.join(','),  // 批量查询指定作业
  '-o', 'JobID,State,Start,End',  // 只查询必要字段
  '-P',
  '-n',
  '--noconvert'  // 不转换时间格式，提升性能
])
```

### 问题 3: 数据库批量更新性能

**当前问题**：
- 大量作业更新时，可能影响数据库性能

**优化建议**：
```typescript
// 使用批量更新，减少数据库连接次数
// 使用事务确保数据一致性
async function batchUpsertJobsToDb(jobs: JobInfo[], batchSize = 100) {
  // 分批处理，每次最多100个
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize)
    await supabase.from('jobs').upsert(batch, {
      onConflict: 'job_id',
      ignoreDuplicates: false
    })
  }
}
```

### 问题 4: 同步锁机制（防止重复执行）

**当前问题**：
- 如果上一次同步还未完成，下一次又被触发，可能导致问题

**解决方案**：
```typescript
class SyncLock {
  private locks = new Map<string, boolean>()
  
  async acquire(key: string, timeout = 30000): Promise<boolean> {
    if (this.locks.get(key)) {
      return false // 已被锁定
    }
    
    this.locks.set(key, true)
    
    // 自动释放锁
    setTimeout(() => {
      this.locks.delete(key)
    }, timeout)
    
    return true
  }
  
  release(key: string) {
    this.locks.delete(key)
  }
}

const syncLock = new SyncLock()

// 使用示例
async function executeSync(type: 'daily' | 'weekly') {
  if (!await syncLock.acquire(type)) {
    console.log(`[Sync] ${type} 同步正在进行中，跳过本次执行`)
    return
  }
  
  try {
    // 执行同步
    await performSync()
  } finally {
    syncLock.release(type)
  }
}
```

### 问题 5: 监控和告警

**建议添加**：
```typescript
// 记录同步日志到数据库
interface SyncLog {
  id: string
  type: 'daily' | 'weekly' | 'manual'
  startTime: string
  endTime: string
  duration: number
  jobsUpdated: number
  jobsNew: number
  jobsChanged: number
  status: 'success' | 'failed'
  error?: string
}

// 如果同步失败，发送告警
async function sendAlert(log: SyncLog) {
  if (log.status === 'failed') {
    // 发送邮件/钉钉/企业微信告警
    console.error('[Alert] 同步失败:', log.error)
  }
}
```

## 完整实施计划

### 第一阶段：修复关键问题（1-2天）
1. ✅ 修复状态标准化逻辑
2. ✅ 优化 sacct 命令性能
3. ✅ 添加同步锁机制

### 第二阶段：实现定时同步（2-3天）
1. ✅ 实现定时任务调度器
2. ✅ 创建同步脚本
3. ✅ 配置定时任务
4. ✅ 测试验证

### 第三阶段：监控和优化（1-2天）
1. ✅ 添加同步日志记录
2. ✅ 实现监控告警
3. ✅ 性能测试和优化

## 测试方案

### 功能测试
```bash
# 1. 手动触发每日同步
curl -X POST http://localhost:3000/api/cron/trigger-daily-sync

# 2. 手动触发每周同步
curl -X POST http://localhost:3000/api/cron/trigger-weekly-sync

# 3. 查看定时任务状态
curl http://localhost:3000/api/cron/status

# 4. 查看同步日志
curl http://localhost:3000/api/cron/logs?type=daily&limit=10
```

### 性能测试
```bash
# 测试不同数据量下的同步性能
- 100 个作业：预期 < 5 秒
- 1000 个作业：预期 < 30 秒
- 10000 个作业：预期 < 5 分钟
```

## 风险和注意事项

### 风险 1: 长时间同步导致超时
**应对**：
- 设置合理的超时时间（建议 10 分钟）
- 分批处理大量作业

### 风险 2: 同步失败无人知晓
**应对**：
- 添加监控告警机制
- 记录详细日志

### 风险 3: 数据库连接池耗尽
**应对**：
- 使用连接池
- 控制并发数量

### 风险 4: sacct 命令阻塞
**应对**：
- 设置命令超时
- 添加重试机制

## 总结

### 推荐方案
**Node.js Cron + 分层同步策略**

**优点**：
- ✅ 与应用集成，易于管理
- ✅ 支持动态调整
- ✅ 可以复用现有 API
- ✅ 易于监控和调试

**缺点**：
- ❌ 应用重启会影响定时任务
- ❌ 需要额外的进程管理（可用 PM2 解决）

### 时间表
```
Layer 1 (手动): 按需触发，同步 7 天      ← 已有
Layer 2 (每日): 每天 23:30，同步当天作业 ← 新增
Layer 3 (每周): 周六 22:00，同步 7 天    ← 新增
```

这样可以在保证性能的前提下，确保数据最终一致性。

