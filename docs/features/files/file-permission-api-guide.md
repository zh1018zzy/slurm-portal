# 文件权限API使用指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 API概述

文件权限管理系统提供了完整的REST API接口，用于权限管理和文件操作控制。

## 🔐 认证

所有API请求都需要在Header中包含JWT token：

```http
Authorization: Bearer <your-jwt-token>
```

## 📡 API接口列表

### 1. 管理员权限管理API

#### 获取用户权限列表
```http
GET /api/admin/file-permissions?userId={userId}
```

**请求参数：**
- `userId` (string, required): 用户ID

**响应示例：**
```json
{
  "success": true,
  "permissions": [
    {
      "id": "permission-id",
      "userId": "user-id",
      "permissionType": "file_upload",
      "isEnabled": true,
      "isActive": true,
      "fileTypes": ["jpg", "png", "pdf"],
      "maxFileSize": 10485760,
      "allowedPaths": ["/home/user/docs"],
      "deniedPaths": ["/home/user/private"],
      "quotaLimit": 1073741824,
      "timeRestrictions": {
        "allowed_hours": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        "allowed_days": [1, 2, 3, 4, 5]
      },
      "expiresAt": "2024-12-31T23:59:59Z"
    }
  ]
}
```

**错误响应：**
```json
{
  "error": "需要管理员权限"
}
```

#### 创建或更新用户权限
```http
POST /api/admin/file-permissions
Content-Type: application/json
```

**请求体：**
```json
{
  "userId": "user-id",
  "permissionType": "file_upload",
  "updates": {
    "isEnabled": true,
    "maxFileSize": 10485760,
    "fileTypes": ["jpg", "png", "pdf"],
    "allowedPaths": ["/home/user/docs"],
    "deniedPaths": ["/home/user/private"],
    "quotaLimit": 1073741824,
    "timeRestrictions": {
      "allowed_hours": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
      "allowed_days": [1, 2, 3, 4, 5]
    },
    "expiresAt": "2024-12-31T23:59:59Z"
  }
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "权限更新成功"
}
```

#### 删除用户权限
```http
DELETE /api/admin/file-permissions?userId={userId}&permissionType={permissionType}
```

**请求参数：**
- `userId` (string, required): 用户ID
- `permissionType` (string, required): 权限类型

**响应示例：**
```json
{
  "success": true,
  "message": "权限删除成功"
}
```

### 2. 文件操作API（已集成权限检查）

#### 文件上传
```http
POST /api/files
Content-Type: multipart/form-data
```

**请求参数：**
- `file` (File, required): 要上传的文件
- `username` (string, required): 用户名
- `path` (string, optional): 上传路径

**成功响应：**
```json
{
  "message": "文件上传成功",
  "file": {
    "name": "example.jpg",
    "size": 1024,
    "path": "/home/user/example.jpg",
    "isDirectory": false,
    "modified": "2024-01-01T12:00:00Z",
    "permissions": "644",
    "owner": 1000,
    "group": 1000
  }
}
```

**权限不足响应：**
```json
{
  "error": "上传权限不足: 文件大小超过限制 (10MB)",
  "quotaUsed": 5368709120,
  "quotaRemaining": 5368709120
}
```

#### 文件删除
```http
DELETE /api/files?username={username}&path={filePath}
```

**请求参数：**
- `username` (string, required): 用户名
- `path` (string, required): 文件路径

**成功响应：**
```json
{
  "message": "删除成功"
}
```

**权限不足响应：**
```json
{
  "error": "删除权限不足: 路径被禁止访问"
}
```

#### 文件列表
```http
GET /api/files?username={username}&path={path}&showHidden={showHidden}&filter={filter}
```

**请求参数：**
- `username` (string, required): 用户名
- `path` (string, optional): 目录路径
- `showHidden` (boolean, optional): 是否显示隐藏文件
- `filter` (string, optional): 文件过滤条件

