#!/bin/bash

# LDAP用户同步脚本
# 用于将LDAP中的用户同步到Supabase数据库中

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
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

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
    
    if [ -z "${LDAP_URL:-}" ]; then
        log_warning "LDAP_URL 未设置，将使用默认值: ldap://localhost:389"
    fi
    
    if [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && [ -z "${SUPABASE_URL:-}" ]; then
        log_error "NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_URL 未设置"
        exit 1
    fi
    
    if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && [ -z "${SUPABASE_ANON_KEY:-}" ] && [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]; then
        log_error "Supabase密钥未设置"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 检查LDAP连接
test_ldap_connection() {
    log_info "测试LDAP连接..."
    
    # 加载环境变量
    source "$PROJECT_ROOT/.env.local"
    
    local ldap_url="${LDAP_URL:-ldap://localhost:389}"
    local bind_dn="${LDAP_BIND_DN:-cn=admin,dc=my-hpc,dc=com}"
    local bind_password="${LDAP_BIND_PASSWORD:-admin}"
    local base_dn="${LDAP_BASE_DN:-dc=my-hpc,dc=com}"
    
    # 使用ldapsearch测试连接
    if command -v ldapsearch &> /dev/null; then
        if ldapsearch -x -H "$ldap_url" -D "$bind_dn" -w "$bind_password" -b "$base_dn" "(objectclass=*)" >/dev/null 2>&1; then
            log_success "LDAP连接测试成功"
            return 0
        else
            log_warning "LDAP连接测试失败，但将继续执行（可能是权限问题）"
            return 0
        fi
    else
        log_warning "ldapsearch 命令不可用，跳过LDAP连接测试"
        return 0
    fi
}

# 显示帮助信息
show_help() {
    echo -e "${BLUE}LDAP用户同步脚本${NC}"
    echo
    echo "用法: $0 [选项]"
    echo
    echo "选项:"
    echo "  --dry-run     仅显示将要进行的操作，不实际执行"
    echo "  --force       强制同步，包括删除数据库中存在但LDAP中不存在的用户"
    echo "  --test        仅测试LDAP连接"
    echo "  --help        显示此帮助信息"
    echo
    echo "示例:"
    echo "  $0 --dry-run          # 预览同步操作"
    echo "  $0 --force            # 强制同步（包括删除）"
    echo "  $0                    # 正常同步（不删除）"
    echo "  $0 --test             # 仅测试LDAP连接"
    echo
    echo "注意事项:"
    echo "  - 确保 .env.local 文件包含正确的LDAP和Supabase配置"
    echo "  - 使用 --dry-run 选项可以预览将要进行的操作"
    echo "  - 使用 --force 选项会删除数据库中存在但LDAP中不存在的用户"
    echo "  - 建议在首次运行前使用 --dry-run 选项"
}

# 主函数
main() {
    local dry_run=false
    local force=false
    local test_only=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                dry_run=true
                shift
                ;;
            --force)
                force=true
                shift
                ;;
            --test)
                test_only=true
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
    
    # 如果只是测试连接
    if [ "$test_only" = true ]; then
        test_ldap_connection
        exit 0
    fi
    
    # 测试LDAP连接
    test_ldap_connection
    
    # 构建Node.js脚本参数
    local node_args=""
    if [ "$dry_run" = true ]; then
        node_args="$node_args --dry-run"
    fi
    if [ "$force" = true ]; then
        node_args="$node_args --force"
    fi
    
    # 切换到项目根目录
    cd "$PROJECT_ROOT"
    
    # 运行同步脚本
    log_info "开始执行LDAP用户同步..."
    log_info "参数: $node_args"

    if node scripts/cron/ldap-sync.js $node_args; then
        log_success "LDAP用户同步完成"
    else
        log_error "LDAP用户同步失败"
        exit 1
    fi
}

# 运行主函数
main "$@" 