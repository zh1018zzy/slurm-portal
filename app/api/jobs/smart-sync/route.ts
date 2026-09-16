import { NextRequest, NextResponse } from 'next/server'
import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'
import { batchUpsertJobsToDb } from '@/lib/job-db'
import { createClient } from '@supabase/supabase-js'
import { jobCache } from '@/lib/job-cache'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// 简化的同步状态管理
interface SyncState {
  lastCheck: number
  hasActiveJobs: boolean
  activeJobCount: number
}

const syncState: SyncState = {
  lastCheck: 0,
  hasActiveJobs: false,
  activeJobCount: 0
}

// 检查是否有活跃作业
async function checkActiveJobs(): Promise<{ hasActive: boolean; activeJobCount: number }> {
  try {
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)
    
    const { stdout } = await execFileAsync('squeue', [
      '-o', '%i|%T',
      '-h'
    ])
    
    const activeJobs = stdout.trim().split('\n').filter(Boolean)
    
    return {
      hasActive: activeJobs.length > 0,
      activeJobCount: activeJobs.length
    }
  } catch (error) {
    console.error('检查活跃作业失败:', error)
    return { hasActive: false, activeJobCount: 0 }
  }
}

// 获取所有作业状态（使用sacct，不加时间参数，过滤.batch记录）
async function getAllJobsStatus(): Promise<any[]> {
  try {
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)
    
    // 使用sacct获取所有作业状态，不加时间参数
    const { stdout } = await execFileAsync('sacct', [
      '-o', 'JobID,State,User,Partition,NodeList,Start,End,JobName,Submit',
      '-P',
      '-n',
      '--format=JobID,State,User,Partition,NodeList,Start,End,JobName,Submit'
    ])
    
    const lines = stdout.trim().split('\n').filter(Boolean)
    const jobs: any[] = []
    const processedJobs = new Set<string>() // 用于去重
    
    for (const line of lines) {
      const [jobId, status, user, partition, nodes, startTime, endTime, jobName, submitTime] = line.split('|')
      
      // 跳过无效的作业ID
      if (!jobId || jobId === 'Unknown' || jobId === '') {
        continue
      }
      
      // 跳过所有带后缀的记录（如 .batch, .extern 等），只保留主作业记录
      if (jobId.includes('.')) {
        continue
      }
      
      // 去重：如果已经处理过这个作业ID，跳过
      if (processedJobs.has(jobId)) {
        continue
      }
      
      processedJobs.add(jobId)
      
      // 标准化状态
      const normalizedStatus = normalizeSlurmStatus(status)
      
      // 过滤无效的时间值
      const isValidTime = (time: string) => time && time !== 'Unknown' && time !== 'None' && time !== 'N/A' && time !== ''
      
      jobs.push({
        jobId,
        status: normalizedStatus,
        user,
        partition,
        nodes: nodes || '',
        startTime: isValidTime(startTime) ? startTime : '',
        endTime: isValidTime(endTime) ? endTime : '',
        jobName: jobName || '',
        submitTime: isValidTime(submitTime) ? submitTime : ''
      })
    }
    
    return jobs
  } catch (error) {
    console.error('获取作业状态失败:', error)
    return []
  }
}