**成功响应：**
```json
{
  "currentPath": "/home/user",
  "homePath": "/home/user",
  "files": [
    {
      "name": "example.txt",
      "path": "/home/user/example.txt",
      "size": 1024,
      "isDirectory": false,
      "modified": "2024-01-01T12:00:00Z",
      "permissions": "644",
      "owner": 1000,
      "group": 1000
    }
  ]
}
```

#### 文件预览
```http
GET /api/files?username={username}&file={filePath}
```

**请求参数：**
- `username` (string, required): 用户名
- `file` (string, required): 文件路径

**成功响应：**
```json
{
  "content": "文件内容..."
}
```

**错误响应：**
```json
{
  "error": "暂不支持预览该类型文件"
}
```

## 🔧 使用示例

### 1. 使用cURL测试API

#### 获取用户权限
```bash
curl -H "Authorization: Bearer your-admin-token" \
     "http://localhost:3000/api/admin/file-permissions?userId=testuser3"
```

#### 创建文件上传权限
```bash
curl -X POST \
     -H "Authorization: Bearer your-admin-token" \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "testuser3",
       "permissionType": "file_upload",
       "updates": {
         "isEnabled": true,
         "maxFileSize": 10485760,
         "fileTypes": ["jpg", "png", "pdf"],
         "quotaLimit": 1073741824
       }
     }' \
     "http://localhost:3000/api/admin/file-permissions"
```

#### 测试文件上传
```bash
curl -X POST \
     -H "Authorization: Bearer your-user-token" \
     -F "file=@example.jpg" \
     -F "username=testuser3" \
     -F "path=" \
     "http://localhost:3000/api/files"
```

### 2. 使用JavaScript测试API

#### 获取用户权限
```javascript
const response = await fetch('/api/admin/file-permissions?userId=testuser3', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});

const data = await response.json();
console.log('用户权限:', data.permissions);
```

#### 更新用户权限
```javascript
const response = await fetch('/api/admin/file-permissions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    userId: 'testuser3',
    permissionType: 'file_upload',
    updates: {
      isEnabled: true,
      maxFileSize: 10485760,
      fileTypes: ['jpg', 'png', 'pdf'],
      quotaLimit: 1073741824
    }
  })
});

const data = await response.json();
console.log('更新结果:', data);
```

#### 文件上传
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('username', 'testuser3');
formData.append('path', '');

