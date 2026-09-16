// HPC应用描述规范 - 标准化的应用定义格式

// 应用分类枚举
export enum ApplicationCategory {
  SCIENTIFIC_COMPUTING = 'scientific-computing',
  QUANTUM_CHEMISTRY = 'quantum-chemistry', 
  COMPUTATIONAL_FLUID_DYNAMICS = 'computational-fluid-dynamics',
  MACHINE_LEARNING = 'machine-learning',
  DEEP_LEARNING = 'deep-learning',
  BIOINFORMATICS = 'bioinformatics',
  CAD_CAE = 'cad-cae',
  VISUALIZATION = 'visualization',
  BIG_DATA = 'big-data',
  COMPILERS = 'compilers',
  DATABASES = 'databases',
  WEB_SERVICES = 'web-services',
  DEVELOPMENT_TOOLS = 'development-tools',
  SYSTEM_UTILITIES = 'system-utilities',
  STRUCTURAL_ANALYSIS = 'structural-analysis',
  CFD = 'cfd',
  MULTIPHYSICS = 'multiphysics',
  MOLECULAR_SIMULATION = 'molecular-simulation'
}

// 应用类型枚举
export enum ApplicationType {
  BATCH = 'batch',           // 批处理作业
  INTERACTIVE = 'interactive', // 交互式作业
  GUI = 'gui',               // 图形界面应用
  WEB = 'web',               // Web应用
  SERVICE = 'service',       // 服务类应用
  MPI = 'mpi',               // MPI并行应用
  OPENMP = 'openmp',         // OpenMP并行应用
  GPU = 'gpu',               // GPU加速应用
  JUPYTER = 'jupyter',       // Jupyter笔记本
  CONTAINER = 'container',   // 容器化应用
  WORKFLOW = 'workflow'      // 工作流应用
}

export interface HpcApplicationSpec {
  // 基本信息
  metadata: {
    name: string                    // 应用名称
    displayName?: string           // 显示名称（兼容旧版）
    displayNameKey?: string        // 显示名称翻译键（推荐）
    version: string                // 版本号
    description: string            // 描述（兼容旧版）
    descriptionKey?: string        // 描述翻译键（推荐）
    author?: string                // 作者
    homepage?: string              // 主页
    documentation?: string         // 文档链接
    license?: string               // 许可证
    tags: string[]                 // 标签
    category: ApplicationCategory   // 分类
    type: ApplicationType[]        // 应用类型（可多选）
    icon?: {                       // 图标配置
      type: 'lucide' | 'upload' | 'emoji'
      name?: string                // Lucide图标名称
      filePath?: string            // 上传文件路径
      emoji?: string               // Emoji表情
      color?: string               // 图标颜色
      url?: string                 // 兼容性：图片URL
    }
  }

  // 系统要求
  requirements: {
    modules?: string[]             // 依赖的环境模块
    software?: SoftwareRequirement[] // 软件依赖
    hardware?: HardwareRequirement   // 硬件要求
    os?: string[]                  // 操作系统要求
    arch?: string[]                // 架构要求（x86_64, arm64等）
    containers?: string[]          // 容器镜像
    installPath?: string           // 安装根目录
    executablePath?: string        // 可执行文件路径
    pathDirs?: string[]            // PATH环境变量目录
    environmentVars?: { [key: string]: string } // 其他环境变量
  }

  // 资源配置
  resources: {
    default: ResourceProfile       // 默认资源配置
    profiles?: ResourceProfile[]    // 预设配置档案
  }

  // 运行配置
  execution: {
    modes?: ExecutionMode[]         // 支持的执行模式
    preScript?: string            // 前置脚本
    postScript?: string           // 后置脚本
    templates: ScriptTemplate[]    // 脚本模板
  }

  // 用户界面
  interface: {
    form: FormField[]             // 表单字段定义
    layout?: any  // 表单布局配置 - 支持新旧两种格式
  }

  // 输入输出
  io?: {
    inputs?: IOSpec[]            // 输入文件规范
    outputs?: IOSpec[]           // 输出文件规范
    workingDir?: string          // 工作目录
    dataStaging?: DataStaging    // 数据暂存配置
  }

  // 监控与可视化
  monitoring?: {
    // 监控配置将在后续版本中实现
  }

  // 权限控制
  access?: {
    roles?: string[]             // 允许的角色
    users?: string[]             // 允许的用户
    groups?: string[]            // 允许的用户组
    departments?: string[]       // 允许的部门
    conditions?: AccessCondition[] // 访问条件
  }

  // 可见性管理（兼容性字段）
  visibility?: {
    isPublic?: boolean           // 是否公开
    isActive?: boolean           // 是否启用
    isListed?: boolean           // 是否在列表中显示
    allowedUsers?: string[]      // 允许的用户
    allowedGroups?: string[]     // 允许的用户组
    allowedDepartments?: string[] // 允许的部门
  }

  // 扩展配置
  extensions?: {
    [key: string]: any           // 扩展字段
  }
}

// 软件依赖
interface SoftwareRequirement {
  name: string
  version?: string              // 版本要求
  optional?: boolean           // 是否可选
  alternatives?: string[]      // 替代方案
}

