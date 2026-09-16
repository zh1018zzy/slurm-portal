# 文件权限系统部署指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 部署概述

本指南详细说明了如何部署和配置文件权限管理系统，包括环境准备、数据库初始化、权限配置和监控设置。

## 🏗️ 环境准备

### 1. 系统要求

#### 硬件要求
- **CPU**: 2核心以上
- **内存**: 4GB以上
- **存储**: 20GB以上可用空间
- **网络**: 稳定的网络连接

#### 软件要求
- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+)
- **Node.js**: 18.x 或更高版本
- **PostgreSQL**: 12.x 或更高版本
- **Redis**: 6.x 或更高版本（可选，用于缓存）

### 2. 依赖安装

#### 安装Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version
npm --version
```

#### 安装PostgreSQL
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 验证安装
psql --version
```

#### 安装Redis（可选）
```bash
# Ubuntu/Debian
sudo apt-get install -y redis-server

# CentOS/RHEL
sudo yum install -y redis
sudo systemctl start redis
sudo systemctl enable redis

# 验证安装
redis-cli ping
```

### 3. 项目部署

#### 克隆项目
```bash
git clone <repository-url>
cd my-hpcapp
```

#### 安装依赖
```bash
npm install
```

#### 环境配置
```bash
# 复制环境配置文件
cp .env.example .env

# 编辑环境配置
nano .env
```

#### 环境变量配置
```bash
# 应用配置
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# JWT配置
JWT_SECRET=your-secure-jwt-secret-key-here
JWT_EXPIRES_IN=7d

# 数据库配置
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# 文件权限配置
DEFAULT_FILE_SIZE_LIMIT=104857600
DEFAULT_QUOTA_LIMIT=1073741824
PERMISSION_CACHE_DURATION=300000

# 缓存配置（可选）
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/my-hpcapp/app.log
```

## 🗄️ 数据库初始化

### 1. 创建数据库

#### PostgreSQL数据库创建
```bash
# 切换到postgres用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE my_hpcapp;
CREATE USER my_hpcapp_user WITH PASSWORD 'your-secure-password';
GRANT ALL PRIVILEGES ON DATABASE my_hpcapp TO my_hpcapp_user;
\q
```

#### 测试数据库连接
```bash
psql -h localhost -U my_hpcapp_user -d my_hpcapp -c "SELECT version();"
```

### 2. 初始化权限表

#### 执行SQL脚本
```bash
# 创建权限相关表
psql -h localhost -U my_hpcapp_user -d my_hpcapp -f db/create_permissions_tables.sql

# 验证表创建
psql -h localhost -U my_hpcapp_user -d my_hpcapp -c "\dt file_permissions"
psql -h localhost -U my_hpcapp_user -d my_hpcapp -c "\dt file_operation_logs"
```

#### 创建默认权限
```bash
# 为管理员用户创建默认权限
psql -h localhost -U my_hpcapp_user -d my_hpcapp -c "
INSERT INTO file_permissions (user_id, permission_type, is_enabled, max_file_size, quota_limit)
SELECT id, 'file_upload', true, 104857600, 1073741824 FROM users WHERE role = 'admin'
ON CONFLICT (user_id, permission_type) DO NOTHING;

INSERT INTO file_permissions (user_id, permission_type, is_enabled, max_file_size, quota_limit)
SELECT id, 'file_download', true, NULL, NULL FROM users WHERE role = 'admin'
ON CONFLICT (user_id, permission_type) DO NOTHING;

INSERT INTO file_permissions (user_id, permission_type, is_enabled, max_file_size, quota_limit)
SELECT id, 'file_delete', true, NULL, NULL FROM users WHERE role = 'admin'
ON CONFLICT (user_id, permission_type) DO NOTHING;
"
```

### 3. 数据库优化

#### 创建索引
```bash
# 性能优化索引
psql -h localhost -U my_hpcapp_user -d my_hpcapp -c "
CREATE INDEX IF NOT EXISTS idx_file_permissions_user_id ON file_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_type ON file_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_file_permissions_enabled ON file_permissions(is_enabled);

CREATE INDEX IF NOT EXISTS idx_file_operation_logs_user_id ON file_operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_created_at ON file_operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_operation_type ON file_operation_logs(operation_type);
"
```

#### 配置数据库参数
```bash
# 编辑PostgreSQL配置
sudo nano /etc/postgresql/12/main/postgresql.conf

# 添加以下配置
shared_preload_libraries = 'pg_stat_statements'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

# 重启PostgreSQL
sudo systemctl restart postgresql
```

