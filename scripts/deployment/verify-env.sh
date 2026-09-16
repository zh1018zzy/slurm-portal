#!/bin/bash
# 环境变量验证脚本
# 用于检查编译时变量和运行时变量的一致性

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

ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
    log_error "环境变量文件不存在: $ENV_FILE"
    exit 1
fi

log_info "检查环境变量配置: $ENV_FILE"
echo ""

# 提取所有 NEXT_PUBLIC_ 变量
log_info "========================================="
log_info "编译时变量 (NEXT_PUBLIC_*)"
log_info "========================================="
log_warning "以下变量会被编译到客户端代码中，修改后需要重新编译"
echo ""

NEXT_PUBLIC_VARS=$(grep "^NEXT_PUBLIC_" "$ENV_FILE" 2>/dev/null || true)

if [ -n "$NEXT_PUBLIC_VARS" ]; then
    echo "$NEXT_PUBLIC_VARS" | while IFS='=' read -r key value; do
        if [ -n "$key" ]; then
            printf "  %-40s %s\n" "$key" "$value"
        fi
    done
else
    log_info "未检测到编译时变量"
fi

echo ""

# 提取关键运行时变量
log_info "========================================="
log_info "关键运行时变量"
log_info "========================================="
log_info "以下变量可以在部署后修改，重启服务即可生效"
echo ""

# 定义需要检查的运行时变量
RUNTIME_VARS=(
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "AUTH_MODE"
    "LDAP_URL"
    "LDAP_BIND_DN"
    "JWT_SECRET"
    "VNC_NODE"
    "NOVNC_GATEWAY"
)

for var in "${RUNTIME_VARS[@]}"; do
    value=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || echo "")
    if [ -n "$value" ]; then
        # 脱敏处理密码和密钥
        if [[ "$var" == *"PASSWORD"* ]] || [[ "$var" == *"SECRET"* ]] || [[ "$var" == *"KEY"* ]]; then
            display_value="****** (已隐藏)"
        else
            display_value="$value"
        fi
        printf "  %-40s %s\n" "$var" "$display_value"
    else
        printf "  %-40s ${YELLOW}%s${NC}\n" "$var" "[未配置]"
    fi
done

echo ""

# 验证必需变量
log_info "========================================="
log_info "必需变量检查"
log_info "========================================="

REQUIRED_VARS=(
    "SUPABASE_URL"
    "JWT_SECRET"
    "AUTH_MODE"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    value=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || echo "")
    if [ -z "$value" ]; then
        MISSING_VARS+=("$var")
        log_error "缺少必需变量: $var"
    else
        log_success "$var 已配置"
    fi
done

echo ""

# 检查 JWT_SECRET 是否为默认值
JWT_SECRET=$(grep "^JWT_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || echo "")
if [ "$JWT_SECRET" == "my-hpcapp-secret" ] || [ "$JWT_SECRET" == "your-super-secret-jwt-key-here" ]; then
    log_warning "JWT_SECRET 使用的是默认值，强烈建议修改为随机字符串"
    log_info "生成随机密钥: openssl rand -base64 32"
    echo ""
fi

# 检查认证模式相关配置
AUTH_MODE=$(grep "^AUTH_MODE=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || echo "")

if [ "$AUTH_MODE" == "ldap" ]; then
    log_info "检测到 LDAP 认证模式，检查 LDAP 配置..."

    LDAP_VARS=(
        "LDAP_URL"
        "LDAP_BASE_DN"
        "LDAP_BIND_DN"
        "LDAP_BIND_PASSWORD"
    )

    for var in "${LDAP_VARS[@]}"; do
        value=$(grep "^${var}=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2- || echo "")
        if [ -z "$value" ]; then
            log_error "LDAP 模式下缺少必需变量: $var"
            MISSING_VARS+=("$var")
        else
            log_success "$var 已配置"
        fi
    done
    echo ""
fi

# 总结
log_info "========================================="
log_info "检查摘要"
log_info "========================================="

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    log_success "所有必需变量均已配置"
else
    log_error "缺少 ${#MISSING_VARS[@]} 个必需变量"
    for var in "${MISSING_VARS[@]}"; do
        echo "  - $var"
    done
    exit 1
fi

echo ""
log_info "重要提醒："
echo "  1. 编译时变量 (NEXT_PUBLIC_*) 如需修改，必须重新编译"
echo "  2. 运行时变量修改后，重启服务即可生效"
echo "  3. 确保所有密码和密钥已修改为安全值"
echo "  4. 部署前请再次确认所有 IP 地址和端口配置正确"
echo ""
