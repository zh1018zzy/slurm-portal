# 根目录脚本说明

> 适用范围：仓库根目录 `*.sh` 快捷脚本的用途与入口  
> 主入口链接：`docs/README.md`  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`

根目录保留了常用的快捷脚本，方便快速操作。

## 📁 快捷脚本

### 🚀 启动和管理

```bash
# 首次安装
./install.sh                # 自动安装Node.js、PM2和项目依赖

# 启动服务
./start-pm2.sh             # 启动所有服务（主应用 + WebShell）

# 停止服务
./stop-pm2.sh              # 停止所有服务

# 重启服务
./restart-pm2.sh           # 重启所有服务
```

### ⚙️ PM2配置

```bash
ecosystem.config.js        # PM2进程管理配置文件
```

## 📂 更多脚本

更多管理和维护脚本已整理到 `scripts/` 目录：

- **运维管理**: `scripts/operations/`
  - `update-app.sh` - 更新应用
  - `performance-monitor.js` - 性能监控
  - `pm2-monitor.sh` - PM2监控

- **维护清理**: `scripts/maintenance/`
  - `cleanup.sh` - 清理临时文件

- **许可证**: `scripts/license/`
  - `test-trial-license.sh` - 测试试用许可证

详见: [scripts/README.md](../../scripts/README.md)

## 📝 使用示例

### 首次部署
```bash
# 1. 安装环境
sudo ./install.sh

# 2. 配置环境变量
cp .env.example .env.local
vim .env.local

# 3. 启动服务
./start-pm2.sh
```

### 日常操作
```bash
# 更新应用
./scripts/operations/update-app.sh

# 清理临时文件
./scripts/maintenance/cleanup.sh

# 查看性能
node scripts/operations/performance-monitor.js
```

### 服务管理
```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启服务
./restart-pm2.sh
```
