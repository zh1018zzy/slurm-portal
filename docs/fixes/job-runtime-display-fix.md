# 作业运行时长显示异常修复

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

在作业列表页面（`/zh/dashboard/jobs`）中，作业运行时显示运行时长为 `8760h 0m`（365天），但查看作业详细信息页面时间显示正常。

## 问题根因

通过详细的调试日志发现真实原因：

**Slurm 的 `End` 字段返回的是作业的 TimeLimit（最大允许运行时间），而不是实际结束时间！**

对于 RUNNING 状态的作业：
- `startTime`: `2025-10-24T12:13:43` ✅ (正确的开始时间)
- `endTime`: `2026-10-24T12:13:43` ❌ (错误！这是 TimeLimit，是一年后)
- 计算结果: 8760小时 = 365天

这是 Slurm 的设计特性：对于运行中的作业，`sacct` 命令的 `End` 字段返回的是 `Submit + TimeLimit`，即作业最晚会在什么时候被杀死，而不是实际结束时间。

## 修复方案

### 核心修复：忽略 RUNNING 状态作业的 endTime

**关键改动**：对于 RUNNING 和 PENDING 状态的作业，强制使用当前时间作为结束时间，完全忽略 `endTime` 字段。

```typescript
// 修复前：错误地使用了 endTime（实际是 TimeLimit）
const end = job.endTime ? new Date(job.endTime) : new Date()

// 修复后：RUNNING 状态强制使用当前时间
const end = (job.status === 'RUNNING' || job.status === 'PENDING') 
  ? new Date()  // 运行中的作业使用当前时间
  : (job.endTime ? new Date(job.endTime) : new Date())  // 已完成的作业使用 endTime
```

### 其他改进

- **降低异常值阈值**：从5年降低到30天
  - 对于正常的HPC作业来说，30天已经是非常长的运行时间
  - 超过30天的运行时长将被视为异常数据，显示为 "-"

- **改进显示格式**：
  - 当运行时长超过24小时时，显示为 "天d 小时h 分钟m" 格式
  - 例如：`2d 5h 30m` 而不是 `53h 30m`
  - 提高可读性

### 2. 修改的文件

以下文件已更新：
1. `/opt/my-hpcapp/components/ui/virtual-table.tsx`
2. `/opt/my-hpcapp/app/[locale]/dashboard/jobs/page.tsx`
3. `/opt/my-hpcapp/services/frontend/components/ui/virtual-table.tsx`
4. `/opt/my-hpcapp/services/frontend/app/dashboard/jobs/page.tsx`

### 3. 核心代码变更

```typescript
// 计算运行时长
function getRunTime(job: JobInfo) {
  // PENDING 状态的作业还未开始运行，不显示运行时长
  if (job.status === 'PENDING') return '-'
  
  if (!job.startTime) return '-'
  
  const start = new Date(job.startTime)
  // 检查时间戳是否有效（2001年之后）
  if (isNaN(start.getTime()) || start.getTime() < 978307200000) return '-'
  
  // 🔧 关键修复：对于 RUNNING 状态的作业，强制使用当前时间，忽略 endTime
  // 因为 Slurm 的 End 字段可能返回的是 TimeLimit（最大允许运行时间），而不是实际结束时间
  const end = (job.status === 'RUNNING' || job.status === 'PENDING') 
    ? new Date() 
    : (job.endTime ? new Date(job.endTime) : new Date())
  
  if (isNaN(end.getTime()) || end.getTime() < start.getTime()) return '-'
  
  const diff = end.getTime() - start.getTime()
  
  // 过滤异常值：运行时长超过30天的视为无效
  if (diff < 0 || diff > 1000 * 60 * 60 * 24 * 30) return '-'
  
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  
  // 格式化输出：超过24小时显示天数
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h ${minutes}m`
  }
  
  return `${hours}h ${minutes}m`
}
```

## 使用说明

### 如何验证修复

访问作业列表页面 `/zh/dashboard/jobs`：
- ✅ RUNNING 状态的作业应该显示实际运行时长（如 `5m`, `2h 30m`, `1d 5h 20m`）
- ✅ 运行时长会随着页面刷新而实时更新
- ✅ 不再显示 `8760h 0m` 这种异常值

### 关于 Slurm End 字段的说明

对于运行中的作业，`sacct` 命令返回的 `End` 时间字段含义：

```bash
# 查看作业信息
sacct -j 220 -o JobID,Start,End,Elapsed,State

# 对于 RUNNING 状态的作业：
# - Start: 实际开始时间 ✅
# - End: Submit + TimeLimit (预计最晚结束时间) ⚠️
# - Elapsed: 实际已运行时长 ✅
```

**Slurm 设计说明**：
- `End` 字段对于运行中的作业不是实际结束时间
- 它表示的是作业允许运行的最长时间（基于 TimeLimit 参数）
- 只有当作业完成后，`End` 字段才是实际结束时间

**我们的解决方案**：
- RUNNING 状态：使用 `当前时间 - Start` 计算运行时长 ✅
- COMPLETED/FAILED 状态：使用 `End - Start` 计算运行时长 ✅

## 后续建议

1. **数据清理**：
   - 对数据库中的历史异常数据进行清理
   - 运行作业同步命令重新从Slurm获取正确的时间数据

2. **监控预警**：
   - 在后端添加时间数据验证逻辑
   - 当插入或更新作业数据时，检查时间字段的合理性
   - 对异常数据进行告警或自动修正

3. **时间格式标准化**：
   - 统一使用ISO 8601格式存储时间
   - 在API层进行时间格式转换和验证

## 修复日期

2025-10-24

## 修复人员

AI Assistant (Claude)

