# Security Policy

## 支持版本

请优先在最新的 `main` / Release 上报告问题。

## 报告漏洞

**请勿在公开 Issue 中披露未修复的安全漏洞。**

优先使用 GitHub 仓库的 **Security Advisories**（私密报告）提交，包括：

- 影响版本与复现步骤
- 预期影响（例如未授权访问、密钥泄露、RCE）
- 若方便，附修复建议

我们会确认收到并跟进修复与披露节奏。

## 密钥与部署

- 切勿把 `.env`、私钥、生产数据库转储提交到本仓库
- 若怀疑密钥曾进入 git 历史或工单附件，请立即轮换（JWT、Supabase service role、LDAP bind 等）
