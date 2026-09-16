# 权限控制系统数据库设计 - 第二部分

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 扩展权限表设计

### 1. 文件操作权限表

```sql
-- 文件操作权限表
CREATE TABLE file_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
    'file_upload',      -- 文件上传权限
    'file_download',    -- 文件下载权限
    'file_preview',     -- 文件预览权限
    'file_delete',      -- 文件删除权限
    'file_share',       -- 文件共享权限
    'file_export'       -- 文件导出权限
  )),
  file_types TEXT[],    -- 允许的文件类型 (如 ['txt', 'pdf', 'zip'])
  max_file_size BIGINT, -- 最大文件大小 (字节)
  allowed_paths TEXT[], -- 允许的路径模式 (如 ['/home/*', '/shared/*'])
  denied_paths TEXT[],  -- 禁止的路径模式
  quota_limit BIGINT,   -- 存储配额限制 (字节)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- 权限过期时间
  is_active BOOLEAN DEFAULT TRUE,
  
  -- 确保每个用户/角色/部门对每种权限类型只有一条记录
  UNIQUE(user_id, role_id, department_id, permission_type)
);

-- 文件操作权限索引
CREATE INDEX idx_file_permissions_user ON file_permissions(user_id);
CREATE INDEX idx_file_permissions_role ON file_permissions(role_id);
CREATE INDEX idx_file_permissions_type ON file_permissions(permission_type);
CREATE INDEX idx_file_permissions_active ON file_permissions(is_active);
```

### 2. WebShell权限表

```sql
-- WebShell权限表
CREATE TABLE webshell_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
    'webshell_access',      -- WebShell访问权限
    'webshell_paste',       -- 粘贴权限
    'webshell_copy',        -- 复制权限
    'webshell_upload',      -- 文件上传权限
    'webshell_download',    -- 文件下载权限
    'webshell_execute',     -- 命令执行权限
    'webshell_admin'        -- WebShell管理权限
  )),
  allowed_commands TEXT[],  -- 允许执行的命令列表
  denied_commands TEXT[],   -- 禁止执行的命令列表
  max_session_time INTEGER, -- 最大会话时间 (分钟)
  clipboard_size_limit INTEGER, -- 剪贴板大小限制 (字节)
  allowed_hosts TEXT[],     -- 允许访问的主机列表
  session_timeout INTEGER,  -- 会话超时时间 (分钟)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, role_id, department_id, permission_type)
);

-- WebShell权限索引
CREATE INDEX idx_webshell_permissions_user ON webshell_permissions(user_id);
CREATE INDEX idx_webshell_permissions_role ON webshell_permissions(role_id);
CREATE INDEX idx_webshell_permissions_type ON webshell_permissions(permission_type);
CREATE INDEX idx_webshell_permissions_active ON webshell_permissions(is_active);
```

### 3. 剪贴板权限表

```sql
-- 剪贴板权限表
CREATE TABLE clipboard_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  permission_type VARCHAR(50) NOT NULL CHECK (permission_type IN (
    'clipboard_read',       -- 读取剪贴板权限
    'clipboard_write',      -- 写入剪贴板权限
    'clipboard_clear',      -- 清空剪贴板权限
    'clipboard_history',    -- 剪贴板历史权限
    'clipboard_share'       -- 剪贴板共享权限
  )),
  content_types TEXT[],     -- 允许的内容类型 (如 ['text', 'image', 'file'])
  size_limit INTEGER,       -- 内容大小限制 (字节)
  history_limit INTEGER,    -- 历史记录数量限制
  allowed_apps TEXT[],      -- 允许的应用列表
  denied_apps TEXT[],       -- 禁止的应用列表
  encryption_required BOOLEAN DEFAULT FALSE, -- 是否需要加密
  audit_enabled BOOLEAN DEFAULT TRUE,        -- 是否启用审计
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  
  UNIQUE(user_id, role_id, department_id, permission_type)
);

-- 剪贴板权限索引
CREATE INDEX idx_clipboard_permissions_user ON clipboard_permissions(user_id);
CREATE INDEX idx_clipboard_permissions_role ON clipboard_permissions(role_id);
CREATE INDEX idx_clipboard_permissions_type ON clipboard_permissions(permission_type);
```

