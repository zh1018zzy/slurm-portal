# 🕐 作业状态同步定时任务 - 快速开始

> 适用范围：阶段性修复说明快照；定时任务现行步骤请以 `docs/deployment/QUICK-START-CRON.md` 为准。  
> 主入口链接：`docs/README.md`  
> 文档状态：`archived`  
> 最后验证日期：`2026-03-28`

## ✅ 已完成的修复

1. **状态标准化逻辑**：同时支持缩写（R, CD）和全名（RUNNING, COMPLETED）格式
2. **同步锁机制**：防止重复执行，避免资源浪费
3. **当天同步支持**：新增 `syncToday=true` 参数，只同步当天作业

## 📅 同步策略

| 层级 | 时间 | 范围 | 说明 |
|------|------|------|------|
| **手动同步** | 按需 | 最近 7 天 | 用户点击"强制同步"按钮 |
| **每日同步** | 23:30 | 当天作业 | 自动同步当天提交的所有作业 |
| **每周同步** | 周六 22:00 | 最近 7 天 | 补充遗漏的状态变更 |

## 🚀 立即部署

### 方式 1: Node.js Cron（推荐）

```bash
# 1. 安装依赖
npm install

# 2. 构建
npm run build

# 3. 重启应用
pm2 restart ecosystem.config.js

# 4. 验证
curl http://localhost:3000/api/cron/status
```

✅ **完成！定时任务已自动启动**

### 方式 2: 系统 Cron

```bash
# 1. 创建日志目录
sudo mkdir -p /var/log/hpcapp
sudo chown $(whoami):$(whoami) /var/log/hpcapp

# 2. 配置 crontab
crontab -e

# 添加以下两行：
30 23 * * * /opt/my-hpcapp/scripts/sync-jobs-daily.sh
0 22 * * 6 /opt/my-hpcapp/scripts/sync-jobs-weekly.sh
```

## 🧪 测试验证

### 手动触发测试

```bash
# Node.js Cron
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'

# 系统 Cron
/opt/my-hpcapp/scripts/sync-jobs-daily.sh
```

### 查看同步结果

```bash
# 查看定时任务状态
curl http://localhost:3000/api/cron/status

# 查看日志
pm2 logs hpc-management-platform | grep JobSyncScheduler
# 或
tail -f /var/log/hpcapp/daily-sync.log
```

## 📚 详细文档

- 📖 [完整部署指南](docs/deployment/job-sync-cron-setup.md)
- 📖 [5分钟快速上手](docs/deployment/QUICK-START-CRON.md)
- 📊 [同步策略说明](docs/analysis/job-status-sync-strategy.md)
- 🔍 [问题分析报告](docs/analysis/job-status-sync-issues.md)

## ❓ 常见问题

**Q: 如何确认定时任务正在运行？**
```bash
curl http://localhost:3000/api/cron/status
```

**Q: 可以立即测试吗？**
```bash
# 可以！手动触发同步
curl -X POST http://localhost:3000/api/cron/trigger \
  -H "Content-Type: application/json" \
  -d '{"type": "daily"}'
```

**Q: 同步时间可以调整吗？**
可以！编辑 `lib/cron/job-sync-scheduler.ts` 修改 cron 表达式

---

## 📝 更新记录

### 2025-10-09
- ✅ 修复状态标准化逻辑（支持缩写和全名）
- ✅ 添加同步锁机制
- ✅ 支持当天同步模式
- ✅ 创建定时任务调度器
- ✅ 调整同步时间为 23:30 和周六 22:00
- ✅ 调整同步范围为当天和最近 7 天

---

**需要帮助？** 查看详细文档或联系管理员

