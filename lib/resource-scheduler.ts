import { HpcApplicationSpec, ResourceProfile, ApplicationType, ApplicationCategory } from './hpc-application-spec'

// 资源调度器
export class ResourceScheduler {
  private static instance: ResourceScheduler

  private constructor() {}

  static getInstance(): ResourceScheduler {
    if (!ResourceScheduler.instance) {
      ResourceScheduler.instance = new ResourceScheduler()
    }
    return ResourceScheduler.instance
  }

  /**
   * 为应用推荐最佳资源配置
   */
  async recommendResources(
    app: HpcApplicationSpec,
    userInput: any,
    clusterState?: ClusterState
  ): Promise<ResourceRecommendation> {
    const recommendations: ResourceRecommendation[] = []

    // 基于应用特性的推荐
    const appBasedRec = this.getApplicationBasedRecommendation(app, userInput)
    recommendations.push(appBasedRec)

    // 基于集群状态的推荐
    if (clusterState) {
      const clusterBasedRec = this.getClusterBasedRecommendation(app, clusterState)
      recommendations.push(clusterBasedRec)
    }

    // 基于历史数据的推荐
    const historyBasedRec = await this.getHistoryBasedRecommendation(app, userInput)
    if (historyBasedRec) {
      recommendations.push(historyBasedRec)
    }

    // 选择最佳推荐
    return this.selectBestRecommendation(recommendations)
  }

  /**
   * 基于应用特性的资源推荐
   */
  private getApplicationBasedRecommendation(
    app: HpcApplicationSpec,
    userInput: any
  ): ResourceRecommendation {
    let recommendation = { ...app.resources.default }
    let confidence = 0.7
    let reasoning: string[] = []

    // 基于应用类型调整
    if (app.metadata.type.includes(ApplicationType.GPU)) {
      recommendation.gpu = { count: 1 }
      reasoning.push('GPU加速应用，推荐使用GPU资源')
      confidence += 0.1
    }

    if (app.metadata.type.includes(ApplicationType.MPI)) {
      recommendation.nodes = Math.max(recommendation.nodes || 1, 2)
      reasoning.push('MPI并行应用，推荐使用多节点')
      confidence += 0.1
    }

    // 基于用户输入调整
    if (userInput.dataSize) {
      const dataSizeGB = this.parseDataSize(userInput.dataSize)
      if (dataSizeGB > 10) {
        recommendation.memory = this.calculateMemoryFromDataSize(dataSizeGB)
        reasoning.push(`数据量较大(${userInput.dataSize})，增加内存配置`)
        confidence += 0.1
      }
    }

    if (userInput.complexity === 'high') {
      recommendation.cpusPerTask = (recommendation.cpusPerTask || 4) * 2
      recommendation.walltime = this.extendWalltime(recommendation.walltime || '1:00:00', 2)
      reasoning.push('复杂度较高，增加CPU和运行时间')
      confidence += 0.1
    }

    return {
      profile: recommendation,
      confidence,
      reasoning,
      source: 'application-based'
    }
  }

  /**
   * 基于集群状态的资源推荐
   */
  private getClusterBasedRecommendation(
    app: HpcApplicationSpec,
    clusterState: ClusterState
  ): ResourceRecommendation {
    let recommendation = { ...app.resources.default }
    let confidence = 0.6
    let reasoning: string[] = []

    // 根据队列负载调整分区选择
    const optimalPartition = this.findOptimalPartition(clusterState)
    if (optimalPartition && optimalPartition.name !== recommendation.partition) {
      recommendation.partition = optimalPartition.name
      reasoning.push(`推荐使用负载较低的分区: ${optimalPartition.name}`)
      confidence += 0.1
    }

    // 根据可用资源调整配置
    const availableResources = this.getAvailableResources(clusterState)
    if (availableResources.nodes < (recommendation.nodes || 1)) {
      recommendation.nodes = availableResources.nodes
      reasoning.push(`根据当前可用节点数调整: ${availableResources.nodes}`)
    }

    // 考虑节能模式
    if (clusterState.powerSaving && this.canUsePowerSavingMode(app)) {
      recommendation.cpusPerTask = Math.ceil((recommendation.cpusPerTask || 4) * 0.8)
      reasoning.push('集群节能模式，适当降低CPU配置')
      confidence += 0.05
    }

    return {
      profile: recommendation,
      confidence,
      reasoning,
      source: 'cluster-based'
    }
  }

