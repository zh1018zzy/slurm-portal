# Dashboard/Jobs/History 页面作业状态同步问题分析

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述
测试 `dashboard/jobs/history` 页面时，发现作业状态存在不同步的情况。

## 当前同步机制分析

### 1. History 页面的数据获取流程

```
用户访问 /dashboard/jobs/history
    ↓
useEffect 触发数据获取
    ↓
调用 /api/jobs?history=true&dateRange=...
    ↓
直接查询数据库（Supabase）
    ↓
返回数据库中的历史作业数据
```

**关键代码位置**：
- 前端：`app/dashboard/jobs/history/page.tsx` (第124-214行)
- 后端：`app/api/jobs/route.ts` (第20-457行)

### 2. 状态同步机制

系统提供了两种同步方式：

#### 2.1 智能同步（Smart Sync）
- **触发方式**：通过 `autoRefresh` 参数控制
- **实现位置**：`app/api/jobs/smart-sync/route.ts`
- **工作原理**：
  - 使用 `sacct` 命令获取 Slurm 中的作业状态
  - 与数据库中的状态进行比较
  - 只更新有变化的作业

#### 2.2 强制同步（Force Sync）
- **触发方式**：用户手动点击"强制同步"按钮
- **工作原理**：
  - 同步指定时间范围（默认7天）内的所有作业
  - 使用 `sacct -S startDate -E endDate` 命令

## 核心问题分析

### 问题 1：History 页面默认不自动刷新状态

**代码证据**：
```typescript:app/api/jobs/route.ts
// 第213行
const autoRefresh = searchParams.get('autoRefresh') === 'true' // 默认禁用自动刷新，提升性能
```

**前端调用**：
```typescript:app/dashboard/jobs/history/page.tsx
// 第161行 - 没有传递 autoRefresh=true 参数
const res = await fetch(`/api/jobs?${params}`, {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  },
  signal: abortController.signal
})
```

**影响**：
- 用户访问 history 页面时，只能看到数据库中已存储的旧状态
- 除非手动点击"强制同步"，否则状态不会更新

### 问题 2：sacct 命令的时间范围限制

**代码证据**：
```typescript:app/api/jobs/smart-sync/route.ts
// 第49-61行 - getAllJobsStatus() 函数
// 使用sacct获取所有作业状态，不加时间参数
const { stdout } = await execFileAsync('sacct', [
  '-o', 'JobID,State,User,Partition,NodeList,Start,End,JobName,Submit',
  '-P',
  '-n',
  '--format=JobID,State,User,Partition,NodeList,Start,End,JobName,Submit'
])
```

**问题分析**：
- `sacct` 命令**没有指定时间范围参数** (`-S` 和 `-E`)
- Slurm 的 `sacct` 默认行为因配置而异，通常只返回**当天**或**最近几天**的作业
- 这导致历史作业（超过默认时间范围的）的状态变更无法被检测到

### 问题 3：强制同步的时间范围不匹配

**代码证据**：
```typescript:app/dashboard/jobs/history/page.tsx
// 第76-83行 - 强制同步只同步最近7天
const response = await fetch('/api/jobs/smart-sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: 'force=true&recentDays=7'  // 固定为7天
})
```

**问题分析**：
- 用户可以选择查询 7天/30天/90天/全部历史
- 但强制同步**固定只同步最近7天**的作业
- 当用户查询30天或90天的历史时，部分作业状态无法被同步

### 问题 4：状态标准化不一致

**代码证据**：
```typescript:app/api/jobs/smart-sync/route.ts
// 第111-128行 - normalizeSlurmStatus 函数
function normalizeSlurmStatus(status: string): string {
  const statusMap: Record<string, string> = {
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
    'OOM': 'OUT_OF_MEMORY'
  }
  
  return statusMap[status] || status  // 如果不在映射表中，直接返回原始状态
}
```

**问题分析**：
- Slurm 返回的状态可能是缩写（如 'CD'）或全名（如 'COMPLETED'）
- 如果 sacct 返回的是全名而非缩写，`statusMap[status]` 会返回 undefined
- 导致 `normalizeSlurmStatus('COMPLETED')` 返回 'COMPLETED'，但数据库中可能是其他格式