### 4. 扩展权限审计日志表

```sql
-- 扩展权限审计日志表
CREATE TABLE extended_permission_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username VARCHAR(100),
  permission_type VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL, -- 'file', 'webshell', 'clipboard'
  action VARCHAR(50) NOT NULL,
  resource_path TEXT,      -- 资源路径
  file_size BIGINT,        -- 文件大小
  file_type VARCHAR(50),   -- 文件类型
  command_executed TEXT,   -- 执行的命令
  clipboard_content_hash VARCHAR(64), -- 剪贴板内容哈希
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(100),
  result VARCHAR(20) NOT NULL CHECK (result IN ('granted', 'denied', 'error')),
  reason TEXT,             -- 拒绝原因
  metadata JSONB,          -- 额外元数据
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 扩展审计日志索引
CREATE INDEX idx_extended_audit_user ON extended_permission_audit_logs(user_id);
CREATE INDEX idx_extended_audit_type ON extended_permission_audit_logs(permission_type);
CREATE INDEX idx_extended_audit_resource ON extended_permission_audit_logs(resource_type);
CREATE INDEX idx_extended_audit_result ON extended_permission_audit_logs(result);
CREATE INDEX idx_extended_audit_created ON extended_permission_audit_logs(created_at);
```

## 初始数据插入

### 1. 文件操作权限初始数据

```sql
-- 为不同角色设置文件操作权限
INSERT INTO file_permissions (role_id, permission_type, file_types, max_file_size, allowed_paths, quota_limit) VALUES
-- 超级管理员 - 完全权限
(1, 'file_upload', ARRAY['*'], 107374182400, ARRAY['*'], 1099511627776), -- 100GB文件，1TB配额
(1, 'file_download', ARRAY['*'], NULL, ARRAY['*'], NULL),
(1, 'file_preview', ARRAY['*'], NULL, ARRAY['*'], NULL),
(1, 'file_delete', ARRAY['*'], NULL, ARRAY['*'], NULL),
(1, 'file_share', ARRAY['*'], NULL, ARRAY['*'], NULL),
(1, 'file_export', ARRAY['*'], NULL, ARRAY['*'], NULL),

-- 系统管理员 - 高权限
(2, 'file_upload', ARRAY['txt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'zip', 'tar', 'gz'], 10737418240, ARRAY['/home/*', '/shared/*'], 107374182400), -- 10GB文件，100GB配额
(2, 'file_download', ARRAY['*'], NULL, ARRAY['/home/*', '/shared/*'], NULL),
(2, 'file_preview', ARRAY['txt', 'pdf', 'doc', 'docx'], NULL, ARRAY['/home/*', '/shared/*'], NULL),
(2, 'file_delete', ARRAY['*'], NULL, ARRAY['/home/*', '/shared/*'], NULL),
(2, 'file_share', ARRAY['*'], NULL, ARRAY['/home/*', '/shared/*'], NULL),
(2, 'file_export', ARRAY['*'], NULL, ARRAY['/home/*', '/shared/*'], NULL),

-- 普通用户 - 基础权限
(3, 'file_upload', ARRAY['txt', 'pdf', 'doc', 'docx', 'zip'], 104857600, ARRAY['/home/*'], 10737418240), -- 100MB文件，10GB配额
(3, 'file_download', ARRAY['txt', 'pdf', 'doc', 'docx', 'zip'], NULL, ARRAY['/home/*'], NULL),
(3, 'file_preview', ARRAY['txt', 'pdf'], NULL, ARRAY['/home/*'], NULL),
(3, 'file_delete', ARRAY['txt', 'pdf', 'doc', 'docx', 'zip'], NULL, ARRAY['/home/*'], NULL),
(3, 'file_share', ARRAY['txt', 'pdf'], NULL, ARRAY['/home/*'], NULL),
(3, 'file_export', ARRAY['txt', 'pdf'], NULL, ARRAY['/home/*'], NULL),

-- 访客 - 只读权限
(4, 'file_download', ARRAY['txt', 'pdf'], NULL, ARRAY['/public/*'], NULL),
(4, 'file_preview', ARRAY['txt', 'pdf'], NULL, ARRAY['/public/*'], NULL);
```

