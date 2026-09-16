#!/bin/bash

# HPC平台部署设置脚本
# 用于生产环境部署前的准备工作

set -e  # 遇到错误立即退出

echo "🚀 开始HPC平台部署设置..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到root用户运行，建议使用普通用户"
    fi
}

# 检查系统要求
check_system_requirements() {
    log_info "检查系统要求..."
    
    # 检查Node.js版本
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        log_info "Node.js版本: $NODE_VERSION"
        
        # 检查版本是否满足要求 (>= 18.0.0)
        if [[ $(echo "$NODE_VERSION" | cut -d'.' -f1) -ge 18 ]]; then
            log_success "Node.js版本满足要求"
        else
            log_error "Node.js版本过低，需要 >= 18.0.0"
            exit 1
        fi
    else
        log_error "未找到Node.js，请先安装Node.js"
        exit 1
    fi
    
    # 检查npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_info "npm版本: $NPM_VERSION"
    else
        log_error "未找到npm，请先安装npm"
        exit 1
    fi
}

# 安装项目依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    if [[ -f "package.json" ]]; then
        npm ci --production=false
        log_success "依赖安装完成"
    else
        log_error "未找到package.json文件"
        exit 1
    fi
}

# 创建必要的目录
create_directories() {
    log_info "创建必要的目录..."
    
    # 创建上传目录
    if [[ ! -d "public/uploads" ]]; then
        mkdir -p public/uploads
        log_success "创建上传目录: public/uploads"
    else
        log_info "上传目录已存在: public/uploads"
    fi
    
    # 创建日志目录
    if [[ ! -d "logs" ]]; then
        mkdir -p logs
        log_success "创建日志目录: logs"
    else
        log_info "日志目录已存在: logs"
    fi
    
    # 创建备份目录
    if [[ ! -d "backup" ]]; then
        mkdir -p backup
        log_success "创建备份目录: backup"
    else
        log_info "备份目录已存在: backup"
    fi
    
    # 创建数据目录
    if [[ ! -d "data" ]]; then
        mkdir -p data
        log_success "创建数据目录: data"
    else
        log_info "数据目录已存在: data"
    fi
}

# 设置目录权限
set_permissions() {
    log_info "设置目录权限..."
    
    # 设置上传目录权限 (755)
    chmod 755 public/uploads
    log_success "设置上传目录权限: 755"
    
    # 设置日志目录权限 (755)
    chmod 755 logs
    log_success "设置日志目录权限: 755"
    
    # 设置备份目录权限 (755)
    chmod 755 backup
    log_success "设置备份目录权限: 755"
    
    # 设置数据目录权限 (755)
    chmod 755 data
    log_success "设置数据目录权限: 755"
    
    # 设置配置文件权限 (644)
    if [[ -f "config/system-settings.json" ]]; then
        chmod 644 config/system-settings.json
        log_success "设置配置文件权限: 644"
    fi
    
    if [[ -f "config/storage-config.json" ]]; then
        chmod 644 config/storage-config.json
        log_success "设置存储配置权限: 644"
    fi
}

# 检查配置文件
check_config_files() {
    log_info "检查配置文件..."
    
    # 检查系统设置文件
    if [[ ! -f "config/system-settings.json" ]]; then
        log_warning "系统设置文件不存在，创建默认配置"
        cat > config/system-settings.json << EOF
{
  "platformName": "HPC平台",
  "logoUrl": "/logo.png"
}
EOF
        log_success "创建默认系统设置文件"
    else
        log_info "系统设置文件已存在"
    fi
    
    # 检查存储配置文件
    if [[ ! -f "config/storage-config.json" ]]; then
        log_warning "存储配置文件不存在，请手动配置"
    else
        log_info "存储配置文件已存在"
    fi
}

# 构建项目
build_project() {
    log_info "构建项目..."
    
    # 清理之前的构建
    if [[ -d ".next" ]]; then
        rm -rf .next
        log_info "清理之前的构建文件"
    fi
    
    # 构建项目
    npm run build
    log_success "项目构建完成"
}

