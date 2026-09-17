# HPC 应用部署快速指南

> 适用范围：快速了解服务架构与常用部署命令  
> 主入口链接：`docs/README.md`  
> 文档状态：`active`  
> 最后验证日期：`2026-09-17`

> **先看集群依赖**：[`cluster-prerequisites.md`](./cluster-prerequisites.md)，并用 `npm run verify:env` 做部署前校验。

## 服务架构

本应用包含两个主要服务:

1. **主应用服务** (端口 3000)
   - Next.js Web应用
   - 提供用户界面、API、认证等功能
   - 包含Slurm集群监控、作业管理等核心功能

2. **WebShell服务** (端口 3001)
   - 独立的Socket.IO服务器
   - 提供浏览器内终端访问
   - 支持用户通过Web界面访问HPC系统

## 快速开始

### 新系统安装

```bash
# 1. 一键安装所有依赖
sudo ./install.sh

# 2. 配置环境变量
cp .env.example .env
vim .env  # 修改配置

# 3. 启动所有服务
./start-pm2.sh
```

### 已有环境启动

```bash
# 直接启动所有服务
./start-pm2.sh
```

## 管理脚本

项目提供了4个便捷的管理脚本:

### 1. 启动服务 - `start-pm2.sh`

启动主应用和WebShell服务:

```bash
./start-pm2.sh
```

功能:
- 检查构建状态,如未构建则自动构建
- 停止并删除旧进程
- 启动主应用 (hpc-app)
- 启动WebShell服务 (webshell-server)
- 保存PM2配置

### 2. 停止服务 - `stop-pm2.sh`

停止所有运行的服务:

```bash
./stop-pm2.sh
```

功能:
- 停止主应用
- 停止WebShell服务
- 显示当前状态

### 3. 重启服务 - `restart-pm2.sh`

重启所有服务:

```bash
./restart-pm2.sh
```

功能:
- 重启主应用
- 重启WebShell服务
- 如果服务未运行,自动启动
- 保存PM2配置

### 4. 更新应用 - `update-app.sh`

更新代码并重新部署:

```bash
./update-app.sh
```

功能:
- 拉取最新代码 (git pull)
- 安装/更新依赖
- 重新构建项目
- 重启所有服务

## PM2 常用命令

### 查看状态

```bash
# 查看所有服务状态
pm2 status

# 查看详细信息
pm2 show hpc-app
pm2 show webshell-server
```

### 查看日志

```bash
# 查看所有日志
pm2 logs

# 查看主应用日志
pm2 logs hpc-app

# 查看WebShell日志
pm2 logs webshell-server

# 实时查看最近100行
pm2 logs hpc-app --lines 100

# 清空日志
pm2 flush
```

### 服务管理

```bash
# 重启单个服务
pm2 restart hpc-app
pm2 restart webshell-server

# 重启所有服务
pm2 restart all

# 停止服务
pm2 stop hpc-app
pm2 stop webshell-server

# 删除服务
pm2 delete hpc-app
pm2 delete webshell-server
```

### 监控

```bash
# 实时监控资源使用
pm2 monit

# 查看资源使用统计
pm2 list
```

### 开机自启

```bash
# 生成开机自启脚本
pm2 startup

# 执行输出的命令 (类似):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root

# 保存当前进程列表
pm2 save

# 取消开机自启
pm2 unstartup systemd
```

## 端口说明

- **3000**: 主应用端口 (Web UI)
- **3001**: WebShell服务端口 (WebSocket)

确保防火墙允许这两个端口访问:

```bash
# Ubuntu/Debian
sudo ufw allow 3000
sudo ufw allow 3001

# CentOS/RHEL
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

## 环境变量配置

关键环境变量 (在 `.env` 文件中):

```bash
# 应用配置
NODE_ENV=production
PORT=3000
WEBSHELL_PORT=3001

# 数据库
SUPABASE_URL=http://your-supabase-url
SUPABASE_KEY=your-supabase-key

# LDAP认证
AUTH_MODE=ldap
LDAP_URL=ldap://your-ldap-server:389
LDAP_BASE_DN=dc=my-hpc,dc=com
LDAP_BIND_DN=cn=admin,dc=my-hpc,dc=com
LDAP_BIND_PASSWORD=admin
LDAP_USERS_OU=ou=users

# JWT密钥
JWT_SECRET=your-secret-key-here
```

## 常见问题

### 1. 服务无法启动

```bash
# 查看错误日志
pm2 logs --err

# 检查端口占用
lsof -i :3000
lsof -i :3001

# 检查构建状态
ls -la .next/
```

### 2. WebShell连接失败

```bash
# 确认服务运行
pm2 status webshell-server

# 查看WebShell日志
pm2 logs webshell-server

# 重启WebShell
pm2 restart webshell-server
```

### 3. Slurm命令无法执行

```bash
# 确认Slurm可用
which sinfo squeue sbatch

# 检查环境变量
pm2 env 0  # 0是进程ID
```

### 4. LDAP认证失败

```bash
# 查看LDAP相关日志
pm2 logs hpc-app | grep -i ldap

# 测试LDAP连接
ldapsearch -x -H ldap://your-server:389 -b "dc=my-hpc,dc=com"
```

## 性能优化

### 1. 启用PM2集群模式

适用于高负载场景:

```bash
# 停止当前服务
pm2 delete hpc-app

# 以集群模式启动 (使用所有CPU核心)
pm2 start npm --name hpc-app -i max -- run start:prod

# 保存配置
pm2 save
```

### 2. 日志轮转

防止日志文件过大:

```bash
# 安装日志轮转模块
pm2 install pm2-logrotate

# 配置日志大小限制 (10MB)
pm2 set pm2-logrotate:max_size 10M

# 配置保留天数 (7天)
pm2 set pm2-logrotate:retain 7
```

## 备份建议

定期备份以下内容:

1. **环境配置**: `.env` 文件
2. **应用配置**: `config/` 目录
3. **用户数据**: 数据库备份
4. **上传文件**: `public/uploads/` 目录

## 更多信息

详细部署文档请参考: [deployment-pm2-docker.md](./deployment-pm2-docker.md) 与 [root-deployment-guide.md](./root-deployment-guide.md)

## 技术支持

遇到问题时:

1. 查看日志: `pm2 logs`
2. 检查服务状态: `pm2 status`
3. 查看系统日志: `/var/log/syslog` 或 `/var/log/messages`
4. 查看Slurm日志: `/var/log/slurm/`
