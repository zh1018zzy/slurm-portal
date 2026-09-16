#!/bin/bash

# HPC应用性能优化部署脚本
# 用于应用所有性能优化配置

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

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到root用户，建议使用普通用户运行此脚本"
        read -p "是否继续? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# 检查系统要求
check_system_requirements() {
    log_info "检查系统要求..."
    
    # 检查Node.js版本
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [[ $NODE_VERSION -lt 18 ]]; then
        log_error "Node.js版本过低，需要18或更高版本"
        exit 1
    fi
    
    log_success "Node.js版本: $(node -v)"
    
    # 检查PM2
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2未安装"
        exit 1
    fi
    
    log_success "PM2已安装"
    
    # 检查内存
    TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $TOTAL_MEM -lt 4 ]]; then
        log_warning "系统内存少于4GB，可能影响性能"
    fi
    
    log_success "系统内存: ${TOTAL_MEM}GB"
}

# 备份当前配置
backup_configuration() {
    log_info "备份当前配置..."
    
    BACKUP_DIR="./backup/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # 备份关键文件
    cp ecosystem.config.js "$BACKUP_DIR/" 2>/dev/null || true
    cp next.config.mjs "$BACKUP_DIR/" 2>/dev/null || true
    cp package.json "$BACKUP_DIR/" 2>/dev/null || true
    
    log_success "配置已备份到: $BACKUP_DIR"
}

# 优化系统配置
optimize_system_config() {
    log_info "优化系统配置..."
    
    # 增加文件描述符限制
    if ! grep -q "hpcapp soft nofile" /etc/security/limits.conf 2>/dev/null; then
        log_info "增加文件描述符限制..."
        echo "hpcapp soft nofile 65536" | sudo tee -a /etc/security/limits.conf
        echo "hpcapp hard nofile 65536" | sudo tee -a /etc/security/limits.conf
    fi
    
    # 优化内核参数
    if ! grep -q "net.core.somaxconn" /etc/sysctl.conf 2>/dev/null; then
        log_info "优化内核网络参数..."
        echo "net.core.somaxconn = 65535" | sudo tee -a /etc/sysctl.conf
        echo "net.ipv4.tcp_max_syn_backlog = 65535" | sudo tee -a /etc/sysctl.conf
        echo "net.ipv4.tcp_fin_timeout = 30" | sudo tee -a /etc/sysctl.conf
        echo "net.ipv4.tcp_keepalive_time = 1200" | sudo tee -a /etc/sysctl.conf
        sudo sysctl -p
    fi
    
    log_success "系统配置优化完成"
}

# 清理和优化
cleanup_and_optimize() {
    log_info "清理和优化..."
    
    # 清理日志文件
    if [[ -d "./logs" ]]; then
        find ./logs -name "*.log" -mtime +7 -delete 2>/dev/null || true
        log_info "清理7天前的日志文件"
    fi
    
    # 清理临时文件
    if [[ -d "./tmp" ]]; then
        rm -rf ./tmp/* 2>/dev/null || true
        log_info "清理临时文件"
    fi
    
    # 清理.next缓存
    if [[ -d ".next" ]]; then
        rm -rf .next/cache 2>/dev/null || true
        log_info "清理Next.js缓存"
    fi
    
    # 清理node_modules（可选）
    read -p "是否清理并重新安装node_modules? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log_info "清理node_modules..."
        rm -rf node_modules package-lock.json
        npm install --production
        log_success "node_modules重新安装完成"
    fi
    
    log_success "清理和优化完成"
}

# 重新构建应用
rebuild_application() {
    log_info "重新构建应用..."
    
    # 设置环境变量
    export NODE_ENV=production
    export NODE_OPTIONS="--max-old-space-size=4096"
    
    # 清理构建缓存
    rm -rf .next
    
    # 重新构建
    log_info "开始构建..."
    npm run build
    
    if [[ $? -eq 0 ]]; then
        log_success "应用构建成功"
    else
        log_error "应用构建失败"
        exit 1
    fi
}

# 重启PM2服务
restart_pm2_services() {
    log_info "重启PM2服务..."
    
    # 停止当前服务
    pm2 stop hpc-management-platform 2>/dev/null || true
    pm2 delete hpc-management-platform 2>/dev/null || true
    
    # 启动优化后的服务
    pm2 start ecosystem.config.js
    
    # 保存PM2配置
    pm2 save
    
    # 设置开机自启
    pm2 startup
    
    log_success "PM2服务重启完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署..."
    
    # 等待服务启动
    sleep 10
    
    # 检查PM2状态
    if pm2 list | grep -q "hpc-management-platform.*online"; then
        log_success "PM2服务运行正常"
    else
        log_error "PM2服务启动失败"
        pm2 logs hpc-management-platform --lines 20
        exit 1
    fi
    
    # 检查端口监听
    if netstat -tlnp | grep -q ":3000"; then
        log_success "端口3000监听正常"
    else
        log_error "端口3000未监听"
        exit 1
    fi
    
    # 测试API响应
    log_info "测试API响应..."
    if curl -f -s http://localhost:3000/api/jobs > /dev/null; then
        log_success "API响应正常"
    else
        log_warning "API响应异常，请检查日志"
    fi
}

# 运行性能诊断
run_performance_diagnosis() {
    log_info "运行性能诊断..."

    if [[ -f "./scripts/operations/performance-diagnosis.js" ]]; then
        node ./scripts/operations/performance-diagnosis.js
        log_success "性能诊断完成"
    else
        log_warning "性能诊断脚本不存在"
    fi
}

# 显示优化建议
show_optimization_tips() {
    log_info "性能优化建议:"
    echo
    echo "1. 监控系统资源:"
    echo "   - 使用 'pm2 monit' 监控进程"
    echo "   - 使用 'node scripts/operations/performance-monitor.js --continuous' 持续监控"
    echo
    echo "2. 定期维护:"
    echo "   - 每周运行性能诊断: 'node scripts/operations/performance-diagnosis.js'"
    echo "   - 定期清理日志文件"
    echo "   - 监控磁盘空间使用"
    echo
    echo "3. 进一步优化:"
    echo "   - 考虑使用Redis缓存"
    echo "   - 优化数据库查询"
    echo "   - 使用CDN加速静态资源"
    echo
    echo "4. 监控指标:"
    echo "   - API响应时间 < 1000ms"
    echo "   - CPU使用率 < 60%"
    echo "   - 内存使用率 < 70%"
    echo "   - 磁盘使用率 < 80%"
}

# 主函数
main() {
    echo "🚀 HPC应用性能优化部署脚本"
    echo "================================"
    echo
    
    check_root
    check_system_requirements
    backup_configuration
    optimize_system_config
    cleanup_and_optimize
    rebuild_application
    restart_pm2_services
    verify_deployment
    run_performance_diagnosis
    
    echo
    echo "🎉 性能优化部署完成!"
    echo
    show_optimization_tips
}

# 错误处理
trap 'log_error "脚本执行失败，请检查错误信息"; exit 1' ERR

# 执行主函数
main "$@" 