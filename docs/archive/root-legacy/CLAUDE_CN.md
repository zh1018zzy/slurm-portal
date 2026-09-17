# CLAUDE.md

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

本文件为 Claude Code (claude.ai/code) 在此代码仓库中工作时提供指导。

## 开发命令

### 核心开发命令
```bash
npm run dev         # 启动开发服务器，地址为 http://localhost:3000
npm run build       # 构建生产包
npm run build:offline    # 构建离线部署包
npm run start       # 启动生产服务器
npm run lint        # 运行 ESLint 代码风格检查

# 性能监控和优化
npm run monitor     # 运行性能监控
npm run monitor:continuous  # 持续性能监控
npm run diagnose    # 运行性能诊断
npm run optimize    # 运行部署优化

# PM2 生产环境命令
npm run start:prod  # 使用PM2启动生产环境
npm run pm2:restart # 重启PM2服务
npm run pm2:reload  # 重载PM2服务
npm run pm2:logs    # 查看PM2日志
npm run pm2:monit   # PM2监控面板
```

### 测试
未配置特定的测试命令。使用 `npm run lint` 验证代码风格和 TypeScript 编译。

## 项目架构

这是一个基于 Next.js 14 App Router 构建的**高性能计算（HPC）管理平台**。应用程序通过与 Slurm 工作负载管理器集成，为管理 HPC 作业、用户和资源提供现代化的 Web 界面。

### 核心架构组件

**前端技术栈：**
- Next.js 14 with App Router 和 React Server Components
- Shadcn UI + Radix UI 提供无障碍组件
- Tailwind CSS 移动端优先设计
- 全面使用 TypeScript

**后端集成：**
- 通过 `lib/auth-ldap.ts` 进行 LDAP 身份验证
- 通过 `lib/scheduler/slurm-adapter.ts` 集成 Slurm 调度器
- 使用 Supabase 进行用户角色管理
- 基于 JWT 的会话管理

**核心业务逻辑：**
- `lib/slurm.ts` - Slurm 命令执行和分区管理
- `lib/job-sync.ts` - Slurm 与应用程序之间的作业同步
- `app/api/jobs/route.ts` - 作业提交、查询和统计
- `app/api/auth/route.ts` - 身份验证端点

### 目录结构

```
app/
├── dashboard/           # 主应用页面
│   ├── jobs/           # 作业管理界面
│   ├── compute/        # 计算资源监控
│   ├── files/          # 文件管理
│   ├── system/         # 系统管理
│   └── submit/         # 作业提交界面
├── api/                # REST API 端点
│   ├── jobs/           # 作业管理 API
│   ├── auth/           # 身份验证 API
│   └── files/          # 文件操作 API
components/
├── ui/                 # Shadcn UI 组件
└── dashboard/          # 业务特定组件
lib/
├── auth-ldap.ts        # LDAP 身份验证
├── scheduler/          # Slurm 集成
├── slurm.ts           # Slurm 命令工具
└── utils.ts           # 共享工具
```

## 身份验证与授权

应用程序使用双层身份验证系统：
1. **LDAP 身份验证** - 针对 LDAP 目录的主要用户身份验证
2. **Supabase 角色管理** - 基于角色的访问控制（admin/user 角色）

用户通过 LDAP 进行身份验证，然后从 Supabase `users` 表中检索角色信息。为会话管理颁发 JWT 令牌。

## HPC 集成

### Slurm 集成
- 通过 `execFile` 直接执行 `sinfo`、`squeue`、`sbatch`、`scancel` 命令
- 通过 `lib/scheduler/slurm-adapter.ts` 进行作业提交
- 实时作业状态监控和统计
- 分区和节点信息检索

### 作业管理
- 带脚本验证的作业提交
- 基于用户的作业过滤（管理员查看所有，用户查看自己的作业）
- 作业统计和趋势分析
- 日志检索和文件管理

## 开发约定

