import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry } from '@/lib/application-registry'
import { aiApplications, getAIApplicationMetadata } from '@/lib/applications/ai'
import { ApplicationCategory } from '@/lib/hpc-application-spec'
import { checkApplicationCenterEnabled, getApplicationCenterDisabledResponse } from '../route'
export const dynamic = 'force-dynamic'


/**
 * AI应用管理API
 * 提供AI应用的查询、注册、统计等功能
 */

/**
 * GET /api/applications/ai
 * 获取所有AI应用列表
 */
export async function GET(request: NextRequest) {
  try {
    // 检查应用中心是否启用
    const isEnabled = await checkApplicationCenterEnabled()
    if (!isEnabled) {
      return getApplicationCenterDisabledResponse()
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const gpuRequired = searchParams.get('gpuRequired')

    // 获取所有AI相关应用
    const mlApps = await applicationRegistry.getByCategory(ApplicationCategory.MACHINE_LEARNING)
    const dlApps = await applicationRegistry.getByCategory(ApplicationCategory.DEEP_LEARNING)
    const devApps = await applicationRegistry.getByCategory(ApplicationCategory.DEVELOPMENT_TOOLS)

    // 过滤包含AI标签的应用
    const allAIApps = [...mlApps, ...dlApps, ...devApps].filter(app =>
      app.metadata.tags?.some(tag =>
        ['ai', 'gpu', 'deep-learning', 'machine-learning', 'jupyter', 'llm', 'pytorch', 'vllm'].includes(tag)
      )
    )

    // 按条件过滤
    let filteredApps = allAIApps

    if (category) {
      filteredApps = filteredApps.filter(app => app.metadata.category === category)
    }

    if (gpuRequired !== null) {
      const requireGPU = gpuRequired === 'true'
      filteredApps = filteredApps.filter(app =>
        app.requirements.hardware?.gpu?.required === requireGPU
      )
    }

    // 按类别分组
    const byCategory = {
      deepLearning: filteredApps.filter(app => app.metadata.category === ApplicationCategory.DEEP_LEARNING),
      machineLearning: filteredApps.filter(app => app.metadata.category === ApplicationCategory.MACHINE_LEARNING),
      interactive: filteredApps.filter(app => app.metadata.category === ApplicationCategory.DEVELOPMENT_TOOLS)
    }

    // 按GPU需求分组
    const byGPURequirement = {
      required: filteredApps.filter(app => app.requirements.hardware?.gpu?.required === true),
      optional: filteredApps.filter(app => app.requirements.hardware?.gpu?.required !== true)
    }

    return NextResponse.json({
      success: true,
      data: {
        all: filteredApps,
        byCategory,
        byGPURequirement,
        metadata: {
          total: filteredApps.length,
          deepLearning: byCategory.deepLearning.length,
          machineLearning: byCategory.machineLearning.length,
          interactive: byCategory.interactive.length,
          gpuRequired: byGPURequirement.required.length,
          gpuOptional: byGPURequirement.optional.length
        }
      }
    })
  } catch (error) {
    console.error('[AI API] 获取AI应用列表失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * POST /api/applications/ai
 * 批量注册AI应用
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[AI API] 开始批量注册AI应用...')
    const startTime = Date.now()

    // 批量注册
    const result = await applicationRegistry.registerBatch(aiApplications)

    const duration = Date.now() - startTime

    console.log(`[AI API] 注册完成，耗时: ${duration}ms`)
    console.log(`[AI API] 成功: ${result.success}, 失败: ${result.failed}`)

    if (result.errors.length > 0) {
      console.error('[AI API] 注册错误:', result.errors)
    }

    // 获取元数据
    const metadata = getAIApplicationMetadata()

    return NextResponse.json({
      success: true,
      message: `AI应用注册完成: ${result.success}个成功, ${result.failed}个失败`,
      data: {
        registered: result.success,
        failed: result.failed,
        total: aiApplications.length,
        duration: `${duration}ms`,
        errors: result.errors,
        applications: metadata.applications
      }
    })
  } catch (error) {
    console.error('[AI API] 批量注册失败:', error)
    return NextResponse.json({
      success: false,
      message: 'AI应用注册失败',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * DELETE /api/applications/ai
 * 清除AI应用缓存
 */
export async function DELETE(request: NextRequest) {
  try {
    await applicationRegistry.clearCache()

    return NextResponse.json({
      success: true,
      message: 'AI应用缓存已清除'
    })
  } catch (error) {
    console.error('[AI API] 清除缓存失败:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
