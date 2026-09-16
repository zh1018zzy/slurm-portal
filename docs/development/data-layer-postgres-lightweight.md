# 数据层：当前设计与「仅 PostgreSQL」轻量化部署

> 目的：回答「库表设计是否合理」以及「能否不用 Supabase、只跑 PostgreSQL 以减轻部署」时的取舍与改造量。  
> 适用范围：架构选型、私有化/离线交付、运维精简场景。  
> 主入口链接：[docs/README.md](../README.md)  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`

## 当前设计是否合理（结论）

**整体合理**：业务数据以关系型表为主（用户、组、作业同步、权限与审计、通知等），与 HPC 管理域模型匹配；脚本与 `db/install/*.sql` 体现了可重复安装的意图。

**需注意的点**（与「是否用 Supabase」无关，自建 PG 也要面对）：

- **作业与 Slurm**：大量作业状态来自 Slurm/同步逻辑，库内多为缓存或历史；设计时区分「源数据在集群」与「平台侧副本」有助于排障。  
- **用户主数据**：LDAP/NIS 与库内 `users` 并存时，以谁为权威、同步与删除黑名单等要有运维约定（现有代码已部分体现）。  
- **权限模型**：`role_permissions` / `user_roles` 与 JWT 内 `role` / `isAdmin` 并存，默认角色兜底在 `lib/permission-checker.ts`；交付文档需写清「以库为准还是以 JWT 为准」的优先级，避免双轨误解。

---

## Supabase 在本项目里实际扮演什么角色

代码侧主要是 **`@supabase/supabase-js` + Service Role Key** 访问 **PostgreSQL**（`from().select/insert/update` 等），等价于「带官方 SDK 的 PG 客户端」。

**少量 Supabase 专有能力**：

- **`supabase.auth.admin`**：例如删除用户时尝试删除 Auth 侧用户（若未使用 Supabase Auth 登录链路，这段可能常为 no-op 或需跳过）。  
- **未大量使用** Realtime / Storage 作为核心路径时，迁移到纯 PG 的阻力主要在 **替换客户端与连接配置**，而非重写整个领域模型。

因此：**轻量化部署用「自建 PostgreSQL」在架构上是可行的**，工作量集中在工程改造而非推翻表设计。

---

## 若改为「仅 PostgreSQL」（轻量化）要做的事

| 方面 | 说明 |
|------|------|
| 连接与查询 | 用 `pg`、Drizzle、Prisma、Kysely 等替换 `createClient` + 链式 API；SQL 与表结构可沿用现有迁移/SQL。 |
| 环境变量 | 用 `DATABASE_URL`（或 host/port/user/password/db）替代 `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`；所有 `lib/*.ts` 与 `app/api/*` 中的 Supabase 客户端需逐步收口到统一数据访问层。 |
| Auth | 当前登录以 **LDAP/Linux + JWT** 为主时，**不依赖 Supabase Auth** 即可闭环；删除用户等处对 `auth.admin` 的调用应改为可选或删除。 |
| 通知 / 审计 | 仍为普通表 + 服务端写入，无必须绑 Supabase 的特性。 |
| 运维收益 | 少一个托管组件、镜像与网络更简单；代价是自管备份、版本、连接池与迁移流程。 |

**不推荐**在未抽象数据访问层的情况下「半套替换」：应优先做一个薄的 `db` 或 `repository` 层，再换实现，避免 50+ 文件散落 `createClient`。

---

## 小结

- **库表关系型设计**：对当前产品是合适的；优化重点在同步策略、权限与 JWT 一致性，而非是否叫「Supabase」。  
- **更轻部署**：**可以只用 PostgreSQL**；Supabase 在此更多是「PG + SDK + 可选 Auth」的打包，换成自建 PG 属于**中等规模重构**（替换客户端与配置），不是重新设计库表。  
- 若后续立项做迁移，建议在 [industry-delivery-hardening-plan.md](./industry-delivery-hardening-plan.md) 中单列「数据访问层抽象 + 去掉 supabase.auth 依赖」任务并验收。