### 2. WebShell权限初始数据

```sql
-- 为不同角色设置WebShell权限
INSERT INTO webshell_permissions (role_id, permission_type, allowed_commands, denied_commands, max_session_time, clipboard_size_limit) VALUES
-- 超级管理员 - 完全权限
(1, 'webshell_access', ARRAY['*'], ARRAY[], 480, 1048576), -- 8小时会话，1MB剪贴板
(1, 'webshell_paste', ARRAY['*'], ARRAY[], NULL, 1048576),
(1, 'webshell_copy', ARRAY['*'], ARRAY[], NULL, 1048576),
(1, 'webshell_upload', ARRAY['*'], ARRAY[], NULL, NULL),
(1, 'webshell_download', ARRAY['*'], ARRAY[], NULL, NULL),
(1, 'webshell_execute', ARRAY['*'], ARRAY[], NULL, NULL),
(1, 'webshell_admin', ARRAY['*'], ARRAY[], NULL, NULL),

-- 系统管理员 - 高权限
(2, 'webshell_access', ARRAY['*'], ARRAY['rm -rf /', 'dd if=/dev/zero'], 240, 524288), -- 4小时会话，512KB剪贴板
(2, 'webshell_paste', ARRAY['*'], ARRAY['rm -rf', 'dd'], NULL, 524288),
(2, 'webshell_copy', ARRAY['*'], ARRAY[], NULL, 524288),
(2, 'webshell_upload', ARRAY['*'], ARRAY[], NULL, NULL),
(2, 'webshell_download', ARRAY['*'], ARRAY[], NULL, NULL),
(2, 'webshell_execute', ARRAY['*'], ARRAY['rm -rf /', 'dd if=/dev/zero'], NULL, NULL),
(2, 'webshell_admin', ARRAY['*'], ARRAY['rm -rf /'], NULL, NULL),

-- 普通用户 - 基础权限
(3, 'webshell_access', ARRAY['ls', 'cd', 'pwd', 'cat', 'less', 'grep', 'find', 'tar', 'gzip'], ARRAY['rm -rf', 'dd', 'mkfs', 'fdisk'], 120, 262144), -- 2小时会话，256KB剪贴板
(3, 'webshell_paste', ARRAY['ls', 'cd', 'pwd', 'cat', 'less', 'grep', 'find'], ARRAY['rm -rf', 'dd', 'mkfs', 'fdisk'], NULL, 262144),
(3, 'webshell_copy', ARRAY['ls', 'cd', 'pwd', 'cat', 'less', 'grep', 'find'], ARRAY[], NULL, 262144),
(3, 'webshell_upload', ARRAY['txt', 'pdf', 'doc', 'docx', 'zip'], ARRAY[], NULL, NULL),
(3, 'webshell_download', ARRAY['txt', 'pdf', 'doc', 'docx', 'zip'], ARRAY[], NULL, NULL),
(3, 'webshell_execute', ARRAY['ls', 'cd', 'pwd', 'cat', 'less', 'grep', 'find', 'tar', 'gzip'], ARRAY['rm -rf', 'dd', 'mkfs', 'fdisk'], NULL, NULL),

-- 访客 - 无WebShell权限
(4, 'webshell_access', ARRAY[], ARRAY['*'], 0, 0);
```

### 3. 剪贴板权限初始数据

