#!/bin/bash

# HPC应用部署打包脚本
# 用于创建新环境部署的干净包

set -e

# 配置
PACKAGE_NAME="hpc-app-deployment"
PACKAGE_VERSION=$(date +"%Y%m%d_%H%M%S")
DEPLOYMENT_DIR="${PACKAGE_NAME}-${PACKAGE_VERSION}"

echo "开始创建部署包: ${DEPLOYMENT_DIR}"

# 创建部署目录
mkdir -p "${DEPLOYMENT_DIR}"

# 复制核心应用文件
echo "复制核心应用文件..."
cp -r app/ "${DEPLOYMENT_DIR}/"
cp -r components/ "${DEPLOYMENT_DIR}/"
cp -r contexts/ "${DEPLOYMENT_DIR}/"
cp -r hooks/ "${DEPLOYMENT_DIR}/"
cp -r lib/ "${DEPLOYMENT_DIR}/"
cp -r middleware/ "${DEPLOYMENT_DIR}/"
cp -r public/ "${DEPLOYMENT_DIR}/"
cp -r types/ "${DEPLOYMENT_DIR}/"
cp -r messages/ "${DEPLOYMENT_DIR}/"

# 复制配置文件（排除授权配置目录）
echo "复制配置文件..."
mkdir -p "${DEPLOYMENT_DIR}/config"
# 复制config目录，但排除license子目录
if [ -d "config" ]; then
  find config -mindepth 1 -maxdepth 1 ! -name "license" -exec cp -r {} "${DEPLOYMENT_DIR}/config/" \; 2>/dev/null || true
fi
cp -r db/ "${DEPLOYMENT_DIR}/"

# 复制必要的根目录文件
echo "复制根目录文件..."
cp package.json "${DEPLOYMENT_DIR}/"
cp package-lock.json "${DEPLOYMENT_DIR}/"
cp tsconfig.json "${DEPLOYMENT_DIR}/"
cp next.config.mjs "${DEPLOYMENT_DIR}/"
cp postcss.config.mjs "${DEPLOYMENT_DIR}/"
cp tailwind.config.ts "${DEPLOYMENT_DIR}/"
cp components.json "${DEPLOYMENT_DIR}/"
cp proxy.ts "${DEPLOYMENT_DIR}/"
cp next-env.d.ts "${DEPLOYMENT_DIR}/"
cp .eslintrc.json "${DEPLOYMENT_DIR}/"
cp .gitignore "${DEPLOYMENT_DIR}/"
cp i18n.ts "${DEPLOYMENT_DIR}/"
# 创建 .env.example 模板文件
cat > "${DEPLOYMENT_DIR}/.env.example" << 'ENVEOF'
# 数据库配置
SUPABASE_URL=http://your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-key
NEXT_PUBLIC_SUPABASE_URL=http://your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# LDAP配置
AUTH_MODE=ldap
LDAP_URL=ldap://192.168.1.10:389
LDAP_BASE_DN=dc=my-hpc,dc=com
LDAP_BIND_DN=cn=admin,dc=my-hpc,dc=com
LDAP_BIND_PASSWORD=admin
LDAP_USERS_OU=ou=users

# 应用配置
NODE_ENV=production
PORT=3000
WEBSHELL_PORT=3001

# JWT配置
JWT_SECRET=your-secret-key-here

# Slurm配置
SLURM_CLUSTER_NAME=your-cluster-name
ENVEOF

# 复制部署相关文件
echo "复制部署相关文件..."
cp ecosystem.config.js "${DEPLOYMENT_DIR}/" 2>/dev/null || true
cp nginx-cluster.conf "${DEPLOYMENT_DIR}/" 2>/dev/null || true
# 复制根目录的所有脚本文件（重要：确保所有根目录脚本都被包含）
echo "复制根目录脚本..."
for script in *.sh; do
  if [ -f "$script" ]; then
    cp "$script" "${DEPLOYMENT_DIR}/" 2>/dev/null || true
    echo "  ✓ 已复制: $script"
  fi
done

