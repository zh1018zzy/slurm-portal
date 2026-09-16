# Contributing to my-hpcapp

感谢关注本项目。欢迎 Issue 与 Pull Request。

## 开发环境

1. Node.js ≥ 18，npm ≥ 9
2. `cp .env.example .env`，按注释填写（勿提交真实密钥）
3. 在 Supabase / PostgreSQL 执行 [`db/install/init-complete-simplified.sql`](db/install/init-complete-simplified.sql)（推荐）或 `init-complete.sql`
4. `npm install && npm run dev`

## 提交前检查

- `npm run lint`
- `npm run verify:i18n`
- 涉及 UI 文案时同步更新 `messages/zh.json` 与 `messages/en.json`
- 不要提交 `.env`、密钥、许可证私钥、客户环境数据

## Pull Request

- 说清动机与影响范围；大改动请先开 Issue 讨论
- 尽量小而聚焦；附上复现 / 验证步骤
- 默认目标分支：`main`

## 行为准则

请保持友好、就事论事。明显的骚扰或恶意内容会被关闭并可能封禁。

## 许可

贡献默认按 **AGPL-3.0** 授权，与仓库 `LICENSE` 一致。
