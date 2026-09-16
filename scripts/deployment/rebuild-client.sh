#!/bin/bash
# 客户环境重新编译脚本
# 当编译时变量与打包时不同时，可在客户环境执行重新编译

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

log_warning "========================================="
log_warning "客户环境重新编译脚本"
log_warning "========================================="
echo ""
log_warning "此脚本用于在客户环境重新编译应用"
log_warning "仅当编译时变量 (NEXT_PUBLIC_*) 与打包时不同时使用"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    log_error "错误: 未找到 package.json"
    log_error "请在项目根目录执行此脚本"
    exit 1
fi

# 检查 Node.js
if ! command -v node &> /dev/null; then
    log_error "未找到 Node.js，请先安装 Node.js >= 18.0.0"
    exit 1
fi

NODE_VERSION=$(node --version)
log_info "Node.js 版本: $NODE_VERSION"
echo ""

# 提示用户确认
log_warning "重新编译将会："
echo "  1. 删除现有的 .next 构建产物"
echo "  2. 使用当前 .env 中的 NEXT_PUBLIC_* 变量重新编译"
echo "  3. 生成新的 standalone 产物"
echo ""

read -p "是否继续? (yes/no) " -r
echo

if [[ ! $REPLY == "yes" ]]; then
    log_info "已取消"
    exit 0
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    log_error ".env 文件不存在"
    log_info "请先配置 .env 文件"
    exit 1
fi

# 显示将要使用的编译时变量
log_info "========================================="
log_info "编译时变量 (将被编译到客户端代码)"
log_info "========================================="

NEXT_PUBLIC_VARS=$(grep "^NEXT_PUBLIC_" .env 2>/dev/null || true)

if [ -n "$NEXT_PUBLIC_VARS" ]; then
    echo "$NEXT_PUBLIC_VARS"
else
    log_warning "未检测到 NEXT_PUBLIC_* 变量"
fi

echo ""
read -p "确认这些变量正确? (yes/no) " -r
echo

if [[ ! $REPLY == "yes" ]]; then
    log_info "请编辑 .env 文件后重新执行此脚本"
    exit 0
fi

# 检查依赖
log_info "检查依赖..."

if [ ! -d "node_modules" ]; then
    log_warning "未找到 node_modules，开始安装依赖..."
    log_info "这可能需要几分钟时间..."

    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi

    log_success "依赖安装完成"
else
    log_info "依赖已存在"
fi

echo ""

# 清理旧的构建产物
log_info "清理旧的构建产物..."
rm -rf .next
log_success "清理完成"
echo ""

# 设置环境变量
log_info "设置构建环境..."
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=4096"

# 加载 .env 文件中的变量
set -a
source .env
set +a

echo ""

# 执行编译
log_info "开始编译应用..."
log_info "这可能需要几分钟时间..."
echo ""

if npm run build; then
    log_success "编译成功！"
else
    log_error "编译失败"
    log_info "请查看上面的错误信息并修复问题"
    exit 1
fi

echo ""

# 验证编译产物
log_info "验证编译产物..."

if [ ! -d ".next/standalone" ]; then
    log_error "错误: 未找到 standalone 产物"
    log_error "请检查 next.config.mjs 中是否配置了 output: 'standalone'"
    exit 1
fi

log_success "编译产物验证通过"
echo ""

# 替换旧的产物
log_info "替换应用文件..."

INSTALL_DIR="/opt/hpc-platform"

if [ ! -d "$INSTALL_DIR" ]; then
    log_error "未找到安装目录: $INSTALL_DIR"
    read -p "请输入实际的安装路径: " INSTALL_DIR

    if [ ! -d "$INSTALL_DIR" ]; then
        log_error "目录不存在: $INSTALL_DIR"
        exit 1
    fi
fi

# 备份当前产物
BACKUP_DIR="${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
log_info "备份当前安装到: $BACKUP_DIR"

sudo cp -r "$INSTALL_DIR" "$BACKUP_DIR"
log_success "备份完成"
echo ""

# 停止服务
log_info "停止服务..."

if command -v systemctl &> /dev/null && systemctl is-active --quiet hpc-platform; then
    sudo systemctl stop hpc-platform
    log_success "服务已停止"
elif command -v pm2 &> /dev/null; then
    pm2 stop hpc-platform 2>/dev/null || true
    log_success "PM2 应用已停止"
else
    log_warning "未检测到服务管理器，请手动停止应用"
fi

echo ""

# 替换文件
log_info "替换编译产物..."

# 删除旧的 .next 目录
sudo rm -rf ${INSTALL_DIR}/.next

# 复制新的 standalone 产物
sudo cp -r .next/standalone/* ${INSTALL_DIR}/

# 复制 static 文件
sudo cp -r .next/static ${INSTALL_DIR}/.next/

# 复制 public 目录（保留 uploads）
if [ -d "${INSTALL_DIR}/public/uploads" ]; then
    TEMP_UPLOADS=$(mktemp -d)
    sudo mv ${INSTALL_DIR}/public/uploads/* ${TEMP_UPLOADS}/ 2>/dev/null || true
fi

sudo cp -r public/* ${INSTALL_DIR}/public/

if [ -n "$TEMP_UPLOADS" ] && [ -d "$TEMP_UPLOADS" ]; then
    sudo mv ${TEMP_UPLOADS}/* ${INSTALL_DIR}/public/uploads/ 2>/dev/null || true
    rm -rf ${TEMP_UPLOADS}
fi

# 设置权限
CURRENT_USER=$(whoami)
sudo chown -R ${CURRENT_USER}:${CURRENT_USER} ${INSTALL_DIR}

log_success "文件替换完成"
echo ""

# 启动服务
log_info "启动服务..."

if command -v systemctl &> /dev/null && [ -f "/etc/systemd/system/hpc-platform.service" ]; then
    sudo systemctl start hpc-platform

    sleep 3

    if systemctl is-active --quiet hpc-platform; then
        log_success "服务启动成功"
    else
        log_error "服务启动失败"
        log_info "查看日志: sudo journalctl -u hpc-platform -n 50"
        exit 1
    fi
elif command -v pm2 &> /dev/null; then
    cd ${INSTALL_DIR}
    pm2 restart hpc-platform 2>/dev/null || pm2 start ecosystem.config.js

    log_success "PM2 应用已重启"
else
    log_warning "请手动启动应用"
fi

echo ""

# 完成
log_success "========================================="
log_success "重新编译完成！"
log_success "========================================="
echo ""

log_info "摘要："
echo "  - 备份位置: $BACKUP_DIR"
echo "  - 安装位置: $INSTALL_DIR"
echo "  - 编译时间: $(date)"
echo ""

log_info "验证部署："
echo "  1. 检查服务状态: sudo systemctl status hpc-platform"
echo "  2. 检查日志: tail -f ${INSTALL_DIR}/logs/app.log"
echo "  3. 浏览器访问应用，验证功能"
echo "  4. 特别检查使用了编译时变量的功能（如 WebShell）"
echo ""

log_info "如果出现问题，可以回滚："
echo "  sudo systemctl stop hpc-platform"
echo "  sudo rm -rf ${INSTALL_DIR}"
echo "  sudo mv ${BACKUP_DIR} ${INSTALL_DIR}"
echo "  sudo systemctl start hpc-platform"
echo ""