// 标准化Slurm状态（支持缩写和全名格式）
function normalizeSlurmStatus(status: string): string {
  // 先转换为大写并去除空格
  const cleanStatus = status.trim().toUpperCase()
  
  const statusMap: Record<string, string> = {
    // 缩写格式
    'R': 'RUNNING',
    'PD': 'PENDING',
    'CG': 'COMPLETING',
    'CD': 'COMPLETED',
    'F': 'FAILED',
    'CA': 'CANCELLED',
    'TO': 'TIMEOUT',
    'NF': 'NODE_FAIL',
    'PR': 'PREEMPTED',
    'S': 'SUSPENDED',
    'ST': 'STOPPED',
    'OOM': 'OUT_OF_MEMORY',
    // 全名格式（兼容 sacct 返回的完整状态名）
    'RUNNING': 'RUNNING',
    'PENDING': 'PENDING',
    'COMPLETING': 'COMPLETING',
    'COMPLETED': 'COMPLETED',
    'FAILED': 'FAILED',
    'CANCELLED': 'CANCELLED',
    'TIMEOUT': 'TIMEOUT',
    'NODE_FAIL': 'NODE_FAIL',
    'PREEMPTED': 'PREEMPTED',
    'SUSPENDED': 'SUSPENDED',
    'STOPPED': 'STOPPED',
    'OUT_OF_MEMORY': 'OUT_OF_MEMORY',
    // 特殊格式
    'CANCELLED BY 0': 'CANCELLED',
    'CANCELLED+': 'CANCELLED',
    'BOOT_FAIL': 'FAILED',
    'DEADLINE': 'FAILED',
    'NODE_FAILURE': 'NODE_FAIL',
    'REVOKED': 'CANCELLED'
  }
  
  return statusMap[cleanStatus] || cleanStatus
}

// 修复数据库中过期的RUNNING/PENDING作业
async function fixStaleRunningJobs(): Promise<{ fixed: number; checked: number }> {
  try {
    console.log('[FixStale] 检查数据库中过期的RUNNING/PENDING作业...')

    // 1. 查询数据库中所有RUNNING和PENDING的作业
    const { data: dbJobs, error } = await supabase
      .from('jobs')
      .select('job_id, status, submit_time')
      .in('status', ['RUNNING', 'PENDING'])

    if (error || !dbJobs || dbJobs.length === 0) {
      console.log('[FixStale] 没有RUNNING/PENDING作业需要检查')
      return { fixed: 0, checked: 0 }
    }

    console.log(`[FixStale] 找到 ${dbJobs.length} 个RUNNING/PENDING作业`)

    // 2. 批量获取这些作业在SLURM中的实际状态
    const jobIds = dbJobs.map(j => j.job_id)
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)

    let fixedCount = 0
    const jobsToUpdate: any[] = []

    for (const dbJob of dbJobs) {
      try {
        const { stdout } = await execFileAsync('sacct', [
          '-j', dbJob.job_id,
          '--format=JobID,State,Start,End',
          '-P',
          '-n'
        ])

        const lines = stdout.trim().split('\n').filter(line => !line.includes('.batch') && !line.includes('.extern'))
        if (lines.length === 0) {
          // 作业在SLURM中找不到，可能已被清理
          const submitTime = new Date(dbJob.submit_time)
          const daysSinceSubmit = (Date.now() - submitTime.getTime()) / (1000 * 60 * 60 * 24)

          if (daysSinceSubmit > 7) {
            console.log(`[FixStale] 作业 ${dbJob.job_id} 在SLURM中未找到(已${Math.floor(daysSinceSubmit)}天)，标记为CANCELLED`)
            jobsToUpdate.push({
              jobId: dbJob.job_id,
              status: 'CANCELLED',
              endTime: new Date()
            })
            fixedCount++
          }
          continue
        }

        const [jobId, state, startTime, endTime] = lines[0].split('|')
        const normalizedState = normalizeSlurmStatus(state)

        if (normalizedState !== dbJob.status) {
          console.log(`[FixStale] 作业 ${dbJob.job_id} 状态不一致: DB(${dbJob.status}) vs SLURM(${normalizedState})`)

          const updateData: any = {
            jobId: dbJob.job_id,
            status: normalizedState
          }

          if (startTime && startTime !== 'Unknown') {
            updateData.startTime = new Date(startTime)
          }
          if (endTime && endTime !== 'Unknown') {
            updateData.endTime = new Date(endTime)
          }

          jobsToUpdate.push(updateData)
          fixedCount++
        }
      } catch (error) {
        console.error(`[FixStale] 检查作业 ${dbJob.job_id} 失败:`, error)
      }
    }

    // 3. 批量更新不一致的作业
    if (jobsToUpdate.length > 0) {
      for (const job of jobsToUpdate) {
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            status: job.status,
            ...(job.startTime && { start_time: job.startTime }),
            ...(job.endTime && { end_time: job.endTime })
          })
          .eq('job_id', job.jobId)

        if (updateError) {
          console.error(`[FixStale] 更新作业 ${job.jobId} 失败:`, updateError)
        }
      }
    }

    console.log(`[FixStale] 检查完成: 共检查 ${dbJobs.length} 个作业，修复 ${fixedCount} 个`)
    return { fixed: fixedCount, checked: dbJobs.length }
  } catch (error) {
    console.error('[FixStale] 修复过期作业失败:', error)
    return { fixed: 0, checked: 0 }
  }
}

