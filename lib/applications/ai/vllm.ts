import { HpcApplicationSpec, ApplicationCategory, ApplicationType } from '../../hpc-application-spec'

/**
 * vLLM 大模型推理服务应用定义
 * 高性能LLM推理引擎,支持LLaMA、Mistral等开源大模型
 */
export const vllmApp: HpcApplicationSpec = {
  metadata: {
    name: 'vllm',
    displayNameKey: 'hpcApps.vllm.metadata.displayName',
    version: '0.4.0',
    description: 'High-performance Large Language Model inference engine with PagedAttention',
    descriptionKey: 'hpcApps.vllm.metadata.description',
    author: 'vLLM Team',
    homepage: 'https://github.com/vllm-project/vllm',
    documentation: 'https://docs.vllm.ai/',
    license: 'Apache-2.0',
    tags: ['llm', 'inference', 'transformer', 'gpu', 'ai', 'language-model', 'vllm'],
    category: ApplicationCategory.MACHINE_LEARNING,
    type: [ApplicationType.BATCH, ApplicationType.GPU, ApplicationType.WEB, ApplicationType.SERVICE],
    icon: {
      type: 'emoji',
      emoji: '⚡'
    }
  },

  requirements: {
    modules: ['cuda/12.1', 'python/3.11'],
    software: [
      { name: 'vllm', version: '0.4.0' },
      { name: 'cuda', version: '12.1' },
      { name: 'python', version: '3.11+' }
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
        default: '128GB',
        perCore: '8GB'
      }
    },
    os: ['linux'],
    arch: ['x86_64'],
    installPath: '/opt/software/vllm-env',
    environmentVars: {
      VLLM_WORKER_MULTIPROC_METHOD: 'spawn',
      CUDA_VISIBLE_DEVICES: '0,1,2,3'
    }
  },

  resources: {
    default: {
      name: 'default',
      description: 'Standard LLM inference configuration (7B-13B models)',
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
        name: 'small-model',
        description: '7B models (LLaMA 2 7B, Mistral 7B)',
        descriptionKey: 'hpcApps.vllm.resources.profiles.smallModel.description',
        partition: 'gpu',
        nodes: 1,
        cpusPerTask: 8,
        memory: '64GB',
        walltime: '4:00:00',
        gpu: { count: 1, type: 'A100-40GB' }
      },
      {
        name: 'medium-model',
        description: '13B-30B models (LLaMA 2 13B, Qwen 14B)',
        descriptionKey: 'hpcApps.vllm.resources.profiles.mediumModel.description',
        partition: 'gpu',
        nodes: 1,
        cpusPerTask: 16,
        memory: '128GB',
        walltime: '8:00:00',
        gpu: { count: 1, type: 'A100-80GB' }
      },
      {
        name: 'large-model',
        description: '70B models (LLaMA 2 70B, Qwen 72B)',
        descriptionKey: 'hpcApps.vllm.resources.profiles.largeModel.description',
        partition: 'gpu',
        nodes: 1,
        cpusPerTask: 32,
        memory: '256GB',
        walltime: '12:00:00',
        gpu: { count: 4, type: 'A100-80GB' }
      },
      {
        name: 'xlarge-model',
        description: '175B+ models (需要多卡推理)',
        descriptionKey: 'hpcApps.vllm.resources.profiles.xlargeModel.description',
        partition: 'gpu',
        nodes: 1,
        cpusPerTask: 64,
        memory: '512GB',
        walltime: '24:00:00',
        gpu: { count: 8, type: 'A100-80GB' }
      }
    ]
  },

  execution: {
    modes: [
      {
        name: 'api-server',
        type: ApplicationType.SERVICE,
        description: 'OpenAI-compatible API server',
        descriptionKey: 'hpcApps.vllm.execution.modes.apiServer.description',
        interactive: false
      },
      {
        name: 'offline-inference',
        type: ApplicationType.BATCH,
        description: 'Offline batch inference',
        descriptionKey: 'hpcApps.vllm.execution.modes.offlineInference.description',
        interactive: false
      }
    ],
    preScript: `
# vLLM环境初始化
export VLLM_WORKER_MULTIPROC_METHOD=spawn
export NCCL_DEBUG=INFO

# 激活虚拟环境
source /opt/software/vllm-env/bin/activate

# 显示GPU信息
echo "=== GPU Information ==="
nvidia-smi
echo "======================="
`,
    templates: [
      {
        name: 'vllm-server',
        description: 'vLLM OpenAI-compatible API server',
        descriptionKey: 'hpcApps.vllm.execution.templates.vllmServer.description',
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
module load cuda/12.1 python/3.11

# 激活环境
source /opt/software/vllm-env/bin/activate

# 环境变量
export VLLM_WORKER_MULTIPROC_METHOD=spawn
{{#if tensorParallel}}
export CUDA_VISIBLE_DEVICES={{cudaDevices}}
{{/if}}

# 创建日志目录
mkdir -p {{logDir}}

# 获取节点信息
VLLM_HOST=$(hostname -i)
VLLM_PORT={{serverPort}}

# 显示配置信息
echo "=== vLLM Server Configuration ==="
echo "Job ID: $SLURM_JOB_ID"
echo "Node: $SLURM_NODELIST"
echo "Model: {{modelPath}}"
echo "GPU Type: {{gpuType}}"
echo "GPU Count: {{gpuCount}}"
echo "Tensor Parallel Size: {{tensorParallelSize}}"
echo "Host: $VLLM_HOST"
echo "Port: $VLLM_PORT"
echo "Max Model Length: {{maxModelLen}}"
echo "GPU Memory Utilization: {{gpuMemUtil}}"
echo "==================================="

# 显示GPU信息
nvidia-smi

# 记录服务器连接信息
cat > {{connectionFile}} << EOF
=== vLLM Server Connection Info ===
API Base URL: http://$VLLM_HOST:$VLLM_PORT/v1
Model: {{modelPath}}
Job ID: $SLURM_JOB_ID
Node: $SLURM_NODELIST
Started: $(date)

Example Usage:
curl http://$VLLM_HOST:$VLLM_PORT/v1/completions \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "{{modelPath}}",
    "prompt": "Hello, my name is",
    "max_tokens": 50,
    "temperature": 0.7
  }'
====================================
EOF

cat {{connectionFile}}

# 启动vLLM服务器
echo "=== Starting vLLM Server ==="
python -m vllm.entrypoints.openai.api_server \\
  --model {{modelPath}} \\
  --tensor-parallel-size {{tensorParallelSize}} \\
  --max-model-len {{maxModelLen}} \\
  --gpu-memory-utilization {{gpuMemUtil}} \\
  --host $VLLM_HOST \\
  --port $VLLM_PORT \\
  {{#if quantization}}--quantization {{quantization}}{{/if}} \\
  {{#if dtype}}--dtype {{dtype}}{{/if}} \\
  {{#if maxNumSeqs}}--max-num-seqs {{maxNumSeqs}}{{/if}} \\
  2>&1 | tee {{logDir}}/vllm_server.log

echo "=== Server Stopped at $(date) ===" >> {{connectionFile}}
`,
        variables: [
          { name: 'jobName', source: 'form', default: 'vllm-server' },
          { name: 'partition', source: 'form', default: 'gpu' },
          { name: 'cpusPerTask', source: 'form', default: '16' },
          { name: 'memory', source: 'form', default: '128GB' },
          { name: 'walltime', source: 'form', default: '8:00:00' },
          { name: 'gpuType', source: 'form', default: 'A100-80GB' },
          { name: 'gpuCount', source: 'form', default: '1' },
          { name: 'modelPath', source: 'form' },
          { name: 'tensorParallelSize', source: 'form', default: '1' },
          { name: 'maxModelLen', source: 'form', default: '4096' },
          { name: 'gpuMemUtil', source: 'form', default: '0.9' },
          { name: 'serverPort', source: 'system', default: '8000' },
          { name: 'quantization', source: 'form' },
          { name: 'dtype', source: 'form' },
          { name: 'maxNumSeqs', source: 'form' },
          { name: 'logDir', source: 'system', default: '$HOME/vllm_logs' },
          { name: 'connectionFile', source: 'system', default: '$HOME/vllm_connection.txt' },
          { name: 'cudaDevices', source: 'computed' },
          { name: 'tensorParallel', source: 'computed' }
        ]
      },
      {
        name: 'offline-inference',
        description: 'Batch offline inference',
        descriptionKey: 'hpcApps.vllm.execution.templates.offlineInference.description',
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
module load cuda/12.1 python/3.11

# 激活环境
source /opt/software/vllm-env/bin/activate

# 创建日志目录
mkdir -p {{logDir}}

# 运行离线推理
python -c "
from vllm import LLM, SamplingParams
import json

# 加载模型
llm = LLM(
    model='{{modelPath}}',
    tensor_parallel_size={{tensorParallelSize}},
    gpu_memory_utilization={{gpuMemUtil}},
    max_model_len={{maxModelLen}}
)

# 读取输入prompts
with open('{{inputFile}}', 'r') as f:
    prompts = [line.strip() for line in f if line.strip()]

# 配置采样参数
sampling_params = SamplingParams(
    temperature={{temperature}},
    top_p={{topP}},
    max_tokens={{maxTokens}}
)

# 批量推理
outputs = llm.generate(prompts, sampling_params)

# 保存结果
results = []
for output in outputs:
    results.append({
        'prompt': output.prompt,
        'generated_text': output.outputs[0].text,
        'tokens': len(output.outputs[0].token_ids)
    })

with open('{{outputFile}}', 'w') as f:
    json.dump(results, f, indent=2, ensure_ascii=False)

print(f'Processed {len(results)} prompts')
print(f'Results saved to: {{outputFile}}')
"
`
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'jobName',
        labelKey: 'hpcApps.vllm.fields.jobName.label',
        type: 'text',
        required: true,
        default: 'vllm-inference',
        descriptionKey: 'hpcApps.vllm.fields.jobName.description',
        validation: {
          pattern: '^[a-zA-Z0-9_-]+$',
          maxLength: 50
        }
      },
      {
        name: 'mode',
        labelKey: 'hpcApps.vllm.fields.mode.label',
        type: 'select',
        required: true,
        default: 'api-server',
        descriptionKey: 'hpcApps.vllm.fields.mode.description',
        options: [
          {
            value: 'api-server',
            labelKey: 'hpcApps.vllm.fields.mode.options.apiServer.label',
            descriptionKey: 'hpcApps.vllm.fields.mode.options.apiServer.description'
          },
          {
            value: 'offline-inference',
            labelKey: 'hpcApps.vllm.fields.mode.options.offlineInference.label',
            descriptionKey: 'hpcApps.vllm.fields.mode.options.offlineInference.description'
          }
        ]
      },
      {
        name: 'modelPath',
        labelKey: 'hpcApps.vllm.fields.modelPath.label',
        type: 'select',
        required: true,
        descriptionKey: 'hpcApps.vllm.fields.modelPath.description',
        options: [
          {
            value: '/models/llama-2-7b-chat',
            labelKey: 'hpcApps.vllm.fields.modelPath.options.llama27b.label',
            descriptionKey: 'hpcApps.vllm.fields.modelPath.options.llama27b.description'
          },
          {
            value: '/models/llama-2-13b-chat',
            labelKey: 'hpcApps.vllm.fields.modelPath.options.llama213b.label',
            descriptionKey: 'hpcApps.vllm.fields.modelPath.options.llama213b.description'
          },
          {
            value: '/models/llama-2-70b-chat',
            labelKey: 'hpcApps.vllm.fields.modelPath.options.llama270b.label',
            descriptionKey: 'hpcApps.vllm.fields.modelPath.options.llama270b.description'
          },
          {
            value: '/models/mistral-7b-instruct',
            labelKey: 'hpcApps.vllm.fields.modelPath.options.mistral7b.label',
            descriptionKey: 'hpcApps.vllm.fields.modelPath.options.mistral7b.description'
          },
          {
            value: '/models/qwen-7b-chat',
            labelKey: 'hpcApps.vllm.fields.modelPath.options.qwen7b.label',
            descriptionKey: 'hpcApps.vllm.fields.modelPath.options.qwen7b.description'
          },
          {
            value: '/models/qwen-14b-chat',
            labelKey: 'hpcApps.vllm.fields.modelPath.options.qwen14b.label',
            descriptionKey: 'hpcApps.vllm.fields.modelPath.options.qwen14b.description'
          },
          {
            value: '/models/chatglm3-6b',
            labelKey: 'hpcApps.vllm.fields.modelPath.options.chatglm3.label',
            descriptionKey: 'hpcApps.vllm.fields.modelPath.options.chatglm3.description'
          }
        ]
      },
      {
        name: 'resourceProfile',
        labelKey: 'hpcApps.vllm.fields.resourceProfile.label',
        type: 'select',
        required: true,
        default: 'default',
        descriptionKey: 'hpcApps.vllm.fields.resourceProfile.description',
        options: [
          {
            value: 'small-model',
            labelKey: 'hpcApps.vllm.fields.resourceProfile.options.smallModel.label',
            descriptionKey: 'hpcApps.vllm.fields.resourceProfile.options.smallModel.description'
          },
          {
            value: 'default',
            labelKey: 'hpcApps.vllm.fields.resourceProfile.options.default.label',
            descriptionKey: 'hpcApps.vllm.fields.resourceProfile.options.default.description'
          },
          {
            value: 'large-model',
            labelKey: 'hpcApps.vllm.fields.resourceProfile.options.largeModel.label',
            descriptionKey: 'hpcApps.vllm.fields.resourceProfile.options.largeModel.description'
          },
          {
            value: 'xlarge-model',
            labelKey: 'hpcApps.vllm.fields.resourceProfile.options.xlargeModel.label',
            descriptionKey: 'hpcApps.vllm.fields.resourceProfile.options.xlargeModel.description'
          }
        ]
      },
      {
        name: 'maxModelLen',
        labelKey: 'hpcApps.vllm.fields.maxModelLen.label',
        type: 'select',
        default: '4096',
        descriptionKey: 'hpcApps.vllm.fields.maxModelLen.description',
        options: [
          {
            value: '2048',
            labelKey: 'hpcApps.vllm.fields.maxModelLen.options.2048.label',
            descriptionKey: 'hpcApps.vllm.fields.maxModelLen.options.2048.description'
          },
          {
            value: '4096',
            labelKey: 'hpcApps.vllm.fields.maxModelLen.options.4096.label',
            descriptionKey: 'hpcApps.vllm.fields.maxModelLen.options.4096.description'
          },
          {
            value: '8192',
            labelKey: 'hpcApps.vllm.fields.maxModelLen.options.8192.label',
            descriptionKey: 'hpcApps.vllm.fields.maxModelLen.options.8192.description'
          },
          {
            value: '16384',
            labelKey: 'hpcApps.vllm.fields.maxModelLen.options.16384.label',
            descriptionKey: 'hpcApps.vllm.fields.maxModelLen.options.16384.description'
          },
          {
            value: '32768',
            labelKey: 'hpcApps.vllm.fields.maxModelLen.options.32768.label',
            descriptionKey: 'hpcApps.vllm.fields.maxModelLen.options.32768.description'
          }
        ]
      },
      {
        name: 'gpuMemUtil',
        labelKey: 'hpcApps.vllm.fields.gpuMemUtil.label',
        type: 'slider',
        min: 0.5,
        max: 0.95,
        step: 0.05,
        default: 0.9,
        descriptionKey: 'hpcApps.vllm.fields.gpuMemUtil.description'
      },
      {
        name: 'tensorParallelSize',
        labelKey: 'hpcApps.vllm.fields.tensorParallelSize.label',
        type: 'select',
        default: '1',
        descriptionKey: 'hpcApps.vllm.fields.tensorParallelSize.description',
        options: [
          { value: '1', labelKey: 'hpcApps.vllm.fields.tensorParallelSize.options.1.label' },
          { value: '2', labelKey: 'hpcApps.vllm.fields.tensorParallelSize.options.2.label' },
          { value: '4', labelKey: 'hpcApps.vllm.fields.tensorParallelSize.options.4.label' },
          { value: '8', labelKey: 'hpcApps.vllm.fields.tensorParallelSize.options.8.label' }
        ]
      },
      {
        name: 'quantization',
        labelKey: 'hpcApps.vllm.fields.quantization.label',
        type: 'select',
        descriptionKey: 'hpcApps.vllm.fields.quantization.description',
        options: [
          {
            value: '',
            labelKey: 'hpcApps.vllm.fields.quantization.options.none.label',
            descriptionKey: 'hpcApps.vllm.fields.quantization.options.none.description'
          },
          {
            value: 'awq',
            labelKey: 'hpcApps.vllm.fields.quantization.options.awq.label',
            descriptionKey: 'hpcApps.vllm.fields.quantization.options.awq.description'
          },
          {
            value: 'gptq',
            labelKey: 'hpcApps.vllm.fields.quantization.options.gptq.label',
            descriptionKey: 'hpcApps.vllm.fields.quantization.options.gptq.description'
          },
          {
            value: 'squeezellm',
            labelKey: 'hpcApps.vllm.fields.quantization.options.squeezellm.label',
            descriptionKey: 'hpcApps.vllm.fields.quantization.options.squeezellm.description'
          }
        ]
      },
      {
        name: 'dtype',
        labelKey: 'hpcApps.vllm.fields.dtype.label',
        type: 'select',
        default: 'auto',
        descriptionKey: 'hpcApps.vllm.fields.dtype.description',
        options: [
          {
            value: 'auto',
            labelKey: 'hpcApps.vllm.fields.dtype.options.auto.label',
            descriptionKey: 'hpcApps.vllm.fields.dtype.options.auto.description'
          },
          {
            value: 'float16',
            labelKey: 'hpcApps.vllm.fields.dtype.options.float16.label',
            descriptionKey: 'hpcApps.vllm.fields.dtype.options.float16.description'
          },
          {
            value: 'bfloat16',
            labelKey: 'hpcApps.vllm.fields.dtype.options.bfloat16.label',
            descriptionKey: 'hpcApps.vllm.fields.dtype.options.bfloat16.description'
          }
        ]
      },
      {
        name: 'walltime',
        labelKey: 'hpcApps.vllm.fields.walltime.label',
        type: 'select',
        required: true,
        default: '8:00:00',
        descriptionKey: 'hpcApps.vllm.fields.walltime.description',
        options: [
          { value: '2:00:00', labelKey: 'hpcApps.vllm.fields.walltime.options.2hours.label' },
          { value: '4:00:00', labelKey: 'hpcApps.vllm.fields.walltime.options.4hours.label' },
          { value: '8:00:00', labelKey: 'hpcApps.vllm.fields.walltime.options.8hours.label' },
          { value: '12:00:00', labelKey: 'hpcApps.vllm.fields.walltime.options.12hours.label' },
          { value: '24:00:00', labelKey: 'hpcApps.vllm.fields.walltime.options.24hours.label' },
          { value: '48:00:00', labelKey: 'hpcApps.vllm.fields.walltime.options.48hours.label' }
        ]
      },
      {
        name: 'inputFile',
        labelKey: 'hpcApps.vllm.fields.inputFile.label',
        type: 'file',
        accept: ['.txt', '.json', '.jsonl'],
        descriptionKey: 'hpcApps.vllm.fields.inputFile.description',
        condition: {
          field: 'mode',
          value: 'offline-inference'
        }
      },
      {
        name: 'temperature',
        labelKey: 'hpcApps.vllm.fields.temperature.label',
        type: 'slider',
        min: 0.0,
        max: 2.0,
        step: 0.1,
        default: 0.7,
        descriptionKey: 'hpcApps.vllm.fields.temperature.description',
        condition: {
          field: 'mode',
          value: 'offline-inference'
        }
      },
      {
        name: 'topP',
        labelKey: 'hpcApps.vllm.fields.topP.label',
        type: 'slider',
        min: 0.0,
        max: 1.0,
        step: 0.05,
        default: 0.95,
        descriptionKey: 'hpcApps.vllm.fields.topP.description',
        condition: {
          field: 'mode',
          value: 'offline-inference'
        }
      },
      {
        name: 'maxTokens',
        labelKey: 'hpcApps.vllm.fields.maxTokens.label',
        type: 'number',
        min: 1,
        max: 4096,
        default: 512,
        descriptionKey: 'hpcApps.vllm.fields.maxTokens.description',
        condition: {
          field: 'mode',
          value: 'offline-inference'
        }
      }
    ],
    layout: {
      sections: [
        {
          title: 'Basic Configuration',
          titleKey: 'hpcApps.vllm.layout.sections.basicConfig.title',
          fields: ['jobName', 'mode', 'modelPath', 'resourceProfile']
        },
        {
          title: 'Model Configuration',
          titleKey: 'hpcApps.vllm.layout.sections.modelConfig.title',
          fields: ['maxModelLen', 'gpuMemUtil', 'tensorParallelSize', 'quantization', 'dtype']
        },
        {
          title: 'Inference Parameters',
          titleKey: 'hpcApps.vllm.layout.sections.inferenceParams.title',
          fields: ['inputFile', 'temperature', 'topP', 'maxTokens']
        },
        {
          title: 'Job Settings',
          titleKey: 'hpcApps.vllm.layout.sections.jobSettings.title',
          fields: ['walltime']
        }
      ]
    }
  },

  io: {
    inputs: [
      {
        name: 'prompts',
        type: 'file',
        pattern: '*.{txt,json,jsonl}',
        description: 'Input prompts for batch inference',
        descriptionKey: 'hpcApps.vllm.io.inputs.prompts.description'
      },
      {
        name: 'model-weights',
        type: 'directory',
        description: 'Model weights directory',
        descriptionKey: 'hpcApps.vllm.io.inputs.modelWeights.description'
      }
    ],
    outputs: [
      {
        name: 'results',
        type: 'file',
        pattern: '*.json',
        description: 'Inference results',
        descriptionKey: 'hpcApps.vllm.io.outputs.results.description'
      },
      {
        name: 'connection-info',
        type: 'file',
        pattern: 'vllm_connection.txt',
        description: 'API server connection information',
        descriptionKey: 'hpcApps.vllm.io.outputs.connectionInfo.description'
      },
      {
        name: 'logs',
        type: 'directory',
        description: 'Server logs',
        descriptionKey: 'hpcApps.vllm.io.outputs.logs.description'
      }
    ],
    workingDir: '$HOME/vllm_workspace'
  },

  monitoring: {
    metrics: [
      { name: 'throughput', unit: 'tokens/s', description: 'Token generation throughput' },
      { name: 'latency', unit: 'ms', description: 'Request latency' },
      { name: 'gpu_kv_cache_usage', unit: '%', description: 'KV cache GPU memory usage' },
      { name: 'num_requests_running', unit: '', description: 'Number of running requests' },
      { name: 'num_requests_waiting', unit: '', description: 'Number of waiting requests' }
    ],
    logParsing: {
      patterns: [
        { name: 'throughput', pattern: 'Throughput:\\s*([0-9.]+)', type: 'float' },
        { name: 'prompt_tokens', pattern: 'Prompt tokens:\\s*(\\d+)', type: 'int' },
        { name: 'generated_tokens', pattern: 'Generated tokens:\\s*(\\d+)', type: 'int' }
      ]
    }
  },

  access: {
    roles: ['researcher', 'faculty', 'admin'],
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
        condition: 'feature.llm_inference == true',
        message: 'LLM inference feature not available in current license'
      }
    ]
  },

  extensions: {
    webAccess: true,
    requiresProxy: true,
    defaultPort: 8000,
    portRange: { min: 8000, max: 8999 },
    sessionType: 'vllm',
    healthCheck: {
      enabled: true,
      endpoint: '/health',
      interval: 60
    },
    customValidation: true,
    tags: ['featured', 'gpu-required', 'llm'],
    metadata: {
      difficulty: 'advanced',
      estimatedTime: '4-24 hours',
      category: 'llm-inference',
      apiCompatibility: 'openai'
    }
  }
}
