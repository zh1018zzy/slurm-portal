# HPC App 部署文档

> 适用范围：PM2 与 Docker 两种部署方式的对比与选型  
> 主入口链接：`docs/README.md`  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`

## 部署方案选择

本应用支持两种部署方式，推荐使用 **PM2方式** 以获得最佳兼容性。

### 方案对比

| 特性 | PM2方式 (推荐✅) | Docker方式 |
|------|----------------|------------|
| Slurm命令访问 | ✅ 直接访问 | ❌ 需要复杂配置 |
| 存储监控 | ✅ 直接访问 | ❌ 需要挂载 |
| 性能 | ⚡ 最优 | 🐌 有容器开销 |
| 跨系统兼容性 | ✅ Ubuntu/CentOS均支持 | ✅ 支持但配置复杂 |
| 调试便利性 | ✅ 容易 | ⚠️ 需进入容器 |

---

## PM2部署方式（推荐）

### 系统要求

- **操作系统**: Ubuntu 18.04+, Debian 10+, CentOS 7+, RHEL 7+
- **Node.js**: 18.x 或更高版本
- **内存**: 最低 2GB RAM
- **Slurm**: 已安装并配置

### 一键安装

在**新系统**上部署时,使用自动安装脚本:

```bash
cd /opt/my-hpcapp
sudo ./install.sh
```

脚本会自动:
1. 检测操作系统类型
2. 安装 Node.js 18
3. 安装系统依赖 (Python3, make, g++)
4. 安装 PM2
5. 安装项目依赖
6. 构建应用

### 手动部署步骤

如果已有 Node.js 18 环境:

```bash
# 1. 安装项目依赖
npm install

# 2. 配置环境变量
cp .env.example .env
vim .env  # 修改数据库、LDAP等配置

# 3. 构建应用
npm run build

# 4. 启动应用
./start-pm2.sh
```

### PM2 常用命令

```bash
# 查看运行状态
pm2 status

# 查看所有日志
pm2 logs

# 查看主应用日志
pm2 logs hpc-app

# 查看WebShell日志
pm2 logs webshell-server

# 实时日志
pm2 logs hpc-app --lines 100

# 重启所有服务
pm2 restart all

# 重启主应用
pm2 restart hpc-app

# 重启WebShell服务
pm2 restart webshell-server

# 停止所有服务
pm2 stop all

# 停止主应用
pm2 stop hpc-app

# 监控
pm2 monit

# 设置开机自启
pm2 startup
pm2 save
```

### 更新应用

使用快捷脚本:
```bash
# 一键更新应用
./scripts/operations/update-app.sh
```

或手动执行:
```bash
# 1. 拉取最新代码
git pull

# 2. 安装新依赖(如有)
npm install

# 3. 重新构建
npm run build

# 4. 重启所有服务
pm2 restart all
```

### 快捷脚本

项目提供了便捷的管理脚本:

```bash
# 启动所有服务
./start-pm2.sh

# 停止所有服务
./stop-pm2.sh

# 重启所有服务
./restart-pm2.sh

# 更新并重新部署
./scripts/operations/update-app.sh

# 清理临时文件
./scripts/maintenance/cleanup.sh
```

---

## Docker部署方式（仅作参考）

⚠️ **注意**: Docker方式无法直接访问宿主机的Slurm命令,不推荐用于生产环境。

如果确实需要使用Docker,请参考以下配置:

### 构建并启动

```bash
# 停止PM2(如果在运行)
pm2 stop hpc-app

# 使用Docker Compose启动
docker-compose -f docker-compose.prod.yml up -d --build
```

### 查看日志

```bash
docker logs hpc-app -f
```

### 停止容器

```bash
docker-compose -f docker-compose.prod.yml down
```

---

## 环境变量配置

创建 `.env` 文件,配置以下关键变量:

```bash
# 数据库配置
SUPABASE_URL=http://your-supabase-url
SUPABASE_KEY=your-supabase-key

# LDAP配置
AUTH_MODE=ldap
LDAP_URL=ldap://192.168.1.10:389
LDAP_BASE_DN=dc=my-hpc,dc=com
LDAP_BIND_DN=cn=admin,dc=my-hpc,dc=com
LDAP_BIND_PASSWORD=admin
LDAP_USERS_OU=ou=users

# 应用配置
NODE_ENV=production
PORT=3000
WEBSHELL_PORT=3001

# JWT配置
JWT_SECRET=your-secret-key-here
```

---

## 系统兼容性

### Ubuntu/Debian

```bash
# 安装依赖
sudo apt-get update
sudo apt-get install -y python3 make g++ git curl

# 安装Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo bash -
sudo apt-get install -y nodejs

# 安装PM2
sudo npm install -g pm2
```

### CentOS/RHEL 7

```bash
# 安装依赖
sudo yum install -y python3 make gcc-c++ git curl

# CentOS 7 需要 devtoolset
sudo yum install -y centos-release-scl
sudo yum install -y devtoolset-11
source /opt/rh/devtoolset-11/enable

# 安装Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装PM2
sudo npm install -g pm2
```

### CentOS/RHEL 8+

```bash
# 安装依赖
sudo dnf install -y python3 make gcc-c++ git curl

# 安装Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo dnf install -y nodejs

# 安装PM2
sudo npm install -g pm2
```

---

## 问题排查

### LDAP认证失败

检查日志:
```bash
pm2 logs hpc-app | grep -i ldap
```

常见问题:
- LDAP服务器连接不通: 检查 `LDAP_URL` 配置
- 用户DN不正确: 应用会自动构造 `cn=用户名,ou=users,dc=my-hpc,dc=com`
- 密码错误: 检查用户密码

### Slurm���令无法执行

检查:
```bash
# 确认Slurm命令可用
which sinfo squeue sbatch

# 确认应用可以执行
pm2 logs hpc-app | grep -i slurm
```

### 端口被占用

```bash
# 检查端口占用
lsof -i :3000
lsof -i :3001

# 或使用netstat
netstat -tulnp | grep :3000
netstat -tulnp | grep :3001
```

### WebShell无法连接

检查:
```bash
# 查看WebShell服务状态
pm2 status webshell-server

# 查看WebShell日志
pm2 logs webshell-server

# 重启WebShell服务
pm2 restart webshell-server
```

---

## 生产环境建议

1. **使用PM2方式部署** - 最佳兼容性和性能
2. **配置开机自启** - `pm2 startup && pm2 save`
3. **定期查看日志** - `pm2 logs`
4. **监控资源使用** - `pm2 monit`
5. **备份配置文件** - `.env`, `config/` 目录
6. **确保两个服务都在运行** - 主应用(3000) 和 WebShell(3001)

---

## 性能优化

### PM2集群模式（可选）

如果需要多核利用:

```bash
pm2 delete hpc-app
pm2 start npm --name hpc-app -i max -- run start:prod
```

### 日志轮转

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 支持

如有问题,请查看:
- PM2日志: `pm2 logs hpc-app`
- 系统日志: `/var/log/syslog` 或 `/var/log/messages`
- Slurm日志: `/var/log/slurm/`