// 状态刷新：比较数据库和Slurm状态，只更新有变化的作业
async function refreshJobStatus(): Promise<{
  updated: number
  newJobs: number
  changedJobs: number
  totalJobs: number
}> {
  const startTime = Date.now()
  let updated = 0
  let newJobs = 0
  let changedJobs = 0
  
  try {
    // 1. 获取Slurm中的所有作业状态
    console.log('获取Slurm作业状态...')
    const slurmJobs = await getAllJobsStatus()
    const totalJobs = slurmJobs.length
    console.log(`Slurm中发现 ${totalJobs} 个作业`)
    
    if (slurmJobs.length === 0) {
      return { updated: 0, newJobs: 0, changedJobs: 0, totalJobs: 0 }
    }
    
    // 2. 获取数据库中这些作业的当前状态
    const jobIds = slurmJobs.map(job => job.jobId)
    const { data: dbJobs, error: dbError } = await supabase
      .from('jobs')
      .select('job_id, job_name, script, status, user_id, submit_time, start_time, end_time, nodes, partition, params, stdout_path, stderr_path')
      .in('job_id', jobIds)
    
    if (dbError) {
      console.error('查询数据库作业失败:', dbError)
      return { updated: 0, newJobs: 0, changedJobs: 0, totalJobs }
    }
    
    const dbJobMap = new Map(dbJobs?.map((job: any) => [job.job_id, job]) || [])
    
    // 3. 比较状态，构建需要更新的作业列表
    const jobsToUpdate: any[] = []
    
    for (const slurmJob of slurmJobs) {
      const { jobId, status, user, partition, nodes, startTime, endTime, jobName, submitTime } = slurmJob
      const dbJob = dbJobMap.get(jobId) as any
      
      // 修复：标准化Slurm状态
      const normalizedStatus = normalizeSlurmStatus(status)
      
      if (!dbJob) {
        // 新作业，需要完整信息
        newJobs++
        console.log(`发现新作业: ${jobId} (${jobName})`)
        
        // 获取完整作业信息
        try {
          const fullJobInfo = await slurmAdapter.getJobStatus(jobId)
          if (fullJobInfo) {
            jobsToUpdate.push(fullJobInfo)
          }
        } catch (error) {
          console.error(`获取新作业 ${jobId} 完整信息失败:`, error)
          // 使用基本信息创建作业
          // 过滤无效的时间值
          const isValidTime = (time: string) => time && time !== 'Unknown' && time !== 'None' && time !== 'N/A' && time !== ''
          
          jobsToUpdate.push({
            jobId,
            jobName,
            user,
            status: normalizedStatus, // 使用标准化状态
            partition,
            submitTime: isValidTime(submitTime) ? new Date(submitTime) : null,
            startTime: isValidTime(startTime) ? new Date(startTime) : null,
            endTime: isValidTime(endTime) ? new Date(endTime) : null,
            nodes: nodes ? nodes.split(',') : [],
            reason: '',
            extra: {}
          })
        }
      } else {
        // 修复：使用标准化状态进行比较
        const statusChanged = normalizedStatus !== dbJob.status
        
        // 修复：标准化时间比较
        const normalizeTimeForComparison = (time: any) => {
          if (!time) return null
          try {
            const date = new Date(time)
            if (isNaN(date.getTime())) return null
            // 转换为ISO字符串进行比较，避免时区问题
            return date.toISOString().slice(0, 19) + 'Z'
          } catch (error) {
            return null
          }
        }
        
        const slurmStartTime = normalizeTimeForComparison(startTime)
        const slurmEndTime = normalizeTimeForComparison(endTime)
        const dbStartTime = normalizeTimeForComparison(dbJob.start_time)
        const dbEndTime = normalizeTimeForComparison(dbJob.end_time)
        
        const timeChanged = (slurmStartTime && slurmStartTime !== dbStartTime) || 
                           (slurmEndTime && slurmEndTime !== dbEndTime)
        
        // 调试日志
        console.log(`作业 ${jobId} 状态比较: Slurm(${normalizedStatus}) vs DB(${dbJob.status}) = ${statusChanged}`)
        console.log(`作业 ${jobId} 时间比较: Start(${slurmStartTime} vs ${dbStartTime}) = ${slurmStartTime !== dbStartTime}`)
        console.log(`作业 ${jobId} 时间比较: End(${slurmEndTime} vs ${dbEndTime}) = ${slurmEndTime !== dbEndTime}`)
        
        if (statusChanged || timeChanged) {
          // 区分真正的状态变化和时间更新
          if (statusChanged) {
            changedJobs++
            console.log(`作业状态变化: ${jobId} ${dbJob.status} -> ${normalizedStatus}`)
          } else if (timeChanged) {
            console.log(`作业时间更新: ${jobId} (状态保持 ${normalizedStatus})`)
          }
          
          // 构建更新数据，保持现有的VNC信息和其他数据
          // 过滤无效的时间值
          const isValidTime = (time: string) => time && time !== 'Unknown' && time !== 'None' && time !== 'N/A' && time !== ''
          
          const updateData: any = {
            jobId,
            jobName: jobName || dbJob.job_name,
            user,
            status: normalizedStatus, // 使用标准化状态
            partition,
            // 修复：使用Slurm的提交时间，而不是数据库中的旧时间
            submitTime: isValidTime(submitTime) ? submitTime : dbJob.submit_time,
            startTime: isValidTime(startTime) ? startTime : dbJob.start_time,
            endTime: isValidTime(endTime) ? endTime : dbJob.end_time,
            nodes: nodes ? nodes.split(',') : (dbJob.nodes ? dbJob.nodes.split(',') : []),
            reason: '',
            extra: {
              ...(dbJob.params || {}),
              scriptPath: dbJob.script,
              stdoutPath: dbJob.stdout_path,
              stderrPath: dbJob.stderr_path
            }
          }
          
          // 保持VNC信息
          if (dbJob.params?.vncDisplay) {
            updateData.vncDisplay = dbJob.params.vncDisplay
          }
          if (dbJob.params?.vncPort) {
            updateData.vncPort = dbJob.params.vncPort
          }
          
          jobsToUpdate.push(updateData)
        } else {
          console.log(`作业 ${jobId} 无需更新: 状态和时间都无变化`)
        }
      }
    }
    
    // 4. 批量更新数据库
    if (jobsToUpdate.length > 0) {
      console.log(`批量更新 ${jobsToUpdate.length} 个作业...`)
      await batchUpsertJobsToDb(jobsToUpdate)
      updated = jobsToUpdate.length
    }
    
    const endTime = Date.now()
    console.log(`状态刷新完成: 更新 ${updated} 个作业 (新作业: ${newJobs}, 真实状态变化: ${changedJobs}), 耗时 ${endTime - startTime}ms`)
    
    return { updated, newJobs, changedJobs, totalJobs }
  } catch (error) {
    console.error('增量同步失败:', error)
    return { updated: 0, newJobs: 0, changedJobs: 0, totalJobs: 0 }
  }
}

