#!/bin/bash

# PM2系统服务管理脚本
# 用于设置PM2作为系统服务运行

set -e

# 配置变量
SERVICE_NAME="pm2-hpcapp"
PM2_USER="hpcapp"
PM2_HOME="/home/$PM2_USER/.pm2"
APP_DIR="/opt/my-hpcapp"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        print_error "此脚本需要root权限运行"
        exit 1
    fi
}

# 创建systemd服务文件
create_systemd_service() {
    print_info "创建systemd服务文件..."
    
    cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=PM2 process manager for HPC Management Platform
Documentation=https://pm2.keymetrics.io/
After=network.target

[Service]
Type=forking
User=$PM2_USER
LimitNOFILE=infinity
LimitNPROC=infinity
LimitCORE=infinity
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/games:/usr/local/games:/snap/bin
Environment=PM2_HOME=$PM2_HOME
PIDFile=$PM2_HOME/pm2.pid
Restart=on-failure

ExecStart=/usr/bin/pm2 resurrect
ExecReload=/usr/bin/pm2 reload all
ExecStop=/usr/bin/pm2 kill

[Install]
WantedBy=multi-user.target
EOF

    print_info "systemd服务文件已创建: /etc/systemd/system/${SERVICE_NAME}.service"
}

# 设置PM2开机自启
setup_pm2_startup() {
    print_info "设置PM2开机自启..."
    
    # 切换到应用用户执行PM2命令
    sudo -u $PM2_USER bash << EOF
# 设置PM2_HOME环境变量
export PM2_HOME=$PM2_HOME

# 生成启动脚本
pm2 startup systemd -u $PM2_USER --hp /home/$PM2_USER

# 保存当前PM2进程列表
pm2 save --force
EOF

    print_info "PM2开机自启设置完成"
}

# 启用并启动服务
enable_service() {
    print_info "启用并启动服务..."
    
    # 重载systemd配置
    systemctl daemon-reload
    
    # 启用服务
    systemctl enable ${SERVICE_NAME}
    
    # 启动服务
    systemctl start ${SERVICE_NAME}
    
    print_info "服务已启用并启动"
}

# 检查服务状态
check_service_status() {
    print_info "检查服务状态..."
    
    systemctl status ${SERVICE_NAME} --no-pager
    
    # 检查PM2进程
    print_info "检查PM2进程状态..."
    sudo -u $PM2_USER pm2 list
}

# 卸载服务
uninstall_service() {
    print_warning "卸载PM2系统服务..."
    
    # 停止服务
    systemctl stop ${SERVICE_NAME} 2>/dev/null || true
    
    # 禁用服务
    systemctl disable ${SERVICE_NAME} 2>/dev/null || true
    
    # 删除服务文件
    rm -f /etc/systemd/system/${SERVICE_NAME}.service
    
    # 重载systemd配置
    systemctl daemon-reload
    
    print_info "PM2系统服务已卸载"
}

# 显示使用帮助
show_help() {
    cat << EOF
PM2系统服务管理脚本

用法: $0 [选项]

选项:
    install     安装PM2系统服务
    uninstall   卸载PM2系统服务
    status      查看服务状态
    restart     重启服务
    start       启动服务
    stop        停止服务
    enable      启用服务
    disable     禁用服务

示例:
    $0 install      # 安装PM2系统服务
    $0 status       # 查看服务状态
    $0 restart      # 重启服务

EOF
}

# 主函数
main() {
    case "${1:-}" in
        install)
            check_root
            create_systemd_service
            setup_pm2_startup
            enable_service
            check_service_status
            print_info "PM2系统服务安装完成！"
            ;;
        uninstall)
            check_root
            uninstall_service
            ;;
        status)
            check_service_status
            ;;
        restart)
            check_root
            systemctl restart ${SERVICE_NAME}
            check_service_status
            ;;
        start)
            check_root
            systemctl start ${SERVICE_NAME}
            ;;
        stop)
            check_root
            systemctl stop ${SERVICE_NAME}
            ;;
        enable)
            check_root
            systemctl enable ${SERVICE_NAME}
            ;;
        disable)
            check_root
            systemctl disable ${SERVICE_NAME}
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

main "$@"