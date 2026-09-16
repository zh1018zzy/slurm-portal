import { NextRequest, NextResponse } from 'next/server'
import { slurmAdapter } from '@/lib/scheduler/slurm-adapter'
import { verifyJwt } from '@/lib/jwt'
import { upsertJobToDb } from '@/lib/job-db'
import { logger } from '@/lib/logger'
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

// GET /api/jobs - 查询作业列表
export async function GET(req: NextRequest) {
  const { searchParams, pathname } = new URL(req.url)
  
  // 测试 Slurm 命令是否可用
  if (searchParams.get('test') === 'slurm') {
    try {
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execFileAsync = promisify(execFile)
      
      const { stdout } = await execFileAsync('sinfo', ['--version'])
      return NextResponse.json({ 
        success: true, 
        message: 'Slurm 命令可用',
        version: stdout.trim()
      })
    } catch (e: any) {
      return NextResponse.json({ 
        success: false, 
        error: `Slurm 命令不可用: ${e.message}` 
      })
    }
  }
  
  // 获取分区详细信息
  if (searchParams.get('partition_info')) {
    try {
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execFileAsync = promisify(execFile)
      
      const partitionName = searchParams.get('partition_info')
      if (!partitionName) {
        return NextResponse.json({ 
          success: false, 
          error: '分区名称不能为空' 
        })
      }
      
      const { stdout } = await execFileAsync('sinfo', [
        '-p', partitionName,
        '-o', '%P|%D|%C|%m|%G|%l',
        '--noheader'
      ])
      
      const lines = stdout.trim().split('\n')
      const partitionInfo = lines.map(line => {
        const [name, nodeCount, cpuInfo, memTotal, gpuInfo, timeLimit] = line.split('|')
        const [allocCPUs, idleCPUs, otherCPUs, totalCPUs] = cpuInfo.split('/')
        
        return {
          name,
          nodeCount: Number(nodeCount),
          cpuTotal: Number(totalCPUs),
          cpuAlloc: Number(allocCPUs),
          cpuIdle: Number(idleCPUs),
          memTotal: memTotal,
          gpuInfo,
          timeLimit
        }
      })
      
      return NextResponse.json({ 
        success: true, 
        partitionInfo 
      })
    } catch (e: any) {
      return NextResponse.json({ 
        success: false, 
        error: `获取分区信息失败: ${e.message}` 
      })
    }
  }
  
  // 分区列表单独路由
  if (pathname.endsWith('/partitions')) {
    const partitions = await slurmAdapter.listPartitions()
    return NextResponse.json({ success: true, partitions })
  }
  
  // 节点列表单独路由
  if (pathname.endsWith('/nodes')) {
    const nodes = await slurmAdapter.listNodes()
    return NextResponse.json({ success: true, nodes })
  }
  
  // 作业趋势统计
  if (searchParams.get('stats') === 'trend') {
    const jobs = await slurmAdapter.listJobs()
    const now = new Date()
    const days = 30
    const trend = Array.from({ length: days }).map((_, i) => {
      const day = new Date(now)
      day.setDate(now.getDate() - (days - 1 - i))
      const dayStr = day.toISOString().slice(0, 10)
      const submitted = jobs.filter(j => (j.submitTime || '').startsWith(dayStr)).length
      const completed = jobs.filter(j => (j.status === 'COMPLETED' && (j.endTime || '').startsWith(dayStr))).length
      const failed = jobs.filter(j => (j.status === 'FAILED' && (j.endTime || '').startsWith(dayStr))).length
      return { date: dayStr, submitted, completed, failed }
    })
    return NextResponse.json({ success: true, trend })
  }
  
  // 失败原因统计
  if (searchParams.get('stats') === 'failures') {
    const jobs = await slurmAdapter.listJobs()
    const failures: Record<string, number> = {}
    jobs.filter(j => j.status === 'FAILED').forEach(j => {
      const reason = j.reason || 'UNKNOWN'
      failures[reason] = (failures[reason] || 0) + 1
    })
    return NextResponse.json({ success: true, failures })
  }
  
  // 实时统计 summary
  if (searchParams.get('stats') === 'summary') {
    const jobs = await slurmAdapter.listJobs()
    const today = new Date().toISOString().slice(0, 10)
    const summary = {
      total: jobs.filter(j => (j.submitTime || '').startsWith(today)).length,
      running: jobs.filter(j => j.status === 'RUNNING' && (j.submitTime || '').startsWith(today)).length,
      pending: jobs.filter(j => j.status === 'PENDING' && (j.submitTime || '').startsWith(today)).length,
      completed: jobs.filter(j => j.status === 'COMPLETED' && (j.endTime || '').startsWith(today)).length,
      failed: jobs.filter(j => j.status === 'FAILED' && (j.endTime || '').startsWith(today)).length,
      cancelled: jobs.filter(j => j.status === 'CANCELLED' && (j.endTime || '').startsWith(today)).length,
    }
    return NextResponse.json({ success: true, summary })
  }
  
  // 查询作业列表
  const userInfo = getCurrentUser(req)
  if (!userInfo?.username) {
    return NextResponse.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
  }

  try {
    // 检查是否为历史作业查询
    const isHistoryQuery = searchParams.get('history') === 'true'
    const dateRange = searchParams.get('dateRange') || (isHistoryQuery ? 'all' : '7days')
    const todayOnly = searchParams.get('today') === 'true'
    
    // 如果是今日作业查询，直接使用 Slurm 命令获取最近作业数据，并在服务端做分页与数量上限
    if (todayOnly) {
      const { slurmAdapter } = await import('@/lib/scheduler/slurm-adapter')

      const page = Number.parseInt(searchParams.get('page') || '1') || 1
      const rawPageSize = Number.parseInt(searchParams.get('pageSize') || '200') || 200
      const MAX_PAGE_SIZE = 500
      const pageSize = Math.min(rawPageSize, MAX_PAGE_SIZE)
      
      // 管理员获取所有用户的作业，普通用户只获取自己的作业
      const targetUser = userInfo.role === 'admin' ? undefined : userInfo.username

      // 仅查询最近 2 天的数据，并给一个总量上限，避免 sacct 返回过多记录
      const MAX_JOBS_FROM_SLURM = pageSize * 50 // 最多支持约 50 页
      const jobs = await slurmAdapter.listJobs(targetUser, {
        days: 2,
        limit: MAX_JOBS_FROM_SLURM,
      })
      
      // 再次按时间过滤，确保只保留最近 2 天（防御性处理）
      const now = new Date()
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)
      
      const recentJobs = jobs.filter(job => {
        if (!job.submitTime) return false
        const submitTime = new Date(job.submitTime)
        return submitTime >= twoDaysAgo
      })
      
      // 按提交时间倒序排列（最新的在前）
      const sortedJobs = recentJobs.sort((a, b) => {
        const aTime = new Date(a.submitTime || 0).getTime()
        const bTime = new Date(b.submitTime || 0).getTime()
        return bTime - aTime
      })

      const total = sortedJobs.length
      const totalPages = Math.max(1, Math.ceil(total / pageSize))
      const safePage = Math.min(Math.max(page, 1), totalPages)
      const startIndex = (safePage - 1) * pageSize
      const endIndex = startIndex + pageSize
      const pagedJobs = sortedJobs.slice(startIndex, endIndex)
      
      // 统计信息基于全部结果（而不是当前页），方便前端展示总数
      const stats = {
        total,
        pending: sortedJobs.filter(job => job.status === 'PENDING').length,
        running: sortedJobs.filter(job => job.status === 'RUNNING').length,
        completed: sortedJobs.filter(job => job.status === 'COMPLETED').length,
        failed: sortedJobs.filter(job => job.status === 'FAILED').length,
        cancelled: sortedJobs.filter(job => job.status === 'CANCELLED').length,
      }
      
      return NextResponse.json({
        success: true,
        jobs: pagedJobs,
        total,
        page: safePage,
        pageSize,
        totalPages,
        stats
      })
    }
    
    // 其他查询继续使用数据库逻辑
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 检查是否需要刷新状态
    const skipRefresh = searchParams.get('skipRefresh') === 'true'
    const autoRefresh = searchParams.get('autoRefresh') === 'true' // 默认禁用自动刷新，提升性能
    
    if (!skipRefresh && autoRefresh) {
      try {
        console.log('执行状态刷新...')
        
        const refreshResponse = await fetch(`${req.nextUrl.origin}/api/jobs/smart-sync`, {
          method: 'POST',
          body: new URLSearchParams()
        })
        
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json()
          console.log('状态刷新完成:', refreshData.stats)
        } else {
          console.warn('状态刷新失败:', refreshResponse.status)
        }
      } catch (error) {
        console.error('状态刷新错误:', error)
      }
    }
    
    // 构建数据库查询（带 count，用于分页）
    // 性能关键：大表上 count: 'exact' 可能非常慢（10s+），这里默认改用 estimated
    // 只选择列表页所需字段，避免 select * 带来不必要的 IO/传输
    // 注意：部分部署里 job_id 可能是文本类型，直接 order(job_id) 会按字典序导致排序异常
    // 这里优先按 submit_time 倒序，其次按 job_id 倒序，保证体验稳定且避免“只看首位数字”的错序
    const selectColumns = [
      'job_id',
      'job_name',
      'user_id',
      'status',
      'partition',
      'nodes',
      'submit_time',
      'start_time',
      'end_time',
      'reason',
      'job_type',
      'cpus_per_task',
      'num_tasks',
      'total_cpus',
      'total_gpus',
      'params',
    ].join(',')

    let dbQuery = supabase
      .from('jobs')
      .select(selectColumns, { count: 'estimated' })
      .order('submit_time', { ascending: false })
      .order('job_id', { ascending: false })
    
    // 获取查询参数
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const statusFilter = searchParams.get('status') || 'all'
    const partitionFilter = searchParams.get('partition') || 'all'
    const dateFilter = searchParams.get('dateFilter') || 'all'
    const searchTerm = searchParams.get('search') || ''
    const jobTypeFilter = searchParams.get('jobType') || 'all'
    const jobIdFilter = searchParams.get('jobId') || ''
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const hasExplicitTimeRange = Boolean(startTime || endTime)
    
    if (isHistoryQuery) {
      // 作业查询：不预过滤状态（允许查询所有状态），由 statusFilter 决定是否筛选
      
      // 添加调试日志
      console.log('历史作业查询条件:', {
        dateRange,
        userFilter: userInfo.role === 'admin' ? 'all' : userInfo.username,
        statusFilter,
        partitionFilter,
        dateFilter,
        searchTerm,
        page,
        pageSize
      })
      
      // 根据时间范围过滤
      if (!hasExplicitTimeRange && dateRange !== 'all') {
        const now = new Date()
        let startDate: Date
        
        switch (dateRange) {
          case '7days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            break
          case '30days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            break
          case '90days':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
            break
          default:
            startDate = new Date(0)
        }
        
        dbQuery = dbQuery.gte('submit_time', startDate.toISOString())
      }
    } else {
      // 当前作业查询：包含所有状态的作业
      // 不添加额外的状态过滤
    }
    
    // 根据用户角色决定查询范围
    if (userInfo.role === 'admin') {
      const requestedUser = searchParams.get('user')
      if (requestedUser && requestedUser.trim() !== '') {
        dbQuery = dbQuery.eq('user_id', requestedUser)
      }
      // 管理员查询所有用户的作业，包括user_id为空的记录
    } else {
      // 普通用户只能查看自己的作业
      dbQuery = dbQuery.eq('user_id', userInfo.username)
    }
    
    // 应用过滤器
    if (statusFilter !== 'all') {
      dbQuery = dbQuery.eq('status', statusFilter)
    }
    if (partitionFilter !== 'all') {
      dbQuery = dbQuery.eq('partition', partitionFilter)
    }
    if (jobTypeFilter !== 'all') {
      dbQuery = dbQuery.eq('job_type', jobTypeFilter)
    }
    if (jobIdFilter.trim() !== '') {
      dbQuery = dbQuery.eq('job_id', jobIdFilter.trim())
    }
    // 只有在非今日查询时才应用dateFilter
    if (!todayOnly && !hasExplicitTimeRange && dateFilter !== 'all') {
      const today = new Date()
      let startDate: Date
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
          break
        case 'week':
          startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0)
      }
      
      dbQuery = dbQuery.gte('submit_time', startDate.toISOString())
    }
    
    // 添加搜索功能
    if (searchTerm.trim() !== '') {
      dbQuery = dbQuery.or(`job_name.ilike.%${searchTerm}%,job_id.ilike.%${searchTerm}%`)
    }

    // 额外：支持显式起止时间（submit_time）过滤，优先级高于 dateRange/dateFilter
    if (startTime) {
      dbQuery = dbQuery.gte('submit_time', startTime)
    }
    if (endTime) {
      dbQuery = dbQuery.lte('submit_time', endTime)
    }

    // 额外：按 params.account 精确匹配（如果写入了该字段）
    const account = searchParams.get('account')
    if (account && account.trim() !== '') {
      // Supabase 支持 json contains 查询：params @> {"account":"xxx"}
      dbQuery = (dbQuery as any).contains('params', { account: account.trim() })
    }
    
    // 根据查询类型决定是否使用分页
    let dbJobs: any[] | null = null
    let dbError: any = null
    let totalCount = 0
    if (todayOnly) {
      // 今日作业查询：保持现有逻辑（该分支目前主要由 /api/jobs/active 替代）
      const result = await dbQuery
      dbJobs = result.data as any[]
      dbError = result.error
      totalCount = (dbJobs || []).length
    } else {
      // 作业查询：永远只取当前页，避免 allHistory 时全量拉取导致 fetch failed
      const rangeFrom = (Math.max(page, 1) - 1) * pageSize
      const rangeTo = rangeFrom + pageSize - 1
      const result = await (dbQuery as any).range(rangeFrom, rangeTo)
      dbJobs = (result.data || []) as any[]
      dbError = result.error
      totalCount = result.count || 0

      if (isHistoryQuery) {
        console.log('历史作业查询结果:', {
          totalCount,
          error: dbError,
          sampleJobs: dbJobs.slice(0, 3).map((job: any) => ({
            job_id: job.job_id,
            job_name: job.job_name,
            status: job.status,
            user_id: job.user_id,
            submit_time: job.submit_time
          }))
        })
      }
    }
    
    if (dbError) {
      console.error('数据库查询失败:', dbError)
      // 如果数据库查询失败，回退到Slurm查询
      const jobs = await slurmAdapter.listJobs(userInfo.username)
      return NextResponse.json({ 
        success: true, 
        jobs,
        total: jobs.length
      })
    }
    
    // 转换数据格式
    const jobs = (dbJobs || []).map((dbJob: any) => {
      return {
        jobId: dbJob.job_id,
        jobName: dbJob.job_name,
        user: dbJob.user_id,
        status: dbJob.status,
        partition: dbJob.partition,
        nodes: dbJob.nodes,
        submitTime: dbJob.submit_time,
        startTime: dbJob.start_time,
        endTime: dbJob.end_time,
        reason: dbJob.reason,
        jobType: dbJob.job_type,
        cpusPerTask: dbJob.cpus_per_task,
        numTasks: dbJob.num_tasks,
        totalCpus: dbJob.total_cpus,
        totalGpus: dbJob.total_gpus,
        vncDisplay: dbJob.params?.vncDisplay,
        vncPort: dbJob.params?.vncPort,
        script: dbJob.script,
        stdoutPath: dbJob.stdout_path,
        stderrPath: dbJob.stderr_path,
        extra: dbJob.extra
      }
    })
    
    // 根据查询类型返回不同的数据结构
    if (todayOnly) {
      // 今日作业查询：不返回分页信息，类似 slurm squeue
      return NextResponse.json({
        success: true,
        jobs,
        total: jobs.length,
        stats: {
          total: jobs.length,
          pending: jobs.filter((job: any) => job.status === 'PENDING').length,
          running: jobs.filter((job: any) => job.status === 'RUNNING').length,
          completed: jobs.filter((job: any) => job.status === 'COMPLETED').length,
          failed: jobs.filter((job: any) => job.status === 'FAILED').length,
          cancelled: jobs.filter((job: any) => job.status === 'CANCELLED').length,
        }
      })
    } else {
      // 历史作业查询：返回完整的分页信息
      return NextResponse.json({
        success: true,
        jobs,
        total: totalCount || 0,
        page,
        pageSize,
        totalPages: Math.ceil((totalCount || 0) / pageSize)
      })
    }
  } catch (error: any) {
    console.error('查询作业失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    })
  }
}

