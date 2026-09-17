#!/bin/bash
# slurm-portal 部署前环境校验
# - 检查 .env 必填项与占位值
# - 探测 Node / Slurm CLI / 超级管理员凭证
# - 按 AUTH_MODE 检查 LDAP；对 VNC/WebShell 给出警告级提示
#
# 用法:
#   ./scripts/deployment/verify-env.sh [.env文件]
#   npm run verify:env
#   npm run verify:env -- .env.production

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT_DIR"

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

ENV_FILE="${1:-.env}"
ERRORS=0
WARNINGS=0

bump_error() { ERRORS=$((ERRORS + 1)); }
bump_warn() { WARNINGS=$((WARNINGS + 1)); }

get_env() {
  local key="$1"
  if [ ! -f "$ENV_FILE" ]; then
    echo ""
    return
  fi
  # 去掉首尾引号与空白
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d'=' -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//' -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}

is_placeholder() {
  local value="$1"
  case "$value" in
    ""|change-me*|your-*|YOUR_*|please-change*|slurm-portal-dev-secret|your-jwt-secret-here|your-super-secret*|https://your-project.supabase.co|your-anon-key|your-service-role-key|your-ldap-password)
      return 0
      ;;
  esac
  return 1
}

require_var() {
  local key="$1"
  local label="${2:-$1}"
  local value
  value="$(get_env "$key")"
  if [ -z "$value" ]; then
    log_error "缺少必需变量: $label ($key)"
    bump_error
    return 1
  fi
  if is_placeholder "$value"; then
    log_error "$label ($key) 仍是占位/示例值，请改成现场真实配置"
    bump_error
    return 1
  fi
  if [[ "$key" == *"PASSWORD"* ]] || [[ "$key" == *"SECRET"* ]] || [[ "$key" == *"KEY"* ]]; then
    log_success "$label 已配置"
  else
    log_success "$label = $value"
  fi
  return 0
}

warn_var() {
  local key="$1"
  local label="${2:-$1}"
  local value
  value="$(get_env "$key")"
  if [ -z "$value" ] || is_placeholder "$value"; then
    log_warning "可选未配置: $label ($key)"
    bump_warn
    return 1
  fi
  log_success "$label 已配置"
  return 0
}

echo "========================================="
echo " slurm-portal 部署前校验"
echo "========================================="
echo "工作目录: $ROOT_DIR"
echo "环境文件: $ENV_FILE"
echo ""

# ---------- 0. 文档提示 ----------
log_info "完整集群依赖清单见: docs/deployment/cluster-prerequisites.md"
echo ""

# ---------- 1. .env 存在性 ----------
log_info "======= 1) 环境文件 ======="
if [ ! -f "$ENV_FILE" ]; then
  log_error "未找到 $ENV_FILE"
  log_info "请执行: cp .env.example .env 并按现场填写"
  bump_error
else
  log_success "找到 $ENV_FILE"
fi
echo ""

# ---------- 2. Node ----------
log_info "======= 2) Node.js 运行时 ======="
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
  if [ "$NODE_MAJOR" -ge 18 ] 2>/dev/null; then
    log_success "Node.js $(node -v)"
  else
    log_error "Node.js 版本过低: $(node -v)（需要 ≥ 18）"
    bump_error
  fi
else
  log_error "未安装 Node.js"
  bump_error
fi
if command -v npm >/dev/null 2>&1; then
  log_success "npm $(npm -v)"
else
  log_warning "未检测到 npm"
  bump_warn
fi
echo ""

# ---------- 3. 必填 env ----------
log_info "======= 3) 必需环境变量 ======="
if [ -f "$ENV_FILE" ]; then
  require_var "SUPABASE_URL" "数据库 URL"
  require_var "SUPABASE_SERVICE_ROLE_KEY" "数据库服务密钥"
  require_var "JWT_SECRET" "JWT 密钥"
  require_var "AUTH_MODE" "认证模式"

  AUTH_MODE_VAL="$(get_env AUTH_MODE)"
  case "$AUTH_MODE_VAL" in
    linux|ldap|nis)
      log_success "AUTH_MODE=$AUTH_MODE_VAL"
      ;;
    "")
      ;;
    *)
      log_warning "AUTH_MODE=$AUTH_MODE_VAL（常见值为 linux / ldap）"
      bump_warn
      ;;
  esac

  # NEXT_PUBLIC 对齐提示
  PUB_URL="$(get_env NEXT_PUBLIC_SUPABASE_URL)"
  SUP_URL="$(get_env SUPABASE_URL)"
  if [ -n "$PUB_URL" ] && [ -n "$SUP_URL" ] && [ "$PUB_URL" != "$SUP_URL" ]; then
    log_warning "NEXT_PUBLIC_SUPABASE_URL 与 SUPABASE_URL 不一致，请确认是否有意为之"
    bump_warn
  fi
fi
echo ""

# ---------- 4. 认证相关 ----------
log_info "======= 4) 认证依赖 ======="
AUTH_MODE_VAL="$(get_env AUTH_MODE)"
if [ "$AUTH_MODE_VAL" = "ldap" ]; then
  require_var "LDAP_URL" "LDAP URL"
  require_var "LDAP_BASE_DN" "LDAP BASE DN"
  require_var "LDAP_BIND_DN" "LDAP BIND DN"
  require_var "LDAP_BIND_PASSWORD" "LDAP BIND 密码"
