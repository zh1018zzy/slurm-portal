#!/bin/bash
# HPC 平台客户环境安装脚本
# 用于在客户服务器上安装已编译好的应用

set -e

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

# 获取脚本所在目录（部署包根目录）
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DEPLOY_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
APP_DIR="${DEPLOY_ROOT}/app"
INSTALL_DIR="/opt/hpc-platform"
SERVICE_NAME="hpc-platform"
CURRENT_USER=$(whoami)

log_info "========================================="
log_info "HPC 平台安装程序"
log_info "========================================="
echo ""

# 显示部署信息
if [ -f "${DEPLOY_ROOT}/VERSION.json" ]; then
    log_info "版本信息:"
    cat ${DEPLOY_ROOT}/VERSION.json | grep -E '"(version|buildDate)"' | sed 's/^/  /'
    echo ""
fi

# 1. 检查是否为 root 用户
check_privileges() {
    log_info "检查用户权限..."
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到 root 用户运行"
        log_warning "建议使用普通用户运行，并在需要时提供 sudo 密码"
    else
        log_info "当前用户: $CURRENT_USER"
        # 检查 sudo 权限
        if ! sudo -n true 2>/dev/null; then
            log_warning "安装过程中可能需要 sudo 权限（用于创建 systemd 服务）"
        fi
    fi
    echo ""
}

# 2. 检查系统要求
check_system_requirements() {
    log_info "检查系统要求..."

    # 检查操作系统
    if [[ ! -f /etc/os-release ]]; then
        log_error "无法检测操作系统版本"
        exit 1
    fi

    OS_NAME=$(grep ^NAME= /etc/os-release | cut -d'=' -f2 | tr -d '"')
    log_info "操作系统: $OS_NAME"

    # 检查 Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)

        log_info "Node.js 版本: $NODE_VERSION"

        if [[ $NODE_MAJOR -ge 18 ]]; then
            log_success "Node.js 版本满足要求 (>= 18.0.0)"
        else
            log_error "Node.js 版本过低，需要 >= 18.0.0"
            log_info "请安装 Node.js 18 或更高版本"
            exit 1
        fi
    else
        log_error "未找到 Node.js"
        log_info "请先安装 Node.js 18 或更高版本"
        log_info "推荐使用 NVM 安装: https://github.com/nvm-sh/nvm"
        exit 1
    fi

    # 检查 systemd
    if command -v systemctl &> /dev/null; then
        log_success "检测到 systemd"
    else
        log_warning "未检测到 systemd，将无法创建系统服务"
    fi

    echo ""
}

# 3. 配置环境变量
configure_environment() {
    log_info "配置环境变量..."

    if [ ! -f "${DEPLOY_ROOT}/.env" ]; then
        if [ -f "${DEPLOY_ROOT}/.env.template" ]; then
            log_warning "未找到 .env 文件"

            read -p "是否基于模板创建 .env 文件? (y/n) " -n 1 -r
            echo

            if [[ $REPLY =~ ^[Yy]$ ]]; then
                cp ${DEPLOY_ROOT}/.env.template ${DEPLOY_ROOT}/.env
                log_success "已创建 .env 文件"
                log_warning "请编辑 .env 文件配置实际环境参数"
                log_warning "特别注意标记为 [编译时] 的变量："
                log_warning "  - 如果这些变量的值与打包时不同，需要重新编译"
                log_warning "  - 或者使用提供的重新编译脚本"
                echo ""

                read -p "是否现在编辑配置文件? (y/n) " -n 1 -r
                echo

                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    ${EDITOR:-vi} ${DEPLOY_ROOT}/.env
                else
                    log_warning "请稍后手动编辑 ${DEPLOY_ROOT}/.env"
                    log_info "编辑完成后，重新运行此安装脚本"
                    exit 0
                fi
            else
                log_error "需要 .env 配置文件才能继续安装"
                exit 1
            fi
        else
            log_error "未找到 .env.template 模板文件"
            exit 1
        fi
    else
        log_success "找到 .env 配置文件"

        # 检查是否需要更新编译时变量
        log_info "检查编译时环境变量..."

        # 提取当前环境中的 NEXT_PUBLIC_ 变量
        NEXT_PUBLIC_VARS=$(grep "^NEXT_PUBLIC_" ${DEPLOY_ROOT}/.env 2>/dev/null || true)

        if [ -n "$NEXT_PUBLIC_VARS" ]; then
            log_warning "检测到以下编译时变量（NEXT_PUBLIC_*）："
            echo "$NEXT_PUBLIC_VARS" | sed 's/^/  /'
            echo ""
            log_warning "如果这些值与打包时不同，可能需要重新编译应用"
            log_info "可选操作："
            log_info "  1. 确认这些值正确，继续安装"
            log_info "  2. 修改 .env 后使用重新编译脚本（如果提供）"
            log_info "  3. 返回本地环境用正确的值重新打包"
            echo ""
        fi
    fi

    echo ""
}

