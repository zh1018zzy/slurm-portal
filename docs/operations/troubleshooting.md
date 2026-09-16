# 故障排查总入口（统一）

> 适用范围：线上运行异常、权限/认证、性能与配置故障排查
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

本页是项目统一故障排查入口，用于快速定位常见问题与历史案例。  
适用范围：线上运行异常、功能回归、性能波动、权限与认证故障。  
历史一次性记录请转 `docs/archive/README.md`，不要将其作为主路径入口。

## 快速分诊

1. **先看服务状态**
   - `pm2 status`
   - `pm2 logs`
2. **再看对应模块**
   - 认证/权限 → `docs/system/authentication/`、`docs/system/permissions/`
   - License → `docs/system/licensing/`
   - 作业与同步 → `docs/system/JOB-SYNC-MECHANISM.md`
   - WebShell/VNC → `docs/features/webshell/`、`docs/features/vnc/`
3. **最后查历史案例**
   - `docs/troubleshooting/`
   - `docs/archive/README.md`

## 常见问题入口

### 用户与权限

- `docs/operations/user-list-troubleshooting.md`
- `docs/system/authentication/user-identity-and-storage-path-fix.md`
- `docs/system/permissions/permission-system-quickstart.md`

### 作业与数据一致性

- `docs/system/JOB-SYNC-MECHANISM.md`
- `docs/system/JOB-SYNC-DEPLOYMENT-GUIDE.md`
- `docs/operations/repair-history-jobs-guide.md`

### 存储与系统设置

- `docs/operations/storage-monitoring.md`
- `docs/operations/system-settings-auto-save.md`
- `docs/operations/system-settings-layout.md`

### 许可证与授权

- `docs/system/licensing/README.md`
- `docs/system/licensing/LICENSE-ACTIVATION-GUIDE.md`
- `docs/system/licensing/LICENSE-WEB-ACTIVATION-GUIDE.md`

### 终端与远程访问

- `docs/features/webshell/webshell-troubleshooting.md`
- `docs/features/webshell/webshell-permission-troubleshooting.md`
- `docs/features/vnc/vnc-url-fix.md`

## 历史排障入口（只做参考）

- `docs/troubleshooting/LICENSE_ISSUE_RESOLUTION.md`
- `docs/troubleshooting/TRIAL_LICENSE_TESTING.md`
- `docs/troubleshooting/user-deletion-foreign-key-issue.md`

> 说明：历史排障记录可能受版本、环境、配置差异影响，复用前请先确认适用条件。