## 🔧 应用配置

### 1. 构建应用

#### 生产环境构建
```bash
# 安装依赖
npm install

# 构建应用
npm run build

# 验证构建
npm run start
```

### 2. 进程管理

#### 使用PM2管理进程
```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'my-hpcapp',
    script: 'npm',
    args: 'start',
    cwd: '/opt/my-hpcapp',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/my-hpcapp/err.log',
    out_file: '/var/log/my-hpcapp/out.log',
    log_file: '/var/log/my-hpcapp/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

#### 使用systemd管理进程
```bash
# 创建systemd服务文件
sudo nano /etc/systemd/system/my-hpcapp.service
```

```ini
[Unit]
Description=My HPC App
After=network.target postgresql.service

[Service]
Type=simple
User=my-hpcapp
WorkingDirectory=/opt/my-hpcapp
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 启用服务
sudo systemctl daemon-reload
sudo systemctl enable my-hpcapp
sudo systemctl start my-hpcapp

# 检查服务状态
sudo systemctl status my-hpcapp
```

### 3. 反向代理配置

#### Nginx配置
```bash
# 安装Nginx
sudo apt-get install -y nginx

# 创建Nginx配置文件
sudo nano /etc/nginx/sites-available/my-hpcapp
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL配置
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 客户端上传大小限制
    client_max_body_size 100M;

    # 代理配置
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/my-hpcapp /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔐 安全配置

### 1. 防火墙配置

```bash
# 配置UFW防火墙
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 检查防火墙状态
sudo ufw status
```

### 2. SSL证书配置

#### 使用Let's Encrypt
```bash
# 安装Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

### 3. 安全加固

#### 系统安全
```bash
# 更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 安装安全工具
sudo apt-get install -y fail2ban ufw

# 配置fail2ban
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
port = http,https
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 3
```

```bash
# 启动fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

## 📊 监控配置

### 1. 日志配置

#### 创建日志目录
```bash
# 创建日志目录
sudo mkdir -p /var/log/my-hpcapp
sudo chown my-hpcapp:my-hpcapp /var/log/my-hpcapp

# 配置logrotate
sudo nano /etc/logrotate.d/my-hpcapp
```

```
/var/log/my-hpcapp/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 my-hpcapp my-hpcapp
    postrotate
        systemctl reload my-hpcapp
    endscript
}
```

### 2. 监控脚本

#### 创建监控脚本
```bash
# 创建监控脚本
sudo nano /usr/local/bin/monitor-hpcapp.sh
```

```bash
#!/bin/bash

# 检查应用状态
if ! curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "$(date): Application is down, restarting..." >> /var/log/my-hpcapp/monitor.log
    systemctl restart my-hpcapp
fi

# 检查数据库连接
if ! psql -h localhost -U my_hpcapp_user -d my_hpcapp -c "SELECT 1;" > /dev/null 2>&1; then
    echo "$(date): Database connection failed" >> /var/log/my-hpcapp/monitor.log
fi

# 检查磁盘空间
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$(date): Disk usage is high: ${DISK_USAGE}%" >> /var/log/my-hpcapp/monitor.log
fi

# 检查内存使用
MEM_USAGE=$(free | awk 'NR==2{printf "%.2f", $3*100/$2}')
if (( $(echo "$MEM_USAGE > 80" | bc -l) )); then
    echo "$(date): Memory usage is high: ${MEM_USAGE}%" >> /var/log/my-hpcapp/monitor.log
fi
```

```bash
# 设置执行权限
sudo chmod +x /usr/local/bin/monitor-hpcapp.sh

# 添加到crontab
sudo crontab -e
# 添加以下行
*/5 * * * * /usr/local/bin/monitor-hpcapp.sh
```

### 3. 数据库监控

#### 创建数据库监控脚本
```bash
# 创建数据库监控脚本
sudo nano /usr/local/bin/monitor-db.sh
```

```bash
#!/bin/bash

# 检查数据库连接数
CONNECTIONS=$(psql -h localhost -U my_hpcapp_user -d my_hpcapp -t -c "SELECT count(*) FROM pg_stat_activity;" 2>/dev/null)
if [ $CONNECTIONS -gt 100 ]; then
    echo "$(date): High database connections: $CONNECTIONS" >> /var/log/my-hpcapp/db-monitor.log
fi

# 检查慢查询
SLOW_QUERIES=$(psql -h localhost -U my_hpcapp_user -d my_hpcapp -t -c "
SELECT count(*) FROM pg_stat_activity 
WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%' 
AND now() - query_start > interval '5 seconds';" 2>/dev/null)
if [ $SLOW_QUERIES -gt 0 ]; then
    echo "$(date): Slow queries detected: $SLOW_QUERIES" >> /var/log/my-hpcapp/db-monitor.log
fi

# 检查权限表大小
TABLE_SIZE=$(psql -h localhost -U my_hpcapp_user -d my_hpcapp -t -c "
SELECT pg_size_pretty(pg_total_relation_size('file_operation_logs'));" 2>/dev/null)
echo "$(date): Operation logs table size: $TABLE_SIZE" >> /var/log/my-hpcapp/db-monitor.log
```

