-- ============================================================
-- HPC 管理平台完整数据库初始化脚本
-- ============================================================
-- 版本: 2.0
-- 创建日期: 2025-10-10
-- 说明: 这是一个从零开始的完整数据库初始化脚本
--       包含所有必要的表结构、索引、触发器和默认数据
--       适用于新系统部署
-- ============================================================
-- 使用方法:
-- 1. 在 Supabase 控制台的 SQL Editor 中执行
-- 2. 或使用 psql 命令: psql $DATABASE_URL -f db/init-complete.sql
-- ============================================================

BEGIN;

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- 用于模糊搜索

-- ============================================================
-- 第一部分: 核心用户和认证系统
-- ============================================================

-- 1.1 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE,
  real_name TEXT,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  department TEXT,
  role TEXT DEFAULT 'user'::text CHECK (role IN ('admin', 'user')),
  is_online BOOLEAN DEFAULT false,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uid_number INTEGER,
  gid_number INTEGER,
  home_directory TEXT,
  login_shell VARCHAR(255) DEFAULT '/bin/bash',
  webshell_access BOOLEAN DEFAULT true,
  theme_preference TEXT DEFAULT 'auto' CHECK (theme_preference IN ('light', 'dark', 'auto')),
  account_suspended BOOLEAN NOT NULL DEFAULT false,
  ssh_public_keys JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department);
CREATE INDEX IF NOT EXISTS idx_users_uid_number ON users(uid_number);

-- 1.2 用户组表
CREATE TABLE IF NOT EXISTS user_groups (
  id SERIAL PRIMARY KEY,
  group_name VARCHAR(64) NOT NULL UNIQUE,
  gid_number INTEGER NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1.3 用户组成员关系表
CREATE TABLE IF NOT EXISTS user_group_memberships (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_id INTEGER NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- 用户组索引
CREATE INDEX IF NOT EXISTS idx_user_groups_name ON user_groups(group_name);
CREATE INDEX IF NOT EXISTS idx_user_groups_gid ON user_groups(gid_number);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_user ON user_group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_group_memberships_group ON user_group_memberships(group_id);

-- 1.4 删除用户黑名单表（防止LDAP重新同步已删除用户）
CREATE TABLE IF NOT EXISTS deleted_users_blacklist (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255),
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_by VARCHAR(255),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 黑名单表索引
CREATE INDEX IF NOT EXISTS idx_deleted_users_blacklist_username ON deleted_users_blacklist(username);
CREATE INDEX IF NOT EXISTS idx_deleted_users_blacklist_deleted_at ON deleted_users_blacklist(deleted_at);

-- ============================================================
-- 第二部分: 作业管理系统
-- ============================================================

-- 2.1 作业表
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(64) NOT NULL,
  scheduler_type VARCHAR(32) NOT NULL DEFAULT 'slurm',
  user_id VARCHAR(64) NOT NULL,
  job_name VARCHAR(128),
  script TEXT NOT NULL,
  submit_time TIMESTAMP NOT NULL DEFAULT NOW(),
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  status VARCHAR(32) NOT NULL,
  partition VARCHAR(64),
  nodes TEXT,
  params JSONB DEFAULT '{}'::jsonb,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  stdout_path TEXT,
  stderr_path TEXT,
  cpus_per_task INTEGER DEFAULT 1,
  num_tasks INTEGER DEFAULT 1,
  gpus_per_task INTEGER DEFAULT 0,
  total_cpus INTEGER,
  total_gpus INTEGER,
  job_type VARCHAR(32) DEFAULT 'compute' CHECK (job_type IN ('compute', 'graphics'))
);

-- 作业表索引
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_job_id ON jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduler_type ON jobs(scheduler_type);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_submit_time ON jobs(submit_time);
CREATE INDEX IF NOT EXISTS idx_jobs_partition ON jobs(partition);
CREATE INDEX IF NOT EXISTS idx_jobs_job_type ON jobs(job_type);

-- 2.2 作业状态历史表
CREATE TABLE IF NOT EXISTS job_status_history (
  id SERIAL PRIMARY KEY,
  job_id VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 作业状态历史索引
CREATE INDEX IF NOT EXISTS idx_job_status_history_job_id ON job_status_history(job_id);
CREATE INDEX IF NOT EXISTS idx_job_status_history_changed_at ON job_status_history(changed_at);

-- ============================================================
-- 第三部分: 应用程序管理系统
-- ============================================================

-- 3.1 应用程序表
CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL,
  description TEXT,
  icon TEXT,
  category VARCHAR(64) DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  script_template TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'inactive', 'archived')),
  form_version INTEGER NOT NULL DEFAULT 1,
  permissions JSONB DEFAULT '{}'::jsonb,
  resource_requirements JSONB DEFAULT '{}'::jsonb,
  execution_timeout INTEGER DEFAULT 3600,
  is_visible BOOLEAN DEFAULT true,
  created_by VARCHAR(64),
  updated_by VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 应用程序表索引
