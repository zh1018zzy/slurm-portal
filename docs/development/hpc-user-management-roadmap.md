# HPC 一站式用户管理路线图

> 目标：与行业典型集群运维对齐（POSIX / Slurm / 门户生命周期一致可运维）。  
> 状态：`active` · 最后更新：2026-03-28

## 阶段划分

| 阶段 | 内容 | 验收要点 |
|------|------|----------|
| **Phase 1（已启动）** | 门户账号冻结、`ssh_public_keys` 存库与自助维护、可选 `sacctmgr` 开户/销户 | 冻结用户无法门户登录；密钥经 OpenSSH 格式校验；`SLURM_ACCOUNT_PROVISIONING=true` 时创建/删除用户触发 sacctmgr（失败记日志） |
| **Phase 2** | 主组/附属组与开户默认组策略、批量导入 CSV、管理端操作审计落库 | 新建用户可选主 GID/组；批量幂等；用户管理类操作写入审计表 |
| **Phase 3** | Slurm Account/QOS/Partition 与项目维度、登录节点 `authorized_keys` 同步机制（独立 agent 或 LDAP `sshPublicKey`） | 与调度策略文档一致；密钥下发与平台解耦或可配置 |
| **Phase 4** | 账号到期、软删除恢复、与存储配额/NIS 策略联动仪表盘 | 到期前通知；运维可恢复误删 |

## 环境变量（Phase 1）

| 变量 | 说明 |
|------|------|
| `SLURM_ACCOUNT_PROVISIONING` | 设为 `true` 时，创建/删除业务用户后尝试 `sacctmgr` 增删 Slurm 用户 |
| `SLURM_DEFAULT_ACCOUNT` | Slurm 默认账户名（如 `compute`），须已在集群中存在（除非运维预创建） |
| `SLURM_SACCTMGR_PATH` | 可选，默认 `sacctmgr` |

## 数据库变更

执行 `scripts/migrations/002_hpc_user_cluster_fields.sql`（现有库），新装可在 `init-complete*.sql` 中已含同名列。
