# HPC管理平台部署指南

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 目录

- [系统要求](#系统要求)
- [架构概览](#架构概览)
- [部署方案](#部署方案)
- [快速部署](#快速部署)
- [详细部署步骤](#详细部署步骤)
- [环境配置](#环境配置)
- [服务管理](#服务管理)
- [安全配置](#安全配置)
- [监控与维护](#监控与维护)
- [故障排除](#故障排除)
- [升级指南](#升级指南)

## 🖥️ 系统要求

### 最低硬件配置
- **CPU**: 4核心
- **内存**: 8GB RAM
- **存储**: 50GB可用磁盘空间
- **网络**: 1Gbps网卡

### 推荐硬件配置
- **CPU**: 8核心或以上
- **内存**: 16GB RAM或以上
- **存储**: 100GB SSD + 独立数据盘
- **网络**: 10Gbps网卡

### 软件环境
- **操作系统**: CentOS 7/8, Ubuntu 18.04/20.04/22.04, RHEL 7/8
- **Node.js**: 18.x 或更高版本
- **NPM**: 8.x 或更高版本
- **Git**: 2.x 或更高版本

### 外部服务依赖
- **LDAP服务器**: OpenLDAP, Active Directory等
- **Slurm集群**: 已配置并运行的Slurm workload manager
- **数据库**: Supabase (PostgreSQL) 或 PostgreSQL 12+
- **noVNC服务**: 用于图形应用显示

## 🏗️ 架构概览

```mermaid
graph TB
    A[用户浏览器] --> B[Nginx反向代理]
    B --> C[HPC管理平台]
    C --> D[LDAP服务器]
    C --> E[Supabase数据库]
    C --> F[Slurm集群]
    C --> G[noVNC服务]
    F --> H[计算节点]
    G --> H
```

### 核心组件
- **Web应用**: Next.js 14应用，提供用户界面
- **认证模块**: LDAP集成，支持企业用户认证
- **作业管理**: Slurm集成，作业提交和监控
- **文件管理**: 文件上传下载和权限控制
- **图形应用**: VNC集成，支持图形化HPC应用
- **WebShell**: 基于xterm.js的Web终端

## 🚀 部署方案

### 方案一：单机部署（推荐）
适用于中小型环境，部署简单，维护方便。

### 方案二：容器化部署
适用于现代化运维环境，支持快速扩展。

### 方案三：高可用部署
适用于生产关键环境，提供高可用性保障。

## ⚡ 快速部署

### 1. 环境准备
```bash
# 安装Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装必要工具
sudo apt-get update
sudo apt-get install -y git curl jq nginx
```

### 2. 获取代码
```bash
# 克隆项目代码
git clone <your-repository-url> /opt/my-hpcapp
cd /opt/my-hpcapp

# 安装依赖
npm install
```

### 3. 环境配置
```bash
# 使用自动配置脚本（推荐）
./scripts/setup-environment.sh -e prod -g <your-gateway-ip>

# 配置数据库
export SUPABASE_URL="your-supabase-url"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
./scripts/setup-permission-system.sh
./scripts/setup-applications.sh
```

### 4. 构建和启动
```bash
# 构建应用
npm run build

# 启动服务
npm start
```

## 📖 详细部署步骤

### 步骤1: 系统环境准备

#### 1.1 创建应用用户
```bash
# 创建专用用户
sudo useradd -m -s /bin/bash hpcapp
sudo usermod -aG sudo hpcapp

# 切换到应用用户
sudo su - hpcapp
```

#### 1.2 安装Node.js
```bash
# 使用NodeSource仓库安装
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version  # 应显示 v18.x.x
npm --version   # 应显示 8.x.x
```

#### 1.3 安装系统依赖
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y git curl jq nginx certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum update
sudo yum install -y git curl jq nginx certbot python3-certbot-nginx
```

### 步骤2: 应用部署

#### 2.1 获取应用代码
```bash
# 克隆代码到指定目录
sudo mkdir -p /opt/my-hpcapp
sudo chown hpcapp:hpcapp /opt/my-hpcapp
git clone <your-repository-url> /opt/my-hpcapp
cd /opt/my-hpcapp
```

#### 2.2 安装应用依赖
```bash
# 安装Node.js依赖
npm install

# 验证安装
npm list --depth=0
```

### 步骤3: 环境配置

#### 3.1 自动化配置（推荐）
```bash
# 使用配置脚本
./scripts/setup-environment.sh --interactive

# 或预设配置
./scripts/setup-environment.sh -e prod -g 192.168.1.100
```

#### 3.2 手动配置
```bash
# 创建环境变量文件
cat > .env.local << 'EOF'
# LDAP认证配置
LDAP_URL=ldap://your-ldap-server:389
LDAP_BASE_DN=dc=example,dc=com
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=your-ldap-password

# Supabase数据库配置
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT密钥配置
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# VNC配置
NOVNC_GATEWAY=192.168.1.100
NOVNC_PORT=6080
NODE_IP_MAP={"node1":"192.168.1.10","node2":"192.168.1.11"}

# 可选配置
TURBO_VNC_PATH=/opt/TurboVNC/bin/
DEFAULT_NODE_IP=192.168.1.100
EOF
```

### 步骤4: 数据库初始化

#### 4.1 设置环境变量
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

#### 4.2 初始化数据库表
```bash
# 设置权限系统表
./scripts/setup-permission-system.sh

# 设置应用管理表
./scripts/setup-applications.sh

# 验证表结构
./scripts/check-db-schema.js
```

### 步骤5: 应用构建

#### 5.1 构建生产版本
```bash
# 构建应用
npm run build

# 验证构建结果
ls -la .next/
```

#### 5.2 测试运行
```bash
# 临时启动测试
npm start &
sleep 10

# 测试访问
curl -I http://localhost:3000

# 停止测试
pkill -f "npm start"
```

## ⚙️ 环境配置

### LDAP配置示例

#### Active Directory
```bash
LDAP_URL=ldap://ad.company.com:389
LDAP_BASE_DN=dc=company,dc=com
LDAP_BIND_DN=cn=hpcapp,ou=Service Accounts,dc=company,dc=com
LDAP_BIND_PASSWORD=service-account-password
```

#### OpenLDAP
```bash
LDAP_URL=ldap://ldap.company.com:389
LDAP_BASE_DN=dc=company,dc=com
LDAP_BIND_DN=cn=admin,dc=company,dc=com
LDAP_BIND_PASSWORD=admin-password
```

### Supabase配置

#### 云服务版本
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 自建PostgreSQL
```bash
SUPABASE_URL=postgresql://user:password@host:5432/database
SUPABASE_SERVICE_ROLE_KEY=your-custom-service-key
```

### VNC节点映射配置

#### 单节点配置
```json
{
  "localhost": "127.0.0.1"
}
```

#### 多节点集群配置
```json
{
  "compute-01": "192.168.1.10",
  "compute-02": "192.168.1.11",
  "gpu-01": "192.168.1.20",
  "login-node": "192.168.1.100"
}
```

## 🔧 服务管理

### 使用PM2管理服务（推荐）

#### 安装PM2
```bash
npm install -g pm2
```

#### 创建PM2配置文件
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'hpc-management-platform',
    script: 'npm',
    args: 'start',
    cwd: '/opt/my-hpcapp',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

#### 服务操作命令
```bash
# 启动服务
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs hpc-management-platform

# 重启服务
pm2 restart hpc-management-platform

# 停止服务
pm2 stop hpc-management-platform

# 设置开机自启
pm2 startup
pm2 save
```

### 使用Systemd管理服务

#### 创建服务文件
```bash
sudo tee /etc/systemd/system/hpc-app.service > /dev/null << 'EOF'
[Unit]
Description=HPC Management Platform
After=network.target

[Service]
Type=simple
User=hpcapp
WorkingDirectory=/opt/my-hpcapp
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

#### 服务操作命令
```bash
# 重载systemd配置
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start hpc-app

# 设置开机自启
sudo systemctl enable hpc-app

# 查看状态
sudo systemctl status hpc-app

# 查看日志
sudo journalctl -u hpc-app -f
```

## 🔒 安全配置

### SSL/TLS配置

#### 使用Let's Encrypt
```bash
# 申请证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

#### 使用自签名证书
```bash
# 生成私钥和证书
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/hpc-app.key \
  -out /etc/ssl/certs/hpc-app.crt
```

### Nginx配置

#### 创建配置文件
```nginx
# /etc/nginx/sites-available/hpc-app
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/ssl/certs/hpc-app.crt;
    ssl_certificate_key /etc/ssl/private/hpc-app.key;
    
    # SSL安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket支持（WebShell功能）
    location /api/webshell {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 静态文件缓存
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### 启用配置
```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/hpc-app /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

### 防火墙配置

#### UFW（Ubuntu）
```bash
# 启用防火墙
sudo ufw enable

# 允许SSH
sudo ufw allow 22

# 允许HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# 允许VNC（如果需要直接访问）
sudo ufw allow 6080

# 查看状态
sudo ufw status
```

#### Firewalld（CentOS/RHEL）
```bash
# 启用防火墙
sudo systemctl enable firewalld
sudo systemctl start firewalld

# 允许服务
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=6080/tcp

# 重载配置
sudo firewall-cmd --reload

# 查看状态
sudo firewall-cmd --list-all
```

## 📊 监控与维护

### 应用监控

#### PM2监控
```bash
# 实时监控
pm2 monit

# 内存使用统计
pm2 show hpc-management-platform

# 日志监控
pm2 logs --lines 100
```

#### 自定义监控脚本
```bash
#!/bin/bash
# /opt/my-hpcapp/scripts/health-check.sh

APP_URL="http://localhost:3000"
LOG_FILE="/var/log/hpc-app-health.log"

# 健康检查
if curl -f -s "$APP_URL" > /dev/null; then
    echo "$(date): Application is healthy" >> "$LOG_FILE"
else
    echo "$(date): Application is down!" >> "$LOG_FILE"
    # 发送告警通知
    # systemctl restart hpc-app
fi
```

### 日志管理

#### 配置日志轮转
```bash
# /etc/logrotate.d/hpc-app
/opt/my-hpcapp/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 hpcapp hpcapp
    postrotate
        pm2 reload hpc-management-platform
    endscript
}
```

### 数据备份

#### 数据库备份脚本
```bash
#!/bin/bash
# /opt/my-hpcapp/scripts/backup-database.sh

BACKUP_DIR="/backup/hpc-app"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 导出Supabase数据（需要配置pg_dump）
pg_dump "$SUPABASE_URL" > "$BACKUP_DIR/database_$DATE.sql"

# 压缩备份
gzip "$BACKUP_DIR/database_$DATE.sql"

# 删除30天前的备份
find "$BACKUP_DIR" -name "database_*.sql.gz" -mtime +30 -delete

echo "Backup completed: database_$DATE.sql.gz"
```

#### 应用配置备份
```bash
#!/bin/bash
# 备份配置文件
tar -czf "/backup/hpc-app/config_$(date +%Y%m%d).tar.gz" \
    /opt/my-hpcapp/.env.local \
    /opt/my-hpcapp/config/ \
    /etc/nginx/sites-available/hpc-app
```

### 性能优化

#### Node.js优化
```bash
# 设置内存限制
export NODE_OPTIONS="--max-old-space-size=4096"

# 启用性能监控
export NODE_ENV=production
```

#### 数据库优化
```sql
-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
```

## 🔧 故障排除

### 常见问题及解决方案

#### 1. 应用无法启动
```bash
# 检查Node.js版本
node --version

# 检查端口占用
sudo netstat -tlnp | grep :3000

# 检查环境变量
cat .env.local

# 查看详细错误
npm start 2>&1 | tee startup.log
```

#### 2. LDAP认证失败
```bash
# 测试LDAP连接
ldapsearch -x -H "$LDAP_URL" -D "$LDAP_BIND_DN" -w "$LDAP_BIND_PASSWORD" -b "$LDAP_BASE_DN" "(uid=testuser)"

# 检查防火墙
telnet ldap-server 389
```

#### 3. 数据库连接问题
```bash
# 测试数据库连接
./scripts/check-db-schema.js

# 检查环境变量
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### 4. VNC连接失败
```bash
# 检查noVNC服务
curl -I "http://$NOVNC_GATEWAY:$NOVNC_PORT/vnc.html"

# 检查节点IP映射
echo $NODE_IP_MAP | jq .

# 测试节点连通性
ping node-hostname
```

### 日志分析

#### 应用日志位置
```bash
# PM2日志
~/.pm2/logs/hpc-management-platform-out.log
~/.pm2/logs/hpc-management-platform-error.log

# 应用自定义日志
/opt/my-hpcapp/logs/app.log

# Nginx日志
/var/log/nginx/access.log
/var/log/nginx/error.log
```

#### 常用日志命令
```bash
# 实时查看应用日志
tail -f /opt/my-hpcapp/logs/app.log

# 查看错误日志
grep -i error /opt/my-hpcapp/logs/app.log

# 查看访问统计
awk '{print $1}' /var/log/nginx/access.log | sort | uniq -c | sort -nr
```

## 🔄 升级指南

### 应用升级流程

#### 1. 准备升级
```bash
# 创建备份
./scripts/backup-database.sh
tar -czf "app-backup-$(date +%Y%m%d).tar.gz" /opt/my-hpcapp

# 停止服务
pm2 stop hpc-management-platform
```

#### 2. 更新代码
```bash
cd /opt/my-hpcapp

# 拉取最新代码
git fetch origin
git checkout <new-version-tag>

# 更新依赖
npm install
```

#### 3. 数据库迁移
```bash
# 检查是否需要数据库升级
ls -la db/migrations/

# 执行迁移（如果有）
./scripts/migrate-database.sh
```

#### 4. 重新构建
```bash
# 构建新版本
npm run build

# 验证构建
ls -la .next/
```

#### 5. 启动服务
```bash
# 启动服务
pm2 start hpc-management-platform

# 验证服务
curl -I http://localhost:3000
pm2 logs hpc-management-platform --lines 20
```

### 回滚流程
```bash
# 如果升级失败，执行回滚
pm2 stop hpc-management-platform

# 恢复代码
git checkout <previous-version-tag>
npm install
npm run build

# 恢复数据库（如果需要）
# pg_restore database_backup.sql

# 启动服务
pm2 start hpc-management-platform
```

## 📞 技术支持

### 联系方式
- **技术文档**: 查看项目README和docs目录
- **问题反馈**: 通过Git仓库提交Issue
- **配置帮助**: 参考CLAUDE.md中的配置说明

### 维护建议
- **定期备份**: 每日备份数据库和配置文件
- **安全更新**: 及时更新Node.js和系统补丁
- **监控告警**: 配置应用和系统监控告警
- **性能调优**: 定期分析日志和性能指标

---

*本文档最后更新时间: $(date)*
*版本: v1.0*