- **组件风格**：使用 Shadcn UI 组件，遵循现有模式
- **代码风格**：函数式组件，TypeScript 接口优于枚举
- **状态管理**：使用 nuqs 进行 URL 状态管理，优先使用 React Server Components
- **移动端优先**：Tailwind 断点，响应式设计
- **中文注释**：代码中的详细中文文档

## 环境变量

必需的环境变量：
- `LDAP_URL`、`LDAP_BASE_DN`、`LDAP_BIND_DN`、`LDAP_BIND_PASSWORD`
- `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

## 常见任务

### 添加新的作业管理功能
1. 扩展 `lib/scheduler/slurm-adapter.ts` 以支持新的 Slurm 操作
2. 在 `app/api/jobs/` 中添加 API 端点
3. 在 `app/dashboard/jobs/` 中创建 UI 组件
4. 遵循现有的身份验证模式

### 添加系统管理功能
1. 在 `app/api/` 中添加 API 路由，包含适当的基于角色的访问控制
2. 在 `app/dashboard/system/` 中创建管理 UI
3. 更新 JWT 验证中的用户角色检查

### 文件管理扩展
1. 扩展 `app/api/files/route.ts` 以支持新的文件操作
2. 更新 `app/dashboard/files/` 组件
3. 考虑 HPC 存储挂载点和权限

## 安全考虑

### 身份验证安全
- 多层身份验证（LDAP + 数据库角色）
- 登录尝试限制和账户锁定
- 使用 httpOnly cookies 的安全会话管理
- 基于 IP 的跟踪以增强安全审计

### 系统安全
- 通过参数验证进行命令注入保护
- 通过路径验证和权限控制进行文件系统保护
- 使用 Zod 架构进行输入验证
- 全面的错误处理和详细日志记录

## 重要实现细节

### Slurm 命令执行
- 所有 Slurm 命令都通过 `lib/scheduler/slurm-adapter.ts` 中的安全包装器执行
- 状态映射处理各种 Slurm 作业状态，具有智能错误处理
- 临时脚本文件通过自动清理进行安全管理
- 用户家目录创建和管理具有适当权限

### 作业状态同步
- 通过轮询和缓存进行实时作业状态更新
- 数据库同步以实现作业持久性
- 通过分页和过滤进行高效查询
- 仪表板显示的统计计算

### 错误处理
- 整个应用程序的全面错误日志记录
- 在保持安全性的同时提供用户友好的错误消息
- 当 Slurm 服务不可用时优雅降级
- 针对瞬态故障的自动重试机制

### 通知服务命令
```bash
# 快速部署通知系统（推荐）
./scripts/deploy-notifications.sh

# 手动启动作业同步服务
nohup node scripts/start-job-sync.js > /tmp/job-sync.log 2>&1 &

# 查看通知服务状态
ps aux | grep job-sync
tail -f /tmp/job-sync.log

