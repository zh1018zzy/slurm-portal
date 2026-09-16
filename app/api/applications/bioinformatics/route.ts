import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry } from '@/lib/application-registry'
import { bioinformaticsApplications } from '@/lib/bioinformatics-applications'
import { ApplicationCategory } from '@/lib/hpc-application-spec'
export const dynamic = 'force-dynamic'


/**
 * 注册生物信息学应用
 */
export async function POST(request: NextRequest) {
  try {
    
    const results = []
    
    for (const app of bioinformaticsApplications) {
      try {
        await applicationRegistry.register(app)
        results.push({
          name: app.metadata.name,
          version: app.metadata.version,
          status: 'success',
          message: '注册成功'
        })
      } catch (error) {
        console.error(`注册应用失败 ${app.metadata.name}:`, error)
        results.push({
          name: app.metadata.name,
          version: app.metadata.version,
          status: 'error',
          message: error instanceof Error ? error.message : '未知错误'
        })
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    
    return NextResponse.json({
      success: true,
      message: `生物信息学应用注册完成: ${successCount}个成功, ${errorCount}个失败`,
      data: {
        registered: successCount,
        failed: errorCount,
        details: results
      }
    })
    
  } catch (error) {
    console.error('批量注册失败:', error)
    return NextResponse.json({
      success: false,
      message: '批量注册失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 获取生物信息学应用列表
 */
export async function GET() {
  try {
    const apps = await applicationRegistry.getByCategory(ApplicationCategory.BIOINFORMATICS)
    
    return NextResponse.json({
      success: true,
      data: apps,
      count: apps.length
    })
    
  } catch (error) {
    console.error('获取生信应用失败:', error)
    return NextResponse.json({
      success: false,
      message: '获取应用列表失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}