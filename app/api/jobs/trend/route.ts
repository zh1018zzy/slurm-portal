import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { createClient } from '@supabase/supabase-js'
export const dynamic = 'force-dynamic'


const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''

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

// 简单的内存缓存
const trendCache = new Map()
const CACHE_DURATION = 5 * 60 * 1000 // 5分钟缓存

// GET /api/jobs/trend 获取作业趋势数据
export async function GET(req: NextRequest) {
  // 构建时保护 - 返回默认响应
  if (process.env.NODE_ENV === 'production' && !req.headers.get('authorization')) {
    return Response.json({ 
      success: false, 
      error: '构建时无法访问此API',
      trend: [],
      data: {
        dailyData: [],
        weeklyData: [],
        monthlyData: [],
        summary: {
          totalJobs: 0,
          completedJobs: 0,
          failedJobs: 0,
          avgRuntime: 0,
          totalRuntime: 0
        }
      },
      user: '',
      dateRange: 'month'
    })
  }

  try {
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const dateRange = searchParams.get('range') || 'month'
    const requestedUser = searchParams.get('user')
    const daysParam = searchParams.get('days')
    const forceRefresh = searchParams.get('refresh') === 'true'
    
    // 权限检查：只有管理员可以查看其他用户的数据
    const targetUser = userInfo.role === 'admin' && requestedUser ? requestedUser : userInfo.username

    // 根据时间范围确定查询条件
    let startDate: Date
    let actualDays: number
    const now = new Date()
    
    // 如果提供了days参数，优先使用
    if (daysParam) {
      actualDays = parseInt(daysParam)
      startDate = new Date(now.getTime() - actualDays * 24 * 60 * 60 * 1000)
    } else {
      // 否则根据dateRange确定
    switch (dateRange) {
      case 'week':
          actualDays = 7
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
          actualDays = 30
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case 'quarter':
          actualDays = 90
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case 'year':
          actualDays = 365
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      case 'all':
          actualDays = 0  // 0表示查询全部历史数据
        startDate = new Date(0)  // 从1970年开始，实际上就是查询所有数据
        break
      default:
          actualDays = 30
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      }
    }

    // 检查缓存（除非强制刷新）
    const cacheKey = `${targetUser}-${dateRange}-${actualDays}`
    if (!forceRefresh) {
      const cached = trendCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        console.log(`使用缓存数据: ${cacheKey}`)
        return Response.json(cached.data)
      }
    } else {
      console.log(`强制刷新，清除缓存: ${cacheKey}`)
      trendCache.delete(cacheKey)
    }
    
    console.log(`开始重新计算趋势数据: range=${dateRange}, days=${actualDays}, user=${targetUser}`)

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 查询作业数据
    let query = supabase
      .from('jobs')
      .select('*')
      .order('submit_time', { ascending: true })
    
    // 只有当actualDays > 0时才添加时间限制
    if (actualDays > 0) {
      query = query.gte('submit_time', startDate.toISOString())
    }

    // 如果不是管理员或明确指定了用户，则过滤用户数据
    if (userInfo.role !== 'admin' || requestedUser) {
      query = query.eq('user_id', targetUser)
    }

    console.log(`查询条件: 用户角色=${userInfo.role}, 目标用户=${targetUser}, 开始时间=${startDate.toISOString()}`)

    const { data: jobs, error } = await query

    if (error) {
      console.error('查询作业趋势数据失败:', error)
      return Response.json({ success: false, error: '数据库查询失败' })
    }

    // 计算趋势数据
    const trendData = calculateTrendData(jobs || [], dateRange, actualDays)
    
    const response = {
      success: true,
      trend: trendData.dailyData, // 兼容前端期望的格式
      data: trendData,
      user: targetUser,
      dateRange
    }

    // 缓存结果
    trendCache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    })

    return Response.json(response)

  } catch (error: any) {
    console.error('获取作业趋势数据失败:', error)
    return Response.json({ 
      success: false, 
      error: error.message || '服务器内部错误' 
    })
  }
}

