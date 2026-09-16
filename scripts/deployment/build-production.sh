#!/bin/bash
# 生产环境编译打包脚本
# 用于在本地编译，生成可部署的离线安装包

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

# 版本号（可以从package.json读取或手动指定）
VERSION=$(node -p "require('./package.json').version")
BUILD_DATE=$(date +%Y%m%d_%H%M%S)
PACKAGE_NAME="hpc-platform-${VERSION}-${BUILD_DATE}"
OUTPUT_DIR="dist"

log_info "开始构建 HPC 平台生产环境部署包..."
log_info "版本: ${VERSION}"
log_info "构建时间: ${BUILD_DATE}"
echo ""

# 1. 检查依赖
log_info "检查构建依赖..."
if ! command -v node &> /dev/null; then
    log_error "未找到 Node.js，请先安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    log_error "未找到 npm，请先安装"
    exit 1
fi

NODE_VERSION=$(node --version)
log_success "Node.js 版本: ${NODE_VERSION}"
echo ""

# 2. 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    log_info "安装项目依赖..."
    npm ci
    log_success "依赖安装完成"
else
    log_info "依赖已存在，跳过安装"
fi
echo ""

# 3. 清理之前的构建
log_info "清理之前的构建产物..."
rm -rf .next
rm -rf ${OUTPUT_DIR}
log_success "清理完成"
echo ""

# 4. 设置环境变量（构建时使用占位符）
log_info "设置构建环境变量..."
export NODE_ENV=production
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--max-old-space-size=4096"

# 注意：这些环境变量在构建时不应该硬编码客户环境的值
# NEXT_PUBLIC_ 开头的变量会被编译进客户端代码，需要特别注意
log_warning "检测到以下 NEXT_PUBLIC_ 环境变量将被编译到客户端代码中："
env | grep NEXT_PUBLIC_ || log_info "未检测到 NEXT_PUBLIC_ 变量"
echo ""

# 5. 执行构建
log_info "开始构建应用..."
npm run build

if [ ! -d ".next/standalone" ]; then
    log_error "构建失败：未找到 standalone 输出"
    exit 1
fi

log_success "构建完成"
echo ""

# 6. 创建部署目录结构
log_info "创建部署包目录结构..."
mkdir -p ${OUTPUT_DIR}/${PACKAGE_NAME}
mkdir -p ${OUTPUT_DIR}/${PACKAGE_NAME}/app
mkdir -p ${OUTPUT_DIR}/${PACKAGE_NAME}/config
mkdir -p ${OUTPUT_DIR}/${PACKAGE_NAME}/scripts
mkdir -p ${OUTPUT_DIR}/${PACKAGE_NAME}/public/uploads
mkdir -p ${OUTPUT_DIR}/${PACKAGE_NAME}/logs
mkdir -p ${OUTPUT_DIR}/${PACKAGE_NAME}/data
mkdir -p ${OUTPUT_DIR}/${PACKAGE_NAME}/backup

# 7. 复制必要文件
log_info "复制应用文件..."

