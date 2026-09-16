import { NextRequest } from 'next/server'
import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'
import { batchUpsertJobsToDb } from '@/lib/job-db'
import { JobNotificationService } from '@/lib/job-notification-service'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// 发送作业状态变化通知
async function sendJobStatusNotifications(
  newJobs: any[],
  changedJobs: any[],
  dbJobs: any[]
): Promise<void> {
  try {
    const notifications: Array<{
      jobId: string
      jobName: string
      userId: string
      oldStatus: string
      newStatus: string
      additionalInfo?: any
    }> = []

    // 处理新作业通知
    for (const job of newJobs) {
      notifications.push({
        jobId: job.jobId,
        jobName: job.jobName,
        userId: job.user,
        oldStatus: 'NEW',
        newStatus: job.status,
        additionalInfo: {
          partition: job.partition,
          nodes: Array.isArray(job.nodes) ? job.nodes.join(', ') : job.nodes,
          submitTime: job.submitTime,
          startTime: job.startTime,
          endTime: job.endTime
        }
      })
    }

    // 处理状态变化通知
    for (const job of changedJobs) {
      const dbJob = dbJobs?.find(db => db.job_id === job.jobId)
      if (dbJob && dbJob.status !== job.status) {
        // 只有真正的状态变化才发送通知
        notifications.push({
          jobId: job.jobId,
          jobName: job.jobName,
          userId: job.user,
          oldStatus: dbJob.status,
          newStatus: job.status,
          additionalInfo: {
            partition: job.partition,
            nodes: Array.isArray(job.nodes) ? job.nodes.join(', ') : job.nodes,
            reason: job.reason,
            submitTime: job.submitTime,
            startTime: job.startTime,
            endTime: job.endTime
          }
        })
      }
    }

    // 批量发送通知
    if (notifications.length > 0) {
      await JobNotificationService.notifyBatchJobStatusChange(notifications)
    }
  } catch (error) {
    console.error('发送作业状态变化通知失败:', error)
  }
}

