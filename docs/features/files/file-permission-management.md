# 文件权限管理系统

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 功能概述

文件权限管理系统允许管理员精确控制用户对文件的访问和操作权限，包括上传、下载、预览、删除等操作。

## 权限类型

### 1. 文件上传权限 (`file_upload`)
- **功能**：控制用户是否可以上传文件
- **限制项**：
  - 文件大小限制
  - 文件类型限制
  - 存储配额限制
  - 路径限制
  - 时间限制

### 2. 文件下载权限 (`file_download`)
- **功能**：控制用户是否可以下载文件
- **限制项**：
  - 文件类型限制
  - 路径限制
  - 时间限制

### 3. 文件预览权限 (`file_preview`)
- **功能**：控制用户是否可以预览文件内容
- **限制项**：
  - 文件类型限制
  - 路径限制
  - 时间限制

### 4. 文件删除权限 (`file_delete`)
- **功能**：控制用户是否可以删除文件
- **限制项**：
  - 路径限制
  - 时间限制

### 5. 文件分享权限 (`file_share`)
- **功能**：控制用户是否可以分享文件
- **限制项**：
  - 文件类型限制
  - 路径限制
  - 时间限制

### 6. 文件导出权限 (`file_export`)
- **功能**：控制用户是否可以导出文件
- **限制项**：
  - 文件类型限制
  - 路径限制
  - 时间限制

## 权限配置选项

### 1. 基本设置
- **启用状态**：是否启用该权限
- **权限类型**：选择具体的操作权限

### 2. 文件限制
- **文件大小限制**：限制单个文件的最大大小
- **文件类型限制**：限制允许的文件类型（如：jpg,png,pdf）
- **存储配额限制**：限制用户的总存储空间

### 3. 路径限制
- **允许路径**：指定用户可以操作的路径范围
- **禁止路径**：指定用户不能操作的路径

### 4. 时间限制
- **允许时间**：指定允许操作的时间段
- **允许日期**：指定允许操作的日期

## 技术实现

### 1. 数据库设计

**文件权限表 (`file_permissions`)**
```sql
CREATE TABLE file_permissions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    permission_type VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    file_types TEXT[],
    max_file_size BIGINT,
    allowed_paths TEXT[],
    denied_paths TEXT[],
    quota_limit BIGINT,
    time_restrictions JSONB,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**文件操作日志表 (`file_operation_logs`)**
```sql
CREATE TABLE file_operation_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    username VARCHAR(100),
    operation_type VARCHAR(50) NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    file_type VARCHAR(100),
    result VARCHAR(20) NOT NULL,
    reason TEXT,
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. 权限检查流程

```typescript
// 1. 构建权限检查请求
const permissionRequest = {
  userId: userInfo.id,
  username: userInfo.username,
  operationType: 'file_upload',
  filePath: uploadPath,
  fileSize: file.size,
  fileType: file.name.split('.').pop()?.toLowerCase(),
  ipAddress: request.headers.get('x-forwarded-for')
}

// 2. 检查权限
const permissionResult = await checkFilePermission(permissionRequest)

// 3. 记录操作日志
await logFileOperation(permissionRequest, permissionResult)

// 4. 根据结果决定是否允许操作
if (!permissionResult.hasPermission) {
  return NextResponse.json({ 
    error: `权限不足: ${permissionResult.reason}`,
    quotaUsed: permissionResult.quotaUsed,
    quotaRemaining: permissionResult.quotaRemaining
  }, { status: 403 })
}
```

### 3. 权限验证逻辑

**文件类型检查**
```typescript
if (permission.file_types && permission.file_types.length > 0) {
  if (request.fileType && !permission.file_types.includes(request.fileType)) {
    return { hasPermission: false, reason: '文件类型不被允许' }
  }
}
```

**文件大小检查**
```typescript
if (permission.max_file_size && request.fileSize) {
  if (request.fileSize > permission.max_file_size) {
    return { hasPermission: false, reason: `文件大小超过限制` }
  }
}
```

