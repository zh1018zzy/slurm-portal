# 智能作业同步系统 - 部署指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

本文档介绍如何部署和配置智能作业同步系统，包括数据库更新、API配置和前端集成。

## 前置要求

### 1. 系统要求
- Node.js 18+ 
- PostgreSQL 12+
- Slurm 调度器
- Next.js 应用环境

### 2. 依赖检查
```bash
# 检查 Slurm 命令
which squeue
which sacct

# 检查数据库连接
node scripts/test-db-connection.js
```

## 数据库更新

### 1. 添加 job_type 字段

智能同步系统需要 `job_type` 字段来区分普通计算作业和图形作业。

#### 执行SQL脚本
```bash
# 方法1: 使用 psql 命令行
psql -d your_database -f db/add_job_type_field.sql

# 方法2: 使用 Supabase CLI
supabase db push

# 方法3: 在 Supabase Dashboard 中执行
# 复制 db/add_job_type_field.sql 内容到 SQL Editor
```

#### SQL脚本内容
```sql
-- 添加 job_type 字段到 jobs 表
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(32) DEFAULT 'compute';

-- 添加索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);

-- 更新现有作业的 job_type
UPDATE jobs 
SET job_type = 'graphics'
WHERE (
  job_name ILIKE '%VNC%' OR 
  job_name ILIKE '%vnc%' OR
  script ILIKE '%vncserver%' OR
  script ILIKE '%VNC%' OR
  (params IS NOT NULL AND params->>'vncDisplay' IS NOT NULL)
);

-- 添加约束确保 job_type 只能是有效值
ALTER TABLE jobs ADD CONSTRAINT IF NOT EXISTS check_job_type 
CHECK (job_type IN ('compute', 'graphics'));
```

### 2. 验证数据库更新

运行测试脚本验证字段是否正确添加：

```bash
node scripts/test-job-type-field.js
```

预期输出：
```
✅ job_type 字段已存在
📊 找到 X 个作业:
  - 123: test-job (compute) 💻
  - 124: vnc-job (graphics) 🎨
```

## API部署

### 1. 文件结构
```
app/api/jobs/
├── smart-sync/
│   └── route.ts          # 智能同步API
├── route.ts              # 作业列表API
├── status/
│   └── route.ts          # 状态查询API
└── active/
    └── route.ts          # 活跃作业API
```

### 2. 环境变量配置

确保以下环境变量已正确设置：

```bash
# .env.local
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

### 3. 权限配置

确保数据库用户有足够权限：

```sql
-- 授予必要的权限
GRANT SELECT, INSERT, UPDATE ON jobs TO your_app_user;
GRANT USAGE ON SEQUENCE jobs_id_seq TO your_app_user;
```

## 前端集成

### 1. 安装依赖

确保已安装必要的依赖：

```bash
npm install @supabase/supabase-js
```

### 2. 集成智能同步Hook

在作业页面中集成 `useSmartJobSync` Hook：

```typescript
// app/dashboard/jobs/page.tsx
import { useSmartJobSync } from '@/hooks/use-smart-job-sync'

export default function JobsPage() {
  const { syncState, isSyncing, forceSync } = useSmartJobSync()
  
  return (
    <div>
      {/* 显示同步状态 */}
      {syncState.hasActiveJobs && (
        <div className="text-green-600">
          🟢 智能同步已启用 - {syncState.activeJobCount} 个活跃作业
        </div>
      )}
      
      {/* 手动同步按钮 */}
      <Button onClick={forceSync} disabled={isSyncing}>
        {isSyncing ? '🔄 同步中...' : '🔄 智能同步'}
      </Button>
    </div>
  )
}
```

### 3. 样式配置

确保 Tailwind CSS 配置包含必要的样式：

```javascript
// tailwind.config.ts
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

## 配置选项

### 1. 同步频率配置

可以在 Hook 中调整同步频率：

```typescript
// hooks/use-smart-job-sync.ts
const CHECK_INTERVAL = 10000 // 10秒检查间隔
const FORCE_SYNC_INTERVAL = 30000 // 30秒强制同步间隔
```

### 2. 缓存配置

调整缓存策略：

