# AI应用管理方案设计

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 目录
- [概述](#概述)
- [系统架构](#系统架构)
- [AI应用类别](#ai应用类别)
- [技术实现](#技术实现)
- [部署方案](#部署方案)
- [使用指南](#使用指南)

---

## 概述

基于现有的Jupyter Lab集成经验,设计完整的AI应用管理系统,支持深度学习框架、大模型推理、AutoML工具等AI计算场景。

### 设计目标

1. **统一管理**: 所有AI应用通过应用中心统一管理
2. **权限控制**: 基于用户/组的访问权限控制
3. **资源调度**: 智能GPU资源分配和调度
4. **易用性**: 简化AI应用提交流程
5. **可扩展**: 支持快速添加新的AI工具

### 现有基础

✅ **已完成**:
- Jupyter Lab应用集成 (`lib/applications/ai/jupyter.ts`)
- 应用注册系统 (`lib/application-registry.ts`)
- 生信应用管理 (`lib/bioinformatics-applications.ts`)
- 应用中心UI (`app/[locale]/dashboard/applications/page.tsx`)
- 权限管理系统 (`app/api/permissions/file-permissions/route.ts`)

📝 **待实现**:
- PyTorch/TensorFlow深度学习框架
- vLLM大模型推理服务
- AI应用专属管理界面
- GPU资源监控和配额管理

---

## 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                      AI应用管理层                             │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │  PyTorch  │  │TensorFlow │  │   vLLM   │  │  Jupyter │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     应用注册系统                              │
│  - application-registry.ts                                  │
│  - AI应用规范定义 (lib/applications/ai/*.ts)                 │
├─────────────────────────────────────────────────────────────┤
│                      权限管理层                              │
│  - 用户/组权限控制                                            │
│  - GPU资源配额管理                                            │
│  - 应用可见性控制                                             │
├─────────────────────────────────────────────────────────────┤
│                     资源调度层                               │
│  - Slurm GPU调度                                             │
│  - 资源监控和统计                                             │
│  - 智能资源推荐                                               │
├─────────────────────────────────────────────────────────────┤
│                    存储和数据层                              │
│  - Supabase (hpc_applications表)                            │
│  - 应用配置缓存                                               │
│  - 用户作业历史                                               │
└─────────────────────────────────────────────────────────────┘
```

### 数据模型

#### 1. AI应用分类结构

```typescript
AI应用中心
├── 深度学习框架 (Deep Learning)
│   ├── PyTorch
│   ├── TensorFlow
│   ├── JAX
│   └── MXNet
├── 大模型推理 (LLM Inference)
│   ├── vLLM
│   ├── TGI (Text Generation Inference)
│   ├── TensorRT-LLM
│   └── llama.cpp
├── 交互式开发 (Interactive)
│   ├── Jupyter Lab
│   ├── JupyterHub
│   └── VS Code Server
├── AutoML工具 (AutoML)
│   ├── AutoGluon
│   ├── H2O AutoML
│   └── FLAML
└── 分布式训练 (Distributed)
    ├── DeepSpeed
    ├── Horovod
    └── Ray Train
```

#### 2. 数据库schema扩展

```sql
-- AI应用扩展字段
ALTER TABLE hpc_applications ADD COLUMN IF NOT EXISTS
  ai_config JSONB DEFAULT '{}';

-- AI应用配置结构
{
  "framework": "pytorch|tensorflow|vllm|jupyter",
  "gpu_required": true,
  "min_gpu_memory": "16GB",
  "supports_multi_gpu": true,
  "supports_distributed": true,
  "model_types": ["vision", "nlp", "multimodal"],
  "resource_profiles": {
    "small": { "gpu": 1, "memory": "16GB" },
    "medium": { "gpu": 2, "memory": "32GB" },
    "large": { "gpu": 4, "memory": "64GB" }
  }
}
```

---

## AI应用类别

### 1. 深度学习框架

#### PyTorch应用
- **用途**: 深度学习模型训练和推理
- **特性**:
  - 单GPU/多GPU/分布式训练
  - 混合精度训练(AMP)
  - 动态计算图
  - TorchScript模型导出
- **资源配置**:
  - 小规模: 1x GPU, 16GB内存, 4核CPU
  - 中规模: 2x GPU, 32GB内存, 8核CPU
  - 大规模: 4-8x GPU, 64-128GB内存, 16-32核CPU
  - 分布式: 多节点, 每节点4-8 GPU

#### TensorFlow应用
- **用途**: 生产级机器学习
- **特性**:
  - Keras高级API
  - TensorFlow Serving部署
  - TensorBoard可视化
  - 分布式训练策略
- **资源配置**: (同PyTorch)

### 2. 大模型推理

#### vLLM应用
- **用途**: 高性能LLM推理服务
- **特性**:
  - PagedAttention显存优化
  - 连续批处理
  - OpenAI兼容API
  - 张量并行
- **资源配置**:
  - 7B模型: 1x A100-40GB
  - 13B模型: 1x A100-80GB
  - 70B模型: 2-4x A100-80GB
  - 175B模型: 4-8x A100-80GB

#### 支持的模型
- LLaMA 2 (7B/13B/70B)
- Mistral (7B/8x7B)
- Qwen (7B/14B/72B)
- ChatGLM (6B/130B)
- Baichuan (7B/13B)

### 3. 交互式开发

#### Jupyter Lab (已集成)
- **用途**: 交互式Python开发
- **特性**:
  - Web界面
  - GPU支持
  - 扩展插件
  - 协作功能

### 4. 分布式训练

#### DeepSpeed应用
- **用途**: 大模型训练优化
- **特性**:
  - ZeRO优化器
  - 3D并行(数据/张量/流水线)
  - 混合精度训练
  - 梯度累积

---

## 技术实现

### 目录结构

```
lib/applications/ai/
├── index.ts                    # AI应用统一导出
├── jupyter.ts                  # Jupyter Lab (已完成)
├── pytorch.ts                  # PyTorch框架
├── tensorflow.ts               # TensorFlow框架
├── vllm.ts                     # vLLM推理服务
├── deepspeed.ts                # DeepSpeed训练
└── common/
    ├── gpu-configs.ts          # GPU配置模板
    ├── resource-profiles.ts    # 资源配置文件
    └── validation.ts           # 输入验证

scripts/
├── register-ai-apps.ts         # AI应用注册脚本
├── init-ai-models.ts           # 模型库初始化
└── sync-gpu-resources.ts       # GPU资源同步

app/[locale]/dashboard/
├── applications/
│   ├── ai/                     # AI应用专属页面
│   │   ├── page.tsx            # AI应用中心
│   │   ├── pytorch/            # PyTorch专属页
│   │   ├── vllm/               # vLLM专属页
│   │   └── components/
│   │       ├── GPUSelector.tsx # GPU选择器
│   │       ├── ModelSelector.tsx # 模型选择器
│   │       └── ResourceCard.tsx # 资源卡片
│   └── page.tsx                # 应用中心主页

app/api/applications/
├── ai/
│   ├── route.ts                # AI应用列表API
│   ├── pytorch/
│   │   └── route.ts            # PyTorch API
│   ├── vllm/
│   │   ├── route.ts            # vLLM API
│   │   └── models/route.ts     # 模型列表API
│   └── gpu-resources/
│       └── route.ts            # GPU资源查询API
```

### 核心组件

#### 1. AI应用注册模块

**lib/applications/ai/index.ts**
```typescript
import { jupyterApp } from './jupyter'
import { pytorchApp } from './pytorch'
import { tensorflowApp } from './tensorflow'
import { vllmApp } from './vllm'

// 导出所有AI应用
export const aiApplications = [
  jupyterApp,
  pytorchApp,
  tensorflowApp,
  vllmApp
]

// 按类别分组
export const aiAppsByCategory = {
  deepLearning: [pytorchApp, tensorflowApp],
  inference: [vllmApp],
  interactive: [jupyterApp]
}
```

#### 2. GPU资源配置模板

**lib/applications/ai/common/gpu-configs.ts**
```typescript
export interface GPUProfile {
  name: string
  type: string      // A100, V100, RTX3090
  memory: string    // 40GB, 80GB
  count: number
  architecture: string
}

export const GPU_PROFILES: Record<string, GPUProfile> = {
  'single-a100-40gb': {
    name: '单卡 A100 40GB',
    type: 'A100',
    memory: '40GB',
    count: 1,
    architecture: 'Ampere'
  },
  'single-a100-80gb': {
    name: '单卡 A100 80GB',
    type: 'A100',
    memory: '80GB',
    count: 1,
    architecture: 'Ampere'
  },
  'multi-a100-4x': {
    name: '4卡 A100 80GB',
    type: 'A100',
    memory: '80GB',
    count: 4,
    architecture: 'Ampere'
  }
}
```

#### 3. AI应用管理API

**app/api/applications/ai/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry } from '@/lib/application-registry'
import { aiApplications } from '@/lib/applications/ai'

export async function GET(request: NextRequest) {
  try {
    // 获取所有AI应用
    const apps = await applicationRegistry.getByCategory('machine-learning')
    const deepLearningApps = await applicationRegistry.getByCategory('deep-learning')

    return NextResponse.json({
      success: true,
      data: {
        all: [...apps, ...deepLearningApps],
        byCategory: {
          machineLearning: apps,
          deepLearning: deepLearningApps
        },
        count: apps.length + deepLearningApps.length
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 批量注册AI应用
    const result = await applicationRegistry.registerBatch(aiApplications)

    return NextResponse.json({
      success: true,
      message: `AI应用注册完成`,
      data: {
        registered: result.success,
        failed: result.failed,
        errors: result.errors
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

#### 4. GPU资源监控API

**app/api/applications/gpu-resources/route.ts**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export async function GET(request: NextRequest) {
  try {
    // 查询GPU分区状态
    const { stdout } = await execFileAsync('sinfo', [
      '-p', 'gpu',
      '-O', 'partition,available,nodes,gres',
      '--noheader'
    ])

    // 解析GPU资源
    const gpuInfo = parseGPUInfo(stdout)

    return NextResponse.json({
      success: true,
      data: {
        available: gpuInfo.available,
        total: gpuInfo.total,
        types: gpuInfo.types,
        partitions: gpuInfo.partitions
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function parseGPUInfo(sinfo: string) {
  // 解析sinfo输出，提取GPU信息
  // 实现GPU资源统计逻辑
  return {
    available: 8,
    total: 16,
    types: ['A100-80GB', 'V100-32GB'],
    partitions: ['gpu', 'gpu-high']
  }
}
```

---

## 部署方案

### 阶段1: 核心AI应用 (Week 1-2)

#### 任务清单

1. **创建应用定义文件**
   ```bash
   # PyTorch应用
   lib/applications/ai/pytorch.ts

   # vLLM应用
   lib/applications/ai/vllm.ts

   # 统一导出
   lib/applications/ai/index.ts
   ```

2. **创建注册脚本**
   ```bash
   scripts/register-ai-apps.ts
   ```

3. **添加国际化翻译**
   ```bash
   # 添加到 messages/zh.json 和 messages/en.json
   hpcApps.pytorch.*
   hpcApps.vllm.*
   ```

4. **创建AI应用管理页面**
   ```bash
   app/[locale]/dashboard/applications/ai/page.tsx
   ```

5. **运行注册脚本**
   ```bash
   npx tsx scripts/register-ai-apps.ts
   ```

### 阶段2: UI和权限 (Week 3)

1. **创建GPU选择器组件**
2. **集成权限控制**
3. **添加GPU资源监控**
4. **优化用户体验**

### 阶段3: 高级功能 (Week 4)

1. **模型库管理**
2. **自动资源推荐**
3. **作业模板库**
4. **性能监控仪表盘**

---

## 使用指南

### 管理员操作

#### 1. 初始化AI应用

```bash
cd /opt/my-hpcapp

# 注册AI应用到系统
npx tsx scripts/register-ai-apps.ts

# 验证注册结果
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/applications/ai
```

#### 2. 配置GPU资源

```bash
# 检查GPU分区配置
sinfo -p gpu

# 确保分区存在并配置了GPU资源
# 参考文档: docs/deployment/gpu-configuration.md
```

#### 3. 设置应用权限

在系统设置 -> 应用管理中:
- 配置应用可见性(公开/私有/特定组)
- 设置GPU资源配额
- 管理用户访问权限

### 用户操作

#### 1. 提交PyTorch训练作业

1. 访问应用中心 -> AI工具 -> PyTorch
2. 选择资源配置(单GPU/多GPU/分布式)
3. 上传训练脚本或输入代码
4. 配置运行参数(GPU类型、运行时长等)
5. 提交作业

#### 2. 启动vLLM推理服务

1. 访问应用中心 -> AI工具 -> vLLM
2. 选择模型(LLaMA 2 7B/13B/70B等)
3. 配置GPU资源(根据模型大小)
4. 设置推理参数(max_tokens, temperature等)
5. 启动服务,获取API端点

#### 3. 使用Jupyter Lab

1. 访问应用中心 -> AI工具 -> Jupyter Lab
2. 选择资源配置(轻量级/标准/GPU)
3. 可选: 安装额外Python包
4. 启动会话
5. 在浏览器中打开Jupyter Lab

---

## 性能优化

### 1. 缓存策略

- 应用列表缓存10分钟
- GPU资源状态缓存1分钟
- 模型列表缓存30分钟

### 2. 并发控制

- 批量注册应用使用事务
- GPU资源查询使用连接池
- 作业提交使用队列

### 3. 资源监控

- 实时GPU利用率
- 作业排队时长
- 用户配额使用情况

---

## 安全考虑

### 1. 权限控制

- 应用级别权限(谁可以看到/使用应用)
- 资源级别权限(GPU配额限制)
- 数据级别权限(模型和数据集访问控制)

### 2. 资源隔离

- 用户作业使用独立的工作目录
- GPU资源通过Slurm cgroup隔离
- 网络端口随机分配避免冲突

### 3. 审计日志

- 记录所有应用提交操作
- 记录GPU资源分配和释放
- 记录异常访问和错误

---

## 故障排查

### 常见问题

#### 1. 应用未显示在列表中

**排查步骤**:
```bash
# 检查数据库
psql -U postgres -c "SELECT name, version, status FROM hpc_applications WHERE metadata->>'category' = 'machine-learning';"

# 检查缓存
curl http://localhost:3000/api/applications/clear-cache

# 重新注册
npx tsx scripts/register-ai-apps.ts
```

#### 2. GPU资源不可用

**排查步骤**:
```bash
# 检查Slurm GPU配置
scontrol show partition gpu

# 检查GPU状态
sinfo -p gpu -o "%P %a %l %D %N %G"

# 检查GPU分配
squeue -p gpu -o "%.18i %.9P %.8j %.8u %.2t %.10M %.6D %R %b"
```

#### 3. 作业提交失败

**排查步骤**:
- 检查应用定义是否正确
- 验证GPU资源配额
- 查看Slurm错误日志
- 检查用户权限

---

## 后续扩展

### 短期 (1-2个月)

- [ ] TensorFlow应用集成
- [ ] DeepSpeed分布式训练
- [ ] RAPIDS GPU加速数据科学
- [ ] MLflow实验管理

### 中期 (3-6个月)

- [ ] Ray分布式计算框架
- [ ] Triton推理服务器
- [ ] AutoML工具链(AutoGluon, H2O)
- [ ] 模型市场和共享

### 长期 (6-12个月)

- [ ] 联邦学习支持
- [ ] 模型压缩和量化工具
- [ ] AI工作流编排
- [ ] 云原生AI平台集成

---

## 参考资料

- [Jupyter Lab集成文档](../../archive/root-legacy/JUPYTER_LAB_INTEGRATION.md)
- [AI集成计划](../../archive/root-legacy/AI_INTEGRATION_PLAN.md)
- [应用权限管理](./APPLICATION_CENTER_WITH_PERMISSION.md)
- [PyTorch文档](https://pytorch.org/docs/stable/index.html)
- [vLLM文档](https://docs.vllm.ai/)
- [Slurm GPU调度](https://slurm.schedmd.com/gres.html)

---

**创建时间**: 2025-10-24
**版本**: v1.0
**维护者**: HPC Platform Team
