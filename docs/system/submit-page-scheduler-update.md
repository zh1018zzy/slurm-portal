# 提交页面调度器更新

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 更新概述

将 `/dashboard/submit` 页面的调度器支持从多调度器（Slurm + OpenPBS）简化为仅支持 Slurm。

## 🔧 主要修改

### 1. 移除调度器类型选择

**修改前：**
```typescript
const SCHEDULER_OPTIONS = [
  { value: 'slurm', label: 'Slurm' },
  { value: 'pbs', label: 'OpenPBS' },
]
```

**修改后：**
- 完全移除了 `SCHEDULER_OPTIONS` 常量
- 移除了调度器类型选择器组件
- 表单状态中移除了 `schedulerType` 字段

### 2. 简化分区获取逻辑

**修改前：**
```typescript
useEffect(() => {
  if (form.schedulerType === 'slurm') {
    fetch('/api/jobs/partitions')
    // ... 获取分区信息
  } else {
    setPartitions([])
    setPartitionResources({})
  }
}, [form.schedulerType])
```

**修改后：**
```typescript
useEffect(() => {
  // 只支持 Slurm，直接获取分区信息
  fetch('/api/jobs/partitions')
  // ... 获取分区信息
}, [])
```

### 3. 简化脚本生成逻辑

**修改前：**
```typescript
function generateScript() {
  if (form.schedulerType === 'slurm') {
    // Slurm 脚本生成逻辑
  } else if (form.schedulerType === 'pbs') {
    // PBS 脚本生成逻辑
  }
  return form.bodyScript
}
```

**修改后：**
```typescript
function generateScript() {
  // 只支持 Slurm，处理分区名称，去掉末尾的 * 字符
  const cleanPartition = form.partition ? form.partition.replace(/\*$/, '') : ''
  
  return [
    '#!/bin/bash',
    form.jobName && `#SBATCH -J ${form.jobName}`,
    // ... 其他 Slurm 参数
  ].filter(Boolean).join('\n')
}
```

### 4. 简化分区选择组件

**修改前：**
```typescript
{form.schedulerType === 'slurm' ? (
  <Select>...</Select>
) : (
  <Input />
)}
```

**修改后：**
```typescript
<Select>...</Select>
```

### 5. 更新参数提示

**修改前：**
```typescript
partition: 'Slurm为分区（partition），PBS为队列（queue）。系统会自动处理分区名称中的*字符'
```

**修改后：**
```typescript
partition: 'Slurm分区（partition）。系统会自动处理分区名称中的*字符'
```

### 6. 简化验证逻辑

**修改前：**
```typescript
if (!form.partition) {
  err.partition = form.schedulerType === 'slurm' ? '请选择有效的分区' : '队列名称不能为空'
}
```

**修改后：**
```typescript
if (!form.partition) {
  err.partition = '请选择有效的分区'
}
```

### 7. 更新文件上传处理

**修改前：**
```typescript
const bodyLines = lines.filter(line => 
  !line.startsWith('#SBATCH') && 
  !line.startsWith('#PBS') && 
  !line.startsWith('#!/bin/bash') &&
  line.trim()
)
```

**修改后：**
```typescript
const bodyLines = lines.filter(line => 
  !line.startsWith('#SBATCH') && 
  !line.startsWith('#!/bin/bash') &&
  line.trim()
)
```

## ✅ 优势

1. **简化代码**：移除了大量条件判断和重复逻辑
2. **提高性能**：减少了不必要的状态管理和重新渲染
3. **降低维护成本**：只需要维护 Slurm 相关的代码
4. **用户体验**：界面更简洁，减少了用户的选择负担

## 🔄 调度器类型获取逻辑

### 修改前
- 通过 `SCHEDULER_OPTIONS` 常量定义可用的调度器类型
- 用户可以在界面上选择调度器类型
- 根据选择的调度器类型动态加载分区信息
- 根据调度器类型生成不同的脚本格式

### 修改后
- 固定使用 Slurm 调度器
- 直接加载 Slurm 分区信息
- 只生成 Slurm 格式的脚本
- 简化了所有相关的逻辑判断

## 📝 注意事项

1. **向后兼容性**：如果用户之前保存了包含 `schedulerType` 的历史记录，需要处理兼容性问题
2. **API 兼容性**：后端 API 仍然需要支持 Slurm 相关的功能
3. **错误处理**：所有错误提示都已更新为 Slurm 相关的描述

## 🚀 后续优化建议

1. **移除相关依赖**：如果不再需要 OpenPBS 相关的代码，可以考虑清理相关的适配器和类型定义
2. **更新文档**：更新用户文档，说明系统只支持 Slurm
3. **测试验证**：确保所有 Slurm 相关功能正常工作 
