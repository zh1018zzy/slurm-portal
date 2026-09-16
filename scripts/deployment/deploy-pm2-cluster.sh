#!/bin/bash

# HPC管理平台 PM2集群部署脚本
# 版本: v1.0
# 使用方法: ./scripts/deploy-pm2-cluster.sh [选项]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
APP_NAME="hpc-management-platform"
APP_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
PM2_USER="hpcapp"
LOG_DIR="$APP_DIR/logs"

# 打印函数
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
HPC管理平台 PM2集群部署脚本

用法: $0 [选项]

选项:
    -h, --help          显示此帮助信息
    -i, --install       安装PM2和依赖
    -d, --deploy        部署应用到PM2集群
    --deploy-sync       部署作业同步服务
    --deploy-all        部署应用和同步服务
    -r, --restart       重启PM2集群
    -s, --stop          停止PM2集群
    -m, --monitor       监控PM2集群状态
    -l, --logs          查看PM2日志
    -c, --cleanup       清理旧的PM2进程
    --setup-service     设置PM2系统服务
    --health-check      健康检查
    --performance       性能测试
    --sync-status       查看同步服务状态

示例:
    $0 --install        # 安装PM2和依赖
    $0 --deploy-all     # 部署应用和同步服务
    $0 --deploy-sync    # 仅部署同步服务
    $0 --monitor        # 监控状态
    $0 --sync-status    # 查看同步服务状态

EOF
}

# 检查系统要求
check_requirements() {
    print_info "检查系统要求..."
    
    # 检查Node.js版本
    if ! command -v node &> /dev/null; then
        print_error "Node.js未安装，请先安装Node.js 18+"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_error "Node.js版本过低，需要18+，当前版本: $(node --version)"
        exit 1
    fi
    
    # 检查内存
    local total_memory=$(free -m | awk 'NR==2{printf "%.0f", $2}')
    if [ "$total_memory" -lt 4096 ]; then
        print_warning "系统内存少于4GB，建议增加内存以获得更好性能"
    fi
    
    # 检查CPU核心数
    local cpu_cores=$(nproc)
    print_info "检测到 $cpu_cores 个CPU核心"
    
    print_success "系统要求检查完成"
}

# 安装PM2和依赖
install_pm2() {
    print_info "安装PM2和相关依赖..."
    
    # 安装PM2
    if ! command -v pm2 &> /dev/null; then
        print_info "安装PM2..."
        npm install -g pm2@latest
    else
        print_info "PM2已安装，版本: $(pm2 --version)"
    fi
    
    # 安装PM2日志轮转
    pm2 install pm2-logrotate
    
    # 配置日志轮转
    pm2 set pm2-logrotate:max_size 100M
    pm2 set pm2-logrotate:retain 30
    pm2 set pm2-logrotate:compress true
    pm2 set pm2-logrotate:dateFormat YYYY-MM-DD_HH-mm-ss
    
    print_success "PM2安装完成"
}

# 创建必要目录
create_directories() {
    print_info "创建必要目录..."

    # 创建日志目录
    mkdir -p "$LOG_DIR"

    # 设置权限（如果hpcapp用户存在）
    if [ "$(whoami)" = "root" ] && id "$PM2_USER" &>/dev/null; then
        chown -R $PM2_USER:$PM2_USER "$LOG_DIR"
        chmod 755 "$LOG_DIR"
    else
        chmod 755 "$LOG_DIR"
    fi

    print_success "目录创建完成"
}

# 停止现有进程
stop_existing() {
    print_info "停止现有进程..."
    
    # 停止PM2进程
    if pm2 list | grep -q "$APP_NAME"; then
        print_info "停止现有PM2进程..."
        pm2 stop "$APP_NAME" 2>/dev/null || true
        pm2 delete "$APP_NAME" 2>/dev/null || true
    fi
    
    # 停止可能运行的npm进程
    pkill -f "npm.*start" 2>/dev/null || true
    pkill -f "next.*start" 2>/dev/null || true
    
    print_success "现有进程已停止"
}