```sql
-- 为不同角色设置剪贴板权限
INSERT INTO clipboard_permissions (role_id, permission_type, content_types, size_limit, history_limit, encryption_required) VALUES
-- 超级管理员 - 完全权限
(1, 'clipboard_read', ARRAY['text', 'image', 'file'], 1048576, 100, FALSE), -- 1MB，100条历史
(1, 'clipboard_write', ARRAY['text', 'image', 'file'], 1048576, 100, FALSE),
(1, 'clipboard_clear', ARRAY['text', 'image', 'file'], NULL, NULL, FALSE),
(1, 'clipboard_history', ARRAY['text', 'image', 'file'], NULL, 100, FALSE),
(1, 'clipboard_share', ARRAY['text', 'image', 'file'], 1048576, 100, FALSE),

-- 系统管理员 - 高权限
(2, 'clipboard_read', ARRAY['text', 'image'], 524288, 50, FALSE), -- 512KB，50条历史
(2, 'clipboard_write', ARRAY['text', 'image'], 524288, 50, FALSE),
(2, 'clipboard_clear', ARRAY['text', 'image'], NULL, NULL, FALSE),
(2, 'clipboard_history', ARRAY['text', 'image'], NULL, 50, FALSE),
(2, 'clipboard_share', ARRAY['text', 'image'], 524288, 50, FALSE),

-- 普通用户 - 基础权限
(3, 'clipboard_read', ARRAY['text'], 262144, 20, TRUE), -- 256KB，20条历史，需要加密
(3, 'clipboard_write', ARRAY['text'], 262144, 20, TRUE),
(3, 'clipboard_clear', ARRAY['text'], NULL, NULL, TRUE),
(3, 'clipboard_history', ARRAY['text'], NULL, 20, TRUE),
(3, 'clipboard_share', ARRAY['text'], 262144, 20, TRUE),

-- 访客 - 受限权限
(4, 'clipboard_read', ARRAY['text'], 65536, 5, TRUE), -- 64KB，5条历史，需要加密
(4, 'clipboard_write', ARRAY['text'], 65536, 5, TRUE),
(4, 'clipboard_clear', ARRAY['text'], NULL, NULL, TRUE),
(4, 'clipboard_history', ARRAY['text'], NULL, 5, TRUE),
(4, 'clipboard_share', ARRAY['text'], 65536, 5, TRUE);
```

## 权限检查函数

### 1. 文件权限检查函数

```sql
-- 检查文件操作权限
CREATE OR REPLACE FUNCTION check_file_permission(
  p_user_id UUID,
  p_permission_type VARCHAR(50),
  p_file_path TEXT DEFAULT NULL,
  p_file_size BIGINT DEFAULT NULL,
  p_file_type VARCHAR(50) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
  v_user_role_id INTEGER;
  v_user_department_id INTEGER;
  v_permission RECORD;
BEGIN
  -- 获取用户角色和部门
  SELECT role_id, department_id INTO v_user_role_id, v_user_department_id
  FROM users WHERE id = p_user_id;
  
  -- 检查用户直接权限
  SELECT * INTO v_permission
  FROM file_permissions
  WHERE user_id = p_user_id 
    AND permission_type = p_permission_type
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;
  
  IF v_permission.id IS NOT NULL THEN
    v_has_permission := TRUE;
  ELSE
    -- 检查角色权限
    SELECT * INTO v_permission
    FROM file_permissions
    WHERE role_id = v_user_role_id 
      AND permission_type = p_permission_type
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    IF v_permission.id IS NOT NULL THEN
      v_has_permission := TRUE;
    ELSE
      -- 检查部门权限
      SELECT * INTO v_permission
      FROM file_permissions
      WHERE department_id = v_user_department_id 
        AND permission_type = p_permission_type
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1;
      
      IF v_permission.id IS NOT NULL THEN
        v_has_permission := TRUE;
      END IF;
    END IF;
  END IF;
  
  -- 如果有权限，进行详细检查
  IF v_has_permission AND v_permission.id IS NOT NULL THEN
    -- 检查文件类型
    IF v_permission.file_types IS NOT NULL AND p_file_type IS NOT NULL THEN
      IF NOT (p_file_type = ANY(v_permission.file_types) OR '*' = ANY(v_permission.file_types)) THEN
        v_has_permission := FALSE;
      END IF;
    END IF;
    
    -- 检查文件大小
    IF v_permission.max_file_size IS NOT NULL AND p_file_size IS NOT NULL THEN
      IF p_file_size > v_permission.max_file_size THEN
        v_has_permission := FALSE;
      END IF;
    END IF;
    
    -- 检查路径权限
    IF v_permission.allowed_paths IS NOT NULL AND p_file_path IS NOT NULL THEN
      -- 这里需要实现路径匹配逻辑
      -- 简化版本：检查路径是否以允许的路径开头
      v_has_permission := EXISTS (
        SELECT 1 FROM unnest(v_permission.allowed_paths) AS allowed_path
        WHERE p_file_path LIKE allowed_path || '%'
      );
    END IF;
  END IF;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;
```

