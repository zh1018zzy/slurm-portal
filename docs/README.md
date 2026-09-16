# 文档总索引（主入口）

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-28`

本页是项目文档唯一主入口，面向新同学与 AI 协作场景。  
阅读顺序建议：先看 `docs/project-overview.md`，再按「开发过程」或「模块」进入。  
若你在排障，请直接进入 `docs/operations/troubleshooting.md`。  
一次性记录与阶段性报告统一归档到 `docs/archive/README.md`。

## 快速入口

- 项目速览：`docs/project-overview.md`
- 统一故障排查入口：`docs/operations/troubleshooting.md`
- 历史归档索引：`docs/archive/README.md`

## 按开发过程阅读

### 开发（Development）

- 目录：`docs/development/`
- 适用内容：本地开发、工作流、研发规范、迭代计划
- 现有相关文档（示例）：
  - `docs/development/`（目录内文档）
  - `docs/development/industry-delivery-hardening-plan.md`（行业交付加固路线图与阶段进度）
  - `docs/development/api-permission-matrix.md`（主要 API 与 resource/action 对照表）
  - `docs/development/data-layer-postgres-lightweight.md`（数据层设计与仅 PostgreSQL 轻量化说明）
  - `docs/guides/quick-start-guide.md`（快速上手）

### 运维（Operations）

- 目录：`docs/operations/`
- 适用内容：部署、运行维护、故障排查、数据修复
- 现有相关文档（示例）：
  - `docs/operations/storage-monitoring.md`
  - `docs/operations/cleanup-orphan-users-guide.md`
  - `docs/operations/repair-history-jobs-guide.md`
  - `docs/operations/troubleshooting.md`（统一排查入口）

## 按模块阅读（Modules）

> 说明：当前仓库仍有历史目录（如 `docs/features/`、`docs/system/`、`docs/performance/`）。  
> 过渡期内，统一在此处做模块导航，后续可逐步沉淀到 `docs/modules/`。

- 认证与权限：
  - `docs/system/authentication/`
  - `docs/system/permissions/`
- License 与授权：
  - `docs/system/licensing/`
- WebShell：
  - `docs/features/webshell/`
- VNC：
  - `docs/features/vnc/`
- 通知系统：
  - `docs/features/notifications/`
- 作业同步与调度：
  - `docs/system/JOB-SYNC-MECHANISM.md`
  - `docs/system/JOB-SYNC-DEPLOYMENT-GUIDE.md`
  - `docs/system/JOB-SYNC-OPTIMIZATION.md`
- 性能优化：
  - `docs/performance/optimization/`
- 部署：
  - `docs/deployment/`（含从仓库根目录迁入的 `root-deployment-guide.md`、`deployment-pm2-docker.md`、`deployment-quick-start.md` 等；与 `deployment-guide.md` 并存）
  - **上线前安全与环境变量（Phase 1 API）**：`docs/deployment/security-api-deployment-notes.md`
  - 作业同步 Cron 快速步骤：`docs/deployment/QUICK-START-CRON.md`

## 仓库根目录说明

- 项目根 [README.md](../README.md) 仅作入口与常用链接表；**文档主路径仍为本文**。
- 原根目录长篇说明已迁入 `docs/deployment/`、`docs/operations/`、`docs/development/`；阶段性快照与旧版「文档索引」见 `docs/archive/repo-root/`（含 [DOCS-INDEX 历史快照](archive/repo-root/DOCS-INDEX.md)）。原 `DEPLOYMENT-GUIDE.md` 现为 `docs/deployment/root-deployment-guide.md`（与同目录 `deployment-guide.md` 区分）。
- 若书签仍指向根目录 [DOCS-INDEX.md](../DOCS-INDEX.md)，该文件为重定向页。

## 归档与历史文档

- 归档总入口：`docs/archive/README.md`
- 历史材料目录：
  - `docs/archive/`
  - `docs/archive/repo-root/`（原**仓库根目录** Markdown 快照与旧索引）
  - `docs/archive/root-legacy/`（原 `docs/` 根目录平铺历史文档）
  - `docs/troubleshooting/`（历史排障记录，建议通过统一入口跳转）

## 文档治理约定（执行摘要）

- 新增长期有效知识：写入 `docs/development/`、`docs/operations/` 或模块路径
- 一次性排障/阶段总结：写入归档，并在 `docs/archive/README.md` 建立索引
- 主路径只走本页，不再以分散旧文档作为入口
