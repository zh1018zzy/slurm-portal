# HPC通知系统模块说明文档

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

HPC通知系统是一个完整的用户通知管理解决方案，为高性能计算平台用户提供全面的信息通知服务。系统支持多种通知类型，包括作业状态、系统维护、安全警告等，帮助用户及时了解重要信息。

## 目录

- [功能特性](#功能特性)
- [系统架构](#系统架构)
- [数据模型](#数据模型)
- [API接口](#api接口)
- [前端组件](#前端组件)
- [通知类型](#通知类型)
- [安装配置](#安装配置)
- [使用指南](#使用指南)
- [开发指南](#开发指南)
- [故障排除](#故障排除)

## 功能特性

### 核心功能
- ✅ **多类型通知支持**: 23种预定义通知类型，涵盖作业、系统、安全等各个方面
- ✅ **优先级管理**: 4个优先级别（低、中、高、紧急）
- ✅ **状态管理**: 未读、已读、已归档状态
- ✅ **批量操作**: 支持批量标记、归档、删除
- ✅ **搜索过滤**: 按类型、状态、优先级、内容搜索
- ✅ **分页浏览**: 高效的分页加载
- ✅ **个性化设置**: 用户可自定义通知偏好

### 高级功能
- 🎯 **角色通知**: 支持针对特定角色的通知
- 🌐 **全局通知**: 系统级公告和通知
- ⏰ **过期管理**: 自动清理过期通知
- 🔐 **权限控制**: 基于RLS的数据安全
- 📊 **统计分析**: 通知数量和分布统计
- 🎨 **可操作通知**: 支持自定义操作按钮

## 系统架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端UI组件    │    │   API接口层     │    │   数据库层      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ NotificationPage│◄──►│ /api/           │◄──►│ notifications   │
│ 通知列表        │    │ notifications   │    │ 通知主表        │
│ 统计仪表板      │    │                 │    │                 │
│ 搜索过滤        │    │ /api/           │    │ notification_   │
│ 批量操作        │    │ notifications/  │    │ preferences     │
│ 分页控制        │    │ preferences     │    │ 用户偏好表      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
          │                       │                       │
          │              ┌─────────────────┐              │
          └──────────────►│  通知服务层     │◄─────────────┘
                         │ NotificationService           │
                         │ ‣ 通知创建                    │
                         │ ‣ 模板管理                    │
                         │ ‣ 批量发送                    │
                         │ ‣ 智能过滤                    │
                         └─────────────────┘
```

### 文件结构
```
notification-system/
├── lib/
│   ├── notification-types.ts      # 类型定义
│   └── notification-service.ts    # 通知服务
├── app/
│   ├── api/notifications/
│   │   ├── route.ts              # 主API接口
│   │   └── preferences/
│   │       └── route.ts          # 偏好设置API
│   └── dashboard/notifications/
│       └── page.tsx              # 通知页面UI
├── db/
│   └── create_notifications_system.sql  # 数据库结构
└── docs/
    └── notification-system.md    # 本文档
```

## 数据模型

### 1. 通知表 (notifications)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | UUID | 主键 |
| type | VARCHAR(50) | 通知类型 |
| title | VARCHAR(255) | 通知标题 |
| message | TEXT | 通知内容 |
| priority | VARCHAR(20) | 优先级：low/medium/high/urgent |
| status | VARCHAR(20) | 状态：unread/read/archived |
| user_id | VARCHAR(100) | 目标用户ID |
| user_roles | TEXT[] | 目标用户角色数组 |
| is_global | BOOLEAN | 是否为全局通知 |
| metadata | JSONB | 通知元数据 |
| actions | JSONB | 可操作按钮配置 |
| source | VARCHAR(50) | 通知来源 |
| category | VARCHAR(50) | 通知分类 |
| dismissible | BOOLEAN | 是否可关闭 |
| created_at | TIMESTAMPTZ | 创建时间 |
| updated_at | TIMESTAMPTZ | 更新时间 |
| expires_at | TIMESTAMPTZ | 过期时间 |

### 2. 通知偏好表 (notification_preferences)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | UUID | 主键 |
| user_id | VARCHAR(100) | 用户ID |
| email_notifications | BOOLEAN | 邮件通知开关 |
| web_notifications | BOOLEAN | 网页通知开关 |
| mobile_notifications | BOOLEAN | 移动端通知开关 |
| job_notifications | JSONB | 作业通知偏好 |
| system_notifications | JSONB | 系统通知偏好 |
| security_notifications | JSONB | 安全通知偏好 |
| minimum_priority | VARCHAR(20) | 最低显示优先级 |
| quiet_hours | JSONB | 免打扰时间设置 |
| batch_notifications | JSONB | 批量通知设置 |

### 3. 通知模板表 (notification_templates)

| 字段名 | 类型 | 描述 |
|--------|------|------|
| id | UUID | 主键 |
| type | VARCHAR(50) | 通知类型 |
| priority | VARCHAR(20) | 默认优先级 |
| title_template | TEXT | 标题模板 |
| message_template | TEXT | 消息模板 |
| actions | JSONB | 默认操作按钮 |
| dismissible | BOOLEAN | 是否可关闭 |
| expiration_hours | INTEGER | 默认过期时间（小时） |

## API接口

### 1. 通知管理 API

#### GET /api/notifications
获取通知列表

**查询参数:**
- `status`: 状态过滤 (unread/read/archived)
- `type`: 类型过滤
- `priority`: 优先级过滤
- `search`: 搜索关键词
- `limit`: 分页大小
- `offset`: 分页偏移
- `stats`: 设置为true获取统计信息

**响应示例:**
```json
{
  "success": true,
  "notifications": [...],
  "total": 100,
  "hasMore": true
}
```

#### POST /api/notifications
创建通知（管理员权限）

**请求体:**
```json
{
  "type": "job_status_change",
  "title": "作业状态变化",
  "message": "您的作业已完成",
  "priority": "medium",
  "userId": "user123",
  "metadata": {
    "jobId": "12345",
    "jobName": "test-job"
  }
}
```

#### PUT /api/notifications
批量更新通知状态

**请求体:**
```json
{
  "action": "mark_read",
  "notificationIds": ["id1", "id2"],
  "userId": "user123"
}
```

#### DELETE /api/notifications
删除通知

**查询参数:**
- `ids`: 通知ID列表（逗号分隔）

### 2. 偏好设置 API

#### GET /api/notifications/preferences
获取用户通知偏好

#### PUT /api/notifications/preferences
更新用户通知偏好

**请求体:**
```json
{
  "userId": "user123",
  "emailNotifications": true,
  "webNotifications": true,
  "jobNotifications": {
    "statusChanges": true,
    "queueUpdates": true,
    "errors": true,
    "timeWarnings": true
  },
  "minimumPriority": "low"
}
```

## 前端组件

### 1. 通知页面 (NotificationsPage)

主要通知管理界面，包含以下功能：

- **统计仪表板**: 显示总通知数、未读数、高优先级数等
- **搜索过滤**: 按状态、类型、优先级、关键词过滤
- **通知列表**: 分页显示通知，支持选择和操作
- **批量操作**: 标记已读、归档、删除等批量操作
- **分页控制**: 上一页、下一页导航

### 2. 通知项组件 (NotificationItem)

单个通知的显示组件，包含：

- **图标**: 根据通知类型显示相应图标
- **标题和内容**: 通知的主要信息
- **优先级徽章**: 颜色区分优先级
- **状态徽章**: 显示已读/未读状态
- **操作按钮**: 自定义的可点击操作
- **元数据**: 作业ID、时间等附加信息

### 3. 过滤器组件 (NotificationFilters)

通知过滤控制组件：

- **搜索框**: 关键词搜索
- **状态选择器**: 全部/未读/已读/已归档
- **优先级选择器**: 按优先级过滤
- **类型选择器**: 按通知类型过滤

## 通知类型

### 作业相关通知 (5种)
- `job_status_change`: 作业状态变化
- `job_queue_update`: 队列状态更新
- `job_resource_allocated`: 资源分配
- `job_execution_error`: 执行错误
- `job_time_limit`: 时间限制警告

### 系统资源通知 (4种)
- `system_resource_alert`: 系统资源警告
- `storage_quota_warning`: 存储配额警告
- `node_status_change`: 节点状态变化
- `partition_unavailable`: 分区不可用

### 系统维护通知 (4种)
- `scheduled_maintenance`: 计划维护
- `emergency_maintenance`: 紧急维护
- `system_update`: 系统更新
- `service_interruption`: 服务中断

### 安全和政策通知 (4种)
- `security_alert`: 安全警告
- `policy_update`: 政策更新
- `account_warning`: 账户警告
- `permission_change`: 权限变更

### 个人和项目通知 (6种)
- `project_update`: 项目更新
- `file_operation`: 文件操作
- `usage_report`: 使用报告
- `billing_notification`: 账单通知
- `system_announcement`: 系统公告

## 安装配置

### 1. 数据库设置

执行SQL文件创建数据库表：
```sql
-- 在Supabase项目中执行
\i db/create_notifications_system.sql
```

### 2. 环境变量

确保以下环境变量配置正确：
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret
```

### 3. 权限配置

确保Supabase Row Level Security (RLS) 正确配置：
- 用户只能访问自己的通知
- 管理员可以创建全局通知
- 全局通知对所有用户可见

## 使用指南

### 1. 创建通知

```typescript
import { NotificationService } from '@/lib/notification-service'

// 作业状态变化通知
await NotificationService.notifyJobStatusChange(
  'user123',
  'job456',
  'test-job',
  'RUNNING',
  'COMPLETED'
)

// 系统维护通知
await NotificationService.notifyScheduledMaintenance(
  '2024-12-01 02:00:00',
  '4小时',
  ['计算服务', '存储服务']
)

// 自定义通知
await NotificationService.createNotification(
  'system_announcement',
  {
    announcementContent: '系统将在本周末进行重大更新'
  },
  {
    isGlobal: true,
    priority: 'high'
  }
)
```

### 2. 批量创建通知

```typescript
const notifications = [
  {
    type: 'job_status_change',
    data: { jobId: '123', jobName: 'job1', jobStatus: 'COMPLETED' },
    options: { userId: 'user1' }
  },
  {
    type: 'job_status_change',
    data: { jobId: '124', jobName: 'job2', jobStatus: 'FAILED' },
    options: { userId: 'user2', priority: 'high' }
  }
]

const successCount = await NotificationService.createBulkNotifications(notifications)
```

### 3. 前端组件使用

```typescript
// 在React组件中使用
import NotificationsPage from '@/app/dashboard/notifications/page'

function DashboardLayout() {
  return (
    <div>
      {/* 其他组件 */}
      <NotificationsPage />
    </div>
  )
}
```

## 开发指南

### 1. 添加新的通知类型

1. 在 `lib/notification-types.ts` 中添加新类型：
```typescript
export type NotificationType = 
  | 'existing_types'
  | 'new_notification_type'  // 新增类型
```

2. 在 `lib/notification-service.ts` 中添加模板：
```typescript
const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
  // 现有模板...
  new_notification_type: {
    type: 'new_notification_type',
    priority: 'medium',
    titleTemplate: '新通知类型',
    messageTemplate: '这是一个新的通知类型：{{customField}}',
    dismissible: true,
    expirationHours: 24
  }
}
```

3. 在前端添加图标和显示名称：
```typescript
// 在 NotificationsPage 中添加
const typeIcons: Record<string, any> = {
  // 现有图标...
  new_notification_type: NewIcon
}

const typeNames: Record<NotificationType, string> = {
  // 现有名称...
  new_notification_type: '新通知类型'
}
```

### 2. 自定义通知模板

```typescript
// 创建带自定义模板的通知
await NotificationService.createNotification(
  'system_announcement',
  {
    customField: 'value'
  },
  {
    customTitle: '自定义标题',
    customMessage: '自定义消息内容：{{customField}}',
    priority: 'high'
  }
)
```

### 3. 扩展元数据

```typescript
// 在创建通知时添加自定义元数据
const notification = {
  type: 'custom_type',
  title: '标题',
  message: '消息',
  metadata: {
    // 标准元数据
    jobId: 'job123',
    jobName: 'test-job',
    // 自定义元数据
    customField1: 'value1',
    customField2: 42,
    customObject: {
      nested: 'data'
    }
  }
}
```

### 4. 添加新的操作按钮

```typescript
const notification = {
  // 其他字段...
  actions: [
    {
      label: '查看详情',
      url: '/dashboard/jobs/{{jobId}}',
      style: 'primary'
    },
    {
      label: '下载日志',
      url: '/api/jobs/{{jobId}}/logs/download',
      style: 'secondary'
    },
    {
      label: '取消作业',
      action: 'cancel_job',
      style: 'destructive'
    }
  ]
}
```

## 故障排除

### 1. 通知不显示

**可能原因:**
- 数据库连接问题
- RLS权限配置错误
- 用户认证失败

**解决方法:**
```sql
-- 检查RLS策略
SELECT * FROM pg_policies WHERE tablename = 'notifications';

-- 检查用户权限
SELECT current_setting('app.current_user_id', true);
```

### 2. 通知创建失败

**可能原因:**
- 用户权限不足
- 数据验证失败
- API认证问题

**解决方法:**
```typescript
// 检查用户角色
const userInfo = verifyJwt(token)
console.log('User role:', userInfo.role)

// 验证通知数据
const notification = validateNotificationData(data)
```

### 3. 性能问题

**优化建议:**
- 使用数据库索引
- 启用分页查询
- 定期清理过期通知
- 缓存常用查询

```sql
-- 清理过期通知
SELECT cleanup_expired_notifications();

-- 分析查询性能
EXPLAIN ANALYZE SELECT * FROM notifications WHERE user_id = 'user123';
```

### 4. 前端加载慢

**优化方法:**
- 启用虚拟滚动
- 减少初始加载数量
- 使用防抖搜索
- 缓存API响应

```typescript
// 使用防抖搜索
const debouncedSearch = useMemo(
  () => debounce((term: string) => {
    setSearchTerm(term)
  }, 300),
  []
)
```

## 版本历史

### v1.0.0 (2024-12)
- ✅ 完整的通知系统实现
- ✅ 23种预定义通知类型
- ✅ 用户偏好设置
- ✅ 批量操作功能
- ✅ RLS安全策略
- ✅ 完整的API接口
- ✅ 现代化UI界面

## 许可证

本项目遵循MIT许可证。

## 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建Pull Request

## 支持

如有问题或建议，请：

1. 查看本文档的故障排除部分
2. 提交Issue到项目仓库
3. 联系开发团队

---

*该文档最后更新于 2024年12月*