# 4. 选择安装位置
select_install_location() {
    log_info "选择安装位置..."

    read -p "安装到默认位置 ${INSTALL_DIR}? (y/n) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        read -p "请输入安装路径: " CUSTOM_INSTALL_DIR
        INSTALL_DIR="$CUSTOM_INSTALL_DIR"
    fi

    log_info "安装位置: ${INSTALL_DIR}"
    echo ""
}

# 5. 安装应用文件
install_application() {
    log_info "安装应用文件..."

    # 创建安装目录
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "目录 ${INSTALL_DIR} 已存在"

        read -p "是否备份现有安装并覆盖? (y/n) " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            BACKUP_DIR="${INSTALL_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
            log_info "备份现有安装到: ${BACKUP_DIR}"
            sudo mv "$INSTALL_DIR" "$BACKUP_DIR" || {
                log_error "备份失败"
                exit 1
            }
        else
            log_error "安装已取消"
            exit 1
        fi
    fi

    # 创建安装目录
    sudo mkdir -p "$INSTALL_DIR"

    # 复制应用文件
    log_info "复制应用文件到 ${INSTALL_DIR}..."
    sudo cp -r ${APP_DIR}/* ${INSTALL_DIR}/

    # 复制配置文件
    log_info "复制配置文件..."
    sudo cp -r ${DEPLOY_ROOT}/config ${INSTALL_DIR}/

    # 复制环境变量文件
    sudo cp ${DEPLOY_ROOT}/.env ${INSTALL_DIR}/

    # 复制其他必要文件
    if [ -f "${DEPLOY_ROOT}/ecosystem.config.js" ]; then
        sudo cp ${DEPLOY_ROOT}/ecosystem.config.js ${INSTALL_DIR}/
    fi

    if [ -d "${DEPLOY_ROOT}/scripts" ]; then
        sudo cp -r ${DEPLOY_ROOT}/scripts ${INSTALL_DIR}/
    fi

    # 创建必要的运行时目录
    log_info "创建运行时目录..."
    sudo mkdir -p ${INSTALL_DIR}/public/uploads
    sudo mkdir -p ${INSTALL_DIR}/logs
    sudo mkdir -p ${INSTALL_DIR}/data
    sudo mkdir -p ${INSTALL_DIR}/backup

    # 设置目录权限
    log_info "设置目录权限..."
    sudo chown -R $CURRENT_USER:$CURRENT_USER ${INSTALL_DIR}
    sudo chmod -R 755 ${INSTALL_DIR}

    # 特殊权限设置
    sudo chmod 700 ${INSTALL_DIR}/.env
    sudo chmod 755 ${INSTALL_DIR}/public/uploads
    sudo chmod 755 ${INSTALL_DIR}/logs
    sudo chmod 755 ${INSTALL_DIR}/data
    sudo chmod 755 ${INSTALL_DIR}/backup

    log_success "应用文件安装完成"
    echo ""
}

# 6. 创建 systemd 服务
create_systemd_service() {
    if ! command -v systemctl &> /dev/null; then
        log_warning "未检测到 systemd，跳过服务创建"
        return
    fi

    log_info "创建 systemd 服务..."

    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

    if [ -f "$SERVICE_FILE" ]; then
        log_warning "服务文件已存在: ${SERVICE_FILE}"

        read -p "是否覆盖? (y/n) " -n 1 -r
        echo

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "跳过服务创建"
            return
        fi
    fi

    # 创建服务文件
    sudo tee "$SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=HPC Management Platform
Documentation=https://github.com/your-org/hpc-platform
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=$(which node) ${INSTALL_DIR}/server.js
Restart=always
RestartSec=10
StandardOutput=append:${INSTALL_DIR}/logs/app.log
StandardError=append:${INSTALL_DIR}/logs/error.log

# 资源限制
LimitNOFILE=65535
LimitNPROC=4096

# 安全加固
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

    # 重新加载 systemd
    sudo systemctl daemon-reload

    log_success "systemd 服务创建完成"
    log_info "服务名称: ${SERVICE_NAME}"
    echo ""
}

# 7. WebShell 服务配置
create_webshell_service() {
    if ! command -v systemctl &> /dev/null; then
        return
    fi

    log_info "配置 WebShell 服务..."

    # 检查是否需要 WebShell
    if ! grep -q "WEBSHELL_PORT" ${INSTALL_DIR}/.env 2>/dev/null; then
        log_info "未配置 WebShell，跳过"
        return
    fi

    WEBSHELL_SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}-webshell.service"

    sudo tee "$WEBSHELL_SERVICE_FILE" > /dev/null << EOF
[Unit]
Description=HPC Platform WebShell Service
After=network.target

[Service]
Type=simple
User=${CURRENT_USER}
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=$(which node) ${INSTALL_DIR}/lib/webshell-server.js
Restart=always
RestartSec=10
StandardOutput=append:${INSTALL_DIR}/logs/webshell.log
StandardError=append:${INSTALL_DIR}/logs/webshell-error.log

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    log_success "WebShell 服务配置完成"
    echo ""
}

# 8. 配置 PM2（可选）
setup_pm2() {
    if ! command -v pm2 &> /dev/null; then
        log_info "未安装 PM2，跳过 PM2 配置"
        log_info "提示: 可以使用 'npm install -g pm2' 安装 PM2"
        return
    fi

    log_info "检测到 PM2..."

    read -p "是否使用 PM2 管理应用? (y/n) " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return
    fi

    if [ -f "${INSTALL_DIR}/ecosystem.config.js" ]; then
        log_info "使用 PM2 启动应用..."
        cd ${INSTALL_DIR}
        pm2 start ecosystem.config.js
        pm2 save
        log_success "PM2 配置完成"
    else
        log_warning "未找到 PM2 配置文件"
    fi
    echo ""
}

# 9. 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."

    if command -v firewall-cmd &> /dev/null; then
        log_info "检测到 firewalld"

        read -p "是否配置防火墙规则? (y/n) " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            # 读取端口配置
            APP_PORT=$(grep "^PORT=" ${INSTALL_DIR}/.env | cut -d'=' -f2 || echo "3000")
            WEBSHELL_PORT=$(grep "^WEBSHELL_PORT=" ${INSTALL_DIR}/.env | cut -d'=' -f2 || echo "3001")

            log_info "开放端口: ${APP_PORT}, ${WEBSHELL_PORT}"

            sudo firewall-cmd --permanent --add-port=${APP_PORT}/tcp
            sudo firewall-cmd --permanent --add-port=${WEBSHELL_PORT}/tcp
            sudo firewall-cmd --reload

            log_success "防火墙规则配置完成"
        fi
    elif command -v ufw &> /dev/null; then
        log_info "检测到 UFW"

        read -p "是否配置防火墙规则? (y/n) " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            APP_PORT=$(grep "^PORT=" ${INSTALL_DIR}/.env | cut -d'=' -f2 || echo "3000")
            WEBSHELL_PORT=$(grep "^WEBSHELL_PORT=" ${INSTALL_DIR}/.env | cut -d'=' -f2 || echo "3001")

            sudo ufw allow ${APP_PORT}/tcp
            sudo ufw allow ${WEBSHELL_PORT}/tcp

            log_success "防火墙规则配置完成"
        fi
    else
        log_info "未检测到支持的防火墙，请手动配置"
    fi
    echo ""
}

# 10. 执行安装后检查
post_install_check() {
    log_info "执行安装后检查..."

    # 检查文件完整性
    if [ ! -f "${INSTALL_DIR}/server.js" ]; then
        log_error "关键文件缺失: server.js"
        exit 1
    fi

    if [ ! -f "${INSTALL_DIR}/.env" ]; then
        log_error "配置文件缺失: .env"
        exit 1
    fi

    # 检查目录权限
    if [ ! -w "${INSTALL_DIR}/public/uploads" ]; then
        log_warning "上传目录不可写: ${INSTALL_DIR}/public/uploads"
    fi

    if [ ! -w "${INSTALL_DIR}/logs" ]; then
        log_warning "日志目录不可写: ${INSTALL_DIR}/logs"
    fi

    log_success "安装后检查完成"
    echo ""
}

# 11. 显示安装摘要
show_summary() {
    log_success "========================================="
    log_success "安装完成！"
    log_success "========================================="
    echo ""

    log_info "安装信息："
    echo "  - 安装位置: ${INSTALL_DIR}"
    echo "  - 配置文件: ${INSTALL_DIR}/.env"
    echo "  - 日志目录: ${INSTALL_DIR}/logs"
    echo "  - 上传目录: ${INSTALL_DIR}/public/uploads"
    echo ""

    log_info "启动服务："

    if command -v systemctl &> /dev/null; then
        echo "  # 使用 systemd 启动"
        echo "  sudo systemctl start ${SERVICE_NAME}"
        echo "  sudo systemctl enable ${SERVICE_NAME}  # 开机自启"
        echo ""
        echo "  # 查看服务状态"
        echo "  sudo systemctl status ${SERVICE_NAME}"
        echo ""
        echo "  # 查看日志"
        echo "  sudo journalctl -u ${SERVICE_NAME} -f"
        echo "  # 或直接查看日志文件"
        echo "  tail -f ${INSTALL_DIR}/logs/app.log"
        echo ""
    fi

    if command -v pm2 &> /dev/null; then
        echo "  # 使用 PM2 启动"
        echo "  cd ${INSTALL_DIR}"
        echo "  pm2 start ecosystem.config.js"
        echo "  pm2 save"
        echo "  pm2 startup  # 配置开机自启"
        echo ""
    fi

    echo "  # 直接启动（测试用）"
    echo "  cd ${INSTALL_DIR}"
    echo "  node server.js"
    echo ""

    log_warning "重要提示："
    echo "  1. 首次启动前，请确认 .env 配置正确"
    echo "  2. 特别检查数据库连接、LDAP配置等关键参数"
    echo "  3. 检查编译时变量（NEXT_PUBLIC_*）是否与实际环境匹配"
    echo "  4. 确保相关服务（数据库、LDAP等）已启动"
    echo ""

    log_info "访问地址："
    APP_PORT=$(grep "^PORT=" ${INSTALL_DIR}/.env | cut -d'=' -f2 2>/dev/null || echo "3000")
    echo "  http://$(hostname -I | awk '{print $1}'):${APP_PORT}"
    echo ""

    log_info "故障排查："
    echo "  - 服务无法启动: 检查 ${INSTALL_DIR}/logs/error.log"
    echo "  - 端口被占用: 修改 .env 中的 PORT 配置"
    echo "  - 编译时变量错误: 参考文档重新编译或打包"
    echo ""
}

# 主安装流程
main() {
    check_privileges
    check_system_requirements
    configure_environment
    select_install_location
    install_application
    create_systemd_service
    create_webshell_service
    setup_pm2
    configure_firewall
    post_install_check
    show_summary
}

# 执行主函数
main "$@"
