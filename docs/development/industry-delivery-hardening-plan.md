# 行业交付加固计划（路线图）

> 目的：将「安全、可观测性、工程化、合规运维」类交付项结构化排期，与代码变更可追溯对应。  
> 适用范围：本仓库 slurm-portal（Next.js、Slurm-only、LDAP 等）；读者为研发与交付/运维。  
> 主入口链接：[docs/README.md](../README.md)  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`（路线图状态已更新）

## 背景与结论

此前已对平台做过交付视角的缺口分析。本文将缺口拆为**阶段（Phase）**，每阶段含验收要点与涉及路径；完成后在下方「进度」表更新状态。

**执行原则**：先封堵高危未鉴权接口，再扩展观测与 CI，最后做体系化（权限矩阵、限流等）。

---

## Phase 1 — 高危 API 鉴权（优先）

| 序号 | 事项 | 验收标准 | 状态 |
|------|------|----------|------|
| 1.1 | `/api/admin/token` 仅管理员可调用 | 须携带有效用户 JWT；非管理员 403；客户端用登录态请求，移除硬编码备用 token | `done` |
| 1.2 | `/api/admin/file-permissions` 强制管理员 | GET/POST/DELETE 在校验 JWT 后校验管理员身份（与中间件角色语义一致） | `done` |
| 1.3 | `/api/cron/trigger` 不可匿名触发 | 管理员 JWT **或** 环境变量 `CRON_TRIGGER_SECRET` + 请求头 `x-cron-secret` | `done` |
| 1.4 | `/api/upload` 须登录；系统 logo 须管理员 | 有效 JWT；`purpose=logo` 时须管理员角色 | `done` |

**涉及文件（Phase 1）**：

- `app/api/admin/token/route.ts`
- `app/api/admin/file-permissions/route.ts`
- `app/api/cron/trigger/route.ts`
- `app/api/upload/route.ts`
- `app/[locale]/dashboard/system/permissions/file-permissions/page.tsx`
- `components/groups/GroupFilePermissions.tsx`
- `app/[locale]/dashboard/system/settings/page.tsx`
- `lib/admin-utils.ts`（与 JWT 载荷管理员判定对齐，含 `system_admin`）

**部署与运维关键信息**（环境变量、接口表、验收清单、curl 示例）已单独成文，便于交付存档与巡检：

- **[docs/deployment/security-api-deployment-notes.md](../deployment/security-api-deployment-notes.md)**（必读）

---

## Phase 2 — 权限中间件落地与路由矩阵

| 序号 | 事项 | 验收标准 | 状态 |
|------|------|----------|------|
| 2.1 | 敏感 API 接入 `withPermission` 或统一守卫 | 用户/组见上；`system/logs`、`system/notifications/cleanup` 使用 `lib/api-admin-guard`；`system/resource-config` 须登录 | `partial` |
| 2.2 | 输出《API × 权限》矩阵文档 | 表格列出 method、path、所需 resource/action、备注 | `done`（[api-permission-matrix.md](./api-permission-matrix.md)） |

---

## Phase 3 — 可观测性与健康检查

| 序号 | 事项 | 验收标准 | 状态 |
|------|------|----------|------|
| 3.1 | Readiness 扩展依赖探测 | 同上 + `HEALTH_CHECK_LDAP`（bind 探测） | `done` |
| 3.2 | 结构化日志与请求关联 | 关键路径使用统一 logger；生产避免敏感 `console.log` | `partial`（middleware 许可证日志仅在非 production 输出） |
| 3.3 | 基础指标（可选） | 如同步任务耗时、Slurm 调用错误计数，对接现有监控栈 | `todo` |

---

## Phase 4 — 工程化与供应链

| 序号 | 事项 | 验收标准 | 状态 |
|------|------|----------|------|
| 4.1 | CI 流水线 | `lint` + `verify:i18n` + `build`；可选 audit 步骤见 4.2 | `done` |
| 4.2 | 依赖漏洞门禁 | Dependabot + CI 中 `npm audit --audit-level=high`（`continue-on-error: true` 以免历史债阻塞构建） | `partial` |

---

## Phase 5 — 生产面收敛与合规文档

| 序号 | 事项 | 验收标准 | 状态 |
|------|------|----------|------|
| 5.1 | 生产禁用调试路由 | `middleware.ts`：生产环境对 `debug`、`test-route`、`license-test` 等路径返回 404 | `done` |
| 5.2 | 安全基线一页纸 | 认证方式、密钥存放、审计日志位置、网络边界 | `partial`（API/环境变量与验收清单见 [security-api-deployment-notes.md](../deployment/security-api-deployment-notes.md)；审计与网络边界待补） |
| 5.3 | 限流与 CSP（按客户要求） | 对登录、上传、管理类 API 限流；全站 CSP 策略评审 | `todo` |

---

## 进度汇总

- **已完成**：Phase 1（2026-03-28）
- **进行中**：无
- **下一步建议**：Phase 2.1 续 — `files` 各子路由、`jobs` 细粒度权限；将 `npm audit` 改为失败即阻断或定期修高危

---

## 相关文档

- **部署安全与 Phase 1 API 说明**：`docs/deployment/security-api-deployment-notes.md`（含 Readiness 环境变量）
- **API × 权限矩阵（Phase 2）**：`docs/development/api-permission-matrix.md`
- **HPC 一站式用户管理路线图**：`docs/development/hpc-user-management-roadmap.md`
- **CI**：仓库 `.github/workflows/ci.yml` · **Dependabot**：`.github/dependabot.yml`
- 权限体系：`docs/system/permissions/`
- 认证：`docs/system/authentication/`
- 部署与 Cron：`docs/deployment/QUICK-START-CRON.md`
- 项目速览：`docs/project-overview.md`
