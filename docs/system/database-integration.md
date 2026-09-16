# 数据库集成文档

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

本系统已将图形作业信息从内存存储迁移到 Supabase 数据库持久化存储，解决了服务重启后作业信息丢失的问题。

## 数据库表结构

### view_jobs 表

```sql
CREATE TABLE view_jobs (
  job_id      TEXT PRIMARY KEY,         -- Slurm作业ID
  user_id     TEXT NOT NULL,            -- 用户名
  app_name    TEXT NOT NULL,            -- 应用名
  app_command TEXT NOT NULL,            -- 启动命令
  node        TEXT,                     -- 分配节点
  port        INTEGER NOT NULL,         -- 端口
  display     INTEGER NOT NULL,         -- DISPLAY号
  status      TEXT NOT NULL,            -- pending/running/completed/failed
  submit_time TIMESTAMPTZ NOT NULL,     -- 提交时间
  start_time  TIMESTAMPTZ,              -- 启动时间
  end_time    TIMESTAMPTZ               -- 结束时间
);
```

## 设置步骤

### 1. 创建数据库表

在 Supabase 控制台或使用 SQL 客户端执行：

```sql
-- 运行 db/view_jobs.sql 中的完整建表脚本
```

### 2. 验证环境变量

确保 `.env` 文件中包含正确的 Supabase 配置：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# 或者使用
SUPABASE_KEY=your_anon_key
```

### 3. 测试数据库连接

运行测试脚本验证配置：

```bash
node test-db-connection.js
```

预期输出：
```
🔍 测试 Supabase 数据库连接...
1. 测试基本连接...
✅ 数据库连接成功
2. 测试 view_jobs 表结构...
✅ view_jobs 表存在且可访问
3. 测试数据操作...
✅ 插入测试数据成功
✅ 查询测试数据成功
✅ 删除测试数据成功
4. 统计现有数据...
✅ 当前 view_jobs 表中有 0 条记录
🎉 所有测试通过！数据库连接和表结构正常
```

## 代码变更说明

### 后端 API 变更

**文件：** `app/api/applications/route.ts`

主要变更：
- 引入 Supabase 客户端
- 将内存 `Map` 存储替换为数据库操作
- 字段名从驼峰命名改为下划线命名
- 添加数据库错误处理

### 前端页面变更

**文件：** `app/dashboard/applications/page.tsx`

主要变更：
- 更新 `JobInfo` 接口字段名
- 调整所有字段引用为下划线格式
- 保持用户界面和功能不变

## 功能特性

### 持久化存储
- ✅ 作业信息持久化到数据库
- ✅ 服务重启后作业信息不丢失
- ✅ 支持多实例部署

### 状态同步
- ✅ 实时同步 Slurm 作业状态
- ✅ 自动更新节点信息和时间戳
- ✅ 支持作业状态历史记录

### 数据查询
- ✅ 按用户查询作业列表
- ✅ 按作业ID查询详细信息
- ✅ 支持分页和排序

### 错误处理
- ✅ 数据库连接错误处理
- ✅ 事务回滚机制
- ✅ 优雅降级策略

## 性能优化

### 索引优化
```sql
CREATE INDEX idx_view_jobs_user_id ON view_jobs(user_id);
CREATE INDEX idx_view_jobs_status ON view_jobs(status);
CREATE INDEX idx_view_jobs_submit_time ON view_jobs(submit_time);
```

### 查询优化
- 只查询活跃作业（running/pending）进行端口分配
- 使用单次查询获取用户作业列表
- 批量更新作业状态

## 故障排除

### 常见问题

1. **数据库连接失败**
   ```
   错误：Database connection failed
   解决：检查 SUPABASE_URL 和 SUPABASE_KEY 配置
   ```

2. **表不存在**
   ```
   错误：relation "view_jobs" does not exist
   解决：运行 db/view_jobs.sql 创建表
   ```

3. **权限错误**
   ```
   错误：permission denied for table view_jobs
   解决：检查 RLS 策略或使用 service_role_key
   ```

### 调试命令

```bash
# 测试数据库连接
node test-db-connection.js

# 查看表结构
psql -h your_host -U your_user -d your_db -c "\d view_jobs"

# 查看数据
psql -h your_host -U your_user -d your_db -c "SELECT * FROM view_jobs LIMIT 5;"
```

## 迁移指南

### 从内存存储迁移

如果之前有内存中的作业数据，可以手动迁移：

```sql
-- 示例：手动插入历史作业数据
INSERT INTO view_jobs (
  job_id, user_id, app_name, app_command, 
  node, port, display, status, submit_time
) VALUES (
  '123456', 'username', 'firefox', 'firefox',
  'node01', 14500, 101, 'completed', '2024-01-01T10:00:00Z'
);
```

### 数据清理

定期清理已完成或失败的作业：

```sql
-- 清理7天前的已完成作业
DELETE FROM view_jobs 
WHERE status IN ('completed', 'failed') 
AND submit_time < NOW() - INTERVAL '7 days';
```

## 监控和维护

### 监控指标
- 作业提交成功率
- 数据库查询响应时间
- 表大小和记录数量

### 维护任务
- 定期清理过期数据
- 监控索引性能
- 备份重要数据

## 总结

数据库集成完成后，图形作业系统具备了：
- 🔄 持久化存储能力
- 📊 完整的状态管理
- 🚀 更好的可扩展性
- 🛡️ 更强的数据安全性

系统现在可以稳定运行，支持生产环境部署。 
