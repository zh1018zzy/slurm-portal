# Dashboard页面作业状态数据准确性修复

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

用户报告`/dashboard`页面的作业状态数据不准确，显示的数据可能与实际作业状态不符。

## 问题原因分析

### 1. 数据源问题
- **作业统计API** (`/api/jobs/stats`) 只从数据库查询
- 数据库中的作业状态可能不是最新的，存在延迟
- 缺少与Slurm实时状态的同步

### 2. 更新频率问题
- 轮询间隔过长（30秒），导致数据更新不及时
- 防抖时间过长（3秒），影响数据刷新频率

### 3. 数据不一致
- 活跃作业API (`/api/jobs/active`) 有实时状态更新
- 但dashboard页面没有使用这个更准确的数据源

## 修复方案

### 1. 使用实时活跃作业数据

**修复前：**
```typescript
// 只使用数据库统计
const statsResponse = await authFetch(`/api/jobs/stats?cache=true`)
const statsData = await statsResponse.json()
const stats = statsData.success ? statsData.stats : defaultStats
```

**修复后：**
```typescript
// 并行获取实时活跃作业和数据库统计
const [activeResponse, statsResponse] = await Promise.all([
  authFetch(`/api/jobs/active?clear_cache=${forceRefresh}`),
  authFetch(`/api/jobs/stats?cache=true${forceRefresh ? '&refresh=true' : ''}`)
])

// 使用活跃作业数据计算实时统计
const activeJobs = activeData.success ? (activeData.jobs || []) : []
const realtimeStats = {
  pending: activeJobs.filter(job => job.status === 'PENDING').length,
  running: activeJobs.filter(job => job.status === 'RUNNING').length,
}

// 结合数据库统计和实时活跃作业数据
const stats = {
  total: dbStats.total,
  pending: realtimeStats.pending, // 使用实时数据
  running: realtimeStats.running, // 使用实时数据
  completed: dbStats.completed,
  failed: dbStats.failed,
  cancelled: dbStats.cancelled,
}
```

### 2. 优化更新频率

**轮询间隔优化：**
```typescript
// 修复前
}, 30000) // 30秒

// 修复后
}, 15000) // 15秒，提高数据准确性
```

**防抖时间优化：**
```typescript
// 修复前
const FETCH_COOLDOWN = 3000 // 3秒

// 修复后
const FETCH_COOLDOWN = 2000 // 2秒，提高数据更新频率
```

## 修复效果

### ✅ 数据准确性提升
- **实时状态** - 使用活跃作业API获取最新状态
- **数据一致性** - 结合数据库统计和实时数据
- **状态同步** - 与Slurm状态保持同步

### ✅ 更新频率优化
- **更频繁更新** - 轮询间隔从30秒减少到15秒
- **更快响应** - 防抖时间从3秒减少到2秒
- **及时刷新** - 作业状态变更更快反映到界面

### ✅ 用户体验改善
- **数据可信** - 用户看到的数据更准确
- **实时反馈** - 作业状态变更及时显示
- **操作指导** - 基于准确数据做出正确决策

## 技术实现

### 数据源优先级
1. **活跃作业API** - 用于PENDING和RUNNING状态（最高优先级）
2. **数据库统计** - 用于历史数据（COMPLETED、FAILED、CANCELLED）
3. **缓存机制** - 减少API调用，提高性能

### 并行请求优化
- 同时请求活跃作业和统计数据
- 减少总体加载时间
- 提高数据一致性

### 缓存策略
- 活跃作业数据缓存时间较短
- 统计数据缓存时间适中
- 支持强制刷新机制

## 验证方法

1. **提交新作业** - 检查dashboard是否立即显示
2. **作业状态变更** - 验证状态更新是否及时
3. **多用户测试** - 确认数据隔离正确
4. **性能监控** - 确保更新频率不影响性能

## 后续优化建议

1. **SSE集成** - 考虑将dashboard也集成到SSE实时更新系统
2. **智能缓存** - 根据数据变化频率动态调整缓存时间
3. **数据验证** - 添加数据一致性检查机制 
