# 智能作业同步系统 - API文档

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

智能作业同步系统提供了一套高效的API接口，用于管理作业状态的智能更新。系统通过避免全量同步，大幅提升性能和准确性。

## 基础信息

- **基础URL**: `/api/jobs/smart-sync`
- **认证方式**: Bearer Token
- **内容类型**: `application/json`

## API端点

### 1. 获取同步状态

#### GET `/api/jobs/smart-sync`

获取当前智能同步系统的状态信息。

**请求参数**: 无

**响应示例**:
```json
{
  "success": true,
  "syncState": {
    "hasActiveJobs": true,
    "activeJobCount": 3,
    "lastCheck": 1703123456789,
    "activeJobIds": ["123", "124", "125"]
  },
  "lastUpdate": "2023-12-21T10:30:56.789Z"
}
```

**响应字段说明**:
- `success`: 请求是否成功
- `syncState.hasActiveJobs`: 是否有活跃作业
- `syncState.activeJobCount`: 活跃作业数量
- `syncState.lastCheck`: 最后检查时间戳
- `syncState.activeJobIds`: 活跃作业ID列表
- `lastUpdate`: 最后更新时间

### 2. 执行智能同步

#### POST `/api/jobs/smart-sync`

执行智能同步，只更新有变化的活跃作业。

**请求参数**:
- `force` (可选): 是否强制同步，默认 `false`

**请求示例**:
```bash
# 普通智能同步
curl -X POST /api/jobs/smart-sync

# 强制同步
curl -X POST "/api/jobs/smart-sync?force=true"
```

**响应示例**:
```json
{
  "success": true,
  "message": "智能同步完成",
  "stats": {
    "hasActiveJobs": true,
    "activeJobCount": 3,
    "updated": 2,
    "newJobs": 0,
    "changedJobs": 2,
    "responseTime": 150
  }
}
```

**响应字段说明**:
- `success`: 同步是否成功
- `message`: 同步结果消息
- `stats.hasActiveJobs`: 是否有活跃作业
- `stats.activeJobCount`: 活跃作业数量
- `stats.updated`: 更新的作业总数
- `stats.newJobs`: 新增作业数量
- `stats.changedJobs`: 状态变化的作业数量
- `stats.responseTime`: 响应时间（毫秒）

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述",
  "responseTime": 150
}
```

### 常见错误码

| 状态码 | 错误类型 | 描述 |
|--------|----------|------|
| 400 | Bad Request | 请求参数错误 |
| 401 | Unauthorized | 未授权访问 |
| 500 | Internal Server Error | 服务器内部错误 |

### 错误示例

#### Slurm命令不可用
```json
{
  "success": false,
  "error": "Slurm命令不可用: squeue command not found",
  "responseTime": 50
}
```

#### 数据库连接失败
```json
{
  "success": false,
  "error": "数据库连接失败",
  "responseTime": 2000
}
```

## 使用示例

### 1. 检查同步状态

```javascript
// 检查当前同步状态
const response = await fetch('/api/jobs/smart-sync')
const data = await response.json()

if (data.success) {
  console.log('活跃作业数量:', data.syncState.activeJobCount)
  console.log('最后检查时间:', new Date(data.syncState.lastCheck))
}
```

### 2. 执行智能同步

```javascript
// 执行智能同步
const response = await fetch('/api/jobs/smart-sync', {
  method: 'POST'
})
const data = await response.json()

if (data.success) {
  console.log('同步完成:', data.stats)
  console.log('更新了', data.stats.updated, '个作业')
}
```

### 3. 强制同步

```javascript
// 强制同步（全量）
const response = await fetch('/api/jobs/smart-sync?force=true', {
  method: 'POST'
})
const data = await response.json()

if (data.success) {
  console.log('强制同步完成:', data.stats)
}
```

### 4. 错误处理

```javascript
try {
  const response = await fetch('/api/jobs/smart-sync', {
    method: 'POST'
  })
  const data = await response.json()
  
  if (data.success) {
    console.log('同步成功:', data.stats)
  } else {
    console.error('同步失败:', data.error)
  }
} catch (error) {
  console.error('网络错误:', error)
}
```

## 性能指标

### 响应时间

- **状态检查**: 通常 < 100ms
- **智能同步**: 通常 < 500ms
- **强制同步**: 通常 < 2000ms

### 吞吐量

- **并发请求**: 支持多个并发请求
- **缓存命中**: 缓存命中率 > 80%
- **更新效率**: 只更新变化的作业

## 监控和调试

### 1. 日志记录

API会记录详细的日志信息：

```typescript
console.log(`智能同步完成: 新增 ${newJobs} 个作业，更新 ${changedJobs} 个作业状态`)
console.log(`智能状态更新耗时: ${endTime - startTime}ms`)
console.log(`活跃作业检查: ${hasActive ? '有' : '无'}活跃作业，共 ${activeJobIds.length} 个`)
```

### 2. 性能监控

可以通过响应时间监控API性能：

```javascript
const startTime = Date.now()
const response = await fetch('/api/jobs/smart-sync', { method: 'POST' })
const data = await response.json()
const responseTime = Date.now() - startTime

console.log(`API响应时间: ${responseTime}ms`)
```

### 3. 调试工具

#### 检查Slurm状态
```bash
# 检查活跃作业
squeue -o %i|%T -h

# 检查特定作业
squeue -j 123,124,125 -o %i|%T|%u|%P|%N|%S|%e|%j -h
```

#### 检查数据库状态
```sql
-- 检查活跃作业
SELECT job_id, status, user_id FROM jobs 
WHERE status IN ('PENDING', 'RUNNING') 
ORDER BY submit_time DESC;
```

## 最佳实践

### 1. 请求频率

- **状态检查**: 可以频繁调用（每10秒）
- **智能同步**: 建议每10-30秒调用一次
- **强制同步**: 仅在必要时调用

### 2. 错误处理

- 实现重试机制
- 优雅降级到缓存数据
- 提供用户友好的错误信息

### 3. 性能优化

- 使用缓存减少重复请求
- 批量处理多个作业
- 监控响应时间

## 相关文档

- [智能作业状态更新系统](../../archive/job-sync-legacy-2025/smart-job-sync-system.md) - 系统架构
- [快速使用指南](./smart-sync-quickstart.md) - 快速开始
- [作业管理系统概述](../../system/JOB-SYNC-MECHANISM.md) - 整体架构 
