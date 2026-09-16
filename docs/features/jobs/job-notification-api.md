# 作业通知系统 API 文档

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

作业通知系统提供了完整的API接口，用于管理作业状态变化通知、用户通知偏好设置和通知统计信息。

## API 端点

### 1. 通知管理 API

#### 获取通知列表
```http
GET /api/notifications
```

**查询参数：**
- `status` - 通知状态 (unread, read, archived)
- `type` - 通知类型 (job_status_change, job_execution_error, etc.)
- `priority` - 优先级 (low, medium, high, urgent)
- `limit` - 每页数量 (默认: 20)
- `offset` - 偏移量 (默认: 0)
- `sortBy` - 排序字段 (created_at, priority)
- `sortOrder` - 排序方向 (asc, desc)

**响应示例：**
```json
{
  "success": true,
  "notifications": [
    {
      "id": "13a47ee0-d534-4c8f-91fb-81e0ecf7a75b",
      "type": "job_status_change",
      "title": "作业状态变化: test262",
      "message": "作业 test262 (ID: 112) 已开始运行。",
      "priority": "medium",
      "status": "unread",
      "createdAt": "2025-07-27T10:15:33.081+00:00",
      "userId": "demo_user",
      "isGlobal": false,
      "actions": [
        {
          "label": "查看详情",
          "url": "/dashboard/jobs/112",
          "style": "primary"
        }
      ]
    }
  ],
  "total": 1,
  "hasMore": false
}
```

#### 获取通知统计
```http
GET /api/notifications?stats=true
```

**响应示例：**
```json
{
  "success": true,
  "stats": {
    "total": 5,
    "unread": 3,
    "byPriority": {
      "low": 1,
      "medium": 2,
      "high": 1,
      "urgent": 1
    },
    "byType": {
      "job_status_change": 3,
      "job_execution_error": 1,
      "system_announcement": 1
    },
    "recentCount": 5
  }
}
```

#### 创建通知 (管理员)
```http
POST /api/notifications
```

**请求体：**
```json
{
  "type": "system_announcement",
  "title": "系统维护通知",
  "message": "系统将于今晚进行维护",
  "priority": "high",
  "isGlobal": true,
  "userId": "demo_user"
}
```

#### 批量更新通知
```http
PUT /api/notifications
```

**请求体：**
```json
{
  "ids": ["id1", "id2", "id3"],
  "updates": {
    "status": "read"
  }
}
```

#### 删除通知
```http
DELETE /api/notifications?id=notification_id
```

### 2. 通知偏好设置 API

#### 获取用户偏好设置
```http
GET /api/notifications/preferences
```

**响应示例：**
```json
{
  "success": true,
  "preferences": {
    "emailNotifications": true,
    "jobStatusChanges": true,
    "jobErrors": true,
    "systemAnnouncements": true,
    "quietHours": {
      "enabled": false,
      "start": "22:00",
      "end": "08:00"
    }
  }
}
```

#### 更新用户偏好设置
```http
PUT /api/notifications/preferences
```

**请求体：**
```json
{
  "emailNotifications": true,
  "jobStatusChanges": true,
  "jobErrors": true,
  "systemAnnouncements": false,
  "quietHours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  }
}
```

### 3. 作业同步 API

#### 同步作业状态
```http
POST /api/jobs/sync
```

**查询参数：**
- `user` - 指定用户 (可选)
- `force` - 强制同步 (true/false)

**响应示例：**
```json
{
  "success": true,
  "message": "成功同步 109 个作业记录（新增 0，更新 109）",
  "stats": {
    "total": 109,
    "pending": 0,
    "running": 0,
    "completed": 61,
    "failed": 35,
    "cancelled": 13,
    "unknown": 0
  },
  "totalJobs": 109,
  "syncedJobs": 109,
  "newJobs": 0,
  "changedJobs": 109
}
```

#### 获取同步状态
```http
GET /api/jobs/sync
```

**响应示例：**
```json
{
  "success": true,
  "stats": {
    "total": 109,
    "pending": 0,
    "running": 0,
    "completed": 61,
    "failed": 35,
    "cancelled": 13,
    "unknown": 0
  },
  "lastSync": "2025-07-27T10:30:00.000Z",
  "user": "all"
}
```

## 通知类型

### 作业相关通知

| 类型 | 描述 | 优先级 | 示例 |
|------|------|--------|------|
| `job_status_change` | 作业状态变化 | medium | 作业开始运行、完成 |
| `job_execution_error` | 作业执行错误 | high | 作业执行失败 |
| `job_queue_update` | 队列状态更新 | low | 作业排队位置变化 |
| `job_resource_allocated` | 资源分配通知 | low | 作业获得资源分配 |
| `job_time_limit` | 时间限制警告 | high | 作业接近时间限制 |

### 系统通知

| 类型 | 描述 | 优先级 | 示例 |
|------|------|--------|------|
| `system_announcement` | 系统公告 | medium | 系统维护通知 |
| `scheduled_maintenance` | 计划维护 | high | 系统维护计划 |
| `emergency_maintenance` | 紧急维护 | urgent | 紧急系统维护 |
| `security_alert` | 安全警告 | urgent | 异常登录活动 |

## 错误处理

### 错误响应格式
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

### 常见错误码

| HTTP状态码 | 错误描述 | 解决方案 |
|-----------|----------|----------|
| 400 | 请求参数错误 | 检查请求参数格式 |
| 401 | 未授权访问 | 检查认证token |
| 403 | 权限不足 | 检查用户权限 |
| 404 | 资源不存在 | 检查资源ID |
| 500 | 服务器内部错误 | 查看服务器日志 |

## 认证

所有API请求需要在请求头中包含有效的JWT token：

```http
Authorization: Bearer <your_jwt_token>
```

## 限流

- 通知创建：每分钟最多100条
- 通知查询：每分钟最多1000次
- 批量操作：每分钟最多10次

## 示例代码

### JavaScript/TypeScript

#### 获取通知列表
```javascript
const response = await fetch('/api/notifications?limit=20&status=unread', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
```

#### 创建通知
```javascript
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    type: 'system_announcement',
    title: '系统通知',
    message: '这是一条系统通知',
    priority: 'medium',
    isGlobal: true
  })
});
```

#### 批量标记已读
```javascript
const response = await fetch('/api/notifications', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    ids: ['id1', 'id2', 'id3'],
    updates: { status: 'read' }
  })
});
```

### cURL

#### 获取通知统计
```bash
curl -X GET "http://localhost:3000/api/notifications?stats=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 同步作业状态
```bash
curl -X POST "http://localhost:3000/api/jobs/sync" \
  -H "Content-Type: application/json"
```

## 最佳实践

1. **错误处理** - 始终检查API响应的success字段
2. **分页处理** - 使用limit和offset参数处理大量数据
3. **缓存策略** - 缓存不经常变化的数据
4. **批量操作** - 使用批量API减少请求次数
5. **权限检查** - 确保用户有相应权限

## 更新日志

### v1.0.0 (2025-07-27)
- 初始API版本
- 支持基本的通知CRUD操作
- 支持作业状态同步
- 支持用户偏好设置 