  /**
   * 基于历史数据的资源推荐
   */
  private async getHistoryBasedRecommendation(
    app: HpcApplicationSpec,
    userInput: any
  ): Promise<ResourceRecommendation | null> {
    try {
      // 查询类似作业的历史数据
      const historicalJobs = await this.queryHistoricalJobs(app.metadata.name, userInput)
      
      if (historicalJobs.length < 3) {
        return null // 历史数据不足
      }

      // 分析成功作业的资源使用模式
      const successfulJobs = historicalJobs.filter(job => job.status === 'COMPLETED')
      const analysis = this.analyzeResourceUsage(successfulJobs)

      let recommendation: ResourceProfile = {
        name: 'history-optimized',
        description: '基于历史数据优化',
        nodes: analysis.optimalNodes,
        cpusPerTask: analysis.optimalCpus,
        memory: analysis.optimalMemory,
        walltime: analysis.optimalWalltime
      }

      let confidence = Math.min(0.9, 0.5 + (successfulJobs.length * 0.05))
      let reasoning = [
        `基于${successfulJobs.length}个成功作业的历史数据`,
        `平均CPU效率: ${analysis.avgCpuEfficiency}%`,
        `平均内存使用率: ${analysis.avgMemoryUsage}%`
      ]

      return {
        profile: recommendation,
        confidence,
        reasoning,
        source: 'history-based'
      }
    } catch (error) {
      console.error('获取历史数据失败:', error)
      return null
    }
  }

  /**
   * 选择最佳推荐
   */
  private selectBestRecommendation(
    recommendations: ResourceRecommendation[]
  ): ResourceRecommendation {
    // 按置信度排序
    recommendations.sort((a, b) => b.confidence - a.confidence)
    
    const best = recommendations[0]
    
    // 合并其他推荐的insights
    const allReasoning = recommendations.flatMap(r => r.reasoning)
    best.reasoning = Array.from(new Set(allReasoning)) // 去重

    return best
  }

  /**
   * 估算作业运行时间
   */
  async estimateRuntime(
    app: HpcApplicationSpec,
    userInput: any,
    resources: ResourceProfile
  ): Promise<RuntimeEstimate> {
    // 基于应用特性的基础估算
    let baseTime = this.getBaseRuntime(app)
    
    // 基于输入数据大小调整
    if (userInput.dataSize) {
      const factor = this.getDataSizeTimeFactor(userInput.dataSize)
      baseTime *= factor
    }
    
    // 基于资源配置调整
    const resourceFactor = this.getResourceTimeFactor(resources)
    baseTime *= resourceFactor
    
    // 基于历史数据修正
    const historicalData = await this.getHistoricalRuntimeData(app.metadata.name, userInput)
    if (historicalData) {
      baseTime = this.adjustWithHistoricalData(baseTime, historicalData)
    }
    
    return {
      estimated: baseTime,
      confidence: this.calculateTimeConfidence(app, userInput),
      factors: {
        baseComplexity: this.getBaseRuntime(app),
        dataSize: userInput.dataSize ? this.getDataSizeTimeFactor(userInput.dataSize) : 1,
        resources: resourceFactor,
        historical: historicalData ? 0.9 : 1
      }
    }
  }

