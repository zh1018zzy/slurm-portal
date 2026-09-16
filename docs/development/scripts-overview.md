# 项目管理脚本总览

> 适用范围：根目录与 `scripts/` 下管理脚本的索引与流程说明  
> 主入口链接：`docs/README.md`  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`

## 📋 所有管理脚本

| 脚本文件 | 用途 | 使用场景 |
|---------|------|---------|
| `install.sh` | 系统初始化安装 | 首次部署新系统 |
| `start-pm2.sh` | 启动所有服务 | 启动主应用和WebShell |
| `stop-pm2.sh` | 停止所有服务 | 停止运行中的服务 |
| `restart-pm2.sh` | 重启所有服务 | 重启主应用和WebShell |
| `update-app.sh` | 更新并重新部署 | 拉取代码、构建、重启 |
| `cleanup.sh` | 清理项目文件 | 清理日志、临时文件 |

---

## 🚀 部署流程

### 新系统首次部署

```bash
# 1. 安装依赖和环境
sudo ./install.sh

# 2. 配置环境变量
cp .env.example .env
vim .env

# 3. 启动所有服务
./start-pm2.sh

# 4. 设置开机自启
pm2 startup
pm2 save
```

### 日常运维

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
./restart-pm2.sh

# 停止服务
./stop-pm2.sh
```

### 更新部署

```bash
# 一键更新
./update-app.sh

# 或手动更新
git pull
npm install
npm run build
pm2 restart all
```

### 定期维护

```bash
# 每月清理一次
./cleanup.sh
```

---

## 📝 脚本详细说明

### 1. install.sh - 系统安装脚本

**功能**:
- 检测操作系统类型 (Ubuntu/Debian/CentOS/RHEL)
- 安装 Node.js 18
- 安装系统依赖 (python3, make, g++, git, curl)
- 安装 PM2
- 安装项目依赖
- 构建项目

**使用**:
```bash
sudo ./install.sh
```

**支持系统**:
- Ubuntu 18.04+
- Debian 10+
- CentOS 7+
- RHEL 7+
- Rocky Linux
- AlmaLinux

---

### 2. start-pm2.sh - 启动脚本

**功能**:
- 检查项目是否已构建
- 停止并删除旧进程
- 启动主应用 (端口 3000)
- 启动 WebShell 服务 (端口 3001)
- 显示服务状态
- 保存 PM2 配置

**使用**:
```bash
./start-pm2.sh
```

**启动的服务**:
- `hpc-app`: 主应用服务
- `webshell-server`: WebShell 终端服务

---

### 3. stop-pm2.sh - 停止脚本

**功能**:
- 停止主应用
- 停止 WebShell 服务
- 显示当前状态

**使用**:
```bash
./stop-pm2.sh
```

**注意**: 仅停止服务,不删除进程配置

---

### 4. restart-pm2.sh - 重启脚本

**功能**:
- 重启主应用
- 重启 WebShell 服务
- 如果服务未运行,自动启动
- 保存 PM2 配置

**使用**:
```bash
./restart-pm2.sh
```

**适用场景**:
- 修改配置文件后
- 服务异常需要重启
- 更新环境变量后

---

### 5. update-app.sh - 更新部署脚本

**功能**:
- 拉取最新代码 (git pull)
- 安装/更新依赖 (npm install)
- 重新构建项目 (npm run build)
- 重启所有服务

**使用**:
```bash
./update-app.sh
```

**更新流程**:
1. Git 拉取最新代码
2. 安装新的依赖包
3. 删除旧构建,重新构建
4. 重启服务应用更新

---

### 6. cleanup.sh - 清理脚本

**功能**:
- 移动 30 天前的日志到归档目录
- 移动超过 100MB 的日志文件
- 归档测试和修复脚本
- 归档旧的备份文件 (.tar.gz)
- 清理临时目录 (tmp/)
- 清理 PM2 日志缓存
- 可选清理 npm 缓存
- 可选压缩归档目录

**使用**:
```bash
./cleanup.sh
```

**交互提示**:
- 是否清理 npm 缓存
- 是否压缩备份目录

**生成文件**:
- `archive-YYYYMMDD/` - 归档目录
- `archive-YYYYMMDD.tar.gz` - 压缩归档 (可选)

---

## 🔧 常用 PM2 命令

### 服务��理

```bash
# 查看所有服务状态
pm2 status

# 启动服务
pm2 start <name>

# 停止服务
pm2 stop <name>

# 重启服务
pm2 restart <name>

# 删除服务
pm2 delete <name>

# 重启所有服务
pm2 restart all

# 停止所有服务
pm2 stop all

# 删除所有服务
pm2 delete all
```

### 日志管理

