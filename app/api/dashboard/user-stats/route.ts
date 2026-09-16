import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
export const dynamic = 'force-dynamic'


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

// GET /api/dashboard/user-stats 获取用户统计和排行
export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    // 初始化Supabase客户端
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ 
        success: false, 
        error: '数据库配置错误' 
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 查询用户作业统计和用户信息
    const [jobsResult, usersResult] = await Promise.all([
      supabase.from('jobs').select('user_id, status, submit_time'),
      supabase.from('users').select('username, real_name, department, is_online')
    ])

    if (jobsResult.error) {
      console.error('查询作业统计失败:', jobsResult.error)
      return Response.json({ success: false, error: '数据库查询失败' })
    }

    if (usersResult.error) {
      console.error('查询用户信息失败:', usersResult.error)
      return Response.json({ success: false, error: '数据库查询失败' })
    }

    const jobs = jobsResult.data || []
    const users = usersResult.data || []

    // 统计用户作业提交情况
    const userJobCounts: Record<string, number> = {}
    const userInfoMap: Record<string, { real_name: string, department: string }> = {}
    
    // 构建用户信息映射
    users.forEach((user: any) => {
      userInfoMap[user.username] = {
        real_name: user.real_name || user.username,
        department: user.department || '未分配'
      }
    })
    
    jobs.forEach((job: any) => {
      const userId = job.user_id
      if (userId) {
        userJobCounts[userId] = (userJobCounts[userId] || 0) + 1
      }
    })

    // 转换为数组并排序
    const userRankings = Object.entries(userJobCounts)
      .map(([userId, count]) => {
        const userInfo = userInfoMap[userId] || { real_name: userId, department: '未知部门' }
        return { 
          name: userInfo.real_name, 
          username: userId,
          count, 
          dept: userInfo.department
        }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // 统计部门分布
    const departmentCounts: Record<string, number> = {}
    users.forEach((user: any) => {
      const dept = user.department || '未分配'
      departmentCounts[dept] = (departmentCounts[dept] || 0) + 1
    })

    const departments = Object.entries(departmentCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // 计算总体统计
    const totalUsers = users.length
    const totalJobs = jobs.length
    const researchTeams = departments.length
    
    // 计算活跃用户数（最近30天有作业提交的用户）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const activeUsers = new Set()
    jobs.forEach((job: any) => {
      if (job.submit_time && new Date(job.submit_time) >= thirtyDaysAgo) {
        activeUsers.add(job.user_id)
      }
    })
    
    const activeUsersCount = activeUsers.size
    
    // 计算在线用户数（is_online = true 的用户）
    const onlineUsers = users.filter((user: any) => user.is_online === true).length

    const result = {
      registeredUsers: totalUsers,
      researchTeams,
      departments,
      userRankings,
      totalJobs,
      activeUsers: activeUsersCount,
      onlineUsers: onlineUsers
    }

    return Response.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('获取用户统计失败:', error)
    return Response.json({ 
      success: false, 
      error: '获取用户统计失败' 
    })
  }
} 