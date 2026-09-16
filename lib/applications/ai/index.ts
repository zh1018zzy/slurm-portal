import { jupyterApp } from './jupyter'
import { pytorchApp } from './pytorch'
import { vllmApp } from './vllm'
import { HpcApplicationSpec } from '../../hpc-application-spec'

/**
 * AI应用集合
 * 包含深度学习框架、大模型推理、交互式开发环境等AI计算工具
 */

// 导出所有AI应用
export const aiApplications: HpcApplicationSpec[] = [
  jupyterApp,
  pytorchApp,
  vllmApp
]

// 按类别分组
export const aiAppsByCategory = {
  // 深度学习框架
  deepLearning: [pytorchApp],

  // 大模型推理
  inference: [vllmApp],

  // 交互式开发
  interactive: [jupyterApp]
}

// 按用途分组
export const aiAppsByPurpose = {
  // 模型训练
  training: [pytorchApp],

  // 模型推理
  serving: [vllmApp],

  // 开发调试
  development: [jupyterApp]
}

// 按GPU需求分组
export const aiAppsByGPURequirement = {
  // 必须使用GPU
  gpuRequired: [pytorchApp, vllmApp],

  // 可选GPU
  gpuOptional: [jupyterApp]
}

// 默认导出
export {
  jupyterApp,
  pytorchApp,
  vllmApp
}

// 获取AI应用元数据
export function getAIApplicationMetadata() {
  return {
    total: aiApplications.length,
    categories: Object.keys(aiAppsByCategory),
    applications: aiApplications.map(app => ({
      name: app.metadata.name,
      version: app.metadata.version,
      displayNameKey: app.metadata.displayNameKey,
      category: app.metadata.category,
      tags: app.metadata.tags,
      gpuRequired: app.requirements.hardware?.gpu?.required || false
    }))
  }
}

// 根据名称获取AI应用
export function getAIApplicationByName(name: string): HpcApplicationSpec | undefined {
  return aiApplications.find(app => app.metadata.name === name)
}

// 获取GPU必需的应用
export function getGPURequiredApplications(): HpcApplicationSpec[] {
  return aiApplications.filter(app => app.requirements.hardware?.gpu?.required === true)
}

// 获取支持分布式的应用
export function getDistributedApplications(): HpcApplicationSpec[] {
  return aiApplications.filter(app =>
    app.execution.modes?.some(mode => mode.parallel !== undefined)
  )
}
