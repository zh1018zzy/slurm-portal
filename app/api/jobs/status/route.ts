import { NextRequest } from 'next/server'
import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'
import { verifyJwt } from '@/lib/jwt'
export const dynamic = 'force-dynamic'


// 作业状态缓存 - 包含VNC信息
const jobStatusCache = new Map<string, {
  status: string
  vncUrl?: string
  vncDisplay?: number
  vncPort?: number
  jobType?: string
  lastUpdate: number
  ttl: number
}>()

// 缓存检查
function getCachedJobStatus(jobId: string) {
  const cached = jobStatusCache.get(jobId)
  if (cached && Date.now() - cached.lastUpdate < cached.ttl) {
    return cached
  }
  return null
}

// 更新缓存
function updateJobStatusCache(jobId: string, status: string, vncInfo?: {
  vncUrl?: string
  vncDisplay?: number
  vncPort?: number
  jobType?: string
}) {
  const ttl = status === 'RUNNING' ? 5000 : 30000 // 运行中作业5秒缓存，其他30秒
  jobStatusCache.set(jobId, {
    status,
    vncUrl: vncInfo?.vncUrl,
    vncDisplay: vncInfo?.vncDisplay,
    vncPort: vncInfo?.vncPort,
    jobType: vncInfo?.jobType,
    lastUpdate: Date.now(),
    ttl
  })
}

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

