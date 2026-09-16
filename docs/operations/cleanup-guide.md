# 项目清理和维护指南

> 适用范围：日志归档、临时文件与项目目录日常维护  
> 主入口链接：`docs/README.md`  
> 文档状态：`active`  
> 最后验证日期：`2026-03-28`

## 概述

本文档说明如何清理和维护 HPC App 项目,保持项目目录整洁。

---

## 快速清理

### 使用清理脚本

```bash
# 运行自动清理脚本
./cleanup.sh
```

清理脚本会:
- 移动 30 天前的日志到归档目录
- 移动超过 100MB 的日志文件
- 归档测试和修复脚本
- 归档旧的备份文件
- 清理临时目录
- 清理 PM2 日志缓存

---

## 当前项目状态分析

### 占用空间较大的目录

| 目录 | 大小 | 说明 | 建议 |
|------|------|------|------|
| `/logs` | ~515MB | 应用和PM2日志 | **需要清理** |
| `/node_modules` | ~几百MB | npm依赖 | 保留 |
| `/.next` | ~几十MB | Next.js构建产物 | 保留 |

### 需要清理的文件

#### 1. 测试和修复脚本 (已在cleanup.sh中处理)
```
fix_settings_api.js
fix_settings_api_v2.js
test-notifications.js
test-upload.js
test_upsert.js
fix-vnc-database.sql
```

#### 2. 旧备份文件
```
hpc-app-production-20250826_232126.tar.gz
```

#### 3. 大日志文件 (logs目录)
```
combined-0.log (219MB)
err-0.log (195MB)
out-0.log (24MB)
pm2-combined.log (9.8MB)
+ 其他历史日志
```

---

## 手动清理步骤

### 1. 清理日志文件

```bash
# 查看日志目录大小
du -sh logs/

# 删除30天前的日志
find logs/ -name "*.log" -type f -mtime +30 -delete

# 或者压缩旧日志
find logs/ -name "*.log" -type f -mtime +30 -exec gzip {} \;

# 清理超大日志文件
find logs/ -name "*.log" -type f -size +100M -delete
```

### 2. 清理PM2日志

```bash
# 清理PM2日志缓存
pm2 flush

# 查看PM2日志路径
pm2 show hpc-app | grep log

# 手动清理PM2日志
rm -f ~/.pm2/logs/*.log
```

### 3. 清理临时文件

```bash
# 清理tmp目录
rm -rf tmp/*

# 清理构建临时文件
rm -f /tmp/build.log
rm -f /tmp/production-build.log
rm -f /tmp/docker-prod-build.log
```

### 4. 清理测试文件

```bash
# 移动到archive目录
mkdir -p archive-temp
mv fix_*.js archive-temp/
mv test-*.js archive-temp/
mv *.sql archive-temp/
mv *.tar.gz archive-temp/
```

---

## 日志管理策略

### 安装PM2日志轮转

```bash
# 安装日志轮转模块
pm2 install pm2-logrotate

# 配置日志大小限制 (10MB)
pm2 set pm2-logrotate:max_size 10M

# 配置保留文件数 (保留最近7个)
pm2 set pm2-logrotate:retain 7

# 配置压缩旧日志
pm2 set pm2-logrotate:compress true

# 配置日志路径
pm2 set pm2-logrotate:rotateInterval '0 0 * * *'  # 每天午夜轮转
```

### 应用级日志管理

在应用中实现日志轮转:

```javascript
// 建议在 next.config.js 或应用启动时配置
const winston = require('winston');
require('winston-daily-rotate-file');

const transport = new winston.transports.DailyRotateFile({
  filename: 'logs/app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d'
});
```

---

## 定期维护计划

### 每日任务
- 检查服务状态: `pm2 status`
- 查看错误日志: `pm2 logs --err --lines 50`

### 每周任务
- 查看日志大小: `du -sh logs/`
- 清理超大日志: `find logs/ -size +100M`
- 检查磁盘使用: `df -h`