# 复制 standalone 构建产物
cp -r .next/standalone/* ${OUTPUT_DIR}/${PACKAGE_NAME}/app/
cp -r .next/static ${OUTPUT_DIR}/${PACKAGE_NAME}/app/.next/

# 复制 public 目录（不包含uploads，因为那是运行时生成的）
cp -r public ${OUTPUT_DIR}/${PACKAGE_NAME}/app/

# 复制配置文件
cp -r config ${OUTPUT_DIR}/${PACKAGE_NAME}/

# 复制 PM2 配置文件（如果存在）
if [ -f "ecosystem.config.js" ]; then
    cp ecosystem.config.js ${OUTPUT_DIR}/${PACKAGE_NAME}/
fi

# 复制必要的脚本
if [ -d "scripts/operations" ]; then
    cp -r scripts/operations ${OUTPUT_DIR}/${PACKAGE_NAME}/scripts/
fi

if [ -d "scripts/tools" ]; then
    cp -r scripts/tools ${OUTPUT_DIR}/${PACKAGE_NAME}/scripts/
fi

log_success "文件复制完成"
echo ""

# 8. 创建环境变量模板
log_info "创建环境变量配置模板..."
cat > ${OUTPUT_DIR}/${PACKAGE_NAME}/.env.template << 'EOF'
# ==========================================
# HPC 平台环境变量配置模板
# ==========================================
# 说明：
# 1. 将此文件复制为 .env 并填入实际配置
# 2. 标记为 [编译时] 的变量会被编译到代码中，修改后需要重新编译
# 3. 标记为 [运行时] 的变量可以在部署后修改
# ==========================================

# ==========================================
# 数据库配置 [运行时]
# ==========================================
SUPABASE_URL=http://YOUR_SUPABASE_HOST:8000
SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# [编译时] 如果客户端需要访问 Supabase
NEXT_PUBLIC_SUPABASE_URL=http://YOUR_SUPABASE_HOST:8000

# ==========================================
# 认证配置 [运行时]
# ==========================================
# 认证方式：linux 或 ldap
AUTH_MODE=ldap

# LDAP 配置
LDAP_URL=ldap://YOUR_LDAP_HOST:389
LDAP_BASE_DN=dc=example,dc=com
LDAP_BIND_DN=cn=admin,dc=example,dc=com
LDAP_BIND_PASSWORD=YOUR_LDAP_PASSWORD
LDAP_USERS_OU=ou=users
LDAP_USER_OBJECTCLASS=inetOrgPerson,posixAccount,top
LDAP_UID_MIN=2000
LDAP_GID_MIN=2000
LDAP_HOME_PREFIX=/home
LDAP_PASSWORD_HASH=ssha
LDAP_DEFAULT_GID=2000

# [编译时] 用户邮箱域名
NEXT_PUBLIC_USER_EMAIL_DOMAIN=example.com

# ==========================================
# 应用配置
# ==========================================
# [编译时] 应用基础URL（会影响客户端路由）
NEXT_PUBLIC_BASE_URL=http://YOUR_SERVER_IP:3000

# [编译时] WebShell 配置
NEXT_PUBLIC_APP_URL=http://YOUR_SERVER_IP:3000
NEXT_PUBLIC_WEBSHELL_SERVER=http://YOUR_SERVER_IP:3001
WEBSHELL_PORT=3001

# [编译时] Grafana 监控地址
NEXT_PUBLIC_GRAFANA_URL=http://YOUR_GRAFANA_HOST:3000

# [运行时] 会话过期时间（分钟）
NEXT_PUBLIC_SESSION_EXPIRE_MINUTES=120

# ==========================================
# VNC 配置 [运行时]
# ==========================================
VNC_NODE=YOUR_VNC_NODE_IP
NOVNC_GATEWAY=YOUR_NOVNC_GATEWAY_IP
NOVNC_PORT=6080

# 节点IP映射（JSON格式）
NODE_IP_MAP='{"node1":"192.168.1.10","node2":"192.168.1.11"}'

# TurboVNC 路径
TURBO_VNC_PATH="/opt/TurboVNC/bin/"
DEFAULT_VNC_NODE_IP=YOUR_DEFAULT_VNC_IP

# ==========================================
# 安全配置 [运行时]
# ==========================================
JWT_SECRET=PLEASE_CHANGE_THIS_TO_RANDOM_STRING

# 许可证配置
LICENSE_FILE_PATH=config/license.json
LICENSE_PUBLIC_KEY_PATH=config/license-public.pem
# STRICT_LICENSE_VALIDATION=true

# ==========================================
# 日志配置 [运行时]
# ==========================================
LOG_LEVEL=INFO
NODE_ENV=production

# ==========================================
# 其他配置 [运行时]
# ==========================================
NEXT_TELEMETRY_DISABLED=1
EOF

log_success "环境变量模板创建完成"
echo ""

# 9. 创建 README 文件
log_info "创建部署说明文件..."
cat > ${OUTPUT_DIR}/${PACKAGE_NAME}/README.md << EOF
# HPC 平台部署包

版本: ${VERSION}
构建时间: ${BUILD_DATE}

## 目录结构

\`\`\`
${PACKAGE_NAME}/
├── app/                    # 应用程序文件
│   ├── .next/             # Next.js 构建产物
│   ├── public/            # 静态资源
│   ├── server.js          # 服务器入口
│   └── node_modules/      # 运行时依赖
├── config/                # 配置文件目录
├── scripts/               # 运维脚本
├── public/                # 公共资源
│   └── uploads/           # 上传文件目录（运行时生成）
├── logs/                  # 日志目录
├── data/                  # 数据目录
├── backup/                # 备份目录
├── .env.template          # 环境变量模板
├── ecosystem.config.js    # PM2 配置（如有）
└── README.md              # 本文件
\`\`\`

## 快速部署

1. **解压部署包**
   \`\`\`bash
   tar -xzf ${PACKAGE_NAME}.tar.gz
   cd ${PACKAGE_NAME}
   \`\`\`

2. **配置环境变量**
   \`\`\`bash
   cp .env.template .env
   vim .env  # 编辑配置文件
   \`\`\`

3. **运行安装脚本**
   \`\`\`bash
   chmod +x install.sh
   ./install.sh
   \`\`\`

## 详细说明

请参考 DEPLOYMENT.md 文件了解详细的部署步骤和配置说明。

## 环境变量说明

### 重要：编译时 vs 运行时变量

- **[编译时]** 变量：以 \`NEXT_PUBLIC_\` 开头的变量会被编译到客户端代码中
  - 如需修改，必须重新编译应用
  - 影响范围：客户端 JavaScript 代码
  - 示例：\`NEXT_PUBLIC_BASE_URL\`, \`NEXT_PUBLIC_WEBSHELL_SERVER\`

- **[运行时]** 变量：服务器端使用的变量
  - 可以在部署后修改，重启服务即可生效
  - 影响范围：服务器端 API 和逻辑
  - 示例：\`SUPABASE_URL\`, \`LDAP_URL\`, \`JWT_SECRET\`

### 关键编译时变量

以下变量被编译到客户端代码中，在打包前需要确认：

1. \`NEXT_PUBLIC_BASE_URL\` - 应用基础URL
2. \`NEXT_PUBLIC_WEBSHELL_SERVER\` - WebShell服务器地址
3. \`NEXT_PUBLIC_APP_URL\` - 应用URL
4. \`NEXT_PUBLIC_SUPABASE_URL\` - Supabase访问地址
5. \`NEXT_PUBLIC_GRAFANA_URL\` - Grafana监控地址
6. \`NEXT_PUBLIC_USER_EMAIL_DOMAIN\` - 用户邮箱域名
7. \`NEXT_PUBLIC_SESSION_EXPIRE_MINUTES\` - 会话过期时间

**如果客户环境的这些配置不同，有两种处理方式：**

1. **方式一（推荐）**：在本地打包前，设置客户环境的实际值
2. **方式二**：提供重新编译脚本，在客户环境编译（需要Node.js环境）

## 系统要求

- Node.js >= 18.0.0
- Linux 操作系统
- 可选：PM2 进程管理器

## 支持

如有问题，请联系技术支持团队。
EOF

log_success "README 创建完成"
echo ""

# 10. 生成版本信息
log_info "生成版本信息..."
cat > ${OUTPUT_DIR}/${PACKAGE_NAME}/VERSION.json << EOF
{
  "version": "${VERSION}",
  "buildDate": "${BUILD_DATE}",
  "nodeVersion": "${NODE_VERSION}",
  "buildHost": "$(hostname)",
  "buildUser": "$(whoami)"
}
EOF

# 11. 打包
log_info "打包部署文件..."
cd ${OUTPUT_DIR}
tar -czf ${PACKAGE_NAME}.tar.gz ${PACKAGE_NAME}
PACKAGE_SIZE=$(du -h ${PACKAGE_NAME}.tar.gz | cut -f1)

log_success "打包完成！"
echo ""

# 12. 显示摘要
log_success "========================================="
log_success "构建成功！"
log_success "========================================="
echo ""
log_info "部署包信息："
echo "  - 名称: ${PACKAGE_NAME}.tar.gz"
echo "  - 大小: ${PACKAGE_SIZE}"
echo "  - 位置: ${OUTPUT_DIR}/${PACKAGE_NAME}.tar.gz"
echo ""
log_warning "重要提示："
echo "  1. 请检查 .env.template 中标记为 [编译时] 的变量"
echo "  2. 如果客户环境的这些变量值不同，需要："
echo "     - 方式A: 修改本地环境变量后重新执行本脚本"
echo "     - 方式B: 在客户环境重新编译（需要 Node.js 环境）"
echo "  3. 运行时变量可以在部署后修改 .env 文件"
echo ""
log_info "下一步操作："
echo "  1. 将 ${PACKAGE_NAME}.tar.gz 传输到客户服务器"
echo "  2. 解压并执行 install.sh 脚本"
echo "  3. 参考 DEPLOYMENT.md 完成配置"
echo ""