CREATE INDEX IF NOT EXISTS idx_applications_category ON applications(category);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_created_by ON applications(created_by);
CREATE INDEX IF NOT EXISTS idx_applications_is_visible ON applications(is_visible);
CREATE INDEX IF NOT EXISTS idx_applications_resource_requirements ON applications USING GIN (resource_requirements);

-- 3.2 HPC应用程序规范表
CREATE TABLE IF NOT EXISTS hpc_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_version VARCHAR(16) NOT NULL DEFAULT 'v1.0',
  metadata JSONB NOT NULL,
  requirements JSONB NOT NULL,
  resources JSONB NOT NULL,
  execution JSONB NOT NULL,
  interface JSONB NOT NULL,
  io JSONB DEFAULT '{}'::jsonb,
  monitoring JSONB DEFAULT '{}'::jsonb,
  access JSONB DEFAULT '{}'::jsonb,
  extensions JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HPC应用程序表索引
CREATE INDEX IF NOT EXISTS idx_hpc_applications_status ON hpc_applications(status);
CREATE INDEX IF NOT EXISTS idx_hpc_applications_metadata ON hpc_applications USING GIN (metadata);

-- 3.3 应用程序分类表
CREATE TABLE IF NOT EXISTS application_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(128) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(255),
  color VARCHAR(7),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.4 应用程序标签表
CREATE TABLE IF NOT EXISTS application_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT,
  color VARCHAR(7),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.5 应用程序版本历史表
CREATE TABLE IF NOT EXISTS application_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  version VARCHAR(32) NOT NULL,
  changelog TEXT,
  script_template TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_current BOOLEAN DEFAULT false,
  created_by VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 应用程序相关表索引
CREATE INDEX IF NOT EXISTS idx_application_categories_active ON application_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_application_categories_sort ON application_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_application_tags_name ON application_tags(name);
CREATE INDEX IF NOT EXISTS idx_application_versions_app_id ON application_versions(application_id);
CREATE INDEX IF NOT EXISTS idx_application_versions_current ON application_versions(is_current);

-- 3.6 应用程序使用统计表
CREATE TABLE IF NOT EXISTS hpc_application_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES hpc_applications(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  job_id VARCHAR(64),
  execution_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_seconds INTEGER,
  resources_used JSONB DEFAULT '{}'::jsonb,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 应用程序使用统计索引
CREATE INDEX IF NOT EXISTS idx_hpc_app_usage_app_id ON hpc_application_usage(application_id);
CREATE INDEX IF NOT EXISTS idx_hpc_app_usage_user_id ON hpc_application_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_hpc_app_usage_execution_time ON hpc_application_usage(execution_time);

-- ============================================================
-- 第四部分: 权限管理系统（重要：使用正确的外键约束）
-- ============================================================

-- 4.1 文件权限表
CREATE TABLE IF NOT EXISTS file_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- 级联删除
  role_id UUID,
  department_id UUID,
  permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
    'file_upload', 'file_download', 'file_preview', 'file_delete', 'file_share', 'file_export', 'file_copy'
  )),
  is_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  file_types TEXT[] DEFAULT '{}',
  max_file_size BIGINT DEFAULT 104857600,
  allowed_paths TEXT[] DEFAULT '{}',
  denied_paths TEXT[] DEFAULT '{}',
  quota_limit BIGINT DEFAULT 1073741824,
  time_restrictions JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.2 WebShell权限表
