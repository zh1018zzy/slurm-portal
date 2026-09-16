import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'

// 验证用户身份函数
function getCurrentUser(req: NextRequest) {
  // 从请求头获取用户信息
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  
  try {
    // 这里应该实现实际的用户验证逻辑
    // 暂时返回模拟用户信息
    return {
      username: 'testuser',
      role: 'user'
    }
  } catch (error) {
    return null
  }
}

// GET /api/jobs/fast - 快速作业查询（禁用自动刷新）
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  // 验证用户身份
  const userInfo = getCurrentUser(req)
  if (!userInfo?.username) {
    return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
  }
  
  const startTime = Date.now()
  
  try {
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // 构建快速查询（禁用自动刷新）
    let dbQuery = supabase.from('jobs').select('job_id,job_name,user_id,status,partition,nodes,submit_time,start_time,end_time').order('job_id', { ascending: false })
    
    // 获取查询参数
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const statusFilter = searchParams.get('status') || 'all'
    const partitionFilter = searchParams.get('partition') || 'all'
    
    // 根据用户角色决定查询范围
    if (userInfo.role === 'admin') {
      const requestedUser = searchParams.get('user')
      if (requestedUser && requestedUser.trim() !== '') {
        dbQuery = dbQuery.eq('user_id', requestedUser)
      }
    } else {
      dbQuery = dbQuery.eq('user_id', userInfo.username)
    }
    
    // 应用过滤器
    if (statusFilter !== 'all') {
      dbQuery = dbQuery.eq('status', statusFilter)
    }
    if (partitionFilter !== 'all') {
      dbQuery = dbQuery.eq('partition', partitionFilter)
    }
    
    // 并行执行查询
    const [countResult, dataResult] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact', head: true }),
      dbQuery.range((page - 1) * pageSize, page * pageSize - 1)
    ])
    
    if (dataResult.error) {
      console.error('快速查询失败:', dataResult.error)
      return NextResponse.json({ 
        success: false, 
        error: '查询失败',
        responseTime: Date.now() - startTime
      })
    }
    
    // 转换数据格式
    const jobs = (dataResult.data || []).map((dbJob: any) => ({
      jobId: dbJob.job_id,
      jobName: dbJob.job_name,
      user: dbJob.user_id,
      status: dbJob.status,
      partition: dbJob.partition,
      nodes: dbJob.nodes,
      submitTime: dbJob.submit_time,
      startTime: dbJob.start_time,
      endTime: dbJob.end_time
    }))
    
    // 计算统计信息
    const stats = {
      total: countResult.count || 0,
      pending: jobs.filter((job: any) => job.status === 'PENDING').length,
      running: jobs.filter((job: any) => job.status === 'RUNNING').length,
      completed: jobs.filter((job: any) => job.status === 'COMPLETED').length,
      failed: jobs.filter((job: any) => job.status === 'FAILED').length,
      cancelled: jobs.filter((job: any) => job.status === 'CANCELLED').length,
    }
    
    return NextResponse.json({
      success: true,
      jobs,
      total: countResult.count || 0,
      page,
      pageSize,
      stats,
      responseTime: Date.now() - startTime,
      optimized: true
    })
    
  } catch (error) {
    console.error('快速查询错误:', error)
    return NextResponse.json({ 
      success: false, 
      error: '查询失败',
      responseTime: Date.now() - startTime
    })
  }
} 