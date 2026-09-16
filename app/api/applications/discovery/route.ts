import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry } from '@/lib/application-registry'
import { checkApplicationCenterEnabled, getApplicationCenterDisabledResponse } from '../route'
export const dynamic = 'force-dynamic'


// POST /api/applications/discovery - 触发应用发现
export async function POST(request: NextRequest) {
  try {
    // 检查应用中心是否启用
    const isEnabled = await checkApplicationCenterEnabled()
    if (!isEnabled) {
      return getApplicationCenterDisabledResponse()
    }

    const body = await request.json()
    const { source = 'modules' } = body

    let result
    switch (source) {
      case 'modules':
        result = await applicationRegistry.discoverFromModules()
        break
      case 'spack':
        // 将来可以添加Spack发现
        result = { discovered: [], converted: [], errors: ['Spack discovery not implemented yet'] }
        break
      default:
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid discovery source',
            message: 'Supported sources: modules, spack'
          },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      result,
      summary: {
        discovered: result.discovered.length,
        converted: result.converted.length,
        errors: result.errors.length
      }
    })
  } catch (error) {
    console.error('Error during application discovery:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Discovery failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/applications/discovery - 获取发现状态和历史
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source')

    // 这里可以查询发现历史记录
    // 暂时返回基本信息
    return NextResponse.json({
      success: true,
      discovery: {
        lastRun: new Date().toISOString(),
        sources: ['modules', 'spack'],
        status: 'ready'
      }
    })
  } catch (error) {
    console.error('Error fetching discovery status:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch discovery status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}