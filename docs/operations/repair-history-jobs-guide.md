# 历史作业状态修复指南

> 适用范围：线上运行维护、故障排查、部署与运维操作
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 问题背景

定时任务已部署，但历史数据可能存在以下问题：
- 部署前的作业状态未同步
- 之前同步失败的作业
- 状态格式不一致的作业

## 修复方案对比

| 方案 | 适用场景 | 优点 | 缺点 | 推荐度 |
|------|---------|------|------|--------|
| **方案1: 直接API调用** | 数据量较小（< 1万） | 简单快速 | 可能超时 | ⭐⭐⭐ |
| **方案2: 分批修复脚本** | 数据量较大（> 1万） | 稳定可靠 | 需要时间 | ⭐⭐⭐⭐⭐ |
| **方案3: 数据库直接修复** | 特殊情况 | 最快 | 风险较高 | ⭐⭐ |

## 方案1: 直接 API 调用（推荐，快速简单）

### 适用场景
- 作业数量 < 10,000
- 需要快速修复
- 对性能影响不敏感

### 操作步骤

#### 1. 修复最近30天
```bash
curl -X POST http://localhost:3000/api/jobs/smart-sync \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "force=true&recentDays=30"
```

#### 2. 修复最近90天
```bash
curl -X POST http://localhost:3000/api/jobs/smart-sync \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "force=true&recentDays=90"
```

#### 3. 查看结果
```bash
# 输出示例：
{
  "success": true,
  "message": "强制同步完成",
  "stats": {
    "updated": 150,
    "newJobs": 20,
    "changedJobs": 45,
    "totalJobs": 1200,
    "responseTime": 15234
  }
}
```

### 预期时间
- 30天（~1000作业）：约 30 秒
- 90天（~3000作业）：约 1-2 分钟

---

## 方案2: 分批修复脚本（推荐，稳定可靠）

### 适用场景
- 作业数量 > 10,000
- 需要稳定可靠的修复
- 可以分批执行

### 使用修复脚本

#### 1. 查看帮助
```bash
/opt/my-hpcapp/scripts/repair-history-jobs.sh --help
```

#### 2. 测试模式（先测试）
```bash
# 测试修复最近7天（不实际修改）
/opt/my-hpcapp/scripts/repair-history-jobs.sh -d 7 -t
```

#### 3. 修复最近30天
```bash
/opt/my-hpcapp/scripts/repair-history-jobs.sh -d 30
```

#### 4. 分批修复最近90天（推荐）
```bash
# 每批7天，自动休息，性能最优
/opt/my-hpcapp/scripts/repair-history-jobs.sh -d 90 --batch
```

#### 5. 查看进度
```bash
# 实时查看日志
tail -f /var/log/hpcapp/repair-history.log
```

### 脚本特性
- ✅ 分批执行，避免超时
- ✅ 自动休息，避免过载
- ✅ 详细日志，便于追踪
- ✅ 错误处理，失败重试
- ✅ 进度显示，实时反馈

### 示例输出
```
======================================
历史作业状态修复工具
======================================

配置信息:
  - API 地址: http://localhost:3000
  - 修复范围: 最近 90 天
  - 分批模式: true
  - 测试模式: false

确认开始修复？(y/N) y

开始分批修复（每批 7 天）...

=== 批次 1 ====
范围: 第 0-7 天
🟡 正在同步最近 7 天的作业...
✅ 同步成功
  - 总作业数: 856
  - 更新数: 45
  - 新增数: 3
  - 状态变化: 28
批次 1 完成

等待 2 秒...

=== 批次 2 ====
范围: 第 7-14 天
🟡 正在同步最近 7 天的作业...
...

=========================================
✅ 分批修复完成
  - 成功批次: 13
  - 失败批次: 0
=========================================

耗时: 156 秒
日志: /var/log/hpcapp/repair-history.log
```

---

## 方案3: 数据库直接修复（不推荐，仅特殊情况）

### 适用场景
- Slurm 命令无法执行
- 需要批量修改特定状态
- 有数据库操作经验

### 操作示例

**注意**：直接操作数据库有风险，请先备份！

```sql
-- 1. 备份数据
CREATE TABLE jobs_backup_20251009 AS SELECT * FROM jobs;

-- 2. 查看状态分布
SELECT status, COUNT(*) as count 
FROM jobs 
GROUP BY status 
ORDER BY count DESC;

-- 3. 修复特定状态（示例：将 'R' 改为 'RUNNING'）
UPDATE jobs 
SET status = 'RUNNING' 
WHERE status = 'R';

-- 4. 验证修复
SELECT status, COUNT(*) as count 
FROM jobs 
GROUP BY status 
ORDER BY count DESC;
```

---

## 完整修复流程（推荐）

### 第一步：评估数据量

```bash
# 查看数据库中的作业总数
curl "http://localhost:3000/api/jobs?history=true&dateRange=all" \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.total'
```

### 第二步：选择方案

- **< 1万作业**：直接 API 调用（方案1）
- **1-10万作业**：分批修复脚本（方案2）
- **> 10万作业**：分批修复 + 数据库优化

### 第三步：执行修复

#### 小数据量（< 1万）
```bash
# 一次性修复90天
curl -X POST http://localhost:3000/api/jobs/smart-sync \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "force=true&recentDays=90"
```

