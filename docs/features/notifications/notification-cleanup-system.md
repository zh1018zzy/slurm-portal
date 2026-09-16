# 通知系统自动清理机制

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 概述

为防止通知数据无限增长影响系统性能，本系统实现了完整的通知自动清理机制，支持按时间、状态、优先级等多维度清理过期和冗余通知。

## 🏗️ 系统架构

### 核心组件

1. **NotificationCleanupService** - 清理服务核心类
2. **自动定时任务** - 基于Node.js定时器的自动清理
3. **管理员API** - 手动触发和配置管理接口
4. **Cron脚本** - 可选的系统级定时任务
5. **数据库优化** - 索引和清理函数

### 清理策略

- **过期通知**: 根据`expires_at`字段自动清理
- **状态清理**: 按通知状态和时间清理
- **优先级清理**: 不同优先级采用不同保留策略
- **批量清理**: 分批次清理避免数据库压力

## ⚙️ 配置说明

### 环境变量配置

```bash
# 自动清理间隔（小时）
NOTIFICATION_CLEANUP_INTERVAL=24

# 通知保留天数配置
UNREAD_RETENTION_DAYS=30        # 未读通知保留30天
READ_RETENTION_DAYS=7           # 已读通知保留7天  
ARCHIVED_RETENTION_DAYS=90      # 已归档通知保留90天
URGENT_RETENTION_DAYS=180       # 紧急通知保留180天
HIGH_RETENTION_DAYS=60          # 高优先级通知保留60天
MEDIUM_RETENTION_DAYS=30        # 中等优先级通知保留30天
LOW_RETENTION_DAYS=14           # 低优先级通知保留14天

# 清理性能配置
CLEANUP_BATCH_SIZE=1000         # 每次清理的批次大小
MAX_CLEANUP_DURATION=30         # 最大清理耗时（分钟）
```

### 代码配置

```typescript
import { notificationCleanupService } from '@/lib/notification-cleanup-service'

// 更新清理配置
notificationCleanupService.updateConfig({
  autoCleanupEnabled: true,
  cleanupIntervalHours: 12,
  retentionPeriods: {
    unreadNotifications: 30,
    readNotifications: 7,
    archivedNotifications: 90
  }
})
```

## 🚀 使用方法

### 1. 自动清理（推荐）

系统启动时自动开启，无需手动干预：

```typescript
// 清理服务会自动启动
import { notificationCleanupService } from '@/lib/notification-cleanup-service'

// 检查状态
const status = notificationCleanupService.getStatus()
console.log('自动清理状态:', status.autoCleanupEnabled)
console.log('下次清理时间:', status.nextCleanupTime)
```

### 2. 手动清理

通过API或代码手动触发清理：

```bash
# 管理员API - 手动执行清理
POST /api/system/notifications/cleanup
{
  "action": "cleanup"
}

# 管理员API - 清理指定用户通知
POST /api/system/notifications/cleanup
{
  "action": "cleanup-user",
  "userId": "username",
  "options": {
    "olderThanDays": 7,
    "status": ["read", "archived"]
  }
}
```

```typescript
// 代码调用
const stats = await notificationCleanupService.performCleanup()
console.log('清理统计:', stats)
```

### 3. 定时任务清理

设置系统级cron任务：

```bash
# 添加到crontab - 每天凌晨2点执行清理
0 2 * * * /usr/bin/node /path/to/scripts/cleanup-notifications.js

# 或者使用包管理器
0 2 * * * cd /path/to/project && npm run cleanup:notifications
```

## 📊 监控和管理

### 清理统计查看

```bash
# 获取清理状态和统计
GET /api/system/notifications/cleanup

# 只获取统计信息
GET /api/system/notifications/cleanup?action=statistics

# 只获取配置信息
GET /api/system/notifications/cleanup?action=config
```

### 数据库分析

```sql
-- 查看清理候选通知
SELECT * FROM cleanup_candidate_notifications;

-- 系统健康检查
SELECT * FROM analyze_notification_system();

-- 执行批量清理
SELECT * FROM cleanup_notifications_batch(1000, 30);
```

### 性能监控

系统提供多个监控视图：

