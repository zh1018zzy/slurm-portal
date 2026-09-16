
import { NextRequest } from 'next/server'
import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'
import { verifyJwt } from '@/lib/jwt'
import { upsertJobToDb } from '@/lib/job-db'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)



// 同步状态缓存，避免频繁同步
const syncCache = new Map<string, number>()
const SYNC_CACHE_DURATION = 60000 // 1分钟内不重复同步

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

// 智能同步函数
async function smartSync(jobId: string, jobStatus: string) {
  const now = Date.now()
  const cacheKey = `${jobId}-${jobStatus}`
  const lastSync = syncCache.get(cacheKey)
  
  // 只在必要时同步：运行中的作业且超过1分钟未同步
  if (jobStatus === 'RUNNING' && (!lastSync || now - lastSync > SYNC_CACHE_DURATION)) {
    try {
      // 使用更轻量的同步方式，只同步当前作业
      const job = await slurmAdapter.getJobStatus(jobId)
      if (job) {
        await upsertJobToDb(job)
        syncCache.set(cacheKey, now)
      }
    } catch (e) {
      console.error('[smartSync] 智能同步失败:', e)
    }
  }
}

// GET /api/jobs/{id} 查询作业状态
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    
    // 验证用户权限
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }
    
    
    // 1. 先查数据库
    const { data: dbJobs, error: dbError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', params.id)
      .limit(1)
    if (dbError) {
      console.error('查询数据库作业失败:', dbError)
    }
    if (dbJobs && dbJobs.length > 0) {
      const dbJob = dbJobs[0]
      // 权限校验
      if (userInfo.role !== 'admin' && dbJob.user_id !== userInfo.username) {
        return Response.json({ success: false, error: '没有权限查看此作业' }, { status: 403 })
      }
      // 只有数据库有节点时才直接返回，否则继续走 autofill
      const dbNodes = typeof dbJob.nodes === 'string' && dbJob.nodes.trim() !== '' ? dbJob.nodes.split(',').map((s: string) => s.trim()).filter(Boolean) : []
      if (dbNodes.length > 0) {
        // 如果是已完成的作业，可以直接从数据库返回
        // 但对于运行中的作业，仍需要查询 slurm 获取最新的 scontrol 信息
        if (dbJob.status !== 'RUNNING' && dbJob.status !== 'PENDING') {
          return Response.json({ success: true, job: {
            jobId: dbJob.job_id,
            jobName: dbJob.job_name,
            user: dbJob.user_id,
            status: dbJob.status,
            partition: dbJob.partition,
            submitTime: dbJob.submit_time,
            startTime: dbJob.start_time,
            endTime: dbJob.end_time,
            nodes: dbNodes,
            reason: dbJob.reason,
            extra: {
              ...(dbJob.params || {}), // params 字段可能包含 scontrol 等信息
              scriptPath: dbJob.script,
              stdoutPath: dbJob.stdout_path,
              stderrPath: dbJob.stderr_path,
            },
          } })
        }
      }
      // 否则继续往下走，走 Slurm 查询和 autofill
    }

    // 2. 查 Slurm
    const job = await slurmAdapter.getJobStatus(params.id)
    
    // 检查权限：只有作业所有者或管理员可以查看作业详情
    if (userInfo.role !== 'admin' && job.user !== userInfo.username) {
      return Response.json({ success: false, error: '没有权限查看此作业' }, { status: 403 })
    }
    
    // 3. 合并数据库原有信息和新查询的信息
    let mergedJob = { ...job }

    // 如果数据库中有记录，合并字段（优先用新值，无新值时保留旧值）
    if (dbJobs && dbJobs.length > 0) {
      const dbJob = dbJobs[0]
      mergedJob = {
        ...job,
        // 节点信息：始终保证为数组类型
        nodes: Array.isArray(job.nodes) && job.nodes.length > 0
          ? job.nodes
          : (typeof dbJob.nodes === 'string' && dbJob.nodes.trim() !== ''
              ? dbJob.nodes.split(',')
              : []),
        // 合并 extra 字段，优先用数据库和规则推断
        extra: {
          ...dbJob.params, // 数据库中的 params 字段存储了 extra 信息
          ...job.extra, // 保留 job.extra 中的所有字段，包括 scontrol
          scriptPath:
            (job.extra?.scriptPath && job.extra?.scriptPath !== 'no') ? job.extra.scriptPath :
            (dbJob.script && dbJob.script !== 'no' ? dbJob.script : `/home/${job.user}/my-jobs/job_${job.jobId}/job.sh`),
          stdoutPath:
            (job.extra?.stdoutPath && job.extra?.stdoutPath !== 'no') ? job.extra.stdoutPath :
            (dbJob.stdout_path && dbJob.stdout_path !== 'no' ? dbJob.stdout_path : `/home/${job.user}/my-jobs/job_${job.jobId}/slurm-${job.jobId}.out`),
          stderrPath:
            (job.extra?.stderrPath && job.extra?.stderrPath !== 'no') ? job.extra.stderrPath :
            (dbJob.stderr_path && dbJob.stderr_path !== 'no' ? dbJob.stderr_path : `/home/${job.user}/my-jobs/job_${job.jobId}/slurm-${job.jobId}.err`),
          // scontrol 字段已经通过 ...job.extra 保留
        },
        reason: job.reason || dbJob.reason || '',
        partition: job.partition || dbJob.partition || '',
        // 时间字段合并，优先新值，有就用，没有就用数据库旧值，兜底为 null
        submitTime: job.submitTime || dbJob.submit_time || null,
        startTime: job.startTime || dbJob.start_time || null,
        endTime: job.endTime || dbJob.end_time || null,
      }
    }

    // --- autofill 节点补全逻辑和日志 ---
    let autofilled = false
    // 进入 autofill 逻辑前日志
    // 使用智能同步替代全量同步，避免频繁的全量同步
    if (mergedJob.status === 'RUNNING') {
      await smartSync(params.id, mergedJob.status)
    }
    
    // 优化：节点为空时自动重试2次，每次延迟1秒，最大化补全节点
    if ((mergedJob.status === 'RUNNING' || mergedJob.status === 'COMPLETED') && (!mergedJob.nodes || mergedJob.nodes.length === 0)) {
      try {
        let detail = null
        for (let i = 0; i < 2; i++) {
          detail = await slurmAdapter.getJobStatus(params.id)
        if (detail.nodes && detail.nodes.length > 0) {
          mergedJob.nodes = detail.nodes
          autofilled = true
            break
          }
          // 延迟1秒后重试
          await new Promise(res => setTimeout(res, 1000))
        }
      } catch (e) {
        console.error('[autofill] 自动补全节点失败:', e)
      }
    }
    if (autofilled) {
      try {
        const upsertResult = await upsertJobToDb(mergedJob)
      } catch (e) {
        console.error('[autofill] 写入数据库失败:', e)
      }
    }
    // --- 强制 getJobStatus 日志 ---
    try {
      const detail = await slurmAdapter.getJobStatus(params.id)
    } catch (e) {
      console.error('[debug] 强制 getJobStatus error:', e)
    }
    return Response.json({ success: true, job: mergedJob })
  } catch (e: any) {
    console.error(`查询作业详情失败: ${e.message}`)
    return Response.json({ success: false, message: e.message })
  }
} 

