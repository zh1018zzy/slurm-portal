# HPC管理平台许可证系统生产部署指南

> 适用范围：部署流程、环境配置与发布运维
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 概述

本文档提供HPC管理平台许可证系统在生产环境中的完整部署指南，包括密钥生成、许可证创建、环境配置和监控维护等内容。

## 🎯 部署前准备

### 系统要求

- **操作系统**: Linux (Ubuntu 18.04+, CentOS 7+, RHEL 7+)
- **Node.js**: 18.x 或更高版本
- **数据库**: PostgreSQL 12+ (Supabase)
- **存储空间**: 至少 10GB 可用空间
- **内存**: 推荐 4GB 以上
- **网络**: 内网或外网访问（根据部署需求）

### 必要工具

```bash
# 安装必要工具
sudo apt update
sudo apt install -y openssl curl jq

# 验证Node.js版本
node --version  # 应该 >= 18.0.0
npm --version
```

## 🔐 第一步：生成密钥对

### 1.1 生成RSA密钥对

```bash
# 进入项目目录
cd /path/to/hpc-management-platform

# 运行密钥生成脚本
./scripts/generate-keypair.sh
```

**输出示例**:
```
🔑 生成许可证密钥对
====================
📝 生成 2048 位 RSA 密钥对...
🔐 生成私钥...
🔓 生成公钥...

✅ 密钥对生成成功!
📁 文件位置:
   私钥: config/license/license-private.pem
   公钥: config/license/license-public.pem
```

### 1.2 安全存储私钥

```bash
# 设置私钥文件权限（仅所有者可读）
chmod 600 config/license/license-private.pem

# 备份私钥到安全位置
cp config/license/license-private.pem /secure/backup/location/

# 验证密钥对
echo "test-data" | openssl rsautl -sign -inkey config/license/license-private.pem -passin pass:YOUR_PRIVATE_KEY_PASSPHRASE | \
openssl rsautl -verify -inkey config/license/license-public.pem -pubin
```

## 📄 第二步：生成客户许可证

### 2.1 基础版许可证

```bash
# 基础版客户许可证
node scripts/generate-license.js \
  --customer "客户公司名称" \
  --tier basic \
  --users 50 \
  --concurrent 25 \
  --departments 5 \
  --days 365 \
  --output config/license/production-license.json
```

### 2.2 专业版许可证

```bash
# 专业版客户许可证
node scripts/generate-license.js \
  --customer "专业版客户" \
  --tier professional \
  --users 100 \
  --concurrent 50 \
  --departments 10 \
  --days 730 \
  --features "job_management,file_management,user_management,resource_monitoring,webshell,application_center" \
  --output config/license/professional-license.json
```

### 2.3 企业版许可证

```bash
# 企业版客户许可证
node scripts/generate-license.js \
  --customer "企业版客户" \
  --tier enterprise \
  --users 500 \
  --concurrent 200 \
  --departments 50 \
  --days 1095 \
  --features "job_management,file_management,user_management,resource_monitoring,vnc_desktop,webshell,bioinformatics,application_center,advanced_analytics,api_access" \
  --output config/license/enterprise-license.json
```

### 2.4 获取客户硬件指纹

在客户服务器上运行以下命令获取硬件指纹：

```bash
# 方法1: 通过API获取
curl -s http://localhost:3000/api/license/hardware | jq -r '.fingerprint'

# 方法2: 直接运行脚本
node -e "
const { hardwareFingerprintService } = require('./lib/license/hardware-fingerprint.js');
hardwareFingerprintService.generateFingerprint().then(fp => {
  console.log('硬件指纹:', fp);
  process.exit(0);
}).catch(err => {
  console.error('错误:', err.message);
  process.exit(1);
});
"
```

**为客户生成绑定硬件的许可证**:
```bash
# 使用客户提供的硬件指纹
node scripts/generate-license.js \
  --customer "客户名称" \
  --tier professional \
  --users 100 \
  --hardware "客户硬件指纹" \
  --output "customer-license.json"
```

## 🚀 第三步：生产环境部署

### 3.1 环境配置

创建生产环境配置文件 `.env.production`:

```bash
# 基础环境配置
NODE_ENV=production
PORT=3000

# 许可证系统配置
LICENSE_FILE_PATH=/opt/hpc-app/config/license.json
LICENSE_PUBLIC_KEY_PATH=/opt/hpc-app/config/license-public.pem
STRICT_LICENSE_VALIDATION=true
SKIP_LICENSE_VALIDATION=false

# 许可证验证缓存时间（分钟）
LICENSE_CACHE_DURATION=5

# 硬件指纹缓存时间（小时）
HARDWARE_FINGERPRINT_CACHE_DURATION=24

# 日志配置
LOG_LEVEL=INFO
LOG_DIR=/opt/hpc-app/logs
LOG_MAX_FILE_SIZE=50
LOG_MAX_FILES=10
LOG_ENABLE_CONSOLE=true
LOG_ENABLE_FILE=true

# 数据库配置
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LDAP配置
LDAP_URL=ldap://your-ldap-server
LDAP_BASE_DN=dc=company,dc=com
LDAP_BIND_DN=cn=admin,dc=company,dc=com
LDAP_BIND_PASSWORD=your_ldap_password

# JWT密钥
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### 3.2 文件部署

```bash
# 创建生产目录结构
sudo mkdir -p /opt/hpc-app/{config,logs,backups}
sudo chown -R app:app /opt/hpc-app