// GET /api/jobs/status?ids=105,106,107
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // 验证用户身份
  const userInfo = getCurrentUser(req)
  if (!userInfo?.username) {
    return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
  }
  
  const jobIds = searchParams.get('ids')?.split(',').filter(Boolean) || []
  
  if (jobIds.length === 0) {
    return Response.json({ success: true, jobs: [] })
  }
  
  try {
    
    // 1. 先检查缓存
    const uncachedJobIds = jobIds.filter(id => !getCachedJobStatus(id))
    const cachedJobs: any[] = []
    
    // 收集缓存的结果
    jobIds.forEach(id => {
      const cached = getCachedJobStatus(id)
      if (cached) {
        cachedJobs.push({
          jobId: id,
          status: cached.status,
          vncUrl: cached.vncUrl,
          vncDisplay: cached.vncDisplay,
          vncPort: cached.vncPort,
          jobType: cached.jobType,
          fromCache: true
        })
      }
    })
    
    
    // 2. 只查询未缓存的作业
    let freshJobs: any[] = []
    if (uncachedJobIds.length > 0) {
      try {
        // 使用 squeue 批量查询（比 scontrol 快）
        const { execFile } = await import('child_process')
        const { promisify } = await import('util')
        const execFileAsync = promisify(execFile)
        
        const { stdout } = await execFileAsync('squeue', [
          '-j', uncachedJobIds.join(','),
          '-o', '%i|%T',
          '-h'
        ])
        
        const lines = stdout.trim().split('\n').filter(Boolean)
        freshJobs = lines.map(line => {
          const [jobId, status] = line.split('|')
          // 简单的状态标准化
          const normalizedStatus = status === 'R' ? 'RUNNING' : 
                                  status === 'PD' ? 'PENDING' : 
                                  status === 'CG' ? 'COMPLETING' :
                                  status === 'CD' ? 'COMPLETED' :
                                  status === 'F' ? 'FAILED' :
                                  status === 'CA' ? 'CANCELLED' : status
          return { jobId, status: normalizedStatus, fromCache: false }
        })
        
        // 为运行中的图形作业补充VNC URL（快速查询路径）
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseUrl = process.env.SUPABASE_URL || ''
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
          const supabase = createClient(supabaseUrl, supabaseKey)
          
          const runningJobIds = freshJobs
            .filter((job: any) => job.status === 'RUNNING')
            .map((job: any) => job.jobId)
          
          if (runningJobIds.length > 0) {
            const { data: dbJobs } = await supabase
              .from('jobs')
              .select('job_id, job_type, params, nodes')
              .in('job_id', runningJobIds)
            
            // 为每个运行中的图形作业生成VNC URL
            freshJobs = await Promise.all(freshJobs.map(async (job: any) => {
              if (job.status === 'RUNNING') {
                const dbJob = dbJobs?.find((dj: any) => dj.job_id === job.jobId)
                if (dbJob) {
                  const isGraphicsJob = dbJob.job_type === 'graphics' || 
                                       (dbJob.params && dbJob.params.vncDisplay)
                  
                  if (isGraphicsJob && dbJob.params?.vncDisplay && dbJob.params?.vncPort) {
                    job.jobType = 'graphics'
                    job.vncDisplay = dbJob.params.vncDisplay
                    job.vncPort = dbJob.params.vncPort
                    
                    // 生成VNC URL
                    if (dbJob.nodes) {
                      const nodeList = dbJob.nodes.split(',').filter(Boolean)
                      if (nodeList.length > 0) {
                        try {
                          const { generateVncUrl, getVncNodeHost } = await import('@/lib/vnc-manager')
                          const vncNodeHostname = await getVncNodeHost()
                          job.vncUrl = await generateVncUrl(vncNodeHostname, job.vncPort)
                        } catch {
                          job.vncUrl = null
                        }
                      }
                    }
                  }
                }
              }
              return job
            }))
          }
        } catch (dbError) {
          console.error('[状态检查-快速] 数据库查询VNC信息失败:', dbError)
        }
        
        // 更新缓存
        freshJobs.forEach((job: any) => {
          updateJobStatusCache(job.jobId, job.status, {
            vncUrl: job.vncUrl,
            vncDisplay: job.vncDisplay,
            vncPort: job.vncPort,
            jobType: job.jobType
          })
        })
        
      } catch (error) {
        console.error('[状态检查] squeue 查询失败:', error)
        
        // 回退到单个查询 - 获取完整作业信息包括VNC URL
        freshJobs = await Promise.all(
          uncachedJobIds.map(async (jobId) => {
            try {
              const jobInfo = await slurmAdapter.getJobStatus(jobId)
              updateJobStatusCache(jobId, jobInfo.status, {
                vncUrl: typeof jobInfo.vncUrl === 'string' ? jobInfo.vncUrl : undefined,
                vncDisplay: jobInfo.vncDisplay,
                vncPort: jobInfo.vncPort,
                jobType: jobInfo.jobType
              })
              return {
                jobId,
                status: jobInfo.status,
                vncUrl: jobInfo.vncUrl,
                vncDisplay: jobInfo.vncDisplay,
                vncPort: jobInfo.vncPort,
                jobType: jobInfo.jobType,
                fromCache: false
              }
            } catch (e) {
              console.error(`[状态检查] 查询作业 ${jobId} 失败:`, e)
              return {
                jobId,
                status: 'UNKNOWN',
                fromCache: false
              }
            }
          })
        )
      }
      
      // 3. 为运行中的图形作业补充VNC URL（从数据库获取VNC信息）
      if (freshJobs.length > 0) {
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseUrl = process.env.SUPABASE_URL || ''
          const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
          const supabase = createClient(supabaseUrl, supabaseKey)
          
          const runningJobIds = freshJobs
            .filter((job: any) => job.status === 'RUNNING')
            .map((job: any) => job.jobId)
          
          if (runningJobIds.length > 0) {
            const { data: dbJobs } = await supabase
              .from('jobs')
              .select('job_id, job_type, params, nodes')
              .in('job_id', runningJobIds)
              .eq('status', 'RUNNING')
            
            // 为每个运行中的图形作业生成VNC URL
            freshJobs = await Promise.all(freshJobs.map(async (job: any) => {
              if (job.status === 'RUNNING') {
                const dbJob = dbJobs?.find((dj: any) => dj.job_id === job.jobId)
                if (dbJob) {
                  const isGraphicsJob = dbJob.job_type === 'graphics' || 
                                       (dbJob.params && dbJob.params.vncDisplay)
                  
                  if (isGraphicsJob && dbJob.params?.vncDisplay && dbJob.params?.vncPort) {
                    job.jobType = 'graphics'
                    job.vncDisplay = dbJob.params.vncDisplay
                    job.vncPort = dbJob.params.vncPort
                    
                    // 生成VNC URL
                    try {
                      const { generateVncUrl, getVncNodeHost } = await import('@/lib/vnc-manager')
                      const vncNodeHostname = await getVncNodeHost()
                      job.vncUrl = await generateVncUrl(vncNodeHostname, job.vncPort)
                    } catch (error) {
                      console.warn(`[状态检查] 生成VNC URL失败 (job ${job.jobId}):`, error)
                      job.vncUrl = null
                    }
                  }
                }
              }
              return job
            }))
          }
        } catch (dbError) {
          console.error('[状态检查] 数据库查询VNC信息失败:', dbError)
        }
      }
    }
    
    // 4. 合并结果
    const allJobs = [...cachedJobs, ...freshJobs]
    
    return Response.json({ 
      success: true, 
      jobs: allJobs,
      stats: {
        total: allJobs.length,
        cached: cachedJobs.length,
        fresh: freshJobs.length
      }
    })
    
  } catch (error) {
    console.error('[状态检查] 查询失败:', error)
    return Response.json({ 
      success: false, 
      error: '查询作业状态失败' 
    }, { status: 500 })
  }
} 