# 构建应用
build_application() {
    print_info "构建应用..."
    
    cd "$APP_DIR"
    
    # 安装依赖
    print_info "安装npm依赖..."
    npm install --production=false
    
    # 构建应用
    print_info "构建Next.js应用..."
    npm run build
    
    print_success "应用构建完成"
}

# 部署PM2集群
deploy_cluster() {
    print_info "部署PM2集群..."

    cd "$APP_DIR"

    # 检查配置文件
    if [ ! -f "ecosystem.config.js" ]; then
        print_error "PM2配置文件不存在: ecosystem.config.js"
        exit 1
    fi

    # 启动PM2集群
    print_info "启动PM2集群..."
    pm2 start ecosystem.config.js --env production

    # 保存PM2配置
    pm2 save

    print_success "PM2集群部署完成"
}

# 部署作业同步服务
deploy_job_sync() {
    print_info "部署作业同步服务..."

    cd "$APP_DIR"

    # 检查同步脚本是否存在
    if [ ! -f "scripts/cron/start-job-sync.js" ]; then
        print_error "作业同步脚本不存在: scripts/cron/start-job-sync.js"
        return 1
    fi

    # 停止现有的job-sync服务（如果存在）
    if pm2 list | grep -q "job-sync"; then
        print_info "停止现有job-sync服务..."
        pm2 stop job-sync 2>/dev/null || true
        pm2 delete job-sync 2>/dev/null || true
    fi

    # 启动job-sync服务
    print_info "启动作业同步服务..."
    pm2 start scripts/cron/start-job-sync.js \
        --name job-sync \
        --cron-restart="0 3 * * *" \
        --max-memory-restart 200M \
        --error "$LOG_DIR/job-sync-error.log" \
        --output "$LOG_DIR/job-sync-out.log"

    # 保存PM2配置
    pm2 save

    print_success "作业同步服务部署完成"
    print_info "服务运行状态: 60秒轮询，每天3点自动重启"
}

# 设置系统服务
setup_service() {
    print_info "设置PM2系统服务..."
    
    # 生成启动脚本
    pm2 startup systemd -u "$PM2_USER" --hp "/home/$PM2_USER"
    
    print_success "系统服务设置完成"
    print_warning "请以root权限运行显示的命令来完成系统服务设置"
}

# 健康检查
health_check() {
    print_info "执行健康检查..."
    
    # 检查PM2状态
    if ! pm2 list | grep -q "$APP_NAME"; then
        print_error "PM2进程未运行"
        return 1
    fi
    
    # 检查进程状态
    local online_count=$(pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'") | select(.pm2_env.status=="online") | .pm2_env.pm_id' | wc -l)
    local total_count=$(pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'") | .pm2_env.pm_id' | wc -l)
    
    print_info "进程状态: $online_count/$total_count 在线"
    
    # 检查端口监听
    if netstat -tlnp | grep -q ":3000.*LISTEN"; then
        print_success "端口3000正在监听"
    else
        print_error "端口3000未在监听"
        return 1
    fi
    
    # 检查HTTP响应
    if curl -f -s http://localhost:3000 > /dev/null; then
        print_success "HTTP健康检查通过"
    else
        print_error "HTTP健康检查失败"
        return 1
    fi
    
    print_success "健康检查完成"
}

# 性能测试
performance_test() {
    print_info "执行性能测试..."
    
    # 检查CPU使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    print_info "当前CPU使用率: ${cpu_usage}%"
    
    # 检查内存使用
    local memory_info=$(free -m | awk 'NR==2{printf "已用: %sMB, 可用: %sMB, 使用率: %.1f%%", $3,$7,$3*100/$2}')
    print_info "内存使用: $memory_info"
    
    # 检查PM2进程内存
    print_info "PM2进程内存使用:"
    pm2 monit --no-daemon | head -20
    
    # 简单并发测试
    if command -v ab &> /dev/null; then
        print_info "执行并发测试 (100请求, 10并发)..."
        ab -n 100 -c 10 http://localhost:3000/ | grep -E "(Requests per second|Time per request)"
    else
        print_warning "Apache Bench (ab) 未安装，跳过并发测试"
    fi
    
    print_success "性能测试完成"
}

