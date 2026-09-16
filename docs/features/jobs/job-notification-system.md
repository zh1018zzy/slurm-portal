# 作业状态变化自动通知系统

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

作业状态变化自动通知系统是HPC平台的核心功能，能够在作业状态发生变化时自动向用户发送通知。

## 功能特性

### 核心功能
- **实时状态监控** - 自动监控作业状态变化
- **智能通知分类** - 根据作业状态类型发送不同优先级的通知
- **批量处理** - 支持批量发送多个作业状态变化通知
- **定时同步** - 定期同步作业状态并发送通知
- **便捷管理** - 支持单个和批量删除通知，带确认提示

### 通知类型

| 作业状态 | 通知类型 | 优先级 | 说明 |
|---------|---------|--------|------|
| PENDING | job_queue_update | 低 | 作业已提交，等待资源分配 |
| RUNNING | job_status_change | 中 | 作业开始运行 |
| COMPLETED | job_status_change | 中 | 作业成功完成 |
| FAILED | job_execution_error | 高 | 作业执行失败 |
| CANCELLED | job_status_change | 中 | 作业被取消 |
| TIMEOUT | job_time_limit | 高 | 作业超时终止 |

## 系统架构

### 核心组件

1. **作业通知服务** (`lib/job-notification-service.ts`)
2. **通知服务** (`lib/notification-service.ts`)
3. **作业同步服务** (`lib/job-sync.ts`)
4. **定时任务** (`scripts/job-sync-cron.js`)

### 集成点

- 作业同步API (`app/api/jobs/sync/route.ts`)
- 作业提交API (`app/api/applications/[id]/submit/route.ts`)

## 使用方法

### 1. 启动定时任务
```bash
# 启动定时任务
./scripts/start-job-sync.sh
```

### 2. 手动同步作业状态
```bash
# 同步所有作业
curl -X POST "http://localhost:3000/api/jobs/sync"
```

### 3. 查看通知
访问 `/dashboard/notifications` 页面查看通知

### 4. 删除通知
- **单个删除**: 点击通知卡片右上角的删除图标
- **批量删除**: 选择多个通知后点击"删除"按钮
- **清空所有**: 点击"清空所有"按钮删除所有通知
- **确认提示**: 所有删除操作都有确认对话框防止误操作

## 配置说明

### 环境变量
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
API_BASE_URL=http://localhost:3000
```

### 定时任务配置
```javascript
const SYNC_INTERVAL = 5 * 60 * 1000 // 5分钟同步一次
```

## 故障排除

### 常见问题

1. **通知没有发送**
   - 检查数据库连接
   - 检查通知模板配置
   - 查看日志文件

2. **定时任务不工作**
   - 检查Node.js进程
   - 检查环境变量
   - 检查API服务状态

3. **作业状态同步失败**
   - 检查Slurm服务
   - 检查网络连接
   - 检查用户权限

### 调试命令
```bash
# 检查Slurm服务
sinfo --version

# 检查数据库连接
curl -X GET "http://localhost:3000/api/jobs/sync"

# 检查通知API
curl -X GET "http://localhost:3000/api/notifications?stats=true"
```

## 最佳实践

1. **性能优化**
   - 使用批量处理
   - 实现通知去重
   - 合理设置同步间隔

2. **用户体验**
   - 提供通知偏好设置
   - 支持通知分类过滤
   - 实现通知历史记录

3. **系统稳定性**
   - 实现错误重试机制
   - 添加健康检查
   - 监控系统资源 
