# Scripts 目录说明

本目录包含HPC管理平台的所有脚本工具，按功能分类组织。

## 📁 目录结构

```
scripts/
├── deployment/      # 部署相关脚本 (5个文件)
├── operations/      # 运维管理脚本 (8个文件)
├── setup/           # 初始化安装脚本 (11个文件)
├── cron/            # 定时任务脚本 (9个文件)
├── tools/           # 工具脚本 (12个文件)
├── license/         # 许可证管理
└── maintenance/     # 维护清理脚本
```

**对比整理前：** 138个文件 → **整理后：** 61个文件（减少56%）

## 🚀 deployment/ - 部署脚本

- `create-deployment-package.sh` - 创建通用部署包
- `create-production-package.sh` - 创建生产环境部署包
- `deploy-setup.sh` - 部署环境设置
- `deploy-pm2-cluster.sh` - PM2集群部署
- `build-offline.sh` - 离线构建

## ⚙️ operations/ - 运维管理

- `start-production.sh` - 启动生产服务
- `pm2-*.sh` - PM2管理工具
- `performance-*.js` - 性能监控诊断
- `slurm-node-monitor.sh` - Slurm节点监控

## 🔧 setup/ - 初始化安装

- `init-*.js` - 数据库和用户组初始化
- `setup-*.sh` - 各种系统设置脚本

## ⏰ cron/ - 定时任务

- 作业同步、LDAP同步等定时任务脚本

## 🔨 tools/ - 工具脚本

- 应用注册、配置验证、密钥生成等工具

## 📝 使用方式

所有脚本应在项目根目录执行：
```bash
cd /opt/my-hpcapp
./scripts/deployment/create-deployment-package.sh
```
