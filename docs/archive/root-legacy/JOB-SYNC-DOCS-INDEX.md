# HPC 平台 - 作业同步系统文档索引

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

> **最后更新**: 2025-11-07
> **文档版本**: v3.0
> **维护状态**: ✅ 已更新

---

## 📚 核心文档 (必读)

### 1. 完整技术文档 ⭐
**文件**: [`docs/system/JOB-SYNC-MECHANISM.md`](../../system/JOB-SYNC-MECHANISM.md)

**内容概览**:
- 系统概述与架构
- 三种同步模式详解 (智能/强制/每日)
- 过期作业检测机制 (NEW!)
- API 接口文档
- 数据流程与时序图
- 性能优化策略
- 故障排查指南
- 监控与维护手册

**适合人群**: 开发者、运维人员、系统管理员

**关键特性**:
- ✅ 完整的技术架构说明
- ✅ 详细的 API 接口文档
- ✅ 实用的故障排查清单
- ✅ 性能优化最佳实践

---

### 2. 优化记录
**文件**: [`docs/system/JOB-SYNC-OPTIMIZATION.md`](../../system/JOB-SYNC-OPTIMIZATION.md)

**内容概览**:
- 问题分析 (作业223状态不一致)
- 解决方案 (三种方案)
- 修复脚本使用说明
- 技术细节与代码示例

**适合人群**: 开发者、故障诊断

**关键内容**:
- ✅ 过期作业问题分析
- ✅ 修复脚本 `fix-stale-jobs.ts`
- ✅ 智能同步策略改进
- ✅ 日志优化说明

---

## 📖 快速开始

### 快速使用指南
**文件**: [`docs/features/jobs/smart-sync-quickstart.md`](../../features/jobs/smart-sync-quickstart.md)

**内容**: 5分钟快速了解作业同步系统

**状态**: ⚠️ 需要更新 (缺少过期作业检测说明)

---

### API 文档
**文件**: [`docs/features/jobs/smart-sync-api.md`](../../features/jobs/smart-sync-api.md)

**内容**: REST API 接口详细说明

**状态**: ⚠️ 需要更新 (API响应缺少新字段)

---

### 部署指南
**文件**: [`docs/features/jobs/smart-sync-deployment.md`](../../features/jobs/smart-sync-deployment.md)

**内容**: 生产环境部署步骤

**状态**: ⚠️ 需要验证更新

---

## 🧪 测试与维护

### 测试指南
**文件**: [`docs/features/jobs/sync-test-guide.md`](../../features/jobs/sync-test-guide.md)

**内容**: 功能测试、性能测试、压力测试

**状态**: ✅ 有效

---

## 🗂️ 相关文档

### 用户同步 (非作业同步)

| 文档 | 说明 | 状态 |
|------|------|------|
| [`ldap-user-sync.md`](../../features/jobs/ldap-user-sync.md) | LDAP 用户同步 | ✅ |
| [`user-deletion-sync.md`](../../features/jobs/user-deletion-sync.md) | 用户删除同步 | ✅ |
| [`user-home-directory-sync.md`](../../features/jobs/user-home-directory-sync.md) | 用户目录同步 | ✅ |

---

## 📦 工具脚本

### 修复工具
**文件**: `scripts/tools/fix-stale-jobs.ts`

**功能**: 检查并修复过期的 RUNNING/PENDING 作业

**使用方法**:
```bash
export SUPABASE_URL=http://your-url
export SUPABASE_SERVICE_ROLE_KEY=your-key
npx tsx scripts/tools/fix-stale-jobs.ts
```

---

### 后台同步服务
**文件**: `scripts/cron/start-job-sync.js`

**功能**: 60秒轮询同步服务

**使用方法**:
```bash
pm2 start scripts/cron/start-job-sync.js --name job-sync
pm2 logs job-sync
```

---

### 归档脚本
**文件**: `scripts/tools/archive-old-job-sync-docs.sh`

**功能**: 归档过期文档

**使用方法**:
```bash
bash scripts/tools/archive-old-job-sync-docs.sh
```

---

## 📂 归档文档

