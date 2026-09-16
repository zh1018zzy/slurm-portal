# HPC平台部署指南

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

本文档介绍如何将HPC平台部署到生产环境。

## 系统要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- Linux系统 (推荐 Ubuntu 20.04+ 或 CentOS 8+)
- 至少 2GB RAM
- 至少 10GB 磁盘空间

## 快速部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd my-hpcapp
```

### 2. 运行部署脚本

```bash
chmod +x scripts/deploy-setup.sh
./scripts/deploy-setup.sh
```

### 3. 配置环境变量

创建 `.env.local` 文件：

```bash
cp .env.example .env.local
# 编辑 .env.local 文件，配置必要的环境变量
```

### 4. 启动应用

```bash
chmod +x scripts/start-production.sh
./scripts/start-production.sh
```

## 详细部署步骤

### 1. 环境准备

#### 安装Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

#### 安装PM2 (可选)

```bash
npm install -g pm2
```

### 2. 项目设置

#### 安装依赖

```bash
npm ci --production=false
```

#### 创建必要目录

```bash
mkdir -p public/uploads
mkdir -p logs
mkdir -p backup
mkdir -p data
```

#### 设置权限

```bash
chmod 755 public/uploads
chmod 755 logs
chmod 755 backup
chmod 755 data
```

#### 构建项目

```bash
npm run build
```

### 3. 配置文件

#### 系统设置

确保 `config/system-settings.json` 存在：

```json
{
  "platformName": "HPC平台",
  "logoUrl": "/logo.png"
}
```

#### 环境变量

创建 `.env.local` 文件：

```env
# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/hpc_platform"

# JWT密钥
JWT_SECRET="your-super-secret-jwt-key-here"

# 应用配置
NEXT_PUBLIC_APP_URL="http://your-domain.com"

# 文件上传配置
MAX_FILE_SIZE="5242880"
```

### 4. 服务配置

#### 使用systemd (推荐)

```bash
chmod +x scripts/create-systemd-service.sh
./scripts/create-systemd-service.sh

# 启动服务
sudo systemctl daemon-reload
sudo systemctl start hpc-platform
sudo systemctl enable hpc-platform
```

#### 使用PM2

```bash
pm2 start npm --name "hpc-platform" -- start
pm2 save
pm2 startup
```

### 5. Web服务器配置

#### Nginx配置

```bash
chmod +x scripts/create-nginx-config.sh
./scripts/create-nginx-config.sh

# 编辑生成的配置文件，修改域名
# 然后按照脚本提示的步骤部署
```

#### Apache配置 (可选)

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    
    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/
    
    # 静态文件
    Alias /uploads /path/to/your/app/public/uploads
    <Directory /path/to/your/app/public/uploads>
        Require all granted
    </Directory>
</VirtualHost>
```

## 文件上传功能

### 目录结构

```
public/
  uploads/          # 上传的图片文件
    uuid1.png
    uuid2.jpg
    ...
```

### 权限设置

确保上传目录有正确的权限：

```bash
chmod 755 public/uploads
chown -R www-data:www-data public/uploads  # 如果使用nginx
```

### Nginx配置

确保nginx配置中包含上传文件的访问规则：

```nginx
location /uploads/ {
    alias /path/to/your/app/public/uploads/;
    expires 1d;
    add_header Cache-Control "public";
}
```

## 监控和维护

### 日志查看

```bash
# systemd服务日志
sudo journalctl -u hpc-platform -f

# 应用日志
tail -f logs/app.log
```

### 备份

```bash
# 备份配置文件
cp config/system-settings.json backup/

# 备份上传文件
tar -czf backup/uploads-$(date +%Y%m%d).tar.gz public/uploads/
```

### 更新部署

```bash
# 拉取最新代码
git pull

# 重新安装依赖
npm ci --production=false

# 重新构建
npm run build

# 重启服务
sudo systemctl restart hpc-platform
```

## 故障排除

### 常见问题

1. **上传目录权限问题**
   ```bash
   chmod 755 public/uploads
   chown -R $USER:$USER public/uploads
   ```

2. **端口被占用**
   ```bash
   # 查看端口占用
   netstat -tlnp | grep :3000
   
   # 杀死进程
   sudo kill -9 <PID>
   ```

3. **内存不足**
   ```bash
   # 增加Node.js内存限制
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

4. **文件上传失败**
   - 检查上传目录权限
   - 检查磁盘空间
   - 检查文件大小限制

### 性能优化

1. **启用gzip压缩**
2. **配置静态文件缓存**
3. **使用CDN加速**
4. **数据库连接池优化**

## 安全建议

1. **使用HTTPS**
2. **设置强密码**
3. **定期更新依赖**
4. **限制文件上传类型和大小**
5. **配置防火墙**
6. **定期备份数据**

## 联系支持

如遇到部署问题，请查看：
- 项目文档
- GitHub Issues
- 系统日志 
