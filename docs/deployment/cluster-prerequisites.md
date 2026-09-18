# 集群依赖与部署前检查清单

> 这是什么：开源版部署前，核对「本平台依赖的现有集群服务」是否就绪  
> 适用范围：新部署 / 客户现场 / 自建 **中小规模** Slurm 环境；读者为运维与交付  
> 主入口：`docs/README.md`  
> 文档状态：`active`  
> 最后验证日期：`2026-09-18`

## 结论

**slurm-portal 不会替你安装或改造整个 Slurm 集群。**  
它假定管理节点（或等价跳板）上已具备 Slurm、认证目录、共享存储，以及（可选）VNC/noVNC。  
当前仅支持 Slurm，不包含其他调度器适配。  
**推荐场景**：中小集群（常见为数十至约一两百计算节点），门户单实例部署在管理/登录节点即可。节点数与并发显著更高时，需自行评估 CLI 轮询、作业同步与 WebShell 会话压力，并考虑拆分或加固，而非默认「开箱即用」。  
部署时请先完成本清单，再执行 `npm run verify:env`。

## 推荐部署拓扑（中小集群）

```text
[浏览器]
    │
    ▼
[slurm-portal 主机]  ←── 建议：Slurm 管理节点或能执行 sbatch/squeue 的登录节点
    ├── Next.js (:3000)
    ├── WebShell (:3001，可选)
    ├── Job Sync（定时/常驻，可选）
    │
    ├──► Slurm（本机 CLI：sinfo / squeue / sbatch / scancel / sacct）
    ├──► PostgreSQL / Supabase（业务库）
    ├──► LDAP / NIS / 本地 Linux 用户（认证，三选一或组合）
    ├──► 共享家目录（NFS/并行文件系统，用户作业与文件）
    └──► TurboVNC + noVNC（可选图形桌面）
```

## 1. 必选依赖

### 1.1 主机与运行时

| 项 | 要求 | 自检 |
|----|------|------|
| OS | 常见 Linux（Ubuntu/RHEL 系均可） | `cat /etc/os-release` |
| Node.js | ≥ 18 | `node -v` |
| npm | ≥ 9 | `npm -v` |
| 网络 | 浏览器可达 `:3000`；按需开放 `:3001`、noVNC 端口 | 防火墙 / 安全组 |

### 1.2 Slurm 客户端

平台通过本机执行 Slurm 命令管理作业与节点，**必须**在运行 slurm-portal 的同一用户环境下可用：

| 命令 | 用途 |
|------|------|
| `sinfo` | 分区 / 节点状态 |
| `squeue` | 队列作业 |
| `sbatch` / `scancel` | 提交 / 取消 |
| `sacct` / `sacctmgr`（按功能） | 历史会计、账户开通（若启用） |

自检：

```bash
sinfo -V && sinfo -o "%P %a %l %D" | head
squeue -h | head
```

常见问题：`PATH` 未包含 `/usr/bin` 或 `/opt/slurm/bin`；应用由 systemd/PM2 启动时环境过窄。

### 1.3 数据库（Supabase / PostgreSQL）

| 项 | 说明 |
|----|------|
| `SUPABASE_URL` | 项目 URL 或自建 PostgREST/Supabase 兼容地址 |
| `SUPABASE_SERVICE_ROLE_KEY` | 服务端密钥（**勿**暴露到浏览器） |
| `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_*` | 按 `.env.example` 对齐 |

部署前在 SQL 控制台执行：

- 推荐：[`db/install/init-complete-simplified.sql`](../../db/install/init-complete-simplified.sql)
- 或完整版：[`db/install/init-complete.sql`](../../db/install/init-complete.sql)

说明见 [`db/install/README.md`](../../db/install/README.md)。

### 1.4 应用密钥与超级管理员

| 项 | 说明 |
|----|------|
| `JWT_SECRET` | 强随机字符串；禁止使用示例占位值 |
| `SUPER_ADMIN_CRYPTO_KEY` | 可选；不设则用 `JWT_SECRET` 加密超级管理员文件 |
| `config/super-admin.enc` | `npm run setup:super-admin` 生成（已 gitignore） |

