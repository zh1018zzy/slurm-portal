import { HpcApplicationSpec, ApplicationCategory, ApplicationType } from '../../hpc-application-spec'

/**
 * PyTorch 深度学习框架应用定义
 * 支持单GPU、多GPU和分布式训练
 */
export const pytorchApp: HpcApplicationSpec = {
  metadata: {
    name: 'pytorch',
    displayNameKey: 'hpcApps.pytorch.metadata.displayName',
    version: '2.1.0',
    description: 'PyTorch Deep Learning Framework with GPU acceleration support',
    descriptionKey: 'hpcApps.pytorch.metadata.description',
    author: 'Meta AI',
    homepage: 'https://pytorch.org',
    documentation: 'https://pytorch.org/docs/stable/index.html',
    license: 'BSD-3-Clause',
    tags: ['deep-learning', 'neural-networks', 'gpu', 'ai', 'machine-learning', 'pytorch'],
    category: ApplicationCategory.DEEP_LEARNING,
    type: [ApplicationType.BATCH, ApplicationType.GPU, ApplicationType.INTERACTIVE, ApplicationType.MPI],
    icon: {
      type: 'emoji',
      emoji: '🔥'
    }
  },

  requirements: {
    modules: ['cuda/12.1', 'cudnn/8.9', 'python/3.11', 'nccl/2.18'],
    software: [
      { name: 'pytorch', version: '2.1.0' },
      { name: 'torchvision', version: '0.16.0' },
      { name: 'cuda', version: '12.1' },
      { name: 'python', version: '3.11+' }
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
      PYTORCH_CUDA_ALLOC_CONF: 'max_split_size_mb:512',
      OMP_NUM_THREADS: '$SLURM_CPUS_PER_TASK',
      NCCL_DEBUG: 'INFO'
    }
  },

  resources: {
    default: {
      name: 'default',
      description: 'Standard GPU training configuration',
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
        description: 'Small scale training (single RTX3090)',
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
        description: 'Multi-GPU training (4x A100)',
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
        description: 'Distributed training across multiple nodes',
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
        name: 'single-gpu',
        type: ApplicationType.BATCH,
        description: 'Single GPU training',
        descriptionKey: 'hpcApps.pytorch.execution.modes.singleGpu.description',
        interactive: false
      },
      {
        name: 'multi-gpu',
        type: ApplicationType.GPU,
        description: 'Multi-GPU training with DataParallel',
        descriptionKey: 'hpcApps.pytorch.execution.modes.multiGpu.description',
        interactive: false
      },
      {
        name: 'distributed-ddp',
        type: ApplicationType.MPI,
        description: 'Distributed training with DistributedDataParallel',
        descriptionKey: 'hpcApps.pytorch.execution.modes.distributedDdp.description',
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
echo "=== GPU Information ==="
nvidia-smi
echo "======================="
`,
    templates: [
      {
        name: 'single-gpu',
        description: 'Single GPU training template',
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
#SBATCH --output={{logDir}}/{{jobName}}_%j.out
#SBATCH --error={{logDir}}/{{jobName}}_%j.err

# 加载模块
module purge
module load cuda/12.1 cudnn/8.9 python/3.11

# 激活环境
source /opt/software/pytorch-env/bin/activate

# 环境变量
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK
export CUDA_VISIBLE_DEVICES=0

# 创建日志目录
mkdir -p {{logDir}}

# 显示配置信息
echo "=== Job Configuration ==="
echo "Job ID: $SLURM_JOB_ID"
echo "Job Name: {{jobName}}"
echo "Node: $SLURM_NODELIST"
echo "GPU Type: {{gpuType}}"
echo "GPU Count: {{gpuCount}}"
echo "CPUs: {{cpusPerTask}}"
echo "Memory: {{memory}}"
echo "=========================="

# 显示GPU信息
nvidia-smi

# 显示PyTorch版本
python -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA: {torch.version.cuda}'); print(f'GPU Available: {torch.cuda.is_available()}')"

# 运行训练脚本
echo "=== Starting Training ==="
{{#if scriptFile}}
python {{scriptFile}} {{#if scriptArgs}}{{scriptArgs}}{{/if}}
{{else}}
python -c "{{pythonCode}}"
{{/if}}

echo "=== Training Completed ==="
`,
        variables: [
          { name: 'jobName', source: 'form', default: 'pytorch-training' },
          { name: 'partition', source: 'form', default: 'gpu' },
          { name: 'cpusPerTask', source: 'form', default: '8' },
          { name: 'memory', source: 'form', default: '32GB' },
          { name: 'walltime', source: 'form', default: '4:00:00' },
          { name: 'gpuType', source: 'form', default: 'A100' },
          { name: 'gpuCount', source: 'form', default: '1' },
          { name: 'scriptFile', source: 'form' },
          { name: 'scriptArgs', source: 'form' },
          { name: 'pythonCode', source: 'form' },
          { name: 'logDir', source: 'system', default: '$HOME/pytorch_logs' }
        ]
      },
      {
        name: 'multi-gpu',
        description: 'Multi-GPU DataParallel training template',
        descriptionKey: 'hpcApps.pytorch.execution.templates.multiGpu.description',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --partition={{partition}}
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --gres=gpu:{{gpuType}}:{{gpuCount}}
#SBATCH --output={{logDir}}/{{jobName}}_%j.out
#SBATCH --error={{logDir}}/{{jobName}}_%j.err

# 加载模块
module purge
module load cuda/12.1 cudnn/8.9 python/3.11

# 激活环境
source /opt/software/pytorch-env/bin/activate

# 环境变量
export PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512
export OMP_NUM_THREADS=$SLURM_CPUS_PER_TASK

# 创建日志目录
mkdir -p {{logDir}}

# 显示配置信息
echo "=== Multi-GPU Training Configuration ==="
echo "Job ID: $SLURM_JOB_ID"
echo "GPU Count: {{gpuCount}}"
echo "GPU Type: {{gpuType}}"
nvidia-smi

# 运行多GPU训练
python {{scriptFile}} \\
  --gpu-count {{gpuCount}} \\
  {{#if scriptArgs}}{{scriptArgs}}{{/if}}
`
      },
      {
        name: 'distributed-ddp',
        description: 'Distributed DistributedDataParallel training',
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
#SBATCH --output={{logDir}}/{{jobName}}_%j.out
#SBATCH --error={{logDir}}/{{jobName}}_%j.err

# 加载模块
module purge
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

# 创建日志目录
mkdir -p {{logDir}}

# 显示配置信息
echo "=== Distributed Training Configuration ==="
echo "Master node: $MASTER_ADDR"
echo "Master port: $MASTER_PORT"
echo "World size: $WORLD_SIZE"
echo "Nodes: $SLURM_NNODES"
echo "GPUs per node: {{gpuPerNode}}"
echo "Total GPUs: $((SLURM_NNODES * {{gpuPerNode}}))"
echo "=========================================="

# 运行分布式训练
srun python {{scriptFile}} \\
  --world-size $WORLD_SIZE \\
  --dist-backend nccl \\
  {{#if scriptArgs}}{{scriptArgs}}{{/if}}
`,
        variables: [
          { name: 'nodes', source: 'form', default: '2' },
          { name: 'gpuPerNode', source: 'form', default: '4' }
        ]
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
        descriptionKey: 'hpcApps.pytorch.fields.jobName.description',
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
        descriptionKey: 'hpcApps.pytorch.fields.executionMode.description',
        options: [
          {
            value: 'single-gpu',
            labelKey: 'hpcApps.pytorch.fields.executionMode.options.singleGpu.label',
            descriptionKey: 'hpcApps.pytorch.fields.executionMode.options.singleGpu.description'
          },
          {
            value: 'multi-gpu',
            labelKey: 'hpcApps.pytorch.fields.executionMode.options.multiGpu.label',
            descriptionKey: 'hpcApps.pytorch.fields.executionMode.options.multiGpu.description'
          },
          {
            value: 'distributed-ddp',
            labelKey: 'hpcApps.pytorch.fields.executionMode.options.distributedDdp.label',
            descriptionKey: 'hpcApps.pytorch.fields.executionMode.options.distributedDdp.description'
          }
        ]
      },
      {
        name: 'resourceProfile',
        labelKey: 'hpcApps.pytorch.fields.resourceProfile.label',
        type: 'select',
        required: true,
        default: 'default',
        descriptionKey: 'hpcApps.pytorch.fields.resourceProfile.description',
        options: [
          {
            value: 'default',
            labelKey: 'hpcApps.pytorch.fields.resourceProfile.options.default.label',
            descriptionKey: 'hpcApps.pytorch.fields.resourceProfile.options.default.description'
          },
          {
            value: 'small-gpu',
            labelKey: 'hpcApps.pytorch.fields.resourceProfile.options.smallGpu.label',
            descriptionKey: 'hpcApps.pytorch.fields.resourceProfile.options.smallGpu.description'
          },
          {
            value: 'multi-gpu',
            labelKey: 'hpcApps.pytorch.fields.resourceProfile.options.multiGpu.label',
            descriptionKey: 'hpcApps.pytorch.fields.resourceProfile.options.multiGpu.description'
          },
          {
            value: 'distributed',
            labelKey: 'hpcApps.pytorch.fields.resourceProfile.options.distributed.label',
            descriptionKey: 'hpcApps.pytorch.fields.resourceProfile.options.distributed.description'
          }
        ]
      },
      {
        name: 'inputType',
        labelKey: 'hpcApps.pytorch.fields.inputType.label',
        type: 'select',
        required: true,
        default: 'script',
        descriptionKey: 'hpcApps.pytorch.fields.inputType.description',
        options: [
          {
            value: 'script',
            labelKey: 'hpcApps.pytorch.fields.inputType.options.script.label',
            descriptionKey: 'hpcApps.pytorch.fields.inputType.options.script.description'
          },
          {
            value: 'code',
            labelKey: 'hpcApps.pytorch.fields.inputType.options.code.label',
            descriptionKey: 'hpcApps.pytorch.fields.inputType.options.code.description'
          }
        ]
      },
      {
        name: 'scriptFile',
        labelKey: 'hpcApps.pytorch.fields.scriptFile.label',
        type: 'file',
        accept: ['.py'],
        required: true,
        descriptionKey: 'hpcApps.pytorch.fields.scriptFile.description',
        condition: {
          field: 'inputType',
          value: 'script'
        }
      },
      {
        name: 'scriptArgs',
        labelKey: 'hpcApps.pytorch.fields.scriptArgs.label',
        type: 'text',
        descriptionKey: 'hpcApps.pytorch.fields.scriptArgs.description',
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
        descriptionKey: 'hpcApps.pytorch.fields.pythonCode.description',
        placeholderKey: 'hpcApps.pytorch.fields.pythonCode.placeholder',
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
        accept: ['.pt', '.pth', '.pkl', '.h5', '.npy', '.npz', '.csv', '.json'],
        descriptionKey: 'hpcApps.pytorch.fields.dataFiles.description'
      },
      {
        name: 'gpuType',
        labelKey: 'hpcApps.pytorch.fields.gpuType.label',
        type: 'select',
        default: 'A100',
        descriptionKey: 'hpcApps.pytorch.fields.gpuType.description',
        options: [
          {
            value: 'A100',
            labelKey: 'hpcApps.pytorch.fields.gpuType.options.a100.label',
            descriptionKey: 'hpcApps.pytorch.fields.gpuType.options.a100.description'
          },
          {
            value: 'V100',
            labelKey: 'hpcApps.pytorch.fields.gpuType.options.v100.label',
            descriptionKey: 'hpcApps.pytorch.fields.gpuType.options.v100.description'
          },
          {
            value: 'RTX3090',
            labelKey: 'hpcApps.pytorch.fields.gpuType.options.rtx3090.label',
            descriptionKey: 'hpcApps.pytorch.fields.gpuType.options.rtx3090.description'
          }
        ]
      },
      {
        name: 'gpuCount',
        labelKey: 'hpcApps.pytorch.fields.gpuCount.label',
        type: 'select',
        default: '1',
        descriptionKey: 'hpcApps.pytorch.fields.gpuCount.description',
        options: [
          { value: '1', labelKey: 'hpcApps.pytorch.fields.gpuCount.options.1.label' },
          { value: '2', labelKey: 'hpcApps.pytorch.fields.gpuCount.options.2.label' },
          { value: '4', labelKey: 'hpcApps.pytorch.fields.gpuCount.options.4.label' },
          { value: '8', labelKey: 'hpcApps.pytorch.fields.gpuCount.options.8.label' }
        ]
      },
      {
        name: 'walltime',
        labelKey: 'hpcApps.pytorch.fields.walltime.label',
        type: 'select',
        required: true,
        default: '4:00:00',
        descriptionKey: 'hpcApps.pytorch.fields.walltime.description',
        options: [
          { value: '1:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.1hour.label' },
          { value: '2:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.2hours.label' },
          { value: '4:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.4hours.label' },
          { value: '8:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.8hours.label' },
          { value: '12:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.12hours.label' },
          { value: '24:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.24hours.label' },
          { value: '48:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.48hours.label' },
          { value: '72:00:00', labelKey: 'hpcApps.pytorch.fields.walltime.options.72hours.label' }
        ]
      }
    ],
    layout: {
      sections: [
        {
          title: 'Basic Configuration',
          titleKey: 'hpcApps.pytorch.layout.sections.basicConfig.title',
          fields: ['jobName', 'executionMode', 'resourceProfile']
        },
        {
          title: 'Training Script',
          titleKey: 'hpcApps.pytorch.layout.sections.trainingScript.title',
          fields: ['inputType', 'scriptFile', 'scriptArgs', 'pythonCode']
        },
        {
          title: 'Data Files',
          titleKey: 'hpcApps.pytorch.layout.sections.dataFiles.title',
          fields: ['dataFiles']
        },
        {
          title: 'GPU Resources',
          titleKey: 'hpcApps.pytorch.layout.sections.gpuResources.title',
          fields: ['gpuType', 'gpuCount', 'walltime']
        }
      ]
    }
  },

  io: {
    inputs: [
      {
        name: 'training-script',
        type: 'file',
        pattern: '*.py',
        required: true,
        description: 'PyTorch training script',
        descriptionKey: 'hpcApps.pytorch.io.inputs.trainingScript.description'
      },
      {
        name: 'dataset',
        type: 'directory',
        description: 'Training dataset directory',
        descriptionKey: 'hpcApps.pytorch.io.inputs.dataset.description'
      },
      {
        name: 'checkpoint',
        type: 'file',
        pattern: '*.{pt,pth}',
        description: 'Pre-trained model checkpoint',
        descriptionKey: 'hpcApps.pytorch.io.inputs.checkpoint.description'
      },
      {
        name: 'config',
        type: 'file',
        pattern: '*.{yaml,yml,json}',
        description: 'Training configuration file',
        descriptionKey: 'hpcApps.pytorch.io.inputs.config.description'
      }
    ],
    outputs: [
      {
        name: 'model',
        type: 'file',
        pattern: '*.{pt,pth}',
        description: 'Trained model weights',
        descriptionKey: 'hpcApps.pytorch.io.outputs.model.description'
      },
      {
        name: 'logs',
        type: 'directory',
        description: 'Training logs and metrics',
        descriptionKey: 'hpcApps.pytorch.io.outputs.logs.description'
      },
      {
        name: 'checkpoints',
        type: 'directory',
        description: 'Model checkpoints during training',
        descriptionKey: 'hpcApps.pytorch.io.outputs.checkpoints.description'
      },
      {
        name: 'tensorboard',
        type: 'directory',
        description: 'TensorBoard event files',
        descriptionKey: 'hpcApps.pytorch.io.outputs.tensorboard.description'
      }
    ],
    workingDir: '$SLURM_SUBMIT_DIR'
  },

  monitoring: {
    metrics: [
      { name: 'gpu_utilization', unit: '%', description: 'GPU utilization percentage' },
      { name: 'gpu_memory', unit: 'GB', description: 'GPU memory usage' },
      { name: 'training_loss', unit: '', description: 'Training loss value' },
      { name: 'validation_accuracy', unit: '%', description: 'Validation accuracy' }
    ],
    logParsing: {
      patterns: [
        { name: 'loss', pattern: 'Loss:\\s*([0-9.]+)', type: 'float' },
        { name: 'accuracy', pattern: 'Accuracy:\\s*([0-9.]+)', type: 'float' },
        { name: 'epoch', pattern: 'Epoch:\\s*(\\d+)', type: 'int' }
      ]
    }
  },

  access: {
    roles: ['student', 'researcher', 'faculty', 'admin'],
    groups: [],
    users: [],
    conditions: [
      {
        type: 'quota',
        condition: 'user.gpu_hours_used < user.gpu_hours_limit',
        message: 'GPU compute time quota exceeded'
      },
      {
        type: 'custom',
        condition: 'feature.gpu_training == true',
        message: 'GPU training feature not available in current license'
      }
    ]
  },

  extensions: {
    webAccess: false,
    requiresProxy: false,
    customValidation: true,
    tags: ['featured', 'gpu-required'],
    metadata: {
      difficulty: 'intermediate',
      estimatedTime: '2-24 hours',
      category: 'deep-learning'
    }
  }
}
