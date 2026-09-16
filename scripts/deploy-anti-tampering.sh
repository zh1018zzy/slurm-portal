#!/bin/bash

# 部署安装日期防篡改机制
# 执行数据库迁移，添加审计日志和触发器

set -e

echo "================================================"
echo "部署安装日期防篡改机制"
echo "================================================"
echo ""

# 加载环境变量
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# 检查必要的环境变量
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ 错误: 未找到 SUPABASE_URL 环境变量"
  exit 1
fi

echo "Supabase URL: $SUPABASE_URL"
echo ""

# 提取数据库连接信息
DB_HOST=$(echo $SUPABASE_URL | sed 's|http://||' | sed 's|https://||' | cut -d: -f1)
DB_PORT=$(echo $SUPABASE_URL | cut -d: -f3 | cut -d/ -f1)

echo "数据库主机: $DB_HOST"
echo "数据库端口: ${DB_PORT:-5432}"
echo ""

# 方法1: 使用 docker exec (如果Supabase在容器中)
echo "尝试方法1: 使用Docker执行..."
if docker ps | grep -q supabase; then
  CONTAINER=$(docker ps | grep supabase.*postgres | awk '{print $1}' | head -1)
  if [ -n "$CONTAINER" ]; then
    echo "✓ 找到Supabase Postgres容器: $CONTAINER"
    echo ""
    echo "执行迁移脚本..."
    docker exec -i $CONTAINER psql -U postgres postgres < scripts/migrations/001_install_date_anti_tampering.sql
    echo ""
    echo "✅ 迁移完成 (via Docker)"
    exit 0
  fi
fi

echo "未找到Docker容器"
echo ""

# 方法2: 使用Node.js脚本执行
echo "尝试方法2: 使用Node.js执行..."
node scripts/apply-db-migration.js