```sql
-- 用户最近通知 (性能优化视图)
SELECT * FROM user_recent_notifications 
WHERE user_id = 'username' 
LIMIT 20;

-- 系统通知摘要
SELECT * FROM system_notifications_summary 
WHERE notification_date >= CURRENT_DATE - INTERVAL '7 days';
```

## 🔧 配置管理

### 动态配置更新

管理员可以通过API实时更新清理配置：

```bash
# 更新清理配置
POST /api/system/notifications/cleanup
{
  "action": "update-config",
  "config": {
    "cleanupIntervalHours": 12,
    "autoCleanupEnabled": true,
    "retentionPeriods": {
      "readNotifications": 3,
      "unreadNotifications": 14
    }
  }
}

# 启动/停止自动清理
POST /api/system/notifications/cleanup
{
  "action": "start-auto-cleanup"  // 或 "stop-auto-cleanup"
}
```

### 批量用户清理

```bash
# 批量清理多个用户的通知
PUT /api/system/notifications/cleanup
{
  "action": "batch-cleanup-users",
  "targets": [
    {
      "userId": "user1",
      "options": { "olderThanDays": 7 }
    },
    {
      "userId": "user2", 
      "options": { "status": ["archived"] }
    }
  ]
}
```

## 📈 性能优化

### 数据库优化

系统自动创建了多个优化索引：

```sql
-- 用户通知查询优化
CREATE INDEX idx_notifications_user_created_status 
    ON notifications(user_id, created_at DESC, status);

-- 清理查询优化  
CREATE INDEX idx_notifications_cleanup_status 
    ON notifications(status, created_at);

-- 全局通知优化
CREATE INDEX idx_notifications_global_active 
    ON notifications(is_global, priority, created_at DESC);
```

### 清理性能调优

- **批次大小**: 调整`CLEANUP_BATCH_SIZE`平衡性能与资源占用
- **清理间隔**: 根据通知产生速度调整`NOTIFICATION_CLEANUP_INTERVAL`
- **保留策略**: 根据业务需求调整各类型通知保留天数

## 🚨 故障排查

### 常见问题

1. **清理任务不执行**
   ```bash
   # 检查服务状态
   GET /api/system/notifications/cleanup
   
   # 查看日志
   grep "NotificationCleanup" logs/app-*.log
   ```

2. **清理效果不明显**
   ```sql
   -- 检查通知分布
   SELECT status, priority, COUNT(*) 
   FROM notifications 
   GROUP BY status, priority;
   
   -- 检查保留期限配置
   SELECT * FROM analyze_notification_system();
   ```

3. **性能问题**
   ```sql
   -- 检查索引使用情况
   EXPLAIN ANALYZE SELECT * FROM notifications 
   WHERE user_id = 'test' AND status = 'unread' 
   ORDER BY created_at DESC LIMIT 20;
   ```

### 应急处理

如果通知数据量过大影响系统性能：

```bash
# 1. 立即执行手动清理
POST /api/system/notifications/cleanup
{ "action": "cleanup" }

# 2. 临时调整保留策略
POST /api/system/notifications/cleanup
{
  "action": "update-config",
  "config": {
    "retentionPeriods": {
      "readNotifications": 1,      # 临时设为1天
      "unreadNotifications": 7     # 临时设为7天
    }
  }
}

# 3. 数据库直接清理 (谨慎使用)
DELETE FROM notifications 
WHERE status = 'read' 
  AND created_at < NOW() - INTERVAL '1 day'
  AND user_id IS NOT NULL;
```

## 📝 最佳实践

### 开发环境
- 保留天数设置较短（3-7天），便于测试
- 开启详细日志 (`LOG_LEVEL=DEBUG`)
- 清理间隔设置较短（1-2小时）

### 生产环境
- 根据业务需求合理设置保留天数
- 在业务低峰期执行清理（凌晨2-4点）
- 监控清理效果和系统性能

### 安全考虑
- 仅管理员可以执行清理操作
- 重要通知（紧急、高优先级）保留时间较长
- 定期备份重要通知数据

## 🔍 监控指标

建议监控以下指标：

- 总通知数量趋势
- 各状态通知数量分布
- 清理任务执行频率和耗时
- 用户平均通知数量
- 数据库查询性能

通过合理配置和监控，通知清理系统可以有效控制数据增长，保持系统性能稳定。
