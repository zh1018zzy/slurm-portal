# HPC平台通知系统部署指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 概述

HPC平台通知系统由多个组件组成，提供完整的作业状态通知和系统消息管理功能。本文档详细说明了部署、配置和维护流程。

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         HPC 通知系统                             │
├─────────────────────────────────────────────────────────────────┤
│  前端界面              │  后端API              │  后台服务         │
│  ┌─────────────────┐  │  ┌─────────────────┐  │  ┌──────────────┐ │
│  │ 通知列表页面      │  │  │ 通知CRUD API    │  │  │ 作业同步服务   │ │
│  │ /notifications  │◄─┤  │ /api/notifications│  │  │ job-sync.js  │ │
│  │                 │  │  │                 │  │  │              │ │
│  │ - 分页显示        │  │  │ - JWT认证       │  │  │ - 60秒轮询    │ │
│  │ - 筛选搜索        │  │  │ - 增删改查       │  │  │ - 状态检测    │ │
│  │ - 批量操作        │  │  │ - 统计信息       │  │  │ - 通知创建    │ │
│  └─────────────────┘  │  └─────────────────┘  │  └──────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                         数据层                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Supabase PostgreSQL 数据库                     │ │
│  │                                                             │ │
│  │  ┌──────────────────┐    ┌─────────────────────────────────┐ │ │
│  │  │ active_notifications │    │        jobs 表              │ │ │
│  │  │                  │    │                                 │ │ │
│  │  │ - id             │    │ - job_id                        │ │ │
│  │  │ - title          │    │ - user                          │ │ │
│  │  │ - message        │    │ - state                         │ │ │
│  │  │ - priority       │    │ - name                          │ │ │
│  │  │ - status         │    │ - partition                     │ │ │
│  │  │ - user_id        │    │ - created_at                    │ │ │
│  │  │ - created_at     │    │ - updated_at                    │ │ │
│  │  └──────────────────┘    └─────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 部署步骤

### 1. 前提条件检查

```bash
# 检查 Node.js 版本 (需要 >= 18.0)
node --version

# 检查 Supabase 连接
psql "postgresql://postgres:postgres@192.168.31.130:5432/postgres" -c "SELECT 1;"

# 检查 Slurm 环境
sinfo
squeue
```

### 2. 核心文件部署

确保以下关键文件已部署：

```bash
# API路由
/opt/my-hpcapp/app/api/notifications/route.ts

# 前端页面
/opt/my-hpcapp/app/dashboard/notifications/page.tsx

# 后台服务
/opt/my-hpcapp/scripts/start-job-sync.js
/opt/my-hpcapp/lib/job-sync.ts
/opt/my-hpcapp/lib/notification-service.ts

# React Hooks
/opt/my-hpcapp/hooks/use-notifications.ts
/opt/my-hpcapp/lib/api-request-manager.ts
```

### 3. 环境变量配置

在 `.env.local` 中确保以下配置：

```bash
# Supabase 配置
SUPABASE_URL=http://192.168.31.130:8000
SUPABASE_KEY=你的_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=你的_SERVICE_ROLE_KEY

# JWT 密钥
JWT_SECRET=my-hpcapp-secret

# API 地址
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. 数据库表创建

```sql
-- 创建通知表
CREATE TABLE IF NOT EXISTS active_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type VARCHAR(100) NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'unread',
    user_id VARCHAR(100),
    is_global BOOLEAN DEFAULT false,
    metadata JSONB,
    dismissible BOOLEAN DEFAULT true,
    source VARCHAR(50),
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON active_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON active_notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON active_notifications(created_at);
```

## ⚙️ 服务启动

### 方法1: 直接启动作业同步服务

```bash
# 进入项目目录
cd /opt/my-hpcapp

# 启动作业同步服务（后台运行）
nohup node scripts/start-job-sync.js > /tmp/job-sync.log 2>&1 &

# 检查服务状态
ps aux | grep job-sync
tail -f /tmp/job-sync.log
```

### 方法2: 使用 PM2 管理服务

```bash
# 安装 PM2（如果未安装）
npm install -g pm2

# 使用 PM2 启动作业同步服务
pm2 start scripts/start-job-sync.js --name "hpc-job-sync"

# 查看服务状态
pm2 list
pm2 logs hpc-job-sync

# 设置开机启动
pm2 startup
pm2 save
```

### 方法3: 系统服务配置

创建系统服务文件 `/etc/systemd/system/hpc-job-sync.service`：

```ini
[Unit]
Description=HPC Job Sync Service
After=network.target

