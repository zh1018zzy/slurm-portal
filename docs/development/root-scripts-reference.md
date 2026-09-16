# 项目根目录脚本使用指南

> 适用范围：根目录 PM2 相关脚本的参数、排障与作业同步说明  
> 主入口链接：`docs/README.md`  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`  
> **最后更新**: 2025-11-07 · **适用版本**: v3.0+

---

## 📋 脚本列表

### 1. `start-pm2.sh` - 启动所有服务 ⭐

**用途**: 一键启动HPC平台的所有核心服务

**包含的服务**:
- ✅ 主应用 (hpc-app) - 端口3000
- ✅ WebShell服务 (webshell-server) - 端口3001
- ✅ 作业同步服务 (job-sync) - 60秒轮询

**使用方法**:
```bash
cd /opt/my-hpcapp
bash start-pm2.sh
```

**自动功能**:
- 检查项目是否已构建，未构建则自动执行 `npm run build`
- 停止所有旧进程，避免冲突
- 按顺序启动所有服务
- 等待服务就绪后显示状态
- 自动保存PM2配置

**输出示例**:
```
=====================================
HPC App 完整部署启动
=====================================

🛑 停止旧进程...
🚀 启动主应用 (端口 3000)...
🚀 启动 WebShell 服务 (端口 3001)...
🚀 启动作业同步服务 (60秒轮询)...

📊 服务运行状态:
┌────┬──────────────────┬─────────┬─────────┬──────────┐
│ id │ name             │ status  │ cpu     │ mem      │
├────┼──────────────────┼─────────┼─────────┼──────────┤
│ 2  │ hpc-app          │ online  │ 0%      │ 71.8mb   │
│ 3  │ job-sync         │ online  │ 0%      │ 45.1mb   │
│ 1  │ webshell-server  │ online  │ 0%      │ 48.0mb   │
└────┴──────────────────┴─────────┴─────────┴──────────┘

✅ HPC App 部署完成
```

---

### 2. `stop-pm2.sh` - 停止所有服务

**用途**: 优雅停止所有服务（不删除）

**使用方法**:
```bash
bash stop-pm2.sh
```

**功能**:
- 停止主应用
- 停止WebShell服务
- 停止作业同步服务
- 显示当前PM2状态

**注意**:
- 此脚本只是**停止**服务，不会删除PM2配置
- 可以通过 `pm2 restart all` 或 `bash restart-pm2.sh` 重新启动
- 如需完全删除，使用 `pm2 delete all`

---

### 3. `restart-pm2.sh` - 重启所有服务

**用途**: 零停机重启所有服务

**使用方法**:
```bash
bash restart-pm2.sh
```

**功能**:
- 尝试重启现有服务
- 如果服务未运行，则启动新实例
- 自动保存PM2配置
- 显示最终状态

**适用场景**:
- 代码更新后重启
- 配置修改后生效
- 服务异常需要重启
- 定期维护重启

---

### 4. `install.sh` - 项目初始化安装

**用途**: 首次部署或重新初始化项目

**使用方法**:
```bash
bash install.sh
```

---

## 🚀 快速操作指南

### 首次部署

```bash
cd /opt/my-hpcapp

# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填写实际配置

# 3. 构建项目
npm run build

# 4. 启动所有服务
bash start-pm2.sh

# 5. 设置开机自启（可选）
pm2 startup
# 执行输出的命令
pm2 save
```

### 日常维护

```bash
# 查看所有服务状态
pm2 status

# 查看实时日志
pm2 logs

# 查看特定服务日志
pm2 logs hpc-app
pm2 logs job-sync
pm2 logs webshell-server

# 重启所有服务
bash restart-pm2.sh

# 重启特定服务
pm2 restart hpc-app
pm2 restart job-sync

# 停止所有服务
bash stop-pm2.sh

# 实时监控
pm2 monit
```

### 代码更新后部署

```bash
# 方式一：完整重新部署
bash stop-pm2.sh
npm run build
bash start-pm2.sh

