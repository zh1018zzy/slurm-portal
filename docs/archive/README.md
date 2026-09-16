# 历史归档索引

> 适用范围：一次性排障、阶段总结、历史决策追溯（全项目）
> 主入口链接：`docs/archive/root-legacy/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

本页用于记录一次性排障、阶段性总结与状态报告。  
这些文档可用于追溯背景与决策过程，但不应作为主阅读路径。  
主入口请使用 `docs/archive/root-legacy/README.md`，排障请先看 `docs/operations/troubleshooting.md`。

## 归档索引

### 2026-03-28（仓库根目录 Markdown 迁入）

- **触发条件/适用范围**：与 `docs/` 同级的部署/脚本/索引类 `.md` 分散在仓库根目录，易与主入口脱节。
- **最终结论**：长期有效的迁入 `docs/deployment/`、`docs/operations/`、`docs/development/`；阶段性快照与旧版 `DOCS-INDEX` 放入 `docs/archive/repo-root/`；根目录保留精简 `README.md` 与 `DOCS-INDEX.md` 重定向。原根目录完整部署手册因 Git `ignorecase` 与既有 `deployment-guide.md` 撞名，落地为 `docs/deployment/root-deployment-guide.md`。
- **关联文档**：
  - `docs/archive/repo-root/README.md`
  - `docs/archive/repo-root/PROJECT-SUMMARY.md`
  - `docs/archive/repo-root/DEPLOYMENT-SUMMARY.md`
  - `docs/archive/repo-root/README-CRON-SETUP.md`
  - `docs/archive/repo-root/DOCS-INDEX.md`

### 2026-03-27（目录筛选清理）

- **触发条件/适用范围**：按项目现状进行文档筛选，识别草稿类与历史索引类文档，避免干扰主阅读路径。
- **最终结论**：`docs/need/`、`docs/marketing/` 及部分旧 guides 索引文档调整为归档状态，主入口仍统一走 `docs/archive/root-legacy/README.md`。
- **关联文档**：
  - `docs/need/sc_suggest.md`
  - `docs/need/qustion_check.md`
  - `docs/need/viewer.md`
  - `docs/marketing/hpc-platform-marketing-strategy.md`
  - `docs/guides/README.md`
  - `docs/guides/README-ENVIRONMENT.md`

### 2026-03-27（根目录文档收敛）

- **触发条件/适用范围**：根目录存在大量阶段性分析/优化文档，容易被误读为长期主文档。
- **最终结论**：将明显一次性或阶段性根目录文档统一标记为归档状态，主路径继续收敛到 `docs/archive/root-legacy/README.md`。
- **关联文档**：
  - `docs/archive/root-legacy/AI_INTEGRATION_PLAN.md`
  - `docs/archive/root-legacy/DASHBOARD_OPTIMIZATION.md`
  - `docs/archive/root-legacy/HPC_I18N_ARCHITECTURE_ANALYSIS.md`
  - `docs/archive/root-legacy/JOB-SYNC-DOCS-INDEX.md`
  - `docs/archive/root-legacy/JUPYTER_DEPLOYMENT_CHECKLIST.md`
  - `docs/archive/root-legacy/JUPYTER_ENTRY_RELOCATION.md`
  - `docs/archive/root-legacy/LOGIN_BEFORE_AFTER.md`
  - `docs/archive/root-legacy/LOGIN_PAGE_OPTIMIZATION.md`
  - `docs/archive/root-legacy/MENU_ACTIVE_STATE.md`
  - `docs/archive/root-legacy/TOOLBAR_OPTIMIZATION.md`
  - `docs/archive/root-legacy/dashboard-partition-empty-analysis.md`

### 2026-03-27（语义级深度收敛）

- **触发条件/适用范围**：继续按“长期有效 vs 阶段性产物”划分，清理根目录与 i18n 中仍被误标为 active 的过渡文档。
- **最终结论**：将 AI 代理指引、一次性集成说明、反篡改部署记录、系统设置实现说明及 i18n 过程性记录统一归档，保留核心入口与长期指南为主路径。
- **关联文档**：
  - `docs/archive/root-legacy/CLAUDE.md`
  - `docs/archive/root-legacy/CLAUDE_CN.md`
  - `docs/archive/root-legacy/JUPYTER_LAB_INTEGRATION.md`
  - `docs/archive/root-legacy/LICENSE_ANTI_TAMPER.md`
  - `docs/archive/root-legacy/system-settings-permission-control.md`
  - `docs/I18N/BUILD_NOTES.md`
  - `docs/I18N/I18N_NEXT_STEPS.md`
  - `docs/I18N/I18N_CHANGES.md`

### 2026-03-27（根目录终局收敛）

- **触发条件/适用范围**：根目录仍存在多篇专题文档，主入口与专题文档边界不够清晰。
- **最终结论**：将根目录专题文档统一归档，根目录仅保留主入口（`docs/archive/root-legacy/README.md`）与项目速览（`docs/project-overview.md`）作为 active。
- **关联文档**：
  - `docs/archive/root-legacy/DEPLOYMENT.md`
  - `docs/archive/root-legacy/DEPLOYMENT_QUICKSTART.md`
  - `docs/archive/root-legacy/FRONTEND_STYLE_GUIDE.md`
  - `docs/archive/root-legacy/LICENSE_WORKFLOW.md`
  - `docs/archive/root-legacy/LOGIN_CUSTOMIZATION_GUIDE.md`
  - `docs/archive/root-legacy/super-admin-guide.md`

### 2026-03-27

- **触发条件/适用范围**：文档治理整理（全仓库，历史文档结构收敛）
- **最终结论**：建立统一主入口与统一排障入口；阶段性与一次性文档走归档索引，不再分散作为主路径。
- **关联文档**：
  - `docs/I18N/I18N_FINAL_STATUS.md`
  - `docs/I18N/I18N_COMPLETE_SUMMARY.md`
  - `docs/features/applications/AI_DEPLOYMENT_SUCCESS.md`
  - `docs/archive/root-legacy/OPTIMIZATION_COMPLETE_SUMMARY.md`
  - `docs/archive/root-legacy/ALL_PAGES_OPTIMIZATION_COMPLETE.md`
  - `docs/archive/root-legacy/DOCUMENTATION-CLEANUP-REPORT.md`

### 2026-03-27（批量补登记）

- **触发条件/适用范围**：v2 文档治理巡检发现大量阶段性/一次性文档未纳入归档索引。
- **最终结论**：完成批量归档登记，明确这些文档仅用于追溯与参考，主阅读路径仍以 `docs/archive/root-legacy/README.md` 与 `docs/operations/troubleshooting.md` 为准。
- **关联文档**：
  - `docs/I18N/I18N_COMPLETION_SUMMARY.md`
  - `docs/I18N/I18N_FINAL_REPORT.md`
  - `docs/I18N/I18N_IMPLEMENTATION_COMPLETE.md`
  - `docs/I18N/I18N_README.md`
  - `docs/I18N/I18N_SETUP_SUMMARY.md`
  - `docs/archive/root-legacy/dashboard-partition-empty-analysis.md`
  - `docs/db/DATABASE_CLEANUP_SUMMARY.md`
  - `docs/db/DATABASE_FINAL_SUMMARY.md`
  - `docs/db/DATABASE_OVERHAUL_COMPLETE.md`
  - `docs/db/USER_DELETION_FIX_SUMMARY.md`
  - `docs/deployment/QUICK-START-CRON.md`
  - `docs/deployment/pm2-deployment-status.md`
  - `docs/features/applications/AI_DEPLOYMENT_CHECKLIST.md`
  - `docs/features/applications/AI_IMPLEMENTATION_SUMMARY.md`
  - `docs/features/applications/hpc-application-center-implementation-guide.md`
  - `docs/features/files/file-cache-optimization-summary.md`
  - `docs/features/files/file-delete-fix-summary.md`
  - `docs/features/files/file-path-unification-summary.md`
  - `docs/features/files/file-permission-implementation.md`
  - `docs/features/files/file-permission-system-summary.md`
  - `docs/features/files/file-permission-technical-implementation.md`
  - `docs/features/files/gaussian-file-upload-fix-summary.md`
  - `docs/features/files/gaussian-file-upload-implementation.md`
  - `docs/features/jobs/active-jobs-optimization.md`
  - `docs/features/jobs/job-notification-api.md`
  - `docs/features/jobs/job-notification-system.md`
  - `docs/features/jobs/job-stats-optimization.md`
  - `docs/features/jobs/job-status-consistency-fix.md`
  - `docs/features/jobs/job-submission-fix-summary.md`
  - `docs/features/jobs/jobs-page-performance-optimization.md`
  - `docs/features/vnc/vnc-button-fix.md`
  - `docs/features/vnc/vnc-env-simplification-summary.md`
  - `docs/features/vnc/vnc-host-parameter-fix.md`
  - `docs/features/vnc/vnc-page-fix-summary.md`
  - `docs/features/vnc/vnc-sse-implementation.md`
  - `docs/features/vnc/vnc-url-fix.md`
  - `docs/features/webshell/webshell-permission-summary.md`
  - `docs/need/sc_suggest.md`
  - `docs/performance/optimization/performance-optimization-summary.md`
  - `docs/performance/optimization/performance-optimization.md`
  - `docs/performance/optimization/trend-api-optimization.md`
  - `docs/system/copyright-implementation-summary.md`
  - `docs/system/database-integration.md`
  - `docs/system/licensing/LICENSE-SECURITY-SUMMARY.md`
  - `docs/system/licensing/README.md`
  - `docs/system/licensing/archive/LICENSE-CLEANUP-PLAN.md`
  - `docs/system/licensing/archive/LICENSE-CLEANUP-SUMMARY.md`
  - `docs/system/licensing/archive/LICENSE-VALIDATION-SCRIPT-UPDATE.md`
  - `docs/system/licensing/archive/license-check-implementation.md`
  - `docs/system/permissions/NIS-IMPLEMENTATION-SUMMARY.md`
  - `docs/system/permissions/permission-system-fix-summary.md`
  - `docs/troubleshooting/LICENSE_ISSUE_RESOLUTION.md`

### 2025-01-01（历史归档）

- **触发条件/适用范围**：作业同步机制历史迭代（legacy）
- **最终结论**：保留历史实现与排障过程，当前主路径以系统文档与统一排障入口为准。
- **关联文档**：
  - `docs/archive/job-sync-legacy-2025/README.md`
  - `docs/archive/job-sync-legacy-2025/`

## 使用规范

- 新增一次性文档时，必须在本页补充：
  - 时间（YYYY-MM-DD）
  - 触发条件/适用范围
  - 最终结论（1-3 行）
- 若旧文档已过时，保留原文并在文首增加“已归档/新入口”提示
