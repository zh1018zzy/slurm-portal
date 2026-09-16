# API × 权限矩阵（Phase 2）

> 目的：记录主要 HTTP API 与 `lib/permission-checker` 中 **resource / action / scope** 的对应关系，便于评审与后续扩展。  
> 适用范围：本仓库 Next.js Route Handlers；与 [industry-delivery-hardening-plan.md](./industry-delivery-hardening-plan.md) Phase 2 对齐。  
> 主入口链接：[docs/README.md](../README.md)  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`（含 groups / readiness / CI 说明同步）

## 说明

- **withPermission**：见 `lib/permission-middleware.ts`，在校验 JWT 后调用 `checkPermission`。  
- **默认角色策略**：见 `lib/permission-checker.ts` 中 `checkDefaultRolePermission`（含 `admin` / `system_admin` / `super_admin` / `user` 等）。  
- **仅登录**：要求有效 Bearer JWT，但不走 RBAC 表单项（用于与「全员可见」仪表盘统计兼容）。  
- **本人或管理员**：见 `lib/user-api-access.ts`（`canAccessUserRecord` + `isJwtPayloadAdmin`）。

---

## 矩阵（已接入）

| 方法 | 路径 | 权限模型 | resource | action | scope | 备注 |
|------|------|----------|----------|--------|-------|------|
| GET | `/api/users` | 仅登录 | — | — | — | `stats=active` 或 `stats=department` 时仅校验已登录 |
| GET | `/api/users` | withPermission | user | read | all | 分页列表、搜索等非 stats |
| POST | `/api/users` | withPermission | user | create | all | 创建用户 |
| GET | `/api/users/[id]` | 本人或管理员 | — | — | — | 路径参数可为 id 或 username |
| PUT | `/api/users/[id]` | 本人或管理员 | — | — | — | 个人资料与管理员编辑共用；**`account_suspended` 仅管理员可改** |
| PATCH | `/api/users/[id]/ssh-keys` | 本人或管理员 | — | — | — | 覆盖写入 `ssh_public_keys`（OpenSSH 行校验） |
| DELETE | `/api/users/[id]` | withPermission | user | delete | all | **`super_admin` 全放行**；**`admin` / `isAdmin` 可删**；**`system_admin` 默认仍不可删**（见 `checkDefaultRolePermission`） |
| GET | `/api/users/sync` | withPermission | user | read | all | LDAP 同步状态/探测，与「用户列表」同级管理员能力 |
| POST | `/api/users/sync` | withPermission | user | read | all | 触发同步（与列表同级，后续可改为更细粒度如 `system/sync`） |
| GET | `/api/groups` | withPermission | group | read | all | 用户组列表 |
| POST | `/api/groups` | withPermission | group | create | all | 创建组 |
| PUT | `/api/groups` | withPermission | group | update | all | 更新组 |
| DELETE | `/api/groups` | withPermission | group | delete | all | 删除组 |
| GET | `/api/groups/sync` | withPermission | group | read | all | 组 LDAP 同步预览 |
| POST | `/api/groups/sync` | withPermission | group | read | all | 执行组同步（与列表同级能力） |

### 系统类（本轮加固）

| 方法 | 路径 | 权限模型 | 说明 |
|------|------|----------|------|
| GET/POST/DELETE | `/api/system/logs` | `requireAdminApi`（`isJwtPayloadAdmin`） | 与「仅 role=admin」相比，含 `system_admin` / `isAdmin` |
| GET/POST/PUT | `/api/system/notifications/cleanup` | 同上 | 通知清理管理 |
| GET | `/api/system/resource-config` | 须登录 JWT | 作业/应用表单用分区与资源字段；匿名 401 |

---

## 矩阵（Phase 1 已加固，非 withPermission）

| 方法 | 路径 | 鉴权方式 | 备注 |
|------|------|----------|------|
| GET | `/api/admin/token` | `isAdmin`（中间件语义） | 见 [security-api-deployment-notes.md](../deployment/security-api-deployment-notes.md) |
| GET/POST/DELETE | `/api/admin/file-permissions` | JWT + `isJwtPayloadAdmin` | |
| POST | `/api/cron/trigger` | 管理员 JWT 或 `CRON_TRIGGER_SECRET` | |
| POST | `/api/upload` | JWT；logo 需管理员 | |

---

## 待接入（后续迭代）

以下路由仍多为手写 JWT 或暂无守卫，计划在 Phase 2 后续批次或 Phase 5 收敛：

- `/api/groups`、`/api/groups/[id]/*`、`/api/files/*`、`/api/system/*`、`/api/license/*`、`/api/jobs/*`（部分已有 Bearer）、`/api/applications/*` 等。

更新本表时请同步修改 [industry-delivery-hardening-plan.md](./industry-delivery-hardening-plan.md) 中 Phase 2 状态。
