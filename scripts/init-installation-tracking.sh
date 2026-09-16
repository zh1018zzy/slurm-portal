#!/bin/bash

# 系统安装记录初始化脚本
# 功能：创建数据库表并同步现有安装信息

set -e

echo "=== 系统安装记录初始化 ==="

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 数据库连接信息（从环境变量或默认值）
DB_HOST="${SUPABASE_DB_HOST:-localhost}"
DB_PORT="${SUPABASE_DB_PORT:-5432}"
DB_USER="${SUPABASE_DB_USER:-postgres}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-postgres}"
DB_NAME="${SUPABASE_DB_NAME:-hpc_db}"

echo "数据库连接: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"

# 检查 PostgreSQL 命令是否可用
if command -v psql &> /dev/null; then
    echo -e "${GREEN}✓${NC} 找到 psql 命令"
    USE_PSQL=true
else
    echo -e "${YELLOW}!${NC} psql 命令不可用，将使用 Docker 方式"
    USE_PSQL=false
fi

# SQL 脚本路径
SQL_FILE="/opt/my-hpcapp/scripts/migrations/create-installation-table.sql"

# 执行 SQL
echo "执行数据库迁移..."

if [ "$USE_PSQL" = true ]; then
    # 直接使用 psql
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"
else
    # 尝试使用 Docker
    if docker ps --format "{{.Names}}" | grep -q postgres; then
        CONTAINER=$(docker ps --format "{{.Names}}" | grep postgres | head -1)
        echo "使用 Docker 容器: $CONTAINER"
        cat "$SQL_FILE" | docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME"
    else
        echo -e "${RED}✗${NC} 无法连接到数据库"
        exit 1
    fi
fi

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} 数据库表创建成功"
else
    echo -e "${RED}✗${NC} 数据库迁移失败"
    exit 1
fi

# 检查是否存在 installation.json
INSTALL_FILE="/opt/my-hpcapp/config/installation.json"

if [ -f "$INSTALL_FILE" ]; then
    echo -e "${GREEN}✓${NC} 找到现有安装文件: $INSTALL_FILE"
    echo "安装信息将在下次系统启动时自动同步到数据库"
    cat "$INSTALL_FILE"
else
    echo -e "${YELLOW}!${NC} 未找到安装文件，将在首次启动时自动创建"
fi

echo ""
echo -e "${GREEN}=== 初始化完成 ===${NC}"
echo ""
echo "防篡改机制已启用："
echo "  1. ✓ 数据库持久化存储（删除文件无法重置试用期）"
echo "  2. ✓ 硬件指纹绑定（防止许可证迁移）"
echo "  3. ✓ 多重安全标记验证"
echo ""
echo "注意：系统会在下次启动时自动完成数据同步"