# 创建systemd服务文件
create_systemd_service() {
    log_info "创建systemd服务文件..."
    
    SERVICE_FILE="/etc/systemd/system/hpc-platform.service"
    
    if [[ -f "$SERVICE_FILE" ]]; then
        log_warning "systemd服务文件已存在: $SERVICE_FILE"
        return
    fi
    
    # 获取当前用户和目录
    CURRENT_USER=$(whoami)
    CURRENT_DIR=$(pwd)
    
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=HPC Platform Web Application
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    log_success "创建systemd服务文件: $SERVICE_FILE"
    log_info "请根据实际情况修改服务文件中的用户和路径"
}

# 创建nginx配置
create_nginx_config() {
    log_info "创建nginx配置示例..."
    
    NGINX_CONF="nginx-hpc-platform.conf"
    
    cat > "$NGINX_CONF" << EOF
# HPC平台 Nginx配置示例
# 将此配置添加到 /etc/nginx/sites-available/ 或 /etc/nginx/conf.d/

server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名
    
    # 重定向到HTTPS (可选)
    # return 301 https://\$server_name\$request_uri;
    
    # 静态文件缓存
    location /_next/static/ {
        alias $CURRENT_DIR/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 上传文件访问
    location /uploads/ {
        alias $CURRENT_DIR/public/uploads/;
        expires 1d;
        add_header Cache-Control "public";
    }
    
    # 其他静态文件
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    
    log_success "创建nginx配置示例: $NGINX_CONF"
    log_info "请根据实际情况修改配置中的域名和路径"
}

# 创建环境变量文件
create_env_file() {
    log_info "创建环境变量文件..."
    
    if [[ ! -f ".env.local" ]]; then
        cat > ".env.local" << EOF
# HPC平台环境变量配置
# 请根据实际情况修改这些值

# 数据库配置
DATABASE_URL="postgresql://username:password@localhost:5432/hpc_platform"

# JWT密钥 (请生成一个强密钥)
JWT_SECRET="your-super-secret-jwt-key-here"

# 应用配置
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# 文件上传配置
MAX_FILE_SIZE="5242880"  # 5MB in bytes

# 日志配置
LOG_LEVEL="info"
EOF
        log_success "创建环境变量文件: .env.local"
        log_warning "请根据实际情况修改环境变量"
    else
        log_info "环境变量文件已存在: .env.local"
    fi
}

# 创建部署后检查脚本
create_post_deploy_check() {
    log_info "创建部署后检查脚本..."
    
    cat > "scripts/post-deploy-check.sh" << 'EOF'
#!/bin/bash

# 部署后检查脚本

echo "🔍 执行部署后检查..."

# 检查服务状态
if systemctl is-active --quiet hpc-platform; then
    echo "✅ HPC平台服务运行正常"
else
    echo "❌ HPC平台服务未运行"
fi

# 检查端口
if netstat -tlnp | grep :3000 > /dev/null; then
    echo "✅ 端口3000监听正常"
else
    echo "❌ 端口3000未监听"
fi

# 检查上传目录
if [[ -d "public/uploads" ]]; then
    echo "✅ 上传目录存在"
    ls -la public/uploads/
else
    echo "❌ 上传目录不存在"
fi

# 检查配置文件
if [[ -f "config/system-settings.json" ]]; then
    echo "✅ 系统配置文件存在"
else
    echo "❌ 系统配置文件不存在"
fi

# 检查日志文件
if [[ -d "logs" ]]; then
    echo "✅ 日志目录存在"
    ls -la logs/
else
    echo "❌ 日志目录不存在"
fi

echo "🔍 检查完成"
EOF
    
    chmod +x scripts/post-deploy-check.sh
    log_success "创建部署后检查脚本: scripts/post-deploy-check.sh"
}

# 主函数
main() {
    log_info "开始HPC平台部署设置..."
    
    check_root
    check_system_requirements
    install_dependencies
    create_directories
    set_permissions
    check_config_files
    build_project
    create_systemd_service
    create_nginx_config
    create_env_file
    create_post_deploy_check
    
    log_success "部署设置完成！"
    echo ""
    log_info "后续步骤："
    echo "1. 修改 .env.local 文件中的环境变量"
    echo "2. 配置数据库连接"
    echo "3. 修改 nginx-hpc-platform.conf 中的域名"
    echo "4. 启动服务: sudo systemctl start hpc-platform"
    echo "5. 启用开机自启: sudo systemctl enable hpc-platform"
    echo "6. 运行检查脚本: ./scripts/post-deploy-check.sh"
    echo ""
    log_info "部署文档请参考: docs/deployment.md"
}

# 执行主函数
main "$@" 