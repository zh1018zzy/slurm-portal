# 作业历史显示问题修复

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🔧 问题描述

`/dashboard/jobs` 页面的作业列表只显示刚提交的一个作业，历史作业没有显示。

## 🔍 问题原因分析

### 1. 主要问题

在之前的简化过程中，`/api/jobs` 路由被过度简化，移除了数据库查询功能，只使用 `slurmAdapter.listJobs()` 来获取作业列表。

### 2. 根本原因

**Slurm 历史查询时间限制**：
```typescript
// 修改前：只查询最近2小时的数据
const oneHourAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 查询最近2小时的数据

// 修改后：查询最近30天的数据
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 查询最近30天的数据
```

**API 路由简化过度**：
- 移除了数据库查询逻辑
- 失去了分页、过滤、搜索等功能
- 无法获取完整的历史作业信息

## ✅ 解决方案

### 1. 修复 Slurm 查询时间范围

**文件：** `lib/scheduler/slurm-adapter.ts`

**修改内容：**
```typescript
// 修改前
const oneHourAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 查询最近2小时的数据

// 修改后
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // 查询最近30天的数据
```

### 2. 恢复数据库查询功能

**文件：** `app/api/jobs/route.ts`

**修改内容：**
- 重新添加数据库查询逻辑
- 支持分页、过滤、搜索功能
- 提供数据库查询失败时的回退机制

```typescript
// 优先从数据库查询，获取更完整的历史作业信息
const { createClient } = await import('@supabase/supabase-js')
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// 构建数据库查询
let dbQuery = supabase
  .from('jobs')
  .select('job_id,job_name,user_id,status,partition,submit_time,start_time,end_time,nodes,reason,script,stdout_path,stderr_path,params')
  .order('submit_time', { ascending: false })

// 应用过滤器和分页
// ... 详细的查询逻辑
```

## 🔧 主要修改

### 1. Slurm 适配器修改

**文件：** `lib/scheduler/slurm-adapter.ts`

- 将历史作业查询时间从2小时扩展到30天
- 更新相关注释和说明

### 2. API 路由修改

**文件：** `app/api/jobs/route.ts`

- 重新添加数据库查询功能
- 支持完整的过滤和分页功能
- 添加错误处理和回退机制
- 保持与前端页面的兼容性

### 3. 功能特性

- ✅ **分页支持**：支持页码和页面大小参数
- ✅ **状态过滤**：按作业状态过滤
- ✅ **分区过滤**：按分区过滤
- ✅ **日期过滤**：支持今天、本周、本月过滤
- ✅ **搜索功能**：支持作业名称和ID搜索
- ✅ **权限控制**：管理员可以查看所有用户作业
- ✅ **错误处理**：数据库查询失败时回退到Slurm查询

## 🚀 性能优化

### 1. 数据库查询优化

- 只选择必要的字段，减少数据传输
- 使用索引优化查询性能
- 支持分页，避免一次性加载大量数据

### 2. 回退机制

- 数据库查询失败时自动回退到Slurm查询
- 确保服务的可用性和稳定性

### 3. 缓存策略

- 前端页面保持原有的缓存机制
- 减少重复的数据库查询

## 📝 测试验证

### 1. 功能测试

```bash
# 测试作业列表查询
curl -X GET "http://localhost:3000/api/jobs?page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 测试过滤功能
curl -X GET "http://localhost:3000/api/jobs?status=COMPLETED&dateFilter=month" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 测试搜索功能
curl -X GET "http://localhost:3000/api/jobs?search=test" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. 预期结果

- ✅ 显示完整的历史作业列表（最近30天）
- ✅ 支持分页浏览
- ✅ 支持各种过滤和搜索功能
- ✅ 管理员可以查看所有用户作业
- ✅ 普通用户只能查看自己的作业

## 🔄 后续优化建议

1. **数据同步**：确保数据库中的作业数据与Slurm保持同步
2. **性能监控**：监控查询性能，优化慢查询
3. **缓存策略**：考虑添加Redis缓存来提升查询性能
4. **数据清理**：定期清理过期的历史作业数据

## ✅ 修复总结

通过以下修改解决了作业历史显示问题：

1. **扩展Slurm查询时间范围**：从2小时扩展到30天
2. **恢复数据库查询功能**：提供更完整和高效的作业查询
3. **保持功能完整性**：支持分页、过滤、搜索等所有功能
4. **确保稳定性**：添加错误处理和回退机制

现在 `/dashboard/jobs` 页面应该能够正常显示完整的历史作业列表了。 
