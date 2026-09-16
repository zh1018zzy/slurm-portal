# HPC 管理平台部署指南

> 适用范围：生产部署、运维、环境配置与服务管理  
> 主入口链接：`docs/README.md`  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`  
> 说明：使用 `root-deployment-guide.md` 作为文件名，避免在 `core.ignorecase=true` 时与同目录的 `deployment-guide.md` 冲突。

## 📋 目录

- [系统要求](#系统要求)
- [快速开始](#快速开始)
- [详细部署步骤](#详细部署步骤)
- [环境配置](#环境配置)
- [服务管理](#服务管理)
- [常见问题](#常见问题)
- [运维管理](#运维管理)

---

## 系统要求

### 硬件要求
- **CPU**: 2核心或以上
- **内存**: 最低 2GB RAM，推荐 4GB+
- **硬盘**: 最低 10GB 可用空间
- **网络**: 稳定的网络连接

### 软件要求
- **操作系统**: 
  - Ubuntu 18.04+ / Debian 10+
  - CentOS 7+ / RHEL 7+
- **Node.js**: 18.x 或更高版本
- **数据库**: PostgreSQL (Supabase)
- **可选服务**:
  - LDAP 服务器（用户认证）
  - Slurm 集群（作业管理）

---

## 快速开始

### 方式一：自动安装（推荐）

```bash
# 1. 解压部署包
tar -xzf hpc-app-deployment-*.tar.gz
cd hpc-app-deployment-*/

# 2. 运行自动安装脚本
sudo ./install.sh

# 3. 配置环境变量
cp .env.example .env.local
vim .env.local  # 编辑配置

# 4. 启动服务
./start-pm2.sh
```

### 方式二：手动安装

```bash
# 1. 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs  # Ubuntu/Debian
# 或
sudo yum install -y nodejs      # CentOS/RHEL

# 2. 安装 PM2
sudo npm install -g pm2

# 3. 安装项目依赖
npm install

# 4. 构建应用
npm run build

# 5. 启动服务
./start-pm2.sh
```

---

## 详细部署步骤

### 步骤 1: 环境准备

#### Ubuntu/Debian 系统

```bash
# 更新系统
sudo apt-get update
sudo apt-get upgrade -y

# 安装系统依赖
sudo apt-get install -y python3 make g++ git curl

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应显示 v18.x.x
npm --version
```

#### CentOS 7 系统

```bash
# 安装 devtoolset（CentOS 7 需要）
sudo yum install -y centos-release-scl
sudo yum install -y devtoolset-11
source /opt/rh/devtoolset-11/enable

# 安装系统依赖
sudo yum install -y python3 make gcc-c++ git curl

# 安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version
```

#### CentOS 8+ / RHEL 8+

```bash
# 安装系统依赖
sudo dnf install -y python3 make gcc-c++ git curl

# 安装 Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# 验证安装
node --version
```

### 步骤 2: 安装 PM2

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 验证安装
pm2 --version

# 配置开机自启（可选）
pm2 startup
# 按照提示执行命令
```

### 步骤 3: 部署应用

```bash
# 创建部署目录
sudo mkdir -p /opt/my-hpcapp
sudo chown $USER:$USER /opt/my-hpcapp

# 解压部署包
tar -xzf hpc-app-deployment-*.tar.gz
cd hpc-app-deployment-*/

# 移动到部署目录（可选）
mv * /opt/my-hpcapp/
cd /opt/my-hpcapp/

# 安装项目依赖
npm install

# 构建应用
npm run build
```

### 步骤 4: 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env.local

# 编辑配置文件
vim .env.local
```

**必须配置的环境变量：**

```bash
# 数据库配置（Supabase）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# LDAP 配置（如果使用 LDAP 认证）
AUTH_MODE=ldap
LDAP_URL=ldap://your-ldap-server:389
LDAP_BASE_DN=dc=example,dc=com
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=your-ldap-password
LDAP_USERS_OU=ou=users

# 应用配置
NODE_ENV=production
PORT=3000

# JWT 配置
JWT_SECRET=your-random-secret-key-min-32-chars

# Slurm 配置（如果使用 Slurm）
SLURM_CLUSTER_NAME=your-cluster-name
```

### 步骤 5: 初始化数据库

```bash
# 执行数据库初始化脚本
node scripts/setup/init-database.js

# 初始化用户组（如果使用 LDAP）
node scripts/setup/init-user-groups.js

# 设置权限系统
./scripts/setup/setup-permission-system.sh
```

### 步骤 6: 启动服务

```bash
# 使用 PM2 启动所有服务
./start-pm2.sh

# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 保存 PM2 配置（开机自启）
pm2 save
```

---

## 环境配置

### 配置文件说明

| 文件 | 说明 |
|------|------|
| `.env.local` | 本地环境变量配置（不会提交到 git） |
| `.env.example` | 环境变量模板 |
| `ecosystem.config.js` | PM2 进程管理配置 |
| `next.config.mjs` | Next.js 应用配置 |

### 关键配置项

#### 数据库配置
```bash
# Supabase 数据库
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# 前端公开 key
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

#### 认证配置
```bash
# 认证模式：ldap 或 standalone
AUTH_MODE=ldap

# LDAP 服务器配置
LDAP_URL=ldap://192.168.1.100:389
LDAP_BASE_DN=dc=company,dc=com
LDAP_BIND_DN=cn=admin,dc=company,dc=com
LDAP_BIND_PASSWORD=admin123
LDAP_USERS_OU=ou=users
```

#### JWT 配置
```bash
# JWT 密钥（至少 32 位）
JWT_SECRET=your-very-long-random-secret-key-here
```

#### Slurm 配置
```bash
# Slurm 集群名称
SLURM_CLUSTER_NAME=hpc-cluster-01
```

---

## 服务管理

### 基本操作

```bash
# 启动所有服务
./start-pm2.sh

# 停止所有服务
./stop-pm2.sh

# 重启所有服务
./restart-pm2.sh

# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 查看特定服务日志
pm2 logs hpc-app
```

### PM2 常用命令

```bash
# 实时监控
pm2 monit

# 重启单个服务
pm2 restart hpc-app

# 重载服务（零停机）
pm2 reload hpc-app

# 查看详细信息
pm2 describe hpc-app

# 清空日志
pm2 flush

# 删除服务
pm2 delete hpc-app
pm2 delete all
```

### NPM 脚本命令

```bash
# 开发模式
npm run dev

# 构建应用
npm run build

# 生产模���启动
npm run start

# 性能监控
npm run monitor

# 持续监控
npm run monitor:continuous

# 性能诊断
npm run diagnose

# 部署优化
npm run optimize
```

---

## 常见问题

### 1. 端口被占用

**问题**: 启动失败，提示端口 3000 已被占用

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3000
# 或
netstat -tulnp | grep :3000

# 杀死占用进程
kill -9 <PID>

# 或修改端口
vim .env.local
# 修改 PORT=3001
```

### 2. 构建失败

**问题**: `npm run build` 失败

**解决方案**:
```bash
# 清理缓存
rm -rf .next node_modules
npm cache clean --force

# 重新安装依赖
npm install

# 重新构建
npm run build
```

### 3. LDAP 认证失败

**问题**: 用户无法登录，LDAP 连接失败

**解决方案**:
```bash
# 检查 LDAP 连接
ldapsearch -x -H ldap://your-server:389 \
  -D "cn=admin,dc=company,dc=com" \
  -w password -b "dc=company,dc=com"

# 查看日志
pm2 logs hpc-app | grep -i ldap

# 验证配置
cat .env.local | grep LDAP
```

### 4. 数据库连接失败

**问题**: 无法连接到 Supabase

**解决方案**:
```bash
# 检查环境变量
cat .env.local | grep SUPABASE

# 测试连接
curl https://your-project.supabase.co/rest/v1/

# 验证 API key
# 登录 Supabase 控制台检查 API keys
```

### 5. PM2 服务异常退出

**问题**: 服务频繁重启

**解决方案**:
```bash
# 查看错误日志
pm2 logs hpc-app --err --lines 100

# 检查内存使用
pm2 monit

# 增加内存限制
# 编辑 ecosystem.config.js
# max_memory_restart: '2G'  # 改为 2GB

# 重启服务
pm2 restart hpc-app
```

### 6. Slurm 命令无法执行

**问题**: 作业提交失败

**解决方案**:
```bash
# 确认 Slurm 命令可用
which sinfo squeue sbatch

# 测试 Slurm 命令
sinfo
squeue

# 检查用户权限
groups $USER

# 查看应用日志
pm2 logs hpc-app | grep -i slurm
```

---

## 运维管理

### 更新应用

```bash
# 方式一：使用脚本（推荐）
./scripts/operations/update-app.sh

# 方式二：手动更新
git pull                    # 拉取最新代码
npm install                 # 安装新依赖
npm run build              # 重新构建
pm2 restart all            # 重启服务
```

### 性能监控

```bash
# 实时性能监控
npm run monitor:continuous

