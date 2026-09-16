import { NextRequest, NextResponse } from 'next/server'
import { jobSyncScheduler } from '@/lib/cron/job-sync-scheduler'
export const dynamic = 'force-dynamic'


/**
 * GET /api/cron/status
 * 获取定时任务状态
 */
export async function GET(req: NextRequest) {
  try {
    const status = jobSyncScheduler.getStatus()
    
    return NextResponse.json({
      success: true,
      scheduler: status,
      serverTime: new Date().toISOString(),
      serverTimeZone: 'Asia/Shanghai'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

