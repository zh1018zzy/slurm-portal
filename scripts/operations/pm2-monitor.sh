#!/bin/bash

# PM2集群监控脚本
# 用于监控PM2集群状态并自动恢复

set -e

# 配置变量
APP_NAME="hpc-management-platform"
MAX_MEMORY="2G"
MAX_CPU_PERCENT=80
MIN_UPTIME=10000  # 10秒
LOG_FILE="/var/log/pm2-monitor.log"
NOTIFICATION_EMAIL=""  # 可选：设置邮件通知

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 日志函数
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_info() {
    log_message "INFO: $1"
}

log_warning() {
    log_message "WARNING: $1"
}

log_error() {
    log_message "ERROR: $1"
}

# 检查PM2是否运行
check_pm2_running() {
    if ! command -v pm2 &> /dev/null; then
        log_error "PM2未安装或不在PATH中"
        return 1
    fi
    
    if ! pm2 list | grep -q "$APP_NAME"; then
        log_error "应用 $APP_NAME 未在PM2中运行"
        return 1
    fi
    
    return 0
}

# 检查进程健康状态
check_process_health() {
    local health_issues=()
    
    # 获取PM2进程信息
    local pm2_info=$(pm2 jlist | jq -r '.[] | select(.name=="'$APP_NAME'")')
    
    if [ -z "$pm2_info" ]; then
        health_issues+=("应用未运行")
        return 1
    fi
    
    # 检查每个进程实例
    while IFS= read -r instance; do
        local status=$(echo "$instance" | jq -r '.pm2_env.status')
        local memory=$(echo "$instance" | jq -r '.monit.memory')
        local cpu=$(echo "$instance" | jq -r '.monit.cpu')
        local uptime=$(echo "$instance" | jq -r '.pm2_env.pm_uptime')
        local restarts=$(echo "$instance" | jq -r '.pm2_env.restart_time')
        local pid=$(echo "$instance" | jq -r '.pid')
        local pm_id=$(echo "$instance" | jq -r '.pm2_env.pm_id')
        
        # 检查进程状态
        if [ "$status" != "online" ]; then
            health_issues+=("进程 $pm_id 状态异常: $status")
        fi
        
        # 检查内存使用
        local memory_mb=$((memory / 1024 / 1024))
        local max_memory_mb=$(echo "$MAX_MEMORY" | sed 's/G//' | awk '{print $1 * 1024}')
        if [ "$memory_mb" -gt "$max_memory_mb" ]; then
            health_issues+=("进程 $pm_id 内存使用过高: ${memory_mb}MB")
        fi
        
        # 检查CPU使用
        if (( $(echo "$cpu > $MAX_CPU_PERCENT" | bc -l) )); then
            health_issues+=("进程 $pm_id CPU使用过高: ${cpu}%")
        fi
        
        # 检查运行时间
        local current_time=$(date +%s)
        local uptime_seconds=$(( (current_time * 1000 - uptime) / 1000 ))
        if [ "$uptime_seconds" -lt "$MIN_UPTIME" ]; then
            health_issues+=("进程 $pm_id 运行时间过短: ${uptime_seconds}秒")
        fi
        
        # 检查重启次数
        if [ "$restarts" -gt 10 ]; then
            health_issues+=("进程 $pm_id 重启次数过多: $restarts")
        fi
        
    done <<< "$(echo "$pm2_info" | jq -c '.')"
    
    # 返回健康状况
    if [ ${#health_issues[@]} -eq 0 ]; then
        log_info "所有进程健康状态良好"
        return 0
    else
        for issue in "${health_issues[@]}"; do
            log_warning "$issue"
        done
        return 1
    fi
}

# 检查应用响应
check_app_response() {
    local url="http://localhost:3000"
    local timeout=10
    
    if curl -f -s --max-time "$timeout" "$url" > /dev/null; then
        log_info "应用响应正常"
        return 0
    else
        log_error "应用无响应或响应超时"
        return 1
    fi
}

# 重启异常进程
restart_unhealthy_processes() {
    log_warning "重启异常进程..."
    
    # 重载应用（零停机重启）
    pm2 reload "$APP_NAME"
    
    # 等待重启完成
    sleep 10
    
    log_info "进程重启完成"
}

# 发送通知
send_notification() {
    local message="$1"
    local severity="$2"
    
    # 记录日志
    log_message "NOTIFICATION [$severity]: $message"
    
    # 发送邮件通知（如果配置了邮件地址）
    if [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "$message" | mail -s "HPC App Monitor Alert [$severity]" "$NOTIFICATION_EMAIL" 2>/dev/null || true
    fi
    
    # 发送系统通知
    if command -v logger &> /dev/null; then
        logger -t "hpc-app-monitor" "$message"
    fi
}

# 生成监控报告
generate_report() {
    local report_file="/tmp/pm2-monitor-report-$(date +%Y%m%d-%H%M%S).txt"
    
    {
        echo "=== PM2集群监控报告 ==="
        echo "生成时间: $(date)"
        echo
        
        echo "=== PM2进程列表 ==="
        pm2 list
        echo
        
        echo "=== 进程详细信息 ==="
        pm2 show "$APP_NAME"
        echo
        
        echo "=== 系统资源使用 ==="
        echo "CPU使用率:"
        top -bn1 | grep "Cpu(s)"
        echo
        echo "内存使用:"
        free -h
        echo
        echo "磁盘使用:"
        df -h /
        echo
        
        echo "=== 最近错误日志 ==="
        if [ -f "$LOG_FILE" ]; then
            tail -20 "$LOG_FILE"
        fi
        
    } > "$report_file"
    
    echo "$report_file"
}

# 主监控逻辑
monitor_cluster() {
    local issues_found=false
    
    # 检查PM2运行状态
    if ! check_pm2_running; then
        send_notification "PM2未运行或应用未启动" "CRITICAL"
        return 1
    fi
    
    # 检查进程健康状态
    if ! check_process_health; then
        issues_found=true
    fi
    
    # 检查应用响应
    if ! check_app_response; then
        issues_found=true
    fi
    
    # 如果发现问题，尝试修复
    if [ "$issues_found" = true ]; then
        send_notification "检测到应用异常，尝试自动修复" "WARNING"
        restart_unhealthy_processes
        
        # 再次检查
        sleep 30
        if check_app_response; then
            send_notification "应用已自动恢复正常" "INFO"
        else
            send_notification "自动恢复失败，需要人工干预" "CRITICAL"
            # 生成详细报告
            local report=$(generate_report)
            log_error "详细报告已生成: $report"
        fi
    fi
}

# 显示实时监控
show_realtime_monitor() {
    echo "开始实时监控 PM2 集群..."
    echo "按 Ctrl+C 退出"
    echo
    
    while true; do
        clear
        echo "=== PM2 集群监控 - $(date) ==="
        echo
        
        # 显示PM2列表
        pm2 list
        echo
        
        # 显示系统资源
        echo "=== 系统资源 ==="
        echo "CPU使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)%"
        echo "内存使用: $(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}')"
        echo "负载平均: $(uptime | awk -F'load average:' '{print $2}')"
        echo
        
        # 检查健康状态
        if check_process_health && check_app_response; then
            echo -e "${GREEN}✓ 集群状态: 健康${NC}"
        else
            echo -e "${RED}✗ 集群状态: 异常${NC}"
        fi
        
        sleep 5
    done
}

# 显示帮助信息
show_help() {
    cat << EOF
PM2集群监控脚本

用法: $0 [选项]

选项:
    monitor         执行一次监控检查
    watch           实时监控模式
    report          生成监控报告
    health          健康检查
    restart         重启异常进程
    help            显示此帮助信息

示例:
    $0 monitor      # 执行一次监控
    $0 watch        # 实时监控
    $0 health       # 健康检查
    $0 report       # 生成报告

配置:
    修改脚本顶部的配置变量来自定义监控参数
    设置 NOTIFICATION_EMAIL 来启用邮件通知

EOF
}

# 主函数
main() {
    # 创建日志文件
    touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/tmp/pm2-monitor.log"
    
    case "${1:-monitor}" in
        monitor)
            monitor_cluster
            ;;
        watch)
            show_realtime_monitor
            ;;
        report)
            report_file=$(generate_report)
            echo "监控报告已生成: $report_file"
            cat "$report_file"
            ;;
        health)
            if check_pm2_running && check_process_health && check_app_response; then
                echo -e "${GREEN}✓ 集群健康状态良好${NC}"
                exit 0
            else
                echo -e "${RED}✗ 集群存在异常${NC}"
                exit 1
            fi
            ;;
        restart)
            restart_unhealthy_processes
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            echo "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"