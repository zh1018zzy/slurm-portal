# License 授权流程完整说明

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

**文档版本**: V2.0
**更新时间**: 2025-11-06
**系统架构**: 三层验证 + 统一管理

---

## 📋 目录

1. [系统概览](#系统概览)
2. [授权流程图](#授权流程图)
3. [三层验证架构](#三层验证架构)
4. [许可证类型](#许可证类型)
5. [详细流程说明](#详细流程说明)
6. [文件结构](#文件结构)
7. [API 端点](#api-端点)
8. [常见场景](#常见场景)

---

## 系统概览

### 核心特点

- **双模式支持**: 试用版（Trial）+ 商业版（Commercial）
- **三层验证**: Edge Runtime → API Middleware → API Service
- **实时统计**: 用户数、并发数、节点数动态监控
- **安全加固**: 硬件绑定、数字签名、篡改检测
- **智能缓存**: 2分钟缓存减少验证开销

### 当前状态

```bash
# 查看当前许可证状态
node scripts/license/validate-license.js

# 输出示例（试用版）:
📋 许可证类型: 试用版
剩余天数: 41 天
最大用户数: 10
最大并发用户: 5
当前用户: 6
```

---

## 授权流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户请求进入                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  第一层: Edge Runtime (middleware.ts)                            │
├─────────────────────────────────────────��───────────────────────┤
│  1. 检查路径是否需要验证                                         │
│     - 跳过: /_next/, /api/, /favicon.ico, 静态资源              │
│     - 验证: /dashboard/*, /login, 其他业务路径                  │
│                                                                  │
│  2. 调用 edge-license-validator.ts                              │
│     - 轻量级验证（无 Node.js API）                               │
│     - 仅检查许可证文件是否存在                                   │
│     - 基本格式验证                                               │
│                                                                  │
│  3. 验证结果处理                                                 │
│     ✅ 通过 → 继续                                               │
│     ❌ 失败 → 返回错误页面                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  第二层: API Middleware (license-middleware.ts)                  │
├─────────────────────────────────────────────────────────────────┤
│  适用于: /api/* 路由                                             │
│                                                                  │
│  1. 调用 license-validator.ts                                   │
│     - 完整 Node.js 环境验证                                      │
│     - 读取许可证文件                                             │
│     - 验证数字签名（RSA-SHA256）                                 │
│     - 检查有效期                                                 │
│     - 验证硬件绑定                                               │
│                                                                  │
│  2. 验证结果处理                                                 │
│     ✅ 通过 → 继续 API 处理                                      │
│     ❌ 失败 → 返回 403 错误                                      │
└────────────────────���────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  第三层: API Service Layer (unified-license-validator.ts)        │
├─────────────────────────────────────────────────────────────────┤
│  适用于: /api/license/*, /api/auth/*, /api/users/*              │
│                                                                  │
│  1. 检测许可证类型                                               │
│     ┌─ 检查 config/installation.json 存在？                     │
│     │  ├─ 是 → 试用版模式                                       │
│     │  └─ 否 → 检查 config/license.json                         │
│     │         ├─ 存在 → 商业版模式                              │
│     │         └─ 不存在 → 无许可证（回退试用版）                │
│                                                                  │
│  2. 获取实时用户统计                                             │
│     - 总用户数 (totalUsers)                                      │
│     - 活跃用户数 (activeUsers)                                   │
│     - 并发用户数 (concurrentUsers)                               │
│     - 部门数量 (departmentCount)                                 │
│                                                                  │
│  3. 执行完整验证                                                 │
│     ┌─ 试用版验证 ────────────────┐                             │
│     │  • 计算试用期 (90天)         │                             │
│     │  • 检查过期状态              │                             │
│     │  • 应用限制:                 │                             │
│     │    - 最大用户: 10            │                             │
│     │    - 最大并发: 5             │                             │
│     └──────────────────────────────┘                             │
│                                                                  │
│     ┌─ 商业版验证 ────────────────┐                             │
│     │  • 验��数字签名              │                             │
│     │  • 检查有效期                │                             │
│     │  • 验证硬件绑定              │                             │
│     │  • 检查用户限制              │                             │
│     │  • 安全审计                  │                             │
│     └──────────────────────────────┘                             │
│                                                                  │
│  4. 强化安全检查 (LicenseSecurityManager)                        │
│     - 文件完整性验证                                             │
│     - 篡改检测                                                   │
│     - 异常行为监控                                               │
│                                                                  │
│  5. 结果缓存 (2分钟)                                             │
│     - 减少数据库查询                                             │
│     - 提升响应速度                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        返回验证结果                              │
├─────────────────────────────────────────────────────────────────┤
│  {                                                               │
│    valid: true/false,                                            │
│    status: 'trial' | 'commercial' | 'expired' | 'invalid',      │
│    type: 'trial' | 'commercial',                                 │
│    remainingDays: 41,                                            │
│    currentUsage: {                                               │
│      totalUsers: 6,                                              │
│      concurrentUsers: 1                                          │
│    },                                                            │
│    limits: {                                                     │
│      maxUsers: 10,                                               │
│      maxConcurrentUsers: 5                                       │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三层验证架构

### 第一层: Edge Runtime

**文件**: `lib/license/edge-license-validator.ts`
**位置**: `middleware.ts` (Next.js Edge Runtime)

**特点**:
- ✅ 最快速度（无 Node.js API 开销）
- ✅ 最小资源消耗
- ❌ 功能受限（不能访问文件系统、数据库）

**验证内容**:
```typescript
- 路径过滤（跳过静态资源）
- 基本许可证存在性检查
- 简单格式验证
```

**执行频率**: 每个请求

**日志示例**:
```
[License] Edge验证结果: true - 许可证验证通过（边缘验证）
```

---

### 第二层: API Middleware

**文件**: `lib/license/license-validator.ts`
**位置**: `lib/license/license-middleware.ts`

**特点**:
- ✅ 完整 Node.js 环境
- ✅ 可访问文件系统
- ✅ 完整签名验证

**验证内容**:
```typescript
1. 文件读取 (config/license.json)
2. 数字签名验证 (RSA-SHA256)
3. 有效期检查
4. 硬件绑定验证
5. 格式完整性检查
```

**执行时机**: API 请求

---

### 第三层: API Service

**文件**: `lib/license/unified-license-validator.ts`
**位置**: `/api/license/*` 端点

**特点**:
- ✅ 最全面验证
- ✅ 实时用户统计
- ✅ 数据库连接
- ✅ 安全审计
- ✅ 恢复管理

**验证内容**:
```typescript
1. 试用版/商业版自动检测
2. 实时用户数统计（Supabase）
3. 节点数量统计（Slurm）
4. 完整安全检查
5. 违规行为监控
6. 审计日志记录
```

**缓存策略**: 2分钟缓存

**日志示例**:
```
[UnifiedLicenseValidator] 开始许可证验证
[UserStatisticsService] 用户统计获取成功
  Data: { totalUsers: 6, concurrentUsers: 1 }
[License-Stats] 许可证统计获取成功
  Data: { licenseType: 'trial', userCount: 6, userStatus: 'normal' }
```

---

## 许可证类型

### 1. 试用版 (Trial)

**标��文件**: `config/installation.json`

**内容示例**:
```json
{
  "installDate": "2025-09-17T11:10:13.634Z",
  "installId": "5d6b9705-ac21-4a44-9057-06dca0e3f614",
  "version": "1.0.0",
  "createdAt": "2025-09-17T11:10:13.635Z"
}
```

**限制**:
- 试用期: 90天（从 installDate 开始计算）
- 最大用户数: 10
- 最大并发用户: 5
- 功能限制: 部分高级功能不可用

**检测逻辑**:
```typescript
if (fs.existsSync('config/installation.json')) {
  return 'trial'
}
```

**有效期计算**:
```typescript
const installDate = new Date(data.installDate)
const now = new Date()
const daysElapsed = Math.floor((now - installDate) / (1000 * 3600 * 24))
const remainingDays = 90 - daysElapsed
```

---

### 2. 商业版 (Commercial)

**许可证文件**: `config/license.json`

**文件格式** (V2.0):
```json
{
  "header": {
    "version": "1.0",
    "format": "json",
    "algorithm": "RSA-SHA256"
  },
  "payload": "eyJpZCI6ImxpY2Vuc2UtMTc2MjQyMTgwMDg0Mi11...", // Base64编码
  "signature": "unsigned-license-for-development-only",
  "checksum": "07f30d89f5c94ed5f4aff158e79305f3651d3a1538ef6d6e0847ceb58ceebbc1"
}
```

**Payload 内容** (Base64 解码后):
```json
{
  "id": "license-1762421800842-uy6egddx",
  "customer": "vtong",
  "tier": "basic",
  "validity": {
    "startDate": "2025-11-06T09:36:40.840Z",
    "endDate": "2026-11-06T09:36:40.840Z"
  },
  "userLimits": {
    "maxUsers": 10,
    "maxConcurrentUsers": 5
  },
  "enabledFeatures": ["job_management", "file_management"],
  "deploymentLimits": {
    "hardwareFingerprint": "069a324734ce4ea1..."
  }
}
```

**验证步骤**:
1. 检查文件存在性
2. 解析 JSON 格式
3. 验证 header 结构
4. Base64 解码 payload
5. 验证数字签名（RSA-SHA256）
6. 检查有效期
7. 验证硬件指纹
8. 检查用户限制

**公钥文件**: `config/license/license-public.pem`

---

## 详细流程说明

### 流程 1: 用户访问页面

```
1. 用户访问 http://localhost:3000/zh/dashboard
   ↓
2. Next.js Middleware 拦截请求
   ↓
3. middleware.ts 执行流程:
   ├─ 检查路径: /zh/dashboard (需要验证)
   ├─ 调用 edgeLicenseValidator.shouldValidatePath()
   │  └─ 返回 true (需要验证)
   ├─ 调用 edgeLicenseValidator.validateLicense()
   │  ├─ 检查 config/installation.json → 存在（试用版）
   │  ├─ 返回 { valid: true, message: "许可证验证通过" }
   │  └─ 日志: [License] Edge验证结果: true - 许可证验证通过
   └─ 返回 NextResponse.next() → 继续处理请求
   ↓
4. 页面正常渲染
```

---

### 流程 2: API 请求许可证状态

```
1. 前端请求 GET /api/license/status
   ↓
2. API Route Handler 执行
   ↓
3. unified-license-validator.validateLicense() 执行:
   ├─ 检查缓存 (2分钟有效期)
   │  └─ 缓存未命中 → 继续验证
   │
   ├─ 获取实时用户统计
   │  ├─ 调用 userStatisticsService.getBasicUserStatistics()
   │  ├─ 查询 Supabase users 表
   │  └─ 返回: { totalUsers: 6, concurrentUsers: 1 }
   │
   ├─ 检测许可证类型
   │  ├─ 检查 config/installation.json → 存在
   │  └─ 返回 'trial'
   │
   ├─ 执行试用版验证 (validateTrialLicense)
   │  ├─ 读取 installation.json
   │  ├─ 计算剩余天数: 90 - 49 = 41天
   │  ├─ 检查状态: 未过期
   │  └─ 返回 { valid: true, remainingDays: 41 }
   │
   ├─ 执行安全检查 (licenseSecurityManager)
   │  ├─ 检查文件完整性
   │  ├─ 检测异常行为
   │  └─ 返回 { valid: true, severity: 'low' }
   │
   └─ 缓存结果 (2分钟)
   ↓
4. 返回 JSON 响应:
   {
     "valid": true,
     "status": "trial",
     "type": "trial",
     "remainingDays": 41,
     "currentUsage": {
       "totalUsers": 6,
       "concurrentUsers": 1
     },
     "limits": {
       "maxUsers": 10,
       "maxConcurrentUsers": 5
     }
   }
```

---

### 流程 3: 商业版许可证安装

```
1. 生成商业版许可证
   $ node scripts/license/generate-license.js --customer vtong
   ↓
2. 许可证文件生成: scripts/config/license/license.json
   ↓
3. 安装许可证
   $ node scripts/license/install-license.js scripts/config/license/license.json
   ↓
4. install-license.js 执行流程:
   ├─ 验证输入文件存在性
   ├─ 读取许可证文件
   ├─ 验证格式 (validateLicenseFormat)
   │  ├─ 检查 header, payload, signature 字段
   │  ├─ 验证 header.algorithm = "RSA-SHA256"
   │  ├─ Base64 解码 payload
   │  └─ 检查 customer, tier, validity 等字段
   ├─ 验证数字签名 (verifyDigitalSignature)
   │  ├─ 读取公钥: config/license/license-public.pem
   │  ├─ 使用 RSA-SHA256 验证签名
   │  └─ 签名通过/失败
   ├─ 验证有效期 (validateLicenseValidity)
   │  ├─ 解码 payload 获取 validity.startDate, endDate
   │  ├─ 检查当前时间在有效期内
   │  └─ 计算剩余天数
   ├─ 备份现有许可证
   │  └─ config/license.json → config/license.json.backup-2025-11-06
   ├─ 安装新许可证
   │  ├─ 删除 config/installation.json (如果存在)
   │  └─ 复制到 config/license.json
   └─ 显示许可证信息
   ↓
5. 系统自动切换到商业版模式
```

---

### 流程 4: 许可证过期处理

```
1. 试用版过期 (90天后)
   ↓
2. unified-license-validator 检测:
   ├─ 计算 remainingDays = 90 - 91 = -1 (已过期)
   ├─ 返回 { valid: false, status: 'expired', isTrialExpired: true }
   └─ 日志: [WARN] 试用期已过期
   ↓
3. middleware.ts 拦截请求:
   ├─ edge-license-validator 返回 { shouldRedirect: true }
   └─ 重定向到 /license-expired 页面
   ↓
4. 显示过期提示:
   "您的试用期已过期，请联系管理员获取商业版许可证"
```

---

## 文件结构

### 配置文件

```
config/
├── installation.json          # 试用版标记 (存在=试用版)
├── license.json               # 商业版许可证 (存在=商业版)
└── license/
    ├── license-public.pem     # RSA 公钥（验证签名）
    └── license-private.pem    # RSA 私钥（生成签名，仅服务端保留）
```

### 核心库文件

```
lib/license/
├── edge-license-validator.ts      # Edge Runtime 验证器
├── license-validator.ts            # 标准验证器
├── unified-license-validator.ts    # 统一验证器（最全面）
├── enhanced-license-manager.ts     # 功能管理
├── hardware-fingerprint.ts         # 硬件指纹
├── license-security-manager.ts     # 安全管理
├── license-recovery-manager.ts     # 恢复管理
├── user-statistics-service.ts      # 用户统计
├── node-limit-enforcer.ts          # 节点限制
├── license-middleware.ts           # 中间件
├── license-decorator.ts            # 装饰器
└── types.ts                        # 类型定义
```

### 脚本工具

```
scripts/license/
├─��� generate-license.js         # 生成商业版许可证
├── install-license.js          # 安装许可证
├── validate-license.js         # 验证许可证
├── quick-health-check.sh       # 快速健康检查
└── README.md                   # 工具使用手册
```

---

## API 端点

### 1. 获取许可证状态

**端点**: `GET /api/license/status`

**响应**:
```json
{
  "valid": true,
  "status": "trial",
  "type": "trial",
  "message": "试用版许可证有效",
  "remainingDays": 41,
  "startDate": "2025-09-17T11:10:13.634Z",
  "endDate": "2025-12-16T11:10:13.634Z",
  "currentUsage": {
    "totalUsers": 6,
    "activeUsers": 0,
    "concurrentUsers": 1,
    "departmentCount": 3
  },
  "limits": {
    "maxUsers": 10,
    "maxConcurrentUsers": 5
  },
  "warnings": [],
  "isTrialExpired": false,
  "canUpgrade": true
}
```

---

### 2. 获取许可证统计

**端点**: `GET /api/license/stats`

**响应**:
```json
{
  "licenseType": "trial",
  "userCount": 6,
  "userStatus": "normal",
  "nodeCount": 2,
  "nodeStatus": "normal",
  "usage": {
    "userUsage": 60,    // 6/10 = 60%
    "nodeUsage": 100    // 2/2 = 100% (试用版无节点限制)
  }
}
```

---

### 3. 检查功能可用性

**端点**: `GET /api/license/features/{featureName}`

**示例**: `GET /api/license/features/webshell`

**响应**:
```json
{
  "available": true,
  "reason": "功能在当前许可证中可用"
}
```

---

### 4. 获取硬件指纹

**端点**: `GET /api/license/hardware`

**响应**:
```json
{
  "fingerprint": "069a324734ce4ea1110b67817c2c57130d903e582e57fe14d41",
  "platform": "linux",
  "arch": "x64",
  "hostname": "hpc-server"
}
```

---

## 常见场景

### 场景 1: 新系统部署（试用版）

```bash
# 1. 系统首次启动，自动创建 installation.json
# 2. 试用期开始计算（90天）
# 3. 系统以试用版模式运行

# 验证状态
node scripts/license/validate-license.js

输出:
✅ 许可证类型: 试用版
   剩余天数: 90 天
   最大用户数: 10
```

---

### 场景 2: 升级到商业版

```bash
# 方式一：自动切换（推荐）
# 1. 联系供应商获取商业版许可证文件
# 2. 安装许可证
node scripts/license/install-license.js /path/to/license.json

# 3. 删除试用版标记文件（推荐但非必需）
mv config/installation.json config/installation.json.bak

# 4. 重启应用
pm2 restart hpc-app

# 验证状态
node scripts/license/validate-license.js

输出:
✅ 许可证类型: 商业版
   客户: vtong
   有效期: 2025-11-06 - 2026-11-06
   用户限制: 10

# 重要说明:
# - 系统检测到 config/license/license.json 存在时会优先使用商业版
# - 即使 installation.json 存在，商业版优先级也更高
# - 删除 installation.json 后系统不会自动重新创建
```

---

### 场景 3: 试用期过期

```bash
# 试用期过期后（90天）
# 系统行为:
# 1. API 请求返回 403 错误
# 2. 用户访问页面重定向到过期提示页
# 3. 仅管理员可以访问许可证管理页面

# 解决方案:
# 1. 安装商业版许可证
# 2. 或联系供应商延长试用期
```

---

### 场景 4: 商业版许可证过期

```bash
# 商业版过期后
# 系统行为:
# 1. 自动回退到试用版模式（如果 installation.json 存在）
# 2. 或显示许可证过期提示

# 解决方案:
# 1. 续费获取新的商业版许可证
# 2. 安装新许可证
node scripts/license/install-license.js /path/to/new-license.json
```

---

### 场景 5: 用户数超限

```bash
# 试用版限制: 最大10用户
# 当前用户数: 11

# 系统行为:
# 1. API 返回警告: "用户数已达上限"
# 2. 禁止新用户注册
# 3. 现有用户可以继续使用

# 解决方案:
# 1. 升级到商业版（更高用户限制）
# 2. 或删除不活跃用户
```

---

## 验证工具使用

### 完整验证

```bash
node scripts/license/validate-license.js
```

### 快速验证

```bash
node scripts/license/validate-license.js --quick
```

### 跳过签名验证

```bash
node scripts/license/validate-license.js --skip-signature
```

### 健康检查

```bash
bash scripts/license/quick-health-check.sh
```

---

## 日志监控

### 查看实时日志

```bash
# PM2 日志
pm2 logs hpc-app

# 或直接查看日志文件
tail -f logs/combined-2.log
```

### 关键日志示例

```
[License] Edge验证结果: true - 许可证验证通过（边缘验证）
[UnifiedLicenseValidator] 开始许可证验证
[UserStatisticsService] 用户统计获取成功
  Data: { totalUsers: 6, concurrentUsers: 1 }
[LicenseSecurityManager] 安全检查完成
  Data: { valid: true, severity: 'low' }
[License-Stats] 许可证统计获取成功
  Data: { licenseType: 'trial', userCount: 6 }
```

---

## 安全机制

### 1. 数字签名

- **算法**: RSA-SHA256
- **公钥**: config/license/license-public.pem
- **私钥**: 仅服务端保留（生成许可证时使用）
- **验证**: 每次许可证加载时验证签名

### 2. 硬件绑定

- **指纹生成**: 基于 CPU、主板、网卡等硬件信息
- **绑定方式**: 许可证文件中包含硬件指纹
- **验证**: 每次启动时验证硬件指纹匹配

### 3. 篡改检测

- **文件完整性**: 检查许可证文件修改时间
- **格式验证**: 严格验证 JSON 格式和必需字段
- **异常监控**: 检测异常访问模式

### 4. 审计日志

- **操作记录**: 所有许可证相关操作都有日志
- **安全事件**: 记录验证失败、异常访问等事件
- **日志级别**: INFO, WARN, ERROR, DEBUG

---

## 故障排除

### 问题 1: 许可证验证失败

```bash
# 检查文件存在性
ls -l config/installation.json config/license.json

# 运行完整验证
node scripts/license/validate-license.js

# 查看详细日志
tail -100 logs/combined-2.log | grep License
```

### 问题 2: 硬件指纹不匹配

```bash
# 获取当前硬件指纹
curl http://localhost:3000/api/license/hardware

# 重新生成许可证（包含新的硬件指纹）
node scripts/license/generate-license.js --customer your-name
```

### 问题 3: 用户数统计不准确

```bash
# 清除缓存（重启 PM2）
pm2 restart hpc-app

# 手动检查数据库用户数
psql -U postgres -d hpc -c "SELECT COUNT(*) FROM users;"
```

---

## 相关文档

- **清理报告**: `docs/system/licensing/LICENSE-CLEANUP-CORRECTION.md`
- **验证脚本更新**: `docs/system/licensing/LICENSE-VALIDATION-SCRIPT-UPDATE.md`
- **工具手册**: `scripts/license/README.md`

---

**文档维护者**: Claude Code
**最后更新**: 2025-11-06
**版本**: 2.0
