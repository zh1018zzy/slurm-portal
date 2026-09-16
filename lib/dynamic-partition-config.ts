/**
 * 动态分区配置工具
 * 自动获取当前集群分区并生成适合的表单配置
 */
import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'

export interface PartitionOption {
  label: string
  value: string
  description?: string
  maxCpus?: number
  maxMemory?: string
  gpuSupport?: boolean
}

export interface DynamicResourceConfig {
  partitionOptions: PartitionOption[]
  defaultPartition: string
  cpuOptions: { label: string; value: number; max?: number }[]
  memoryOptions: { label: string; value: string }[]
  walltimeOptions: { label: string; value: string }[]
}

/**
 * 分区名称映射 - 将技术分区名转换为用户友好名称
 */
const PARTITION_DISPLAY_NAMES: Record<string, { label: string; description: string; priority: number }> = {
  compute: { label: '通用计算', description: '适合CPU密集型计算作业', priority: 1 },
  graphics: { label: '图形计算', description: '支持GPU加速计算', priority: 2 },
  bigmem: { label: '大内存', description: '适合内存需求较大的作业', priority: 3 },
  gpu: { label: 'GPU计算', description: '专用GPU计算分区', priority: 2 },
  debug: { label: '调试分区', description: '用于作业调试和测试', priority: 5 },
  interactive: { label: '交互式', description: '交互式作业专用分区', priority: 4 },
  batch: { label: '批处理', description: '长时间运行的批处理作业', priority: 1 },
  short: { label: '短作业', description: '短时间运行的作业', priority: 6 },
  long: { label: '长作业', description: '长时间运行的作业', priority: 7 },
  highmem: { label: '高内存', description: '高内存需求作业', priority: 3 },
  normal: { label: '标准队列', description: '标准计算作业', priority: 1 },
  default: { label: '默认分区', description: '系统默认分区', priority: 1 }
}

/**
 * 获取集群分区配置并生成动态表单选项
 */
export async function getDynamicResourceConfig(): Promise<DynamicResourceConfig> {
  try {
    // 获取当前集群分区
    const partitions = await slurmAdapter.listPartitions()
    
    // 转换为表单选项
    const partitionOptions: PartitionOption[] = partitions
      .map(partition => {
        const displayInfo = PARTITION_DISPLAY_NAMES[partition.name] || {
          label: partition.name,
          description: `${partition.name}分区`,
          priority: 10
        }
        
        return {
          label: displayInfo.label,
          value: partition.name,
          description: displayInfo.description,
          maxCpus: partition.totalCpus,
          maxMemory: partition.totalMemory,
          gpuSupport: partition.name.includes('gpu') || partition.name.includes('graphics')
        }
      })
      .sort((a, b) => {
        const aPriority = PARTITION_DISPLAY_NAMES[a.value]?.priority || 10
        const bPriority = PARTITION_DISPLAY_NAMES[b.value]?.priority || 10
        return aPriority - bPriority
      })
    
    // 确定默认分区
    let defaultPartition = 'compute'
    const defaultCandidates = ['compute', 'batch', 'normal', 'default']
    for (const candidate of defaultCandidates) {
      if (partitionOptions.find(p => p.value === candidate)) {
        defaultPartition = candidate
        break
      }
    }
    
    // 如果没有找到常见分区，使用第一个可用分区
    if (!partitionOptions.find(p => p.value === defaultPartition) && partitionOptions.length > 0) {
      defaultPartition = partitionOptions[0].value
    }
    
    // CPU选项 (支持多节点配置)
    const cpuOptions = [
      { label: '1核', value: 1 },
      { label: '2核', value: 2 },
      { label: '4核', value: 4 },
      { label: '8核', value: 8 },
      { label: '16核', value: 16 },
      { label: '24核', value: 24 },
      { label: '32核', value: 32 },
      { label: '48核', value: 48 },
      { label: '64核 (单节点最大)', value: 64 },
      { label: '96核 (2节点)', value: 96 },
      { label: '128核 (2节点最大)', value: 128 },
      { label: '160核 (3节点)', value: 160 },
      { label: '192核 (3节点最大)', value: 192 }
    ]
    
    // 内存选项
    const memoryOptions = [
      { label: '系统默认', value: 'default' },
      { label: '2GB', value: '2GB' },
      { label: '4GB', value: '4GB' },
      { label: '8GB', value: '8GB' },
      { label: '16GB', value: '16GB' },
      { label: '32GB', value: '32GB' },
      { label: '64GB', value: '64GB' },
      { label: '128GB', value: '128GB' },
      { label: '256GB', value: '256GB' },
      { label: '512GB', value: '512GB' },
      { label: '1TB (多节点)', value: '1TB' }
    ]
    
    // 运行时限选项
    const walltimeOptions = [
      { label: '分区默认', value: 'default' },
      { label: '30分钟', value: '0:30:00' },
      { label: '1小时', value: '1:00:00' },
      { label: '2小时', value: '2:00:00' },
      { label: '4小时', value: '4:00:00' },
      { label: '8小时', value: '8:00:00' },
      { label: '12小时', value: '12:00:00' },
      { label: '1天', value: '24:00:00' },
      { label: '2天', value: '48:00:00' },
      { label: '3天', value: '72:00:00' },
      { label: '7天', value: '168:00:00' }
    ]
    
    return {
      partitionOptions,
      defaultPartition,
      cpuOptions,
      memoryOptions,
      walltimeOptions
    }
    
  } catch (error) {
    console.error('获取动态资源配置失败:', error)
    
    // 返回默认配置作为fallback
    return {
      partitionOptions: [
        { 
          label: '通用计算', 
          value: 'compute', 
          description: '默认计算分区' 
        }
      ],
      defaultPartition: 'compute',
      cpuOptions: [
        { label: '1核', value: 1 },
        { label: '4核', value: 4 },
        { label: '8核', value: 8 },
        { label: '16核', value: 16 },
        { label: '32核', value: 32 }
      ],
      memoryOptions: [
        { label: '系统默认', value: 'default' },
        { label: '8GB', value: '8GB' },
        { label: '16GB', value: '16GB' },
        { label: '32GB', value: '32GB' },
        { label: '64GB', value: '64GB' }
      ],
      walltimeOptions: [
        { label: '分区默认', value: 'default' },
        { label: '1小时', value: '1:00:00' },
        { label: '4小时', value: '4:00:00' },
        { label: '8小时', value: '8:00:00' },
        { label: '24小时', value: '24:00:00' }
      ]
    }
  }
}