// POST /api/jobs/sync 同步作业记录
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { searchParams } = new URL(req.url)
    const user = searchParams.get('user')
    const force = searchParams.get('force') === 'true'
    
    
    // 测试 Slurm 命令是否可用
    try {
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execFileAsync = promisify(execFile)
      
      // 测试 squeue 命令
      await execFileAsync('squeue', ['--version'])
      
      // 测试 sacct 命令
      try {
        await execFileAsync('sacct', ['--version'])
      } catch (e) {
        console.warn('sacct 命令不可用，将使用备选方案:', e)
      }
    } catch (e) {
      return Response.json({ 
        success: false, 
        error: `Slurm 命令不可用: ${e}` 
      })
    }
    
    // 1. 先查数据库获取现有作业 - 优化查询，包含VNC信息
    let dbQuery = supabase.from('jobs').select('job_id,status,user_id,submit_time,start_time,end_time,nodes,partition,job_type,params')
    if (user) {
      dbQuery = dbQuery.eq('user_id', user)
    }
    const { data: dbJobs, error: dbError } = await dbQuery
    if (dbError) {
      console.error('查询数据库作业失败:', dbError)
    }
    
    
    // 2. 查询 Slurm 获取最新状态 - 优化查询
    const slurmStartTime = Date.now()
    const slurmJobs = await slurmAdapter.listJobs(user || undefined)
    
    // 3. 增量同步：只同步状态发生变化的作业
    const changedJobs: any[] = []
    const newJobs: any[] = []
    
    for (const slurmJob of slurmJobs) {
      const dbJob = dbJobs?.find((db: any) => db.job_id === slurmJob.jobId)
      if (!dbJob) {
        // 新作业，需要插入
        newJobs.push(slurmJob)
      } else {
        // 智能状态对比：只有真正的状态变化才触发同步
        const statusChanged = slurmJob.status !== dbJob.status
        
        // 修复时间对比逻辑：标准化时间格式，避免格式差异导致的误判
        const normalizeTime = (time: any) => {
          if (!time || time === 'Unknown' || time === 'N/A' || time === '' || time === 'None') return null
          if (typeof time === 'string') {
            try {
              const date = new Date(time)
              // 检查日期是否有效
              if (isNaN(date.getTime())) {
                console.warn(`无效的时间格式: "${time}"`)
                return null
              }
              // 去除秒以下的精度，只比较到秒级
              return date.toISOString().slice(0, 19) + 'Z'
            } catch (error) {
              console.warn(`时间解析错误: "${time}"`, error)
              return null
            }
          }
          return null
        }
        
        const slurmStartTime = normalizeTime(slurmJob.startTime)
        const slurmEndTime = normalizeTime(slurmJob.endTime)
        const dbStartTime = normalizeTime(dbJob.start_time)
        const dbEndTime = normalizeTime(dbJob.end_time)
        
        const timeChanged = slurmStartTime !== dbStartTime || slurmEndTime !== dbEndTime
        
        // 运行中作业需要节点信息
        const needNodeUpdate = (
          slurmJob.status === 'RUNNING' &&
          (!dbJob.nodes || dbJob.nodes === '' || dbJob.nodes === null)
        )
        
        // 检查VNC作业是否需要特殊处理
        const isVncJob = dbJob.job_type === 'graphics' || (dbJob.params && dbJob.params.vncDisplay)
        const needVncUpdate = isVncJob && slurmJob.status === 'RUNNING' && (!dbJob.params?.vncDisplay || !dbJob.params?.vncPort)
        
        // 添加调试日志，但只记录真正的变化
        if (statusChanged) {
          console.log(`作业 ${slurmJob.jobId} 状态变化: ${dbJob.status} -> ${slurmJob.status}`)
        } else if (timeChanged) {
          console.log(`作业 ${slurmJob.jobId} 时间变化`)
        } else if (needNodeUpdate) {
          console.log(`作业 ${slurmJob.jobId} 需要更新节点信息`)
        } else if (needVncUpdate) {
          console.log(`作业 ${slurmJob.jobId} 需要更新VNC信息`)
        }
        
        // 只有真正有变化或需要补全信息时才同步
        if (statusChanged || timeChanged || needNodeUpdate || needVncUpdate) {
          // 保持数据库中的VNC信息
          if (isVncJob && dbJob.params) {
            slurmJob.vncDisplay = dbJob.params.vncDisplay
            slurmJob.vncPort = dbJob.params.vncPort
            slurmJob.jobType = 'graphics'
          }
          
          changedJobs.push(slurmJob)
        }
      }
    }
    
    
    // 4. 批量同步变化的作业 - 优化节点获取
    const jobsToSync = [...newJobs, ...changedJobs]
    
    if (jobsToSync.length > 0) {
      // 优化：只对RUNNING状态的作业强制获取节点信息
      const jobsWithNodes = await Promise.all(
        jobsToSync.map(async (job: any) => {
          let nodes: string[] = []
          let vncDisplay: number | undefined
          let vncPort: number | undefined
          let jobType: string | undefined
          
          // 对于RUNNING状态的作业，或者没有节点信息的历史作业，都获取节点信息
          if (job.status === 'RUNNING' || !job.nodes || job.nodes.length === 0) {
            try {
              // 使用更快的节点获取方法
              const detail = await slurmAdapter.getJobStatus(job.jobId)
              nodes = Array.isArray(detail.nodes) ? detail.nodes : []
              
              // 获取VNC信息（如果是图形作业）
              if (detail.jobType === 'graphics' || detail.vncDisplay) {
                vncDisplay = detail.vncDisplay
                vncPort = detail.vncPort
                jobType = 'graphics'
              }
              
            } catch (e) {
              console.error(`获取作业 ${job.jobId} 节点信息失败:`, e)
              nodes = []
            }
          }
          
          return {
            ...job,
            nodes,
            jobType: jobType || job.jobType,
            vncDisplay: vncDisplay || job.vncDisplay,
            vncPort: vncPort || job.vncPort
          }
        })
      )
      
      await batchUpsertJobsToDb(jobsWithNodes)
      
      // 发送作业状态变化通知
      await sendJobStatusNotifications(newJobs, changedJobs, dbJobs || [])
    } else {
    }

    // 5. 优化：只对UNKNOWN状态的作业进行强制刷新，限制数量
    const unknownJobs = dbJobs?.filter((j: any) => j.status === 'UNKNOWN').slice(0, 10) || []
    if (unknownJobs.length > 0) {
      
      for (const job of unknownJobs) {
        try {
          const latest = await slurmAdapter.getJobStatus(job.job_id)
          if (latest && latest.status !== 'UNKNOWN') {
            await batchUpsertJobsToDb([latest])
          }
        } catch (e) {
          console.error(`获取作业 ${job.job_id} 状态失败:`, e)
        }
      }
    }

    const totalTime = Date.now() - startTime
    
    return Response.json({
      success: true,
      message: `同步完成: 新增 ${newJobs.length} 个作业，更新 ${changedJobs.length} 个作业状态`,
      stats: {
        newJobs: newJobs.length,
        changedJobs: changedJobs.length,
        totalJobs: slurmJobs.length,
        responseTime: totalTime
      }
    })
    
  } catch (e: any) {
    const totalTime = Date.now() - startTime
    console.error('作业同步失败:', e)
    return Response.json({ 
      success: false, 
      error: e.message || '同步失败',
      responseTime: totalTime
    })
  }
}

// GET /api/jobs/sync 获取同步状态
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const user = searchParams.get('user')
    
    // 获取当前作业统计
    const jobs = await slurmAdapter.listJobs(user || undefined)
    
    const stats = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'PENDING').length,
      running: jobs.filter(j => j.status === 'RUNNING').length,
      completed: jobs.filter(j => j.status === 'COMPLETED').length,
      failed: jobs.filter(j => j.status === 'FAILED').length,
      cancelled: jobs.filter(j => j.status === 'CANCELLED').length,
      unknown: jobs.filter(j => j.status === 'UNKNOWN').length,
    }
    
    return Response.json({ 
      success: true, 
      stats,
      lastSync: new Date().toISOString(),
      user: user || 'all'
    })
  } catch (e: any) {
    return Response.json({ 
      success: false, 
      error: `获取同步状态失败: ${e.message}` 
    })
  }
} 