### 历史文档归档 (2025-11-07)
**目录**: [`docs/archive/job-sync-legacy-2025/`](../job-sync-legacy-2025/)

**归档文件数**: 11个

**查看索引**:
```bash
cat docs/archive/job-sync-legacy-2025/README.md
```

**归档原因**: v3.0 升级，文档过时或重复

---

## 🔗 外部资源

### SLURM 官方文档
- [SLURM 命令手册](https://slurm.schedmd.com/man_index.html)
- [squeue 文档](https://slurm.schedmd.com/squeue.html)
- [sacct 文档](https://slurm.schedmd.com/sacct.html)
- [scontrol 文档](https://slurm.schedmd.com/scontrol.html)

### Next.js / Supabase
- [Next.js 14 App Router](https://nextjs.org/docs/app)
- [Supabase 文档](https://supabase.com/docs)

---

## 📋 文档清单

### ✅ 最新有效文档 (2个)

- `docs/system/JOB-SYNC-MECHANISM.md` - v3.0 主文档
- `docs/system/JOB-SYNC-OPTIMIZATION.md` - 优化记录

### ⚠️ 需要更新 (3个)

- `docs/features/jobs/smart-sync-quickstart.md` - 快速开始
- `docs/features/jobs/smart-sync-api.md` - API 文档
- `docs/features/jobs/smart-sync-deployment.md` - 部署指南

### ✅ 其他有效文档 (4个)

- `docs/features/jobs/sync-test-guide.md` - 测试指南
- `docs/features/jobs/ldap-user-sync.md` - LDAP 用户同步
- `docs/features/jobs/user-deletion-sync.md` - 用户删除同步
- `docs/features/jobs/user-home-directory-sync.md` - 用户目录同步

### 📦 已归档 (11个)

- 查看 `docs/archive/job-sync-legacy-2025/README.md`

---

## 🎯 快速导航

### 我想...

- **了解作业同步系统** → [`JOB-SYNC-MECHANISM.md`](../../system/JOB-SYNC-MECHANISM.md) § 系统概述
- **部署作业同步** → [`smart-sync-deployment.md`](../../features/jobs/smart-sync-deployment.md)
- **修复作业状态问题** → [`JOB-SYNC-OPTIMIZATION.md`](../../system/JOB-SYNC-OPTIMIZATION.md)
- **调用同步 API** → [`smart-sync-api.md`](../../features/jobs/smart-sync-api.md)
- **运行修复脚本** → `scripts/tools/fix-stale-jobs.ts`
- **查看历史文档** → `docs/archive/job-sync-legacy-2025/`
- **进行性能优化** → [`JOB-SYNC-MECHANISM.md`](../../system/JOB-SYNC-MECHANISM.md) § 性能优化
- **故障排查** → [`JOB-SYNC-MECHANISM.md`](../../system/JOB-SYNC-MECHANISM.md) § 故障处理

---

## 📊 版本历史

### v3.0 (2025-11-07) - 当前版本

**新特性**:
- ✅ 过期作业自动检测和修复
- ✅ 智能同步每5分钟检查 RUNNING/PENDING 状态
- ✅ 修复长时间运行作业完成后状态不更新
- ✅ 日志优化，减少无用警告

**文档更新**:
- ✅ 创建完整技术文档 `JOB-SYNC-MECHANISM.md`
- ✅ 归档11个过期文档
- ✅ 创建文档索引

### v2.0 (2024-08)

**特性**:
- 智能同步系统上线
- 三种同步模式
- 通知系统集成
- 性能优化

### v1.0 (2024-07)

**特性**:
- 基础同步功能
- SLURM 集成
- 数据库同步

---

## 🔔 更新通知

### 下次文档审查
**日期**: 2025-12-07 (1个月后)

**审查内容**:
- [ ] 更新快速开始指南
- [ ] 验证 API 文档准确性
- [ ] 检查部署步骤
- [ ] 评估性能指标
- [ ] 审查归档文档是否需要

---

**文档维护**: HPC Platform Team
**联系方式**: 查看项目 README
**最后更新**: 2025-11-07
**文档版本**: v3.0