/**
 * 生成动态资源配置表单字段
 */
export function generateResourceFields(config: DynamicResourceConfig, defaults?: {
  partition?: string
  cpus?: number
  memory?: string
  walltime?: string
}) {
  return [
    {
      name: 'partition',
      type: 'select' as const,
      label: '计算分区',
      default: defaults?.partition || config.defaultPartition,
      options: config.partitionOptions.map(p => ({
        label: p.description ? `${p.label} - ${p.description}` : p.label,
        value: p.value
      })),
      required: true,
      description: '选择适合的计算分区'
    },
    {
      name: 'cpus',
      type: 'select' as const,
      label: 'CPU核数',
      default: defaults?.cpus || 8,
      options: config.cpuOptions.map(c => ({
        label: c.label,
        value: c.value.toString()
      })),
      required: true,
      description: '指定作业使用的CPU核数'
    },
    {
      name: 'memory',
      type: 'select' as const,
      label: '内存配置',
      default: defaults?.memory || 'default',
      options: [
        { label: '系统默认', value: 'default' },
        ...config.memoryOptions.map(m => ({
          label: m.label,
          value: m.value
        }))
      ],
      required: true,
      description: '选择作业所需内存，"系统默认"将使用节点默认内存配置'
    },
    {
      name: 'walltime',
      type: 'select' as const,
      label: '运行时限',
      default: defaults?.walltime || 'default',
      options: [
        { label: '分区默认', value: 'default' },
        ...config.walltimeOptions.map(w => ({
          label: w.label,
          value: w.value
        }))
      ],
      required: true,
      description: '设置作业最大运行时间，"分区默认"将使用分区默认时间限制'
    }
  ]
}

/**
 * 缓存分区配置，避免频繁调用
 */
const configCache = {
  data: null as DynamicResourceConfig | null,
  timestamp: 0,
  ttl: 300000, // 5分钟缓存
  
  async get(): Promise<DynamicResourceConfig> {
    const now = Date.now()
    if (!this.data || now - this.timestamp > this.ttl) {
      this.data = await getDynamicResourceConfig()
      this.timestamp = now
    }
    return this.data
  },
  
  clear() {
    this.data = null
    this.timestamp = 0
  }
}

export { configCache as partitionConfigCache }