## 状态不同步的具体场景

### 场景 1：历史作业状态已在 Slurm 中更新，但页面未显示
1. 用户提交了一个作业（状态：PENDING）
2. 作业在 Slurm 中完成（状态变为：COMPLETED）
3. 用户访问 history 页面
4. **问题**：页面显示的仍是 PENDING 状态，因为：
   - 没有触发自动刷新（autoRefresh=false）
   - 查询的是数据库旧数据

### 场景 2：用户点击"强制同步"，但仍有作业状态未更新
1. 用户查询最近30天的历史作业
2. 点击"强制同步"按钮
3. **问题**：只同步了最近7天的作业，8-30天的作业状态未更新

### 场景 3：sacct 命令默认时间窗口外的作业
1. Slurm 的 `sacct` 默认配置可能只返回当天的作业
2. 智能同步调用 `getAllJobsStatus()` 时
3. **问题**：无法获取到超出默认时间窗口的作业状态

## 解决方案建议

### 方案 1：为 History 页面添加自动刷新（推荐）

**修改内容**：
1. 在查询参数中添加 `autoRefresh=true`
2. 根据用户选择的时间范围，动态设置同步范围

**优点**：
- 用户打开页面时自动获取最新状态
- 与用户选择的时间范围一致

**缺点**：
- 初次加载时间可能较长（需要先同步再查询）

### 方案 2：优化 getAllJobsStatus() 添加时间范围参数

**修改内容**：
1. 为 `getAllJobsStatus()` 函数添加时间范围参数
2. 根据查询需求动态调整 sacct 的 `-S` 和 `-E` 参数

**优点**：
- 更精确地控制同步范围
- 提高同步效率

### 方案 3：强制同步时根据页面选择的时间范围动态调整

**修改内容**：
1. 将当前页面选择的 `dateRange` 传递给强制同步接口
2. 强制同步根据 `dateRange` 动态计算 `recentDays`

**优点**：
- 确保同步范围与查询范围一致
- 用户体验更好

### 方案 4：增强状态标准化逻辑

**修改内容**：
1. 改进 `normalizeSlurmStatus()` 函数，处理全名格式
2. 统一所有地方的状态标准化逻辑

**示例代码**：
```typescript
function normalizeSlurmStatus(status: string): string {
  // 先转换为大写并去除空格
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
    // 全名格式（确保兼容）
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
    'OUT_OF_MEMORY': 'OUT_OF_MEMORY'
  }
  
  return statusMap[cleanStatus] || cleanStatus
}
```

## 推荐实施方案

建议采用**组合方案**：

1. **立即修复**（方案3 + 方案4）：
   - 修复强制同步的时间范围问题
   - 增强状态标准化逻辑
   
2. **优化改进**（方案2）：
   - 优化 `getAllJobsStatus()` 函数，添加时间范围参数
   
3. **可选增强**（方案1）：
   - 根据实际性能表现，考虑是否启用自动刷新
   - 可以添加配置选项，让用户选择是否自动刷新

## 实施优先级

1. **P0 - 紧急**：
   - 修复强制同步的时间范围不匹配问题（方案3）
   - 增强状态标准化逻辑（方案4）

2. **P1 - 高优先级**：
   - 为 `getAllJobsStatus()` 添加时间范围参数（方案2）

3. **P2 - 中优先级**：
   - 评估是否需要自动刷新机制（方案1）

## 测试建议

修复后需要测试以下场景：

1. 查询不同时间范围（7天/30天/90天/全部）的历史作业
2. 手动点击"强制同步"，验证所有可见作业的状态都被更新
3. 验证状态标准化逻辑对各种 Slurm 状态格式都正确处理
4. 测试超出 sacct 默认时间窗口的作业是否能正确同步

## 监控指标

建议添加以下监控：

1. 同步操作的响应时间
2. 每次同步更新的作业数量
3. 同步失败的频率和原因
4. sacct 命令的执行时间

---

**分析日期**：2025-10-09  
**分析人员**：AI Assistant  
**严重程度**：中高（影响用户体验，可能导致错误的作业状态信息）

