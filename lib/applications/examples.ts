import { HpcApplicationSpec, ApplicationCategory, ApplicationType } from '../hpc-application-spec'

// MATLAB 应用定义示例
export const matlabApp: HpcApplicationSpec = {
  metadata: {
    name: 'matlab',
    displayNameKey: 'hpcApps.matlab.metadata.displayName',
    version: 'R2023b',
    description: 'MATLAB numerical computing environment',
    descriptionKey: 'hpcApps.matlab.metadata.description',
    author: 'MathWorks',
    homepage: 'https://www.mathworks.com/products/matlab.html',
    license: 'Commercial',
    tags: ['matlab', 'numerical-computing', 'scientific-computing', 'engineering'],
    category: ApplicationCategory.SCIENTIFIC_COMPUTING,
    type: [ApplicationType.BATCH, ApplicationType.INTERACTIVE, ApplicationType.GUI]
  },

  requirements: {
    modules: ['matlab/R2023b'],
    software: [
      { name: 'matlab', version: 'R2023b' }
    ],
    hardware: {
      cpu: {
        cores: { min: 1, max: 64, default: 4 },
        features: ['AVX2'] // MATLAB可以利用AVX指令集
      },
      memory: {
        min: '2GB',
        max: '256GB',
        default: '16GB',
        perCore: '4GB'
      }
    },
    os: ['linux'],
    arch: ['x86_64']
  },

  resources: {
    default: {
      name: 'default',
      descriptionKey: 'hpcApps.matlab.resources.profiles.default.description',
      partition: 'compute',
      nodes: 1,
      cpusPerTask: 4,
      memory: '16GB',
      walltime: '2:00:00',
      recommended: true
    },
    profiles: [
      {
        name: 'interactive',
        descriptionKey: 'hpcApps.matlab.resources.profiles.interactive.description',
        partition: 'interactive',
        nodes: 1,
        cpusPerTask: 2,
        memory: '8GB',
        walltime: '4:00:00'
      },
      {
        name: 'large-memory',
        descriptionKey: 'hpcApps.matlab.resources.profiles.large-memory.description',
        partition: 'highmem',
        nodes: 1,
        cpusPerTask: 16,
        memory: '128GB',
        walltime: '8:00:00'
      },
      {
        name: 'parallel',
        descriptionKey: 'hpcApps.matlab.resources.profiles.parallel.description',
        partition: 'compute',
        nodes: 2,
        tasksPerNode: 16,
        cpusPerTask: 1,
        memory: '64GB',
        walltime: '12:00:00'
      }
    ]
  },

  execution: {
    modes: [
      {
        name: 'batch',
        type: ApplicationType.BATCH,
        descriptionKey: 'hpcApps.matlab.execution.modes.batch.description',
        interactive: false
      },
      {
        name: 'interactive',
        type: ApplicationType.INTERACTIVE,
        descriptionKey: 'hpcApps.matlab.execution.modes.interactive.description',
        interactive: true
      },
      {
        name: 'gui',
        type: ApplicationType.GUI,
        descriptionKey: 'hpcApps.matlab.execution.modes.gui.description',
        interactive: true,
        gui: true
      }
    ],
    preScript: `
# 创建MATLAB临时目录
mkdir -p $TMPDIR/matlab_prefs $TMPDIR/matlab_logs

# 设置MATLAB许可证
export MLM_LICENSE_FILE="27000@license-server.domain.com"
`,
    templates: [
      {
        name: 'batch-script',
        description: 'Batch script mode',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes={{nodes}}
#SBATCH --ntasks-per-node={{tasksPerNode}}
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition={{partition}}
#SBATCH --output={{jobName}}_%j.out
#SBATCH --error={{jobName}}_%j.err

# 加载MATLAB模块
module load matlab/R2023b

# 设置环境变量
export MATLAB_PREFDIR=$TMPDIR/matlab_prefs
export MATLAB_LOG_DIR=$TMPDIR/matlab_logs
export MLM_LICENSE_FILE="27000@license-server.domain.com"

# 创建临时目录
mkdir -p $MATLAB_PREFDIR $MATLAB_LOG_DIR

# 运行MATLAB脚本
{{#if scriptFile}}
matlab -batch "run('{{scriptFile}}')"
{{else}}
matlab -batch "{{matlabCode}}"
{{/if}}`,
        variables: [
          { name: 'jobName', source: 'form' },
          { name: 'nodes', source: 'form' },
          { name: 'tasksPerNode', source: 'form' },
          { name: 'cpusPerTask', source: 'form' },
          { name: 'memory', source: 'form' },
          { name: 'walltime', source: 'form' },
          { name: 'partition', source: 'form' },
          { name: 'scriptFile', source: 'form' },
          { name: 'matlabCode', source: 'form' }
        ]
      },
      {
        name: 'interactive',
        description: 'Interactive mode',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition=interactive

module load matlab/R2023b
export MATLAB_PREFDIR=$TMPDIR/matlab_prefs
export MLM_LICENSE_FILE="27000@license-server.domain.com"

# 启动交互式MATLAB
matlab -nodisplay`
      },
      {
        name: 'gui',
        description: 'GUI mode',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition=graphics

module load matlab/R2023b
export MATLAB_PREFDIR=$TMPDIR/matlab_prefs
export MLM_LICENSE_FILE="27000@license-server.domain.com"

# 启动VNC和MATLAB GUI
vncserver -geometry {{vncGeometry}} -depth 24
export DISPLAY=:$VNC_DISPLAY
matlab &

# 等待作业完成
wait`
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'jobName',
        labelKey: 'hpcApps.matlab.fields.jobName.label',
        type: 'text',
        required: true,
        default: 'matlab-job',
        descriptionKey: 'hpcApps.matlab.fields.jobName.description',
        validation: {
          pattern: '^[a-zA-Z0-9_-]+$',
          maxLength: 50
        }
      },
      {
        name: 'executionMode',
        labelKey: 'hpcApps.matlab.fields.executionMode.label',
        type: 'select',
        required: true,
        default: 'batch',
        options: [
          { value: 'batch', labelKey: 'hpcApps.matlab.fields.executionMode.options.batch.label', descriptionKey: 'hpcApps.matlab.fields.executionMode.options.batch.description' },
          { value: 'interactive', labelKey: 'hpcApps.matlab.fields.executionMode.options.interactive.label', descriptionKey: 'hpcApps.matlab.fields.executionMode.options.interactive.description' },
          { value: 'gui', labelKey: 'hpcApps.matlab.fields.executionMode.options.gui.label', descriptionKey: 'hpcApps.matlab.fields.executionMode.options.gui.description' }
        ]
      },
      {
        name: 'resourceProfile',
        labelKey: 'hpcApps.matlab.fields.resourceProfile.label',
        type: 'select',
        required: true,
        default: 'default',
        options: [
          { value: 'default', labelKey: 'hpcApps.matlab.fields.resourceProfile.options.default.label' },
          { value: 'interactive', labelKey: 'hpcApps.matlab.fields.resourceProfile.options.interactive.label' },
          { value: 'large-memory', labelKey: 'hpcApps.matlab.fields.resourceProfile.options.largeMemory.label' },
          { value: 'parallel', labelKey: 'hpcApps.matlab.fields.resourceProfile.options.parallel.label' }
        ]
      },
      {
        name: 'inputType',
        labelKey: 'hpcApps.matlab.fields.inputType.label',
        type: 'select',
        required: true,
        default: 'code',
        options: [
          { value: 'code', labelKey: 'hpcApps.matlab.fields.inputType.options.code.label' },
          { value: 'file', labelKey: 'hpcApps.matlab.fields.inputType.options.file.label' }
        ],
        condition: {
          field: 'executionMode',
          value: 'batch'
        }
      },
      {
        name: 'matlabCode',
        labelKey: 'hpcApps.matlab.fields.matlabCode.label',
        type: 'textarea',
        required: true,
        placeholderKey: 'hpcApps.matlab.fields.matlabCode.placeholder',
        condition: {
          field: 'inputType',
          value: 'code'
        },
        help: {
          textKey: 'hpcApps.matlab.fields.matlabCode.help.text',
          exampleKey: 'hpcApps.matlab.fields.matlabCode.help.example'
        }
      },
      {
        name: 'scriptFile',
        labelKey: 'hpcApps.matlab.fields.scriptFile.label',
        type: 'file',
        accept: ['.m'],
        condition: {
          field: 'inputType',
          value: 'file'
        },
        help: {
          textKey: 'hpcApps.matlab.fields.scriptFile.help.text'
        }
      },
      {
        name: 'dataFiles',
        labelKey: 'hpcApps.matlab.fields.dataFiles.label',
        type: 'file',
        multiple: true,
        accept: ['.mat', '.txt', '.csv', '.xlsx'],
        required: false,
        descriptionKey: 'hpcApps.matlab.fields.dataFiles.description'
      },
      {
        name: 'walltime',
        labelKey: 'hpcApps.matlab.fields.walltime.label',
        type: 'select',
        required: true,
        default: '2:00:00',
        options: [
          { value: '0:30:00', labelKey: 'hpcApps.matlab.fields.walltime.options.30min.label' },
          { value: '1:00:00', labelKey: 'hpcApps.matlab.fields.walltime.options.1hour.label' },
          { value: '2:00:00', labelKey: 'hpcApps.matlab.fields.walltime.options.2hours.label' },
          { value: '4:00:00', labelKey: 'hpcApps.matlab.fields.walltime.options.4hours.label' },
          { value: '8:00:00', labelKey: 'hpcApps.matlab.fields.walltime.options.8hours.label' },
          { value: '12:00:00', labelKey: 'hpcApps.matlab.fields.walltime.options.12hours.label' },
          { value: '24:00:00', labelKey: 'hpcApps.matlab.fields.walltime.options.24hours.label' }
        ]
      },
      {
        name: 'vncGeometry',
        labelKey: 'hpcApps.matlab.fields.vncGeometry.label',
        type: 'select',
        default: '1920x1080',
        options: [
          { value: '1024x768', labelKey: 'hpcApps.matlab.fields.vncGeometry.options.1024x768.label' },
          { value: '1280x800', labelKey: 'hpcApps.matlab.fields.vncGeometry.options.1280x800.label' },
          { value: '1280x1024', labelKey: 'hpcApps.matlab.fields.vncGeometry.options.1280x1024.label' },
          { value: '1440x900', labelKey: 'hpcApps.matlab.fields.vncGeometry.options.1440x900.label' },
          { value: '1600x900', labelKey: 'hpcApps.matlab.fields.vncGeometry.options.1600x900.label' },
          { value: '1920x1080', labelKey: 'hpcApps.matlab.fields.vncGeometry.options.1920x1080.label' },
          { value: '2560x1440', labelKey: 'hpcApps.matlab.fields.vncGeometry.options.2560x1440.label' },
          { value: '3840x2160', labelKey: 'hpcApps.matlab.fields.vncGeometry.options.3840x2160.label' }
        ],
        condition: {
          field: 'executionMode',
          value: 'gui'
        }
      },
      {
        name: 'emailNotification',
        labelKey: 'hpcApps.matlab.fields.emailNotification.label',
        type: 'boolean',
        default: false,
        descriptionKey: 'hpcApps.matlab.fields.emailNotification.description'
      }
    ]
  },

  io: {
    inputs: [
      {
        name: 'script',
        type: 'file',
        pattern: '*.m',
        descriptionKey: 'hpcApps.matlab.io.inputs.script.description'
      },
      {
        name: 'data',
        type: 'file',
        pattern: '*.{mat,txt,csv,xlsx}',
        descriptionKey: 'hpcApps.matlab.io.inputs.data.description'
      }
    ],
    outputs: [
      {
        name: 'results',
        type: 'directory',
        descriptionKey: 'hpcApps.matlab.io.outputs.results.description'
      },
      {
        name: 'figures',
        type: 'file',
        pattern: '*.{png,jpg,fig,pdf}',
        descriptionKey: 'hpcApps.matlab.io.outputs.figures.description'
      },
      {
        name: 'workspace',
        type: 'file',
        pattern: '*.mat',
        descriptionKey: 'hpcApps.matlab.io.outputs.workspace.description'
      }
    ],
    workingDir: '$SLURM_SUBMIT_DIR',
    dataStaging: {
      stageIn: [
        {
          source: '{{uploadDir}}/*',
          destination: '$SLURM_SUBMIT_DIR/',
          recursive: true
        }
      ],
      stageOut: [
        {
          source: '$SLURM_SUBMIT_DIR/*.{png,jpg,fig,pdf,mat}',
          destination: '{{outputDir}}/',
          pattern: '*'
        }
      ]
    }
  },

  monitoring: {
    metrics: [
      {
        name: 'cpu_usage',
        description: 'CPU usage',
        unit: 'percent'
      },
      {
        name: 'memory_usage',
        description: 'Memory usage',
        unit: 'bytes'
      },
      {
        name: 'execution_progress',
        description: 'Execution progress',
        unit: 'percent'
      }
    ]
  },

  access: {
    roles: ['student', 'researcher', 'faculty'],
    conditions: [
      {
        type: 'quota',
        condition: 'user.compute_hours_used < user.compute_hours_limit',
        message: 'Compute time quota exceeded, please contact administrator'
      }
    ]
  }
}

// Gaussian 应用定义示例
export const gaussianApp: HpcApplicationSpec = {
  metadata: {
    name: 'gaussian',
    displayNameKey: 'hpcApps.gaussian.metadata.displayName',
    version: '16',
    description: 'Gaussian quantum chemistry calculation software',
    descriptionKey: 'hpcApps.gaussian.metadata.description',
    author: 'Gaussian Inc.',
    homepage: 'https://gaussian.com/',
    license: 'Commercial',
    tags: ['quantum-chemistry', 'molecular-modeling', 'dft', 'ab-initio'],
    category: ApplicationCategory.QUANTUM_CHEMISTRY,
    type: [ApplicationType.BATCH, ApplicationType.MPI]
  },

  requirements: {
    modules: ['gaussian/16'],
    software: [
      { name: 'gaussian', version: '16' }
    ],
    hardware: {
      cpu: {
        cores: { min: 1, max: 128, default: 16 }
      },
      memory: {
        min: '4GB',
        max: '512GB',
        default: '32GB',
        perCore: '2GB'
      }
    }
  },

  resources: {
    default: {
      name: 'default',
      partition: 'compute',
      nodes: 1,
      cpusPerTask: 16,
      memory: '32GB',
      walltime: '24:00:00'
    },
    profiles: [
      {
        name: 'small',
        descriptionKey: 'hpcApps.gaussian.resources.profiles.small.description',
        nodes: 1,
        cpusPerTask: 8,
        memory: '16GB',
        walltime: '4:00:00'
      },
      {
        name: 'large',
        descriptionKey: 'hpcApps.gaussian.resources.profiles.large.description',
        nodes: 2,
        tasksPerNode: 32,
        memory: '128GB',
        walltime: '72:00:00'
      }
    ]
  },

  execution: {
    modes: [
      {
        name: 'batch',
        type: ApplicationType.BATCH,
        descriptionKey: 'hpcApps.gaussian.execution.modes.batch.description'
      }
    ],
    templates: [
      {
        name: 'gaussian-job',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes={{nodes}}
#SBATCH --ntasks={{ntasks}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition={{partition}}

module load gaussian/16

# 设置Gaussian环境变量
export GAUSS_SCRDIR=$TMPDIR
export GAUSS_MEMDEF={{memMB}}MB

# 运行Gaussian计算
g16 < {{inputFile}} > {{outputFile}}`
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'jobName',
        labelKey: 'hpcApps.gaussian.fields.jobName.label',
        type: 'text',
        required: true
      },
      {
        name: 'inputFile',
        labelKey: 'hpcApps.gaussian.fields.inputFile.label',
        type: 'file',
        accept: ['.gjf', '.com'],
        required: true,
        help: {
          textKey: 'hpcApps.gaussian.fields.inputFile.help.text'
        }
      },
      {
        name: 'calculationType',
        labelKey: 'hpcApps.gaussian.fields.calculationType.label',
        type: 'select',
        options: [
          { value: 'opt', labelKey: 'hpcApps.gaussian.fields.calculationType.options.opt.label' },
          { value: 'freq', labelKey: 'hpcApps.gaussian.fields.calculationType.options.freq.label' },
          { value: 'sp', labelKey: 'hpcApps.gaussian.fields.calculationType.options.sp.label' },
          { value: 'opt-freq', labelKey: 'hpcApps.gaussian.fields.calculationType.options.optFreq.label' }
        ]
      },
      {
        name: 'method',
        labelKey: 'hpcApps.gaussian.fields.method.label',
        type: 'select',
        options: [
          { value: 'b3lyp', labelKey: 'hpcApps.gaussian.fields.method.options.b3lyp.label' },
          { value: 'mp2', labelKey: 'hpcApps.gaussian.fields.method.options.mp2.label' },
          { value: 'ccsd', labelKey: 'hpcApps.gaussian.fields.method.options.ccsd.label' },
          { value: 'hf', labelKey: 'hpcApps.gaussian.fields.method.options.hf.label' }
        ]
      },
      {
        name: 'basisSet',
        labelKey: 'hpcApps.gaussian.fields.basisSet.label',
        type: 'select',
        options: [
          { value: '6-31g', labelKey: 'hpcApps.gaussian.fields.basisSet.options.6-31g.label' },
          { value: '6-31g*', labelKey: 'hpcApps.gaussian.fields.basisSet.options.6-31g*.label' },
          { value: '6-311g**', labelKey: 'hpcApps.gaussian.fields.basisSet.options.6-311g**.label' },
          { value: 'cc-pvdz', labelKey: 'hpcApps.gaussian.fields.basisSet.options.cc-pvdz.label' },
          { value: 'cc-pvtz', labelKey: 'hpcApps.gaussian.fields.basisSet.options.cc-pvtz.label' }
        ]
      }
    ]
  },

  io: {
    inputs: [
      {
        name: 'input',
        type: 'file',
        pattern: '*.{gjf,com}',
        required: true,
        descriptionKey: 'hpcApps.gaussian.io.inputs.input.description'
      }
    ],
    outputs: [
      {
        name: 'output',
        type: 'file',
        pattern: '*.log',
        descriptionKey: 'hpcApps.gaussian.io.outputs.output.description'
      },
      {
        name: 'checkpoint',
        type: 'file',
        pattern: '*.chk',
        descriptionKey: 'hpcApps.gaussian.io.outputs.checkpoint.description'
      }
    ]
  }
}