elif [ "$AUTH_MODE_VAL" = "linux" ]; then
  log_success "linux 模式：将使用本机系统用户认证（请确保业务用户存在）"
elif [ "$AUTH_MODE_VAL" = "nis" ]; then
  log_warning "nis 模式：请确认本机 NIS 客户端与用户同步已按现场文档配置"
  bump_warn
fi

if [ -f config/super-admin.enc ]; then
  log_success "已找到超级管理员凭证 config/super-admin.enc"
else
  log_error "缺少 config/super-admin.enc（请运行: npm run setup:super-admin）"
  bump_error
fi
echo ""

# ---------- 5. Slurm ----------
log_info "======= 5) Slurm 客户端（集群核心依赖） ======="
SLURM_OK=1
for cmd in sinfo squeue sbatch scancel; do
  if command -v "$cmd" >/dev/null 2>&1; then
    log_success "找到命令: $cmd ($(command -v "$cmd"))"
  else
    log_error "未找到命令: $cmd（请在管理/登录节点安装 Slurm 客户端并配置 PATH）"
    bump_error
    SLURM_OK=0
  fi
done

if command -v sacct >/dev/null 2>&1; then
  log_success "找到命令: sacct"
else
  log_warning "未找到 sacct（历史作业/报表可能受限）"
  bump_warn
fi

if [ "$SLURM_OK" -eq 1 ]; then
  if sinfo -V >/dev/null 2>&1; then
    log_success "sinfo -V => $(sinfo -V 2>&1 | head -1)"
  else
    log_error "sinfo 存在但执行失败（检查 munge/slurmctld 与权限）"
    bump_error
  fi
  if timeout 8s sinfo -h -o "%P" >/dev/null 2>&1; then
    PART_COUNT="$(timeout 8s sinfo -h -o "%P" 2>/dev/null | sort -u | wc -l | tr -d ' ')"
    log_success "可查询到分区数量: ${PART_COUNT:-?}"
  else
    log_warning "sinfo 查询分区失败或超时（集群未就绪或网络/认证问题）"
    bump_warn
  fi
fi
echo ""

# ---------- 6. 可选：WebShell / VNC ----------
log_info "======= 6) 可选模块（警告级） ======="
warn_var "NEXT_PUBLIC_BASE_URL" "站点对外 URL"
warn_var "WEBSHELL_PORT" "WebShell 端口"
warn_var "NEXT_PUBLIC_WEBSHELL_SERVER" "WebShell 对外地址"

TURBO="$(get_env TURBO_VNC_PATH)"
TURBO="${TURBO:-/opt/TurboVNC/bin}"
TURBO="${TURBO%/}"
if [ -x "$TURBO/vncserver" ]; then
  log_success "TurboVNC 可执行文件存在: $TURBO/vncserver"
elif [ -d "$TURBO" ]; then
  log_warning "TurboVNC 目录存在但未找到 vncserver: $TURBO"
  bump_warn
else
  log_warning "未配置/未安装 TurboVNC（不影响无图形桌面场景）: $TURBO"
  bump_warn
fi

NOVNC_GW="$(get_env NOVNC_GATEWAY)"
if [ -z "$NOVNC_GW" ] || is_placeholder "$NOVNC_GW"; then
  log_warning "未配置 NOVNC_GATEWAY（VNC Web 接入将不可用）"
  bump_warn
else
  log_success "NOVNC_GATEWAY=$NOVNC_GW"
fi
echo ""

# ---------- 7. 数据库脚本提醒 ----------
log_info "======= 7) 数据库初始化提醒 ======="
if [ -f db/install/init-complete-simplified.sql ]; then
  log_success "找到 SQL: db/install/init-complete-simplified.sql"
  log_info "请在 Supabase/PostgreSQL 中执行该脚本（若尚未建表）"
else
  log_warning "未找到 db/install 初始化脚本"
  bump_warn
fi
echo ""

# ---------- 摘要 ----------
echo "========================================="
echo " 检查摘要"
echo "========================================="
echo "错误: $ERRORS    警告: $WARNINGS"
echo ""

if [ "$ERRORS" -gt 0 ]; then
  log_error "存在 $ERRORS 个阻塞项，请先修复后再部署"
  echo ""
  echo "下一步："
  echo "  1. 阅读 docs/deployment/cluster-prerequisites.md"
  echo "  2. 编辑 $ENV_FILE（参考 .env.example）"
  echo "  3. npm run setup:super-admin"
  echo "  4. 再次运行: npm run verify:env"
  exit 1
fi

log_success "必需项已通过（仍有 $WARNINGS 个警告可按需处理）"
echo ""
echo "建议顺序："
echo "  1. 确认 DB 已执行 db/install/*.sql"
echo "  2. npm run build && npm run start   # 或 ./start-pm2.sh"
echo "  3. 浏览器登录超级管理员，检查节点/作业"
echo "  4. 可选模块说明见 docs/deployment/cluster-prerequisites.md"
echo ""
exit 0
