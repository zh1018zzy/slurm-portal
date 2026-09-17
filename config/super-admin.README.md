# 超级管理员凭证（安装时生成，勿提交）

本文件仅作说明。真实凭证由安装脚本写入：

```bash
npm run setup:super-admin
```

生成文件：`config/super-admin.enc`

- 密码：scrypt 单向哈希（不明文）
- 文件：AES-256-GCM 加密（密钥为 `SUPER_ADMIN_CRYPTO_KEY` 或 `JWT_SECRET`）
- 权限：0600
