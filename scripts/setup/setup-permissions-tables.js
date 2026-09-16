#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  console.error('请确保 .env.local 文件中包含:')
  console.error('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url')
  console.error('SUPABASE_SERVICE_ROLE_KEY=your_service_role_key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createPermissionsTables() {

  try {
    // 1. 创建文件权限表
    const { error: fileError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS file_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role_id UUID,
          department_id UUID,
          permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
            'file_upload', 'file_download', 'file_preview', 'file_delete', 'file_share', 'file_export'
          )),
          is_enabled BOOLEAN DEFAULT true,
          is_active BOOLEAN DEFAULT true,
          file_types TEXT[] DEFAULT '{}',
          max_file_size BIGINT DEFAULT 104857600,
          allowed_paths TEXT[] DEFAULT '{}',
          denied_paths TEXT[] DEFAULT '{}',
          quota_limit BIGINT DEFAULT 1073741824,
          time_restrictions JSONB DEFAULT '{}',
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (fileError) {
    } else {
    }

    // 2. 创建 WebShell 权限表
    const { error: webshellError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS webshell_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role_id UUID,
          department_id UUID,
          permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
            'webshell_access', 'webshell_paste', 'webshell_copy', 'webshell_upload', 'webshell_download', 'webshell_execute', 'webshell_admin'
          )),
          is_enabled BOOLEAN DEFAULT true,
          is_active BOOLEAN DEFAULT true,
          allowed_commands TEXT[] DEFAULT '{}',
          denied_commands TEXT[] DEFAULT '{}',
          allowed_hosts TEXT[] DEFAULT '{}',
          denied_hosts TEXT[] DEFAULT '{}',
          clipboard_size_limit INTEGER DEFAULT 1024,
          session_time_limit INTEGER DEFAULT 3600,
          time_restrictions JSONB DEFAULT '{}',
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (webshellError) {
    } else {
    }

    // 3. 创建剪贴板权限表
    const { error: clipboardError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS clipboard_permissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role_id UUID,
          department_id UUID,
          permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
            'clipboard_read', 'clipboard_write', 'clipboard_clear', 'clipboard_history', 'clipboard_share'
          )),
          is_enabled BOOLEAN DEFAULT true,
          is_active BOOLEAN DEFAULT true,
          allowed_content_types TEXT[] DEFAULT '{}',
          denied_content_types TEXT[] DEFAULT '{}',
          max_content_size INTEGER DEFAULT 1024,
          history_limit INTEGER DEFAULT 10,
          allowed_apps TEXT[] DEFAULT '{}',
          denied_apps TEXT[] DEFAULT '{}',
          encryption_required BOOLEAN DEFAULT false,
          time_restrictions JSONB DEFAULT '{}',
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (clipboardError) {
    } else {
    }

    // 4. 创建权限审计日志表
    const { error: auditError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS permission_audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          username VARCHAR(100),
          resource VARCHAR(100) NOT NULL,
          action VARCHAR(100) NOT NULL,
          scope VARCHAR(100),
          has_permission BOOLEAN NOT NULL,
          ip_address INET,
          user_agent TEXT,
          request_data JSONB DEFAULT '{}',
          response_data JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (auditError) {
    } else {
    }

    // 5. 创建文件操作日志表
    const { error: fileLogError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS file_operation_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          username VARCHAR(100),
          operation_type VARCHAR(50) NOT NULL,
          file_path TEXT,
          file_size BIGINT,
          file_type VARCHAR(100),
          result VARCHAR(20) NOT NULL,
          reason TEXT,
          ip_address INET,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (fileLogError) {
    } else {
    }

    // 6. 创建 WebShell 操作日志表
    const { error: webshellLogError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS webshell_operation_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id) ON DELETE SET NULL,
          username VARCHAR(100),
          operation_type VARCHAR(50) NOT NULL,
          command TEXT,
          host VARCHAR(255),
          clipboard_size INTEGER,
          result VARCHAR(20) NOT NULL,
          reason TEXT,
          ip_address INET,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (webshellLogError) {
    } else {
    }

    // 7. 插入默认权限数据
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')

    if (adminUsers && adminUsers.length > 0) {
      const adminIds = adminUsers.map(u => u.id)
      
      // 为管理员添加默认文件权限
      for (const adminId of adminIds) {
        await supabase.from('file_permissions').upsert({
          user_id: adminId,
          permission_type: 'file_upload',
          is_enabled: true
        }, { onConflict: 'user_id,permission_type' })
        
        await supabase.from('file_permissions').upsert({
          user_id: adminId,
          permission_type: 'file_download',
          is_enabled: true
        }, { onConflict: 'user_id,permission_type' })
        
        await supabase.from('webshell_permissions').upsert({
          user_id: adminId,
          permission_type: 'webshell_access',
          is_enabled: true
        }, { onConflict: 'user_id,permission_type' })
        
        await supabase.from('clipboard_permissions').upsert({
          user_id: adminId,
          permission_type: 'clipboard_read',
          is_enabled: true
        }, { onConflict: 'user_id,permission_type' })
      }
      
    }


  } catch (error) {
    console.error('❌ 创建权限表时发生错误:', error)
    process.exit(1)
  }
}

// 执行脚本
createPermissionsTables() 