[Service]
Type=simple
User=hpc
WorkingDirectory=/opt/my-hpcapp
ExecStart=/usr/bin/node scripts/start-job-sync.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

启动系统服务：

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start hpc-job-sync

# 设置开机启动
sudo systemctl enable hpc-job-sync

# 查看状态
sudo systemctl status hpc-job-sync
```

## 📊 服务监控

### 1. 健康检查

```bash
# 检查作业同步服务运行状态
curl http://localhost:3000/api/health

# 检查通知API状态
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3000/api/notifications?stats=true
```

### 2. 日志监控

```bash
# 查看作业同步日志
tail -f /tmp/job-sync.log

# 查看 PM2 日志
pm2 logs hpc-job-sync

# 查看系统服务日志
sudo journalctl -u hpc-job-sync -f
```

### 3. 数据库监控

```sql
-- 查看通知数量统计
SELECT 
    status,
    priority,
    COUNT(*) as count
FROM active_notifications 
GROUP BY status, priority;

-- 查看最近创建的通知
SELECT 
    title, 
    user_id, 
    status, 
    created_at 
FROM active_notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔧 故障排除

### 常见问题1: 通知不显示

**症状**: 前端页面不显示通知列表

**解决步骤**:
```bash
# 1. 检查JWT token是否有效
node scripts/fix-notification-auth.js

# 2. 检查数据库连接
psql "postgresql://postgres:postgres@192.168.31.130:5432/postgres" -c "SELECT COUNT(*) FROM active_notifications;"

# 3. 重新登录系统获取新token
```

### 常见问题2: 作业同步服务异常

**症状**: 作业状态变化没有生成通知

**解决步骤**:
```bash
# 1. 检查服务运行状态
ps aux | grep job-sync

# 2. 查看错误日志
tail -100 /tmp/job-sync.log

# 3. 重启服务
pkill -f job-sync
nohup node scripts/start-job-sync.js > /tmp/job-sync.log 2>&1 &
```

### 常见问题3: API认证失败

**症状**: 返回401错误

**解决步骤**:
```bash
# 1. 检查JWT密钥配置
grep JWT_SECRET .env.local

# 2. 测试token生成
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({username: 'test'}, process.env.JWT_SECRET || 'my-hpcapp-secret', {expiresIn: '7d'});
console.log('Test token:', token);
"

# 3. 清除浏览器localStorage重新登录
```

## 📈 性能优化

### 1. 数据库优化

```sql
-- 定期清理过期通知
DELETE FROM active_notifications 
WHERE expires_at < NOW() 
   OR (status = 'read' AND created_at < NOW() - INTERVAL '7 days');

-- 优化索引
ANALYZE active_notifications;
```

### 2. 服务调优

```javascript
// 在 scripts/start-job-sync.js 中调整轮询间隔
const SYNC_INTERVAL = 60000; // 60秒，可根据需要调整

// 在 hooks/use-notifications.ts 中调整前端轮询
const pollInterval = 120000; // 120秒，可根据需要调整
```

## 🔄 升级和维护

### 版本更新流程

```bash
# 1. 备份数据库
pg_dump -h 192.168.31.130 -U postgres postgres > notification_backup.sql

# 2. 停止服务
pm2 stop hpc-job-sync

# 3. 更新代码
git pull origin main
npm install

# 4. 重新构建
npm run build

# 5. 重启服务
pm2 start hpc-job-sync
```

### 定期维护任务

```bash
# 创建定期清理脚本 /etc/cron.daily/hpc-notifications-cleanup
#!/bin/bash
cd /opt/my-hpcapp
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const { error } = await supabase
    .from('active_notifications')
    .delete()
    .or('expires_at.lt.' + new Date().toISOString() + ',and(status.eq.read,created_at.lt.' + sevenDaysAgo.toISOString() + ')');
    
  if (error) console.error('Cleanup failed:', error);
  else console.log('Cleanup completed successfully');
}

cleanup();
"
```

## 📞 支持和联系

- **技术文档**: `/docs/CLAUDE.md`
- **日志位置**: `/tmp/job-sync.log`
- **配置文件**: `.env.local`
- **服务监控**: `http://localhost:3000/dashboard/notifications`

---

**✅ 部署检查清单**

- [ ] 数据库表已创建
- [ ] 环境变量已配置
- [ ] 作业同步服务已启动
- [ ] API服务正常响应
- [ ] 前端页面可以访问
- [ ] JWT认证正常工作
- [ ] 通知创建和显示正常
- [ ] 监控和日志配置完成
