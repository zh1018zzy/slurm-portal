#!/bin/bash

# 权限控制系统初始化脚本
# 用于在 Supabase 中创建权限相关的数据表和初始数据

set -e

echo "🚀 开始初始化权限控制系统..."

source .env
# 检查环境变量
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ 错误: 请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量"
    echo "请确保在 .env 文件中配置了这些变量"
    exit 1
fi

# 创建临时 SQL 文件
TEMP_SQL="/tmp/permission_system_init.sql"

cat > "$TEMP_SQL" << 'EOF'
-- 权限控制系统初始化脚本

-- 1. 创建角色表
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) UNIQUE NOT NULL,
  display_name VARCHAR(128) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL DEFAULT 0,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 创建权限表
CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  scope VARCHAR(32) NOT NULL DEFAULT 'own',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource, action, scope)
);

-- 3. 创建角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  conditions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

-- 4. 创建用户角色关联表
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, role_id)
);

-- 5. 创建权限审计日志表
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(64) NOT NULL,
  resource VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128),
  permission_granted BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_level ON roles(level);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_expires_at ON user_roles(expires_at);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_user_id ON permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_created_at ON permission_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_resource ON permission_audit_logs(resource);

-- 插入基础角色
INSERT INTO roles (name, display_name, description, level, is_system) VALUES
('super_admin', '超级管理员', '系统最高权限，可管理所有功能', 100, true),
('system_admin', '系统管理员', '系统管理权限，可管理大部分功能', 80, true),
('user_admin', '用户管理员', '用户管理权限', 60, false),
('app_admin', '应用管理员', '应用管理权限', 60, false),
('job_admin', '作业管理员', '作业管理权限', 60, false),
('storage_admin', '存储管理员', '存储管理权限', 60, false),
('advanced_user', '高级用户', '高级用户权限', 40, false),
('researcher', '研究员', '研究员权限', 30, false),
('user', '普通用户', '基础用户权限', 20, true),
('guest', '访客', '只读权限', 10, false)
ON CONFLICT (name) DO NOTHING;

-- 插入基础权限
INSERT INTO permissions (resource, action, scope, description) VALUES
-- 用户权限
('user', 'create', 'all', '创建用户'),
('user', 'read', 'own', '查看自己的用户信息'),
('user', 'read', 'all', '查看所有用户信息'),
('user', 'update', 'own', '更新自己的用户信息'),
('user', 'update', 'all', '更新所有用户信息'),
('user', 'delete', 'all', '删除用户'),
('user', 'admin', 'all', '用户管理权限'),

-- 作业权限
('job', 'create', 'all', '创建作业'),
('job', 'read', 'own', '查看自己的作业'),
('job', 'read', 'all', '查看所有作业'),
('job', 'update', 'own', '更新自己的作业'),
('job', 'update', 'all', '更新所有作业'),
('job', 'delete', 'own', '删除自己的作业'),
('job', 'delete', 'all', '删除所有作业'),
('job', 'admin', 'all', '作业管理权限'),

-- 应用权限
('app', 'create', 'all', '创建应用'),
('app', 'read', 'all', '查看应用'),
('app', 'update', 'all', '更新应用'),
('app', 'delete', 'all', '删除应用'),
('app', 'admin', 'all', '应用管理权限'),

-- 文件权限
('file', 'create', 'all', '创建文件'),
('file', 'read', 'own', '读取自己的文件'),
('file', 'read', 'shared', '读取共享文件'),
('file', 'update', 'own', '更新自己的文件'),
('file', 'delete', 'own', '删除自己的文件'),
('file', 'admin', 'all', '文件管理权限'),

-- 系统权限
('system', 'read', 'all', '查看系统信息'),
('system', 'update', 'all', '更新系统配置'),
('system', 'admin', 'all', '系统管理权限')
ON CONFLICT (resource, action, scope) DO NOTHING;

-- 为超级管理员分配所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为系统管理员分配大部分权限（除了用户删除）
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.resource != 'user' OR p.action != 'delete'
WHERE r.name = 'system_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为普通用户分配基础权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
  (p.resource = 'user' AND p.action = 'read' AND p.scope = 'own') OR
  (p.resource = 'user' AND p.action = 'update' AND p.scope = 'own') OR
  (p.resource = 'job' AND p.action = 'create') OR
  (p.resource = 'job' AND p.action = 'read' AND p.scope = 'own') OR
  (p.resource = 'job' AND p.action = 'update' AND p.scope = 'own') OR
  (p.resource = 'job' AND p.action = 'delete' AND p.scope = 'own') OR
  (p.resource = 'app' AND p.action = 'read') OR
  (p.resource = 'file' AND p.action = 'create') OR
  (p.resource = 'file' AND p.action = 'read' AND p.scope = 'own') OR
  (p.resource = 'file' AND p.action = 'update' AND p.scope = 'own') OR
  (p.resource = 'file' AND p.action = 'delete' AND p.scope = 'own')
)
WHERE r.name = 'user'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 为访客分配只读权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.action = 'read'
WHERE r.name = 'guest'
ON CONFLICT (role_id, permission_id) DO NOTHING;

EOF

echo "📝 执行数据库初始化..."

# 使用 psql 执行 SQL 脚本
if command -v psql &> /dev/null; then
    # 如果有 psql 客户端，直接执行
    PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" psql -h "$(echo $SUPABASE_URL | sed 's/.*@//' | sed 's/:.*//')" -U postgres -d postgres -f "$TEMP_SQL"
else
    # 否则使用 curl 调用 Supabase REST API
    echo "⚠️  未找到 psql 客户端，使用 REST API 方式执行"
    echo "请手动执行以下 SQL 脚本："
    echo "================================"
    cat "$TEMP_SQL"
    echo "================================"
fi

# 清理临时文件
rm -f "$TEMP_SQL"

echo "✅ 权限控制系统初始化完成！"
echo ""
echo "📋 下一步操作："
echo "1. 检查数据库表是否创建成功"
echo "2. 验证基础角色和权限是否插入"
echo "3. 开始实施权限控制中间件"
echo "4. 更新现有API使用权限控制"
echo ""
echo "🔗 相关文档："
echo "- docs/permission-control-system.md"
echo "- docs/permission-control-system-part2.md"
echo "- docs/permission-control-system-part3.md"
echo "- docs/permission-control-system-part4.md" 