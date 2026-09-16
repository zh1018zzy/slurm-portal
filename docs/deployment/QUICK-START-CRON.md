# 快速部署：作业状态同步定时任务

> 适用范围：部署流程、环境配置与发布运维
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-28`

**关联文档**：手动触发 `POST /api/cron/trigger` 的鉴权方式、环境变量 `CRON_TRIGGER_SECRET` 及完整验收清单见 **[security-api-deployment-notes.md](./security-api-deployment-notes.md)**。

## 前置条件
- ✅ 应用已部署运行
- ✅ Node.js 环境已配置
- ✅ 有 root 或 sudo 权限（仅系统 Cron 需要）

## 快速部署（5分钟）

### 选择部署方式

#### 方式 A: Node.js Cron（推荐，自动集成）

```bash
# 1. 安装依赖
cd /opt/my-hpcapp
npm install

# 2. 启用 instrumentation（如果还没有）
# 编辑 next.config.js，添加：
# experimental: { instrumentationHook: true }

# 3. 构建和启动
npm run build
pm2 restart ecosystem.config.js

# 4. 验证
curl http://localhost:3000/api/cron/status
```

**完成！** 定时任务已自动启动。

---

#### 方式 B: 系统 Cron（传统方式）

```bash
# 1. 创建日志目录
sudo mkdir -p /var/log/hpcapp
sudo chown $(whoami):$(whoami) /var/log/hpcapp

# 2. 给脚本执行权限
chmod +x /opt/my-hpcapp/scripts/sync-jobs-*.sh

# 3. 配置 crontab
crontab -e

# 4. 添加以下两行：
30 23 * * * /opt/my-hpcapp/scripts/sync-jobs-daily.sh
0 22 * * 6 /opt/my-hpcapp/scripts/sync-jobs-weekly.sh

# 5. 保存退出（:wq）

# 6. 验证
crontab -l
```

**完成！** 系统定时任务已配置。

---

## 测试验证

### 测试手动触发

**Node.js Cron：**
```bash
# 测试每日同步（需二选一：管理员 JWT，或环境变量 CRON_TRIGGER_SECRET + 请求头 x-cron-secret）
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <管理员 JWT>" \
  -d '{"type": "daily"}'

# 或使用密钥（与 .env 中 CRON_TRIGGER_SECRET 一致）：
# curl -X POST http://localhost:3000/api/cron/trigger \
#   -H "Content-Type: application/json" \
#   -H "x-cron-secret: <CRON_TRIGGER_SECRET>" \
#   -d '{"type": "daily"}'

# 预期输出：
# {"success":true,"message":"每日同步任务已触发，正在后台执行..."}
```

**系统 Cron：**
```bash
# 测试每日同步脚本
/opt/my-hpcapp/scripts/sync-jobs-daily.sh

# 查看日志
tail -20 /var/log/hpcapp/daily-sync.log
```

### 验证同步效果

```bash
# 1. 提交一个测试作业
curl -X POST http://localhost:3000/api/jobs \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "script": "#!/bin/bash\nsleep 5\necho done",
    "jobName": "test-sync",
    "partition": "normal"
  }'

# 2. 等待作业完成

# 3. 触发同步
curl -X POST http://localhost:3000/api/jobs/smart-sync \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "force=true&syncToday=true"

# 4. 查看历史记录（应该能看到最新状态）
curl "http://localhost:3000/api/jobs?history=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 运行时间表

| 任务 | 时间 | 同步范围 | 预期耗时 |
|------|------|---------|---------|
| 每日同步 | 每天 23:30 | 当天作业 | < 30秒 |
| 每周同步 | 周六 22:00 | 最近7天 | < 2分钟 |

---

## 查看日志

**Node.js Cron：**
```bash
# 查看应用日志
pm2 logs hpc-management-platform

# 过滤同步相关日志
pm2 logs hpc-management-platform | grep JobSyncScheduler
```

**系统 Cron：**
```bash
# 每日同步日志
tail -f /var/log/hpcapp/daily-sync.log

# 每周同步日志
tail -f /var/log/hpcapp/weekly-sync.log
```

---

## 常见问题

### Q: 如何确认定时任务正在运行？

**Node.js Cron：**
```bash
curl http://localhost:3000/api/cron/status
# 输出中 isRunning 应为 true
```

**系统 Cron：**
```bash
crontab -l
# 应该能看到两条定时任务
```

### Q: 可以修改同步时间吗？

可以！参考完整文档：`docs/deployment/job-sync-cron-setup.md`

### Q: 同步失败怎么办？

1. 查看日志找到错误原因
2. 检查 Slurm 命令是否可用：`sacct --version`
3. 检查数据库连接是否正常
4. 查看完整故障排查指南

---

## 下一步

✅ 配置完成后：
1. 等待第一次自动同步执行（今晚 23:30）
2. 第二天查看日志确认执行成功
3. 在 dashboard/jobs/history 页面验证数据完整性

📚 详细文档：
- [完整部署指南](../archive/job-sync-legacy-2025/job-sync-cron-setup.md)
- [同步策略说明](../archive/job-sync-legacy-2025/job-status-sync-strategy.md)

---

**需要帮助？** 查看完整文档或联系系统管理员。