**路径检查**
```typescript
// 检查允许路径
if (permission.allowed_paths && permission.allowed_paths.length > 0) {
  const isAllowed = permission.allowed_paths.some(path => 
    request.filePath!.startsWith(path)
  )
  if (!isAllowed) {
    return { hasPermission: false, reason: '路径不在允许范围内' }
  }
}

// 检查禁止路径
if (permission.denied_paths && permission.denied_paths.length > 0) {
  const isDenied = permission.denied_paths.some(path => 
    request.filePath!.startsWith(path)
  )
  if (isDenied) {
    return { hasPermission: false, reason: '路径被禁止访问' }
  }
}
```

**配额检查**
```typescript
if (permission.quota_limit) {
  const quotaUsed = await getUserQuotaUsed(request.userId)
  const quotaRemaining = permission.quota_limit - quotaUsed
  
  if (request.fileSize && request.fileSize > quotaRemaining) {
    return { 
      hasPermission: false, 
      reason: '存储配额不足',
      quotaUsed,
      quotaRemaining
    }
  }
}
```

## 管理员界面

### 1. 权限管理页面
- **用户选择**：选择要管理的用户
- **权限列表**：显示用户的所有文件权限
- **权限编辑**：添加、编辑、删除权限配置
- **实时状态**：显示权限的启用状态

### 2. 权限配置对话框
- **权限类型选择**：选择具体的操作权限
- **基本设置**：启用状态、文件大小限制
- **配额设置**：存储配额限制
- **文件类型限制**：允许的文件类型
- **路径限制**：允许和禁止的路径

## API接口

### 1. 获取用户权限
```http
GET /api/admin/file-permissions?userId={userId}
Authorization: Bearer {token}
```

### 2. 更新用户权限
```http
POST /api/admin/file-permissions
Authorization: Bearer {token}
Content-Type: application/json

{
  "userId": "user-id",
  "permissionType": "file_upload",
  "updates": {
    "isEnabled": true,
    "maxFileSize": 10485760,
    "fileTypes": ["jpg", "png", "pdf"],
    "quotaLimit": 1073741824
  }
}
```

### 3. 删除用户权限
```http
DELETE /api/admin/file-permissions?userId={userId}&permissionType={permissionType}
Authorization: Bearer {token}
```

## 使用场景

### 1. 限制文件上传
```
场景：限制用户只能上传图片文件，最大10MB
配置：
- 权限类型：file_upload
- 文件类型：jpg,png,gif
- 文件大小限制：10MB
- 存储配额：1GB
```

### 2. 保护重要目录
```
场景：禁止用户删除系统重要文件
配置：
- 权限类型：file_delete
- 禁止路径：/home/user/system,/home/user/config
```

### 3. 时间限制
```
场景：只允许在工作时间上传文件
配置：
- 权限类型：file_upload
- 时间限制：9:00-18:00
- 日期限制：周一到周五
```

### 4. 配额管理
```
场景：限制用户总存储空间
配置：
- 权限类型：file_upload
- 存储配额：5GB
- 实时监控配额使用情况
```

## 安全特性

### 1. 权限验证
- 每次文件操作都会进行权限检查
- 支持多种限制条件的组合验证
- 实时记录所有操作日志

### 2. 路径安全
- 防止路径遍历攻击
- 严格的路径范围检查
- 支持通配符和正则表达式

### 3. 配额控制
- 实时监控存储使用情况
- 防止存储空间滥用
- 支持配额预警和通知

### 4. 审计日志
- 记录所有文件操作
- 包含操作结果和原因
- 支持日志查询和分析

## 最佳实践

### 1. 权限配置
- 遵循最小权限原则
- 定期审查和更新权限配置
- 为不同用户组设置不同的权限策略

### 2. 监控和告警
- 监控权限使用情况
- 设置配额使用告警
- 定期分析操作日志

### 3. 用户教育
- 向用户说明权限限制
- 提供清晰的错误提示
- 建立权限申请流程

## 总结

文件权限管理系统提供了细粒度的权限控制能力：

- **精确控制**：支持多种权限类型和限制条件
- **灵活配置**：可以根据需要组合不同的限制条件
- **安全可靠**：多重验证和完整的审计日志
- **易于管理**：直观的管理界面和API接口

这个系统特别适合在HPC环境中管理大量用户的文件访问权限，确保系统安全和资源合理使用。 