const response = await fetch('/api/files', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`
  },
  body: formData
});

const data = await response.json();
if (response.ok) {
  console.log('上传成功:', data.message);
} else {
  console.log('上传失败:', data.error);
}
```

### 3. 使用Python测试API

#### 获取用户权限
```python
import requests

headers = {
    'Authorization': 'Bearer your-admin-token'
}

response = requests.get(
    'http://localhost:3000/api/admin/file-permissions',
    params={'userId': 'testuser3'},
    headers=headers
)

data = response.json()
print('用户权限:', data['permissions'])
```

#### 更新用户权限
```python
import requests

headers = {
    'Authorization': 'Bearer your-admin-token',
    'Content-Type': 'application/json'
}

data = {
    'userId': 'testuser3',
    'permissionType': 'file_upload',
    'updates': {
        'isEnabled': True,
        'maxFileSize': 10485760,
        'fileTypes': ['jpg', 'png', 'pdf'],
        'quotaLimit': 1073741824
    }
}

response = requests.post(
    'http://localhost:3000/api/admin/file-permissions',
    json=data,
    headers=headers
)

result = response.json()
print('更新结果:', result)
```

## 📊 权限类型说明

### 1. 文件上传权限 (`file_upload`)
- **功能**：控制用户是否可以上传文件
- **限制项**：文件大小、类型、配额、路径、时间
- **使用场景**：限制用户上传文件的大小和类型

### 2. 文件下载权限 (`file_download`)
- **功能**：控制用户是否可以下载文件
- **限制项**：文件类型、路径、时间
- **使用场景**：限制用户下载特定类型的文件

### 3. 文件预览权限 (`file_preview`)
- **功能**：控制用户是否可以预览文件内容
- **限制项**：文件类型、路径、时间
- **使用场景**：限制用户预览敏感文件

### 4. 文件删除权限 (`file_delete`)
- **功能**：控制用户是否可以删除文件
- **限制项**：路径、时间
- **使用场景**：保护重要文件不被删除

### 5. 文件分享权限 (`file_share`)
- **功能**：控制用户是否可以分享文件
- **限制项**：文件类型、路径、时间
- **使用场景**：限制用户分享敏感文件

### 6. 文件导出权限 (`file_export`)
- **功能**：控制用户是否可以导出文件
- **限制项**：文件类型、路径、时间
- **使用场景**：限制用户导出特定格式的文件

## 🔒 权限限制选项

### 1. 文件大小限制
```json
{
  "maxFileSize": 10485760  // 10MB
}
```

### 2. 文件类型限制
```json
{
  "fileTypes": ["jpg", "png", "pdf", "txt"]
}
```

### 3. 路径限制
```json
{
  "allowedPaths": ["/home/user/docs", "/home/user/public"],
  "deniedPaths": ["/home/user/private", "/home/user/system"]
}
```

### 4. 配额限制
```json
{
  "quotaLimit": 1073741824  // 1GB
}
```

### 5. 时间限制
```json
{
  "timeRestrictions": {
    "allowed_hours": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
    "allowed_days": [1, 2, 3, 4, 5]  // 周一到周五
  }
}
```

## 📝 错误代码说明

### 1. 认证错误
- `401 Unauthorized`: 未提供有效的JWT token
- `403 Forbidden`: 权限不足（需要管理员权限）

### 2. 权限错误
- `403 Forbidden`: 文件操作权限不足
- 错误信息包含具体的权限限制原因

### 3. 请求错误
- `400 Bad Request`: 请求参数错误
- `404 Not Found`: 文件或用户不存在
- `500 Internal Server Error`: 服务器内部错误

## 🔧 最佳实践

### 1. 权限配置
- 遵循最小权限原则
- 定期审查和更新权限配置
- 为不同用户组设置不同的权限策略

### 2. 错误处理
- 始终检查API响应状态
- 处理权限不足的错误情况
- 提供用户友好的错误提示

### 3. 性能优化
- 使用缓存减少重复请求
- 批量操作减少API调用次数
- 异步处理长时间运行的操作

### 4. 安全考虑
- 使用HTTPS传输敏感数据
- 定期轮换JWT token
- 监控异常API访问

## 📈 监控和日志

### 1. 操作日志
所有文件操作都会记录在 `file_operation_logs` 表中，包括：
- 操作类型和结果
- 文件路径和大小
- 用户信息和IP地址
- 权限检查结果和原因

### 2. 配额监控
可以通过以下查询监控用户配额使用情况：
```sql
SELECT 
  u.username,
  fp.quota_limit,
  COALESCE(SUM(fol.file_size), 0) as used_quota,
  (fp.quota_limit - COALESCE(SUM(fol.file_size), 0)) as remaining_quota
FROM users u
LEFT JOIN file_permissions fp ON u.id = fp.user_id AND fp.permission_type = 'file_upload'
LEFT JOIN file_operation_logs fol ON u.id = fol.user_id AND fol.operation_type = 'file_upload' AND fol.result = 'granted'
WHERE fp.quota_limit IS NOT NULL
GROUP BY u.username, fp.quota_limit;
```

### 3. 权限拒绝分析
可以通过以下查询分析权限拒绝的原因：
```sql
SELECT 
  username,
  operation_type,
  file_path,
  reason,
  created_at
FROM file_operation_logs
WHERE result = 'denied'
ORDER BY created_at DESC
LIMIT 100;
```

这个API指南提供了完整的文件权限管理接口使用说明，包括认证、权限类型、限制选项、错误处理等各个方面，帮助开发者快速集成和使用文件权限系统。 