  /**
   * 验证资源配置
   */
  validateResourceConfiguration(
    app: HpcApplicationSpec,
    config: ResourceProfile
  ): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // 检查硬件要求
    if (app.requirements.hardware) {
      const hw = app.requirements.hardware

      // CPU检查
      if (hw.cpu?.cores) {
        if (config.cpusPerTask && hw.cpu.cores.min && config.cpusPerTask < hw.cpu.cores.min) {
          errors.push(`CPU核心数不能少于${hw.cpu.cores.min}`)
        }
        if (config.cpusPerTask && hw.cpu.cores.max && config.cpusPerTask > hw.cpu.cores.max) {
          warnings.push(`CPU核心数超过推荐最大值${hw.cpu.cores.max}`)
        }
      }

      // 内存检查
      if (hw.memory) {
        const configMemGB = this.parseMemorySize(config.memory || '0')
        const minMemGB = this.parseMemorySize(hw.memory.min || '0')
        const maxMemGB = this.parseMemorySize(hw.memory.max || '999999GB')

        if (configMemGB < minMemGB) {
          errors.push(`内存不能少于${hw.memory.min}`)
        }
        if (configMemGB > maxMemGB) {
          warnings.push(`内存超过推荐最大值${hw.memory.max}`)
        }
      }

      // GPU检查
      if (hw.gpu?.required && !config.gpu) {
        errors.push('此应用需要GPU资源')
      }
    }

    // 检查运行时间合理性
    const walltimeHours = this.parseWalltime(config.walltime || '1:00:00')
    if (walltimeHours > 168) { // 7天
      warnings.push('运行时间超过7天，请确认是否合理')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  // 辅助方法
  private parseDataSize(sizeStr: string): number {
    // 解析数据大小字符串，返回GB
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(GB|MB|TB|KB)?$/i)
    if (!match) return 0

    const [, value, unit] = match
    const num = parseFloat(value)

    switch (unit?.toUpperCase()) {
      case 'KB': return num / 1024 / 1024
      case 'MB': return num / 1024
      case 'GB': return num
      case 'TB': return num * 1024
      default: return num
    }
  }

  private calculateMemoryFromDataSize(dataSizeGB: number): string {
    // 根据数据大小估算所需内存（通常是数据大小的2-4倍）
    const memoryGB = Math.ceil(dataSizeGB * 3)
    return `${memoryGB}GB`
  }

  private extendWalltime(walltime: string, factor: number): string {
    const hours = this.parseWalltime(walltime)
    const newHours = Math.ceil(hours * factor)
    return this.formatWalltime(newHours)
  }

  private parseWalltime(walltime: string): number {
    const parts = walltime.split(':').map(Number)
    return parts[0] + (parts[1] || 0) / 60 + (parts[2] || 0) / 3600
  }