### 每月任务
- 运行清理脚本: `./cleanup.sh`
- 归档旧日志
- 检查备份策略
- 更新依赖: `npm outdated`

### 每季度任务
- 完整项目审计
- 清理未使用的依赖
- 更新文档

---

## 自动化清理

### 使用 Cron 定时任务

```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨2点清理旧日志
0 2 * * * find /opt/my-hpcapp/logs -name "*.log" -mtime +30 -delete

# 添加每周日凌晨3点运行清理脚本
0 3 * * 0 cd /opt/my-hpcapp && ./cleanup.sh -y

# 添加每天清理PM2日志
0 1 * * * pm2 flush
```

---

## 不应删除的文件/目录

### 核心文件
- `package.json`, `package-lock.json` - 依赖配置
- `next.config.mjs` - Next.js配置
- `tsconfig.json` - TypeScript配置
- `.env`, `.env.local` - 环境变量
- `middleware.ts` - 中间件
- `ecosystem.config.js` - PM2配置

### 核心目录
- `/app` - 应用主代码
- `/components` - React组件
- `/lib` - 工具库
- `/public` - 静态资源
- `/scripts` - 运维脚本
- `/types` - TypeScript类型定义
- `/messages` - 国际化消息
- `/config` - 应用配置
- `/.next` - Next.js构建产物 (可重新构建)
- `/node_modules` - npm依赖 (可重新安装)

### 配置目录
- `/.git` - Git版本控制
- `/hooks` - Git钩子

---

## 磁盘空间紧急清理

如果磁盘空间不足:

```bash
# 1. 立即清理PM2日志
pm2 flush
rm -rf ~/.pm2/logs/*

# 2. 清理所有应用日志
rm -rf /opt/my-hpcapp/logs/*.log

# 3. 清理npm缓存
npm cache clean --force

# 4. 清理系统日志 (需要sudo)
sudo journalctl --vacuum-time=3d

# 5. 查找大文件
find /opt/my-hpcapp -type f -size +50M -exec ls -lh {} \;

# 6. 清理Docker (如果使用)
docker system prune -af --volumes
```

---

## .gitignore 配置

项目已配置 `.gitignore` 忽略以下文件:

- 日志文件 (`*.log`, `/logs/`)
- 临时文件 (`/tmp/`, `*.tmp`)
- 测试文件 (`test-*.js`, `/test/`)
- 备份文件 (`*.tar.gz`, `*.backup`)
- PM2日志 (`pm2-*.log`)
- 归档目录 (`archive-*/`)
- 环境配置 (`.env`, `.env.local`)

---

## 备份策略

在清理前,建议备份重要数据:

```bash
# 1. 备份配置文件
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env config/

# 2. 备份数据库 (如果本地有)
# 根据实际数据库类型调整命令

# 3. 备份上传文件
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz public/uploads/

# 4. 将备份移到安全位置
mv *-backup-*.tar.gz /path/to/backup/location/
```

---

## 清理检查清单

- [ ] 运行清理脚本 `./cleanup.sh`
- [ ] 检查日志目录大小 `du -sh logs/`
- [ ] 清理PM2日志 `pm2 flush`
- [ ] 清理临时文件 `rm -rf tmp/*`
- [ ] 检查磁盘空间 `df -h`
- [ ] 验证服务正常 `pm2 status`
- [ ] 备份已归档文件
- [ ] 更新 `.gitignore` (如需要)

---

## 故障排查

### 清理后服务无法启动

```bash
# 检查是否误删了重要文件
git status

# 恢复误删文件
git checkout -- <file>

# 重新安装依赖
npm install

# 重新构建
npm run build

# 重启服务
pm2 restart all
```

### 日志目录权限问题

```bash
# 修复日志目录权限
sudo chown -R $USER:$USER logs/
chmod -R 755 logs/
```

---

## 总结

定期清理和维护项目可以:
- 节省磁盘空间
- 提高性能
- 简化备份
- 便于问题排查
- 保持项目整洁

建议每月运行一次 `./cleanup.sh`,并配置日志轮转自动管理日志文件。