CREATE TABLE IF NOT EXISTS webshell_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- 级联删除
  role_id UUID,
  department_id UUID,
  permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
    'webshell_access', 'webshell_paste', 'webshell_copy', 'webshell_upload', 
    'webshell_download', 'webshell_execute', 'webshell_admin'
  )),
  is_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  allowed_commands TEXT[] DEFAULT '{}',
  denied_commands TEXT[] DEFAULT '{}',
  allowed_hosts TEXT[] DEFAULT '{}',
  denied_hosts TEXT[] DEFAULT '{}',
  clipboard_size_limit INTEGER DEFAULT 1024,
  session_time_limit INTEGER DEFAULT 3600,
  time_restrictions JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.3 剪贴板权限表
CREATE TABLE IF NOT EXISTS clipboard_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,  -- 级联删除
  role_id UUID,
  department_id UUID,
  permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
    'clipboard_read', 'clipboard_write', 'clipboard_clear', 'clipboard_history'
  )),
  is_enabled BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  size_limit INTEGER DEFAULT 1024,
  allowed_formats TEXT[] DEFAULT '{text/plain}',
  denied_formats TEXT[] DEFAULT '{}',
  time_restrictions JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.4 权限审计日志表
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- 保留日志，设为NULL
  username VARCHAR(100),
  permission_type VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50),
  resource_id VARCHAR(255),
  result VARCHAR(20) NOT NULL CHECK (result IN ('granted', 'denied', 'error')),
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.5 文件操作日志表
CREATE TABLE IF NOT EXISTS file_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- 保留日志，设为NULL
  username VARCHAR(100),
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN (
    'file_upload', 'file_download', 'file_preview', 'file_delete', 
    'file_copy', 'file_move', 'file_rename'
  )),
  file_path TEXT NOT NULL,
  file_name VARCHAR(255),
  file_size BIGINT,
  file_type VARCHAR(100),
  source_path TEXT,
  destination_path TEXT,
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failed', 'partial')),
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4.6 WebShell操作日志表
CREATE TABLE IF NOT EXISTS webshell_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,  -- 保留日志，设为NULL
  username VARCHAR(100),
  session_id VARCHAR(255),
  operation_type VARCHAR(50) NOT NULL CHECK (operation_type IN (
    'session_start', 'session_end', 'command_execute', 'file_upload', 
    'file_download', 'clipboard_paste', 'clipboard_copy'
  )),
  command TEXT,
  working_directory TEXT,
  result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failed', 'timeout')),
  exit_code INTEGER,
  duration_ms INTEGER,
  data_size BIGINT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 权限系统索引
CREATE INDEX IF NOT EXISTS idx_file_permissions_user_id ON file_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_file_permissions_type ON file_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_file_permissions_enabled ON file_permissions(is_enabled);

CREATE INDEX IF NOT EXISTS idx_webshell_permissions_user_id ON webshell_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_webshell_permissions_type ON webshell_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_webshell_permissions_enabled ON webshell_permissions(is_enabled);

CREATE INDEX IF NOT EXISTS idx_clipboard_permissions_user_id ON clipboard_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_clipboard_permissions_type ON clipboard_permissions(permission_type);

CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_user_id ON permission_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_type ON permission_audit_logs(permission_type);
CREATE INDEX IF NOT EXISTS idx_permission_audit_logs_created_at ON permission_audit_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_file_operation_logs_user_id ON file_operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_type ON file_operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_file_operation_logs_created_at ON file_operation_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_webshell_logs_user_id ON webshell_operation_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_webshell_logs_session_id ON webshell_operation_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_webshell_logs_created_at ON webshell_operation_logs(created_at);

-- ============================================================
-- 第五部分: 通知系统
-- ============================================================

-- 5.1 通知表
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'archived')),
  user_id VARCHAR(100),
  user_roles TEXT[],
  is_global BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb,
  actions JSONB DEFAULT '{}'::jsonb,
  source VARCHAR(50) DEFAULT 'system',
  category VARCHAR(50),
  dismissible BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE
);

