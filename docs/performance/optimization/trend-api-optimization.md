# 作业趋势API性能优化

> 适用范围：性能优化、容量规划与调优实践
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 问题分析

### 原始问题
- 作业趋势API调用耗时13秒：`GET /api/jobs?stats=trend 200 in 12967ms`
- 每次调用都会执行 `slurmAdapter.listJobs()` 查询所有作业数据
- 在前端进行数据过滤，效率低下

### 性能瓶颈
1. **Slurm命令执行慢**：`sacct` 命令查询历史作业耗时较长
2. **数据传输量大**：查询所有作业数据，包括不必要的历史数据
3. **前端过滤开销**：在前端进行30天的数据过滤
4. **无缓存机制**：每次请求都重新查询

## 优化方案

### 1. 创建专门的趋势API
- **文件**：`app/api/jobs/trend/route.ts`
- **优势**：
  - 直接使用数据库查询，避免Slurm命令
  - 只查询30天内的数据，减少传输量
  - 添加5分钟缓存机制
  - 支持回退机制

### 2. 数据库索引优化
- **文件**：`db/optimize_trend_query.sql`
- **索引**：
  - `idx_jobs_submit_time_status`：提交时间和状态复合索引
  - `idx_jobs_end_time_status`：结束时间和状态复合索引
  - `idx_jobs_submit_time`：提交时间单列索引
  - `idx_jobs_end_time`：结束时间单列索引
  - `idx_jobs_user_submit_time`：用户和提交时间复合索引

### 3. 前端组件优化
- **文件**：`components/dashboard/TrendChart.tsx`
- **改进**：
  - 使用新的趋势API
  - 添加错误处理和回退机制
  - 保持向后兼容

### 4. 原API优化
- **文件**：`app/api/jobs/route.ts`
- **改进**：
  - 重定向到专门的趋势API
  - 添加多层备用方案
  - 保持向后兼容

## 性能提升

### 预期效果
- **响应时间**：从13秒降低到100-500ms
- **缓存命中**：5分钟内重复请求直接返回缓存
- **数据库查询**：通过索引优化，查询时间降低90%
- **数据传输**：只传输30天数据，减少80%传输量

### 监控指标
- API响应时间
- 缓存命中率
- 数据库查询时间
- 错误率

## 部署步骤

### 1. 应用数据库索引
```bash
# 连接到Supabase数据库
psql -h your-supabase-host -U postgres -d postgres -f scripts/apply-trend-optimization.sql
```

### 2. 部署新API
- 新API文件已创建：`app/api/jobs/trend/route.ts`
- 前端组件已更新：`components/dashboard/TrendChart.tsx`
- 原API已优化：`app/api/jobs/route.ts`

### 3. 验证效果
- 检查趋势图表加载时间
- 监控API响应时间
- 验证缓存机制

## 回退方案

如果新API出现问题，系统会自动回退：
1. 新趋势API失败 → 使用数据库查询
2. 数据库查询失败 → 使用原始Slurm查询
3. 确保系统始终可用

## 后续优化

### 可能的进一步优化
1. **预计算趋势数据**：定时任务预计算趋势数据
2. **Redis缓存**：使用Redis替代内存缓存
3. **数据分区**：按时间分区作业表
4. **CDN缓存**：静态趋势数据使用CDN缓存

### 监控和维护
1. 定期检查API性能
2. 监控缓存命中率
3. 优化数据库索引
4. 清理过期数据 