# 停止通知服务
pkill -f job-sync
```

## 项目文档结构

经过整理后，文档现已按功能模块分类：

```
docs/
├── guides/              # 用户指南和API文档
│   ├── api/            # API 使用指南
│   ├── installation/   # 安装部署指南
│   └── usage/          # 使用说明
├── features/           # 功能模块文档
│   ├── applications/   # 应用管理功能
│   ├── dashboard/      # 仪表板相关
│   ├── files/          # 文件管理
│   ├── jobs/           # 作业管理
│   ├── notifications/  # 通知系统
│   ├── vnc/            # VNC 远程桌面
│   └── webshell/       # Web终端
├── system/             # 系统架构文档
│   ├── authentication/ # 认证授权
│   ├── database/       # 数据库集成
│   ├── licensing/      # 许可证系统
│   ├── microservices/  # 微服务架构
│   └── permissions/    # 权限管理
├── performance/        # 性能优化
│   ├── optimization/   # 性能优化
│   └── fixes/          # 性能修复
├── deployment/         # 部署相关
├── operations/         # 运维管理
├── troubleshooting/    # 问题排查
└── archive/            # 历史文档存档
```

**总计 181 个文档**，已按功能模块有序分类。

## 许可证管理系统

### 许可证系统组件
平台包含一个全面的许可证管理系统：

- **许可证验证器**：`lib/license/license-validator.ts` - 核心许可证验证逻辑
- **统一验证器**：`lib/license/unified-license-validator.ts` - 集中化验证服务
- **安全管理器**：`lib/license/license-security-manager.ts` - 许可证安全功能
- **硬件指纹**：硬件绑定和验证
- **恢复管理器**：许可证恢复和还原功能

### 许可证 API 端点
```bash
GET  /api/license/status              # 获取许可证状态和验证
GET  /api/license/features/[feature]  # 检查特定功能可用性
POST /api/license/installation        # 安装新许可证
GET  /api/license/hardware            # 获取硬件指纹
GET  /api/license/audit               # 许可证使用审计
GET  /api/license/stats               # 许可证统计
```

### 许可证管理界面
- **许可证仪表板**：`app/dashboard/system/license/page.tsx`
- **增强型许可证监控**：实时状态、用户/节点限制、功能限制
- **试用许可证支持**：自动检测和升级提示
- **硬件绑定**：安全的许可证-硬件关联

### 许可证系统环境变量
- `LICENSE_FILE_PATH` - 许可证文件路径（默认：config/license.json）
- `LICENSE_PUBLIC_KEY_PATH` - 公钥路径（默认：config/license-public.pem）
- `STRICT_LICENSE_VALIDATION` - 启用严格验证（生产环境默认：true）
- ~~`SKIP_HARDWARE_BINDING`~~ — 已移除；请勿依赖任何绕过开关
- `NODE_ENV` - 环境模式，影响许可证验证

## 系统管理功能

### 高级系统组件
- **资源调度器**：`lib/resource-scheduler.ts` - 智能资源分配和推荐
- **节点监控**：`app/api/system/nodes/route.ts` - 实时集群节点状态，支持缓存和限流
- **系统设置**：`app/api/system/settings/route.ts` - 动态系统配置管理
- **资源配置**：`app/api/system/resource-config/route.ts` - 每个应用的资源配置
- **系统信息**：`app/api/system/info/route.ts` - 综合系统状态和指标

### 系统管理界面
- **系统仪表板**：`app/dashboard/system/page.tsx` - 集中式系统管理
- **节点监控**：实时集群节点状态和资源利用率
- **用户管理**：`app/dashboard/system/users/page.tsx` - 高级用户管理，集成LDAP
- **群组管理**：`app/dashboard/system/groups/page.tsx` - 群组管理和权限
- **备份管理**：`app/dashboard/system/backup/page.tsx` - 系统备份和恢复
- **系统日志**：`app/dashboard/system/logs/page.tsx` - 集中式日志查看和分析

### 资源管理功能
- **智能资源推荐**：基于应用配置文件的自动资源分配
- **集群状态监控**：实时集群资源可用性
- **资源配置文件**：针对不同应用类型的预定义资源配置
- **性能优化**：基于历史使用模式的自动资源优化

### 系统 API 端点
```bash
GET  /api/system/nodes              # 获取集群节点状态（带缓存）
GET  /api/system/info               # 系统信息和指标
GET  /api/system/settings           # 系统配置管理
POST /api/system/resource-config   # 配置应用资源
GET  /api/system/logs               # 系统日志访问
POST /api/system/notifications/cleanup  # 通知系统维护
```

## 常见任务和开发模式

### 添加新的作业管理功能
1. 扩展 `lib/scheduler/slurm-adapter.ts` 以支持新的 Slurm 操作
2. 在 `app/api/jobs/` 中添加 API 端点
3. 在 `app/dashboard/jobs/` 中创建 UI 组件
4. 遵循现有的身份验证模式

### 添加新的系统管理功能
1. 在 `app/api/system/` 中添加 API 路由，包含适当的基于角色的访问控制
2. 在 `app/dashboard/system/` 中创建管理 UI
3. 更新 JWT 验证中的用户角色检查
4. 实施限流和缓存以提高性能

### 添加新的应用类型
1. 扩展 `app/api/applications/discovery/` 中的应用发现
2. 在 `lib/resource-scheduler.ts` 中添加应用特定的资源配置文件
3. 在 `app/dashboard/applications/` 中创建应用 UI
4. 更新应用目录和模板

### 文件管理扩展
1. 扩展 `app/api/files/route.ts` 以支持新的文件操作
2. 更新 `app/dashboard/files/` 组件
3. 考虑 HPC 存储挂载点和权限

### 添加通知功能
1. 扩展 `lib/notification-service.ts` 以支持新的通知类型
2. 在服务配置中添加通知模板
3. 更新 `scripts/start-job-sync.js` 中的后台作业同步服务
4. 修改 `app/dashboard/notifications/` 中的 UI 组件

## 应用管理系统

### 应用类型
- **HPC 应用**：传统HPC工作负载和仿真
- **VNC 应用**：远程桌面应用
- **生物信息学工具**：专业科学计算工具

### 应用管理功能
- **应用发现**：自动检测已安装的应用
- **资源配置**：每个应用的资源限制和需求
- **模板管理**：预配置的作业模板
- **应用目录**：集中式应用仓库

### 应用 API 端点
```bash
GET  /api/applications/discovery      # 自动发现应用
GET  /api/applications/available      # 列出可用应用
GET  /api/applications/bioinformatics # 生物信息学专用工具
POST /api/applications/resource-config # 配置应用资源
POST /api/applications/[id]/submit    # 提交应用作业
GET  /api/applications/clear-cache    # 清除应用缓存
```

## 通知系统

### 架构概览
HPC 平台包含一个全面的实时通知系统，监控作业状态变化和系统事件，为用户提供及时的计算工作更新。

**核心组件：**
- **后台服务**：`scripts/start-job-sync.js` - 持续监控 Slurm 作业（60秒间隔）
- **通知服务**：`lib/notification-service.ts` - 处理 22 种不同通知类型
- **API 层**：`app/api/notifications/route.ts` - 具有 JWT 认证的 RESTful CRUD 操作
- **前端界面**：`app/dashboard/notifications/page.tsx` - 具有过滤、分页和批量操作的丰富 UI
- **数据库**：Supabase `active_notifications` 表用于持久存储

### 支持的通知类型
- **作业事件**：状态变化、完成、失败、队列更新
- **系统事件**：维护、资源警报、安全警告
- **用户事件**：账户变更、权限更新、策略通知

### 部署要求

**⚠️ 重要：通知系统需要单独的后台服务才能运行。**

#### 选项1：快速部署（推荐）
```bash
cd /opt/my-hpcapp
./scripts/deploy-notifications.sh
```

#### 选项2：手动部署
```bash
# 启动作业同步服务
nohup node scripts/start-job-sync.js > /tmp/job-sync.log 2>&1 &

# 监控服务状态
tail -f /tmp/job-sync.log
ps aux | grep job-sync
```

### 服务监控
```bash
# 检查服务健康状态
curl http://localhost:3000/api/health

# 查看通知统计
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/notifications?stats=true

# 监控后台服务日志
tail -f /tmp/job-sync.log
```

### 数据库架构
```sql
-- 主要通知存储
active_notifications (
    id UUID PRIMARY KEY,
    type VARCHAR(100),      -- 通知类别
    title TEXT,             -- 显示标题
    message TEXT,           -- 通知内容
    priority VARCHAR(20),   -- low|medium|high|urgent
    status VARCHAR(20),     -- unread|read|archived
    user_id VARCHAR(100),   -- 目标用户
    is_global BOOLEAN,      -- 系统全局通知
    created_at TIMESTAMP,
    expires_at TIMESTAMP
)
```

完整部署文档请参见：`docs/deployment/notification-service-deployment.md`
