# 作业日志无限循环修复

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

点击作业日志按钮时出现错误：
```
Unhandled Runtime Error
Error: Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops.
```

## 问题原因

### 1. **useEffect 依赖项问题** 🔄
```typescript
// 问题代码
useEffect(() => {
  // 日志轮询逻辑
}, [showLogsDialog, selectedJobLogs?.jobId, selectedJobLogs?.status])
```

**问题分析：**
- `selectedJobLogs?.status` 作为依赖项会导致每次状态更新时重新创建轮询
- 当作业状态发生变化时，useEffect 会重新执行
- 新的轮询会更新 `jobLogs` 状态
- 状态更新可能触发其他 useEffect，形成无限循环

### 2. **状态重置不完整** 🧹
```typescript
// 问题代码
<Dialog open={showLogsDialog} onOpenChange={setShowLogsDialog}>
```

**问题分析：**
- 弹窗关闭时只设置了 `showLogsDialog` 状态
- 没有重置其他相关状态（`selectedJobLogs`, `jobLogs`, `logLoading`, `logError`）
- 可能导致状态残留，影响下次打开

## 修复方案

### 1. **简化状态管理** ✅

```typescript
// 最终修复代码
useEffect(() => {
  if (!showLogsDialog || !selectedJobLogs) return
  
  let timer: NodeJS.Timeout
  let stopped = false
  let currentLogs = { stdout: '', stderr: '' }
  
  async function fetchLogs() {
    if (stopped) return
    
    try {
      const res = await fetch(`/api/jobs/${selectedJobLogs.jobId}/logs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      const data = await res.json()
      
      if (stopped) return
      
      if (data.success) {
        // 只在内容变化时更新状态
        if (data.logs.stdout !== currentLogs.stdout || data.logs.stderr !== currentLogs.stderr) {
          currentLogs = data.logs
          setJobLogs(data.logs)
        }
        setLogLoading(false)
        setLogError('')
      } else {
        setLogError('日志尚未生成')
        setLogLoading(false)
      }
    } catch {
      if (stopped) return
      setLogError('日志获取失败')
      setLogLoading(false)
    }
    
    // 只有作业在运行或等待中才继续轮询
    if (!stopped && (selectedJobLogs.status === 'RUNNING' || selectedJobLogs.status === 'PENDING')) {
      timer = setTimeout(fetchLogs, 2000)
    }
  }
  
  // 初始加载
  setLogLoading(true)
  setLogError('')
  setJobLogs({ stdout: '', stderr: '' })
  currentLogs = { stdout: '', stderr: '' }
  fetchLogs()
  
  return () => {
    stopped = true
    if (timer) clearTimeout(timer)
  }
}, [showLogsDialog, selectedJobLogs?.jobId])
```

**关键修改：**
- ✅ 使用局部变量 `currentLogs` 避免状态依赖
- ✅ 移除所有可能导致循环的状态引用
- ✅ 简化依赖项，只保留必要的标识符
- ✅ 在初始加载时重置所有状态

### 2. **完善状态重置** ✅

```typescript
// 修复后代码
<Dialog open={showLogsDialog} onOpenChange={(open) => {
  if (!open) {
    setShowLogsDialog(false)
    setSelectedJobLogs(null)
    setJobLogs({ stdout: '', stderr: '' })
    setLogLoading(false)
    setLogError('')
  }
}}>
```

**关键修改：**
- ✅ 弹窗关闭时重置所有相关状态
- ✅ 确保下次打开时状态干净
- ✅ 避免状态残留影响

## 技术原理

### 1. **React useEffect 依赖项机制**
- useEffect 的依赖项数组决定了何时重新执行
- 当依赖项发生变化时，会清理旧的 effect 并执行新的 effect
- 如果依赖项包含会变化的状态，可能导致无限循环

### 2. **状态更新循环**
```
状态变化 → useEffect 重新执行 → 更新状态 → 状态变化 → ...
```

### 3. **解决方案**
- **移除不稳定依赖**：不将可能频繁变化的状态作为依赖项
- **局部状态管理**：在 effect 内部使用局部变量管理状态
- **简化依赖项**：只依赖稳定的标识符
- **完整状态重置**：确保状态清理完整

## 最佳实践

### 1. **useEffect 依赖项设计**
```typescript
// ✅ 好的做法：只依赖稳定的标识符
useEffect(() => {
  // 逻辑
}, [id, isOpen])

// ❌ 避免：依赖可能变化的状态
useEffect(() => {
  // 逻辑
}, [id, status, data])
```

### 2. **状态重置模式**
```typescript
// ✅ 好的做法：完整的状态重置
const handleClose = () => {
  setDialogOpen(false)
  setSelectedItem(null)
  setData({})
  setLoading(false)
  setError('')
}

// ❌ 避免：部分状态重置
const handleClose = () => {
  setDialogOpen(false)
  // 其他状态可能残留
}
```

### 3. **轮询逻辑优化**
```typescript
// ✅ 好的做法：在函数内部判断条件
useEffect(() => {
  const poll = () => {
    if (shouldContinue) {
      // 执行逻辑
      setTimeout(poll, interval)
    }
  }
  poll()
}, [id]) // 只依赖稳定的 id

// ❌ 避免：依赖可能变化的条件
useEffect(() => {
  const poll = () => {
    // 执行逻辑
    setTimeout(poll, interval)
  }
  poll()
}, [id, shouldContinue]) // shouldContinue 可能频繁变化
```

## 测试验证

### 1. **功能测试**
- ✅ 点击日志按钮正常打开弹窗
- ✅ 日志内容正确显示
- ✅ 实时轮询正常工作
- ✅ 弹窗关闭后状态正确重置

### 2. **性能测试**
- ✅ 无无限循环错误
- ✅ 内存使用正常
- ✅ 轮询频率合理（2秒间隔）

### 3. **边界测试**
- ✅ 快速打开关闭弹窗
- ✅ 作业状态变化时日志正常
- ✅ 网络错误时错误处理正常

## 总结

通过这次修复：
- ✅ **解决了无限循环问题**
- ✅ **优化了状态管理**
- ✅ **提升了用户体验**
- ✅ **增强了代码稳定性**

现在作业日志功能可以正常工作，不会出现无限循环错误。 
