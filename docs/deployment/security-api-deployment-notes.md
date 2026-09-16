# 部署注意：安全相关 API 与环境变量（Phase 1 起）

> 目的：记录 **Phase 1 高危 API 鉴权** 上线后，运维与交付必须配置的环境变量、调用方式与验收要点，避免遗漏导致脚本失败或误开放接口。  
> 适用范围：生产/预发部署、客户现场移交、二次开发对接；与 Next.js 应用进程同一套环境变量。  
> 主入口链接：[docs/README.md](../README.md)  
> 路线图与后续阶段：[docs/development/industry-delivery-hardening-plan.md](../development/industry-delivery-hardening-plan.md)  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`（含 readiness 探针说明）

## 结论（部署前必读）

1. **`POST /api/cron/trigger` 不可再匿名调用**。自动化脚本须配置 **`CRON_TRIGGER_SECRET`**，并在请求中携带 **`x-cron-secret`**；或由已登录**管理员**在带 `Authorization: Bearer <JWT>` 的情况下调用。  
2. **`GET /api/admin/token`** 仅接受**已登录管理员**的会话 JWT；用于换取管理端 service token（如文件权限 API）。勿将备用 JWT 写入前端代码或仓库。  
3. **`POST /api/upload`** 须带用户 JWT；**系统 Logo**（`purpose=logo`）仅**管理员**可改。管理后台「系统设置」上传已自动带鉴权头，直接 `curl` 上传须自行加 `Authorization`。  
4. **`/api/admin/file-permissions`** 的 Bearer token 须为**具备管理员载荷的 JWT**（通常为通过 `/api/admin/token` 换取的 service token，且签发侧 `isAdmin`/角色与 [`lib/admin-utils.ts`](../../lib/admin-utils.ts) 一致）。  
5. **用户相关 API**（`/api/users` 列表与创建、`/api/users/sync` 等）须携带有效用户 JWT，且满足 RBAC/默认角色策略；详见 [`docs/development/api-permission-matrix.md`](../development/api-permission-matrix.md)。仪表盘用的 `GET /api/users?stats=active|department` 仅需登录。

---

## 环境变量一览（关键信息）

| 变量名 | 是否新增语义 | 说明 |
|--------|----------------|------|
| `CRON_TRIGGER_SECRET` | **建议生产必配**（若存在无登录触发同步需求） | 强随机字符串；仅服务端保存。请求头 `x-cron-secret` 必须与本变量**完全一致**（区分大小写、首尾空格已在代码中 trim）。未设置时，仅**管理员 JWT** 可触发 `POST /api/cron/trigger`。 |
| `JWT_SECRET` | 既有 | 用户会话 JWT 签名密钥；生产**必须**显式设置，勿使用代码内默认值。 |
| `ADMIN_TOKEN` | 既有 | 若设置，[`getAdminToken()`](../../lib/admin-config.ts) 优先返回该固定 token；仍须通过 `/api/admin/token` 且调用者为管理员才会下发给前端。 |

**密钥管理约定**：上述密钥仅写入服务器环境（如 `.env`、systemd、`pm2 ecosystem` 注入），**禁止**提交到 Git；客户移交时单独提供《环境变量清单》或安全渠道传递。

---

## 接口行为速查

| 方法 | 路径 | 鉴权要求 |
|------|------|----------|
| GET | `/api/admin/token` | `Authorization: Bearer <用户JWT>`，且用户为管理员（含 `system_admin` / `super_admin` 等与中间件一致的角色） |
| GET/POST/DELETE | `/api/admin/file-permissions` | `Authorization: Bearer <JWT>`，载荷须满足管理员判定（见 `isJwtPayloadAdmin`） |
| POST | `/api/cron/trigger` | 管理员 JWT **或** `x-cron-secret` = `CRON_TRIGGER_SECRET`（当该变量已设置）；二者满足其一即可 |
| POST | `/api/upload` | 任意有效用户 JWT；`purpose=logo` 时须管理员 |

---

## 运维命令示例

### 使用密钥触发作业同步（推荐用于 Cron 脚本）

```bash
# 与应用相同环境中已 export CRON_TRIGGER_SECRET=.... 
curl -sS -X POST "https://<应用主机>/api/cron/trigger" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: ${CRON_TRIGGER_SECRET}" \
  -d '{"type":"daily"}'
```

`type` 取值：`daily` 或 `weekly`。

### 使用管理员 JWT 触发（人工或已登录场景）

```bash
curl -sS -X POST "https://<应用主机>/api/cron/trigger" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <管理员 JWT>" \
  -d '{"type":"daily"}'
```

更完整的 Cron 部署步骤与状态接口说明见：[QUICK-START-CRON.md](./QUICK-START-CRON.md)。

---

## 健康检查与 Readiness（Kubernetes / 负载均衡）

- **存活**：`GET /api/health` — 仅进程信息，默认 200。  
- **就绪（可选依赖）**：`GET /api/health?readiness=1`（或 `type=readiness`）。  
  - `HEALTH_CHECK_DATABASE=true`：对 Supabase/PG 执行 `users` 表最小查询。  
  - `HEALTH_CHECK_SLURM=true`：执行 `sinfo -V`（需调度节点安装 Slurm 客户端且 PATH 可用）。  
  - `HEALTH_CHECK_LDAP=true`：使用 `LDAP_URL` + `LDAP_BIND_DN` + `LDAP_BIND_PASSWORD` 执行 bind 探测。  
  - 未开启任何开关时仍返回 200，`checks` 为空对象。  
  - 任一已启用检查失败时 HTTP **503**，`status` 为 `degraded`。  

实现入口：`app/api/health/route.ts`、`lib/readiness-checks.ts`。

---

## 升级与验收清单（Checklist）

- [ ] 生产环境已设置强随机 `JWT_SECRET`。  
- [ ] 若使用外部脚本调用 `/api/cron/trigger`：已设置 `CRON_TRIGGER_SECRET` 并已更新 crontab/脚本中的 `curl`（含 `x-cron-secret`）。  
- [ ] 未在仓库或镜像中硬编码任何 JWT、管理员 token 或 `CRON_TRIGGER_SECRET`。  
- [ ] 文件权限管理、组文件权限等管理功能：使用管理员账号在界面验证可正常加载与保存。  
- [ ] 系统 Logo 上传：管理员账号成功；非管理员应收到 403（若暴露该 API）。  
- [ ] （可选）编排 Readiness 已配置 `readiness=1` 与上述环境变量，并在目标环境验证行为符合预期。

---

## 相关代码与文档

- 路线图与 Phase 2+：[industry-delivery-hardening-plan.md](../development/industry-delivery-hardening-plan.md)  
- Cron 快速步骤：[QUICK-START-CRON.md](./QUICK-START-CRON.md)  
- 管理员角色判定：`lib/admin-utils.ts`（`isJwtPayloadAdmin`）、`lib/permission-middleware.ts`（`isAdmin`）
