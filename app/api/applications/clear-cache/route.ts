import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry } from '@/lib/application-registry'
export const dynamic = 'force-dynamic'


export async function POST(request: NextRequest) {
  try {
    await applicationRegistry.clearCache()
    
    return NextResponse.json({
      success: true,
      message: '应用缓存已清除并重新加载'
    })
  } catch (error) {
    console.error('清除应用缓存失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear application cache',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 