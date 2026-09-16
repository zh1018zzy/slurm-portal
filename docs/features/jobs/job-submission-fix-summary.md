# 作业提交问题修复总结

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

在 `/dashboard/submit` 页面提交作业时，出现以下错误：

```
同步作业到数据库失败: {
  code: '22001',
  details: null,
  hint: null,
  message: 'value too long for type character varying(64)'
}
```

## 问题分析

通过分析错误日志和代码，发现问题的根本原因是：

1. **字段映射错误**: `slurmAdapter.submitJob()` 返回的是一个完整的 `JobInfo` 对象，但代码中错误地将其作为 `jobId` 传递给 `upsertJobToDb` 函数。

2. **缺少必要字段**: 数据库表中有 `job_type` 字段，但代码中没有设置这个字段。

3. **数据结构不匹配**: 代码期望的字段结构与实际返回的数据结构不一致。

## 修复内容

### 1. 修复字段映射问题

**文件**: `app/api/jobs/route.ts`

**修改前**:
```typescript
const jobId = await slurmAdapter.submitJob(jobData)
// ...
const job = {
  jobId: jobId, // 错误：jobId 是一个对象，不是字符串
  // ...
}
```

**修改后**:
```typescript
const jobResult = await slurmAdapter.submitJob(jobData)
// ...
const job = {
  jobId: jobResult.jobId, // 正确：使用 jobResult.jobId 字段
  // ...
}
```

### 2. 添加缺失字段

**文件**: `lib/job-db.ts`

**修改前**:
```typescript
const { error } = await supabase.from('jobs').upsert({
  // ... 其他字段
  // 缺少 job_type 字段
}, { onConflict: 'job_id' })
```

**修改后**:
```typescript
const { error } = await supabase.from('jobs').upsert({
  // ... 其他字段
  job_type: job.jobType || 'compute', // 添加 job_type 字段
}, { onConflict: 'job_id' })
```

### 3. 完善数据结构

**文件**: `app/api/jobs/route.ts`

**修改前**:
```typescript
extra: body
```

**修改后**:
```typescript
extra: {
  ...body,
  scriptPath: jobResult.extra?.scriptPath,
  stdoutPath: jobResult.extra?.stdoutPath,
  stderrPath: jobResult.extra?.stderrPath
}
```

## 修复后的数据流

1. **作业提交**: 用户通过 `/dashboard/submit` 页面提交作业
2. **Slurm处理**: `slurmAdapter.submitJob()` 处理作业并返回完整的 `JobInfo` 对象
3. **数据映射**: 正确提取 `jobId` 和其他必要字段
4. **数据库同步**: 使用正确的字段映射调用 `upsertJobToDb` 函数
5. **成功响应**: 返回作业提交成功信息

## 验证结果

通过测试脚本验证，修复后的代码：

- ✅ 所有字段长度都在数据库限制范围内
- ✅ 字段映射正确
- ✅ 数据结构完整
- ✅ 包含所有必要字段

## 注意事项

1. **字段长度限制**: 确保所有字符串字段不超过数据库定义的长度限制
2. **数据类型**: 确保传递给数据库的数据类型正确
3. **错误处理**: 保持现有的错误处理和日志记录机制
4. **向后兼容**: 修复不影响现有功能

## 相关文件

- `app/api/jobs/route.ts` - 作业提交API
- `lib/job-db.ts` - 数据库操作函数
- `lib/scheduler/slurm-adapter.ts` - Slurm调度器适配器
- `types/global.d.ts` - 类型定义

## 测试建议

1. 在 `/dashboard/submit` 页面提交不同类型的作业
2. 验证作业是否正确保存到数据库
3. 检查作业状态同步是否正常
4. 测试VNC图形作业的特殊处理

修复完成后，作业提交功能应该能够正常工作，不再出现字段长度超限的错误。 