// 强制同步：同步指定日期范围的所有作业
async function forceSyncJobs(recentDays: number, syncTodayOnly: boolean = false): Promise<{
  updated: number
  newJobs: number
  changedJobs: number
  totalJobs: number
}> {
  const startTime = Date.now()
  let updated = 0
  let newJobs = 0
  let changedJobs = 0
  
  try {
    let startDate: Date
    let endDate: Date
    
    if (syncTodayOnly) {
      // 只同步当天作业
      const today = new Date()
      startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0)
      endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
      console.log(`强制同步当天作业: ${startDate.toISOString()} 到 ${endDate.toISOString()}`)
    } else {
      // 同步最近N天的作业
      startDate = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000)
      endDate = new Date()
      console.log(`强制同步最近${recentDays}天: ${startDate.toISOString()} 到 ${endDate.toISOString()}`)
    }
    
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)
    
    // 修复：sacct命令只接受简单日期格式，不接受ISO时间
    const formatDateForSlurm = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    const startDateStr = formatDateForSlurm(startDate)
    const endDateStr = formatDateForSlurm(endDate)
    
    console.log(`sacct时间格式: ${startDateStr} 到 ${endDateStr}`)
    
    // 使用sacct获取指定日期范围内的所有作业状态
    const { stdout } = await execFileAsync('sacct', [
      '-o', 'JobID,State,User,Account,Partition,NodeList,Start,End,JobName,Submit',
      '-P',
      '-n',
      '--format=JobID,State,User,Account,Partition,NodeList,Start,End,JobName,Submit',
      '-S', startDateStr,
      '-E', endDateStr
    ])
    
    const lines = stdout.trim().split('\n').filter(Boolean)
    const jobs: any[] = []
    const processedJobs = new Set<string>() // 用于去重
    
    for (const line of lines) {
      const [jobId, status, user, account, partition, nodes, startTime, endTime, jobName, submitTime] = line.split('|')
      
      // 跳过无效的作业ID
      if (!jobId || jobId === 'Unknown' || jobId === '') {
        continue
      }
      
      // 跳过所有带后缀的记录（如 .batch, .extern 等），只保留主作业记录
      if (jobId.includes('.')) {
        continue
      }
      
      // 去重：如果已经处理过这个作业ID，跳过
      if (processedJobs.has(jobId)) {
        continue
      }
      
      processedJobs.add(jobId)
      
      // 标准化状态
      const normalizedStatus = normalizeSlurmStatus(status)
      
      jobs.push({
        jobId,
        status: normalizedStatus,
        user,
        account: account && account !== '(null)' ? account : '',
        partition,
        nodes: nodes || '',
        startTime: startTime || '',
        endTime: endTime || '',
        jobName: jobName || '',
        submitTime: submitTime || ''
      })
    }
    
    const jobIds = jobs.map(job => job.jobId)
    const { data: dbJobs, error: dbError } = await supabase
      .from('jobs')
      .select('job_id, job_name, script, status, user_id, submit_time, start_time, end_time, nodes, partition, params, stdout_path, stderr_path')
      .in('job_id', jobIds)
    
    if (dbError) {
      console.error('查询数据库作业失败:', dbError)
      return { updated: 0, newJobs: 0, changedJobs: 0, totalJobs: jobs.length }
    }
    
    const dbJobMap = new Map(dbJobs?.map((job: any) => [job.job_id, job]) || [])
    
    const jobsToUpdate: any[] = []
    
    for (const slurmJob of jobs) {
      const { jobId, status, user, partition, nodes, startTime, endTime, jobName, submitTime } = slurmJob
      const dbJob = dbJobMap.get(jobId) as any
      
      if (!dbJob) {
        // 新作业，需要完整信息
        newJobs++
        console.log(`发现新作业: ${jobId} (${jobName})`)
        
        // 获取完整作业信息
        try {
          const fullJobInfo = await slurmAdapter.getJobStatus(jobId)
          if (fullJobInfo) {
            jobsToUpdate.push(fullJobInfo)
          }
        } catch (error) {
          console.error(`获取新作业 ${jobId} 完整信息失败:`, error)
          // 使用基本信息创建作业
          jobsToUpdate.push({
            jobId,
            jobName,
            user,
            status,
            partition,
            submitTime: submitTime ? new Date(submitTime) : null,
            startTime: startTime ? new Date(startTime) : null,
            endTime: endTime ? new Date(endTime) : null,
            nodes: nodes ? nodes.split(',') : [],
            reason: '',
            extra: {}
          })
        }
      } else {
        // 检查状态是否有变化
        const statusChanged = status !== dbJob.status
        const timeChanged = (startTime && startTime !== dbJob.start_time) || 
                           (endTime && endTime !== dbJob.end_time)
        
        if (statusChanged || timeChanged) {
          // 区分真正的状态变化和时间更新
          if (statusChanged) {
            changedJobs++
            console.log(`作业状态变化: ${jobId} ${dbJob.status} -> ${status}`)
          } else if (timeChanged) {
            console.log(`作业时间更新: ${jobId} (状态保持 ${status})`)
          }
          
          // 构建更新数据，保持现有的VNC信息和其他数据
          const updateData: any = {
            jobId,
            jobName: jobName || dbJob.job_name,
            user,
            status,
            partition,
            submitTime: dbJob.submit_time,
            startTime: startTime ? new Date(startTime) : dbJob.start_time,
            endTime: endTime ? new Date(endTime) : dbJob.end_time,
            nodes: nodes ? nodes.split(',') : (dbJob.nodes ? dbJob.nodes.split(',') : []),
            reason: '',
            extra: {
              ...(dbJob.params || {}),
              scriptPath: dbJob.script,
              stdoutPath: dbJob.stdout_path,
              stderrPath: dbJob.stderr_path
            }
          }
          
          // 保持VNC信息
          if (dbJob.params?.vncDisplay) {
            updateData.vncDisplay = dbJob.params.vncDisplay
          }
          if (dbJob.params?.vncPort) {
            updateData.vncPort = dbJob.params.vncPort
          }
          
          jobsToUpdate.push(updateData)
        }
      }
    }
    
    if (jobsToUpdate.length > 0) {
      console.log(`批量更新 ${jobsToUpdate.length} 个作业...`)
      await batchUpsertJobsToDb(jobsToUpdate)
      updated = jobsToUpdate.length
    }
    
    const endTime = Date.now()
    console.log(`强制同步完成: 更新 ${updated} 个作业 (新作业: ${newJobs}, 真实状态变化: ${changedJobs}), 耗时 ${endTime - startTime}ms`)
    
    return { updated, newJobs, changedJobs, totalJobs: jobs.length }
  } catch (error) {
    console.error('强制同步失败:', error)
    return { updated: 0, newJobs: 0, changedJobs: 0, totalJobs: 0 }
  }
}

