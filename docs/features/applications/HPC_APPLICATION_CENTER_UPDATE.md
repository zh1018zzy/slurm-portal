# HPC应用中心功能更新

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

HPC应用中心已升级为可扩展的应用管理平台，支持多种HPC应用的标准化集成和智能资源管理。

## 新增功能

### 🏗️ 核心架构

- **标准化应用规范** - 统一的应用描述格式，支持复杂的配置和依赖关系
- **应用注册表** - 自动发现和管理HPC应用，支持版本控制
- **智能资源调度** - 基于应用特性、集群状态和历史数据的资源推荐
- **动态表单生成** - 根据应用规范自动生成用户界面

### 📦 应用管理

- **自动发现** - 从Environment Modules和Spack自动发现可用应用
- **版本管理** - 支持多版本应用并存
- **分类标签** - 按分类、类型、标签灵活组织应用
- **权限控制** - 基于角色的应用访问控制

### 💡 智能推荐

- **资源优化** - 基于应用特性推荐最佳资源配置
- **历史学习** - 利用作业历史数据优化推荐算法
- **集群感知** - 考虑集群当前状态和负载
- **成本估算** - 提供作业运行时间和资源成本预估

### 🎨 用户界面

- **动态表单** - 根据应用自动生成配置界面
- **预设配置** - 提供快速开始的预设模板
- **实时验证** - 表单数据实时验证和错误提示
- **帮助文档** - 集成应用文档和示例代码

## 文件结构

```
lib/
├── hpc-application-spec.ts      # 应用规范定义
├── application-registry.ts      # 应用注册表
├── resource-scheduler.ts        # 资源调度器
└── applications/
    └── examples.ts              # 示例应用定义

components/applications/
├── DynamicForm.tsx              # 动态表单组件
├── FormFieldRenderer.tsx       # 表单字段渲染器
└── ResourceRecommendation.tsx   # 资源推荐组件

app/
├── api/applications/
│   ├── route.ts                 # 应用管理API
│   ├── discovery/route.ts       # 应用发现API
│   └── [name]/recommend/route.ts # 资源推荐API
└── dashboard/applications/
    └── hpc/page.tsx             # 新版应用中心页面

db/
├── migrate_hpc_applications.sql # 数据库迁移脚本
└── migrate_hpc_applications_simple.sql

docs/
└── hpc-application-center-implementation-guide.md

scripts/
├── init-applications.ts        # 应用初始化脚本
└── test-hpc-center.ts          # 功能测试脚本
```

## 使用指南

### 1. 数据库设置

执行数据库迁移：
```bash
# 使用简化版本避免JSON转义问题
psql -d your_database -f db/migrate_hpc_applications_simple.sql
```

### 2. 初始化应用

```bash
# 运行初始化脚本
npm run ts-node scripts/init-applications.ts
```

### 3. 功能测试

```bash
# 运行功能测试
npm run ts-node scripts/test-hpc-center.ts
```

### 4. 访问新界面

访问 `/dashboard/applications/hpc` 体验新版应用中心

## API接口

### 应用管理

- `GET /api/applications` - 获取应用列表
- `POST /api/applications` - 创建新应用
- `PUT /api/applications` - 更新应用
- `DELETE /api/applications` - 删除应用

### 应用发现

- `POST /api/applications/discovery` - 触发应用发现
- `GET /api/applications/discovery` - 获取发现状态

### 资源推荐

- `POST /api/applications/[name]/recommend` - 获取资源推荐
- `GET /api/applications/[name]/recommend` - 获取预设配置

## 配置示例

### MATLAB应用配置

```typescript
{
  metadata: {
    name: 'matlab',
    displayName: 'MATLAB',
    version: 'R2023b',
    description: 'MATLAB科学计算软件',
    category: 'scientific-computing',
    type: ['batch', 'interactive', 'gui'],
    tags: ['matlab', 'scientific-computing']
  },
  resources: {
    default: {
      name: 'default',
      partition: 'compute',
      nodes: 1,
      cpusPerTask: 4,
      memory: '16GB',
      walltime: '2:00:00'
    }
  },
  interface: {
    form: [
      {
        name: 'jobName',
        label: '作业名称',
        type: 'text',
        required: true,
        default: 'matlab-job'
      },
      {
        name: 'matlabCode',
        label: 'MATLAB代码',
        type: 'textarea',
        required: true
      }
    ]
  }
}
```

## 兼容性

新系统完全向后兼容现有应用：

- 旧版API通过 `?legacy=true` 参数访问
- 现有应用数据自动迁移
- 支持两种应用格式并存

## 扩展开发

### 添加新应用

1. 定义应用规范
2. 通过API注册或添加到模板库
3. 应用自动出现在应用中心

### 自定义字段类型

在 `FormFieldRenderer.tsx` 中添加新的字段类型支持

### 集成外部系统

通过 `application-registry.ts` 扩展发现源

## 故障排除

### 常见问题

1. **数据库连接错误** - 检查环境变量配置
2. **模块发现失败** - 确认Environment Modules可用
3. **权限问题** - 检查Supabase服务角色密钥

### 调试模式

设置环境变量启用详细日志：
```bash
export DEBUG_HPC_CENTER=true
```

## 下一步计划

- [ ] 集成Kubernetes/Slurm作业提交
- [ ] 机器学习资源预测模型
- [ ] Web IDE集成
- [ ] 作业模板市场
- [ ] 多集群支持