### 2. WebShell权限检查函数

```sql
-- 检查WebShell权限
CREATE OR REPLACE FUNCTION check_webshell_permission(
  p_user_id UUID,
  p_permission_type VARCHAR(50),
  p_command TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
  v_user_role_id INTEGER;
  v_user_department_id INTEGER;
  v_permission RECORD;
BEGIN
  -- 获取用户角色和部门
  SELECT role_id, department_id INTO v_user_role_id, v_user_department_id
  FROM users WHERE id = p_user_id;
  
  -- 检查用户直接权限
  SELECT * INTO v_permission
  FROM webshell_permissions
  WHERE user_id = p_user_id 
    AND permission_type = p_permission_type
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;
  
  IF v_permission.id IS NOT NULL THEN
    v_has_permission := TRUE;
  ELSE
    -- 检查角色权限
    SELECT * INTO v_permission
    FROM webshell_permissions
    WHERE role_id = v_user_role_id 
      AND permission_type = p_permission_type
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    IF v_permission.id IS NOT NULL THEN
      v_has_permission := TRUE;
    ELSE
      -- 检查部门权限
      SELECT * INTO v_permission
      FROM webshell_permissions
      WHERE department_id = v_user_department_id 
        AND permission_type = p_permission_type
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1;
      
      IF v_permission.id IS NOT NULL THEN
        v_has_permission := TRUE;
      END IF;
    END IF;
  END IF;
  
  -- 如果有权限且涉及命令执行，检查命令权限
  IF v_has_permission AND v_permission.id IS NOT NULL AND p_command IS NOT NULL THEN
    -- 检查禁止的命令
    IF v_permission.denied_commands IS NOT NULL THEN
      IF p_command = ANY(v_permission.denied_commands) THEN
        v_has_permission := FALSE;
      END IF;
    END IF;
    
    -- 检查允许的命令
    IF v_permission.allowed_commands IS NOT NULL THEN
      IF NOT (p_command = ANY(v_permission.allowed_commands) OR '*' = ANY(v_permission.allowed_commands)) THEN
        v_has_permission := FALSE;
      END IF;
    END IF;
  END IF;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;
```

### 3. 剪贴板权限检查函数

