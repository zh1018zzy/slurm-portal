#!/bin/bash
# HPC App 更新部署脚本

cd "$(dirname "$0")"

echo "====================================="
echo "HPC App 更新部署"
echo "====================================="
echo ""

# 1. 拉取最新代码 (如果是git仓库)
if [ -d ".git" ]; then
    echo "📥 拉取最新代码..."
    git pull
    echo ""
fi

# 2. 安装新依赖
echo "📦 安装/更新依赖..."
npm install
echo ""

# 3. 重新构建
echo "🔨 重新构建项目..."
rm -rf .next
npm run build
echo ""

# 4. 重启所有服务
echo "🔄 重启所有服务..."
pm2 restart hpc-app
pm2 restart webshell-server

# 显示状态
echo ""
echo "📊 服务运行状态:"
pm2 status

echo ""
echo "====================================="
echo "✅ 更新部署完成"
echo "====================================="
echo ""
echo "查看日志: pm2 logs"
echo "如有问题，回滚: git reset --hard HEAD~1 && ./update-app.sh"
echo ""