-- 5.2 通知偏好设置表
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) UNIQUE NOT NULL,
  email_notifications BOOLEAN DEFAULT TRUE,
  web_notifications BOOLEAN DEFAULT TRUE,
  mobile_notifications BOOLEAN DEFAULT FALSE,
  job_notifications JSONB DEFAULT '{"statusChanges": true, "queueUpdates": true, "errors": true}'::jsonb,
  system_notifications JSONB DEFAULT '{"resourceAlerts": true, "maintenance": true, "outages": true}'::jsonb,
  security_notifications JSONB DEFAULT '{"loginAlerts": true, "policyChanges": true}'::jsonb,
  minimum_priority VARCHAR(20) DEFAULT 'low' CHECK (minimum_priority IN ('low', 'medium', 'high', 'urgent')),
  quiet_hours JSONB DEFAULT '{"enabled": false, "startTime": "22:00", "endTime": "08:00"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.3 通知模板表
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) UNIQUE NOT NULL,
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  actions JSONB DEFAULT '{}'::jsonb,
  dismissible BOOLEAN DEFAULT TRUE,
  expiration_hours INTEGER DEFAULT 24,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 通知系统索引
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status_created ON notifications(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_metadata_gin ON notifications USING GIN (metadata);

-- ============================================================
-- 第六部分: 系统公告
-- ============================================================

-- 6.1 系统公告表
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error', 'maintenance')),
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 公告表索引
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(is_active, is_pinned, priority DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_time ON announcements(start_time, end_time);

-- ============================================================
-- 第七部分: 系统资源监控
-- ============================================================

-- 7.1 资源历史记录表
CREATE TABLE IF NOT EXISTS hpc_resource_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  partition_name VARCHAR(64),
  total_nodes INTEGER,
  available_nodes INTEGER,
  total_cpus INTEGER,
  available_cpus INTEGER,
  total_gpus INTEGER DEFAULT 0,
  available_gpus INTEGER DEFAULT 0,
  memory_total_gb FLOAT,
  memory_available_gb FLOAT,
  load_average FLOAT,
  queue_length INTEGER DEFAULT 0,
  running_jobs INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 7.2 发现的模块表
CREATE TABLE IF NOT EXISTS hpc_discovered_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name VARCHAR(128) NOT NULL,
  module_version VARCHAR(64),
  module_path TEXT,
  description TEXT,
  category VARCHAR(64) DEFAULT 'unknown',
  dependencies TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT true,
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 资源监控索引
CREATE INDEX IF NOT EXISTS idx_hpc_resource_history_timestamp ON hpc_resource_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_hpc_resource_history_partition ON hpc_resource_history(partition_name);
CREATE INDEX IF NOT EXISTS idx_hpc_modules_name ON hpc_discovered_modules(module_name);
CREATE INDEX IF NOT EXISTS idx_hpc_modules_category ON hpc_discovered_modules(category);
CREATE INDEX IF NOT EXISTS idx_hpc_modules_available ON hpc_discovered_modules(is_available);

-- ============================================================
-- 第八部分: 触发器和函数
-- ============================================================

-- 8.1 更新时间戳触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8.2 为所有需要的表添加更新时间戳触发器
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_groups_updated_at 
    BEFORE UPDATE ON user_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at 
    BEFORE UPDATE ON jobs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at 
    BEFORE UPDATE ON applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hpc_applications_updated_at 
    BEFORE UPDATE ON hpc_applications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_application_categories_updated_at 
    BEFORE UPDATE ON application_categories 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_permissions_updated_at 
    BEFORE UPDATE ON file_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_webshell_permissions_updated_at 
    BEFORE UPDATE ON webshell_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clipboard_permissions_updated_at 
    BEFORE UPDATE ON clipboard_permissions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at 
    BEFORE UPDATE ON notifications 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_preferences_updated_at 
    BEFORE UPDATE ON notification_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notification_templates_updated_at 
    BEFORE UPDATE ON notification_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_announcements_updated_at 
    BEFORE UPDATE ON announcements 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hpc_discovered_modules_updated_at 
    BEFORE UPDATE ON hpc_discovered_modules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8.3 实用函数

-- 创建通知函数
CREATE OR REPLACE FUNCTION create_notification(
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_user_id VARCHAR(100) DEFAULT NULL,
    p_priority VARCHAR(20) DEFAULT 'medium',
    p_category VARCHAR(50) DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_expires_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        type, title, message, user_id, priority, category, metadata, expires_at
    ) VALUES (
        p_type, p_title, p_message, p_user_id, p_priority, p_category, p_metadata,
        CASE WHEN p_expires_hours > 0 THEN NOW() + INTERVAL '1 hour' * p_expires_hours ELSE NULL END
    )
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 清理过期通知函数
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM notifications 
    WHERE expires_at IS NOT NULL AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 清理过期权限函数
CREATE OR REPLACE FUNCTION cleanup_expired_permissions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    DELETE FROM file_permissions WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    DELETE FROM webshell_permissions WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    DELETE FROM clipboard_permissions WHERE expires_at IS NOT NULL AND expires_at < NOW();
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 第九部分: 默认数据插入
-- ============================================================

-- 9.1 插入默认管理员用户
INSERT INTO users (id, username, real_name, email, role, uid_number, gid_number, home_directory)
SELECT 
  gen_random_uuid(),
  'admin',
  'System Administrator',
  'admin@hpc-platform.local',
  'admin',
  1000,
  1000,
  '/home/admin'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

-- 9.2 插入默认应用程序分类
INSERT INTO application_categories (name, description, icon, color, sort_order)
VALUES 
('通用计算', '通用计算应用程序', 'calculator', '#3B82F6', 1),
('生物信息学', '生物信息学分析工具', 'dna', '#10B981', 2),
('机器学习', '机器学习和AI工具', 'brain', '#8B5CF6', 3),
('图形应用', 'GUI图形界面应用', 'monitor', '#F59E0B', 4),
('数据分析', '数据处理和分析工具', 'chart-bar', '#EF4444', 5),
('工程仿真', '工程仿真和建模', 'cog', '#6B7280', 6)
ON CONFLICT (name) DO NOTHING;

-- 9.3 插入默认应用程序标签
INSERT INTO application_tags (name, description, color)
VALUES 
('高性能', '需要高性能计算资源', '#DC2626'),
('GPU加速', '使用GPU加速计算', '#059669'),
('内存密集', '需要大量内存', '#D97706'),
('并行计算', '支持并行处理', '#7C3AED'),
('初学者友好', '适合初学者使用', '#2563EB')
ON CONFLICT (name) DO NOTHING;

-- 9.4 插入默认通知模板
INSERT INTO notification_templates (type, priority, title_template, message_template, expiration_hours)
VALUES 
('job_completed', 'medium', '作业 {{job_name}} 已完成', '您的作业已成功完成', 72),
('job_failed', 'high', '作业 {{job_name}} 执行失败', '作业执行失败，请查看日志', 168),
('system_maintenance', 'high', '系统维护通知', '系统将进行维护，服务可能中断', 48)
ON CONFLICT (type) DO NOTHING;

-- 9.5 插入默认系统公告
INSERT INTO announcements (title, content, type, priority, is_pinned, created_by) 
VALUES
('欢迎使用HPC管理平台', '欢迎使用高性能计算管理平台！', 'success', 10, true, 'admin'),
('系统已就绪', '系统初始化完成，所有功能已准备就绪。', 'info', 5, false, 'admin')
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- 完成提示
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'HPC 管理平台数据库初始化完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✓ 核心用户系统 (users, user_groups, user_group_memberships)';
  RAISE NOTICE '✓ 作业管理系统 (jobs, job_status_history)';
  RAISE NOTICE '✓ 应用程序系统 (applications, hpc_applications, application_*)';
  RAISE NOTICE '✓ 权限管理系统 (file_permissions, webshell_permissions, clipboard_permissions)';
  RAISE NOTICE '✓ 通知系统 (notifications, notification_preferences, notification_templates)';
  RAISE NOTICE '✓ 公告系统 (announcements)';
  RAISE NOTICE '✓ 资源监控 (hpc_resource_history, hpc_discovered_modules)';
  RAISE NOTICE '✓ 删除黑名单 (deleted_users_blacklist)';
  RAISE NOTICE '';
  RAISE NOTICE '默认管理员账户:';
  RAISE NOTICE '  用户名: admin';
  RAISE NOTICE '  邮箱: admin@hpc-platform.local';
  RAISE NOTICE '';
  RAISE NOTICE '重要提示:';
  RAISE NOTICE '  1. 所有外键约束已正确设置 (CASCADE 或 SET NULL)';
  RAISE NOTICE '  2. 删除用户时会自动清理相关权限数据';
  RAISE NOTICE '  3. 日志数据会被保留 (user_id 设为 NULL)';
  RAISE NOTICE '  4. 已创建必要的索引和触发器';
  RAISE NOTICE '========================================';
END $$;

