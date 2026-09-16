# AI计算工具集成实施方案

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 概述
本方案为HPC管理平台集成常用AI计算工具,提升深度学习、大模型推理、机器学习等AI计算能力。

---

## 🎯 集成工具清单

### 阶段1: 基础AI框架 (优先级: P0)
- **PyTorch** - 深度学习框架
- **TensorFlow** - 生产级ML框架
- **Jupyter Lab** - 交互式开发环境
- **vLLM** - 高性能LLM推理

### 阶段2: 加速与优化 (优先级: P1)
- **RAPIDS** - GPU加速数据科学
- **DeepSpeed** - 大模型训练优化
- **TensorRT** - 推理加速
- **Ray** - 分布式计算框架

### 阶段3: 高级工具 (优先级: P2)
- **MLflow** - 实验管理
- **Triton Server** - 多框架推理
- **Optuna** - 超参数优化
- **Weights & Biases** - 实验追踪

---

## 📦 阶段1实施细节

### 1. PyTorch应用集成

#### 环境准备
```bash
# 安装PyTorch环境模块
module load cuda/12.1
module load cudnn/8.9
module load python/3.11

# 创建虚拟环境
python -m venv /opt/software/pytorch-env
source /opt/software/pytorch-env/bin/activate
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
```

#### 应用定义文件
创建 `lib/applications/ai/pytorch.ts`:

```typescript
import { HpcApplicationSpec, ApplicationCategory, ApplicationType } from '../../hpc-application-spec'

export const pytorchApp: HpcApplicationSpec = {
  metadata: {
    name: 'pytorch',
    displayNameKey: 'hpcApps.pytorch.metadata.displayName',
    version: '2.1',
    description: 'PyTorch Deep Learning Framework',
    descriptionKey: 'hpcApps.pytorch.metadata.description',
    author: 'Meta AI',
    homepage: 'https://pytorch.org',
    license: 'BSD-3',
    tags: ['deep-learning', 'neural-networks', 'gpu', 'ai'],
    category: ApplicationCategory.DEEP_LEARNING,
    type: [ApplicationType.BATCH, ApplicationType.GPU, ApplicationType.INTERACTIVE, ApplicationType.JUPYTER],
    icon: {
      type: 'emoji',
      emoji: '🔥'
    }
  },

  requirements: {
    modules: ['cuda/12.1', 'cudnn/8.9', 'python/3.11'],
    software: [
      { name: 'pytorch', version: '2.1.0' },
      { name: 'cuda', version: '12.1' }
    ],
    hardware: {
      gpu: {
        required: true,
        count: { min: 1, max: 8, default: 1 },
        memory: '16GB',
        architecture: ['CUDA'],
        features: ['compute_capability_7.0+']
      },
      cpu: {
        cores: { min: 4, max: 64, default: 8 }
      },
      memory: {
        min: '16GB',
        max: '512GB',
        default: '32GB',
        perCore: '4GB'
      }
    },
    os: ['linux'],
    arch: ['x86_64'],
    installPath: '/opt/software/pytorch-env',
    environmentVars: {
      PYTORCH_CUDA_ALLOC_CONF: 'max_split_size_mb:512'
    }
  },

  resources: {
    default: {
      name: 'default',
      descriptionKey: 'hpcApps.pytorch.resources.profiles.default.description',
      partition: 'gpu',
      nodes: 1,
      cpusPerTask: 8,
      memory: '32GB',
      walltime: '4:00:00',
      gpu: {
        count: 1,
        type: 'A100'
      },
      recommended: true
    },
    profiles: [
      {
        name: 'small-gpu',
        descriptionKey: 'hpcApps.pytorch.resources.profiles.smallGpu.description',
        partition: 'gpu',
        nodes: 1,
        cpusPerTask: 4,
        memory: '16GB',
        walltime: '2:00:00',
        gpu: { count: 1, type: 'RTX3090' }
      },
      {
        name: 'multi-gpu',
        descriptionKey: 'hpcApps.pytorch.resources.profiles.multiGpu.description',
        partition: 'gpu',
        nodes: 1,
        cpusPerTask: 16,
        memory: '64GB',
        walltime: '8:00:00',
        gpu: { count: 4, type: 'A100' }
      },
      {
        name: 'distributed',
        descriptionKey: 'hpcApps.pytorch.resources.profiles.distributed.description',
        partition: 'gpu',
        nodes: 4,
        tasksPerNode: 4,
        cpusPerTask: 8,
        memory: '128GB',
        walltime: '24:00:00',
        gpu: { count: 16, type: 'A100' }
      }
    ]
  },

  execution: {
    modes: [
      {
        name: 'batch',
        type: ApplicationType.BATCH,
        descriptionKey: 'hpcApps.pytorch.execution.modes.batch.description',
        interactive: false
      },
      {
        name: 'interactive',
        type: ApplicationType.INTERACTIVE,
        descriptionKey: 'hpcApps.pytorch.execution.modes.interactive.description',
        interactive: true
      },
      {
        name: 'distributed',
        type: ApplicationType.MPI,
        descriptionKey: 'hpcApps.pytorch.execution.modes.distributed.description',
        parallel: {
          type: 'mpi',
          maxProcs: 128
        }
      }
    ],
    preScript: `