```sql
-- 检查剪贴板权限
CREATE OR REPLACE FUNCTION check_clipboard_permission(
  p_user_id UUID,
  p_permission_type VARCHAR(50),
  p_content_type VARCHAR(50) DEFAULT NULL,
  p_content_size INTEGER DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := FALSE;
  v_user_role_id INTEGER;
  v_user_department_id INTEGER;
  v_permission RECORD;
BEGIN
  -- 获取用户角色和部门
  SELECT role_id, department_id INTO v_user_role_id, v_user_department_id
  FROM users WHERE id = p_user_id;
  
  -- 检查用户直接权限
  SELECT * INTO v_permission
  FROM clipboard_permissions
  WHERE user_id = p_user_id 
    AND permission_type = p_permission_type
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;
  
  IF v_permission.id IS NOT NULL THEN
    v_has_permission := TRUE;
  ELSE
    -- 检查角色权限
    SELECT * INTO v_permission
    FROM clipboard_permissions
    WHERE role_id = v_user_role_id 
      AND permission_type = p_permission_type
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
    LIMIT 1;
    
    IF v_permission.id IS NOT NULL THEN
      v_has_permission := TRUE;
    ELSE
      -- 检查部门权限
      SELECT * INTO v_permission
      FROM clipboard_permissions
      WHERE department_id = v_user_department_id 
        AND permission_type = p_permission_type
        AND is_active = TRUE
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1;
      
      IF v_permission.id IS NOT NULL THEN
        v_has_permission := TRUE;
      END IF;
    END IF;
  END IF;
  
  -- 如果有权限，进行详细检查
  IF v_has_permission AND v_permission.id IS NOT NULL THEN
    -- 检查内容类型
    IF v_permission.content_types IS NOT NULL AND p_content_type IS NOT NULL THEN
      IF NOT (p_content_type = ANY(v_permission.content_types)) THEN
        v_has_permission := FALSE;
      END IF;
    END IF;
    
    -- 检查内容大小
    IF v_permission.size_limit IS NOT NULL AND p_content_size IS NOT NULL THEN
      IF p_content_size > v_permission.size_limit THEN
        v_has_permission := FALSE;
      END IF;
    END IF;
  END IF;
  
  RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql;
```

## 权限审计触发器

```sql
-- 文件操作审计触发器
CREATE OR REPLACE FUNCTION audit_file_operation() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO extended_permission_audit_logs (
    user_id, username, permission_type, resource_type, action,
    resource_path, file_size, file_type, ip_address, result
  ) VALUES (
    NEW.user_id, 
    (SELECT username FROM users WHERE id = NEW.user_id),
    NEW.permission_type,
    'file',
    CASE 
      WHEN NEW.permission_type = 'file_upload' THEN 'upload'
      WHEN NEW.permission_type = 'file_download' THEN 'download'
      WHEN NEW.permission_type = 'file_preview' THEN 'preview'
      WHEN NEW.permission_type = 'file_delete' THEN 'delete'
      WHEN NEW.permission_type = 'file_share' THEN 'share'
      WHEN NEW.permission_type = 'file_export' THEN 'export'
    END,
    NEW.resource_path,
    NEW.file_size,
    NEW.file_type,
    inet_client_addr(),
    'granted'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- WebShell操作审计触发器
CREATE OR REPLACE FUNCTION audit_webshell_operation() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO extended_permission_audit_logs (
    user_id, username, permission_type, resource_type, action,
    command_executed, ip_address, result
  ) VALUES (
    NEW.user_id,
    (SELECT username FROM users WHERE id = NEW.user_id),
    NEW.permission_type,
    'webshell',
    CASE 
      WHEN NEW.permission_type = 'webshell_access' THEN 'access'
      WHEN NEW.permission_type = 'webshell_paste' THEN 'paste'
      WHEN NEW.permission_type = 'webshell_copy' THEN 'copy'
      WHEN NEW.permission_type = 'webshell_upload' THEN 'upload'
      WHEN NEW.permission_type = 'webshell_download' THEN 'download'
      WHEN NEW.permission_type = 'webshell_execute' THEN 'execute'
      WHEN NEW.permission_type = 'webshell_admin' THEN 'admin'
    END,
    NEW.command_executed,
    inet_client_addr(),
    'granted'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

这个扩展的权限系统为文件操作、WebShell和剪贴板提供了细粒度的权限控制，包括：

1. **文件权限**：上传、下载、预览、删除、共享、导出权限
2. **WebShell权限**：访问、粘贴、复制、上传、下载、执行、管理权限
3. **剪贴板权限**：读取、写入、清空、历史、共享权限
4. **详细审计**：记录所有权限操作，便于安全监控
5. **灵活配置**：支持按用户、角色、部门设置权限
6. **安全限制**：文件大小、类型、路径、命令白名单/黑名单等 
