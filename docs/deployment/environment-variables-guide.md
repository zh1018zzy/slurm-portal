# HPC平台环境变量配置指南

> 适用范围：部署流程、环境配置与发布运维
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 快速开始

### 1. 复制环境变量示例文件
```bash
cp env.example .env.local
```

### 2. 修改配置
根据实际环境修改 `.env.local` 文件中的配置值。

### 3. 验证配置
```bash
node scripts/validate-config.js
```

## 必需配置

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `SUPABASE_URL` | Supabase项目URL | `http://192.168.1.10:8000` |
| `SUPABASE_KEY` | Supabase匿名密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase服务角色密钥 | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `JWT_SECRET` | JWT签名密钥 | `your-secret-key-here` |

## 可选配置（推荐）

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `NEXT_PUBLIC_APP_URL` | 应用服务器URL | `http://localhost:3000` |
| `NEXT_PUBLIC_WEBSHELL_SERVER` | WebShell服务器地址 | `http://localhost:3001` |
| `NOVNC_GATEWAY` | noVNC网关地址 | `192.168.1.10` |
| `NOVNC_PORT` | noVNC网关端口 | `6080` |
| `DEFAULT_NODE_IP` | 默认节点IP地址 | `192.168.1.10` |

## 环境配置示例

### 开发环境
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_WEBSHELL_SERVER=http://localhost:3001
NOVNC_GATEWAY=localhost
NOVNC_PORT=6080
DEFAULT_NODE_IP=192.168.1.10
SUPABASE_URL=http://192.168.1.10:8000
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

### 生产环境
```bash
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_WEBSHELL_SERVER=https://webshell.your-domain.com
NOVNC_GATEWAY=your-vnc-gateway.com
NOVNC_PORT=6080
DEFAULT_NODE_IP=your-compute-node-ip
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
JWT_SECRET=your_secure_jwt_secret_here
NODE_ENV=production
```

## 配置验证

使用验证脚本检查配置：
```bash
node scripts/validate-config.js
```

## 常见问题

### Q: 如何获取Supabase配置？
A: 在Supabase项目控制台的API设置中获取。

### Q: 如何生成JWT密钥？
A: 使用命令：`openssl rand -base64 32`

### Q: 环境变量不生效怎么办？
A: 检查文件名、重启服务器、使用验证脚本检查。

## 安全注意事项

1. 不要在代码中硬编码敏感信息
2. 使用环境变量存储密钥和密码
3. 不要将包含敏感信息的文件提交到版本控制
4. 定期轮换JWT密钥
5. 不同环境使用不同的配置 
