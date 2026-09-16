# HPC 平台生产环境部署文档

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 目录

1. [概述](#概述)
2. [环境变量说明](#环境变量说明)
3. [本地编译打包](#本地编译打包)
4. [客户环境部署](#客户环境部署)
5. [环境变量配置指南](#环境变量配置指南)
6. [常见问题](#常见问题)
7. [故障排查](#故障排查)

---

## 概述

### 部署架构

HPC 平台采用 **Next.js Standalone** 模式进行生产环境部署：

- **本地编译**：在开发环境完成应用编译和打包
- **离线部署**：将编译产物传输到客户环境
- **最小依赖**：客户环境仅需 Node.js 运行时

### 部署流程

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  本地开发   │ ───> │   编译打包   │ ───> │ 客户环境    │
│  环境       │      │   + 配置     │      │   安装      │
└─────────────┘      └──────────────┘      └─────────────┘
     ↓                      ↓                      ↓
  开发调试            生成部署包              解压运行
```

---

## 环境变量说明

### 重要概念：编译时 vs 运行时变量

Next.js 应用中的环境变量分为两类：

#### **[编译时] 变量**

- **标识**：以 `NEXT_PUBLIC_` 开头
- **特点**：会被编译到客户端 JavaScript 代码中
- **影响**：打包时的值会被固化到代码中
- **修改方式**：必须重新编译应用

**关键编译时变量列表：**

| 变量名 | 说明 | 影响范围 |
|--------|------|---------|
| `NEXT_PUBLIC_BASE_URL` | 应用基础URL | 客户端路由、API调用 |
| `NEXT_PUBLIC_WEBSHELL_SERVER` | WebShell 服务器地址 | WebShell 连接 |
| `NEXT_PUBLIC_APP_URL` | 应用访问地址 | WebSocket 连接 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 访问地址 | 客户端数据库访问 |
| `NEXT_PUBLIC_GRAFANA_URL` | Grafana 监控地址 | 监控图表展示 |
| `NEXT_PUBLIC_USER_EMAIL_DOMAIN` | 用户邮箱域名 | 邮箱验证 |
| `NEXT_PUBLIC_SESSION_EXPIRE_MINUTES` | 会话过期时间 | 前端会话管理 |

#### **[运行时] 变量**

- **特点**：仅在服务器端使用
- **影响**：部署后可修改
- **修改方式**：修改 `.env` 文件，重启服务即可

**关键运行时变量列表：**

| 变量名 | 说明 | 必需 |
|--------|------|------|
| `SUPABASE_URL` | Supabase 服务地址 | 是 |
| `SUPABASE_ANON_KEY` | Supabase 匿名密钥 | 是 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥 | 是 |
| `AUTH_MODE` | 认证模式 (linux/ldap) | 是 |
| `LDAP_URL` | LDAP 服务器地址 | 条件 |
| `LDAP_BIND_DN` | LDAP 绑定DN | 条件 |
| `LDAP_BIND_PASSWORD` | LDAP 密码 | 条件 |
| `JWT_SECRET` | JWT 密钥 | 是 |
| `VNC_NODE` | VNC 节点地址 | 是 |
| `NOVNC_GATEWAY` | noVNC 网关地址 | 是 |

---

## 本地编译打包

### 前置要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- 磁盘空间 >= 2GB

### 步骤 1：配置编译时环境变量

**重要**：在编译前，需要配置客户环境的编译时变量。

有两种方式：

#### 方式 A：使用客户环境的实际值（推荐）

创建 `.env.production` 文件：

```bash
# 客户环境的实际配置
NEXT_PUBLIC_BASE_URL=http://客户服务器IP:3000
NEXT_PUBLIC_WEBSHELL_SERVER=http://客户服务器IP:3001
NEXT_PUBLIC_APP_URL=http://客户服务器IP:3000
NEXT_PUBLIC_SUPABASE_URL=http://客户Supabase地址:8000
NEXT_PUBLIC_GRAFANA_URL=http://客户Grafana地址:3000
NEXT_PUBLIC_USER_EMAIL_DOMAIN=customer-domain.com
NEXT_PUBLIC_SESSION_EXPIRE_MINUTES=120
```

#### 方式 B：使用占位符（需要客户环境重新编译）

使用占位符值，在客户环境提供重新编译能力：

```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3000
# 其他变量使用默认值
```

### 步骤 2：执行编译打包

```bash
# 赋予执行权限
chmod +x scripts/deployment/build-production.sh

# 执行打包脚本
./scripts/deployment/build-production.sh
```

### 步骤 3：验证打包产物

打包完成后，会在 `dist/` 目录生成：

```
dist/
└── hpc-platform-0.1.0-20231206_123456/
    ├── app/                    # 应用程序
    ├── config/                 # 配置文件
    ├── scripts/                # 运维脚本
    ├── .env.template           # 环境变量模板
    ├── README.md               # 说明文档
    └── VERSION.json            # 版本信息

dist/hpc-platform-0.1.0-20231206_123456.tar.gz  # 压缩包
```

### 步骤 4：传输到客户环境

```bash
# 使用 scp
scp dist/hpc-platform-*.tar.gz user@customer-server:/tmp/

# 或使用 rsync
rsync -avz dist/hpc-platform-*.tar.gz user@customer-server:/tmp/
```

---

## 客户环境部署

### 前置要求

**必需软件：**
- Node.js >= 18.0.0
- Linux 操作系统（CentOS 7+、Ubuntu 18.04+、RHEL 7+）

**可选软件：**
- PM2（进程管理）
- systemd（系统服务）
- firewalld 或 ufw（防火墙）

### 步骤 1：解压部署包

```bash
# 创建临时目录
mkdir -p ~/hpc-deploy
cd ~/hpc-deploy

# 解压
tar -xzf /tmp/hpc-platform-*.tar.gz
cd hpc-platform-*
```

### 步骤 2：配置环境变量

```bash
# 复制环境变量模板
cp .env.template .env

# 编辑配置文件
vim .env
```

**配置示例（完整版）：**

```bash
# ==========================================
# 数据库配置
# ==========================================
SUPABASE_URL=http://192.168.1.100:8000
SUPABASE_ANON_KEY=your-actual-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key
NEXT_PUBLIC_SUPABASE_URL=http://192.168.1.100:8000

# ==========================================
# 认证配置
# ==========================================
AUTH_MODE=ldap

# LDAP 配置
LDAP_URL=ldap://192.168.1.100:389
LDAP_BASE_DN=dc=company,dc=com
LDAP_BIND_DN=cn=admin,dc=company,dc=com
LDAP_BIND_PASSWORD=admin_password
LDAP_USERS_OU=ou=users
LDAP_USER_OBJECTCLASS=inetOrgPerson,posixAccount,top
LDAP_UID_MIN=2000
LDAP_GID_MIN=2000
LDAP_HOME_PREFIX=/home
LDAP_PASSWORD_HASH=ssha
LDAP_DEFAULT_GID=2000

NEXT_PUBLIC_USER_EMAIL_DOMAIN=company.com

# ==========================================
# 应用配置
# ==========================================
NEXT_PUBLIC_BASE_URL=http://192.168.1.200:3000
NEXT_PUBLIC_APP_URL=http://192.168.1.200:3000
NEXT_PUBLIC_WEBSHELL_SERVER=http://192.168.1.200:3001
WEBSHELL_PORT=3001
NEXT_PUBLIC_SESSION_EXPIRE_MINUTES=120

# ==========================================
# VNC 配置
# ==========================================
VNC_NODE=192.168.1.101
NOVNC_GATEWAY=192.168.1.101
NOVNC_PORT=6080
NODE_IP_MAP='{"compute01":"192.168.1.101","compute02":"192.168.1.102"}'
TURBO_VNC_PATH="/opt/TurboVNC/bin/"
DEFAULT_VNC_NODE_IP=192.168.1.101

# ==========================================
# 监控配置
# ==========================================
NEXT_PUBLIC_GRAFANA_URL=http://192.168.1.103:3000

# ==========================================
# 安全配置
# ==========================================
JWT_SECRET=your-random-secret-string-here-min-32-chars
LICENSE_FILE_PATH=config/license.json
LICENSE_PUBLIC_KEY_PATH=config/license-public.pem

# ==========================================
# 运行环境
# ==========================================
NODE_ENV=production
LOG_LEVEL=INFO
NEXT_TELEMETRY_DISABLED=1
```

### 步骤 3：执行安装脚本

```bash
# 赋予执行权限
chmod +x scripts/deployment/install.sh

# 执行安装（将引导完成配置）
./scripts/deployment/install.sh
```

安装脚本会：
1. ✓ 检查系统要求
2. ✓ 确认环境变量配置
3. ✓ 选择安装位置（默认 `/opt/hpc-platform`）
4. ✓ 复制应用文件
5. ✓ 创建 systemd 服务
6. ✓ 配置防火墙（可选）
7. ✓ 执行安装后检查

### 步骤 4：启动服务

#### 使用 systemd（推荐）

```bash
# 启动服务
sudo systemctl start hpc-platform

# 查看状态
sudo systemctl status hpc-platform

# 开机自启
sudo systemctl enable hpc-platform

# 查看日志
sudo journalctl -u hpc-platform -f
```

#### 使用 PM2

```bash
cd /opt/hpc-platform

# 启动
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 配置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs hpc-platform
```

#### 直接启动（测试用）

```bash
cd /opt/hpc-platform
node server.js
```

### 步骤 5：验证部署

```bash
# 检查端口监听
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001

# 访问健康检查接口
curl http://localhost:3000/api/health

# 浏览器访问
http://服务器IP:3000
```

---

## 环境变量配置指南

### 场景 1：编译时变量与客户环境一致

如果打包时使用了客户环境的实际值，直接部署即可。

```bash
# .env 文件中的 NEXT_PUBLIC_* 变量与打包时一致
# 无需特殊操作
```

### 场景 2：编译时变量与客户环境不一致

#### 情况 A：IP 地址变化

**问题**：打包时使用 `192.168.1.100`，客户环境实际是 `10.0.0.50`

**解决方案 1**：重新打包（推荐）

```bash
# 返回开发环境，修改 .env.production
NEXT_PUBLIC_BASE_URL=http://10.0.0.50:3000
NEXT_PUBLIC_WEBSHELL_SERVER=http://10.0.0.50:3001

# 重新打包
./scripts/deployment/build-production.sh
```

**解决方案 2**：客户环境重新编译

```bash
# 在客户环境，需要完整的 node_modules
# 1. 解压源代码包（非 standalone 包）
# 2. 安装依赖
npm ci

# 3. 配置环境变量
export NEXT_PUBLIC_BASE_URL=http://10.0.0.50:3000
export NEXT_PUBLIC_WEBSHELL_SERVER=http://10.0.0.50:3001

# 4. 重新编译
npm run build

# 5. 使用新的编译产物
```

#### 情况 B：域名部署

**打包时配置**：

```bash
NEXT_PUBLIC_BASE_URL=https://hpc.company.com
NEXT_PUBLIC_WEBSHELL_SERVER=https://hpc.company.com:3001
```

### 场景 3：多环境部署

为不同客户准备不同的配置文件：

```bash
# 客户 A
.env.production.customer-a

# 客户 B
.env.production.customer-b

# 打包时指定
cp .env.production.customer-a .env.production
./scripts/deployment/build-production.sh
```

### 配置检查清单

部署前检查：

- [ ] 数据库地址和密钥是否正确
- [ ] LDAP 配置是否匹配客户环境
- [ ] WebShell 服务器地址是否可访问
- [ ] VNC 节点配置是否正确
- [ ] Grafana 监控地址是否配置
- [ ] JWT_SECRET 是否已修改（不使用默认值）
- [ ] 编译时变量（NEXT_PUBLIC_*）是否与实际环境一致

---

## 常见问题

### Q1: 如何判断是否需要重新编译？

**A**: 检查以下变量是否与打包时不同：

```bash
# 查看当前 .env 中的编译时变量
grep "^NEXT_PUBLIC_" .env

# 如果这些值与打包时不同，需要重新编译
```

### Q2: 部署后修改了 NEXT_PUBLIC_* 变量，为什么不生效？

**A**: 因为这些变量已被编译到客户端代码中，必须重新编译才能生效。

### Q3: 如何更新应用版本？

**A**:

```bash
# 1. 停止服务
sudo systemctl stop hpc-platform

# 2. 备份当前安装
sudo cp -r /opt/hpc-platform /opt/hpc-platform.backup

# 3. 部署新版本（使用 install.sh，选择覆盖）

# 4. 启动服务
sudo systemctl start hpc-platform
```

### Q4: 如何在离线环境部署？

**A**: 打包时已包含所有运行时依赖（standalone 模式），客户环境仅需 Node.js 即可。

### Q5: WebShell 无法连接怎么办？

**A**:

```bash
# 1. 检查 WebShell 服务是否运行
netstat -tlnp | grep 3001

# 2. 检查客户端配置
# 浏览器访问的地址必须与 NEXT_PUBLIC_WEBSHELL_SERVER 一致

# 3. 检查防火墙
sudo firewall-cmd --list-ports

# 4. 查看 WebShell 日志
tail -f /opt/hpc-platform/logs/webshell.log
```

### Q6: 如何修改端口？

**A**:

运行时修改（主应用端口）：

```bash
# 编辑 .env
PORT=8080

# 重启服务
sudo systemctl restart hpc-platform
```

编译时修改（WebShell 等）：

```bash
# 需要重新编译，修改
NEXT_PUBLIC_WEBSHELL_SERVER=http://服务器IP:新端口
```

---

## 故障排查

### 服务无法启动

**检查步骤：**

```bash
# 1. 查看服务状态
sudo systemctl status hpc-platform

# 2. 查看详细日志
sudo journalctl -u hpc-platform -n 100

# 3. 查看应用日志
tail -f /opt/hpc-platform/logs/error.log

# 4. 检查端口占用
netstat -tlnp | grep :3000

# 5. 验证配置文件
node -e "require('dotenv').config({path:'/opt/hpc-platform/.env'}); console.log(process.env.SUPABASE_URL)"
```

**常见错误：**

1. **数据库连接失败**
   ```
   Error: connect ECONNREFUSED 192.168.1.100:8000
   ```
   解决：检查 `SUPABASE_URL` 配置和数据库服务状态

2. **LDAP 连接失败**
   ```
   Error: LDAP bind failed
   ```
   解决：检查 `LDAP_URL`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`

3. **端口被占用**
   ```
   Error: listen EADDRINUSE: address already in use :::3000
   ```
   解决：修改 `.env` 中的 `PORT` 配置

### 客户端访问错误

**问题：客户端无法加载**

```bash
# 检查浏览器控制台，常见错误：

# 1. WebSocket 连接失败
WebSocket connection to 'ws://wrong-ip:3001' failed

# 原因：NEXT_PUBLIC_WEBSHELL_SERVER 配置错误
# 解决：重新编译或修改客户端代理配置

# 2. API 调用失败
Failed to fetch: http://wrong-ip:3000/api/...

# 原因：NEXT_PUBLIC_BASE_URL 配置错误
# 解决：重新编译
```

### 性能问题

```bash
# 1. 检查内存使用
free -h
ps aux | grep node

# 2. 检查 CPU 使用
top -p $(pgrep -f 'node.*server.js')

# 3. 调整 Node.js 内存限制
# 编辑 systemd 服务文件
sudo vim /etc/systemd/system/hpc-platform.service

# 添加环境变量
Environment=NODE_OPTIONS="--max-old-space-size=4096"

# 重载并重启
sudo systemctl daemon-reload
sudo systemctl restart hpc-platform
```

### 日志分析

```bash
# 应用日志
tail -f /opt/hpc-platform/logs/app.log

# 错误日志
tail -f /opt/hpc-platform/logs/error.log

# WebShell 日志
tail -f /opt/hpc-platform/logs/webshell.log

# 系统日志
sudo journalctl -u hpc-platform -f

# PM2 日志
pm2 logs hpc-platform
```

---

## 附录

### A. 完整的环境变量列表

参考 `.env.template` 文件。

### B. 目录结构说明

```
/opt/hpc-platform/
├── server.js              # 应用入口
├── .next/                 # Next.js 构建产物
│   ├── standalone/        # Standalone 服务器
│   └── static/            # 静态资源
├── public/                # 公共资源
│   └── uploads/           # 上传文件
├── config/                # 配置文件
│   ├── system-settings.json
│   ├── license.json
│   └── license-public.pem
├── scripts/               # 运维脚本
│   ├── operations/
│   └── tools/
├── logs/                  # 日志文件
├── data/                  # 数据文件
├── backup/                # 备份文件
├── .env                   # 环境变量
└── ecosystem.config.js    # PM2 配置
```

### C. 系统服务管理

```bash
# systemd 服务命令
sudo systemctl start hpc-platform      # 启动
sudo systemctl stop hpc-platform       # 停止
sudo systemctl restart hpc-platform    # 重启
sudo systemctl status hpc-platform     # 状态
sudo systemctl enable hpc-platform     # 开机自启
sudo systemctl disable hpc-platform    # 禁用自启

# PM2 命令
pm2 start ecosystem.config.js          # 启动
pm2 stop hpc-platform                  # 停止
pm2 restart hpc-platform               # 重启
pm2 reload hpc-platform                # 重载（0秒停机）
pm2 delete hpc-platform                # 删除
pm2 logs hpc-platform                  # 查看日志
pm2 monit                              # 监控
```

### D. 备份与恢复

**备份：**

```bash
#!/bin/bash
BACKUP_DIR="/backup/hpc-platform-$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR

# 备份应用数据
cp -r /opt/hpc-platform/config $BACKUP_DIR/
cp -r /opt/hpc-platform/public/uploads $BACKUP_DIR/
cp -r /opt/hpc-platform/data $BACKUP_DIR/
cp /opt/hpc-platform/.env $BACKUP_DIR/

# 打包
tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
rm -rf $BACKUP_DIR
```

**恢复：**

```bash
# 解压备份
tar -xzf /backup/hpc-platform-YYYYMMDD_HHMMSS.tar.gz

# 恢复配置
cp -r hpc-platform-YYYYMMDD_HHMMSS/config/* /opt/hpc-platform/config/
cp -r hpc-platform-YYYYMMDD_HHMMSS/uploads/* /opt/hpc-platform/public/uploads/
cp hpc-platform-YYYYMMDD_HHMMSS/.env /opt/hpc-platform/

# 重启服务
sudo systemctl restart hpc-platform
```

### E. 安全加固建议

1. **修改默认密钥**
   ```bash
   # 生成强随机密钥
   openssl rand -base64 32

   # 更新 .env
   JWT_SECRET=生成的随机密钥
   ```

2. **文件权限**
   ```bash
   chmod 700 /opt/hpc-platform/.env
   chmod 600 /opt/hpc-platform/config/license*.pem
   ```

3. **防火墙配置**
   ```bash
   # 仅开放必要端口
   sudo firewall-cmd --permanent --add-port=3000/tcp
   sudo firewall-cmd --permanent --add-port=3001/tcp
   sudo firewall-cmd --reload
   ```

4. **HTTPS 配置**
   建议使用 Nginx 反向代理并配置 SSL 证书。

---

## 技术支持

如遇到部署问题，请提供以下信息：

1. 操作系统版本：`cat /etc/os-release`
2. Node.js 版本：`node --version`
3. 应用版本：`cat /opt/hpc-platform/VERSION.json`
4. 错误日志：`/opt/hpc-platform/logs/error.log`
5. 环境变量配置：`.env` 文件（敏感信息脱敏）

---

**文档版本**: 1.0.0
**更新日期**: 2024-12-06
