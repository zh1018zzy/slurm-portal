import { HpcApplicationSpec, ApplicationCategory, ApplicationType } from '../../hpc-application-spec'

/**
 * Jupyter Lab 应用定义
 * 提供交互式Python开发环境
 */
export const jupyterApp: HpcApplicationSpec = {
  metadata: {
    name: 'jupyter',
    displayNameKey: 'hpcApps.jupyter.metadata.displayName',
    version: '4.0',
    description: 'Interactive Python development environment with Jupyter Lab',
    descriptionKey: 'hpcApps.jupyter.metadata.description',
    author: 'Project Jupyter',
    homepage: 'https://jupyter.org',
    license: 'BSD-3',
    tags: ['jupyter', 'notebook', 'python', 'interactive', 'data-science', 'ai'],
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
      { name: 'jupyterlab', version: '4.0+' },
      { name: 'python', version: '3.11+' },
      { name: 'nodejs', version: '18+' }
    ],
    hardware: {
      gpu: {
        required: false,
        count: { min: 0, max: 4, default: 0 }
      },
      cpu: {
        cores: { min: 2, max: 32, default: 4 }
      },
      memory: {
        min: '4GB',
        max: '256GB',
        default: '16GB',
        perCore: '4GB'
      }
    },
    os: ['linux'],
    arch: ['x86_64'],
    installPath: '/opt/software/jupyter-env',
    environmentVars: {
      JUPYTER_ENABLE_LAB: 'yes',
      JUPYTER_CONFIG_DIR: '$HOME/.jupyter'
    }
  },

  resources: {
    default: {
      name: 'default',
      descriptionKey: 'hpcApps.jupyter.resources.profiles.default.description',
      partition: 'compute',  // 使用实际存在的分区
      nodes: 1,
      cpusPerTask: 4,
      memory: '16GB',
      walltime: '8:00:00',
      recommended: true
    },
    profiles: [
      {
        name: 'light',
        descriptionKey: 'hpcApps.jupyter.resources.profiles.light.description',
        partition: 'compute',
        nodes: 1,
        cpusPerTask: 2,
        memory: '8GB',
        walltime: '4:00:00'
      },
      {
        name: 'standard',
        descriptionKey: 'hpcApps.jupyter.resources.profiles.standard.description',
        partition: 'compute',
        nodes: 1,
        cpusPerTask: 8,
        memory: '32GB',
        walltime: '12:00:00'
      },
      {
        name: 'high-memory',
        descriptionKey: 'hpcApps.jupyter.resources.profiles.highMemory.description',
        partition: 'compute',
        nodes: 1,
        cpusPerTask: 16,
        memory: '64GB',
        walltime: '24:00:00'
      }
    ]
  },

  execution: {
    modes: [
      {
        name: 'interactive',
        type: ApplicationType.INTERACTIVE,
        descriptionKey: 'hpcApps.jupyter.execution.modes.interactive.description',
        interactive: true
      }
    ],
    preScript: `
# Jupyter Lab 环境初始化
export JUPYTER_CONFIG_DIR=$HOME/.jupyter
export JUPYTER_DATA_DIR=$HOME/.jupyter/data
export JUPYTER_RUNTIME_DIR=$TMPDIR/jupyter_runtime

# 创建必要的目录
mkdir -p $JUPYTER_CONFIG_DIR
mkdir -p $JUPYTER_DATA_DIR
mkdir -p $JUPYTER_RUNTIME_DIR
`,
    templates: [
      {
        name: 'jupyter-server',
        descriptionKey: 'hpcApps.jupyter.execution.templates.jupyterServer.description',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --partition={{partition}}
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
{{#if gpuCount}}
#SBATCH --gres=gpu:{{gpuType}}:{{gpuCount}}
{{/if}}
#SBATCH --output={{logDir}}/jupyter_%j.out
#SBATCH --error={{logDir}}/jupyter_%j.err

# 加载必要模块
module purge
module load python/3.11 nodejs/18
{{#if gpuCount}}
module load cuda/12.1 cudnn/8.9
{{/if}}

# 激活Jupyter环境
source /opt/software/jupyter-env/bin/activate

# 配置Jupyter环境变量
export JUPYTER_CONFIG_DIR=$HOME/.jupyter
export JUPYTER_DATA_DIR=$HOME/.jupyter/data
export JUPYTER_RUNTIME_DIR=$TMPDIR/jupyter_runtime

# 创建必要目录
mkdir -p $JUPYTER_CONFIG_DIR
mkdir -p $JUPYTER_DATA_DIR
mkdir -p $JUPYTER_RUNTIME_DIR
mkdir -p {{logDir}}

# 生成随机token
JUPYTER_TOKEN={{token}}
JUPYTER_PORT={{port}}
JUPYTER_HOST=$(hostname -i)

# 创建Jupyter配置文件
cat > $JUPYTER_CONFIG_DIR/jupyter_lab_config.py <<EOF
c.ServerApp.ip = '$JUPYTER_HOST'
c.ServerApp.port = $JUPYTER_PORT
c.ServerApp.token = '$JUPYTER_TOKEN'
c.ServerApp.allow_origin = '*'
c.ServerApp.disable_check_xsrf = True
c.ServerApp.allow_remote_access = True
c.ServerApp.open_browser = False
c.ServerApp.root_dir = '{{workDir}}'
{{#if gpuCount}}
c.ResourceUseDisplay.track_cpu_percent = True
c.ResourceUseDisplay.mem_limit = {{memoryBytes}}
{{/if}}
EOF

# 记录连接信息
echo "=================================================" > {{connectionFile}}
echo "Jupyter Lab 连接信息" >> {{connectionFile}}
echo "=================================================" >> {{connectionFile}}
echo "主机地址: $JUPYTER_HOST" >> {{connectionFile}}
echo "端口: $JUPYTER_PORT" >> {{connectionFile}}
echo "Token: $JUPYTER_TOKEN" >> {{connectionFile}}
echo "访问URL: http://$JUPYTER_HOST:$JUPYTER_PORT/?token=$JUPYTER_TOKEN" >> {{connectionFile}}
echo "作业ID: $SLURM_JOB_ID" >> {{connectionFile}}
echo "节点: $SLURM_NODELIST" >> {{connectionFile}}
echo "开始时间: $(date)" >> {{connectionFile}}
echo "=================================================" >> {{connectionFile}}

# 显示连接信息
cat {{connectionFile}}

# 启动Jupyter Lab
echo "正在启动 Jupyter Lab..."
jupyter lab \\
  --config=$JUPYTER_CONFIG_DIR/jupyter_lab_config.py \\
  --no-browser \\
  2>&1 | tee {{logDir}}/jupyter_server.log

# 记录结束时间
echo "结束时间: $(date)" >> {{connectionFile}}
`,
        variables: [
          { name: 'jobName', source: 'form', default: 'jupyter-lab' },
          { name: 'partition', source: 'form', default: 'compute' },
          { name: 'cpusPerTask', source: 'form', default: '4' },
          { name: 'memory', source: 'form', default: '16GB' },
          { name: 'walltime', source: 'form', default: '8:00:00' },
          { name: 'gpuCount', source: 'form', default: '0' },
          { name: 'gpuType', source: 'form', default: 'A100' },
          { name: 'token', source: 'system' },
          { name: 'port', source: 'system' },
          { name: 'workDir', source: 'form', default: '$HOME' },
          { name: 'logDir', source: 'system', default: '$HOME/.jupyter/logs' },
          { name: 'connectionFile', source: 'system', default: '$HOME/.jupyter/connection_info.txt' },
          { name: 'memoryBytes', source: 'computed' }
        ]
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'jobName',
        labelKey: 'hpcApps.jupyter.fields.jobName.label',
        type: 'text',
        required: true,
        default: 'jupyter-lab',
        descriptionKey: 'hpcApps.jupyter.fields.jobName.description',
        validation: {
          pattern: '^[a-zA-Z0-9_-]+$',
          maxLength: 50
        }
      },
      {
        name: 'resourceProfile',
        labelKey: 'hpcApps.jupyter.fields.resourceProfile.label',
        type: 'select',
        required: true,
        default: 'default',
        options: [
          {
            value: 'light',
            labelKey: 'hpcApps.jupyter.fields.resourceProfile.options.light.label',
            descriptionKey: 'hpcApps.jupyter.fields.resourceProfile.options.light.description'
          },
          {
            value: 'default',
            labelKey: 'hpcApps.jupyter.fields.resourceProfile.options.default.label',
            descriptionKey: 'hpcApps.jupyter.fields.resourceProfile.options.default.description'
          },
          {
            value: 'standard',
            labelKey: 'hpcApps.jupyter.fields.resourceProfile.options.standard.label',
            descriptionKey: 'hpcApps.jupyter.fields.resourceProfile.options.standard.description'
          },
          {
            value: 'high-memory',
            labelKey: 'hpcApps.jupyter.fields.resourceProfile.options.highMemory.label',
            descriptionKey: 'hpcApps.jupyter.fields.resourceProfile.options.highMemory.description'
          }
        ]
      },
      {
        name: 'enableGPU',
        labelKey: 'hpcApps.jupyter.fields.enableGPU.label',
        type: 'boolean',
        default: false,
        descriptionKey: 'hpcApps.jupyter.fields.enableGPU.description'
      },
      {
        name: 'gpuCount',
        labelKey: 'hpcApps.jupyter.fields.gpuCount.label',
        type: 'select',
        default: '1',
        options: [
          { value: '1', labelKey: 'hpcApps.jupyter.fields.gpuCount.options.1.label' },
          { value: '2', labelKey: 'hpcApps.jupyter.fields.gpuCount.options.2.label' },
          { value: '4', labelKey: 'hpcApps.jupyter.fields.gpuCount.options.4.label' }
        ],
        condition: {
          field: 'enableGPU',
          value: true
        }
      },
      {
        name: 'gpuType',
        labelKey: 'hpcApps.jupyter.fields.gpuType.label',
        type: 'select',
        default: 'A100',
        options: [
          { value: 'A100', labelKey: 'hpcApps.jupyter.fields.gpuType.options.a100.label' },
          { value: 'V100', labelKey: 'hpcApps.jupyter.fields.gpuType.options.v100.label' },
          { value: 'RTX3090', labelKey: 'hpcApps.jupyter.fields.gpuType.options.rtx3090.label' }
        ],
        condition: {
          field: 'enableGPU',
          value: true
        }
      },
      {
        name: 'walltime',
        labelKey: 'hpcApps.jupyter.fields.walltime.label',
        type: 'select',
        required: true,
        default: '8:00:00',
        options: [
          { value: '2:00:00', labelKey: 'hpcApps.jupyter.fields.walltime.options.2hours.label' },
          { value: '4:00:00', labelKey: 'hpcApps.jupyter.fields.walltime.options.4hours.label' },
          { value: '8:00:00', labelKey: 'hpcApps.jupyter.fields.walltime.options.8hours.label' },
          { value: '12:00:00', labelKey: 'hpcApps.jupyter.fields.walltime.options.12hours.label' },
          { value: '24:00:00', labelKey: 'hpcApps.jupyter.fields.walltime.options.24hours.label' }
        ]
      },
      {
        name: 'workDir',
        labelKey: 'hpcApps.jupyter.fields.workDir.label',
        type: 'text',
        default: '$HOME',
        descriptionKey: 'hpcApps.jupyter.fields.workDir.description',
        placeholderKey: 'hpcApps.jupyter.fields.workDir.placeholder'
      },
      {
        name: 'installPackages',
        labelKey: 'hpcApps.jupyter.fields.installPackages.label',
        type: 'textarea',
        descriptionKey: 'hpcApps.jupyter.fields.installPackages.description',
        placeholderKey: 'hpcApps.jupyter.fields.installPackages.placeholder',
        help: {
          textKey: 'hpcApps.jupyter.fields.installPackages.help.text',
          exampleKey: 'hpcApps.jupyter.fields.installPackages.help.example'
        }
      }
    ]
  },

  io: {
    inputs: [
      {
        name: 'notebooks',
        type: 'directory',
        descriptionKey: 'hpcApps.jupyter.io.inputs.notebooks.description'
      },
      {
        name: 'data',
        type: 'directory',
        descriptionKey: 'hpcApps.jupyter.io.inputs.data.description'
      }
    ],
    outputs: [
      {
        name: 'notebooks',
        type: 'directory',
        pattern: '*.ipynb',
        descriptionKey: 'hpcApps.jupyter.io.outputs.notebooks.description'
      },
      {
        name: 'results',
        type: 'directory',
        descriptionKey: 'hpcApps.jupyter.io.outputs.results.description'
      },
      {
        name: 'connection-info',
        type: 'file',
        pattern: 'connection_info.txt',
        descriptionKey: 'hpcApps.jupyter.io.outputs.connectionInfo.description'
      }
    ],
    workingDir: '$HOME'
  },

  access: {
    roles: ['student', 'researcher', 'faculty', 'admin'],
    conditions: [
      {
        type: 'quota',
        condition: 'user.compute_hours_used < user.compute_hours_limit',
        message: 'Compute time quota exceeded'
      }
    ]
  },

  extensions: {
    webAccess: true,
    requiresProxy: true,
    defaultPort: 8888,
    portRange: { min: 8888, max: 8999 },
    sessionType: 'jupyter',
    healthCheck: {
      enabled: true,
      endpoint: '/api/status',
      interval: 60
    }
  }
}
