# Slurm作业同步到数据库机制详解

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 概述

系统通过多层同步机制将Slurm作业状态同步到Supabase数据库，确保前端显示的数据与Slurm实际状态保持一致。

## 同步架构

### 1. 数据流向
```
Slurm (squeue/sacct) → SlurmAdapter → 同步API → Supabase数据库 → 前端显示
```

### 2. 核心组件

#### SlurmAdapter (`lib/scheduler/slurm-adapter.ts`)
- **功能**: 封装Slurm命令调用，提供统一的作业管理接口
- **主要方法**:
  - `listJobs()`: 查询当前和历史作业
  - `getJobStatus()`: 获取单个作业详细状态
  - `listActiveJobs()`: 查询活跃作业

#### 同步API (`app/api/jobs/sync/route.ts`)
- **功能**: 执行增量同步，只更新有变化的作业
- **优化**: 智能状态对比，避免不必要的数据库操作

#### 智能同步API (`app/api/jobs/smart-sync/route.ts`)
- **功能**: 更轻量的增量同步，专注于状态更新
- **特点**: 只同步活跃作业，减少系统负载

#### 数据库操作 (`lib/job-db.ts`)
- **功能**: 批量upsert作业到数据库
- **优化**: 保留现有数据，只更新变化字段

## 同步机制详解

### 1. 数据获取阶段

#### Slurm命令调用
```typescript
// 查询当前作业
const { stdout } = await execFileAsync('squeue', [
  '-o', '%i|%j|%u|%T|%P|%V|%S|%e', '-h'
])

// 查询历史作业
const { stdout } = await execFileAsync('sacct', [
  '-o', 'JobID,JobName,User,State,Partition,Submit,Start,End',
  '--starttime', `${startDate}T${startTime}`
])
```

#### 状态映射
```typescript
const slurmStatusMap = {
  PD: 'PENDING',
  R: 'RUNNING', 
  CG: 'COMPLETED',
  CD: 'COMPLETED',
  F: 'FAILED',
  CA: 'CANCELLED',
  // ... 更多状态映射
}
```

### 2. 增量同步逻辑

#### 状态对比
```typescript
// 智能状态对比：只有真正的状态变化才触发同步
const statusChanged = slurmJob.status !== dbJob.status

// 时间对比：标准化时间格式
const normalizeTime = (time: any) => {
  if (!time || time === 'Unknown' || time === 'N/A') return null
  const date = new Date(time)
  return date.toISOString().slice(0, 19) + 'Z'
}

const timeChanged = slurmStartTime !== dbStartTime || slurmEndTime !== dbEndTime
```

#### 特殊处理
```typescript
// VNC作业特殊处理
const isVncJob = dbJob.job_type === 'graphics' || (dbJob.params && dbJob.params.vncDisplay)
const needVncUpdate = isVncJob && slurmJob.status === 'RUNNING' && 
  (!dbJob.params?.vncDisplay || !dbJob.params?.vncPort)

// 节点信息补全
const needNodeUpdate = (
  slurmJob.status === 'RUNNING' &&
  (!dbJob.nodes || dbJob.nodes === '' || dbJob.nodes === null)
)
```

### 3. 数据库更新

#### 批量Upsert
```typescript
export async function batchUpsertJobsToDb(jobs: any[]) {
  const rows = jobs.map(job => ({
    job_id: job.jobId,
    user_id: job.user,
    job_name: job.jobName,
    status: job.status,
    // ... 其他字段
    updated_at: job.status !== dbMap[job.jobId]?.status ? 
      new Date().toISOString() : dbMap[job.jobId]?.updated_at
  }))
  
  await supabase.from('jobs').upsert(rows, { onConflict: 'job_id' })
}
```

## 同步触发机制

### 1. 手动同步
- **API调用**: `POST /api/jobs/sync`
- **参数**: `user`, `force`
- **用途**: 管理员手动触发全量同步

### 2. 智能同步
- **API调用**: `POST /api/jobs/smart-sync`
- **特点**: 只同步活跃作业，更轻量
- **用途**: 定期自动同步

### 3. 前端自动同步
- **Hook**: `useSmartJobSync`
- **触发条件**:
  - 页面加载后5秒
  - 页面可见性变化
  - 有活跃作业时每2分钟
- **优化**: 页面隐藏时停止同步

### 4. 作业状态检查
- **API调用**: `GET /api/jobs/[id]`
- **智能同步**: 运行中作业且超过1分钟未同步时自动同步
- **缓存**: 1分钟内不重复同步

## 同步优化策略

### 1. 增量同步
- **原理**: 只同步状态发生变化的作业
- **优势**: 减少数据库负载，提高同步效率
- **实现**: 对比Slurm状态与数据库状态

### 2. 缓存机制
- **API缓存**: 使用`cache=true`参数
- **强制刷新**: 使用`refresh=true`参数
- **缓存时间**: 根据数据重要性设置不同缓存时间

### 3. 批量操作
- **批量查询**: 一次性查询多个作业状态
- **批量更新**: 使用upsert批量更新数据库
- **减少API调用**: 合并多个操作

### 4. 错误处理
- **重试机制**: 同步失败时自动重试
- **降级策略**: sacct失败时使用scontrol备选方案
- **日志记录**: 详细记录同步过程和错误

## 数据一致性保证

### 1. 状态映射
- **统一状态**: 将Slurm状态映射为系统标准状态
- **状态验证**: 验证状态转换的合理性
- **未知状态处理**: 对未知状态进行特殊处理

### 2. 时间同步
- **时间标准化**: 统一时间格式，避免时区问题
- **精度控制**: 只比较到秒级，忽略毫秒差异
- **无效时间处理**: 过滤无效的时间值

### 3. 数据完整性
- **VNC信息保护**: 同步时保留VNC相关信息
- **节点信息补全**: 运行中作业自动补全节点信息
- **参数合并**: 合并Slurm数据与数据库现有参数

## 性能优化

### 1. 查询优化
- **索引使用**: 数据库字段建立适当索引
- **查询限制**: 限制查询范围和数量
- **并行查询**: 同时查询当前和历史作业

### 2. 同步频率控制
- **防抖机制**: 避免频繁同步
- **智能间隔**: 根据活跃作业数量调整同步频率
- **页面可见性**: 页面隐藏时降低同步频率

### 3. 资源管理
- **连接池**: 复用数据库连接
- **内存管理**: 及时清理临时数据
- **进程管理**: 避免长时间运行的同步进程

## 监控和调试

### 1. 日志记录
```typescript
console.log(`作业 ${slurmJob.jobId} 状态变化: ${dbJob.status} -> ${slurmJob.status}`)
console.log(`同步完成: 新增 ${newJobs.length} 个作业，更新 ${changedJobs.length} 个作业状态`)
```

### 2. 性能指标
- **同步时间**: 记录每次同步的耗时
- **更新数量**: 统计新增和更新的作业数量
- **错误率**: 监控同步失败的情况

### 3. 调试工具
- **API测试**: 提供同步API的测试接口
- **状态检查**: 检查Slurm与数据库状态差异
- **手动同步**: 支持手动触发同步操作

## 故障处理

### 1. 常见问题
- **Slurm命令不可用**: 检查Slurm安装和权限
- **数据库连接失败**: 检查数据库连接配置
- **状态不一致**: 手动触发全量同步

### 2. 恢复策略
- **自动重试**: 同步失败时自动重试
- **降级服务**: 使用缓存数据提供服务
- **手动修复**: 提供手动同步工具

### 3. 预防措施
- **定期检查**: 定期检查同步状态
- **监控告警**: 设置同步失败告警
- **备份策略**: 定期备份重要数据 
