# 作业状态变化通知系统 - 快速启动指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 快速开始

### 1. 环境准备

确保以下环境已配置：
- Node.js 18+
- Supabase数据库
- Slurm集群环境

### 2. 环境变量配置

在 `.env` 文件中配置：
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
API_BASE_URL=http://localhost:3000
```

### 3. 启动通知系统

#### 启动定时任务
```bash
# 给脚本添加执行权限
chmod +x scripts/start-job-sync.sh

# 启动定时任务
./scripts/start-job-sync.sh
```

#### 手动测试
```bash
# 手动同步作业状态
curl -X POST "http://localhost:3000/api/jobs/sync"

# 查看通知统计
curl -X GET "http://localhost:3000/api/notifications?stats=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. 验证功能

1. **提交一个测试作业**
2. **等待状态变化**
3. **检查通知页面** `/dashboard/notifications`

## 常见问题

### Q: 通知没有显示？
A: 检查数据库连接和通知API状态

### Q: 定时任务不工作？
A: 检查Node.js进程和环境变量

### Q: 如何修改同步间隔？
A: 编辑 `scripts/job-sync-cron.js` 中的 `SYNC_INTERVAL`

## 支持

- 查看完整文档：`docs/job-notification-system.md`
- 检查日志文件
- 联系系统管理员 
