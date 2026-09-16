import { HpcApplicationSpec, ApplicationCategory, ApplicationType } from './hpc-application-spec'
import { supabase } from './supabase'

// 应用注册表管理器 - 集成数据库版本
export class ApplicationRegistry {
  private static instance: ApplicationRegistry
  private cache: Map<string, HpcApplicationSpec> = new Map()
  private lastCacheUpdate: number = 0
  private readonly CACHE_TTL = 10 * 60 * 1000 // 增加到10分钟缓存
  private isLoading: boolean = false
  private loadPromise: Promise<void> | null = null

  private constructor() {
    // 延迟初始化，避免在构造函数中执行异步操作
  }

  static getInstance(): ApplicationRegistry {
    if (!ApplicationRegistry.instance) {
      ApplicationRegistry.instance = new ApplicationRegistry()
    }
    return ApplicationRegistry.instance
  }

  /**
   * 初始化缓存，从数据库加载应用
   */
  private async initializeCache(): Promise<void> {
    // 防止并发加载
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise
    }

    if (this.isLoading) {
      return
    }

    this.isLoading = true
    this.loadPromise = this._initializeCache()
    
    try {
      await this.loadPromise
    } finally {
      this.isLoading = false
      this.loadPromise = null
    }
  }

  private async _initializeCache(): Promise<void> {
    try {
      console.log('[ApplicationRegistry] 开始加载应用缓存...')
      const startTime = Date.now()
      
      const { data: applications, error } = await supabase
        .from('hpc_applications')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Failed to load applications from database:', error)
        return
      }

      this.cache.clear()
      if (applications) {
        for (const app of applications) {
          const spec = this.dbRowToSpec(app)
          if (spec) {
            const appId = `${spec.metadata.name}@${spec.metadata.version}`
            this.cache.set(appId, spec)
          }
        }
      }

      this.lastCacheUpdate = Date.now()
      const loadTime = Date.now() - startTime
      console.log(`[ApplicationRegistry] 缓存加载完成，共 ${this.cache.size} 个应用，耗时 ${loadTime}ms`)
    } catch (error) {
      console.error('Error initializing application cache:', error)
    }
  }

  /**
   * 刷新缓存
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = Date.now()
    console.log(`[ApplicationRegistry] 检查缓存刷新，上次更新: ${now - this.lastCacheUpdate}ms 前，TTL: ${this.CACHE_TTL}ms`)
    if (now - this.lastCacheUpdate > this.CACHE_TTL) {
      console.log(`[ApplicationRegistry] 缓存过期，开始刷新...`)
      await this.initializeCache()
    } else {
      console.log(`[ApplicationRegistry] 缓存仍然有效，跳过刷新`)
    }
  }

  /**
   * 从缓存中移除特定应用
   */
  removeFromCache(name: string, version: string): void {
    const appId = `${name}@${version}`
    const removed = this.cache.delete(appId)
    if (removed) {
      console.log(`[ApplicationRegistry] 已从缓存中移除应用: ${appId}`)
    } else {
      console.log(`[ApplicationRegistry] 应用不在缓存中: ${appId}`)
    }
  }

  /**
   * 强制清除缓存并重新加载
   */
  async clearCache(): Promise<void> {
    console.log(`[ApplicationRegistry] 清除缓存，当前缓存应用数: ${this.cache.size}`)
    this.cache.clear()
    this.lastCacheUpdate = 0
    await this.initializeCache()
    console.log(`[ApplicationRegistry] 缓存已清除并重新加载，新缓存应用数: ${this.cache.size}`)
  }

  /**
   * 将数据库行转换为应用规范
   */
  private dbRowToSpec(row: any): HpcApplicationSpec | null {
    try {
      return {
        metadata: row.metadata,
        requirements: row.requirements,
        resources: row.resources,
        execution: row.execution,
        interface: row.interface,
        io: row.io,
        monitoring: row.monitoring,
        access: row.access,
        extensions: row.extensions,
        // 兼容性字段映射
        visibility: row.access // 为管理页面提供兼容性
      }
    } catch (error) {
      console.error('Error converting database row to spec:', error)
      return null
    }
  }

  /**
   * 批量注册应用到数据库
   */
  async registerBatch(specs: HpcApplicationSpec[]): Promise<{ success: number; failed: number; errors: string[] }> {
    const results = { success: 0, failed: 0, errors: [] as string[] }

    // 逐个注册以避免upsert的唯一约束问题
    for (const spec of specs) {
      try {
        await this.register(spec)
        results.success++
      } catch (error) {
        results.failed++
        const errorMsg = error instanceof Error ? error.message : '未知错误'
        results.errors.push(`${spec.metadata.name}@${spec.metadata.version}: ${errorMsg}`)
        console.error(`注册 ${spec.metadata.name} 失败:`, error)
      }
    }

    // 刷新缓存
    if (results.success > 0) {
      this.lastCacheUpdate = 0
      await this.refreshCacheIfNeeded()
    }

    return results
  }

  /**
   * 注册应用到数据库
   */
  async register(spec: HpcApplicationSpec): Promise<void> {
    try {
      // 检查是否已存在同名同版本的应用
      const { data: existing } = await supabase
        .from('hpc_applications')
        .select('id')
        .eq('metadata->>name', spec.metadata.name)
        .eq('metadata->>version', spec.metadata.version)
        .single()

      if (existing) {
        // 更新现有应用
        await supabase
          .from('hpc_applications')
          .update({
            metadata: spec.metadata,
            requirements: spec.requirements,
            resources: spec.resources,
            execution: spec.execution,
            interface: spec.interface,
            io: spec.io,
            monitoring: spec.monitoring,
            access: spec.access || spec.visibility,
            extensions: spec.extensions,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
      } else {
        // 插入新应用
        await supabase
          .from('hpc_applications')
          .insert({
            spec_version: 'v1.0',
            metadata: spec.metadata,
            requirements: spec.requirements,
            resources: spec.resources,
            execution: spec.execution,
            interface: spec.interface,
            io: spec.io,
            monitoring: spec.monitoring,
            access: spec.access || spec.visibility,
            extensions: spec.extensions,
            status: 'active'
          })
      }

      // 更新缓存
      const appId = `${spec.metadata.name}@${spec.metadata.version}`
      this.cache.set(appId, spec)
    } catch (error) {
      console.error(`注册应用失败 ${spec.metadata.name}:`, error)
      throw error
    }
  }

  /**
   * 更新现有应用
   */
  async update(spec: HpcApplicationSpec, originalName: string, originalVersion: string): Promise<void> {
    try {
      // 直接更新现有记录
      const { error } = await supabase
        .from('hpc_applications')
        .update({
          metadata: spec.metadata,
          requirements: spec.requirements,
          resources: spec.resources,
          execution: spec.execution,
          interface: spec.interface,
          io: spec.io,
          monitoring: spec.monitoring,
          access: spec.access || spec.visibility,
          extensions: spec.extensions,
          updated_at: new Date().toISOString()
        })
        .eq('metadata->>name', originalName)
        .eq('metadata->>version', originalVersion)

      if (error) {
        throw new Error(`Failed to update application: ${error.message}`)
      }

      // 更新缓存
      const appId = `${spec.metadata.name}@${spec.metadata.version}`
      this.cache.set(appId, spec)
      
    } catch (error) {
      console.error('Error updating application:', error)
      throw error
    }
  }

  /**
   * 获取应用
   */
  async get(name: string, version?: string): Promise<HpcApplicationSpec | undefined> {
    await this.refreshCacheIfNeeded()

    if (version) {
      return this.cache.get(`${name}@${version}`)
    }
    
    // 返回最新版本
    const versions = await this.getVersions(name)
    if (versions.length === 0) return undefined
    
    const latestVersion = versions.sort().reverse()[0]
    return this.cache.get(`${name}@${latestVersion}`)
  }

  /**
   * 获取应用的所有版本
   */
  async getVersions(name: string): Promise<string[]> {
    await this.refreshCacheIfNeeded()

    const versions: string[] = []
    Array.from(this.cache.entries()).forEach(([appId, spec]) => {
      if (spec.metadata.name === name) {
        versions.push(spec.metadata.version)
      }
    })
    return versions
  }

  /**
   * 按分类获取应用
   */
  async getByCategory(category: ApplicationCategory): Promise<HpcApplicationSpec[]> {
    await this.refreshCacheIfNeeded()

    const results: HpcApplicationSpec[] = []
    Array.from(this.cache.values()).forEach(spec => {
      if (spec.metadata.category === category) {
        results.push(spec)
      }
    })
    return results
  }

  /**
   * 搜索应用
   */
  async search(query: {
    keyword?: string
    category?: ApplicationCategory
    type?: ApplicationType
    tags?: string[]
    author?: string
  }): Promise<HpcApplicationSpec[]> {
    await this.refreshCacheIfNeeded()

    return Array.from(this.cache.values()).filter(spec => {
      let match = true
      
      // 关键词搜索
      if (query.keyword) {
        const keyword = query.keyword.toLowerCase()
        const searchText = [
          spec.metadata.name,
          spec.metadata.displayName,
          spec.metadata.description,
          ...spec.metadata.tags
        ].join(' ').toLowerCase()
        
        if (!searchText.includes(keyword)) {
          match = false
        }
      }
      
      // 分类过滤
      if (query.category && spec.metadata.category !== query.category) {
        match = false
      }
      
      // 类型过滤
      if (query.type && !spec.metadata.type.includes(query.type)) {
        match = false
      }
      
      // 标签过滤
      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag => 
          spec.metadata.tags.includes(tag)
        )
        if (!hasAllTags) {
          match = false
        }
      }
      
      // 作者过滤
      if (query.author && spec.metadata.author !== query.author) {
        match = false
      }
      
      return match
    })
  }

  /**
   * 获取所有分类
   */
  async getCategories(): Promise<ApplicationCategory[]> {
    await this.refreshCacheIfNeeded()

    const categories = new Set<ApplicationCategory>()
    Array.from(this.cache.values()).forEach(spec => {
      categories.add(spec.metadata.category)
    })
    return Array.from(categories)
  }

  /**
   * 获取所有应用
   */
  async getAll(): Promise<HpcApplicationSpec[]> {
    console.log('[ApplicationRegistry] getAll() 被调用')
    await this.refreshCacheIfNeeded()
    const apps = Array.from(this.cache.values())
    console.log(`[ApplicationRegistry] 返回 ${apps.length} 个应用`)
    return apps
  }

  /**
   * 从Environment Modules自动发现应用
   */
  async discoverFromModules(): Promise<DiscoveryResult> {
    const discovered: ModuleInfo[] = []
    const converted: HpcApplicationSpec[] = []
    const errors: string[] = []

    try {
      // 执行module avail命令获取可用模块
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execFileAsync = promisify(execFile)
      
      const { stdout, stderr } = await execFileAsync('bash', ['-c', 'module avail 2>&1'])
      const output = stdout + stderr
      
      // 解析模块列表
      const moduleList = this.parseModuleAvail(output)
      discovered.push(...moduleList)
      
      // 保存发现的模块到数据库
      for (const moduleInfo of moduleList) {
        try {
          await supabase
            .from('hpc_discovered_modules')
            .upsert({
              module_name: moduleInfo.name,
              module_version: moduleInfo.version,
              full_name: moduleInfo.fullName,
              discovery_source: 'modules',
              metadata: {
                discovered_at: new Date().toISOString(),
                source_output: output.substring(0, 1000) // 截断保存
              }
            })
        } catch (error) {
          errors.push(`Failed to save module ${moduleInfo.name}: ${error}`)
        }
      }
      
      // 为已知软件生成应用规范
      for (const moduleInfo of moduleList) {
        try {
          const spec = this.generateSpecFromModule(moduleInfo)
          if (spec) {
            await this.register(spec)
            converted.push(spec)
          }
        } catch (error) {
          errors.push(`Failed to convert module ${moduleInfo.name}: ${error}`)
        }
      }
      
    } catch (error) {
      const errorMsg = `从模块发现应用失败: ${error}`
      console.error(errorMsg)
      errors.push(errorMsg)
    }

    return {
      discovered,
      converted,
      errors
    }
  }

  /**
   * 解析module avail输出
   */
  private parseModuleAvail(output: string): ModuleInfo[] {
    const modules: ModuleInfo[] = []
    const lines = output.split('\n')
    
    for (const line of lines) {
      // 匹配模块名称和版本 - 改进的正则表达式
      const modulePatterns = [
        /(\w+)\/([^\s]+)/g,  // name/version格式
        /(\w+)\s+\(([^\)]+)\)/g  // name (version)格式
      ]
      
      for (const pattern of modulePatterns) {
        let match
        while ((match = pattern.exec(line)) !== null) {
          const [fullMatch, name, version] = match
          if (name && version) {
            modules.push({
              name: name.toLowerCase(),
              version: version,
              fullName: fullMatch,
              description: `Auto-discovered from Environment Modules`
            })
          }
        }
      }
    }
    
    // 去重
    const uniqueModules = new Map<string, ModuleInfo>()
    for (const moduleInfo of modules) {
      const key = `${moduleInfo.name}@${moduleInfo.version}`
      if (!uniqueModules.has(key)) {
        uniqueModules.set(key, moduleInfo)
      }
    }
    
    return Array.from(uniqueModules.values())
  }

  /**
   * 从模块信息生成应用规范
   */
  private generateSpecFromModule(module: ModuleInfo): HpcApplicationSpec | null {
    const knownApps = this.getKnownApplicationTemplates()
    const template = knownApps[module.name]
    
    if (!template) {
      return null
    }
    
    return {
      ...template,
      metadata: {
        ...template.metadata,
        name: module.name,
        version: module.version,
        description: template.metadata?.description || module.description || `${module.name} application`
      },
      requirements: {
        ...template.requirements,
        modules: [module.fullName]
      }
    } as HpcApplicationSpec
  }

  /**
   * 获取已知应用模板
   */
  private getKnownApplicationTemplates(): Record<string, Partial<HpcApplicationSpec>> {
    return {
      // 科学计算软件
      matlab: {
        metadata: {
          name: 'matlab',
          displayName: 'MATLAB',
          version: 'latest',
          description: '数值计算、可视化和编程的高级语言和交互式环境',
          category: ApplicationCategory.SCIENTIFIC_COMPUTING,
          type: [ApplicationType.BATCH, ApplicationType.INTERACTIVE, ApplicationType.GUI],
          tags: ['matlab', 'scientific-computing', 'numerical-analysis'],
          author: 'MathWorks'
        },
        resources: {
          default: {
            name: 'default',
            nodes: 1,
            cpusPerTask: 4,
            memory: '16GB',
            walltime: '2:00:00'
          },
          profiles: []
        },
        execution: {
          modes: [
            {
              name: 'batch',
              type: ApplicationType.BATCH,
              description: '批处理模式'
            }
          ],
          templates: [
            {
              name: 'batch',
              template: '#!/bin/bash\n#SBATCH --job-name={{jobName}}\n#SBATCH --nodes={{nodes}}\n#SBATCH --cpus-per-task={{cpusPerTask}}\n#SBATCH --mem={{memory}}\n#SBATCH --time={{walltime}}\n\nmodule load {{moduleName}}\nmatlab -batch "{{matlabCode}}"'
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
              default: 'matlab-job'
            },
            {
              name: 'matlabCode',
              label: 'MATLAB代码',
              type: 'textarea',
              required: true
            }
          ]
        }
      },
      
      // 量子化学软件
      gaussian: {
        metadata: {
          name: 'gaussian',
          displayName: 'Gaussian',
          version: 'latest',
          description: '量子化学计算软件包',
          category: ApplicationCategory.QUANTUM_CHEMISTRY,
          type: [ApplicationType.BATCH, ApplicationType.MPI],
          tags: ['quantum-chemistry', 'molecular-modeling', 'dft'],
          author: 'Gaussian Inc.'
        }
      },
      
      // 机器学习框架
      tensorflow: {
        metadata: {
          name: 'tensorflow',
          displayName: 'TensorFlow',
          version: 'latest',
          description: '开源机器学习框架',
          category: ApplicationCategory.MACHINE_LEARNING,
          type: [ApplicationType.BATCH, ApplicationType.GPU, ApplicationType.JUPYTER],
          tags: ['machine-learning', 'deep-learning', 'neural-networks']
        }
      }
    }
  }

  /**
   * 验证应用规范
   */
  validate(spec: HpcApplicationSpec): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // 基本信息验证
    if (!spec.metadata.name) {
      errors.push('应用名称不能为空')
    }
    
    if (!spec.metadata.version) {
      errors.push('版本号不能为空')
    }
    
    if (!spec.metadata.description) {
      warnings.push('建议提供应用描述')
    }
    
    // 资源配置验证
    if (!spec.resources.default) {
      errors.push('必须提供默认资源配置')
    }
    
    // 执行配置验证
    if (!spec.execution.templates || spec.execution.templates.length === 0) {
      errors.push('必须提供至少一个脚本模板')
    }
    
    // 表单配置验证
    if (!spec.interface.form || spec.interface.form.length === 0) {
      warnings.push('建议提供用户界面表单')
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}

// 类型定义
interface ModuleInfo {
  name: string
  version: string
  fullName: string
  description?: string
}

interface DiscoveryResult {
  discovered: ModuleInfo[]
  converted: HpcApplicationSpec[]
  errors: string[]
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

// 导出单例实例
export const applicationRegistry = ApplicationRegistry.getInstance()