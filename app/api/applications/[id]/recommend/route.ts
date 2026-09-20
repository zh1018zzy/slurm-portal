import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry } from '@/lib/application-registry'
import { resourceScheduler } from '@/lib/resource-scheduler'
export const dynamic = 'force-dynamic'


// POST /api/applications/[id]/recommend - 获取资源推荐
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const { id } = resolvedParams
    const userInput = await request.json()

    // 获取应用规范 - 支持应用名称或ID
    let app = await applicationRegistry.get(id, userInput.version)
    
    // 如果按名称没找到，尝试按ID查找（向后兼容）
    if (!app) {
      const allApps = await applicationRegistry.getAll()
      app = allApps.find(a => 
        a.metadata.name === id || 
        `${a.metadata.name}@${a.metadata.version}` === id
      )
    }
    if (!app) {
      // 这里可以添加按数据库ID查询的逻辑
      return NextResponse.json(
        {
          success: false,
          error: 'Application not found',
          message: `Application '${id}' does not exist`
        },
        { status: 404 }
      )
    }

    // 获取集群状态（可选）
    const clusterState = await getClusterState()

    // 获取资源推荐
    const recommendation = await resourceScheduler.recommendResources(
      app,
      userInput,
      clusterState
    )

    // 获取运行时间估算
    const runtimeEstimate = await resourceScheduler.estimateRuntime(
      app,
      userInput,
      recommendation.profile
    )

    return NextResponse.json({
      success: true,
      recommendation: {
        ...recommendation,
        runtime: runtimeEstimate
      },
      metadata: {
        application: app.metadata.name,
        version: app.metadata.version,
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Error generating resource recommendation:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate recommendation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// GET /api/applications/[id]/recommend - 获取预设推荐配置
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const { id } = resolvedParams
    const { searchParams } = new URL(request.url)
    const profileName = searchParams.get('profile')

    // 获取应用规范
    let app = await applicationRegistry.get(id)
    
    if (!app) {
      return NextResponse.json(
        {
          success: false,
          error: 'Application not found'
        },
        { status: 404 }
      )
    }

    // 如果指定了profile，返回特定配置
    if (profileName) {
      const profile = app.resources.profiles?.find(p => p.name === profileName) || app.resources.default
      return NextResponse.json({
        success: true,
        profile,
        source: 'predefined'
      })
    }

    // 返回所有可用的资源配置
    const profiles = [
      {
        ...app.resources.default,
        recommended: true,
        description: app.resources.default.description || '默认推荐配置'
      },
      ...(app.resources.profiles || [])
    ]

    return NextResponse.json({
      success: true,
      profiles,
      default: app.resources.default.name
    })
  } catch (error) {
    console.error('Error fetching resource profiles:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch profiles',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// 获取集群状态的辅助函数
async function getClusterState(): Promise<any | undefined> {
  try {
    // 这里可以集成真实的集群监控数据
    // 目前返回模拟数据
    return {
      availableNodes: 50,
      availableCpus: 2000,
      availableMemory: '4TB',
      availableGpus: 20,
      partitions: [
        { name: 'compute', queueLoad: 0.3, availableNodes: 30 },
        { name: 'gpu', queueLoad: 0.7, availableNodes: 8 },
        { name: 'highmem', queueLoad: 0.1, availableNodes: 5 },
        { name: 'interactive', queueLoad: 0.2, availableNodes: 7 }
      ],
      powerSaving: false
    }
  } catch (error) {
    console.warn('Failed to get cluster state:', error)
    return undefined
  }
}