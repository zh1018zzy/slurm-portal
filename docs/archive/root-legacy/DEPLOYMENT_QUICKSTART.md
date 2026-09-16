# HPC 平台部署方案快速指南

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 方案概述

本项目采用 **Next.js Standalone 模式**，实现本地编译、客户环境部署的方案。

## 核心文件

### 1. 脚本文件

- **`scripts/deployment/build-production.sh`** - 本地编译打包脚本
- **`scripts/deployment/install.sh`** - 客户环境安装脚本
- **`scripts/deployment/verify-env.sh`** - 环境变量验证脚本
- **`scripts/deployment/rebuild-client.sh`** - 客户环境重新编译脚本

### 2. 文档

- **`docs/DEPLOYMENT.md`** - 完整部署文档（包含环境变量详解、故障排查等）

## 快速开始

### 步骤 1: 本地打包

```bash
# 在开发环境执行
./scripts/deployment/build-production.sh
```

**重要**: 打包前检查编译时环境变量（`NEXT_PUBLIC_*`）是否与客户环境匹配

### 步骤 2: 传输到客户环境

```bash
scp dist/hpc-platform-*.tar.gz user@customer-server:/tmp/
```

### 步骤 3: 客户环境安装

```bash
# 在客户服务器执行
tar -xzf hpc-platform-*.tar.gz
cd hpc-platform-*
./scripts/deployment/install.sh
```

### 步骤 4: 启动服务

```bash
# 使用 systemd
sudo systemctl start hpc-platform
sudo systemctl enable hpc-platform

# 或使用 PM2
pm2 start ecosystem.config.js
pm2 save
```

## 环境变量关键说明

### 编译时变量 (需在打包前配置)

这些变量会被编译到客户端代码中，**修改后必须重新编译**：

```bash
NEXT_PUBLIC_BASE_URL=http://客户IP:3000
NEXT_PUBLIC_WEBSHELL_SERVER=http://客户IP:3001
NEXT_PUBLIC_APP_URL=http://客户IP:3000
NEXT_PUBLIC_SUPABASE_URL=http://客户Supabase:8000
NEXT_PUBLIC_GRAFANA_URL=http://客户Grafana:3000
```

### 运行时变量 (部署后可修改)

这些变量在服务器端使用，修改后重启即可：

```bash
SUPABASE_URL=http://...
LDAP_URL=ldap://...
JWT_SECRET=随机密钥
VNC_NODE=192.168.x.x
```

## 环境变量配置策略

### 策略 A: 预先配置（推荐）

在打包前创建 `.env.production` 文件，配置客户环境的实际值：

```bash
# .env.production
NEXT_PUBLIC_BASE_URL=http://10.20.30.40:3000
NEXT_PUBLIC_WEBSHELL_SERVER=http://10.20.30.40:3001
# ... 其他客户环境的实际配置
```

然后执行打包，编译时会自动使用这些值。

### 策略 B: 客户环境重新编译

如果打包时使用了占位符，可在客户环境执行：

```bash
# 需要将完整源代码（包含 node_modules）传输到客户环境
./scripts/deployment/rebuild-client.sh
```

**注意**: 此方式需要客户环境有 Node.js 和完整依赖。

## 验证配置

```bash
# 检查环境变量配置
./scripts/deployment/verify-env.sh

# 或指定文件
./scripts/deployment/verify-env.sh /opt/hpc-platform/.env
```

## 常见场景

### 场景 1: 标准部署（IP 地址已知）

```bash
# 1. 配置客户环境的实际值
vim .env.production

# 2. 打包
./scripts/deployment/build-production.sh

# 3. 传输并安装
# ...

# 4. 直接启动，无需额外配置
```

### 场景 2: 多客户部署

```bash
# 为每个客户准备配置文件
.env.production.customer-a
.env.production.customer-b

# 打包时指定
cp .env.production.customer-a .env.production
./scripts/deployment/build-production.sh
```

### 场景 3: IP 地址未知

```bash
# 1. 使用占位符打包
./scripts/deployment/build-production.sh

# 2. 在客户环境配置 .env
vim .env

# 3. 执行重新编译
./scripts/deployment/rebuild-client.sh
```

## 目录结构

```
scripts/deployment/
├── build-production.sh    # 本地打包脚本
├── install.sh            # 客户环境安装脚本
├── verify-env.sh         # 环境变量验证
└── rebuild-client.sh     # 客户环境重新编译

docs/
└── DEPLOYMENT.md         # 完整部署文档

dist/                     # 打包输出目录（执行后生成）
└── hpc-platform-*.tar.gz
```

## 客户环境要求

**必需**:
- Node.js >= 18.0.0
- Linux 操作系统

**可选**:
- PM2 (进程管理)
- systemd (系统服务)

## 故障排查

### 问题: 编译时变量不生效

**原因**: 这些变量已编译到代码中，修改 `.env` 不会生效

**解决**:
1. 返回开发环境，用正确的值重新打包
2. 或在客户环境执行 `rebuild-client.sh`

### 问题: WebShell 无法连接

**检查**:
1. `NEXT_PUBLIC_WEBSHELL_SERVER` 是否正确
2. 3001 端口是否开放
3. WebShell 服务是否启动

### 问题: 数据库连接失败

**检查**:
1. `SUPABASE_URL` 配置是否正确
2. 网络连通性
3. Supabase 服务是否运行

## 完整文档

详细信息请参考: **`docs/DEPLOYMENT.md`**

包含:
- 环境变量完整列表和说明
- 详细部署步骤
- 故障排查指南
- 安全加固建议
- 备份恢复方案

## 技术支持

遇到问题请提供:
1. 错误日志: `/opt/hpc-platform/logs/error.log`
2. 环境变量配置（脱敏）
3. Node.js 版本
4. 操作系统版本
