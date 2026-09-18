# slurm-portal

**Slurm 集群 Web 门户** — 基于 Next.js 14 + Slurm + LDAP/NIS + WebShell 的全栈管理工具。

> 面向高校实验室、院系机房与中小规模企业 **Slurm** 集群，提供浏览器端一站式管理：用户管理、作业监控、应用商店、VNC 远程桌面、WebShell、报表分析等。  
> **当前仅支持 [SchedMD Slurm](https://slurm.schedmd.com/)**，未适配 PBS / LSF 等其他调度器。  
> **规模定位**：设计与推荐部署面向**中小集群**（常见为数十至约一两百节点量级、单门户实例跑在管理/登录节点）。超大规模多中心、极高并发门户场景不在当前优先目标内。

## ✨ 功能特性

| 模块 | 说明 |
|------|------|
| **作业管理** | 作业提交/监控/取消、历史作业检索、作业趋势与报表（图表可视化） |
| **集群监控** | 节点状态（sinfo/scontrol）、分区与负载、性能看板（big-screen） |
| **用户管理** | 支持 Linux 本地用户 / LDAP / NIS 三种认证模式，用户增删改、并发登录控制 |
| **应用中心** | 常见计算软件（ABAQUS、ANSYS、MATLAB、Materials Studio、COMSOL 等）一键提交到 Slurm |
| **WebShell** | 浏览器内终端（xterm.js），支持文件上传下载、剪贴板权限控制 |
| **VNC 桌面** | 远程图形桌面接入（web-vnc） |
| **消息与公告** | 站内通知、公告管理、审计日志 |
| **多语言** | 中 / 英 i18n（next-intl） |

## 🏗️ 技术栈

- **前端/后端框架**: Next.js 14 (App Router) + React 18 + TypeScript
- **UI**: TailwindCSS + shadcn/ui + Recharts
- **认证**: Linux PAM / LDAP / NIS，JWT（jsonwebtoken）
- **数据库**: Supabase (PostgreSQL) — 用户、作业快照、权限等业务数据
- **集群侧**: Slurm 客户端命令（sinfo / scontrol / squeue / sacct）封装，Node.js 微服务（WebShell、作业同步）
- **终端**: xterm.js + node-pty + socket.io

## 🚀 快速开始

> **部署前请先阅读**：[集群依赖与检查清单](docs/deployment/cluster-prerequisites.md)。  
> 本平台依赖现有的 Slurm / 认证 / 数据库 /（可选）VNC 等集群服务，不会自动安装或改造整套集群。

### 环境要求

- Node.js ≥ 18，npm ≥ 9
- 一台 **Slurm 集群管理节点或登录节点**（本机可执行 `sinfo` / `squeue` / `sbatch` / `sacct`）
- Supabase 项目（或兼容的 PostgreSQL + API，需服务角色密钥）
- （可选）LDAP / NIS；WebShell；TurboVNC + noVNC

### 1. 配置环境变量

```bash
cp .env.example .env
# 按现场填写 SUPABASE_* / JWT_SECRET / AUTH_MODE / LDAP_* / VNC_* 等
```

### 2. 初始化数据库

在 Supabase SQL Editor 执行推荐脚本 [`db/install/init-complete-simplified.sql`](db/install/init-complete-simplified.sql)（或完整版 [`db/install/init-complete.sql`](db/install/init-complete.sql)）。仅需建表，种子数据可自行裁剪。说明见 [`db/install/README.md`](db/install/README.md)。

### 3. 校验集群与配置

```bash
npm run verify:env
```

将检查 `.env` 必填项、Node 版本、Slurm 命令、超级管理员凭证，并对 WebShell/VNC 等可选项给出警告。详情见 [cluster-prerequisites.md](docs/deployment/cluster-prerequisites.md)。

### 4. 安装与启动

```bash
npm install

# 开发模式（app + webshell + job-sync 三进程）
npm run dev

# 生产构建
npm run build
npm run start
```

或使用仓库根目录的 PM2 脚本：`./start-pm2.sh` / `./stop-pm2.sh`。也可用 `./install.sh`（会装 Node/PM2 并构建）。

### 5. 配置超级管理员（必做）

确保 `.env` 中已设置强随机 `JWT_SECRET`，然后：

```bash
npm run setup:super-admin
```

将交互设置用户名/密码，并写入加密文件 `config/super-admin.enc`（密码 scrypt 哈希 + AES-256-GCM，权限 0600，已加入 `.gitignore`）。

非交互示例：

```bash
SUPER_ADMIN_USERNAME=admin SUPER_ADMIN_PASSWORD='your-strong-password' npm run setup:super-admin -- --yes
```

### 6. 登录

使用上一步设置的超级管理员，或系统用户（`AUTH_MODE=linux`）登录。建议登录后先确认「节点/分区」与提交测试作业。

## 📁 目录结构

```
app/            # Next.js 路由与页面（[locale] 国际化）
components/     # React 组件
lib/            # 核心业务逻辑（Slurm/LDAP/NIS/作业/权限）
hooks/          # React Hooks
scripts/        # 部署、Slurm 运维、数据脚本
db/install/     # 数据库初始化 SQL
messages/       # i18n 文案（zh/en）
docs/           # 项目文档
```

## 📖 文档

- [docs/deployment/cluster-prerequisites.md](docs/deployment/cluster-prerequisites.md) — **部署前集群依赖与检查清单（推荐先读）**
- [docs/README.md](docs/README.md) — 文档主入口
- [docs/project-overview.md](docs/project-overview.md) — 项目速览
- [docs/operations/troubleshooting.md](docs/operations/troubleshooting.md) — 排障手册

## ⚖️ 开源许可

本项目采用 **GNU Affero General Public License v3.0 (AGPL-3.0)** 开源。

使用本项目时请注意：
- 您**可以**自由使用、修改、分发（需保持 AGPL-3.0 协议）
- 若您将修改版**通过网络对外提供服务**，必须**以相同协议开源您的修改版源码**（AGPL 网络条款）
- 详见 [LICENSE](LICENSE) 全文

> 💡 需要商业授权 / 闭源私有部署 / 定制支持？请联系项目作者获取商业许可（商业版含用户数授权、专属技术支持等）。

## 🙏 致谢

- 感谢 [Next.js](https://nextjs.org/)、[TailwindCSS](https://tailwindcss.com/)、[shadcn/ui](https://ui.shadcn.com/)、[xterm.js](https://xtermjs.org/)、[Recharts](https://recharts.org/) 等优秀开源项目
- 本项目依赖的 Slurm 作业调度系统：[SchedMD Slurm](https://slurm.schedmd.com/)