```bash
# 设置执行权限
sudo chmod +x /usr/local/bin/monitor-db.sh

# 添加到crontab
sudo crontab -e
# 添加以下行
*/10 * * * * /usr/local/bin/monitor-db.sh
```

## 🔧 维护和更新

### 1. 备份策略

#### 数据库备份
```bash
# 创建备份脚本
sudo nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/my-hpcapp"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump -h localhost -U my_hpcapp_user -d my_hpcapp > $BACKUP_FILE

# 压缩备份文件
gzip $BACKUP_FILE

# 删除7天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Database backup completed: $BACKUP_FILE.gz"
```

```bash
# 设置执行权限
sudo chmod +x /usr/local/bin/backup-db.sh

# 添加到crontab（每天凌晨2点备份）
sudo crontab -e
# 添加以下行
0 2 * * * /usr/local/bin/backup-db.sh
```

### 2. 应用更新

#### 更新脚本
```bash
# 创建更新脚本
sudo nano /usr/local/bin/update-app.sh
```

```bash
#!/bin/bash

APP_DIR="/opt/my-hpcapp"
BACKUP_DIR="/var/backups/my-hpcapp"

# 备份当前版本
cp -r $APP_DIR $BACKUP_DIR/app_backup_$(date +%Y%m%d_%H%M%S)

# 停止应用
pm2 stop my-hpcapp

# 拉取最新代码
cd $APP_DIR
git pull origin main

# 安装依赖
npm install

# 构建应用
npm run build

# 启动应用
pm2 start my-hpcapp

# 检查应用状态
if pm2 status | grep -q "online"; then
    echo "Application updated successfully"
else
    echo "Application update failed, rolling back..."
    # 回滚逻辑
fi
```

```bash
# 设置执行权限
sudo chmod +x /usr/local/bin/update-app.sh
```

### 3. 性能优化

#### 数据库优化
```bash
# 定期清理日志表
psql -h localhost -U my_hpcapp_user -d my_hpcapp -c "
DELETE FROM file_operation_logs 
WHERE created_at < NOW() - INTERVAL '90 days';"
```

#### 应用优化
```bash
# 清理缓存
pm2 restart my-hpcapp

# 检查内存使用
pm2 monit
```

## 📋 部署检查清单

### ✅ 环境准备
- [ ] Node.js 18.x+ 已安装
- [ ] PostgreSQL 12.x+ 已安装
- [ ] Redis 6.x+ 已安装（可选）
- [ ] 系统依赖已安装

### ✅ 数据库配置
- [ ] 数据库已创建
- [ ] 用户权限已配置
- [ ] 权限表已创建
- [ ] 索引已创建
- [ ] 默认权限已配置

### ✅ 应用配置
- [ ] 环境变量已配置
- [ ] 应用已构建
- [ ] 进程管理已配置
- [ ] 反向代理已配置

### ✅ 安全配置
- [ ] 防火墙已配置
- [ ] SSL证书已安装
- [ ] 安全头已配置
- [ ] fail2ban已配置

### ✅ 监控配置
- [ ] 日志目录已创建
- [ ] 监控脚本已配置
- [ ] 备份策略已设置
- [ ] 告警机制已配置

### ✅ 测试验证
- [ ] 应用启动正常
- [ ] 数据库连接正常
- [ ] 权限检查正常
- [ ] API接口正常
- [ ] 监控告警正常

## 🚀 部署完成

文件权限系统已成功部署！现在您可以：

1. **访问管理界面**: `https://your-domain.com/dashboard/system/permissions`
2. **配置用户权限**: 通过管理界面为用户设置文件操作权限
3. **监控系统状态**: 查看日志和监控数据
4. **管理文件操作**: 用户将根据权限进行文件操作

如有问题，请查看日志文件：
- 应用日志: `/var/log/my-hpcapp/`
- 系统日志: `/var/log/syslog`
- 数据库日志: `/var/log/postgresql/` 
