# 作业同步服务部署指南

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

> **版本**: v3.0
> **最后更新**: 2025-11-07
> **维护状态**: ✅ 已更新

---

## 📋 概述

作业同步服务是HPC平台的核心后台服务，负责：
- 每60秒同步作业状态
- 自动检测过期作业（RUNNING/PENDING超过7天）
- 提供作业状态通知
- 维护数据库与SLURM集群的一致性

---

## 🚀 快速部署

### 方式一：使用部署脚本（推荐）

```bash
cd /opt/my-hpcapp

# 部署应用和同步服务
bash scripts/deployment/deploy-pm2-cluster.sh --deploy-all

# 或仅部署同步服务
bash scripts/deployment/deploy-pm2-cluster.sh --deploy-sync
```

### 方式二：手动部署

```bash
cd /opt/my-hpcapp

# 启动同步服务
pm2 start scripts/cron/start-job-sync.js \
    --name job-sync \
    --cron-restart="0 3 * * *" \
    --max-memory-restart 200M

# 保存PM2配置
pm2 save
```

---

## 📊 服务管理

### 查看服务状态

```bash
# 使用部署脚本（推荐）
bash scripts/deployment/deploy-pm2-cluster.sh --sync-status

# 或使用PM2命令
pm2 list
pm2 show job-sync
```

### 查看服务日志

```bash
# 实时日志
pm2 logs job-sync

# 最近100行
pm2 logs job-sync --lines 100 --nostream

# 错误日志
pm2 logs job-sync --err
```

### 重启服务

```bash
# 重启同步服务
pm2 restart job-sync

# 重新部署
bash scripts/deployment/deploy-pm2-cluster.sh --deploy-sync
```

### 停止服务

```bash
pm2 stop job-sync
pm2 delete job-sync
```

---

## ⚙️ 配置参数

### PM2配置

| 参数 | 值 | 说明 |
|------|------|------|
| `--name` | job-sync | 服务名称 |
| `--cron-restart` | 0 3 * * * | 每天3点自动重启 |
| `--max-memory-restart` | 200M | 内存超过200MB重启 |
| `--error` | logs/job-sync-error.log | 错误日志路径 |
| `--output` | logs/job-sync-out.log | 输出日志路径 |

### 环境变量

```bash
# API基础URL（默认: http://localhost:3000）
API_BASE_URL=http://localhost:3000

# 同步间隔（毫秒，默认: 60000）
SYNC_INTERVAL=60000

# Supabase配置（必需）
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

---

## 🔍 监控指标

### 关键日志

正常运行时，每60秒会输出：

```log
[2025-11-07T10:00:00.000Z] 开始同步作业状态...
[2025-11-07T10:00:01.234Z] 同步成功: {
  message: "同步完成",
  stats: {
    updated: 5,
    newJobs: 0,
    staleJobsFixed: 0,
    staleJobsChecked: 12
  }
}
```

### 性能指标

| 指标 | 正常值 | 说明 |
|------|--------|------|
| CPU使用率 | < 5% | 轮询期间 |
| 内存占用 | < 100MB | 稳定运行 |
| 同步耗时 | < 2秒 | 每次同步 |
| 错误率 | 0% | 同步失败率 |

### 告警条件

⚠️ 需要关注的情况：

- 连续3次同步失败
- 内存使用超过150MB
- CPU持续超过10%
- 同步耗时超过5秒
- 过期作业数量突然增加

---

## 🛠️ 故障排查

### 问题1: 服务无法启动

**症状**: `pm2 list` 中job-sync状态为 `errored`

**检查步骤**:
```bash
# 查看错误日志
pm2 logs job-sync --err --lines 50

# 检查脚本路径
ls -l scripts/cron/start-job-sync.js

# 检查依赖
npm list
```

**常见原因**:
- Node.js版本不兼容（需要18+）
- 缺少环境变量
- 脚本路径错误

### 问题2: 同步失败

**症状**: 日志中显示 `同步失败` 或 `连接失败`

**检查步骤**:
```bash
# 检查API服务是否运行
curl http://localhost:3000/api/jobs/persistent

# 检查SLURM服务
sinfo --version
squeue --version

# 检查数据库连接
echo $SUPABASE_URL
```

**解决方案**:
```bash
# 重启主应用
pm2 restart hpc-app

# 检查数据库配置
cat .env.local | grep SUPABASE

