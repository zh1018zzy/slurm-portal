import { HpcApplicationSpec, ApplicationCategory, ApplicationType } from './hpc-application-spec'

/**
 * 生物信息学应用规范集合
 * 包含常用的生信分析工具和工作流引擎
 */

// R 统计分析环境
export const rApplication: HpcApplicationSpec = {
  metadata: {
    name: 'r',
    version: '4.3.0',
    displayName: 'R Statistical Computing',
    description: '用于统计计算和图形的编程语言和软件环境，广泛用于生物统计学和基因组数据分析',
    category: ApplicationCategory.BIOINFORMATICS,
    type: [ApplicationType.INTERACTIVE, ApplicationType.BATCH, ApplicationType.JUPYTER],
    tags: ['statistics', 'bioinformatics', 'genomics', 'data-analysis', 'visualization'],
    author: 'R Core Team',
    homepage: 'https://www.r-project.org/',
    documentation: 'https://cran.r-project.org/manuals.html',
    license: 'GPL-2'
  },
  
  requirements: {
    software: [
      { name: 'R', version: '>=4.0.0' },
      { name: 'BiocManager', optional: true },
      { name: 'devtools', optional: true }
    ],
    modules: ['R/4.3.0', 'GCC/11.3.0'],
    containers: ['docker://bioconductor/bioconductor_docker:RELEASE_3_17']
  },

  resources: {
    default: {
      name: 'default',
      nodes: 1,
      cpusPerTask: 4,
      memory: '16GB',
      walltime: '2:00:00',
      partition: 'compute'
    },
    profiles: [
      {
        name: 'small',
        description: '小规模数据分析',
        nodes: 1,
        cpusPerTask: 2,
        memory: '8GB',
        walltime: '1:00:00'
      },
      {
        name: 'medium',
        description: '中等规模基因组分析',
        nodes: 1,
        cpusPerTask: 8,
        memory: '32GB',
        walltime: '4:00:00'
      },
      {
        name: 'large',
        description: '大规模多组学分析',
        nodes: 2,
        cpusPerTask: 16,
        memory: '64GB',
        walltime: '12:00:00'
      }
    ]
  },

  execution: {
    templates: [
      {
        name: 'interactive',
        description: '交互式R会话',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes={{nodes}}
#SBATCH --ntasks-per-node={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition={{partition}}
{{#modules}}
module load {{.}}
{{/modules}}

# 设置R环境
export R_LIBS_USER=$HOME/R/library
mkdir -p $R_LIBS_USER

# 启动R
{{#script}}
cat > analysis.R << 'EOF'
{{script}}
EOF
Rscript analysis.R
{{/script}}
{{^script}}
R --vanilla
{{/script}}`,
        variables: [
          { name: 'jobName', source: 'form', default: 'r_analysis' },
          { name: 'script', source: 'form' }
        ]
      },
      {
        name: 'rstudio',
        description: 'RStudio Server',
        template: `#!/bin/bash
#SBATCH --job-name=rstudio-{{jobName}}
#SBATCH --nodes=1
#SBATCH --ntasks-per-node={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition={{partition}}

module load RStudio-Server/2023.06.1
module load R/4.3.0

# 启动RStudio Server
rstudio-server --www-port={{port}} --rsession-path=/usr/lib/rstudio-server/bin/rsession`,
        variables: [
          { name: 'port', source: 'form', default: 8787 }
        ]
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'jobName',
        label: '作业名称',
        type: 'text',
        required: true,
        placeholder: '例如: genomic_analysis',
        validation: { pattern: '^[a-zA-Z0-9_-]+$' }
      },
      {
        name: 'analysisType',
        label: '分析类型',
        type: 'select',
        required: true,
        options: [
          { value: 'interactive', label: '交互式分析' },
          { value: 'batch', label: '批处理脚本' },
          { value: 'rstudio', label: 'RStudio Server' }
        ]
      },
      {
        name: 'script',
        label: 'R脚本',
        type: 'textarea',
        placeholder: '# 输入您的R代码\nlibrary(ggplot2)\ndata(mtcars)\nggplot(mtcars, aes(x=wt, y=mpg)) + geom_point()',
        condition: { field: 'analysisType', value: 'batch' }
      },
      {
        name: 'packages',
        label: '需要的R包',
        type: 'text',
        placeholder: '例如: ggplot2,dplyr,BiocGenerics',
        help: { text: '逗号分隔的包名列表，系统会自动安装' }
      }
    ]
  },

  io: {
    inputs: [
      {
        name: 'data_files',
        type: 'file',
        required: false,
        pattern: '*.{csv,tsv,txt,rda,rds}',
        description: '输入数据文件'
      }
    ],
    outputs: [
      {
        name: 'results',
        type: 'file',
        required: false,
        pattern: '*.{pdf,png,csv,rds}',
        description: '输出结果文件'
      }
    ],
    workingDir: '/data'
  }
}

// Nextflow 工作流引擎
export const nextflowApplication: HpcApplicationSpec = {
  metadata: {
    name: 'nextflow',
    version: '23.10.0',
    displayName: 'Nextflow Workflow Engine',
    description: '用于数据驱动计算管道的工作流管理系统，特别适用于生物信息学分析流程',
    category: ApplicationCategory.BIOINFORMATICS,
    type: [ApplicationType.BATCH, ApplicationType.MPI],
    tags: ['workflow', 'pipeline', 'bioinformatics', 'genomics', 'nf-core'],
    author: 'Nextflow Community',
    homepage: 'https://www.nextflow.io/',
    documentation: 'https://www.nextflow.io/docs/latest/',
    license: 'Apache-2.0'
  },

  requirements: {
    software: [
      { name: 'Java', version: '>=11' },
      { name: 'Nextflow', version: '>=23.04.0' },
      { name: 'Singularity', optional: true },
      { name: 'Docker', optional: true }
    ],
    modules: ['Nextflow/23.10.0', 'Java/11', 'Singularity/3.11.0']
  },

  resources: {
    default: {
      name: 'default',
      nodes: 1,
      cpusPerTask: 8,
      memory: '32GB',
      walltime: '6:00:00',
      partition: 'compute'
    },
    profiles: [
      {
        name: 'small',
        description: '小规模流程（单样本）',
        nodes: 1,
        cpusPerTask: 4,
        memory: '16GB',
        walltime: '2:00:00'
      },
      {
        name: 'medium',
        description: '中等规模流程（多样本）',
        nodes: 2,
        cpusPerTask: 16,
        memory: '64GB',
        walltime: '12:00:00'
      },
      {
        name: 'large',
        description: '大规模流程（队列研究）',
        nodes: 4,
        cpusPerTask: 32,
        memory: '128GB',
        walltime: '24:00:00'
      }
    ]
  },

  execution: {
    templates: [
      {
        name: 'nf-core',
        description: 'nf-core标准流程',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes={{nodes}}
#SBATCH --ntasks-per-node={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition={{partition}}

{{#modules}}
module load {{.}}
{{/modules}}

# 设置Nextflow环境
export NXF_OPTS="-Xms2g -Xmx{{jvmMemory}}"
export NXF_WORK=/tmp/nextflow-work-$SLURM_JOB_ID
mkdir -p $NXF_WORK

# 运行nf-core流程
nextflow run {{pipeline}} \\
  -profile {{profile}} \\
  --input {{input}} \\
  --outdir {{outdir}} \\
  {{#params}}
  --{{name}} {{value}} \\
  {{/params}}
  -work-dir $NXF_WORK \\
  -resume`,
        variables: [
          { name: 'pipeline', source: 'form' },
          { name: 'profile', source: 'form', default: 'slurm,singularity' },
          { name: 'jvmMemory', source: 'form', default: '8g' }
        ]
      },
      {
        name: 'custom',
        description: '自定义流程',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes={{nodes}}
#SBATCH --ntasks-per-node={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition={{partition}}

{{#modules}}
module load {{.}}
{{/modules}}

# 运行自定义Nextflow流程
nextflow run {{script}} \\
  {{#params}}
  --{{name}} {{value}} \\
  {{/params}}
  -work-dir /tmp/nextflow-work-$SLURM_JOB_ID \\
  -resume`
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'jobName',
        label: '作业名称',
        type: 'text',
        required: true,
        placeholder: '例如: rnaseq_analysis'
      },
      {
        name: 'pipelineType',
        label: '流程类型',
        type: 'select',
        required: true,
        options: [
          { value: 'nf-core/rnaseq', label: 'RNA-seq分析' },
          { value: 'nf-core/chipseq', label: 'ChIP-seq分析' },
          { value: 'nf-core/atacseq', label: 'ATAC-seq分析' },
          { value: 'nf-core/sarek', label: '变异检测' },
          { value: 'nf-core/methylseq', label: '甲基化分析' },
          { value: 'custom', label: '自定义流程' }
        ]
      },
      {
        name: 'input',
        label: '输入文件',
        type: 'text',
        required: true,
        placeholder: '/data/samplesheet.csv',
        help: { text: '样本表文件路径或输入目录' }
      },
      {
        name: 'outdir',
        label: '输出目录',
        type: 'text',
        required: true,
        placeholder: '/data/results',
        default: '/data/results'
      },
      {
        name: 'genome',
        label: '参考基因组',
        type: 'select',
        options: [
          { value: 'GRCh38', label: '人类 GRCh38' },
          { value: 'GRCh37', label: '人类 GRCh37' },
          { value: 'GRCm39', label: '小鼠 GRCm39' },
          { value: 'dm6', label: '果蝇 dm6' },
          { value: 'ce11', label: '线虫 ce11' }
        ]
      },
      {
        name: 'customScript',
        label: '自定义脚本路径',
        type: 'text',
        condition: { field: 'pipelineType', value: 'custom' },
        placeholder: '/path/to/main.nf'
      }
    ]
  },

  io: {
    inputs: [
      {
        name: 'data_files',
        type: 'file',
        required: false,
        pattern: '*.{csv,tsv,fastq.gz,fq.gz,bam,bed}',
        description: '输入数据文件'
      }
    ],
    outputs: [
      {
        name: 'results',
        type: 'file',
        required: false,
        pattern: 'results/**/*,*.html,*.pdf',
        description: '输出结果文件'
      }
    ],
    workingDir: '/data'
  }
}

// Cloudgene 基因组分析平台
export const cloudgeneApplication: HpcApplicationSpec = {
  metadata: {
    name: 'cloudgene',
    version: '2.5.0',
    displayName: 'Cloudgene Genomics Platform',
    description: '基于Web的基因组数据分析平台，提供用户友好的界面执行复杂的生物信息学分析',
    category: ApplicationCategory.BIOINFORMATICS,
    type: [ApplicationType.WEB, ApplicationType.INTERACTIVE],
    tags: ['genomics', 'web-interface', 'population-genetics', 'imputation'],
    author: 'Cloudgene Team',
    homepage: 'https://cloudgene.io/',
    license: 'MIT'
  },

  requirements: {
    software: [
      { name: 'Java', version: '>=8' },
      { name: 'Cloudgene', version: '>=2.0' }
    ],
    modules: ['Java/11', 'Cloudgene/2.5.0']
  },

  resources: {
    default: {
      name: 'default',
      nodes: 1,
      cpusPerTask: 4,
      memory: '16GB',
      walltime: '4:00:00',
      partition: 'compute'
    }
  },

  execution: {
    templates: [
      {
        name: 'server',
        description: 'Cloudgene Web服务器',
        template: `#!/bin/bash
#SBATCH --job-name=cloudgene-{{jobName}}
#SBATCH --nodes=1
#SBATCH --ntasks-per-node={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition={{partition}}

module load Java/11
module load Cloudgene/2.5.0

# 启动Cloudgene服务器
cloudgene server --port {{port}} --workspace {{workspace}}`
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'jobName',
        label: '服务名称',
        type: 'text',
        required: true,
        default: 'genomics-platform'
      },
      {
        name: 'port',
        label: '服务端口',
        type: 'number',
        min: 8000,
        max: 9999,
        default: 8082
      },
      {
        name: 'workspace',
        label: '工作空间目录',
        type: 'text',
        default: '/data/cloudgene-workspace'
      }
    ]
  },

  io: {
    inputs: [
      {
        name: 'vcf_files',
        type: 'file',
        required: false,
        pattern: '*.{vcf,vcf.gz,ped,map}',
        description: '输入VCF文件'
      }
    ],
    outputs: [
      {
        name: 'results',
        type: 'file',
        required: false,
        pattern: '*.{vcf.gz,html,zip}',
        description: '输出结果文件'
      }
    ],
    workingDir: '/data'
  }
}

// GATK 基因组分析工具包
export const gatkApplication: HpcApplicationSpec = {
  metadata: {
    name: 'gatk',
    version: '4.4.0.0',
    displayName: 'GATK (Genome Analysis Toolkit)',
    description: '由Broad Institute开发的基因组分析工具包，用于变异发现和基因分型',
    category: ApplicationCategory.BIOINFORMATICS,
    type: [ApplicationType.BATCH, ApplicationType.MPI],
    tags: ['variant-calling', 'genomics', 'gatk', 'broad-institute'],
    author: 'Broad Institute',
    homepage: 'https://gatk.broadinstitute.org/',
    license: 'BSD-3-Clause'
  },

  requirements: {
    software: [
      { name: 'Java', version: '>=8' },
      { name: 'GATK', version: '>=4.0' },
      { name: 'samtools', version: '>=1.10' }
    ],
    modules: ['GATK/4.4.0.0', 'Java/11', 'SAMtools/1.17']
  },

  resources: {
    default: {
      name: 'default',
      nodes: 1,
      cpusPerTask: 8,
      memory: '32GB',
      walltime: '8:00:00',
      partition: 'compute'
    },
    profiles: [
      {
        name: 'single-sample',
        description: '单样本分析',
        nodes: 1,
        cpusPerTask: 4,
        memory: '16GB',
        walltime: '4:00:00'
      },
      {
        name: 'cohort',
        description: '队列分析',
        nodes: 2,
        cpusPerTask: 16,
        memory: '64GB',
        walltime: '24:00:00'
      }
    ]
  },

  execution: {
    templates: [
      {
        name: 'variant-calling',
        description: '变异检测流程',
        template: `#!/bin/bash
#SBATCH --job-name={{jobName}}
#SBATCH --nodes={{nodes}}
#SBATCH --ntasks-per-node={{cpusPerTask}}
#SBATCH --mem={{memory}}
#SBATCH --time={{walltime}}
#SBATCH --partition={{partition}}

{{#modules}}
module load {{.}}
{{/modules}}

# 变异检测流程
gatk HaplotypeCaller \\
  -R {{reference}} \\
  -I {{input_bam}} \\
  -O {{output_vcf}} \\
  --native-pair-hmm-threads {{cpusPerTask}}`
      }
    ]
  },

  interface: {
    form: [
      {
        name: 'jobName',
        label: '作业名称',
        type: 'text',
        required: true
      },
      {
        name: 'analysis_type',
        label: '分析类型',
        type: 'select',
        options: [
          { value: 'variant-calling', label: '变异检测' },
          { value: 'joint-calling', label: '联合检测' },
          { value: 'annotation', label: '变异注释' }
        ]
      },
      {
        name: 'reference',
        label: '参考基因组',
        type: 'text',
        required: true,
        placeholder: '/data/reference/genome.fa'
      },
      {
        name: 'input_bam',
        label: '输入BAM文件',
        type: 'text',
        required: true,
        placeholder: '/data/sample.bam'
      },
      {
        name: 'output_vcf',
        label: '输出VCF文件',
        type: 'text',
        required: true,
        placeholder: '/data/output.vcf'
      }
    ]
  },

  io: {
    inputs: [
      {
        name: 'bam_files',
        type: 'file',
        required: false,
        pattern: '*.{bam,sam,cram,fa,fasta}',
        description: '输入BAM/SAM文件'
      }
    ],
    outputs: [
      {
        name: 'vcf_results',
        type: 'file',
        required: false,
        pattern: '*.{vcf,vcf.gz,gvcf}',
        description: '输出VCF文件'
      }
    ],
    workingDir: '/data'
  }
}

// 导出所有生信应用
export const bioinformaticsApplications = [
  rApplication,
  nextflowApplication,
  cloudgeneApplication,
  gatkApplication
]