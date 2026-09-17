import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { jobCache } from '@/lib/job-cache'
import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'
export const dynamic = 'force-dynamic'


// 获取当前用户信息
function getCurrentUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  const userInfo = verifyJwt(token)
  return userInfo
}

// GET /api/jobs/active - 只获取活跃作业（PENDING/RUNNING）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // 验证用户身份
  const userInfo = getCurrentUser(req)
  if (!userInfo?.username) {
    return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
  }

  try {
    // 检查是否需要清除缓存
    const clearCache = searchParams.get('clear_cache') === 'true'
    if (clearCache) {
      jobCache.invalidate(userInfo.username)
    }
    
    const page = Number.parseInt(searchParams.get('page') || '1') || 1
    const rawPageSize = Number.parseInt(searchParams.get('pageSize') || '200') || 200
    const MAX_PAGE_SIZE = 500
    const pageSize = Math.min(rawPageSize, MAX_PAGE_SIZE)

    const statusFilter = searchParams.get('status') || 'all' // all | RUNNING | PENDING
    const partitionFilter = searchParams.get('partition') || 'all'
    const jobTypeFilter = searchParams.get('jobType') || 'all'
    const searchTerm = searchParams.get('search') || ''

    const hasFilters =
      statusFilter !== 'all' ||
      partitionFilter !== 'all' ||
      jobTypeFilter !== 'all' ||
      searchTerm.trim() !== '' ||
      page !== 1 ||
      pageSize !== 50

    // 仅在“无筛选 + 第1页 + pageSize=50”的场景启用缓存，避免缓存与筛选/分页冲突
    const cacheKey = `active_jobs_${userInfo.username}`
    if (!hasFilters) {
      const cachedResult = (jobCache as any).cache[cacheKey]
      if (cachedResult) {
        const now = Date.now()
        if (now - cachedResult.timestamp > cachedResult.ttl) {
          delete (jobCache as any).cache[cacheKey]
        } else {
          const activeJobs = cachedResult.jobs.filter((job: any) => job.status === 'PENDING' || job.status === 'RUNNING')

          const graphicsJobs = activeJobs.filter((job: any) => job.jobType === 'graphics')
          const runningGraphicsJobs = graphicsJobs.filter((job: any) => job.status === 'RUNNING')
          const jobsWithoutVncUrl = runningGraphicsJobs.filter((job: any) => !job.vncUrl)

          if (jobsWithoutVncUrl.length === 0) {
            return Response.json({
              success: true,
              jobs: activeJobs,
              total: activeJobs.length,
              page: 1,
              pageSize: 50,
              totalPages: 1,
              fromCache: true,
            })
          }
        }
      }
    }

    // 优先从 Slurm 实时队列获取（squeue），减少 DB 压力
    const requestedUser = userInfo.role === 'admin' ? (searchParams.get('user') || undefined) : userInfo.username
    let slurmJobs = await slurmAdapter.listActiveJobs(requestedUser)

    // 基础筛选（活跃列表仅 RUNNING/PENDING）
    slurmJobs = slurmJobs.filter(j => j.status === 'RUNNING' || j.status === 'PENDING')

    if (statusFilter === 'RUNNING' || statusFilter === 'PENDING') {
      slurmJobs = slurmJobs.filter(j => j.status === statusFilter)
    }
    if (partitionFilter !== 'all') {
      slurmJobs = slurmJobs.filter(j => j.partition === partitionFilter)
    }
    if (searchTerm.trim() !== '') {
      const q = searchTerm.trim().toLowerCase()
      slurmJobs = slurmJobs.filter(j => (j.jobId || '').includes(q) || (j.jobName || '').toLowerCase().includes(q))
    }

    // 补齐 jobType / vnc 参数：仅对可能的图形作业做 DB 小查询（可选）
    const possibleGraphicsJobIds = slurmJobs
      .filter(j => (j.jobName || '').toLowerCase().includes('vnc') || (j.jobName || '').toLowerCase().includes('desktop'))
      .map(j => j.jobId)

    let graphicsExtraById = new Map<string, { jobType?: string; vncDisplay?: number; vncPort?: number }>()
    if (possibleGraphicsJobIds.length > 0) {
      try {
        const { createClient } = await import('@supabase/supabase-js')
        const supabaseUrl = process.env.SUPABASE_URL || ''
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { data: rows } = await supabase
          .from('jobs')
          .select('job_id,job_type,params')
          .in('job_id', possibleGraphicsJobIds)

        for (const row of rows || []) {
          graphicsExtraById.set(String(row.job_id), {
            jobType: row.job_type,
            vncDisplay: row.params?.vncDisplay,
            vncPort: row.params?.vncPort,
          })
        }
      } catch (e) {
        // DB 补齐失败不影响主流程
      }
    }

    const { generateVncUrl, getVncNodeHost } = await import('@/lib/vnc-manager')
    const vncNodeHostname = await getVncNodeHost()

    const enriched = await Promise.all(
      slurmJobs.map(async (job: any) => {
        const extra = graphicsExtraById.get(job.jobId)
        const jobType = (extra?.jobType as any) || (jobTypeFilter !== 'all' ? jobTypeFilter : 'compute')

        // 仅当命中图形作业且运行中且有端口信息时生成 vncUrl
        const isGraphics = jobType === 'graphics'
        let vncUrl: string | null = null
        if (isGraphics && job.status === 'RUNNING' && extra?.vncPort) {
          try {
            vncUrl = await generateVncUrl(vncNodeHostname, extra.vncPort)
          } catch {
            vncUrl = null
          }
        }

        return {
          ...job,
          jobType: isGraphics ? 'graphics' : (job.jobType || 'compute'),
          vncDisplay: extra?.vncDisplay ?? null,
          vncPort: extra?.vncPort ?? null,
          vncUrl,
        }
      })
    )

    // jobTypeFilter 需要在 enrichment 后应用（因为 Slurm 侧没有 job_type）
    let jobsWithVncUrl = enriched
    if (jobTypeFilter !== 'all') {
      jobsWithVncUrl = jobsWithVncUrl.filter((j: any) => j.jobType === jobTypeFilter)
    }
    
    // 设置缓存
    if (!hasFilters) {
      ;(jobCache as any).cache[cacheKey] = {
        jobs: jobsWithVncUrl,
        total: jobsWithVncUrl.length,
        stats: {
          pending: jobsWithVncUrl.filter(j => j.status === 'PENDING').length,
          running: jobsWithVncUrl.filter(j => j.status === 'RUNNING').length
        },
        timestamp: Date.now(),
        ttl: 8000 // 8秒缓存
      }
    }

    const total = jobsWithVncUrl.length
    const safePage = Math.max(page, 1)
    const startIndex = (safePage - 1) * pageSize
    const endIndex = startIndex + pageSize
    const pagedJobs = jobsWithVncUrl.slice(startIndex, endIndex)

    return Response.json({
      success: true,
      jobs: pagedJobs,
      total,
      page: safePage,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    })
    
  } catch (error: any) {
    console.error('获取活跃作业失败:', error)
    return Response.json({ 
      success: false, 
      error: error.message || '获取活跃作业失败' 
    })
  }
} 