```bash
# 查看所有日志
pm2 logs

# 查看特定服务日志
pm2 logs <name>

# 查看最近N行日志
pm2 logs --lines 100

# 只看错误日志
pm2 logs --err

# 清空日志
pm2 flush

# 实时日志 (不加 --nostream)
pm2 logs <name>
```

### 监控和信息

```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 show <name>

# 查看进程ID
pm2 id <name>

# 列出所有进程
pm2 list
```

### 持久化和启动

```bash
# 保存当前进程列表
pm2 save

# 生成开机启动脚本
pm2 startup

# 恢复保存的进程列表
pm2 resurrect

# 删除开机启动
pm2 unstartup
```

---

## 📂 项目文件结构

```
/opt/my-hpcapp/
├── app/                    # Next.js 应用主目录
├── components/             # React 组件
├── lib/                    # 工具库和辅助函数
├── public/                 # 静态资源
├── scripts/                # 运维和工具脚本
├── config/                 # 应用配置
├── messages/               # 国际化消息
├── types/                  # TypeScript 类型定义
│
├── .next/                  # Next.js 构建产物
├── node_modules/           # npm 依赖
├── logs/                   # 应用日志
│
├── install.sh             # 🔧 系统安装脚本
├── start-pm2.sh           # 🚀 启动所有服务
├── stop-pm2.sh            # 🛑 停止所有服务
├── restart-pm2.sh         # 🔄 重启所有服务
├── update-app.sh          # 📥 更新部署脚本
├── cleanup.sh             # 🧹 清理脚本
│
├── package.json           # npm 配置
├── next.config.mjs        # Next.js 配置
├── tsconfig.json          # TypeScript 配置
├── .env                   # 环境变量 (不提交)
├── .env.local             # 本地环境变量 (不提交)
│
├── docs/deployment/       # 部署文档（含 root-deployment-guide 等）
├── docs/archive/repo-root/ # 历史部署总结与快照
├── docs/operations/       # 运维（含 cleanup-guide）
└── docs/development/      # 本文档与 root-scripts 说明
```

---

## 🎯 最佳实践

### 1. 定期维护计划

**每日**:
```bash
pm2 status              # 检查服务状态
pm2 logs --err --lines 50  # 查看错误日志
```

**每周**:
```bash
du -sh logs/            # 检查日志大小
df -h                   # 检查磁盘空间
```

**每月**:
```bash
./cleanup.sh            # 清理旧文件
npm outdated            # 检查依赖更新
```

### 2. 更新流程

**测试更新**:
```bash
# 在测试环境先测试
git pull
npm install
npm run build
npm run start
```

**生产更新**:
```bash
# 使用更新脚本
./update-app.sh
```

### 3. 备份策略

**每周备份**:
```bash
# 备份配置
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env config/

# 备份数据库
# (根据实际数据库类型)

# 备份上传文件
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz public/uploads/
```

### 4. 监控建议

```bash
# 安装日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# 设置开机自启
pm2 startup
pm2 save
```

---

## 🆘 故障排查

### 服务无法启动

```bash
# 1. 查看错误日志
pm2 logs --err

# 2. 检查端口占用
lsof -i :3000
lsof -i :3001

# 3. 检查构建状态
ls -la .next/

# 4. 重新构建
npm run build

# 5. 重启服务
./restart-pm2.sh
```

### 服务频繁重启

```bash
# 查看详细信息
pm2 show hpc-app

# 查看内存使用
pm2 monit

# 增加内存��制
pm2 delete hpc-app
pm2 start npm --name hpc-app --max-memory-restart 500M -- run start:prod
```

### 日志文件过大

```bash
# 立即清理
./cleanup.sh

# 配置日志轮转
pm2 install pm2-logrotate
```

---

## 📚 相关文档

- [deployment-pm2-docker.md](../deployment/deployment-pm2-docker.md) - 部署方案对比
- [root-deployment-guide.md](../deployment/root-deployment-guide.md) - 完整部署手册（原根目录）
- [deployment-quick-start.md](../deployment/deployment-quick-start.md) - 快速部署说明
- [DEPLOYMENT-SUMMARY.md](../archive/repo-root/DEPLOYMENT-SUMMARY.md) - 历史部署快照（归档）
- [cleanup-guide.md](../operations/cleanup-guide.md) - 清理维护说明

---

## 💡 提示

1. 所有脚本都已设置可执行权限 (`chmod +x`)
2. 使用脚本前请先阅读相关文档
3. 定期备份重要数据
4. 在生产环境操作前建议先在测试环境验证
5. 保持项目整洁,定期运行 `cleanup.sh`

---

**最后更新**: 2025-11-05
**维护者**: 系统管理员