# 方式二：快速重启（如果只修改了代码）
npm run build
bash restart-pm2.sh
```

---

## 📊 服务详情

### 主应用 (hpc-app)

| 属性 | 值 |
|------|------|
| **服务名** | hpc-app |
| **端口** | 3000 |
| **访问** | http://localhost:3000 |
| **进程模式** | PM2 cluster mode |
| **日志** | `pm2 logs hpc-app` |
| **重启** | `pm2 restart hpc-app` |

### WebShell服务 (webshell-server)

| 属性 | 值 |
|------|------|
| **服务名** | webshell-server |
| **端口** | 3001 |
| **协议** | WebSocket |
| **日志** | `pm2 logs webshell-server` |
| **重启** | `pm2 restart webshell-server` |

### 作业同步服务 (job-sync) ⭐ NEW

| 属性 | 值 |
|------|------|
| **服务名** | job-sync |
| **同步间隔** | 60秒 |
| **自动重启** | 每天3:00 AM |
| **内存限制** | 200MB (超过自动重启) |
| **功能** | 同步SLURM作业状态到数据库 |
| **日志** | `pm2 logs job-sync` |
| **状态检查** | `bash scripts/deployment/deploy-pm2-cluster.sh --sync-status` |

---

## ⚙️ PM2 常用命令速查

```bash
# 查看服务
pm2 list                    # 列出所有服务
pm2 status                  # 同上
pm2 show hpc-app            # 查看特定服务详情
pm2 describe job-sync       # 同上

# 日志管理
pm2 logs                    # 所有服务实时日志
pm2 logs hpc-app            # 特定服务实时日志
pm2 logs --lines 100        # 显示最近100行
pm2 logs --err              # 只显示错误日志
pm2 flush                   # 清空所有日志

# 服务控制
pm2 restart all             # 重启所有服务
pm2 restart hpc-app         # 重启特定服务
pm2 reload all              # 零停机重启
pm2 stop all                # 停止所有服务
pm2 delete all              # 删除所有服务

# 监控
pm2 monit                   # 实时监控面板
pm2 plus                    # PM2 Plus 云监控（需注册）

# 开机自启
pm2 startup                 # 生成启动脚本
pm2 save                    # 保存当前配置
pm2 unstartup               # 禁用开机自启
```

---

## 🛠️ 高级部署脚本

如需更专业的部署功能，使用 `scripts/deployment/` 目录下的脚本：

```bash
# 完整部署（应用+同步服务）
bash scripts/deployment/deploy-pm2-cluster.sh --deploy-all

# 仅部署同步服务
bash scripts/deployment/deploy-pm2-cluster.sh --deploy-sync

# 查看同步服务状态
bash scripts/deployment/deploy-pm2-cluster.sh --sync-status

# 系统健康检查
bash scripts/deployment/deploy-pm2-cluster.sh --health-check

# 性能测试
bash scripts/deployment/deploy-pm2-cluster.sh --performance

# 查看帮助
bash scripts/deployment/deploy-pm2-cluster.sh --help
```

---

## 🔍 故障排查

### 服务启动失败

```bash
# 1. 检查日志
pm2 logs hpc-app --err --lines 50

# 2. 检查端口占用
netstat -tlnp | grep 3000
lsof -i :3000

# 3. 重新构建
npm run build

# 4. 完全清理后重启
pm2 delete all
bash start-pm2.sh
```

### 作业同步不工作

```bash
# 1. 检查同步服务状态
pm2 show job-sync

# 2. 查看同步日志
pm2 logs job-sync --lines 100

# 3. 手动测试同步
npx tsx scripts/tools/fix-stale-jobs.ts

# 4. 重启同步服务
pm2 restart job-sync

# 5. 使用专用脚本检查
bash scripts/deployment/deploy-pm2-cluster.sh --sync-status
```

### 内存泄漏

```bash
# 1. 监控内存
pm2 monit

# 2. 查看内存历史
pm2 logs | grep "内存"

# 3. 重启高内存服务
pm2 restart <service-name>

# 4. 降低内存限制（触发更频繁重启）
pm2 delete job-sync
pm2 start scripts/cron/start-job-sync.js \
    --name job-sync \
    --max-memory-restart 150M
```

---

## 📚 相关文档

- [作业同步部署指南](../system/JOB-SYNC-DEPLOYMENT-GUIDE.md) - 详细部署文档
- [作业同步机制详解](../system/JOB-SYNC-MECHANISM.md) - 技术架构文档
- [作业同步文档索引](../archive/root-legacy/JOB-SYNC-DOCS-INDEX.md) - 历史导航索引

---

## ✅ 总结

**根目录脚本特点**:
- ✅ 简单易用 - 一行命令启动
- ✅ 自动化 - 自动检查、构建、启动
- ✅ 零停机 - restart使用reload模式
- ✅ 完整覆盖 - 包含所有核心服务
- ✅ 生产就绪 - PM2管理，开机自启

**推荐工作流**:
1. 日常使用根目录脚本 (`start-pm2.sh`, `stop-pm2.sh`, `restart-pm2.sh`)
2. 复杂部署使用 `scripts/deployment/` 下的专业脚本
3. 故障排查使用 `scripts/tools/` 下的工具脚本

---

**维护**: HPC Platform Team
**最后更新**: 2025-11-07
**版本**: v3.0
