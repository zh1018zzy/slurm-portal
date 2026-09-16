# HPC 作业同步系统 - 完整技术文档

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

> **最新更新**: 2025-11-07
> **版本**: v3.0 - 智能同步 + 过期作业检测

---

## 📋 目录

1. [系统概述](#系统概述)
2. [同步架构](#同步架构)
3. [同步模式详解](#同步模式详解)
4. [API 接口](#api-接口)
5. [数据流程](#数据流程)
6. [定时任务配置](#定时任务配置)
7. [故障处理](#故障处理)
8. [性能优化](#性能优化)
9. [监控与维护](#监控与维护)

---

## 系统概述

### 核心功能

HPC 作业同步系统负责在 **SLURM 调度器**和**应用数据库**之间同步作业状态，确保用户能够实时查看和管理他们的计算任务。

### 关键特性

✅ **三种同步模式**: 智能同步、强制同步、每日同步
✅ **过期作业检测**: 自动修复 RUNNING/PENDING 状态不一致
✅ **实时监控**: 60秒轮询间隔
✅ **智能去重**: 避免重复通知
✅ **性能优化**: 缓存、锁机制、批量处理
✅ **通知集成**: 22种作业事件通知

### 技术栈

- **调度器**: SLURM Workload Manager
- **数据库**: Supabase (PostgreSQL)
- **运行时**: Node.js + TypeScript
- **框架**: Next.js 14 App Router
- **后台服务**: PM2 进程管理

---

## 同步架构

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户交互层                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ 作业列表页面  │  │ 作业详情页面  │  │ 系统仪表盘   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ API 请求
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API 层                                   │
│                                                                  │
│  /api/jobs/smart-sync    ← 智能同步 (主要同步端点)               │
│  /api/jobs/sync          ← 传统同步 (向后兼容)                   │
│  /api/jobs/persistent    ← 持久化同步                            │
│  /api/jobs               ← 作业查询接口                          │
│                                                                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             │ 调用同步逻辑
             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     核心同步服务                                  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  智能同步引擎 (smart-sync/route.ts)                       │  │
│  │                                                           │  │
│  │  1. checkActiveJobs()       - 检查活跃作业                │  │
│  │  2. refreshJobStatus()      - 刷新作业状态                │  │
│  │  3. fixStaleRunningJobs()   - 修复过期作业 ⭐ NEW!       │  │
│  │  4. forceSyncJobs()         - 强制全量同步                │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  后台同步服务 (start-job-sync.js)                         │  │
│  │                                                           │  │
│  │  - 60秒轮询间隔                                           │  │
│  │  - 自动调用智能同步 API                                   │  │
│  │  - 通知系统集成                                           │  │
│  │                                                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├─────────────────┬─────────────────────┐
             ▼                 ▼                     ▼
┌───────────────────┐  ┌──────────────┐   ┌─────────────────┐
│   SLURM 集群       │  │  Supabase DB │   │  通知服务        │
│                   │  │              │   │                 │
│  squeue           │  │  jobs 表     │   │  22种通知类型    │
│  sacct            │  │  users 表    │   │  实时推送        │
│  scontrol         │  │  缓存层      │   │                 │
└───────────────────┘  └──────────────┘   └─────────────────┘
```

### 组件说明

#### 1. API 层 (3个端点)

| 端点 | 用途 | 状态 |
|------|------|------|
| `/api/jobs/smart-sync` | 主要同步端点，支持智能/强制/每日三种模式 | ✅ 推荐使用 |
| `/api/jobs/sync` | 传统同步端点，向后兼容 | ⚠️ 维护状态 |
| `/api/jobs/persistent` | 持久化同步，用于长期作业 | ⚠️ 特殊用途 |

#### 2. 核心同步引擎

**文件**: `app/api/jobs/smart-sync/route.ts` (27KB, 775行)

**核心函数**:
- `checkActiveJobs()` - 检查 squeue 中的活跃作业
- `refreshJobStatus()` - 增量同步活跃作业状态
- `fixStaleRunningJobs()` - **[NEW]** 检测并修复过期的 RUNNING/PENDING 作业
- `forceSyncJobs()` - 强制全量同步 (使用 sacct)
- `normalizeSlurmStatus()` - 标准化 SLURM 状态码

#### 3. 后台服务

**文件**: `scripts/cron/start-job-sync.js`

**功能**:
- 每60秒调用一次智能同步 API
- 集成通知系统，自动发送作业状态变化通知
- 错误重试机制
- PM2 进程管理

---

## 同步模式详解

### 模式 1: 智能同步 (默认)

**触发条件**:
- 后台服务定时调用 (60秒间隔)
- 用户刷新作业列表
- 作业状态变化事件

**工作流程**:

```
1. 检查活跃作业
   ↓
   squeue 命令 → 获取 RUNNING/PENDING 作业列表
   ↓
2. 增量更新
   ↓
   对比数据库现有记录 → 只更新变化的作业
   ↓
3. 过期作业检测 (每5分钟)
   ↓
   查询数据库 RUNNING/PENDING 作业
   ↓
   sacct 验证实际状态
   ↓
   修复不一致的状态
   ↓
4. 更新数据库 & 发送通知
```

**性能特点**:
- ⚡ 快速: 平均响应时间 100-200ms
- 💾 轻量: 只处理活跃作业，减少数据库查询
- 🔄 定期修复: 每5分钟自动检查过期作业

**适用场景**: 日常运行，大部分场景

### 模式 2: 强制同步

**触发条件**:
- 管理员手动触发
- 数据修复需要
- 定期全量同步 (可选的cron任务)

**工作流程**:

```
1. 全量查询
   ↓
   sacct -S <start_date> → 获取所有作业
   ↓
2. 批量处理
   ↓
   对比数据库所有记录
   ↓
   识别新作业、状态变化、时间更新
   ↓
3. 过期作业检测 (强制执行)
   ↓
   检查所有 RUNNING/PENDING 作业
   ↓
4. 批量更新 & 通知
```

**性能特点**:
- 🐢 较慢: 可能需要几秒到几十秒
- 📊 全面: 同步所有历史作业
- 🔧 修复: 包含过期作业检测

**适用场景**: 数据修复、定期维护、系统重启后

### 模式 3: 每日同步

**触发条件**:
- Cron 定时任务 (每日凌晨)
- 管理员手动触发

**工作流程**:

```
1. 查询当天作业
   ↓
   sacct -S today → 只获取今天提交的作业
   ↓
2. 批量更新当天记录
   ↓
3. 清理过期通知 (可选)
```

**性能特点**:
- ⚖️ 平衡: 比强制同步快，比智能同步全面
- 📅 定期: 确保每日数据准确性

**适用场景**: 定期维护任务

---

## API 接口

### 1. 智能同步 API

**端点**: `POST /api/jobs/smart-sync`

**参数**:

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `force` | boolean | false | 强制全量同步 |
| `fullSync` | boolean | false | 全量同步 (等同于 force) |
| `syncToday` | boolean | false | 只同步今天的作业 |
| `recentDays` | number | 7 | 强制同步时的天数范围 |

**请求示例**:

```bash
# 智能同步 (默认)
curl -X POST http://localhost:3000/api/jobs/smart-sync

# 强制全量同步
curl -X POST "http://localhost:3000/api/jobs/smart-sync?force=true&fullSync=true"

# 每日同步
curl -X POST "http://localhost:3000/api/jobs/smart-sync?syncToday=true"

# 强制同步最近30天
curl -X POST "http://localhost:3000/api/jobs/smart-sync?force=true&recentDays=30"
```

**响应示例**:

```json
{
  "success": true,
  "message": "智能同步完成",
  "stats": {
    "hasActiveJobs": false,
    "activeJobCount": 0,
    "updated": 5,
    "newJobs": 2,
    "changedJobs": 3,
    "totalJobs": 10,
    "staleJobsFixed": 1,      // ⭐ 新增: 修复的过期作业数
    "staleJobsChecked": 5,    // ⭐ 新增: 检查的RUNNING/PENDING作业数
    "responseTime": 234,
    "syncMode": "smart"
  }
}
```

### 2. 状态查询 API

**端点**: `GET /api/jobs/smart-sync`

**响应示例**:

```json
{
  "success": true,
  "stats": {
    "lastCheck": 1699350000000,
    "hasActiveJobs": true,
    "activeJobCount": 3
  }
}
```

### 3. 传统同步 API (向后兼容)

**端点**: `POST /api/jobs/sync`

**参数**: 同智能同步 API

---

## 数据流程

### 作业状态流转

```
                   ┌──────────────┐
                   │  用户提交作业 │
                   └───────┬──────┘
                           │
                           ▼
                   ┌──────────────┐
                   │   PENDING    │ ← 排队等待资源
                   └───────┬──────┘
                           │
                           ▼
                   ┌──────────────┐
                   │   RUNNING    │ ← 正在执行
                   └───────┬──────┘
                           │
                ┌──────────┴──────────┐
                │                     │
                ▼                     ▼
        ┌──────────────┐      ┌──────────────┐
        │  COMPLETED   │      │    FAILED    │
        └──────────────┘      └──────────────┘
                │                     │
                │                     │
                ▼                     ▼
        ┌──────────────┐      ┌──────────────┐
        │   CANCELLED  │      │   TIMEOUT    │
        └──────────────┘      └──────────────┘
```

### 同步时序图

```
Frontend          API Layer         Sync Engine         SLURM          Database
   │                  │                  │                 │                │
   │  刷新作业列表     │                  │                 │                │
   ├─────────────────>│                  │                 │                │
   │                  │  调用智能同步     │                 │                │
   │                  ├─────────────────>│                 │                │
   │                  │                  │  squeue 查询    │                │
   │                  │                  ├────────────────>│                │
   │                  │                  │<────────────────┤                │
   │                  │                  │  活跃作业列表    │                │
   │                  │                  │                 │  查询现有记录  │
   │                  │                  ├────────────────────────────────>│
   │                  │                  │<────────────────────────────────┤
   │                  │                  │                 │  数据库记录    │
   │                  │                  │                 │                │
   │                  │                  │  对比状态变化   │                │
   │                  │                  │                 │                │
   │                  │                  │  检查过期作业   │                │
   │                  │                  │  (每5分钟)      │                │
   │                  │                  ├────────────────────────────────>│
   │                  │                  │  查询RUNNING/   │                │
   │                  │                  │  PENDING作业    │                │
   │                  │                  │<────────────────────────────────┤
   │                  │                  │                 │                │
   │                  │                  │  sacct 验证     │                │
   │                  │                  ├────────────────>│                │
   │                  │                  │<────────────────┤                │
   │                  │                  │  实际状态       │                │
   │                  │                  │                 │                │
   │                  │                  │  批量更新       │                │
   │                  │                  ├────────────────────────────────>│
   │                  │                  │                 │                │
   │                  │<─────────────────┤                 │                │
   │                  │  同步结果        │                 │                │
   │<─────────────────┤                  │                 │                │
   │  更新UI          │                  │                 │                │
```

---

## 定时任务配置

### PM2 后台服务 (推荐)

**启动服务**:

```bash
# 使用 PM2 启动后台同步服务
pm2 start scripts/cron/start-job-sync.js --name job-sync

# 查看状态
pm2 status

# 查看日志
pm2 logs job-sync

# 重启服务
pm2 restart job-sync
```

**配置文件**: `ecosystem.config.js` (可选)

```javascript
module.exports = {
  apps: [{
    name: 'job-sync',
    script: './scripts/cron/start-job-sync.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      SYNC_INTERVAL: 60000  // 60秒
    }
  }]
}
```

### Cron 定时任务 (可选)

**每日全量同步**:

```bash
# 编辑 crontab
crontab -e

# 添加每日凌晨2点执行全量同步
0 2 * * * curl -X POST "http://localhost:3000/api/jobs/smart-sync?syncToday=true" > /tmp/daily-sync.log 2>&1
```

**每周强制同步**:

```bash
# 每周日凌晨3点执行强制全量同步
0 3 * * 0 curl -X POST "http://localhost:3000/api/jobs/smart-sync?force=true&recentDays=7" > /tmp/weekly-sync.log 2>&1
```

---

## 故障处理

### 常见问题及解决方案

#### 1. 作业状态不同步

**症状**: 数据库中的作业状态与 SLURM 实际状态不一致

**诊断**:

```bash
# 检查后台服务是否运行
pm2 status job-sync

# 查看同步日志
pm2 logs job-sync --lines 100

# 手动验证特定作业
sacct -j <JOB_ID> --format=JobID,State,Start,End
```

**解决方案**:

```bash
# 方案1: 重启后台服务
pm2 restart job-sync

# 方案2: 手动触发强制同步
curl -X POST "http://localhost:3000/api/jobs/smart-sync?force=true&fullSync=true"

# 方案3: 运行修复脚本
npx tsx scripts/tools/fix-stale-jobs.ts
```

#### 2. 过期作业未更新

**症状**: RUNNING/PENDING 状态的作业实际已完成

**原因**: 长时间运行的作业超出了智能同步的查询范围

**自动修复**:
- 智能同步模式每5分钟自动检测
- 强制同步模式每次都检测

**手动修复**:

```bash
# 运行专门的修复脚本
export SUPABASE_URL=http://your-supabase-url
export SUPABASE_SERVICE_ROLE_KEY=your-key
npx tsx scripts/tools/fix-stale-jobs.ts
```

#### 3. 同步性能慢

**症状**: 智能同步响应时间超过1秒

**诊断**:

```bash
# 检查活跃作业数量
squeue | wc -l

# 检查数据库连接
curl http://localhost:3000/api/health

# 查看同步统计
curl -X POST http://localhost:3000/api/jobs/smart-sync | jq '.stats'
```

**优化方案**:
1. 增加缓存时间 (jobCache)
2. 减少轮询频率 (从60秒改为120秒)
3. 使用数据库索引优化查询
4. 清理历史作业 (超过90天)

#### 4. 数据库连接失败

**症状**: 同步报错 "数据库连接失败"

**检查清单**:
- [ ] Supabase 服务是否运行
- [ ] 环境变量是否正确配置
- [ ] 网络连接是否正常
- [ ] 数据库用户权限是否足够

**解决方案**:

```bash
# 检查环境变量
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# 测试数据库连接
psql -h <host> -U <user> -d <database> -c "SELECT 1;"

# 重启 Supabase 服务
docker restart supabase-db
```

---

## 性能优化

### 优化策略

#### 1. 缓存优化

```typescript
// 作业缓存 (lib/job-cache.ts)
const jobCache = {
  data: new Map(),
  ttl: 60000,  // 1分钟
  clear() { this.data.clear() }
}

// 使用示例
if (jobCache.has(jobId) && !forceRefresh) {
  return jobCache.get(jobId)
}
```

#### 2. 同步锁机制

```typescript
// 防止并发同步
const syncLocks = new Map()

function acquireSyncLock(key: string): boolean {
  const lock = syncLocks.get(key)
  if (lock && lock.locked) {
    return false  // 已被锁定
  }
  syncLocks.set(key, { locked: true, lockTime: Date.now() })
  return true
}
```

#### 3. 批量处理

```typescript
// 批量更新作业
async function batchUpsertJobsToDb(jobs: any[]) {
  const BATCH_SIZE = 50
  for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
    const batch = jobs.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(job => upsertJobToDb(job)))
  }
}
```

#### 4. 索引优化

```sql
-- 数据库索引 (Supabase)
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_user_status ON jobs(user_id, status);
CREATE INDEX idx_jobs_submit_time ON jobs(submit_time DESC);
CREATE INDEX idx_jobs_running_pending ON jobs(status)
  WHERE status IN ('RUNNING', 'PENDING');
```

### 性能基准

| 场景 | 作业数 | 响应时间 | 说明 |
|------|--------|----------|------|
| 智能同步 (无变化) | 100 | 50-100ms | 最快，仅查询活跃作业 |
| 智能同步 (有变化) | 100 | 150-300ms | 更新少量变化的作业 |
| 强制同步 (7天) | 500 | 2-5秒 | 全量同步，包含过期检测 |
| 强制同步 (30天) | 2000 | 10-20秒 | 大量历史作业 |
| 过期作业检测 | 10 | 100-200ms | 仅检查 RUNNING/PENDING |

---

## 监控与维护

### 监控指标

#### 1. 同步健康度

```bash
# API 监控
curl -X POST http://localhost:3000/api/jobs/smart-sync | jq '{
  success: .success,
  responseTime: .stats.responseTime,
  updated: .stats.updated,
  staleJobsFixed: .stats.staleJobsFixed
}'
```

**关键指标**:
- `responseTime` < 500ms (智能同步)
- `staleJobsFixed` = 0 (理想情况)
- `updated` 与实际作业变化相符

#### 2. 后台服务监控

```bash
# PM2 监控
pm2 monit

# 日志监控
tail -f ~/.pm2/logs/job-sync-out.log | grep -E "ERROR|同步完成|修复"

# 进程状态
pm2 describe job-sync
```

#### 3. 数据库监控

```sql
-- 检查过期作业
SELECT COUNT(*) as stale_jobs
FROM jobs
WHERE status IN ('RUNNING', 'PENDING')
  AND submit_time < NOW() - INTERVAL '7 days';

-- 检查作业分布
SELECT status, COUNT(*) as count
FROM jobs
GROUP BY status
ORDER BY count DESC;

-- 检查最近同步时间
SELECT MAX(updated_at) as last_sync
FROM jobs
WHERE status IN ('RUNNING', 'PENDING');
```

### 维护任务

#### 每日维护

```bash
# 1. 检查后台服务状态
pm2 status job-sync

# 2. 检查是否有过期作业
curl -s -X POST http://localhost:3000/api/jobs/smart-sync | jq '.stats.staleJobsChecked'

# 3. 查看同步日志
pm2 logs job-sync --lines 50 | grep -E "修复|ERROR"
```

#### 每周维护

```bash
# 1. 强制全量同步
curl -X POST "http://localhost:3000/api/jobs/smart-sync?force=true&recentDays=7"

# 2. 清理90天前的历史作业
psql -d hpc_db -c "DELETE FROM jobs WHERE submit_time < NOW() - INTERVAL '90 days';"

# 3. 重建数据库索引
psql -d hpc_db -c "REINDEX TABLE jobs;"
```

#### 每月维护

```bash
# 1. 数据库备份
pg_dump hpc_db > /backup/hpc_db_$(date +%Y%m%d).sql

# 2. 清理日志文件
pm2 flush

# 3. 性能分析
curl -X POST http://localhost:3000/api/jobs/smart-sync | jq '.stats'
```

---

## 附录

### A. 相关文件清单

#### 核心文件

| 文件 | 用途 | 大小 |
|------|------|------|
| `app/api/jobs/smart-sync/route.ts` | 智能同步 API (主要) | 27KB |
| `app/api/jobs/sync/route.ts` | 传统同步 API | 11KB |
| `lib/job-db.ts` | 作业数据库操作 | 8KB |
| `lib/scheduler/slurm-adapter.ts` | SLURM 适配器 | 15KB |
| `scripts/cron/start-job-sync.js` | 后台同步服务 | 5KB |
| `scripts/tools/fix-stale-jobs.ts` | 过期作业修复工具 | 6KB |

#### 文档文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `docs/system/JOB-SYNC-MECHANISM.md` | ✅ 当前文档 | 完整技术文档 |
| `docs/system/JOB-SYNC-OPTIMIZATION.md` | ✅ 最新 | 优化记录 (2025-11-07) |
| `docs/features/jobs/smart-sync-quickstart.md` | ⚠️ 需更新 | 快速开始指南 |
| `docs/features/jobs/smart-sync-api.md` | ⚠️ 需更新 | API 文档 |
| `docs/features/jobs/smart-job-sync-system.md` | ❌ 过期 | 旧版本文档 |

### B. SLURM 命令参考

```bash
# 查询活跃作业
squeue -o "%i|%T|%u|%P|%N|%S|%M|%j|%V"

# 查询历史作业
sacct -S <start_date> -o "JobID,State,User,Partition,NodeList,Start,End,JobName,Submit"

# 查询特定作业
sacct -j <job_id> --format=JobID,State,Start,End -P -n

# 取消作业
scancel <job_id>

# 查看节点状态
sinfo -N -o "%N|%T|%C|%m|%e|%O"
```

### C. 故障排查清单

```
□ 后台服务运行正常 (pm2 status)
□ SLURM 服务正常 (sinfo 可用)
□ 数据库连接正常 (Supabase)
□ 环境变量配置正确
□ 网络连接正常
□ 磁盘空间充足
□ 日志无异常错误
□ 同步响应时间正常
□ 无过期作业累积
□ 通知系统正常
```

---

## 更新日志

### v3.0 (2025-11-07)

- ✅ 新增过期作业自动检测和修复机制
- ✅ 智能同步每5分钟自动检查 RUNNING/PENDING 状态
- ✅ 强制同步包含过期作业检测
- ✅ 新增 `fixStaleRunningJobs()` 核心函数
- ✅ 返回统计信息增加 `staleJobsFixed` 和 `staleJobsChecked`
- ✅ 创建独立的修复工具 `scripts/tools/fix-stale-jobs.ts`
- ✅ 优化日志输出，减少无用警告

### v2.0 (2024-08)

- 智能同步系统上线
- 支持三种同步模式
- 集成通知系统
- 性能优化和缓存机制

### v1.0 (2024-07)

- 基础同步功能
- SLURM 集成
- 数据库同步

---

**文档维护者**: HPC Platform Team
**最后更新**: 2025-11-07
**文档版本**: v3.0