# PyTorch环境初始化
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK
export NCCL_DEBUG=INFO

# 激活虚拟环境
source /opt/software/pytorch-env/bin/activate

# 显示GPU信息
nvidia-smi
`,
    templates: [
      {
        name: 'single-gpu',
        descriptionKey: 'hpcApps.pytorch.execution.templates.singleGpu.description',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --partition={{partition}}
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --gres=gpu:{{gpuType}}:{{gpuCount}}
#SBATCH --output={{jobName}}_%j.out
#SBATCH --error={{jobName}}_%j.err

# 加载模块
module load cuda/12.1 cudnn/8.9 python/3.11

# 激活环境
source /opt/software/pytorch-env/bin/activate

# 环境变量
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK

# 显示GPU信息
nvidia-smi

# 运行训练脚本
{{#if scriptFile}}
python {{scriptFile}} {{#if scriptArgs}}{{scriptArgs}}{{/if}}
{{else}}
python -c "{{pythonCode}}"
{{/if}}
`,
        variables: [
          { name: 'jobName', source: 'form' },
          { name: 'partition', source: 'form' },
          { name: 'cpusPerTask', source: 'form' },
          { name: 'memory', source: 'form' },
          { name: 'walltime', source: 'form' },
          { name: 'gpuType', source: 'form', default: 'A100' },
          { name: 'gpuCount', source: 'form', default: '1' },
          { name: 'scriptFile', source: 'form' },
          { name: 'scriptArgs', source: 'form' },
          { name: 'pythonCode', source: 'form' }
        ]
      },
      {
        name: 'distributed-ddp',
        descriptionKey: 'hpcApps.pytorch.execution.templates.distributedDdp.description',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --partition={{partition}}
#SBATCH --nodes={{nodes}}
#SBATCH --ntasks-per-node={{gpuPerNode}}
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --gres=gpu:{{gpuType}}:{{gpuPerNode}}
#SBATCH --output={{jobName}}_%j.out
#SBATCH --error={{jobName}}_%j.err

# 加载模块
module load cuda/12.1 cudnn/8.9 python/3.11 nccl/2.18

# 激活环境
source /opt/software/pytorch-env/bin/activate

# 分布式训练环境变量
export MASTER_ADDR=$(scontrol show hostname $SLURM_JOB_NODELIST | head -n 1)
export MASTER_PORT=29500
export WORLD_SIZE=$SLURM_NTASKS
export NCCL_DEBUG=INFO
export NCCL_IB_DISABLE=0
export NCCL_NET_GDR_LEVEL=5

# 显示配置信息
echo "Master node: $MASTER_ADDR"
echo "World size: $WORLD_SIZE"
echo "Nodes: $SLURM_NNODES"
echo "GPUs per node: {{gpuPerNode}}"

# 运行分布式训练
srun python {{scriptFile}} \\
  --world-size $WORLD_SIZE \\
  --dist-backend nccl \\
  {{#if scriptArgs}}{{scriptArgs}}{{/if}}
`
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'jobName',
        labelKey: 'hpcApps.pytorch.fields.jobName.label',
        type: 'text',
        required: true,
        default: 'pytorch-training',
        validation: {
          pattern: '^[a-zA-Z0-9_-]+$',
          maxLength: 50
        }
      },
      {
        name: 'executionMode',
        labelKey: 'hpcApps.pytorch.fields.executionMode.label',
        type: 'select',
        required: true,
        default: 'single-gpu',
        options: [
          { value: 'single-gpu', labelKey: 'hpcApps.pytorch.fields.executionMode.options.singleGpu.label' },
          { value: 'multi-gpu', labelKey: 'hpcApps.pytorch.fields.executionMode.options.multiGpu.label' },
          { value: 'distributed-ddp', labelKey: 'hpcApps.pytorch.fields.executionMode.options.distributedDdp.label' }
        ]
      },
      {
        name: 'resourceProfile',
        labelKey: 'hpcApps.pytorch.fields.resourceProfile.label',
        type: 'select',
        required: true,
        default: 'default',
        options: [
          { value: 'default', labelKey: 'hpcApps.pytorch.fields.resourceProfile.options.default.label' },
          { value: 'small-gpu', labelKey: 'hpcApps.pytorch.fields.resourceProfile.options.smallGpu.label' },
          { value: 'multi-gpu', labelKey: 'hpcApps.pytorch.fields.resourceProfile.options.multiGpu.label' },
          { value: 'distributed', labelKey: 'hpcApps.pytorch.fields.resourceProfile.options.distributed.label' }
        ]
      },
      {
        name: 'inputType',
        labelKey: 'hpcApps.pytorch.fields.inputType.label',
        type: 'select',
        required: true,
        default: 'script',
        options: [
          { value: 'script', labelKey: 'hpcApps.pytorch.fields.inputType.options.script.label' },
          { value: 'code', labelKey: 'hpcApps.pytorch.fields.inputType.options.code.label' }
        ]
      },
      {
        name: 'scriptFile',
        labelKey: 'hpcApps.pytorch.fields.scriptFile.label',
        type: 'file',
        accept: ['.py'],
        required: true,
        condition: {
          field: 'inputType',
          value: 'script'
        }
      },
      {
        name: 'scriptArgs',
        labelKey: 'hpcApps.pytorch.fields.scriptArgs.label',
        type: 'text',
        placeholderKey: 'hpcApps.pytorch.fields.scriptArgs.placeholder',
        condition: {
          field: 'inputType',
          value: 'script'
        }
      },
      {
        name: 'pythonCode',
        labelKey: 'hpcApps.pytorch.fields.pythonCode.label',
        type: 'textarea',
        required: true,
        condition: {
          field: 'inputType',
          value: 'code'
        }
      },
      {
        name: 'dataFiles',
        labelKey: 'hpcApps.pytorch.fields.dataFiles.label',
        type: 'file',
        multiple: true,
        accept: ['.pt', '.pth', '.pkl', '.h5', '.npy', '.npz', '.csv'],
        descriptionKey: 'hpcApps.pytorch.fields.dataFiles.description'
      },
      {
        name: 'gpuType',
        labelKey: 'hpcApps.pytorch.fields.gpuType.label',
        type: 'select',
        default: 'A100',
        options: [
          { value: 'A100', labelKey: 'hpcApps.pytorch.fields.gpuType.options.a100.label' },
          { value: 'V100', labelKey: 'hpcApps.pytorch.fields.gpuType.options.v100.label' },
          { value: 'RTX3090', labelKey: 'hpcApps.pytorch.fields.gpuType.options.rtx3090.label' }
        ]
      },
      {
        name: 'walltime',
        labelKey: 'hpcApps.pytorch.fields.walltime.label',
        type: 'select',
        required: true,
        default: '4:00:00',
        options: [
          { value: '1:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.1hour.label' },
          { value: '4:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.4hours.label' },
          { value: '8:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.8hours.label' },
          { value: '24:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.24hours.label' },
          { value: '72:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.72hours.label' }
        ]
      }
    ]
  },

  io: {
    inputs: [
      {
        name: 'training-script',
        type: 'file',
        pattern: '*.py',
        required: true,
        descriptionKey: 'hpcApps.pytorch.io.inputs.trainingScript.description'
      },
      {
        name: 'dataset',
        type: 'directory',
        descriptionKey: 'hpcApps.pytorch.io.inputs.dataset.description'
      },
      {
        name: 'checkpoint',
        type: 'file',
        pattern: '*.{pt,pth}',
        descriptionKey: 'hpcApps.pytorch.io.inputs.checkpoint.description'
      }
    ],
    outputs: [
      {
        name: 'model',
        type: 'file',
        pattern: '*.{pt,pth}',
        descriptionKey: 'hpcApps.pytorch.io.outputs.model.description'
      },
      {
        name: 'logs',
        type: 'directory',
        descriptionKey: 'hpcApps.pytorch.io.outputs.logs.description'
      },
      {
        name: 'checkpoints',
        type: 'directory',
        descriptionKey: 'hpcApps.pytorch.io.outputs.checkpoints.description'
      }
    ],
    workingDir: '$SLURM_SUBMIT_DIR'
  },

  access: {
    roles: ['student', 'researcher', 'faculty'],
    conditions: [
      {
        type: 'quota',
        condition: 'user.gpu_hours_used < user.gpu_hours_limit',
        message: 'GPU quota exceeded'
      }
    ]
  }
}
```

---

### 2. vLLM应用集成

创建 `lib/applications/ai/vllm.ts`:

```typescript
export const vllmApp: HpcApplicationSpec = {
  metadata: {
    name: 'vllm',
    displayNameKey: 'hpcApps.vllm.metadata.displayName',
    version: '0.4.0',
    description: 'High-performance LLM inference engine',
    descriptionKey: 'hpcApps.vllm.metadata.description',
    author: 'vLLM Team',
    homepage: 'https://github.com/vllm-project/vllm',
    license: 'Apache-2.0',
    tags: ['llm', 'inference', 'transformer', 'gpu', 'ai'],
    category: ApplicationCategory.MACHINE_LEARNING,
    type: [ApplicationType.BATCH, ApplicationType.GPU, ApplicationType.WEB],
    icon: {
      type: 'emoji',
      emoji: '⚡'
    }
  },

  requirements: {
    modules: ['cuda/12.1', 'python/3.11'],
    software: [
      { name: 'vllm', version: '0.4.0' },
      { name: 'cuda', version: '12.1' }
    ],
    hardware: {
      gpu: {
        required: true,
        count: { min: 1, max: 8, default: 1 },
        memory: '24GB',
        architecture: ['CUDA'],
        features: ['compute_capability_8.0+']
      },
      cpu: {
        cores: { min: 8, max: 64, default: 16 }
      },
      memory: {
        min: '64GB',
        max: '512GB',
        default: '128GB'
      }
    },
    installPath: '/opt/software/vllm-env',
    environmentVars: {
      VLLM_WORKER_MULTIPROC_METHOD: 'spawn'
    }
  },

  resources: {
    default: {
      name: 'default',
      descriptionKey: 'hpcApps.vllm.resources.profiles.default.description',
      partition: 'gpu',
      nodes: 1,
      cpusPerTask: 16,
      memory: '128GB',
      walltime: '8:00:00',
      gpu: {
        count: 1,
        type: 'A100-80GB'
      },
      recommended: true
    },
    profiles: [
      {
        name: 'llama2-7b',
        descriptionKey: 'hpcApps.vllm.resources.profiles.llama27b.description',
        partition: 'gpu',
        nodes: 1,
        cpusPerTask: 8,
        memory: '64GB',
        walltime: '4:00:00',
        gpu: { count: 1, type: 'A100-40GB' }
      },
      {
        name: 'llama2-70b',
        descriptionKey: 'hpcApps.vllm.resources.profiles.llama270b.description',
        partition: 'gpu',
        nodes: 1,
        cpusPerTask: 32,
        memory: '256GB',
        walltime: '12:00:00',
        gpu: { count: 4, type: 'A100-80GB' }
      }
    ]
  },

  execution: {
    templates: [
      {
        name: 'vllm-server',
        descriptionKey: 'hpcApps.vllm.execution.templates.vllmServer.description',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --partition={{partition}}
#SBATCH --nodes=1
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --gres=gpu:{{gpuType}}:{{gpuCount}}
#SBATCH --output={{jobName}}_%j.out

# 加载模块
module load cuda/12.1 python/3.11

# 激活环境
source /opt/software/vllm-env/bin/activate

# 启动vLLM服务器
python -m vllm.entrypoints.openai.api_server \\
  --model {{modelPath}} \\
  --tensor-parallel-size {{gpuCount}} \\
  --max-model-len {{maxModelLen}} \\
  --gpu-memory-utilization {{gpuMemUtil}} \\
  --host 0.0.0.0 \\
  --port {{serverPort}}
`
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'modelPath',
        labelKey: 'hpcApps.vllm.fields.modelPath.label',
        type: 'select',
        required: true,
        apiEndpoint: '/api/models/list',
        options: [
          { value: '/models/llama-2-7b', labelKey: 'hpcApps.vllm.fields.modelPath.options.llama27b.label' },
          { value: '/models/llama-2-13b', labelKey: 'hpcApps.vllm.fields.modelPath.options.llama213b.label' },
          { value: '/models/mistral-7b', labelKey: 'hpcApps.vllm.fields.modelPath.options.mistral7b.label' }
        ]
      },
      {
        name: 'maxModelLen',
        labelKey: 'hpcApps.vllm.fields.maxModelLen.label',
        type: 'select',
        default: '4096',
        options: [
          { value: '2048', labelKey: 'hpcApps.vllm.fields.maxModelLen.options.2048.label' },
          { value: '4096', labelKey: 'hpcApps.vllm.fields.maxModelLen.options.4096.label' },
          { value: '8192', labelKey: 'hpcApps.vllm.fields.maxModelLen.options.8192.label' },
          { value: '16384', labelKey: 'hpcApps.vllm.fields.maxModelLen.options.16384.label' }
        ]
      },
      {
        name: 'gpuMemUtil',
        labelKey: 'hpcApps.vllm.fields.gpuMemUtil.label',
        type: 'slider',
        min: 0.5,
        max: 0.95,
        step: 0.05,
        default: 0.9
      }
    ]
  }
}
```

---

### 3. Jupyter Lab集成

创建 `lib/applications/ai/jupyter.ts`:

```typescript
export const jupyterApp: HpcApplicationSpec = {
  metadata: {
    name: 'jupyter',
    displayNameKey: 'hpcApps.jupyter.metadata.displayName',
    version: '4.0',
    description: 'Interactive Python development environment',
    descriptionKey: 'hpcApps.jupyter.metadata.description',
    tags: ['jupyter', 'notebook', 'python', 'interactive'],
    category: ApplicationCategory.DEVELOPMENT_TOOLS,
    type: [ApplicationType.JUPYTER, ApplicationType.WEB, ApplicationType.INTERACTIVE],
    icon: {
      type: 'emoji',
      emoji: '📓'
    }
  },

  requirements: {
    modules: ['python/3.11', 'nodejs/18'],
    software: [
      { name: 'jupyterlab', version: '4.0' }
    ],
    hardware: {
      gpu: {
        required: false,
        count: { min: 0, max: 2, default: 0 }
      },
      cpu: {
        cores: { min: 2, max: 16, default: 4 }
      },
      memory: {
        min: '8GB',
        max: '128GB',
        default: '16GB'
      }
    },
    installPath: '/opt/software/jupyter-env'
  },

  execution: {
    templates: [
      {
        name: 'jupyter-server',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --partition={{partition}}
#SBATCH --nodes=1
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
{{#if gpuCount}}
#SBATCH --gres=gpu:{{gpuCount}}
{{/if}}

# 激活环境
source /opt/software/jupyter-env/bin/activate

# 生成Jupyter配置
mkdir -p ~/.jupyter
JUPYTER_TOKEN=$(openssl rand -hex 16)
echo "Jupyter token: $JUPYTER_TOKEN" > jupyter_token.txt

# 获取主机IP
JUPYTER_HOST=$(hostname -i)
JUPYTER_PORT={{serverPort}}

# 启动Jupyter Lab
jupyter lab \\
  --ip=$JUPYTER_HOST \\
  --port=$JUPYTER_PORT \\
  --no-browser \\
  --NotebookApp.token=$JUPYTER_TOKEN \\
  --NotebookApp.allow_origin='*' \\
  --NotebookApp.disable_check_xsrf=True

echo "Jupyter Lab URL: http://$JUPYTER_HOST:$JUPYTER_PORT/?token=$JUPYTER_TOKEN"
`
      }
    ]
  }
}
```

---

## 🔧 系统集成步骤

### Step 1: 创建AI应用注册表
```bash
mkdir -p /opt/my-hpcapp/lib/applications/ai
```

### Step 2: 添加国际化翻译
在 `messages/zh.json` 和 `messages/en.json` 中添加相应的翻译键。

### Step 3: 注册应用到数据库
创建 `scripts/register-ai-apps.ts`:

```typescript
import { ApplicationRegistry } from '../lib/application-registry'
import { pytorchApp } from '../lib/applications/ai/pytorch'
import { vllmApp } from '../lib/applications/ai/vllm'
import { jupyterApp } from '../lib/applications/ai/jupyter'

async function registerAIApps() {
  const registry = ApplicationRegistry.getInstance()

  const apps = [pytorchApp, vllmApp, jupyterApp]

  const result = await registry.registerBatch(apps)

  console.log(`成功注册: ${result.success}`)
  console.log(`失败: ${result.failed}`)
  if (result.errors.length > 0) {
    console.error('错误:', result.errors)
  }
}

registerAIApps()
```

### Step 4: 创建AI应用页面
在 `app/[locale]/dashboard/applications/ai/page.tsx` 中创建AI应用管理页面。

---

## 📊 预期效果

### 用户体验
- ✅ 一键提交PyTorch训练作业
- ✅ 可视化选择GPU类型和数量
- ✅ 支持单GPU、多GPU、分布式训练
- ✅ 自动环境配置和依赖管理
- ✅ 实时作业监控和日志查看

### 性能优化
- ✅ GPU资源智能分配
- ✅ 自动检测最优配置
- ✅ 支持混合精度训练
- ✅ 张量并行和数据并行

---

## 🚀 后续扩展

### 短期(1个月)
- TensorFlow集成
- RAPIDS加速库
- MLflow实验管理

### 中期(3个月)
- DeepSpeed优化
- Ray分布式计算
- Triton推理服务器

### 长期(6个月)
- AutoML工具链
- 模型市场
- 联邦学习支持

---

## 📝 注意事项

1. **GPU资源管理**: 需配置Slurm的GPU资源调度
2. **许可证**: 部分工具需要商业许可证
3. **存储**: AI模型和数据集需要大容量存储
4. **网络**: 分布式训练需要高速互连(InfiniBand)
5. **安全**: 模型文件访问权限控制

---

## 📚 参考文档

- [PyTorch HPC Best Practices](https://pytorch.org/tutorials/intermediate/dist_tuto.html)
- [vLLM Documentation](https://docs.vllm.ai)
- [Slurm GPU Scheduling](https://slurm.schedmd.com/gres.html)
- [NVIDIA GPU Cloud](https://catalog.ngc.nvidia.com/)
