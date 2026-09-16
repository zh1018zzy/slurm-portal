# 作业同步触发机制详解

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 同步触发方式总览

### 1. 自动触发（前端）

#### 1.1 页面加载触发
- **触发时机**: 页面首次加载后5秒
- **触发条件**: 自动启动，无需用户操作
- **同步类型**: 智能同步（只同步活跃作业）
- **实现位置**: `hooks/use-smart-job-sync.ts`

```typescript
useEffect(() => {
  // 延迟启动自动同步，避免与页面初始同步冲突
  const timer = setTimeout(() => {
    startAutoSync()
  }, 5000) // 5秒后启动自动同步
  
  return () => {
    clearTimeout(timer)
    stopAutoSync()
  }
}, [startAutoSync, stopAutoSync])
```

#### 1.2 定时器触发
- **触发间隔**: 每2分钟检查一次
- **触发条件**: 检测到活跃作业时自动同步
- **同步类型**: 智能同步
- **实现位置**: `hooks/use-smart-job-sync.ts`

```typescript
intervalRef.current = setInterval(async () => {
  const state = await checkSyncState()
  if (state?.hasActiveJobs) {
    // 有活跃作业，执行同步
    await performSync()
  }
}, 120000) // 2分钟
```

#### 1.3 页面可见性触发
- **触发时机**: 页面从隐藏变为可见
- **触发条件**: 页面重新获得焦点
- **同步类型**: 智能同步
- **实现位置**: `hooks/use-smart-job-sync.ts`

```typescript
const handleVisibilityChange = () => {
  if (document.hidden) {
    // 页面隐藏时停止同步
    stopAutoSync()
  } else {
    // 页面显示时重新启动同步
    startAutoSync()
  }
}
```

### 2. 手动触发（用户操作）

#### 2.1 智能同步按钮
- **触发方式**: 用户点击"同步"按钮
- **同步类型**: 智能同步（只同步活跃作业）
- **API调用**: `POST /api/jobs/smart-sync`
- **参数**: 无参数或默认参数

#### 2.2 强制同步按钮
- **触发方式**: 用户点击"强制同步"按钮
- **同步类型**: 强制同步（同步最近N天所有作业）
- **API调用**: `POST /api/jobs/smart-sync`
- **参数**: `force=true&recentDays=7`

### 3. API自动触发

#### 3.1 作业列表API触发
- **触发时机**: 访问作业列表页面时
- **触发条件**: `autoRefresh=true` 参数
- **同步类型**: 智能同步
- **实现位置**: `app/api/jobs/route.ts`

```typescript
if (!skipRefresh && autoRefresh) {
  try {
    console.log('执行状态刷新...')
    
    const refreshResponse = await fetch(`${req.nextUrl.origin}/api/jobs/smart-sync`, {
      method: 'POST',
      body: new URLSearchParams()
    })
    
    if (refreshResponse.ok) {
      const refreshData = await refreshResponse.json()
      console.log('状态刷新完成:', refreshData.stats)
    }
  } catch (error) {
    console.error('状态刷新错误:', error)
  }
}
```

#### 3.2 单个作业详情触发
- **触发时机**: 访问单个作业详情页面时
- **触发条件**: 作业状态为RUNNING且超过1分钟未同步
- **同步类型**: 单个作业同步
- **实现位置**: `app/api/jobs/[id]/route.ts`

```typescript
async function smartSync(jobId: string, jobStatus: string) {
  const now = Date.now()
  const cacheKey = `${jobId}-${jobStatus}`
  const lastSync = syncCache.get(cacheKey)
  
  // 只在必要时同步：运行中的作业且超过1分钟未同步
  if (jobStatus === 'RUNNING' && (!lastSync || now - lastSync > SYNC_CACHE_DURATION)) {
    try {
      const job = await slurmAdapter.getJobStatus(jobId)
      if (job) {
        await upsertJobToDb(job)
        syncCache.set(cacheKey, now)
      }
    } catch (e) {
      console.error('[smartSync] 智能同步失败:', e)
    }
  }
}
```

