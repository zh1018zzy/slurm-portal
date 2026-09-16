#!/bin/bash

# 应用管理表数据库迁移脚本
# 用于在 Supabase 中创建 applications 表和相关索引

set -e

echo "🚀 开始创建应用管理表..."

# 检查环境变量
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ 错误: 请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量"
    echo "请确保在 .env 文件中配置了这些变量"
    exit 1
fi

# 创建临时 SQL 文件
TEMP_SQL="/tmp/applications_migration.sql"

cat > "$TEMP_SQL" << 'EOF'
-- 应用管理表
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  description TEXT,
  icon TEXT,
  category VARCHAR(64),
  tags TEXT[],
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  script_template TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  form_version INTEGER NOT NULL DEFAULT 1,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_applications_name ON applications(name);
CREATE INDEX IF NOT EXISTS idx_applications_category ON applications(category);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_by ON applications(created_by);

-- 应用权限表（可选，用于更细粒度的权限控制）
CREATE TABLE IF NOT EXISTS application_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  role_id VARCHAR(64),
  department_id VARCHAR(64),
  user_id VARCHAR(64),
  permission_type VARCHAR(32) NOT NULL, -- 'view', 'submit', 'admin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(application_id, role_id, department_id, user_id, permission_type)
);

-- 创建权限表索引
CREATE INDEX IF NOT EXISTS idx_application_permissions_app_id ON application_permissions(application_id);
CREATE INDEX IF NOT EXISTS idx_application_permissions_role ON application_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_application_permissions_dept ON application_permissions(department_id);
CREATE INDEX IF NOT EXISTS idx_application_permissions_user ON application_permissions(user_id);

-- 插入示例应用数据（如果表为空）
INSERT INTO applications (name, description, category, fields, script_template, status, created_by)
SELECT * FROM (VALUES
  (
    'MATLAB',
    'MATLAB 科学计算软件，支持数值计算、矩阵运算、信号处理等',
    '科学计算',
    '[
      {"name": "nodes", "label": "节点数", "type": "number", "required": true, "default": 1, "min": 1, "max": 10},
      {"name": "cpus", "label": "CPU核心数", "type": "number", "required": true, "default": 4, "min": 1, "max": 32},
      {"name": "memory", "label": "内存(GB)", "type": "number", "required": true, "default": 8, "min": 1, "max": 128},
      {"name": "time", "label": "运行时间", "type": "text", "required": true, "default": "1:00:00", "description": "格式: HH:MM:SS"},
      {"name": "script", "label": "MATLAB脚本", "type": "textarea", "required": true, "description": "输入MATLAB代码"}
    ]'::jsonb,
    '#!/bin/bash
#SBATCH -J {{name}}
#SBATCH -N {{nodes}}
#SBATCH -n {{cpus}}
#SBATCH --mem={{memory}}G
#SBATCH -t {{time}}
#SBATCH -p compute

module load matlab
matlab -batch "{{script}}"',
    'active',
    'admin'
  ),
  (
    'Gaussian',
    'Gaussian 量子化学计算软件，用于分子结构优化、能量计算等',
    '科学计算',
    '[
      {"name": "nodes", "label": "节点数", "type": "number", "required": true, "default": 1, "min": 1, "max": 8},
      {"name": "cpus", "label": "CPU核心数", "type": "number", "required": true, "default": 16, "min": 1, "max": 64},
      {"name": "memory", "label": "内存(GB)", "type": "number", "required": true, "default": 32, "min": 8, "max": 256},
      {"name": "time", "label": "运行时间", "type": "text", "required": true, "default": "4:00:00", "description": "格式: HH:MM:SS"},
      {"name": "input_file", "label": "输入文件", "type": "text", "required": true, "description": "Gaussian输入文件名(.gjf)"}
    ]'::jsonb,
    '#!/bin/bash
#SBATCH -J {{name}}
#SBATCH -N {{nodes}}
#SBATCH -n {{cpus}}
#SBATCH --mem={{memory}}G
#SBATCH -t {{time}}
#SBATCH -p compute

module load gaussian
g16 < {{input_file}} > {{input_file}}.log',
    'active',
    'admin'
  ),
  (
    'Firefox',
    'Firefox 网页浏览器，支持图形界面',
    '网络工具',
    '[
      {"name": "nodes", "label": "节点数", "type": "number", "required": true, "default": 1, "min": 1, "max": 1},
      {"name": "cpus", "label": "CPU核心数", "type": "number", "required": true, "default": 2, "min": 1, "max": 8},
      {"name": "memory", "label": "内存(GB)", "type": "number", "required": true, "default": 4, "min": 2, "max": 16},
      {"name": "time", "label": "运行时间", "type": "text", "required": true, "default": "2:00:00", "description": "格式: HH:MM:SS"}
    ]'::jsonb,
    '#!/bin/bash
#SBATCH -J {{name}}
#SBATCH -N {{nodes}}
#SBATCH -n {{cpus}}
#SBATCH --mem={{memory}}G
#SBATCH -t {{time}}
#SBATCH -p graphics

module load firefox
firefox',
    'active',
    'admin'
  )
) AS v(name, description, category, fields, script_template, status, created_by)
WHERE NOT EXISTS (SELECT 1 FROM applications WHERE name = v.name);

-- 显示创建结果
SELECT 'Applications table created successfully' as message;
SELECT COUNT(*) as total_applications FROM applications;
EOF

echo "📝 执行数据库迁移..."

# 使用 psql 执行 SQL 文件
PGPASSWORD="$SUPABASE_SERVICE_ROLE_KEY" psql \
  -h "$(echo $SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co.*||').supabase.co" \
  -p 5432 \
  -d postgres \
  -U postgres \
  -f "$TEMP_SQL"

# 清理临时文件
rm -f "$TEMP_SQL"

echo "✅ 应用管理表创建完成！"
echo "📊 现在可以在系统管理页面中访问应用管理功能"
echo "🔗 访问地址: /dashboard/applications/hpc" 