# 复制必要的脚本
echo "复制部署脚本..."
mkdir -p "${DEPLOYMENT_DIR}/scripts"
# 复制整个scripts目录结构（排除授权脚本目录）
cp -r scripts/deployment "${DEPLOYMENT_DIR}/scripts/" 2>/dev/null || true
cp -r scripts/operations "${DEPLOYMENT_DIR}/scripts/" 2>/dev/null || true
cp -r scripts/setup "${DEPLOYMENT_DIR}/scripts/" 2>/dev/null || true
cp -r scripts/cron "${DEPLOYMENT_DIR}/scripts/" 2>/dev/null || true
cp -r scripts/tools "${DEPLOYMENT_DIR}/scripts/" 2>/dev/null || true
# 注意：不复制 scripts/license 授权脚本目录
cp -r scripts/maintenance "${DEPLOYMENT_DIR}/scripts/" 2>/dev/null || true
cp -r scripts/apps "${DEPLOYMENT_DIR}/scripts/" 2>/dev/null || true
cp -r scripts/config "${DEPLOYMENT_DIR}/scripts/" 2>/dev/null || true
# 复制scripts目录下的独立脚本文件
cp scripts/*.sh "${DEPLOYMENT_DIR}/scripts/" 2>/dev/null || true

# 注意：不复制文档文件

# 创建 .gitignore 文件
cat > "${DEPLOYMENT_DIR}/.gitignore" << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/
build/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# dotenv environment variables file
.env

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary files
*.tmp
*.temp

# Build artifacts
dist/
build/

# Test files
test-*.js
test-*.sh
slurm-*.out
EOF

# 删除不必要的文件和目录
echo "清理不必要的文件..."

# 删除测试文件
find "${DEPLOYMENT_DIR}" -name "test-*.js" -delete
find "${DEPLOYMENT_DIR}" -name "test-*.sh" -delete
find "${DEPLOYMENT_DIR}" -name "slurm-*.out" -delete

# 删除开发相关文件
rm -rf "${DEPLOYMENT_DIR}/.claude" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/.cursor" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/.cursor-tutor.code-workspace" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/devdep" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/backup" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/data" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/logs" 2>/dev/null || true

# 删除所有文档文件（.md文件）
echo "删除文档文件..."
find "${DEPLOYMENT_DIR}" -name "*.md" -type f -delete 2>/dev/null || true
# 删除docs目录
rm -rf "${DEPLOYMENT_DIR}/docs" 2>/dev/null || true
# 删除其他不必要的文档
rm -f "${DEPLOYMENT_DIR}/CLAUDE.md" 2>/dev/null || true
rm -f "${DEPLOYMENT_DIR}/CLAUDE_CN.md" 2>/dev/null || true
rm -f "${DEPLOYMENT_DIR}/PROJECT-SUMMARY.md" 2>/dev/null || true
rm -f "${DEPLOYMENT_DIR}/SCRIPTS-OVERVIEW.md" 2>/dev/null || true
rm -f "${DEPLOYMENT_DIR}/CLEANUP-GUIDE.md" 2>/dev/null || true
rm -f "${DEPLOYMENT_DIR}/DEPLOYMENT-SUMMARY.md" 2>/dev/null || true
rm -f "${DEPLOYMENT_DIR}/DOCS-INDEX.md" 2>/dev/null || true
rm -f "${DEPLOYMENT_DIR}/README-CRON-SETUP.md" 2>/dev/null || true
rm -f "${DEPLOYMENT_DIR}/ROOT-SCRIPTS.md" 2>/dev/null || true
rm -f "${DEPLOYMENT_DIR}/ROOT-SCRIPTS-REFERENCE.md" 2>/dev/null || true

# 确保授权相关目录和文件被排除
rm -rf "${DEPLOYMENT_DIR}/scripts/license" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/config/license" 2>/dev/null || true

# 创建压缩包
echo "创建压缩包..."
tar -czf "${DEPLOYMENT_DIR}.tar.gz" "${DEPLOYMENT_DIR}"

# 清理临时目录
rm -rf "${DEPLOYMENT_DIR}"

echo "部署包创建完成: ${DEPLOYMENT_DIR}.tar.gz"
echo "包大小: $(du -h "${DEPLOYMENT_DIR}.tar.gz" | cut -f1)"

# 显示包内容概览
echo ""
echo "包内容概览:"
echo "├── app/                    # Next.js应用路由"
echo "├── components/             # React组件"
echo "├── lib/                   # 工具库"
echo "├── types/                 # TypeScript类型定义"
echo "├── messages/              # 国际化翻译文件"
echo "├── config/                # 配置文件"
echo "├── db/                    # 数据库脚本"
echo "├── public/                # 静态资源"
echo "├── scripts/               # 脚本工具"
echo "│   ├── deployment/        # 部署脚本"
echo "│   ├── operations/        # 运维管理"
echo "│   ├── setup/             # 初始化安装"
echo "│   ├── cron/              # 定时任务"
echo "│   ├── tools/             # 工具脚本"
echo "│   ├── apps/              # 应用脚本"
echo "│   └── maintenance/       # 维护脚本"
echo "├── package.json           # 依赖配置"
echo "├── i18n.ts                # 国际化配置"
echo "├── ecosystem.config.js    # PM2配置"
echo "├── install.sh             # 安装脚本"
echo "├── start-pm2.sh           # 启动脚本"
echo "├── stop-pm2.sh            # 停止脚本"
echo "└── restart-pm2.sh        # 重启脚本"
echo ""
echo "注意：已排除授权脚本(scripts/license)和授权配置(config/license)"
echo "注意：已排除所有文档文件(.md)和docs目录" 