// 硬件要求
interface HardwareRequirement {
  cpu?: {
    cores?: { min?: number; max?: number; default?: number }
    architecture?: string[]
    features?: string[]        // CPU特性要求（AVX, SSE等）
  }
  memory?: {
    min?: string              // 最小内存
    max?: string              // 最大内存
    default?: string          // 默认内存
    perCore?: string          // 每核心内存
  }
  storage?: {
    type?: string[]           // 存储类型（SSD, HDD, NVMe等）
    space?: string            // 存储空间要求
    iops?: number             // IOPS要求
    bandwidth?: string        // 带宽要求
  }
  gpu?: {
    required?: boolean        // 是否必需GPU
    count?: { min?: number; max?: number; default?: number }
    memory?: string           // GPU内存要求
    architecture?: string[]   // GPU架构（CUDA, ROCm等）
    features?: string[]       // GPU特性
  }
  network?: {
    bandwidth?: string        // 网络带宽要求
    latency?: string          // 延迟要求
    interconnect?: string[]   // 互连类型（InfiniBand, Ethernet等）
  }
}

// 资源配置档案
export interface ResourceProfile {
  name: string                 // 档案名称
  description?: string         // 描述（兼容旧版）
  descriptionKey?: string      // 描述翻译键（推荐）
  partition?: string           // 分区
  nodes?: number              // 节点数
  tasksPerNode?: number       // 每节点任务数
  cpusPerTask?: number        // 每任务CPU数
  memory?: string             // 内存
  walltime?: string           // 运行时间
  gpu?: {
    count?: number            // GPU数量
    type?: string             // GPU类型
  }
  constraints?: string[]      // 约束条件
  recommended?: boolean       // 是否推荐
}

// 执行模式
interface ExecutionMode {
  name: string                // 模式名称
  type: ApplicationType       // 应用类型
  description?: string        // 描述（兼容旧版，逐步废弃）
  descriptionKey?: string     // 描述翻译键（推荐）
  interactive?: boolean       // 是否交互式
  gui?: boolean              // 是否有图形界面
  parallel?: {
    type: 'serial' | 'openmp' | 'mpi' | 'hybrid'
    maxProcs?: number         // 最大进程数
  }
  launcher?: string          // 启动器（srun, mpirun等）
}

// 表单字段
export interface FormField {
  name: string               // 字段名

  // i18n支持 - 标签
  label?: string             // 标签文本（兼容旧版，逐步废弃）
  labelKey?: string          // 标签翻译键（推荐）

  type: 'text' | 'number' | 'select' | 'textarea' | 'file' | 'boolean' | 'slider' | 'array' | 'dynamic'
  required?: boolean         // 是否必需
  default?: any              // 默认值

  // i18n支持 - 描述和占位符
  description?: string       // 描述文本（兼容旧版，逐步废弃）
  descriptionKey?: string    // 描述翻译键（推荐）
  placeholder?: string       // 占位符文本（兼容旧版，逐步废弃）
  placeholderKey?: string    // 占位符翻译键（推荐）

  // 数值字段
  min?: number
  max?: number
  step?: number

  // 选择字段
  options?: Array<{
    value: any
    label?: string           // 选项标签文本（兼容旧版，逐步废弃）
    labelKey?: string        // 选项标签翻译键（推荐）
    description?: string     // 选项描述文本（兼容旧版，逐步废弃）
    descriptionKey?: string  // 选项描述翻译键（推荐）
  }>

  // 动态字段
  apiEndpoint?: string           // 动态获取选项的API端点

  // 文件字段
  accept?: string[]          // 接受的文件类型
  multiple?: boolean         // 是否多选

  // 数组字段
  itemType?: FormField       // 数组项类型

  // 条件显示
  condition?: {
    field: string            // 依赖的字段
    value: any               // 依赖的值
    operator?: '==' | '!=' | '>' | '<' | 'in' | 'contains'
  }

  // 验证规则
  validation?: {
    pattern?: string         // 正则表达式
    minLength?: number       // 最小长度
    maxLength?: number       // 最大长度
    custom?: string          // 自定义验证函数
  }

  // 帮助信息
  help?: {
    text?: string            // 帮助文本（兼容旧版，逐步废弃）
    textKey?: string         // 帮助文本翻译键（推荐）
    link?: string            // 帮助链接
    example?: string         // 示例（兼容旧版，逐步废弃）
    exampleKey?: string      // 示例翻译键（推荐）
  }
}

// 脚本模板
interface ScriptTemplate {
  name: string               // 模板名称
  description?: string       // 描述（兼容旧版，逐步废弃）
  descriptionKey?: string    // 描述翻译键（推荐）
  template: string           // 模板内容
  variables?: Variable[]     // 模板变量
}

// 模板变量
interface Variable {
  name: string               // 变量名
  source: 'form' | 'system' | 'computed' // 数据源
  transform?: string         // 转换函数
  default?: any              // 默认值
}

// IO规范
interface IOSpec {
  name: string               // 名称
  type: 'file' | 'directory' | 'stream' // 类型
  required?: boolean         // 是否必需
  pattern?: string           // 文件名模式
  description?: string       // 描述（兼容旧版,逐步废弃）
  descriptionKey?: string    // 描述翻译键（推荐）
  example?: string           // 示例（兼容旧版,逐步废弃）
  exampleKey?: string        // 示例翻译键（推荐）
}

// 数据暂存
interface DataStaging {
  stageIn?: DataStageRule[]  // 数据输入暂存
  stageOut?: DataStageRule[] // 数据输出暂存
}

interface DataStageRule {
  source: string             // 源路径
  destination: string        // 目标路径
  pattern?: string           // 文件模式
  recursive?: boolean        // 是否递归
  compress?: boolean         // 是否压缩
}

// 访问条件
interface AccessCondition {
  type: 'time' | 'quota' | 'resource' | 'custom'
  condition: string          // 条件表达式
  message?: string           // 错误消息
}