// PATCH /api/jobs/[id] 暂停/继续作业
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const userInfo = getCurrentUser(req)
  if (!userInfo?.username) {
    return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
  }
  const jobId = params.id
  try {
    const body = await req.json().catch(() => ({}))
    const action = body?.action
    if (action !== 'suspend' && action !== 'resume') {
      return Response.json({ success: false, message: '无效操作，请使用 action: "suspend" 或 "resume"' }, { status: 400 })
    }
    const job = await slurmAdapter.getJobStatus(jobId)
    if (!job?.jobId) {
      return Response.json({ success: false, message: '作业不存在' }, { status: 404 })
    }
    if (userInfo.role !== 'admin' && job.user !== userInfo.username) {
      return Response.json({ success: false, error: '没有权限操作此作业' }, { status: 403 })
    }
    if (action === 'suspend') {
      if (job.status !== 'RUNNING' && job.status !== 'PENDING') {
        return Response.json({ success: false, message: '仅运行中或等待中的作业可暂停' }, { status: 400 })
      }
      const ok = await slurmAdapter.suspendJob(jobId)
      return ok
        ? Response.json({ success: true })
        : Response.json({ success: false, message: '暂停作业失败' })
    }
    if (action === 'resume') {
      if (job.status !== 'SUSPENDED') {
        return Response.json({ success: false, message: '仅已暂停的作业可继续' }, { status: 400 })
      }
      const ok = await slurmAdapter.resumeJob(jobId)
      return ok
        ? Response.json({ success: true })
        : Response.json({ success: false, message: '继续作业失败' })
    }
    return Response.json({ success: false, message: '无效操作' }, { status: 400 })
  } catch (e: any) {
    console.error(`作业暂停/继续失败: ${e.message}`)
    return Response.json({ success: false, message: e.message })
  }
}

// DELETE /api/jobs/[id] 取消作业
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userInfo = getCurrentUser(req)
  if (!userInfo?.username) {
    return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
  }
  const jobId = params.id
  try {
    // 可加权限校验：只有作业所有者或管理员可取消
    // 这里简单实现，生产环境建议校验作业归属
    const ok = await slurmAdapter.cancelJob(jobId)
    if (ok) {
      return Response.json({ success: true })
    } else {
      return Response.json({ success: false, message: '取消作业失败' })
    }
  } catch (e: any) {
    return Response.json({ success: false, message: e.message })
  }
} 