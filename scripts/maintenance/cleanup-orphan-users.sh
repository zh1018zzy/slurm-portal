#!/bin/bash

# 清理孤立的Supabase Auth用户账号脚本

set -euo pipefail

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 检查环境
check_environment() {
    log_info "检查环境配置..."
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装或不在PATH中"
        exit 1
    fi
    
    # 检查环境文件
    if [ ! -f "$PROJECT_ROOT/.env.local" ] && [ ! -f "$PROJECT_ROOT/.env" ]; then
        log_error "环境配置文件 .env.local 或 .env 不存在"
        exit 1
    fi
    
    # 加载环境变量，优先使用.env.local
    if [ -f "$PROJECT_ROOT/.env.local" ]; then
        source "$PROJECT_ROOT/.env.local"
    fi
    if [ -f "$PROJECT_ROOT/.env" ]; then
        source "$PROJECT_ROOT/.env"
    fi
    
    # 检查必要的环境变量
    if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
        log_error "SUPABASE_SERVICE_ROLE_KEY 未设置"
        log_error "需要Service Role Key才能删除认证用户"
        exit 1
    fi
    
    if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -z "${SUPABASE_URL:-}" ]; then
        log_error "NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_URL 未设置"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}清理孤立的Supabase Auth用户账号脚本${NC}"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  --dry-run     仅显示将要进行的操作，不实际执行"
    echo "  --verbose     详细输出"
    echo "  --help        显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 --dry-run --verbose    # 预览清理操作"
    echo "  $0                        # 执行实际清理"
    echo
    echo "注意事项:"
    echo "  - 此脚本会删除Supabase Auth中孤立的用户账号"
    echo "  - 孤立用户是指Auth中存在但业务users表中不存在的用户"
    echo "  - 使用 --dry-run 选项可以预览将要进行的操作"
    echo "  - 需要SUPABASE_SERVICE_ROLE_KEY权限"
    echo "  - 建议在首次运行前使用 --dry-run 选项"
}

# 主函数
main() {
    local dry_run=false
    local verbose=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 检查环境
    check_environment
    
    # 构建Node.js脚本参数
    local node_args=""
    if [ "$dry_run" = true ]; then
        node_args="$node_args --dry-run"
    fi
    if [ "$verbose" = true ]; then
        node_args="$node_args --verbose"
    fi
    
    # 切换到项目根目录
    cd "$PROJECT_ROOT"
    
    # 运行清理脚本
    log_info "开始清理孤立的认证用户..."
    log_info "参数: $node_args"
    
    if node scripts/cleanup-orphan-auth-users.js $node_args; then
        log_success "清理完成"
    else
        log_error "清理失败"
        exit 1
    fi
}

# 运行主函数
main "$@" 