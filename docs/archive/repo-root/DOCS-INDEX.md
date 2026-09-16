# 📚 文档索引（历史快照）

> 适用范围：原仓库根目录平铺文档年代的索引；仅供参考。  
> 主入口链接：`docs/README.md`  
> 文档状态：`archived`  
> 最后验证日期：`2026-03-28`

**当前请以 [docs/README.md](../../README.md) 为准。** 下表链接已指向迁移后的文件（相对本文件）。

## 核心文档

| 文档 | 说明 | 适用场景 |
|------|------|---------|
| [root-deployment-guide.md](../../deployment/root-deployment-guide.md) | **完整部署指南** | 📖 新环境部署必读 |
| [deployment-pm2-docker.md](../../deployment/deployment-pm2-docker.md) | 部署概览（PM2 / Docker） | 快速参考 |
| [deployment-quick-start.md](../../deployment/deployment-quick-start.md) | 部署说明 | 简要说明 |

## 脚本文档

| 文档 | 说明 |
|------|------|
| [scripts/README.md](../../../scripts/README.md) | Scripts 目录完整说明 |
| [root-scripts.md](../../development/root-scripts.md) | 根目录快捷脚本说明 |

## 快速查找

### 🚀 我想部署到新环境
→ 阅读 [root-deployment-guide.md](../../deployment/root-deployment-guide.md)

### ⚙️ 我想了解如何管理服务
→ 阅读 [root-deployment-guide.md - 服务管理](../../deployment/root-deployment-guide.md#服务管理)

### 🔧 我想使用脚本工具
→ 阅读 [scripts/README.md](../../../scripts/README.md)

### 🐛 我遇到了问题
→ 阅读 [root-deployment-guide.md - 常见问题](../../deployment/root-deployment-guide.md#常见问题)

### 📊 我想监控性能
→ 阅读 [root-deployment-guide.md - 运维管理](../../deployment/root-deployment-guide.md#运维管理)

### 🔐 我想配置环境变量
→ 阅读 [root-deployment-guide.md - 环境配置](../../deployment/root-deployment-guide.md#环境配置)

## 文档结构（迁移后）

```
/opt/my-hpcapp/
├── README.md                 # 项目入口（指向 docs/README.md）
├── DOCS-INDEX.md             # 重定向到主索引
├── scripts/
│   └── README.md
└── docs/
    ├── README.md             # 文档主入口
    ├── deployment/           # 部署（含原 DEPLOYMENT-GUIDE 等）
    ├── development/        # 根目录脚本说明等
    ├── operations/         # 清理与运维
    └── archive/repo-root/    # 本目录：历史快照与旧索引
```

## 按场景查找

### 场景 1: 首次部署
1. [系统要求](../../deployment/root-deployment-guide.md#系统要求)
2. [快速开始](../../deployment/root-deployment-guide.md#快速开始)
3. [详细部署步骤](../../deployment/root-deployment-guide.md#详细部署步骤)
4. [环境配置](../../deployment/root-deployment-guide.md#环境配置)

### 场景 2: 服务管理
1. [基本操作](../../deployment/root-deployment-guide.md#基本操作)
2. [PM2 命令](../../deployment/root-deployment-guide.md#pm2-常用命令)
3. [NPM 脚本](../../deployment/root-deployment-guide.md#npm-脚本命令)

### 场景 3: 问题排查
1. [常见问题](../../deployment/root-deployment-guide.md#常见问题)
2. [故障排查](../../deployment/root-deployment-guide.md#故障排查)
3. [日志管理](../../deployment/root-deployment-guide.md#日志管理)

### 场景 4: 日常运维
1. [更新应用](../../deployment/root-deployment-guide.md#更新应用)
2. [性能监控](../../deployment/root-deployment-guide.md#性能监控)
3. [定期维护](../../deployment/root-deployment-guide.md#定期维护)
4. [数据备份](../../deployment/root-deployment-guide.md#数据备份)

### 场景 5: 使用脚本
1. [部署脚本](../../../scripts/README.md#-deployment---部署脚本)
2. [运维脚本](../../../scripts/README.md#-operations---运维管理)
3. [定时任务](../../../scripts/README.md#-cron---定时任务)
4. [工具脚本](../../../scripts/README.md#-tools---工具脚本)

## 快速命令参考

### 服务管理
```bash
./install.sh              # 安装
./start-pm2.sh           # 启动
./stop-pm2.sh            # 停止
./restart-pm2.sh         # 重启
pm2 status               # 状态
pm2 logs                 # 日志
```

### 运维操作
```bash
npm run monitor          # 性能监控
npm run diagnose         # 性能诊断
npm run optimize         # 部署优化
```

### 常用脚本
```bash
./scripts/operations/update-app.sh           # 更新应用
./scripts/maintenance/cleanup.sh             # 清理临时文件
./scripts/deployment/create-deployment-package.sh  # 创建部署包
```

## 更多文档

详细技术文档位于 `docs/` 目录；主索引见 [docs/README.md](../../README.md)。

---

**提示**：新读者请从 [docs/README.md](../../README.md) 开始阅读。