// 同步锁管理
const syncLocks = new Map<string, { locked: boolean; lockTime: number }>()

// 获取同步锁
function acquireSyncLock(key: string, timeout = 600000): boolean {
  const lock = syncLocks.get(key)
  
  // 检查是否已被锁定
  if (lock && lock.locked) {
    // 检查锁是否超时（默认10分钟）
    if (Date.now() - lock.lockTime < timeout) {
      console.log(`[SyncLock] ${key} 同步正在进行中，跳过本次执行`)
      return false
    }
    // 锁已超时，自动释放
    console.log(`[SyncLock] ${key} 同步锁已超时，自动释放`)
  }
  
  // 获取锁
  syncLocks.set(key, { locked: true, lockTime: Date.now() })
  return true
}

// 释放同步锁
function releaseSyncLock(key: string) {
  syncLocks.delete(key)
}

// POST /api/jobs/smart-sync - 执行增量同步
export async function POST(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 解析请求参数
    const body = await req.text()
    const params = new URLSearchParams(body)
    const force = params.get('force') === 'true'
    const fullSync = params.get('fullSync') === 'true'
    const syncToday = params.get('syncToday') === 'true'
    const recentDays = parseInt(params.get('recentDays') || '7')
    
    // 确定同步类型（用于锁管理）
    const syncType = syncToday ? 'daily' : (force || fullSync) ? 'manual' : 'smart'
    
    // 获取同步锁
    if (!acquireSyncLock(syncType)) {
      return NextResponse.json({
        success: false,
        error: '同步任务正在执行中，请稍后再试',
        syncType
      })
    }
    
    try {
      // 1. 检查活跃作业状态
      const { hasActive, activeJobCount } = await checkActiveJobs()
      
      // 更新同步状态
      syncState.hasActiveJobs = hasActive
      syncState.activeJobCount = activeJobCount
      syncState.lastCheck = Date.now()
      
      // 2. 根据模式执行同步
      let result: any
      let staleJobsResult: { fixed: number; checked: number } = { fixed: 0, checked: 0 }

      if (syncToday) {
        // 每日同步模式：只同步当天作业
        console.log('执行每日同步，同步当天作业...')
        result = await forceSyncJobs(0, true)
      } else if (force || fullSync) {
        // 强制同步模式：同步最近N天的所有作业
        console.log(`执行强制同步，同步最近${recentDays}天的所有作业...`)
        result = await forceSyncJobs(recentDays, false)

        // 强制同步时也检查并修复过期的RUNNING/PENDING作业
        console.log('同时检查并修复过期的RUNNING/PENDING作业...')
        staleJobsResult = await fixStaleRunningJobs()
      } else {
        // 智能同步模式：只同步活跃作业
        console.log('执行智能同步，只同步活跃作业...')
        result = await refreshJobStatus()

        // 智能同步时也定期检查过期作业（每隔5分钟检查一次）
        const lastStaleCheck = (global as any).__lastStaleJobCheck || 0
        if (Date.now() - lastStaleCheck > 5 * 60 * 1000) {
          console.log('定期检查并修复过期的RUNNING/PENDING作业...')
          staleJobsResult = await fixStaleRunningJobs();
          (global as any).__lastStaleJobCheck = Date.now()
        }
      }

      // 3. 清除相关缓存
      if (result.updated > 0 || staleJobsResult.fixed > 0) {
        jobCache.clear()
      }

      const totalTime = Date.now() - startTime

      return NextResponse.json({
        success: true,
        message: syncToday ? '每日同步完成' : (force || fullSync ? '强制同步完成' : '智能同步完成'),
        stats: {
          hasActiveJobs: hasActive,
          activeJobCount,
          updated: result.updated,
          newJobs: result.newJobs,
          changedJobs: result.changedJobs,
          totalJobs: result.totalJobs,
          staleJobsFixed: staleJobsResult.fixed,
          staleJobsChecked: staleJobsResult.checked,
          responseTime: totalTime,
          syncMode: syncToday ? 'daily' : (force || fullSync ? 'force' : 'smart')
        }
      })
    } finally {
      // 释放同步锁
      releaseSyncLock(syncType)
    }
    
  } catch (error: any) {
    const totalTime = Date.now() - startTime
    console.error('同步失败:', error)
    return NextResponse.json({
      success: false,
      error: error.message || '同步失败',
      responseTime: totalTime
    })
  }
}

// GET /api/jobs/smart-sync - 获取同步状态
export async function GET(req: NextRequest) {
  try {
    const { hasActive, activeJobCount } = await checkActiveJobs()
    
    return NextResponse.json({
      success: true,
      syncState: {
        hasActiveJobs: hasActive,
        activeJobCount,
        lastCheck: syncState.lastCheck
      },
      lastUpdate: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || '获取同步状态失败'
    })
  }
} 