// POST /api/jobs - 提交作业
export async function POST(req: NextRequest) {
  let userInfo: any = null
  let body: any = null
  
  try {
    // 验证用户身份
    userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      logger.warn('Jobs-API', 'POST请求缺少认证信息')
      return NextResponse.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }
    
    logger.debug('Jobs-API', '开始处理作业提交请求', { username: userInfo.username })
    
    // 解析请求体
    body = await req.json()
    
    // 验证必要参数
    if (!body.script) {
      logger.warn('Jobs-API', '作业提交请求缺少脚本内容', { username: userInfo.username })
      return NextResponse.json({ success: false, error: '缺少作业脚本内容' })
    }
    
    // 使用当前登录用户提交作业
    const jobData = {
      ...body,
      user: userInfo.username // 确保使用当前登录用户
    }
    
    logger.info('Jobs-API', '提交作业到Slurm', { 
      username: userInfo.username, 
      jobName: body.jobName,
      partition: body.partition 
    })
    
    // 提交作业
    const jobResult = await slurmAdapter.submitJob(jobData)
    
    logger.info('Jobs-API', 'Slurm作业提交成功，开始同步到数据库', { 
      username: userInfo.username,
      jobId: jobResult,
      jobName: body.jobName 
    })
    
    // 同步到数据库
    try {
      const job = {
        jobId: jobResult.jobId, // 使用正确的字段名
        jobName: body.jobName,
        user: userInfo.username,
        status: 'PENDING',
        partition: body.partition,
        submitTime: new Date().toISOString(),
        script: body.script,
        extra: {
          ...body,
          scriptPath: jobResult.extra?.scriptPath,
          stdoutPath: jobResult.extra?.stdoutPath,
          stderrPath: jobResult.extra?.stderrPath
        }
      }
      await upsertJobToDb(job)
      logger.info('Jobs-API', '数据库同步成功', { 
        username: userInfo.username,
        jobId: jobResult.jobId
      })
    } catch (dbError: any) {
      logger.error('Jobs-API', '数据库同步失败', dbError, { 
        username: userInfo.username,
        jobId: jobResult
      })
      // 数据库同步失败，但Slurm作业已提交成功
      // 这里可以选择是否要取消Slurm作业，或者只记录错误
      throw new Error(`作业提交成功但数据库同步失败: ${dbError.message}`)
    }
    
    logger.info('Jobs-API', '作业提交完成', { 
      username: userInfo.username,
      jobId: jobResult.jobId,
      jobName: body.jobName 
    })
    
    return NextResponse.json({ success: true, job: { jobId: jobResult.jobId, jobName: body.jobName } })
  } catch (e: any) {
    logger.error('Jobs-API', '作业提交失败', e, { 
      username: userInfo?.username,
      jobData: body 
    })
    
    // 提供更详细的错误信息
    let errorMessage = e.message || '未知错误'
    if (e.message.includes('无效的分区名称')) {
      errorMessage = '分区选择错误：请选择有效的分区，不能使用 "*" 或空分区'
    } else if (e.message.includes('sbatch')) {
      errorMessage = `作业提交失败：${e.message}。请检查分区名称和资源参数是否正确。`
    } else if (e.message.includes('作业提交失败')) {
      errorMessage = e.message
    }
    
    return NextResponse.json({ success: false, error: errorMessage })
  }
}