import { NextRequest, NextResponse } from 'next/server'
import { jobSyncScheduler } from '@/lib/cron/job-sync-scheduler'
export const dynamic = 'force-dynamic'


/**
 * POST /api/cron/trigger
 * 手动触发定时同步任务（用于测试）
 * 
 * 参数：
 * - type: 'daily' | 'weekly'
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { type } = body
    
    if (!type || !['daily', 'weekly'].includes(type)) {
      return NextResponse.json({
        success: false,
        error: '参数错误：type 必须是 "daily" 或 "weekly"'
      }, { status: 400 })
    }
    
    // 异步执行同步任务，不等待结果
    if (type === 'daily') {
      jobSyncScheduler.triggerDailySync().catch(error => {
        console.error('手动触发每日同步失败:', error)
      })
      return NextResponse.json({
        success: true,
        message: '每日同步任务已触发，正在后台执行...'
      })
    } else {
      jobSyncScheduler.triggerWeeklySync().catch(error => {
        console.error('手动触发每周同步失败:', error)
      })
      return NextResponse.json({
        success: true,
        message: '每周同步任务已触发，正在后台执行...'
      })
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

