#!/bin/bash

# HPC应用生产环境部署打包脚本
set -e

PACKAGE_NAME="hpc-app-production"
PACKAGE_VERSION=$(date +"%Y%m%d_%H%M%S")
DEPLOYMENT_DIR="${PACKAGE_NAME}-${PACKAGE_VERSION}"

echo "开始创建生产环境部署包: ${DEPLOYMENT_DIR}"

# 创建部署目录
mkdir -p "${DEPLOYMENT_DIR}"

# 复制核心文件
echo "复制核心应用文件..."
cp -r app/ "${DEPLOYMENT_DIR}/"
cp -r components/ "${DEPLOYMENT_DIR}/"
cp -r contexts/ "${DEPLOYMENT_DIR}/"
cp -r hooks/ "${DEPLOYMENT_DIR}/"
cp -r lib/ "${DEPLOYMENT_DIR}/"
cp -r middleware/ "${DEPLOYMENT_DIR}/"
cp -r public/ "${DEPLOYMENT_DIR}/"
# 复制config目录，但排除license子目录
echo "复制配置文件（排除授权配置）..."
mkdir -p "${DEPLOYMENT_DIR}/config"
if [ -d "config" ]; then
  find config -mindepth 1 -maxdepth 1 ! -name "license" -exec cp -r {} "${DEPLOYMENT_DIR}/config/" \; 2>/dev/null || true
fi
cp -r db/ "${DEPLOYMENT_DIR}/"
# 复制scripts目录，但排除license子目录
echo "复制脚本文件（排除授权脚本）..."
mkdir -p "${DEPLOYMENT_DIR}/scripts"
if [ -d "scripts" ]; then
  find scripts -mindepth 1 -maxdepth 1 ! -name "license" -exec cp -r {} "${DEPLOYMENT_DIR}/scripts/" \; 2>/dev/null || true
fi
cp -r types/ "${DEPLOYMENT_DIR}/"
cp -r messages/ "${DEPLOYMENT_DIR}/"
#cp -r .env.example "${DEPLOYMENT_DIR}/.env.example"
cp -r .env "${DEPLOYMENT_DIR}/.env"
cp -r .env.local "${DEPLOYMENT_DIR}/.env.local"


# 复制配置文件
echo "复制配置文件..."
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
cp ecosystem.config.js "${DEPLOYMENT_DIR}/"
cp i18n.ts "${DEPLOYMENT_DIR}/"

# 复制根目录的所有脚本文件
echo "复制根目录脚本..."
for script in *.sh; do
  if [ -f "$script" ]; then
    cp "$script" "${DEPLOYMENT_DIR}/" 2>/dev/null || true
    echo "  ✓ 已复制: $script"
  fi
done

# 清理不必要的文件
echo "清理不必要的文件..."
find "${DEPLOYMENT_DIR}" -name "test-*.js" -delete
find "${DEPLOYMENT_DIR}" -name "test-*.sh" -delete
find "${DEPLOYMENT_DIR}" -name "slurm-*.out" -delete
rm -rf "${DEPLOYMENT_DIR}/.claude" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/.cursor" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/devdep" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/backup" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/data" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/logs" 2>/dev/null || true

# 删除所有文档文件（.md文件）
echo "删除文档文件..."
find "${DEPLOYMENT_DIR}" -name "*.md" -type f -delete 2>/dev/null || true
# 删除docs目录
rm -rf "${DEPLOYMENT_DIR}/docs" 2>/dev/null || true

# 确保授权相关目录和文件被排除
echo "确保排除授权相关文件..."
rm -rf "${DEPLOYMENT_DIR}/scripts/license" 2>/dev/null || true
rm -rf "${DEPLOYMENT_DIR}/config/license" 2>/dev/null || true

# 创建压缩包
echo "创建压缩包..."
tar -czf "${DEPLOYMENT_DIR}.tar.gz" "${DEPLOYMENT_DIR}"
rm -rf "${DEPLOYMENT_DIR}"

echo "生产环境部署包创建完成: ${DEPLOYMENT_DIR}.tar.gz"
echo "包大小: $(du -h "${DEPLOYMENT_DIR}.tar.gz" | cut -f1)" 