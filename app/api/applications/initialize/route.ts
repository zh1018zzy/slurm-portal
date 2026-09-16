import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry } from '@/lib/application-registry'
import { bioinformaticsApplications } from '@/lib/bioinformatics-applications'
import { ApplicationCategory } from '@/lib/hpc-application-spec'
import { checkApplicationCenterEnabled, getApplicationCenterDisabledResponse } from '../route'
export const dynamic = 'force-dynamic'


/**
 * 初始化生信应用数据
 * POST /api/applications/initialize
 */
export async function POST(request: NextRequest) {
  try {
    // 检查应用中心是否启用
    const isEnabled = await checkApplicationCenterEnabled()
    if (!isEnabled) {
      return getApplicationCenterDisabledResponse()
    }

    console.log('[初始化API] 开始批量注册生信应用...')
    const startTime = Date.now()
    
    // 使用批量注册提高性能
    const result = await applicationRegistry.registerBatch(bioinformaticsApplications)
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`[初始化API] 批量注册完成，耗时: ${duration}ms`)
    console.log(`[初始化API] 成功: ${result.success}, 失败: ${result.failed}`)
    
    if (result.errors.length > 0) {
      console.error('[初始化API] 错误详情:', result.errors)
    }
    
    return NextResponse.json({
      success: true,
      message: `生物信息学应用初始化完成`,
      data: {
        total: bioinformaticsApplications.length,
        registered: result.success,
        failed: result.failed,
        duration: `${duration}ms`,
        errors: result.errors
      }
    })
    
  } catch (error) {
    console.error('批量初始化失败:', error)
    return NextResponse.json({
      success: false,
      message: '应用初始化失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 检查初始化状态
 * GET /api/applications/initialize
 */
export async function GET() {
  try {
    // 检查应用中心是否启用
    const isEnabled = await checkApplicationCenterEnabled()
    if (!isEnabled) {
      return getApplicationCenterDisabledResponse()
    }

    console.log('[初始化API] 检查初始化状态...')
    const startTime = Date.now()
    
    // 检查是否已有生信应用
    const bioinformaticsApps = await applicationRegistry.getByCategory(ApplicationCategory.BIOINFORMATICS)
    const expectedApps = bioinformaticsApplications.map(app => ({
      name: app.metadata.name,
      version: app.metadata.version,
      displayName: app.metadata.displayName
    }))
    
    const registeredNames = bioinformaticsApps.map(app => app.metadata.name)
    const missingApps = expectedApps.filter(app => !registeredNames.includes(app.name))
    
    const endTime = Date.now()
    const duration = endTime - startTime
    
    console.log(`[初始化API] 状态检查完成，耗时: ${duration}ms`)
    console.log(`[初始化API] 已注册: ${bioinformaticsApps.length}/${expectedApps.length}`)
    
    return NextResponse.json({
      success: true,
      data: {
        total: expectedApps.length,
        registered: bioinformaticsApps.length,
        missing: missingApps.length,
        isInitialized: missingApps.length === 0,
        duration: `${duration}ms`,
        expectedApps,
        registeredApps: bioinformaticsApps.map(app => ({
          name: app.metadata.name,
          version: app.metadata.version,
          displayName: app.metadata.displayName
        })),
        missingApps
      }
    })
    
  } catch (error) {
    console.error('检查初始化状态失败:', error)
    return NextResponse.json({
      success: false,
      message: '无法检查初始化状态',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}