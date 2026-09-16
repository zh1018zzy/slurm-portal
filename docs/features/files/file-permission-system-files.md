# 文件权限系统相关文件清单

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📁 核心实现文件

### 1. 权限检查器
- **文件**: `lib/file-permission-checker.ts`
- **功能**: 核心权限检查逻辑
- **包含**: 权限验证、配额管理、日志记录

### 2. 文件API集成
- **文件**: `app/api/files/route.ts`
- **功能**: 文件操作API（已集成权限检查）
- **包含**: 上传、删除、列表、预览权限检查

### 3. 管理员API
- **文件**: `app/api/admin/file-permissions/route.ts`
- **功能**: 管理员权限管理API
- **包含**: 获取、创建、更新、删除权限

### 4. 前端管理界面
- **文件**: `app/dashboard/system/permissions/file-permissions/page.tsx`
- **功能**: 权限管理页面
- **包含**: 用户选择、权限配置、批量操作

### 5. 权限管理布局
- **文件**: `app/dashboard/system/permissions/layout.tsx`
- **功能**: 权限管理导航布局
- **包含**: 权限类型导航、页面结构

## 🗄️ 数据库文件

### 1. 权限表创建脚本
- **文件**: `db/create_permissions_tables.sql`
- **功能**: 创建权限相关数据库表
- **包含**: 
  - `file_permissions` - 文件权限表
  - `file_operation_logs` - 文件操作日志表
  - 索引和触发器

## 📚 文档文件

### 1. 功能说明文档
- **文件**: `docs/file-permission-management.md`
- **内容**: 功能概述、权限类型、配置选项、使用场景

### 2. 系统总结文档
- **文件**: `docs/file-permission-system-summary.md`
- **内容**: 完整系统总结、技术架构、功能特性、部署指南

### 3. 技术实现文档
- **文件**: `docs/file-permission-implementation.md`
- **内容**: 详细技术实现、代码示例、数据库设计

### 4. API使用指南
- **文件**: `docs/file-permission-api-guide.md`
- **内容**: API接口说明、使用示例、错误处理

### 5. 部署指南
- **文件**: `docs/file-permission-deployment-guide.md`
- **内容**: 环境准备、数据库初始化、安全配置、监控设置

### 6. 文件清单（本文件）
- **文件**: `docs/file-permission-system-files.md`
- **内容**: 所有相关文件的清单和说明

## 🧪 测试文件

### 1. 权限测试脚本
- **文件**: `scripts/test-admin-permissions.js`
- **功能**: 测试管理员权限API
- **包含**: JWT token生成、API测试、结果验证

## 🔧 配置文件

### 1. 环境变量配置
```bash
# JWT配置
JWT_SECRET=your-secure-jwt-secret

# 数据库配置
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-key

# 权限配置
DEFAULT_FILE_SIZE_LIMIT=104857600
DEFAULT_QUOTA_LIMIT=1073741824
PERMISSION_CACHE_DURATION=300000
```

## 📊 数据库表结构

### 1. 文件权限表 (`file_permissions`)
```sql
CREATE TABLE file_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
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
```

### 2. 文件操作日志表 (`file_operation_logs`)
```sql
CREATE TABLE file_operation_logs (
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
```

## 🔗 API接口列表

### 1. 管理员权限管理API
- `GET /api/admin/file-permissions?userId={userId}` - 获取用户权限列表
- `POST /api/admin/file-permissions` - 创建或更新用户权限
- `DELETE /api/admin/file-permissions?userId={userId}&permissionType={permissionType}` - 删除用户权限

### 2. 文件操作API（已集成权限检查）
- `POST /api/files` - 文件上传（权限检查）
- `DELETE /api/files?username={username}&path={filePath}` - 文件删除（权限检查）
- `GET /api/files?username={username}&path={path}` - 文件列表（权限检查）
- `GET /api/files?username={username}&file={filePath}` - 文件预览（权限检查）

## 🎯 权限类型

