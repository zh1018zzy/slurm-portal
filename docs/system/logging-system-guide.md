# 日志系统使用指南

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

本项目实现了完整的分级日志系统，支持控制台输出和文件存储，具备日志轮转和自动清理功能。

## 日志等级

系统支持5个日志等级（从低到高）：

- **ERROR (0)** - 错误日志，系统错误和异常
- **WARN (1)** - 警告日志，潜在问题提醒
- **INFO (2)** - 信息日志，重要业务操作记录
- **DEBUG (3)** - 调试日志，详细执行信息
- **TRACE (4)** - 追踪日志，最详细的执行轨迹

## 环境配置

通过环境变量控制日志行为：

```bash
# 日志等级设置
LOG_LEVEL=INFO              # ERROR | WARN | INFO | DEBUG | TRACE

# 文件配置
LOG_DIR=logs                # 日志目录
LOG_MAX_FILE_SIZE=10        # 单文件最大大小(MB)
LOG_MAX_FILES=5             # 保留文件数量

# 输出控制
LOG_ENABLE_CONSOLE=true     # 控制台输出开关
LOG_ENABLE_FILE=true        # 文件输出开关
```

## 代码使用

### 基本用法

```typescript
import { logger } from '@/lib/logger'

// 错误日志
logger.error('ModuleName', '操作失败', error, { context: 'additional data' })

// 警告日志
logger.warn('ModuleName', '配置问题', { config: 'missing value' })

// 信息日志
logger.info('ModuleName', '用户登录', { username: 'john', ip: '127.0.0.1' })

// 调试日志
logger.debug('ModuleName', '处理请求', { requestId: '123', path: '/api/jobs' })

// 追踪日志
logger.trace('ModuleName', '函数调用', { function: 'getData', params: {...} })
```

### 模块命名规范

建议使用以下模块名称：

- `Auth-LDAP` - LDAP认证
- `Jobs-API` - 作业管理API
- `Files-API` - 文件管理API
- `System-Logs` - 系统日志管理
- `WebShell` - Web终端
- `Scheduler` - 任务调度器

## 日志文件管理

### 文件命名规则

- 当前日志：`app-YYYY-MM-DD.log`
- 轮转日志：`app-YYYY-MM-DD-YYYY-MM-DDTHH-mm-ss-sss.log`

### 自动轮转

- 当文件超过 `LOG_MAX_FILE_SIZE` 时自动轮转
- 保留最新的 `LOG_MAX_FILES` 个文件
- 旧文件自动删除

## 管理接口

管理员可以通过API管理日志：

### 获取日志信息
```
GET /api/system/logs
```

### 更新日志配置
```
POST /api/system/logs
{
  "level": "DEBUG",
  "maxFiles": 10,
  "enableConsole": true
}
```

### 删除日志文件
```
DELETE /api/system/logs?file=app-2024-01-01.log
```

## 测试

运行日志测试脚本：

```bash
node scripts/test-logger.js
```

## 生产环境建议

### 日志等级设置
- **开发环境**: `DEBUG` 或 `TRACE`
- **测试环境**: `INFO` 或 `DEBUG`  
- **生产环境**: `WARN` 或 `INFO`

### 性能考虑
- 避免在高频调用的函数中使用 `TRACE` 级别
- 大量数据不要直接记录，考虑摘要信息
- 生产环境建议关闭控制台输出 (`LOG_ENABLE_CONSOLE=false`)

### 安全注意
- 不要记录敏感信息（密码、密钥等）
- 个人信息需要脱敏处理
- 控制日志文件访问权限

## 故障排查

### 常见问题

1. **日志文件无法写入**
   - 检查目录权限
   - 确认磁盘空间充足

2. **日志等级不生效**
   - 检查环境变量设置
   - 重启应用程序

3. **性能影响**
   - 降低日志等级
   - 关闭不必要的输出

### 日志分析

```bash
# 查看错误日志
grep "ERROR" logs/app-*.log

# 统计请求量
grep "Jobs-API" logs/app-*.log | wc -l

# 查看特定用户操作
grep "username.*john" logs/app-*.log
```
