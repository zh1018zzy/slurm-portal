import { NextRequest } from 'next/server'
import { jobSyncManager } from '@/lib/job-sync'
export const dynamic = 'force-dynamic'


// GET /api/jobs/persistent 从本地数据库获取作业列表
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user = searchParams.get('user') || undefined
  const page = parseInt(searchParams.get('page') || '1')
  const pageSize = parseInt(searchParams.get('pageSize') || '20')
  const status = searchParams.get('status') || undefined
  
  try {
    const offset = (page - 1) * pageSize
    
    const jobs = await jobSyncManager.getJobs(user, {
      status,
      limit: pageSize,
      offset
    })
    
    const stats = await jobSyncManager.getStats(user)
    
    return Response.json({ 
      success: true, 
      jobs,
      total: stats.total,
      page,
      pageSize,
      totalPages: Math.ceil(stats.total / pageSize),
      stats
    })
  } catch (e: any) {
    return Response.json({ success: false, message: e.message })
  }
}

// POST /api/jobs/persistent/sync 同步作业到本地数据库
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const user = searchParams.get('user')
  const force = searchParams.get('force') === 'true'
  
  try {
    
    const syncStats = await jobSyncManager.syncJobs(user || undefined)
    
    return Response.json({ 
      success: true, 
      message: `同步完成: 总计 ${syncStats.total}, 新增 ${syncStats.new}, 更新 ${syncStats.updated}, 未变 ${syncStats.unchanged}, 错误 ${syncStats.errors}`,
      stats: syncStats
    })
  } catch (e: any) {
    console.error('同步作业到本地数据库失败:', e)
    return Response.json({ 
      success: false, 
      error: `同步失败: ${e.message}` 
    })
  }
}

// DELETE /api/jobs/persistent/cleanup 清理旧数据
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const daysToKeep = parseInt(searchParams.get('days') || '365')
  
  try {
    const deletedCount = await jobSyncManager.cleanupOldJobs(daysToKeep)
    
    return Response.json({ 
      success: true, 
      message: `清理了 ${deletedCount} 个旧作业记录`,
      deletedCount
    })
  } catch (e: any) {
    return Response.json({ 
      success: false, 
      error: `清理失败: ${e.message}` 
    })
  }
} 