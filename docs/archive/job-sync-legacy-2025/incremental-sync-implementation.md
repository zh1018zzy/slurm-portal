# 增量同步机制实现

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 概述

重新实现了作业同步机制，采用增量同步方式，每次同步都使用sacct查询结果而不加时间参数，确保所有作业状态都能正确同步。

## 核心设计

### 1. 增量同步策略

**同步逻辑：**
1. 使用 `sacct` 获取所有作业状态（不加时间参数）
2. 与数据库中的作业状态进行比较
3. 只更新有变化的作业（状态变化或时间变化）
4. 新作业自动创建，状态变化自动更新

**优势：**
- 确保所有作业状态都能同步
- 只更新有变化的作业，提高效率
- 不依赖时间参数，避免遗漏

### 2. 状态映射

**完整的Slurm状态映射：**
```typescript
const statusMap = {
  'R': 'RUNNING',        // 运行中
  'PD': 'PENDING',       // 等待中
  'CG': 'COMPLETING',    // 完成中
  'CD': 'COMPLETED',     // 已完成
  'F': 'FAILED',         // 失败
  'CA': 'CANCELLED',     // 已取消
  'TO': 'TIMEOUT',       // 超时
  'NF': 'NODE_FAIL',     // 节点失败
  'PR': 'PREEMPTED',     // 被抢占
  'S': 'SUSPENDED',      // 暂停
  'ST': 'STOPPED',       // 停止
  'OOM': 'OUT_OF_MEMORY' // 内存不足
}
```

### 3. 数据结构

**Slurm作业信息：**
```typescript
interface SlurmJob {
  jobId: string
  status: string
  user: string
  partition: string
  nodes: string
  startTime: string
  endTime: string
  jobName: string
  submitTime: string
}
```

**更新数据：**
```typescript
interface UpdateData {
  jobId: string
  jobName: string
  user: string
  status: string
  partition: string
  submitTime: Date | null
  startTime: Date | null
  endTime: Date | null
  nodes: string[]
  reason: string
  extra: {
    scriptPath: string
    stdoutPath: string
    stderrPath: string
    vncDisplay?: number
    vncPort?: number
    [key: string]: any
  }
  vncDisplay?: number
  vncPort?: number
}
```

## 实现细节

### 1. 智能同步API (`/api/jobs/smart-sync`)

**主要功能：**
- `getAllJobsStatus()`: 获取所有作业状态
- `normalizeSlurmStatus()`: 标准化状态映射
- `incrementalSync()`: 执行增量同步
- `checkActiveJobs()`: 检查活跃作业

**同步流程：**
```typescript
async function incrementalSync() {
  // 1. 获取Slurm中的所有作业状态
  const slurmJobs = await getAllJobsStatus()
  
  // 2. 获取数据库中这些作业的当前状态
  const dbJobs = await getDbJobs(slurmJobs.map(j => j.jobId))
  
  // 3. 比较状态，构建需要更新的作业列表
  const jobsToUpdate = []
  
  for (const slurmJob of slurmJobs) {
    const dbJob = dbJobs.get(slurmJob.jobId)
    
    if (!dbJob) {
      // 新作业
      jobsToUpdate.push(createNewJob(slurmJob))
    } else if (hasChanges(slurmJob, dbJob)) {
      // 状态变化
      jobsToUpdate.push(updateExistingJob(slurmJob, dbJob))
    }
  }
  
  // 4. 批量更新数据库
  await batchUpsertJobsToDb(jobsToUpdate)
}
```

### 2. 作业列表API (`/api/jobs`)

**简化逻辑：**
- 页面加载时自动执行增量同步
- 支持跳过同步参数
- 同步完成后返回最新数据

**参数控制：**
- `skipSync=true`: 跳过同步
- `autoSync=false`: 禁用自动同步

### 3. 前端同步

**简化UI：**
- 只保留一个"增量同步"按钮
- 显示同步进度和结果
- 自动刷新数据

**同步Hook：**
- 延迟5秒启动自动同步
- 每2分钟检查一次
- 页面可见性变化时启停

## 使用方式

### 1. 页面自动同步

**页面加载时：**
- 自动执行增量同步
- 显示同步进度
- 同步完成后刷新数据

### 2. 手动同步

**点击同步按钮：**
- 立即执行增量同步
- 显示详细同步结果
- 自动刷新作业列表

### 3. API调用

**直接调用API：**
```bash
curl -X POST "http://localhost:3000/api/jobs/smart-sync" \
     -H "Content-Type: application/x-www-form-urlencoded"
```

## 性能优化

### 1. 增量更新

- 只更新有变化的作业
- 减少数据库写入操作
- 提高同步效率

### 2. 批量操作

- 批量查询数据库
- 批量更新作业状态
- 减少网络请求

### 3. 缓存策略

- 同步后清除相关缓存
- 避免数据不一致
- 确保数据准确性

## 监控和调试

### 1. 控制台日志

**同步过程日志：**
```
获取Slurm作业状态...
Slurm中发现 25 个作业
发现新作业: 12345 (test-job)
作业状态变化: 12346 RUNNING -> COMPLETED
批量更新 3 个作业...
增量同步完成: 更新 3 个作业 (新作业: 1, 状态变化: 2), 耗时 1500ms
```

### 2. 同步统计

**返回统计信息：**
```json
{
  "success": true,
  "stats": {
    "hasActiveJobs": true,
    "activeJobCount": 3,
    "updated": 5,
    "newJobs": 2,
    "changedJobs": 3,
    "totalJobs": 25,
    "responseTime": 1500
  }
}
```

### 3. 错误处理

**错误类型：**
- Slurm命令执行失败
- 数据库查询失败
- 网络连接问题

**处理方式：**
- 记录详细错误日志
- 返回友好错误信息
- 降级到数据库数据

## 优势特点

1. **完整性**：同步所有作业，不遗漏
2. **效率性**：只更新有变化的作业
3. **准确性**：完整的状态映射
4. **可靠性**：错误处理和降级机制
5. **实时性**：自动同步和手动同步
6. **简洁性**：统一的同步接口

## 测试验证

### 1. 功能测试

- 新作业自动创建
- 状态变化正确更新
- VNC信息正确保留
- 历史作业状态同步

### 2. 性能测试

- 大量作业同步性能
- 网络延迟处理
- 并发同步处理

### 3. 错误测试

- Slurm服务不可用
- 数据库连接失败
- 网络连接问题 