### 1.5 认证模式

在 `.env` 中设置 `AUTH_MODE`：

| 模式 | 依赖 | 说明 |
|------|------|------|
| `linux` | 本机 PAM/系统用户 | 适合单机或已有本地账号的登录节点 |
| `ldap` | `LDAP_URL` / `LDAP_BASE_DN` / `LDAP_BIND_*` 等 | 见 `.env.example` LDAP 段 |
| NIS | 需系统侧已配 NIS，并与用户同步逻辑匹配 | 按现场文档启用 |

超级管理员**独立**于上述模式，安装时单独设置。

## 2. 强烈建议（多数生产环境）

| 依赖 | 为什么需要 | 配置入口 |
|------|------------|----------|
| 共享 `/home`（或统一前缀） | 作业脚本、用户文件、WebShell 家目录一致 | `userHomeDirectoryPrefix`（系统设置）+ 存储挂载 |
| 应用进程用户权限 | 能代表用户或通过 sudo/Slurm 提交 | 现场权限模型 |
| 时区 / NTP | 作业时间与报表一致 | `timedatectl` |
| 日志目录可写 | `logs/`、PM2 日志 | 部署用户写权限 |

## 3. 可选模块

### 3.1 WebShell

| 变量 | 说明 |
|------|------|
| `WEBSHELL_PORT` | 默认 `3001` |
| `NEXT_PUBLIC_WEBSHELL_SERVER` | 浏览器可达的 WebShell URL |
| `NEXT_PUBLIC_APP_URL` | 主站 URL |

需本机可分配 PTY（`node-pty`），且运行用户能切换到目标用户会话（按你的安全策略）。

### 3.2 VNC / noVNC

| 变量 | 说明 |
|------|------|
| `TURBO_VNC_PATH` | 如 `/opt/TurboVNC/bin` |
| `NOVNC_GATEWAY` / `NOVNC_PORT` | noVNC 网关地址与端口 |
| `VNC_NODE` / `DEFAULT_VNC_NODE_IP` | 图形节点 |

需集群已安装 TurboVNC（或兼容实现）与 noVNC，且计算节点网络对网关可达。

### 3.3 作业同步 / Cron

作业状态入库与通知依赖同步任务。参见：

- [`QUICK-START-CRON.md`](./QUICK-START-CRON.md)
- [`security-api-deployment-notes.md`](./security-api-deployment-notes.md)（`CRON_TRIGGER_SECRET` 等）

## 4. 推荐部署顺序

1. **确认集群侧**：Slurm CLI、认证、共享存储、（可选）VNC  
2. **准备数据库**：创建项目并执行 `db/install` SQL  
3. **配置环境**：`cp .env.example .env` 并填写  
4. **校验**：`npm run verify:env`  
5. **安装依赖并构建**：`npm install && npm run build`（或 `./install.sh`）  
6. **超级管理员**：`npm run setup:super-admin`  
7. **启动**：`npm run start` 或 `./start-pm2.sh`  
8. **冒烟**：超级管理员登录 → 看节点/分区 → 提交测试作业 →（可选）WebShell / VNC  

## 5. 一键校验

```bash
# 检查 .env + 本机 Slurm/Node/凭证文件等
npm run verify:env

# 指定其它 env 文件
npm run verify:env -- .env.production
```

脚本会区分 **错误（必选缺失）** 与 **警告（可选未配）**，并打印下一步链接到本文档。

## 6. 相关文档

- 根目录 [README.md](../../README.md) — 快速开始  
- [security-api-deployment-notes.md](./security-api-deployment-notes.md) — 安全相关环境变量  
- [deployment-quick-start.md](./deployment-quick-start.md) — PM2 启停  
- [db/install/README.md](../../db/install/README.md) — 数据库脚本  
- [operations/troubleshooting.md](../operations/troubleshooting.md) — 排障入口  
