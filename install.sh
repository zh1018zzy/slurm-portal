#!/bin/bash
# HPC App 自动安装脚本
# 支持 Ubuntu/Debian 和 CentOS/RHEL 系统

set -e

echo "====================================="
echo "HPC App 安装脚本"
echo "====================================="

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    VERSION=$VERSION_ID
else
    echo "无法检测操作系统"
    exit 1
fi

echo "检测到操作系统: $OS $VERSION"

# 检测是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用 root 用户或 sudo 运行此脚本"
    exit 1
fi

# 安装 Node.js 18
install_nodejs() {
    echo "正在安装 Node.js 18..."

    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        # Ubuntu/Debian
        curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
        apt-get install -y nodejs
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "rocky" ] || [ "$OS" = "almalinux" ]; then
        # CentOS/RHEL
        curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
        yum install -y nodejs
    else
        echo "不支持的操作系统: $OS"
        exit 1
    fi

    node --version
    npm --version
}

# 安装系统依赖
install_dependencies() {
    echo "正在安装系统依赖..."

    if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
        apt-get update
        apt-get install -y python3 make g++ git curl
    elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "rocky" ] || [ "$OS" = "almalinux" ]; then
        yum install -y python3 make gcc-c++ git curl
        # CentOS 7 需要安装 devtoolset
        if [ "$VERSION" = "7" ]; then
            yum install -y centos-release-scl
            yum install -y devtoolset-11
            echo "source /opt/rh/devtoolset-11/enable" >> ~/.bashrc
            source /opt/rh/devtoolset-11/enable
        fi
    fi
}

# 安装 PM2
install_pm2() {
    echo "正在安装 PM2..."
    npm install -g pm2
    pm2 --version
}

# 检查 Node.js 是否已安装
if ! command -v node &> /dev/null; then
    install_nodejs
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo "Node.js 版本过低 (当前: $NODE_VERSION)，需要 18 或更高版本"
        install_nodejs
    else
        echo "Node.js 已安装: $(node -v)"
    fi
fi

# 检查 PM2 是否已安装
if ! command -v pm2 &> /dev/null; then
    install_pm2
else
    echo "PM2 已安装: $(pm2 -v)"
fi

# 安装系统依赖
install_dependencies

# 安装项目依赖
echo "正在安装项目依赖..."
cd "$(dirname "$0")"
npm install

# 构建项目
echo "正在构建项目..."
npm run build

# 初始化超级管理员（若尚未配置）
if [ ! -f config/super-admin.enc ]; then
    echo ""
    echo "配置超级管理员账户..."
    if [ -f .env ]; then
        npm run setup:super-admin || {
            echo "提示: 可稍后执行 npm run setup:super-admin"
        }
    else
        echo "未检测到 .env，请先 cp .env.example .env 并设置 JWT_SECRET，然后执行:"
        echo "  npm run setup:super-admin"
    fi
fi

echo ""
echo "====================================="
echo "安装完成！"
echo "====================================="
echo ""
echo "本平台依赖现有集群服务（Slurm / DB / 认证 / 可选 VNC）。"
echo "部署前请阅读并完成检查："
echo "  docs/deployment/cluster-prerequisites.md"
echo ""
echo "校验环境（推荐）："
echo "  cp -n .env.example .env   # 若尚无 .env"
echo "  # 编辑 .env 后执行："
echo "  npm run verify:env"
echo ""
echo "若尚未配置超级管理员:"
echo "  npm run setup:super-admin"
echo ""
echo "启动应用:"
echo "  npm run start:prod"
echo ""
echo "或使用 PM2 管理:"
echo "  pm2 start npm --name hpc-app -- run start:prod"
echo "  pm2 save"
echo "  pm2 startup"
echo ""