### 4. 定时任务触发

#### 4.1 系统级定时任务
- **触发间隔**: 每5分钟执行一次
- **触发方式**: 系统级定时任务脚本
- **同步类型**: 完整同步
- **实现位置**: `scripts/job-sync-cron.js`

```javascript
// 设置定时任务
setInterval(syncJobs, SYNC_INTERVAL) // 5分钟

async function syncJobs() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/jobs/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const result = await response.json()
    if (result.success) {
      console.log(`[${new Date().toISOString()}] 同步成功:`, {
        totalJobs: result.totalJobs,
        syncedJobs: result.syncedJobs,
        newJobs: result.newJobs,
        changedJobs: result.changedJobs
      })
    }
  } catch (error) {
    console.error(`[${new Date().toISOString()}] 同步失败:`, error)
  }
}
```

## 同步触发优先级

### 优先级顺序（从高到低）

1. **用户手动触发** - 最高优先级
   - 强制同步按钮
   - 智能同步按钮

2. **页面加载触发** - 高优先级
   - 页面首次加载时的自动同步

3. **API自动触发** - 中优先级
   - 作业列表API的自动刷新
   - 单个作业详情的智能同步

4. **定时器触发** - 低优先级
   - 前端定时器（每2分钟）
   - 系统定时任务（每5分钟）

## 同步参数说明

### 智能同步参数
```typescript
// 默认参数（无参数）
POST /api/jobs/smart-sync
Body: ""

// 自定义参数
POST /api/jobs/smart-sync
Body: "force=true&recentDays=7"
```

### 参数详解
- `force=true`: 强制同步模式，同步最近N天的所有作业
- `fullSync=true`: 完整同步模式，同步最近N天的所有作业
- `recentDays=N`: 指定同步的天数范围（默认7天）

## 同步状态检查

### 活跃作业检查
```typescript
async function checkActiveJobs(): Promise<{ hasActive: boolean; activeJobCount: number }> {
  try {
    const { stdout } = await execFileAsync('squeue', [
      '-o', '%i|%T',
      '-h'
    ])
    
    const activeJobs = stdout.trim().split('\n').filter(Boolean)
    
    return {
      hasActive: activeJobs.length > 0,
      activeJobCount: activeJobs.length
    }
  } catch (error) {
    return { hasActive: false, activeJobCount: 0 }
  }
}
```

### 同步状态缓存
```typescript
// 同步状态管理
interface SyncState {
  lastCheck: number
  hasActiveJobs: boolean
  activeJobCount: number
}

const syncState: SyncState = {
  lastCheck: 0,
  hasActiveJobs: false,
  activeJobCount: 0
}
```

## 性能优化策略

### 1. 避免重复同步
- 使用缓存机制，避免短时间内重复同步
- 页面隐藏时停止同步，减少不必要的请求

### 2. 智能检测
- 只同步有活跃作业时的状态
- 使用轻量级的`squeue`命令快速检测

### 3. 批量操作
- 批量获取和更新作业状态
- 减少数据库操作次数

### 4. 条件同步
- 只在必要时执行同步
- 根据作业状态和时间间隔决定是否同步

## 监控和日志

### 同步日志
```typescript
console.log(`执行强制同步，同步最近${recentDays}天的所有作业...`)
console.log(`作业状态变化: ${jobId} ${dbJob.status} -> ${status}`)
console.log(`批量更新 ${jobsToUpdate.length} 个作业...`)
console.log(`强制同步完成: 更新 ${updated} 个作业, 耗时 ${endTime - startTime}ms`)
```

### 性能监控
```typescript
const totalTime = Date.now() - startTime
return NextResponse.json({
  success: true,
  stats: {
    responseTime: totalTime,
    updated: result.updated,
    changedJobs: result.changedJobs
  }
})
``` 