  private formatWalltime(hours: number): string {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    const s = Math.floor(((hours - h) * 60 - m) * 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  private parseMemorySize(memStr: string): number {
    return this.parseDataSize(memStr)
  }

  private findOptimalPartition(clusterState: ClusterState): Partition | null {
    return clusterState.partitions
      .sort((a, b) => a.queueLoad - b.queueLoad)[0] || null
  }

  private getAvailableResources(clusterState: ClusterState): AvailableResources {
    return {
      nodes: clusterState.availableNodes,
      cpus: clusterState.availableCpus,
      memory: clusterState.availableMemory,
      gpus: clusterState.availableGpus
    }
  }

  private canUsePowerSavingMode(app: HpcApplicationSpec): boolean {
    // 判断应用是否适合节能模式
    return !app.metadata.type.includes(ApplicationType.GPU) && 
           !app.metadata.type.includes(ApplicationType.MPI)
  }

  private async queryHistoricalJobs(appName: string, userInput: any): Promise<HistoricalJob[]> {
    // 查询历史作业数据
    // 实际实现中会连接数据库查询
    return []
  }

  private analyzeResourceUsage(jobs: HistoricalJob[]): ResourceAnalysis {
    // 分析历史作业的资源使用情况
    const analysis: ResourceAnalysis = {
      optimalNodes: 1,
      optimalCpus: 4,
      optimalMemory: '16GB',
      optimalWalltime: '2:00:00',
      avgCpuEfficiency: 85,
      avgMemoryUsage: 70
    }

    // 计算平均值和最优配置
    // 实际实现中会进行统计分析

    return analysis
  }

  private getBaseRuntime(app: HpcApplicationSpec): number {
    // 基于应用类型返回基础运行时间（小时）
    const categoryTimes: Record<ApplicationCategory, number> = {
      [ApplicationCategory.SCIENTIFIC_COMPUTING]: 2,
      [ApplicationCategory.QUANTUM_CHEMISTRY]: 8,
      [ApplicationCategory.COMPUTATIONAL_FLUID_DYNAMICS]: 12,
      [ApplicationCategory.MACHINE_LEARNING]: 4,
      [ApplicationCategory.DEEP_LEARNING]: 6,
      [ApplicationCategory.BIOINFORMATICS]: 3,
      [ApplicationCategory.CAD_CAE]: 5,
      [ApplicationCategory.VISUALIZATION]: 1,
      [ApplicationCategory.BIG_DATA]: 8,
      [ApplicationCategory.COMPILERS]: 1,
      [ApplicationCategory.DATABASES]: 2,
      [ApplicationCategory.WEB_SERVICES]: 1,
      [ApplicationCategory.DEVELOPMENT_TOOLS]: 1,
      [ApplicationCategory.SYSTEM_UTILITIES]: 1,
      [ApplicationCategory.STRUCTURAL_ANALYSIS]: 6,
      [ApplicationCategory.CFD]: 12,
      [ApplicationCategory.MULTIPHYSICS]: 10,
      [ApplicationCategory.MOLECULAR_SIMULATION]: 8
    }

    return categoryTimes[app.metadata.category] || 2
  }

  private getDataSizeTimeFactor(dataSize: string): number {
    const sizeGB = this.parseDataSize(dataSize)
    if (sizeGB < 1) return 1
    if (sizeGB < 10) return 1.5
    if (sizeGB < 100) return 3
    return 5
  }

  private getResourceTimeFactor(resources: ResourceProfile): number {
    const cpus = resources.cpusPerTask || 4
    const nodes = resources.nodes || 1
    const parallelism = cpus * nodes
    
    // 并行效率通常不是线性的
    if (parallelism <= 4) return 1
    if (parallelism <= 16) return 0.7
    if (parallelism <= 64) return 0.5
    return 0.3
  }

  private async getHistoricalRuntimeData(appName: string, userInput: any): Promise<HistoricalRuntimeData | null> {
    // 获取历史运行时间数据
    return null
  }

  private adjustWithHistoricalData(baseTime: number, historical: HistoricalRuntimeData): number {
    return baseTime * historical.averageRatio
  }

  private calculateTimeConfidence(app: HpcApplicationSpec, userInput: any): number {
    let confidence = 0.5 // 基础置信度

    // 应用成熟度
    if (app.metadata.tags.includes('stable')) confidence += 0.2
    
    // 用户输入完整性
    if (userInput.dataSize) confidence += 0.1
    if (userInput.complexity) confidence += 0.1
    
    return Math.min(confidence, 0.9)
  }
}

// 类型定义
interface ClusterState {
  availableNodes: number
  availableCpus: number
  availableMemory: string
  availableGpus: number
  partitions: Partition[]
  powerSaving: boolean
}

interface Partition {
  name: string
  queueLoad: number // 0-1之间
  availableNodes: number
}

interface AvailableResources {
  nodes: number
  cpus: number
  memory: string
  gpus: number
}

interface ResourceRecommendation {
  profile: ResourceProfile
  confidence: number // 0-1之间
  reasoning: string[]
  source: string
}

interface RuntimeEstimate {
  estimated: number // 小时
  confidence: number
  factors: {
    baseComplexity: number
    dataSize: number
    resources: number
    historical: number
  }
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface HistoricalJob {
  id: string
  appName: string
  status: string
  resources: ResourceProfile
  runtime: number
  efficiency: {
    cpu: number
    memory: number
  }
}

interface ResourceAnalysis {
  optimalNodes: number
  optimalCpus: number
  optimalMemory: string
  optimalWalltime: string
  avgCpuEfficiency: number
  avgMemoryUsage: number
}

interface HistoricalRuntimeData {
  averageRatio: number
  samples: number
  variance: number
}

export const resourceScheduler = ResourceScheduler.getInstance()