# 性能诊断
npm run diagnose

# PM2 监控
pm2 monit

# Slurm 节点监控
./scripts/operations/slurm-node-monitor.sh
```

### 日志管理

```bash
# 查看所有日志
pm2 logs

# 查看最近 100 行日志
pm2 logs --lines 100

# 实时跟踪日志
pm2 logs --lines 0

# 查看错误日志
pm2 logs --err

# 清空日志
pm2 flush

# 应用日志位置
ls -lh logs/
```

### 数据备份

```bash
# 备份数据库（Supabase）
# 在 Supabase 控制台进行备份

# 备份配置文件
tar -czf config-backup-$(date +%Y%m%d).tar.gz \
  .env.local ecosystem.config.js config/

# 备份上传文件
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz public/uploads/
```

### 定期维护

```bash
# 清理临时文件
./scripts/maintenance/cleanup.sh

# 清理旧日志（保留最近 7 天）
find logs/ -name "*.log" -mtime +7 -delete

# 检查磁盘空间
df -h

# 检查内存使用
free -h

# 重启服务（建议每周执行）
./restart-pm2.sh
```

### 定时任务设置

```bash
# 编辑 crontab
crontab -e

# 添加定时任务示例：

# 每小时同步作业状态
0 * * * * node scripts/cron/job-sync-cron.js

# 每天凌晨 2 点同步作业
0 2 * * * cd /opt/my-hpcapp && ./scripts/cron/sync-jobs-daily.sh

# 每周日凌晨 3 点备份
0 3 * * 0 cd /opt/my-hpcapp && ./scripts/maintenance/cleanup.sh

# 每天凌晨 4 点清理日志
0 4 * * * find /opt/my-hpcapp/logs -name "*.log" -mtime +7 -delete
```

---

## 安全建议

### 1. 环境变量安全

```bash
# 设置正确的文件权限
chmod 600 .env.local

# 确保敏感配置不被提交
cat .gitignore | grep .env
```

### 2. JWT 密钥

```bash
# 生成强随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 更新 .env.local
JWT_SECRET=<生成的密钥>
```

### 3. 防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 3000/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 4. HTTPS 配置（推荐）

使用 Nginx 作为反向代理，配置 SSL 证书。

---

## 性能优化建议

### 1. Node.js 内存优化

```bash
# 编辑 ecosystem.config.js
env: {
  NODE_OPTIONS: '--max-old-space-size=4096'  # 增加到 4GB
}
```

### 2. PM2 集群模式

```bash
# 使用多核 CPU
pm2 start ecosystem.config.js -i max
```

### 3. 缓存优化

```bash
# 使用 Redis 缓存（可选）
npm install redis
```

### 4. 数据库优化

- 定期清理过期数据
- 创建适当的索引
- 使用连接池

---

## 故障排查

### 诊断工具

```bash
# 查看系统信息
npm run diagnose

# 性能监控
npm run monitor

# 检查日志
pm2 logs

# 检查数据库连接
node scripts/tools/validate-config.js
```

### 联系支持

如遇到无法解决的问题：

1. 收集日志: `pm2 logs > issue-logs.txt`
2. 收集系统信息: `npm run diagnose > system-info.txt`
3. 查看文档: `docs/` 目录
4. 检查已知问题

---

## 附录

### 目录结构

```
/opt/my-hpcapp/
├── app/                   # Next.js 应用路由
├── components/            # React 组件
├── lib/                  # 工具库
├── types/                # TypeScript 类型
├── messages/             # 国际化翻译
├── config/               # 配置文件
├── db/                   # 数据库脚本
├── public/               # 静态资源
├── scripts/              # 脚本工具
│   ├── deployment/       # 部署脚本
│   ├── operations/       # 运维管理
│   ├── setup/            # 初始化
│   ├── cron/             # 定时任务
│   ├── tools/            # 工具
│   ├── license/          # 许可证
│   └── maintenance/      # 维护
├── logs/                 # 日志文件
├── .env.local            # 环境配置
├── ecosystem.config.js   # PM2 配置
├── install.sh            # 安装脚本
├── start-pm2.sh          # 启动脚本
└── README.md             # 说明文档
```

### 相关文档

- [scripts/README.md](../../scripts/README.md) - Scripts 目录说明
- [根目录脚本说明](../development/root-scripts.md) - 根目录快捷脚本
- [PM2 / Docker 部署概览](./deployment-pm2-docker.md) - 方案对比与概览

---

**版本**: v0.1.0  
**最后更新**: 2025-11-06  
**维护者**: HPC Team