# 复制应用文件
cp -r /path/to/hpc-management-platform/* /opt/hpc-app/

# 复制许可证文件（仅公钥和许可证文件）
cp config/license/license-public.pem /opt/hpc-app/config/
cp config/license/production-license.json /opt/hpc-app/config/license.json

# 设置文件权限
chmod 644 /opt/hpc-app/config/license-public.pem
chmod 600 /opt/hpc-app/config/license.json
chmod +x /opt/hpc-app/scripts/*.sh

# 注意：不要将私钥文件复制到生产服务器
```

### 3.3 依赖安装和构建

```bash
cd /opt/hpc-app

# 安装生产依赖
npm ci --only=production

# 构建应用
npm run build

# 验证构建结果
ls -la .next/
```

## 🔧 第四步：服务配置

### 4.1 Systemd服务配置

创建服务文件 `/etc/systemd/system/hpc-app.service`:

```ini
[Unit]
Description=HPC Management Platform
After=network.target
Wants=network.target

[Service]
Type=simple
User=app
Group=app
WorkingDirectory=/opt/hpc-app
Environment=NODE_ENV=production
EnvironmentFile=/opt/hpc-app/.env.production
ExecStart=/usr/bin/node server.js
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
KillSignal=SIGINT
TimeoutStopSec=5
PrivateTmp=true
Restart=always
RestartSec=10

# 安全配置
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/hpc-app/logs
ReadWritePaths=/opt/hpc-app/uploads

[Install]
WantedBy=multi-user.target
```

### 4.2 启动服务

```bash
# 重新加载systemd配置
sudo systemctl daemon-reload

# 启用服务（开机自启）
sudo systemctl enable hpc-app

# 启动服务
sudo systemctl start hpc-app

# 检查服务状态
sudo systemctl status hpc-app

# 查看服务日志
sudo journalctl -u hpc-app -f
```

### 4.3 Nginx反向代理配置

创建Nginx配置文件 `/etc/nginx/sites-available/hpc-app`:

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
    ssl_certificate /path/to/ssl/certificate.crt;
    ssl_certificate_key /path/to/ssl/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # 客户端最大请求大小（用于文件上传）
    client_max_body_size 100M;

    # 静态文件缓存
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # 主应用代理
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
        
        # 超时配置
        proxy_connect_timeout 30s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket支持（用于WebShell等实时功能）
    location /ws/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 日志配置
    access_log /var/log/nginx/hpc-app.access.log;
    error_log /var/log/nginx/hpc-app.error.log;
}
```

启用Nginx配置：
```bash
sudo ln -s /etc/nginx/sites-available/hpc-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## ✅ 第五步：验证部署

### 5.1 基础功能验证

```bash
# 检查服务状态
curl -s http://localhost:3000/api/license/status | jq .

# 检查硬件指纹
curl -s http://localhost:3000/api/license/hardware | jq .

# 测试功能权限
curl -s http://localhost:3000/api/license/features/job_management/check | jq .
```

### 5.2 Web界面验证

访问以下URL进行验证：
- `https://your-domain.com/license-test` - 许可证测试页面
- `https://your-domain.com/dashboard` - 主界面
- `https://your-domain.com/api/license/status` - 许可证状态API

### 5.3 许可证功能测试

```bash
# 测试脚本
cat > /tmp/license-test.sh << 'EOF'
#!/bin/bash
BASE_URL="https://your-domain.com"

echo "🔍 测试许可证系统..."

# 测试许可证状态
echo "1. 许可证状态检查:"
STATUS=$(curl -s "$BASE_URL/api/license/status")
echo "$STATUS" | jq -r '.message'
echo "有效性: $(echo "$STATUS" | jq -r '.valid')"
echo ""

# 测试功能权限
FEATURES=("job_management" "file_management" "user_management" "vnc_desktop")
echo "2. 功能权限检查:"
for feature in "${FEATURES[@]}"; do
    RESULT=$(curl -s "$BASE_URL/api/license/features/$feature/check")
    ALLOWED=$(echo "$RESULT" | jq -r '.allowed')
    echo "  $feature: $ALLOWED"
done

echo ""
echo "✅ 许可证系统测试完成"
EOF

chmod +x /tmp/license-test.sh
/tmp/license-test.sh
```

## 📊 第六步：监控和维护

### 6.1 监控脚本

创建许可证监控脚本 `/opt/hpc-app/scripts/monitor-license.sh`:

```bash
#!/bin/bash

LOG_FILE="/opt/hpc-app/logs/license-monitor.log"
API_URL="http://localhost:3000/api/license/status"

# 记录日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 获取许可证状态
LICENSE_STATUS=$(curl -s "$API_URL" || echo '{"valid":false,"message":"API调用失败"}')
VALID=$(echo "$LICENSE_STATUS" | jq -r '.valid // false')
MESSAGE=$(echo "$LICENSE_STATUS" | jq -r '.message // "未知错误"')
REMAINING_DAYS=$(echo "$LICENSE_STATUS" | jq -r '.remainingDays // 0')

log "许可证状态检查: valid=$VALID, message=$MESSAGE, remaining_days=$REMAINING_DAYS"

# 检查许可证有效性
if [ "$VALID" != "true" ]; then
    log "警告: 许可证无效 - $MESSAGE"
    # 发送告警邮件或通知
    # mail -s "许可证警告" admin@company.com < /dev/null
fi

# 检查即将过期
if [ "$REMAINING_DAYS" -le 30 ] && [ "$REMAINING_DAYS" -gt 0 ]; then
    log "警告: 许可证将在 $REMAINING_DAYS 天后过期"
    # 发送到期提醒
fi

# 检查已过期
if [ "$REMAINING_DAYS" -le 0 ]; then
    log "严重: 许可证已过期"
    # 发送紧急告警
fi
```

### 6.2 定时任务配置

```bash
# 添加到crontab
sudo crontab -e

# 添加以下行：
# 每小时检查一次许可证状态
0 * * * * /opt/hpc-app/scripts/monitor-license.sh

# 每天备份许可证文件
0 2 * * * cp /opt/hpc-app/config/license.json /opt/hpc-app/backups/license-$(date +\%Y\%m\%d).json

# 清理旧的备份文件（保留30天）
0 3 * * * find /opt/hpc-app/backups -name "license-*.json" -mtime +30 -delete
```

### 6.3 日志轮转配置

创建logrotate配置文件 `/etc/logrotate.d/hpc-app`:

```
/opt/hpc-app/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 app app
    postrotate
        systemctl reload hpc-app
    endscript
}
```

## 🚨 第七步：故障排查

### 7.1 常见问题诊断

```bash
# 诊断脚本
cat > /opt/hpc-app/scripts/diagnose-license.sh << 'EOF'
#!/bin/bash

echo "🔍 HPC许可证系统诊断"
echo "===================="

# 检查许可证文件
echo "1. 许可证文件检查:"
LICENSE_FILE="/opt/hpc-app/config/license.json"
if [ -f "$LICENSE_FILE" ]; then
    echo "  ✅ 许可证文件存在: $LICENSE_FILE"
    echo "  📁 文件大小: $(ls -lh "$LICENSE_FILE" | awk '{print $5}')"
    echo "  🕒 修改时间: $(ls -l "$LICENSE_FILE" | awk '{print $6, $7, $8}')"
else
    echo "  ❌ 许可证文件不存在: $LICENSE_FILE"
fi

# 检查公钥文件
echo -e "\n2. 公钥文件检查:"
PUBLIC_KEY_FILE="/opt/hpc-app/config/license-public.pem"
if [ -f "$PUBLIC_KEY_FILE" ]; then
    echo "  ✅ 公钥文件存在: $PUBLIC_KEY_FILE"
else
    echo "  ❌ 公钥文件不存在: $PUBLIC_KEY_FILE"
fi

# 检查服务状态
echo -e "\n3. 服务状态检查:"
if systemctl is-active --quiet hpc-app; then
    echo "  ✅ HPC应用服务正在运行"
else
    echo "  ❌ HPC应用服务未运行"
fi

# 检查许可证API
echo -e "\n4. 许可证API检查:"
API_RESPONSE=$(curl -s --max-time 10 http://localhost:3000/api/license/status || echo "API_ERROR")
if [ "$API_RESPONSE" != "API_ERROR" ]; then
    echo "  ✅ 许可证API响应正常"
    echo "  📊 状态: $(echo "$API_RESPONSE" | jq -r '.status // "UNKNOWN"')"
    echo "  ✨ 有效: $(echo "$API_RESPONSE" | jq -r '.valid // false')"
else
    echo "  ❌ 许可证API无响应"
fi

# 检查硬件指纹
echo -e "\n5. 硬件指纹检查:"
HW_RESPONSE=$(curl -s --max-time 10 http://localhost:3000/api/license/hardware || echo "HW_ERROR")
if [ "$HW_RESPONSE" != "HW_ERROR" ]; then
    echo "  ✅ 硬件指纹API响应正常"
    echo "  🔍 指纹: $(echo "$HW_RESPONSE" | jq -r '.fingerprint // "UNKNOWN"')"
else
    echo "  ❌ 硬件指纹API无响应"
fi

# 检查日志
echo -e "\n6. 最近日志检查:"
LOG_FILE="/opt/hpc-app/logs/app.log"
if [ -f "$LOG_FILE" ]; then
    echo "  📄 最近的许可证相关日志:"
    tail -n 10 "$LOG_FILE" | grep -i license || echo "  📝 无许可证相关日志"
else
    echo "  ❌ 日志文件不存在: $LOG_FILE"
fi

echo -e "\n🎯 诊断完成"
EOF

chmod +x /opt/hpc-app/scripts/diagnose-license.sh
```

### 7.2 应急处理流程

**许可证过期处理**:
```bash
# 1. 临时延长宽限期（仅紧急情况）
# 修改许可证文件中的gracePeriod值

# 2. 生成新的许可证
node scripts/generate-license.js \
  --customer "客户名称" \
  --tier existing_tier \
  --users existing_limit \
  --days 365 \
  --hardware "$(curl -s http://localhost:3000/api/license/hardware | jq -r '.fingerprint')" \
  --output config/license.json

# 3. 重启服务应用新许可证
sudo systemctl restart hpc-app
```

**硬件变更处理**:
```bash
# 1. 获取新硬件指纹
NEW_FINGERPRINT=$(curl -s http://localhost:3000/api/license/hardware | jq -r '.fingerprint')

# 2. 生成绑定新硬件的许可证
node scripts/generate-license.js \
  --customer "现有客户" \
  --tier current_tier \
  --users current_limit \
  --hardware "$NEW_FINGERPRINT" \
  --output config/license.json

# 3. 重启服务
sudo systemctl restart hpc-app
```

## 📋 第八步：运维检查清单

### 8.1 日常检查项目

**每日检查**:
- [ ] 服务状态正常
- [ ] 许可证状态有效
- [ ] 系统日志无错误
- [ ] 磁盘空间充足

**每周检查**:
- [ ] 许可证到期时间检查
- [ ] 用户使用量统计
- [ ] 备份文件完整性
- [ ] 性能指标正常

**每月检查**:
- [ ] 许可证功能使用情况分析
- [ ] 系统安全更新
- [ ] 日志文件清理
- [ ] 监控告警测试

### 8.2 安全最佳实践

**文件权限**:
```bash
# 许可证文件权限检查
chmod 600 /opt/hpc-app/config/license.json
chmod 644 /opt/hpc-app/config/license-public.pem

# 日志目录权限
chown -R app:app /opt/hpc-app/logs
chmod 755 /opt/hpc-app/logs
```

**网络安全**:
- 仅允许必要的端口访问
- 使用HTTPS加密通信
- 定期更新SSL证书
- 配置防火墙规则

**数据备份**:
```bash
# 完整备份脚本
cat > /opt/hpc-app/scripts/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/hpc-app/backups/$(date +%Y%m%d)"
mkdir -p "$BACKUP_DIR"

# 备份许可证文件
cp /opt/hpc-app/config/license.json "$BACKUP_DIR/"
cp /opt/hpc-app/config/license-public.pem "$BACKUP_DIR/"

# 备份配置文件
cp /opt/hpc-app/.env.production "$BACKUP_DIR/"

# 创建备份摘要
echo "备份时间: $(date)" > "$BACKUP_DIR/backup-info.txt"
echo "许可证状态: $(curl -s http://localhost:3000/api/license/status | jq -r '.message')" >> "$BACKUP_DIR/backup-info.txt"

# 压缩备份
tar -czf "$BACKUP_DIR.tar.gz" -C /opt/hpc-app/backups "$(basename "$BACKUP_DIR")"
rm -rf "$BACKUP_DIR"

echo "备份完成: $BACKUP_DIR.tar.gz"
EOF

chmod +x /opt/hpc-app/scripts/backup.sh
```

## 📞 技术支持

### 联系信息
- **技术支持邮箱**: support@company.com
- **紧急联系电话**: +86-xxx-xxxx-xxxx
- **文档更新**: 本文档版本 v1.0，最后更新 2025-07-30

### 支持级别
- **基础版**: 邮件支持，48小时响应
- **专业版**: 邮件+电话支持，24小时响应
- **企业版**: 专属技术支持，4小时响应

---

**注意事项**:
1. 生产环境部署前请先在测试环境验证
2. 定期备份许可证文件和密钥
3. 遵守软件许可协议和法律法规
4. 如有疑问请及时联系技术支持团队