```typescript
// lib/job-cache.ts
const CACHE_TTL = 60000 // 60秒缓存时间
const MAX_CACHE_SIZE = 100 // 最大缓存条目数
```

### 3. 错误重试配置

配置错误重试策略：

```typescript
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1秒重试延迟
```

## 监控和调试

### 1. 日志配置

配置详细的日志记录：

```typescript
// 在 API 中添加日志
console.log(`智能同步完成: 新增 ${newJobs} 个作业，更新 ${changedJobs} 个作业状态`)
console.log(`智能状态更新耗时: ${endTime - startTime}ms`)
```

### 2. 性能监控

监控关键指标：

```bash
# 监控API响应时间
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/jobs/smart-sync"

# 监控数据库查询性能
EXPLAIN ANALYZE SELECT * FROM jobs WHERE status IN ('PENDING', 'RUNNING');
```

### 3. 健康检查

创建健康检查端点：

```typescript
// app/api/health/route.ts
export async function GET() {
  try {
    // 检查数据库连接
    const { data } = await supabase.from('jobs').select('count').limit(1)
    
    // 检查Slurm命令
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)
    await execFileAsync('squeue', ['--version'])
    
    return Response.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return Response.json({ 
      status: 'unhealthy',
      error: error.message 
    }, { status: 500 })
  }
}
```

## 故障排除

### 1. 常见问题

#### 数据库字段不存在
**症状**: `column jobs.job_type does not exist`

**解决方案**:
```bash
# 运行SQL脚本添加字段
psql -d your_database -f db/add_job_type_field.sql

# 验证字段添加
node scripts/test-job-type-field.js
```

#### Slurm命令不可用
**症状**: `squeue command not found`

**解决方案**:
```bash
# 检查Slurm安装
which squeue
which sacct

# 检查PATH环境变量
echo $PATH

# 安装Slurm客户端
sudo apt-get install slurm-client
```

#### API连接失败
**症状**: 前端无法连接到智能同步API

**解决方案**:
```bash
# 检查API服务状态
curl http://localhost:3000/api/jobs/smart-sync

# 检查网络连接
netstat -tlnp | grep :3000

# 重启开发服务器
npm run dev
```

### 2. 性能问题

#### 同步响应慢
**症状**: 智能同步API响应时间超过1秒

**解决方案**:
- 检查数据库索引
- 优化查询语句
- 增加系统资源

#### 内存使用过高
**症状**: 应用内存使用持续增长

**解决方案**:
- 检查内存泄漏
- 优化缓存策略
- 增加垃圾回收频率

### 3. 数据一致性问题

#### 作业状态不准确
**症状**: 数据库中的作业状态与Slurm不一致

**解决方案**:
```bash
# 执行强制同步
curl -X POST "http://localhost:3000/api/jobs/smart-sync?force=true"

# 检查数据一致性
node scripts/check-data-consistency.js
```

## 生产环境部署

### 1. 环境准备

```bash
# 设置生产环境变量
export NODE_ENV=production
export SUPABASE_URL=your_production_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_production_key

# 构建应用
npm run build

# 启动生产服务器
npm start
```

### 2. 反向代理配置

#### Nginx配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. 监控和告警

#### 设置监控
```bash
# 使用PM2监控
npm install -g pm2
pm2 start npm --name "hpc-app" -- start
pm2 monit
```

#### 设置告警
```bash
# 监控API健康状态
curl -f http://localhost:3000/api/health || echo "API down"
```

## 升级指南

### 1. 版本升级

```bash
# 备份数据库
pg_dump your_database > backup.sql

# 更新代码
git pull origin main

# 运行数据库迁移
psql -d your_database -f db/add_job_type_field.sql

# 重启应用
pm2 restart hpc-app
```

### 2. 回滚策略

```bash
# 恢复数据库
psql -d your_database < backup.sql

# 回滚代码
git checkout previous-version

# 重启应用
pm2 restart hpc-app
```

## 相关文档

- [智能作业状态更新系统](../../archive/job-sync-legacy-2025/smart-job-sync-system.md) - 系统架构
- [API文档](./smart-sync-api.md) - API接口说明
- [快速使用指南](./smart-sync-quickstart.md) - 快速开始
- [故障排除指南](../../operations/troubleshooting.md) - 常见问题解决 