// 计算趋势数据
function calculateTrendData(jobs: any[], dateRange: string, actualDays?: number) {
  const now = new Date()
  let days: number
  
  // 如果提供了actualDays参数，优先使用
  if (actualDays !== undefined) {
    days = actualDays
  } else {
    // 否则根据dateRange确定
  switch (dateRange) {
    case 'week':
      days = 7
      break
    case 'month':
      days = 30
      break
    case 'quarter':
      days = 90
      break
    case 'year':
      days = 365
      break
    case 'all':
      days = 3650 // 10年，足够覆盖所有历史数据
      break
    default:
      days = 30
    }
  }

  console.log(`计算趋势数据: 时间范围=${dateRange}, 天数=${days}, 作业总数=${jobs.length}`)

  // 生成日期序列（包含今天）
  const dateSeries = []
  
  if (days === 0) {
    // 如果是0天，生成一个包含今天的序列
    const today = new Date(now)
    const dateStr = today.getFullYear() + '-' + 
      String(today.getMonth() + 1).padStart(2, '0') + '-' + 
      String(today.getDate()).padStart(2, '0')
    dateSeries.push(dateStr)
  } else {
    // 正常生成日期序列
    for (let i = 0; i < days; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - (days - 1 - i))  // 从 days-1 天前开始，到今天结束
      // 使用本地时间的日期字符串
      const dateStr = date.getFullYear() + '-' + 
        String(date.getMonth() + 1).padStart(2, '0') + '-' + 
        String(date.getDate()).padStart(2, '0')
      dateSeries.push(dateStr)
    }
  }

  console.log(`生成日期序列: ${dateSeries.slice(0, 3).join(', ')} ... ${dateSeries.slice(-3).join(', ')}`)
  console.log(`完整日期序列 (${dateSeries.length}天):`, dateSeries)
  console.log(`今天日期: ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`)

  // 按日期分组统计
  const dailyStats: Record<string, {
    submitted: number
    completed: number
    failed: number
    cancelled: number
    running: number
    pending: number
  }> = {}

  // 初始化每日统计
  dateSeries.forEach(date => {
    dailyStats[date] = {
      submitted: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      running: 0,
      pending: 0
    }
  })

  // 统计每日作业状态（使用新的时区转换工具）
  jobs.forEach(job => {
    // 获取提交日期
    let submitDate: string | null = null
    if (job.submit_time) {
      try {
        // 使用新的时区转换工具
        const submitDateTime = new Date(job.submit_time)
        
        // 检查数据库中存储的时间是否已经是CST时间
        // 如果是UTC时间，需要转换为CST
        const now = new Date()
        const timeDiff = Math.abs(submitDateTime.getTime() - now.getTime())
        const hoursDiff = timeDiff / (1000 * 60 * 60)

        if (hoursDiff > 6) {
          // 可能是时区问题，转换为CST时间
          const cstTime = new Date(submitDateTime.getTime() + (8 * 60 * 60 * 1000))
          submitDate = cstTime.getFullYear() + '-' +
            String(cstTime.getMonth() + 1).padStart(2, '0') + '-' +
            String(cstTime.getDate()).padStart(2, '0')
          // console.log(`时区转换 - 作业 ${job.job_id}: ${job.submit_time} -> ${submitDate}`)  // 降低日志级别
        } else {
          // 时间差异正常，直接使用
          submitDate = submitDateTime.getFullYear() + '-' +
            String(submitDateTime.getMonth() + 1).padStart(2, '0') + '-' +
            String(submitDateTime.getDate()).padStart(2, '0')
        }
      } catch (e) {
        console.error('解析提交时间失败:', job.submit_time, e)
        return
      }
    }
    
    // 获取当前状态对应的日期
    let statusDate: string
    if (job.status === 'RUNNING' || job.status === 'PENDING') {
      // 运行中和排队中的作业，使用当前日期
      statusDate = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0')
    } else {
      // 已完成的作业，使用修复后的提交日期
      statusDate = submitDate || ''
    }
    
    // 统计提交的作业（如果日期在范围内）
    if (submitDate) {
      if (dailyStats[submitDate]) {
        dailyStats[submitDate].submitted++
        // console.log(`✅ 统计提交 - 作业 ${job.job_id} -> ${submitDate}`)  // 降低日志级别
      } else {
        // 日期超出范围是正常现象，降低为调试级别
        // console.log(`⚠️  提交日期超出范围 - 作业 ${job.job_id}: ${submitDate} (不在 ${Object.keys(dailyStats).join(', ')})`)
      }
    }
    
    // 统计当前状态的作业（如果日期在范围内）
    if (statusDate) {
      if (dailyStats[statusDate]) {
        switch (job.status) {
          case 'COMPLETED':
            dailyStats[statusDate].completed++
            break
          case 'FAILED':
            dailyStats[statusDate].failed++
            break
          case 'CANCELLED':
            dailyStats[statusDate].cancelled++
            break
          case 'RUNNING':
            dailyStats[statusDate].running++
            break
          case 'PENDING':
            dailyStats[statusDate].pending++
            break
        }
        // console.log(`✅ 统计状态 - 作业 ${job.job_id} (${job.status}) -> ${statusDate}`)  // 降低日志级别
      } else {
        // 状态日期超出范围是正常现象，降低为调试级别
        // console.log(`⚠️  状态日期超出范围 - 作业 ${job.job_id} (${job.status}): ${statusDate} (不在 ${Object.keys(dailyStats).join(', ')})`)
      }
    }
  })

  // 转换为数组格式
  const dailyData = dateSeries.map(date => ({
    date,
    ...dailyStats[date]
  }))

  // 打印一些调试信息
  console.log(`每日统计示例:`, dailyData.slice(0, 3))
  console.log(`完整每日统计:`, dailyData)
  const totalSubmitted = dailyData.reduce((sum, day) => sum + day.submitted, 0)
  console.log(`总提交作业数: ${totalSubmitted}`)
  
  // 检查今天的统计
  const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
  const todayStats = dailyStats[today]
  if (todayStats) {
    console.log(`今天的统计:`, todayStats)
  } else {
    console.log(`警告: 没有找到今天的统计数据`)
  }

  // 计算汇总统计
  const totalJobs = jobs.length
  const completedJobs = jobs.filter(j => j.status === 'COMPLETED')
  const failedJobs = jobs.filter(j => j.status === 'FAILED')
  const cancelledJobs = jobs.filter(j => j.status === 'CANCELLED')
  const runningJobs = jobs.filter(j => j.status === 'RUNNING')
  const pendingJobs = jobs.filter(j => j.status === 'PENDING')

  // 计算运行时间统计
  const runTimes = completedJobs.map(job => {
    if (!job.start_time || !job.end_time) return 0
    const start = new Date(job.start_time)
    const end = new Date(job.end_time)
    return end.getTime() - start.getTime()
  }).filter(time => time > 0)

  const avgRunTime = runTimes.length > 0 ? runTimes.reduce((sum, time) => sum + time, 0) / runTimes.length : 0
  const totalRunTime = runTimes.reduce((sum, time) => sum + time, 0)

  // 计算等待时间统计
  const waitTimes = jobs.map(job => {
    if (!job.submit_time || !job.start_time) return 0
    const submit = new Date(job.submit_time)
    const start = new Date(job.start_time)
    return start.getTime() - submit.getTime()
  }).filter(time => time > 0)

  const avgWaitTime = waitTimes.length > 0 ? waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length : 0

  // 分区使用统计
  const partitionCounts: Record<string, number> = {}
  jobs.forEach(job => {
    if (job.partition) {
      partitionCounts[job.partition] = (partitionCounts[job.partition] || 0) + 1
    }
  })

  const partitionUsage = Object.entries(partitionCounts)
    .map(([partition, count]) => ({
      partition,
      count,
      percentage: Math.round((count / totalJobs) * 100)
    }))
    .sort((a, b) => b.count - a.count)

  // 作业名称统计
  const jobNameCounts: Record<string, number> = {}
  jobs.forEach(job => {
    jobNameCounts[job.job_name] = (jobNameCounts[job.job_name] || 0) + 1
  })

  const jobNameUsage = Object.entries(jobNameCounts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / totalJobs) * 100)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // 只取前10个

  const result = {
    summary: {
      totalJobs,
      completed: completedJobs.length,
      failed: failedJobs.length,
      cancelled: cancelledJobs.length,
      running: runningJobs.length,
      pending: pendingJobs.length,
      successRate: (() => {
        const finishedJobs = completedJobs.length + failedJobs.length + cancelledJobs.length
        return finishedJobs > 0 ? Math.round((completedJobs.length / finishedJobs) * 100) : 0
      })(),
      avgRunTime,
      totalRunTime,
      avgWaitTime
    },
    dailyData,
    partitionUsage,
    jobNameUsage,
    dateRange
  }

  console.log(`趋势数据汇总:`, result.summary)
  return result
} 