# 监控集群状态
monitor_cluster() {
    print_info "监控PM2集群状态..."
    
    # 显示PM2列表
    pm2 list
    
    # 显示详细信息
    echo
    print_info "应用详细信息:"
    pm2 show "$APP_NAME"
    
    # 显示实时监控
    echo
    print_info "启动实时监控 (按Ctrl+C退出)..."
    pm2 monit
}

# 查看日志
view_logs() {
    print_info "查看PM2日志..."
    
    # 显示日志选项
    echo "选择日志类型:"
    echo "1) 实时日志 (所有)"
    echo "2) 错误日志"
    echo "3) 输出日志"
    echo "4) 最近100行日志"
    read -p "请选择 (1-4): " choice
    
    case $choice in
        1)
            pm2 logs "$APP_NAME" --lines 50
            ;;
        2)
            pm2 logs "$APP_NAME" --err --lines 50
            ;;
        3)
            pm2 logs "$APP_NAME" --out --lines 50
            ;;
        4)
            pm2 logs "$APP_NAME" --lines 100 --nostream
            ;;
        *)
            print_error "无效选择"
            ;;
    esac
}

# 重启集群
restart_cluster() {
    print_info "重启PM2集群..."
    
    # 零停机重启
    pm2 reload "$APP_NAME"
    
    # 等待重启完成
    sleep 5
    
    # 检查状态
    pm2 list
    
    print_success "集群重启完成"
}

# 停止集群
stop_cluster() {
    print_info "停止PM2集群..."
    
    pm2 stop "$APP_NAME"
    
    print_success "集群已停止"
}

# 查看同步服务状态
check_sync_status() {
    print_info "查看作业同步服务状态..."

    # 检查job-sync进程是否运行
    if pm2 list | grep -q "job-sync"; then
        print_success "作业同步服务正在运行"

        # 显示详细信息
        pm2 show job-sync

        # 显示最近日志
        echo
        print_info "最近的同步日志:"
        pm2 logs job-sync --lines 20 --nostream
    else
        print_error "作业同步服务未运行"
        print_info "运行以下命令启动同步服务:"
        print_info "  $0 --deploy-sync"
        return 1
    fi
}

# 清理资源
cleanup() {
    print_info "清理PM2资源..."
    
    # 停止并删除应用
    pm2 stop "$APP_NAME" 2>/dev/null || true
    pm2 delete "$APP_NAME" 2>/dev/null || true
    
    # 清理日志
    pm2 flush
    
    # 清理PM2缓存
    pm2 kill
    
    print_success "清理完成"
}

# 主函数
main() {
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -i|--install)
                check_requirements
                install_pm2
                exit 0
                ;;
            -d|--deploy)
                check_requirements
                create_directories
                stop_existing
                build_application
                deploy_cluster
                health_check
                exit 0
                ;;
            --deploy-sync)
                check_requirements
                create_directories
                deploy_job_sync
                exit 0
                ;;
            --deploy-all)
                check_requirements
                create_directories
                stop_existing
                build_application
                deploy_cluster
                deploy_job_sync
                health_check
                exit 0
                ;;
            -r|--restart)
                restart_cluster
                exit 0
                ;;
            -s|--stop)
                stop_cluster
                exit 0
                ;;
            -m|--monitor)
                monitor_cluster
                exit 0
                ;;
            -l|--logs)
                view_logs
                exit 0
                ;;
            -c|--cleanup)
                cleanup
                exit 0
                ;;
            --setup-service)
                setup_service
                exit 0
                ;;
            --health-check)
                health_check
                exit 0
                ;;
            --performance)
                performance_test
                exit 0
                ;;
            --sync-status)
                check_sync_status
                exit 0
                ;;
            *)
                print_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 如果没有参数，显示帮助
    show_help
}

# 执行主函数
main "$@"