#### 中等数据量（1-10万）
```bash
# 分批修复90天
/opt/my-hpcapp/scripts/repair-history-jobs.sh -d 90 --batch
```

#### 大数据量（> 10万）
```bash
# 分阶段修复
# 第一阶段：最近30天
/opt/my-hpcapp/scripts/repair-history-jobs.sh -d 30 --batch

# 等待5分钟...

# 第二阶段：31-60天
/opt/my-hpcapp/scripts/repair-history-jobs.sh -d 30 --batch

# 第三阶段：61-90天
/opt/my-hpcapp/scripts/repair-history-jobs.sh -d 30 --batch
```

### 第四步：验证修复

```bash
# 1. 查看同步统计
curl http://localhost:3000/api/jobs/smart-sync

# 2. 在页面上验证
# 打开 http://localhost:3000/dashboard/jobs/history
# 检查最近的作业状态是否正确

# 3. 查看日志
tail -100 /var/log/hpcapp/repair-history.log
```

---

## 性能优化建议

### 1. 选择合适的时间窗口

根据实际需求选择：
- **7天**：覆盖大部分活跃作业
- **30天**：覆盖近期所有作业
- **90天**：季度数据完整性
- **更长**：根据业务需求

### 2. 避免高峰期执行

建议在以下时间执行：
- ✅ 晚上 22:00 - 凌晨 2:00
- ✅ 周末
- ❌ 工作时间（9:00-18:00）

### 3. 监控系统负载

```bash
# 执行前检查
top
free -h
df -h

# 如果资源紧张，考虑分批执行
```

### 4. 数据库优化

```sql
-- 添加索引（如果还没有）
CREATE INDEX idx_jobs_submit_time ON jobs(submit_time);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);

-- 分析表
ANALYZE jobs;
```

---

## 常见问题

### Q1: 修复需要多长时间？

| 作业数量 | 预期时间 | 建议方案 |
|---------|---------|---------|
| < 1,000 | 30秒 | 直接API |
| 1,000 - 10,000 | 2-5分钟 | 直接API或分批 |
| 10,000 - 50,000 | 10-30分钟 | 分批修复 |
| > 50,000 | 1-2小时 | 分批+分阶段 |

### Q2: 修复会影响正在运行的作业吗？

不会。修复只读取 Slurm 状态并更新数据库，不影响作业执行。

### Q3: 修复失败怎么办？

1. 查看错误日志
```bash
tail -100 /var/log/hpcapp/repair-history.log
```

2. 检查常见问题：
   - Slurm 命令是否可用：`sacct --version`
   - 数据库连接是否正常
   - API 服务是否正常

3. 重试或使用分批模式

### Q4: 可以重复执行修复吗？

可以！修复是幂等操作，重复执行不会有副作用。

### Q5: 修复后数据还是不对怎么办？

1. 检查 Slurm 数据源是否正确
```bash
sacct -o JobID,State,User,Partition,NodeList,Start,End,JobName,Submit -P -n | head -10
```

2. 检查状态映射是否完整（查看 `normalizeSlurmStatus` 函数）

3. 手动检查特定作业
```bash
# 查看 Slurm 状态
sacct -j <JOB_ID> -o JobID,State,Start,End

# 查看数据库状态
curl "http://localhost:3000/api/jobs/<JOB_ID>" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 监控和日志

### 查看修复日志
```bash
# 实时监控
tail -f /var/log/hpcapp/repair-history.log

# 查看最近100行
tail -100 /var/log/hpcapp/repair-history.log

# 搜索错误
grep -i error /var/log/hpcapp/repair-history.log
```

### 监控修复进度
```bash
# 查看正在运行的修复任务
ps aux | grep repair-history-jobs.sh

# 查看 API 请求日志
pm2 logs hpc-management-platform | grep smart-sync
```

---

## 最佳实践

### 1. 定期验证
建议每月验证一次历史数据完整性：
```bash
# 每月1号执行
0 2 1 * * /opt/my-hpcapp/scripts/repair-history-jobs.sh -d 30 --batch
```

### 2. 备份数据
修复前备份数据库：
```bash
# Supabase 备份（如果使用 Supabase）
# 在 Supabase Dashboard 中执行

# PostgreSQL 备份
pg_dump -U postgres -d hpcapp > backup_$(date +%Y%m%d).sql
```

### 3. 记录操作
在运维日志中记录：
- 修复时间
- 修复范围
- 修复结果
- 遇到的问题

---

## 快速参考

### 常用命令速查

```bash
# 快速修复最近30天
curl -X POST http://localhost:3000/api/jobs/smart-sync \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "force=true&recentDays=30"

# 分批修复90天
/opt/my-hpcapp/scripts/repair-history-jobs.sh -d 90 --batch

# 查看日志
tail -f /var/log/hpcapp/repair-history.log

# 验证结果
curl "http://localhost:3000/api/jobs?history=true&dateRange=7days" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**文档版本**: 1.0  
**最后更新**: 2025-10-09  
**相关文档**: 
- [定时任务部署指南](../archive/job-sync-legacy-2025/job-sync-cron-setup.md)
- [同步策略说明](../archive/job-sync-legacy-2025/job-status-sync-strategy.md)

