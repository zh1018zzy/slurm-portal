#!/bin/bash

# 通过 Supabase Studio 或直接 SQL 创建 system_installation 表
# 由于 PostgREST 不支持直接执行 DDL，需要使用 psql 或 Supabase Studio

echo "=== 创建 system_installation 表 ==="
echo ""
echo "请通过以下任一方式创建表："
echo ""
echo "方式1: 使用 Supabase Studio (推荐)"
echo "  1. 访问: http://192.168.31.130:3000"
echo "  2. 进入 SQL Editor"
echo "  3. 执行以下 SQL:"
echo ""
cat << 'EOF'
CREATE TABLE IF NOT EXISTS system_installation (
  id SERIAL PRIMARY KEY,
  install_id UUID NOT NULL UNIQUE,
  install_date TIMESTAMPTZ NOT NULL,
  hardware_fingerprint TEXT NOT NULL,
  security_markers JSONB NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_install_id ON system_installation(install_id);
CREATE INDEX IF NOT EXISTS idx_hardware_fingerprint ON system_installation(hardware_fingerprint);
CREATE INDEX IF NOT EXISTS idx_is_active ON system_installation(is_active);
CREATE INDEX IF NOT EXISTS idx_install_date ON system_installation(install_date);

COMMENT ON TABLE system_installation IS '系统安装记录 - 防止删除文件重置试用期';
EOF

echo ""
echo "方式2: 使用 docker exec (如果数据库在容器中)"
echo "  docker exec -i <postgres-container> psql -U postgres -d hpc_db < scripts/migrations/create-installation-table.sql"
echo ""
echo "方式3: 直接连接 PostgreSQL"
echo "  psql -h 192.168.31.130 -U postgres -d hpc_db -f scripts/migrations/create-installation-table.sql"
echo ""
echo "创建完成后，运行: node scripts/test-db-connection.js 来同步数据"