# 重启同步服务
pm2 restart job-sync
```

### 问题3: 内存泄漏

**症状**: 内存使用持续增长

**检查步骤**:
```bash
# 监控内存
pm2 monit

# 查看内存历史
pm2 logs job-sync | grep "内存"
```

**解决方案**:
```bash
# 降低内存限制触发更频繁重启
pm2 delete job-sync
pm2 start scripts/cron/start-job-sync.js \
    --name job-sync \
    --max-memory-restart 150M

# 或手动重启
pm2 restart job-sync
```

### 问题4: 过期作业检测不工作

**症状**: 已完成作业状态仍为RUNNING

**检查步骤**:
```bash
# 查看同步日志
pm2 logs job-sync | grep "staleJobs"

# 手动触发修复
npx tsx scripts/tools/fix-stale-jobs.ts

# 或通过管理界面"修复作业"按钮
```

**解决方案**:
- 确保智能同步每5分钟触发过期检测
- 使用强制同步总是触发检测
- 运行修复脚本手动处理

---

## 📈 升级指南

### 从旧版本升级

如果之前使用 `nohup` 或 `cron` 部署：

```bash
# 1. 停止旧服务
pkill -f "node.*job-sync"
crontab -e  # 删除相关cron任务

# 2. 部署新版本
bash scripts/deployment/deploy-pm2-cluster.sh --deploy-sync

# 3. 验证
bash scripts/deployment/deploy-pm2-cluster.sh --sync-status
```

### 版本兼容性

| 同步服务版本 | 平台版本 | Node.js | 说明 |
|-------------|---------|---------|------|
| v3.0 | ≥ 3.0 | ≥ 18 | 当前版本，支持过期检测 |
| v2.0 | ≥ 2.0 | ≥ 16 | 旧版本，仅基础同步 |

---

## 🔐 安全建议

### 权限管理

```bash
# 设置脚本权限
chmod 755 scripts/cron/start-job-sync.js
chmod 644 scripts/deployment/deploy-pm2-cluster.sh

# 日志目录权限
chmod 755 logs
chmod 644 logs/job-sync-*.log
```

### 环境变量保护

```bash
# 不要将敏感信息硬编码
# 使用.env.local或环境变量

# .env.local (不提交到git)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
```

---

## 📚 相关文档

- [作业同步机制详解](JOB-SYNC-MECHANISM.md) - 完整技术文档
- [作业同步优化记录](JOB-SYNC-OPTIMIZATION.md) - 问题修复历史
- [文档索引](../archive/root-legacy/JOB-SYNC-DOCS-INDEX.md) - 所有相关文档

---

## 🔗 命令速查

```bash
# 部署
bash scripts/deployment/deploy-pm2-cluster.sh --deploy-all      # 部署全部
bash scripts/deployment/deploy-pm2-cluster.sh --deploy-sync     # 仅同步服务

# 监控
bash scripts/deployment/deploy-pm2-cluster.sh --sync-status     # 查看状态
pm2 logs job-sync                                               # 查看日志
pm2 monit                                                       # 实时监控

# 管理
pm2 restart job-sync                                            # 重启服务
pm2 stop job-sync                                               # 停止服务
pm2 delete job-sync                                             # 删除服务

# 修复
npx tsx scripts/tools/fix-stale-jobs.ts                         # 修复过期作业
bash scripts/deployment/deploy-pm2-cluster.sh --deploy-sync     # 重新部署
```

---

## ❓ 常见问题

### Q: 为什么需要单独的同步服务？

A: 因为Next.js应用是无状态的，后台轮询需要独立进程持续运行。PM2保证服务高可用。

### Q: 同步间隔可以改吗？

A: 可以，修改 `scripts/cron/start-job-sync.js` 中的 `SYNC_INTERVAL` 变量。但建议保持60秒，避免过于频繁。

### Q: 同步服务重启会丢失数据吗？

A: 不会。所有数据存储在数据库中，重启只是暂停60秒同步，不影响数据完整性。

### Q: 如何确认同步服务在工作？

A: 查看PM2日志，应该每60秒有一次同步记录。或在管理界面查看作业状态是否实时更新。

### Q: 内存占用多少算正常？

A: 正常运行在50-100MB之间。超过150MB可能有问题，服务会自动重启。

---

**文档维护**: HPC Platform Team
**最后更新**: 2025-11-07
**版本**: v3.0