### 1. 文件上传权限 (`file_upload`)
- 控制用户是否可以上传文件
- 限制项：文件大小、类型、配额、路径、时间

### 2. 文件下载权限 (`file_download`)
- 控制用户是否可以下载文件
- 限制项：文件类型、路径、时间

### 3. 文件预览权限 (`file_preview`)
- 控制用户是否可以预览文件内容
- 限制项：文件类型、路径、时间

### 4. 文件删除权限 (`file_delete`)
- 控制用户是否可以删除文件
- 限制项：路径、时间

### 5. 文件分享权限 (`file_share`)
- 控制用户是否可以分享文件
- 限制项：文件类型、路径、时间

### 6. 文件导出权限 (`file_export`)
- 控制用户是否可以导出文件
- 限制项：文件类型、路径、时间

## 🔧 部署步骤

### 1. 环境准备
```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
nano .env
```

### 2. 数据库初始化
```bash
# 创建权限表
psql -d your_database -f db/create_permissions_tables.sql

# 验证表创建
psql -d your_database -c "\dt file_permissions"
```

### 3. 应用启动
```bash
# 构建应用
npm run build

# 启动应用
npm run start
```

### 4. 测试验证
```bash
# 运行测试脚本
node scripts/test-admin-permissions.js

# 测试API接口
curl -H "Authorization: Bearer your-token" \
     "http://localhost:3000/api/admin/file-permissions?userId=testuser3"
```

## 📈 监控和维护

### 1. 日志文件
- 应用日志: `/var/log/my-hpcapp/`
- 数据库日志: `/var/log/postgresql/`
- 系统日志: `/var/log/syslog`

### 2. 监控脚本
- 应用监控: `/usr/local/bin/monitor-hpcapp.sh`
- 数据库监控: `/usr/local/bin/monitor-db.sh`
- 备份脚本: `/usr/local/bin/backup-db.sh`

### 3. 性能优化
- 数据库索引优化
- 权限缓存配置
- 日志清理策略

## 🚀 使用流程

### 1. 管理员配置权限
1. 访问权限管理页面: `/dashboard/system/permissions/file-permissions`
2. 选择要管理的用户
3. 配置相应的文件权限
4. 保存权限配置

### 2. 用户使用文件功能
1. 用户访问文件管理页面: `/dashboard/files`
2. 系统自动检查用户权限
3. 根据权限限制显示或隐藏功能
4. 记录所有操作日志

### 3. 监控和审计
1. 查看操作日志了解用户行为
2. 监控配额使用情况
3. 分析权限拒绝原因
4. 优化权限配置

## 📋 文件清单总结

| 类型 | 文件数量 | 主要功能 |
|------|----------|----------|
| 核心实现 | 5个 | 权限检查、API集成、前端界面 |
| 数据库 | 1个 | 表结构创建脚本 |
| 文档 | 6个 | 功能说明、技术实现、部署指南 |
| 测试 | 1个 | API测试脚本 |
| 配置 | 环境变量 | 系统配置参数 |

## 🎯 核心特性

### ✅ 已实现功能
- **6种权限类型**：上传、下载、预览、删除、分享、导出
- **5种限制条件**：文件大小、类型、路径、配额、时间
- **完整的管理界面**：用户选择、权限配置、批量操作
- **安全的API接口**：权限验证、操作日志、错误处理
- **性能优化**：缓存策略、批量操作、异步处理

### 🔒 安全特性
- **多层验证**：用户身份、权限配置、操作限制
- **路径安全**：严格的路径范围检查和规范化
- **配额控制**：实时监控和限制存储使用
- **完整日志**：详细的操作审计和权限检查记录

### 📊 监控特性
- **操作日志**：记录所有文件操作和权限检查
- **配额监控**：实时监控用户存储使用情况
- **性能监控**：数据库连接、查询性能监控
- **告警机制**：异常操作和系统状态告警

这个文件权限系统为HPC环境提供了强大、安全、高性能的文件权限管理能力，支持细粒度的权限控制和完整的审计功能。 
