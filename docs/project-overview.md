# 项目速览（10 分钟）

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-09-18`

这是项目技术文档的总览页，面向新成员与 AI 协作者。  
你将快速了解：系统做什么、主要模块在哪、从哪里继续阅读。  
主索引见 `docs/README.md`，统一排障入口见 `docs/operations/troubleshooting.md`。  
**生产部署与安全 API（环境变量、Cron 鉴权、上传规则）**：见 `docs/deployment/security-api-deployment-notes.md`。

## 项目是什么

`slurm-portal` 是一个 **Slurm 集群 Web 门户**，提供作业提交与监控、用户与权限管理、通知系统、WebShell/VNC 访问与系统运维能力。

**调度器范围**：当前仅对接 Slurm（`sinfo` / `squeue` / `sbatch` / `sacct` 等），未实现 PBS、LSF 等多调度器适配层。

**规模定位**：架构与部署方式更适合**中小规模** Slurm 集群（实验室 / 院系 / 部门级机房）。典型假设是：门户与作业同步部署在管理节点或登录节点、通过本机 Slurm CLI 交互、单实例即可覆盖日常管理。不以超大规模多站点、海量并发 Web 会话为设计目标。

## 主要技术栈

- Next.js App Router + TypeScript
- React + Shadcn UI + Radix UI + Tailwind CSS
- LDAP / NIS / Linux 本地认证 + JWT 会话
- Slurm 作业调度集成（唯一调度后端）
- Supabase / PostgreSQL（用户、作业快照、权限等业务数据）

## 核心模块与代码入口

- 业务页面与 API：
  - `app/dashboard/`
  - `app/api/`
- 认证与权限：
  - `lib/auth-ldap.ts`
  - `app/api/auth/`
  - `app/api/permissions/`
- 作业与调度：
  - `lib/slurm.ts`
  - `lib/scheduler/slurm-adapter.ts`
  - `app/api/jobs/`
- 通知系统：
  - `lib/notification-service.ts`
  - `lib/job-sync.ts`
  - `app/api/notifications/`
  - `scripts/start-job-sync.js`
- License 系统：
  - `lib/license/`
  - `app/api/license/`
- 终端与远程访问：
  - `app/dashboard/webshell/`
  - `app/api/webshell/`
  - `docs/features/vnc/`

## 文档阅读路线

### 路线 A：新成员快速入门

1. `docs/README.md`
2. `docs/guides/quick-start-guide.md`
3. `docs/development/`（研发流程与约定）
4. `docs/operations/troubleshooting.md`

### 路线 B：运维与故障处理

1. `docs/operations/troubleshooting.md`
2. `docs/operations/`
3. `docs/deployment/`
4. `docs/archive/README.md`（查历史案例）

### 路线 C：按模块深入

1. `docs/README.md` 的模块导航
2. `docs/system/`、`docs/features/`、`docs/performance/`
3. 结合对应代码入口文件定位实现细节

## 当前文档状态说明

- 项目历史文档较多，目录结构包含过程类与模块类并存
- `docs/README.md` 已作为唯一主入口，逐步收敛阅读路径
- 一次性记录与阶段总结统一通过 `docs/archive/README.md` 管理
