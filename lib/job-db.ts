import { createClient } from '@supabase/supabase-js'
import { normalizeTime, isUtcTime, smartTimeConversion, safeTimeConversion } from './utils'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * 更新作业的VNC信息
 */
export async function updateJobVncInfo(jobId: string, vncInfo: { vncDisplay: number, vncPort: number }) {
  try {
    const { error } = await supabase
      .from('jobs')
      .update({
        vncDisplay: vncInfo.vncDisplay,
        vncPort: vncInfo.vncPort,
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId)

    if (error) {
      throw new Error(`更新VNC信息失败: ${error.message}`)
    }
    
  } catch (error) {
    console.error('updateJobVncInfo 失败:', error)
    throw error
  }
}

/**
 * 单条 upsert 作业到 jobs 表
 */
export async function upsertJobToDb(job: any) {
  // 先查数据库已有记录
  let dbScript = '', dbStdout = '', dbStderr = '', dbNodes = ''
  try {
    const { data: dbJobs } = await supabase.from('jobs').select('script,stdout_path,stderr_path,nodes').eq('job_id', job.jobId).limit(1)
    if (dbJobs && dbJobs.length > 0) {
      dbScript = dbJobs[0].script || ''
      dbStdout = dbJobs[0].stdout_path || ''
      dbStderr = dbJobs[0].stderr_path || ''
      dbNodes = dbJobs[0].nodes || ''
    }
  } catch {}
  const script = job.extra?.scriptPath || job.script || dbScript || ''
  const stdout_path = job.extra?.stdoutPath || job.stdout_path || dbStdout || ''
  const stderr_path = job.extra?.stderrPath || job.stderr_path || dbStderr || ''
  // nodes 字段优先用 job.nodes，强制覆盖
  let nodesStr = null
  if (Array.isArray(job.nodes)) {
    nodesStr = job.nodes.length > 0 ? job.nodes.join(',') : ''
  } else if (typeof job.nodes === 'string' && job.nodes) {
    nodesStr = job.nodes
  } else {
    nodesStr = ''
  }
  // 计算CPU和GPU资源信息
  const cpusPerTask = job.cpusPerTask || job.cpus_per_task || 1
  const numTasks = job.ntasks || job.num_tasks || 1
  const gpusPerTask = job.gpus || job.gpus_per_task || 0
  const totalCpus = cpusPerTask * numTasks
  const totalGpus = gpusPerTask * numTasks

  // 构建参数对象：扩展字段（例如 Slurm Account）统一进入 params
  const params = { ...job.extra }
  if (job.vncDisplay) params.vncDisplay = job.vncDisplay
  if (job.vncPort) params.vncPort = job.vncPort
  if (job.account) params.account = job.account

  // 时区转换：使用更安全的时区转换函数
  const processTime = (time: any) => {
    if (!time) return null
    
    try {
      // 使用安全时区转换，避免误判
      const convertedTime = safeTimeConversion(time)
      if (convertedTime) {
        console.log(`安全时区转换: ${time} -> ${convertedTime.toISOString()}`)
        return convertedTime
      } else {
        console.warn(`时区转换失败: ${time}`)
        return null
      }
    } catch (error) {
      console.error('时间处理失败:', error, '原始时间:', time)
      return null
    }
  }

  const { error } = await supabase.from('jobs').upsert({
    job_id: job.jobId,
    user_id: job.user,
    job_name: job.jobName,
    partition: job.partition,
    nodes: nodesStr,
    status: job.status,
    submit_time: processTime(job.submitTime),
    start_time: processTime(job.startTime),
    end_time: processTime(job.endTime),
    stdout_path,
    stderr_path,
    script,
    reason: job.reason,
    params: params, // VNC信息会在这里
    cpus_per_task: cpusPerTask,
    num_tasks: numTasks,
    gpus_per_task: gpusPerTask,
    total_cpus: totalCpus,
    total_gpus: totalGpus,
    job_type: job.jobType || 'compute', // 添加job_type字段
    updated_at: new Date().toISOString(),
    scheduler_type: job.scheduler_type || 'slurm',
  }, { onConflict: 'job_id' })
  
  if (error) {
    console.error('同步作业到数据库失败:', error)
    throw new Error(`数据库同步失败: ${error.message}`)
  }
}

/**
 * 批量 upsert 作业到 jobs 表
 */
export async function batchUpsertJobsToDb(jobs: any[]) {
  if (!jobs || jobs.length === 0) return
  // 先查所有 job_id 的已有路径和 nodes
  const jobIds = jobs.map(j => j.jobId)
  let dbMap: Record<string, { script: string; stdout_path: string; stderr_path: string; nodes: string; status: string; updated_at: string }> = {}
  try {
    const { data: dbJobs } = await supabase.from('jobs').select('job_id,script,stdout_path,stderr_path,nodes,status,updated_at').in('job_id', jobIds)
    if (dbJobs) {
      dbMap = Object.fromEntries(dbJobs.map((j: any) => [j.job_id, { script: j.script || '', stdout_path: j.stdout_path || '', stderr_path: j.stderr_path || '', nodes: j.nodes || '', status: j.status || '', updated_at: j.updated_at || '' }]))
    }
  } catch {}
  const rows = jobs.map(job => {
    const params = { ...(job.extra || {}) }
    if (job.vncDisplay) params.vncDisplay = job.vncDisplay
    if (job.vncPort) params.vncPort = job.vncPort
    if (job.account) params.account = job.account

    const db = dbMap[job.jobId] || { script: '', stdout_path: '', stderr_path: '', nodes: '' }
    // nodes 字段优先用 job.nodes，强制覆盖
    let nodesStr = null
    if (Array.isArray(job.nodes)) {
      nodesStr = job.nodes.length > 0 ? job.nodes.join(',') : ''
    } else if (typeof job.nodes === 'string' && job.nodes) {
      nodesStr = job.nodes
    } else {
      nodesStr = ''
    }
    // 计算CPU和GPU资源信息
    const cpusPerTask = job.cpusPerTask || job.cpus_per_task || 1
    const numTasks = job.ntasks || job.num_tasks || 1
    const gpusPerTask = job.gpus || job.gpus_per_task || 0
    const totalCpus = cpusPerTask * numTasks
    const totalGpus = gpusPerTask * numTasks

    // 时区转换：使用更安全的时区转换函数
    const processTime = (time: any) => {
      if (!time) return null
      
      try {
        // 使用安全时区转换，避免误判
        const convertedTime = safeTimeConversion(time)
        if (convertedTime) {
          console.log(`批量更新安全时区转换: ${time} -> ${convertedTime.toISOString()}`)
          return convertedTime
        } else {
          console.warn(`批量更新时区转换失败: ${time}`)
          return null
        }
      } catch (error) {
        console.error('批量更新时间处理失败:', error, '原始时间:', time)
        return null
      }
    }

    return {
      job_id: job.jobId,
      user_id: job.user,
      job_name: job.jobName,
      partition: job.partition,
      nodes: nodesStr,
      status: job.status,
      submit_time: processTime(job.submitTime),
      start_time: processTime(job.startTime),
      end_time: processTime(job.endTime),
      stdout_path: job.extra?.stdoutPath || job.stdout_path || db.stdout_path || '',
      stderr_path: job.extra?.stderrPath || job.stderr_path || db.stderr_path || '',
      script: job.extra?.scriptPath || job.script || db.script || '',
      reason: job.reason,
      params,
      cpus_per_task: cpusPerTask,
      num_tasks: numTasks,
      gpus_per_task: gpusPerTask,
      total_cpus: totalCpus,
      total_gpus: totalGpus,
      job_type: job.jobType || 'compute', // 添加job_type字段
      // 只有在状态真正变化时才更新 updated_at
      updated_at: job.status !== dbMap[job.jobId]?.status ? new Date().toISOString() : dbMap[job.jobId]?.updated_at,
      scheduler_type: job.scheduler_type || 'slurm',
    }
  })
  const { error } = await supabase.from('jobs').upsert(rows, { onConflict: 'job_id' })
  if (error) {
    console.error('批量同步作业到数据库失败:', error)
    throw new Error(`批量数据库同步失败: ${error.message}`)
  }
} 