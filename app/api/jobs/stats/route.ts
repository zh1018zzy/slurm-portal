import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { exec } from 'child_process'
import { promisify } from 'util'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const execAsync = promisify(exec)

// 获取当前用户信息
function getCurrentUser(req: NextRequest) {
  try {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
    const payload = verifyJwt(token)
    return payload
  } catch (error) {
    return null
  }
}

// GET /api/jobs/stats 获取作业统计数据
export async function GET(req: NextRequest) {
  try {
  // 验证用户身份
  const userInfo = getCurrentUser(req)
  if (!userInfo?.username) {
    return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
  }
  
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const dateFilter = searchParams.get('dateFilter') || '30days'
    const isReport = searchParams.get('report') === 'true'
    const requestedUser = searchParams.get('user')
    
    // 权限检查：只有管理员可以查看其他用户的数据
    const targetUser = userInfo.role === 'admin' && requestedUser ? requestedUser : userInfo.username
    
    // 根据dateFilter计算实际天数
    let actualDays = days
    if (dateFilter && dateFilter !== '30days') {
      switch (dateFilter) {
        case '7days':
          actualDays = 7
          break
        case '30days':
          actualDays = 30
          break
        case '90days':
          actualDays = 90
          break
        case '180days':
          actualDays = 180
          break
        case '365days':
          actualDays = 365
          break
        default:
          actualDays = 30
      }
    }

    // 获取运行中的作业数
    let runningJobs = 0
    try {
      const { stdout: runningJobsOutput } = await execAsync('squeue -h -t running 2>/dev/null | wc -l')
      runningJobs = parseInt(runningJobsOutput.trim()) || 0
    } catch (error) {
      console.warn('获取运行作业数失败:', error)
    }

    // 获取排队中的作业数
    let queuedJobs = 0
    try {
      const { stdout: queuedJobsOutput } = await execAsync('squeue -h -t pending 2>/dev/null | wc -l')
      queuedJobs = parseInt(queuedJobsOutput.trim()) || 0
    } catch (error) {
      console.warn('获取排队作业数失败:', error)
    }

    let submittedJobs = 0
    let totalCpuHours = 0
    let totalGpuHours = 0
    let avgComputeTime = 0
    let avgQueueTime = 0
    
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        
        // 获取总作业数（应用时间范围限制）
        let countQuery = supabase.from('jobs').select('*', { count: 'exact', head: true })
        
        // 如果指定了天数，则添加时间范围限制
        if (actualDays > 0) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - actualDays);
          countQuery = countQuery.gte('submit_time', startDate.toISOString())
        }
        
        // 如果不是管理员或明确指定了用户，则过滤用户数据
        if (userInfo.role !== 'admin' || requestedUser) {
          countQuery = countQuery.eq('user_id', targetUser)
        }
        
        const { count: totalJobsCount, error: countError } = await countQuery
        
        if (!countError && totalJobsCount !== null) {
          submittedJobs = totalJobsCount
          console.log(`从数据库获取到总作业数: ${totalJobsCount} (用户: ${targetUser}, 时间范围: ${actualDays}天)`)
          
          // 即使获取到了总数，也需要查询详细数据来计算CPU运行时长
          console.log('获取总数成功，但需要查询详细数据计算CPU运行时长')
        }
        
        // 无论第一个分支是否成功，都需要查询详细数据来计算CPU运行时长
        if (true) {
          console.warn('获取总作业数失败，使用时间范围查询作为备选')
          
          // 备选方案：时间范围查询
          let query = supabase.from('jobs').select('status, submit_time, start_time, end_time, cpus_per_task, num_tasks, gpus_per_task')
        
        // 如果指定了天数，则添加时间范围限制
        if (actualDays > 0) {
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - actualDays);
          query = query.gte('submit_time', startDate.toISOString())
        }
        // 如果actualDays <= 0，则查询所有历史数据
        
        // 如果不是管理员或明确指定了用户，则过滤用户数据
        if (userInfo.role !== 'admin' || requestedUser) {
          query = query.eq('user_id', targetUser)
        }
        
        console.log(`查询条件: 用户角色=${userInfo.role}, 目标用户=${targetUser}, 天数=${actualDays}, 开始时间=${actualDays > 0 ? new Date(Date.now() - actualDays * 24 * 60 * 60 * 1000).toISOString() : '全部历史'}`)
        
        const { data: jobsData, error } = await query
        
        if (!error && jobsData) {
          submittedJobs = jobsData.length
            console.log(`从时间范围查询获取到作业数: ${jobsData.length}`)
          
          // 检查有完整时间信息的作业数量
          const jobsWithTimeInfo = jobsData.filter((job: any) => 
            (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') &&
            job.submit_time && job.start_time && job.end_time
          )
          console.log(`有完整时间信息的作业数: ${jobsWithTimeInfo.length}/${jobsData.length}`)
          
          // 处理作业数据用于计算平均时间和状态统计
          const completedJobsData = jobsData.filter((job: any) => job.status === 'COMPLETED')
          const failedJobsData = jobsData.filter((job: any) => job.status === 'FAILED')
          const cancelledJobsData = jobsData.filter((job: any) => job.status === 'CANCELLED')
          
          // 修复：对于days=0（全部历史），优先使用Slurm数据获取累计CPU时长
          let allCompletedJobs = jobsData.filter((job: any) => 
            (job.status === 'COMPLETED' || job.status === 'FAILED' || job.status === 'CANCELLED') &&
            job.submit_time && job.start_time && job.end_time
          )
          
          // 如果是查询全部历史数据且有效作业数较少，尝试从Slurm获取累计数据
          if (actualDays === 0 && allCompletedJobs.length < 10) {
            console.log('检测到查询全部历史但有效作业数较少，尝试从Slurm获取累计数据...')
            try {
              const { exec } = await import('child_process')
              const { promisify } = await import('util')
              const execAsync = promisify(exec)
              
              // 获取所有历史作业统计
              const { stdout: sacctOutput } = await execAsync('sacct -a --starttime=2020-01-01 --format=JobID,State,CPUTime,Elapsed,NCPUS --parsable2 --noheader')
              const lines = sacctOutput.trim().split('\n')
              
              let sacctTotalCpuHours = 0
              let sacctValidJobs = 0
              
              lines.forEach(line => {
                const [jobId, state, cpuTime, elapsed, ncpus] = line.split('|')
                
                // 处理所有状态的作业（完成、取消、失败）
                if (!jobId.includes('.') && (state === 'COMPLETED' || state === 'CANCELLED' || state === 'FAILED')) {
                  // 解析CPU时间 (格式: HH:MM:SS 或 DD-HH:MM:SS)
                  const cpuMatch = cpuTime.match(/(?:(\d+)-)?(\d+):(\d+):(\d+)/)
                  if (cpuMatch) {
                    const days = parseInt(cpuMatch[1]) || 0
                    const hours = parseInt(cpuMatch[2]) || 0
                    const minutes = parseInt(cpuMatch[3]) || 0
                    const seconds = parseInt(cpuMatch[4]) || 0
                    const totalSeconds = days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds
                    const cpuHours = totalSeconds / 3600
                    
                    if (cpuHours > 0) {
                      sacctTotalCpuHours += cpuHours
                      sacctValidJobs++
                    }
                  }
                }
              })
              
              if (sacctTotalCpuHours > 0) {
                totalCpuHours = sacctTotalCpuHours
                console.log(`从Slurm获取到累计CPU运行时长: ${totalCpuHours.toFixed(2)}核时，有效作业数: ${sacctValidJobs}`)
                // 如果从Slurm获取到数据，直接返回，不再处理Supabase数据
                return Response.json({
                  success: true,
                  data: {
                    submittedJobs,
                    runningJobs,
                    queuedJobs,
                    completedJobs: completedJobsData.length,
                    failedJobs: failedJobsData.length,
                    cancelledJobs: cancelledJobsData.length,
                    cpuRunTime: `${totalCpuHours.toFixed(0)}核时`,
                    gpuRunTime: `${totalGpuHours.toFixed(0)}卡时`,
                    avgComputeTime: `${avgComputeTime.toFixed(1)}小时`,
                    avgQueueTime: `${avgQueueTime.toFixed(2)}小时`
                  }
                })
              }
            } catch (slurmError) {
              console.warn('从Slurm获取累计数据失败，继续使用Supabase数据:', slurmError)
            }
          }
          const runningJobsData = jobsData.filter((job: any) => job.status === 'RUNNING')
          let totalComputeTime = 0
          let totalQueueTime = 0
          let validJobs = 0
          
          // 计算所有状态作业的CPU运行时长
          let queueTimeStats = { min: Infinity, max: -Infinity, total: 0, count: 0 }
          
          allCompletedJobs.forEach((job: any) => {
              const submitTime = new Date(job.submit_time).getTime()
              const startTime = new Date(job.start_time).getTime()
              const endTime = new Date(job.end_time).getTime()
              
              const queueTime = (startTime - submitTime) / (1000 * 60 * 60)
              const computeTime = (endTime - startTime) / (1000 * 60 * 60)
              
              // 记录排队时间统计，过滤异常值
              if (queueTime >= 0 && queueTime <= 24) { // 只统计合理的排队时间（0-24小时）
                queueTimeStats.min = Math.min(queueTimeStats.min, queueTime)
                queueTimeStats.max = Math.max(queueTimeStats.max, queueTime)
                queueTimeStats.total += queueTime
                queueTimeStats.count++
                totalQueueTime += queueTime // 只累加合理的排队时间
              } else if (queueTime > 24) {
                console.log(`过滤异常排队时间: ${queueTime.toFixed(2)}h (作业可能有时间数据问题)`)
              }
              totalComputeTime += computeTime
              validJobs++
              
              const cpus = job.cpus_per_task || 1
              const tasks = job.num_tasks || 1
              const gpus = job.gpus_per_task || 0
              
              const totalCpus = cpus * tasks
              totalCpuHours += totalCpus * computeTime
              totalGpuHours += gpus * computeTime
          })
          
          console.log(`CPU运行时长计算完成: ${totalCpuHours.toFixed(2)}核时，基于${allCompletedJobs.length}个有效作业`)
          
          const now = Date.now()
          runningJobsData.forEach((job: any) => {
            if (job.start_time) {
              const startTime = new Date(job.start_time).getTime()
              const runningTime = (now - startTime) / (1000 * 60 * 60)
              
              const cpus = job.cpus_per_task || 1
              const tasks = job.num_tasks || 1
              const gpus = job.gpus_per_task || 0
              
              const totalCpus = cpus * tasks
              totalCpuHours += totalCpus * runningTime
              totalGpuHours += gpus * runningTime
            }
          })
          
          if (validJobs > 0) {
            // 使用有效排队时间计算平均值
            avgQueueTime = queueTimeStats.count > 0 ? 
              Math.round((queueTimeStats.total / queueTimeStats.count) * 100) / 100 : 0
            avgComputeTime = Math.round((totalComputeTime / validJobs) * 100) / 100
            
            // 输出排队时间统计信息
            console.log(`排队时间统计: 总作业=${validJobs}, 有效排队时间=${queueTimeStats.count}`)
            console.log(`排队时间范围: 最小=${queueTimeStats.min.toFixed(2)}h, 最大=${queueTimeStats.max.toFixed(2)}h`)
            console.log(`排队时间计算: 有效总时长=${queueTimeStats.total.toFixed(2)}h, 修正后平均=${avgQueueTime}h`)
            }
          }
        }
      }
    } catch (error) {
      console.error('获取作业统计数据失败:', error)
      submittedJobs = runningJobs + queuedJobs
    }

    // 如果Supabase数据不完整（totalCpuHours为0），尝试从Slurm获取
    if (totalCpuHours === 0) {
      console.log('Supabase数据不完整，尝试从Slurm sacct获取数据')
      try {
        const { exec } = await import('child_process')
        const { promisify } = await import('util')
        const execAsync = promisify(exec)
        
        // 获取所有历史作业统计（大屏需要累计数据）
        // 使用足够早的开始时间来获取所有历史数据
        const { stdout: sacctOutput } = await execAsync('sacct -a --starttime=2020-01-01 --format=JobID,State,CPUTime,Elapsed,NCPUS --parsable2 --noheader')
        const lines = sacctOutput.trim().split('\n')
        
        let sacctTotalCpuHours = 0
        let sacctTotalComputeTime = 0
        let sacctValidJobs = 0
        
        lines.forEach(line => {
          const [jobId, state, cpuTime, elapsed, ncpus] = line.split('|')
          
          // 处理所有状态的作业（完成、取消、失败）
          if (!jobId.includes('.') && (state === 'COMPLETED' || state === 'CANCELLED' || state === 'FAILED')) {
            // 解析CPU时间 (格式: HH:MM:SS 或 DD-HH:MM:SS)
            const cpuMatch = cpuTime.match(/(?:(\d+)-)?(\d+):(\d+):(\d+)/)
            if (cpuMatch) {
              const days = parseInt(cpuMatch[1]) || 0
              const hours = parseInt(cpuMatch[2]) || 0
              const minutes = parseInt(cpuMatch[3]) || 0
              const seconds = parseInt(cpuMatch[4]) || 0
              const totalSeconds = days * 24 * 3600 + hours * 3600 + minutes * 60 + seconds
              const cpuHours = totalSeconds / 3600
              
              // 解析运行时间
              const elapsedMatch = elapsed.match(/(?:(\d+)-)?(\d+):(\d+):(\d+)/)
              if (elapsedMatch) {
                const eDays = parseInt(elapsedMatch[1]) || 0
                const eHours = parseInt(elapsedMatch[2]) || 0
                const eMinutes = parseInt(elapsedMatch[3]) || 0
                const eSeconds = parseInt(elapsedMatch[4]) || 0
                const elapsedSeconds = eDays * 24 * 3600 + eHours * 3600 + eMinutes * 60 + eSeconds
                const elapsedHours = elapsedSeconds / 3600
                
                if (cpuHours > 0 && elapsedHours > 0) {
                  sacctTotalCpuHours += cpuHours
                  sacctTotalComputeTime += elapsedHours
                  sacctValidJobs++
                }
              }
            }
          }
        })
        
        if (sacctTotalCpuHours > 0) {
          totalCpuHours = sacctTotalCpuHours
          if (sacctValidJobs > 0) {
            avgComputeTime = Math.round(sacctTotalComputeTime / sacctValidJobs * 100) / 100
          }
          console.log(`从Slurm获取到CPU运行时长: ${totalCpuHours}小时，有效作业数: ${sacctValidJobs}`)
        }
      } catch (slurmError) {
        console.error('从Slurm获取数据失败:', slurmError)
      }
    }

    const formatRunTime = (hours: number) => {
      if (hours >= 1) {
        return `${Math.round(hours)}核时`
      } else {
        return `${Math.round(hours * 60)}核分钟`
      }
    }

    const formatGpuRunTime = (hours: number) => {
      if (hours >= 1) {
        return `${Math.round(hours)}卡时`
      } else {
        return `${Math.round(hours * 60)}卡分钟`
      }
    }

    // 初始化状态统计变量
    let completedJobsCount = 0
    let failedJobsCount = 0  
    let cancelledJobsCount = 0
    
    // 如果有作业数据，计算状态统计
    try {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        
        // 获取已完成作业数
        let completedQuery = supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'COMPLETED')
        if (userInfo.role !== 'admin' || requestedUser) {
          completedQuery = completedQuery.eq('user_id', targetUser)
        }
        const { count: completedCount } = await completedQuery
        completedJobsCount = completedCount || 0
        
        // 获取失败作业数
        let failedQuery = supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'FAILED')
        if (userInfo.role !== 'admin' || requestedUser) {
          failedQuery = failedQuery.eq('user_id', targetUser)
        }
        const { count: failedCount } = await failedQuery
        failedJobsCount = failedCount || 0
        
        // 获取取消作业数
        let cancelledQuery = supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'CANCELLED')
        if (userInfo.role !== 'admin' || requestedUser) {
          cancelledQuery = cancelledQuery.eq('user_id', targetUser)
        }
        const { count: cancelledCount } = await cancelledQuery
        cancelledJobsCount = cancelledCount || 0
        
        console.log(`作业状态统计 - 已完成: ${completedJobsCount}, 失败: ${failedJobsCount}, 取消: ${cancelledJobsCount}`)
      }
    } catch (error) {
      console.error('获取作业状态统计失败:', error)
    }

    const result = {
      submittedJobs,
      cpuRunTime: formatRunTime(totalCpuHours),
      gpuRunTime: formatGpuRunTime(totalGpuHours),
      avgComputeTime: `${avgComputeTime}小时`,
      avgQueueTime: `${avgQueueTime}小时`,
      runningJobs,
      queuedJobs,
      completedJobs: completedJobsCount,
      failedJobs: failedJobsCount,
      cancelledJobs: cancelledJobsCount
    }
    
    // 如果是报表请求，返回详细的报表数据
    if (isReport) {
      try {
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey)
          
          // 构建报表查询
          let reportQuery = supabase.from('jobs').select('*')
          
          // 如果指定了天数，则添加时间范围限制
          if (actualDays > 0) {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - actualDays);
            reportQuery = reportQuery.gte('submit_time', startDate.toISOString())
          }
          
          // 如果不是管理员或明确指定了用户，则过滤用户数据
          if (userInfo.role !== 'admin' || requestedUser) {
            reportQuery = reportQuery.eq('user_id', targetUser)
          }
          
          const { data: reportJobs, error: reportError } = await reportQuery
          
          if (!reportError && reportJobs) {
            // 计算报表数据
            const completedJobs = reportJobs.filter((job: any) => job.status === 'COMPLETED') || []
            const failedJobs = reportJobs.filter((job: any) => job.status === 'FAILED') || []
            const cancelledJobs = reportJobs.filter((job: any) => job.status === 'CANCELLED') || []
            
            // 计算平均运行时间
            const runTimes = completedJobs
              .map((job: any) => {
                if (job.start_time && job.end_time) {
                  const start = new Date(job.start_time)
                  const end = new Date(job.end_time)
                  return (end.getTime() - start.getTime()) / (1000 * 60) // 转换为分钟
                }
                return 0
              })
              .filter((time: number) => time > 0)
            
            const avgRunTime = runTimes.length > 0 ? runTimes.reduce((a: number, b: number) => a + b, 0) / runTimes.length : 0
            
            // 计算总CPU小时数（简化计算）
            const totalCpuHours = completedJobs.length * avgRunTime / 60 // 转换为小时
            
            // 按分区统计
            const partitionStats = reportJobs.reduce((acc: any, job: any) => {
              const partition = job.partition || 'unknown'
              if (!acc[partition]) {
                acc[partition] = { total: 0, completed: 0, failed: 0, cancelled: 0 }
              }
              acc[partition].total++
              if (job.status === 'COMPLETED') acc[partition].completed++
              if (job.status === 'FAILED') acc[partition].failed++
              if (job.status === 'CANCELLED') acc[partition].cancelled++
              return acc
            }, {})
            
            // 按用户统计（仅管理员可见）
            const userStats = userInfo.role === 'admin' ? 
              reportJobs.reduce((acc: any, job: any) => {
                const user = job.user_id || 'unknown'
                if (!acc[user]) {
                  acc[user] = { 
                    total: 0, 
                    completed: 0, 
                    failed: 0, 
                    cancelled: 0,
                    totalCpuHours: 0,
                    totalRunTime: 0
                  }
                }
                acc[user].total++
                if (job.status === 'COMPLETED') {
                  acc[user].completed++
                }
                if (job.status === 'FAILED') {
                  acc[user].failed++
                }
                if (job.status === 'CANCELLED') {
                  acc[user].cancelled++
                }
                
                // 计算真实CPU小时数（所有有开始和结束时间的作业）
                if (job.start_time && job.end_time) {
                  const start = new Date(job.start_time)
                  const end = new Date(job.end_time)
                  const runTimeHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                  const cpus = job.cpus_per_task || 1
                  const tasks = job.num_tasks || 1
                  const totalCpus = cpus * tasks
                  acc[user].totalCpuHours += totalCpus * runTimeHours
                  acc[user].totalRunTime += runTimeHours
                }
                return acc
              }, {}) : {}
            
            // 趋势数据（根据时间范围动态生成）
            const trends = []
            const now = new Date()
            for (let i = actualDays - 1; i >= 0; i--) {
              const date = new Date(now)
              date.setDate(now.getDate() - i)
              const dateStr = date.toISOString().slice(0, 10)
              
              const dayJobs = reportJobs.filter((job: any) => 
                job.submit_time && job.submit_time.startsWith(dateStr)
              )
              
              trends.push({
                date: dateStr,
                submitted: dayJobs.length,
                completed: dayJobs.filter((job: any) => job.status === 'COMPLETED').length,
                failed: dayJobs.filter((job: any) => job.status === 'FAILED').length
              })
            }
            
            // 重新计算总CPU小时，计算所有完成、取消和失败作业的时间
            const recalculatedTotalCpuHours = reportJobs
              .filter((job: any) => 
                (job.status === 'COMPLETED' || job.status === 'CANCELLED' || job.status === 'FAILED') && 
                job.start_time && job.end_time
              )
              .reduce((total: number, job: any) => {
                const start = new Date(job.start_time)
                const end = new Date(job.end_time)
                const runTimeHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
                const cpus = job.cpus_per_task || 1
                const tasks = job.num_tasks || 1
                const totalCpus = cpus * tasks
                return total + (totalCpus * runTimeHours)
              }, 0)
            
            const reportData = {
              summary: {
                totalJobs: reportJobs.length,
                completedJobs: completedJobs.length,
                failedJobs: failedJobs.length,
                cancelledJobs: cancelledJobs.length,
                avgRunTime: Math.round(avgRunTime),
                totalCpuHours: Math.round(recalculatedTotalCpuHours * 100) / 100
              },
              trends: trends,
              partitionStats: Object.entries(partitionStats).map(([partition, data]: [string, any]) => ({
                partition,
                ...data
              })),
              userStats: Object.entries(userStats)
                .map(([user, data]: [string, any]) => ({
                  user,
                  ...data,
                  // 计算平均运行时间
                  avgRunTime: data.completed > 0 ? Math.round(data.totalRunTime / data.completed * 60) : 0
                }))
                // 按总作业数排序，取TOP 10
                .sort((a: any, b: any) => b.total - a.total)
                .slice(0, 10)
            }
            
            return Response.json({
              success: true,
              reportData,
              data: result
            })
          }
        }
      } catch (reportError) {
        console.error('生成报表数据失败:', reportError)
      }
    }
    
    return Response.json({
      success: true,
      data: result
    })
    
  } catch (error) {
    console.error('获取作业统计失败:', error)
    return Response.json({ 
      success: false, 
      error: '获取作业统计失败' 
    })
  }
} 