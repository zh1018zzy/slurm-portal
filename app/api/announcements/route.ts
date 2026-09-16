import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { createClient } from '@supabase/supabase-js'
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

// 简单的内存缓存
const announcementsCache = {
  data: null as any,
  timestamp: 0,
  ttl: 2 * 60 * 1000 // 2分钟缓存
}

export async function GET(req: NextRequest) {
  try {
    // 验证用户身份
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    // 检查缓存
    const now = Date.now()
    const useCache = req.nextUrl.searchParams.get('cache') === 'true'
    if (useCache && announcementsCache.data && (now - announcementsCache.timestamp) < announcementsCache.ttl) {
      return Response.json({ 
        success: true, 
        announcements: announcementsCache.data,
        fromCache: true 
      })
    }

    // 初始化Supabase客户端
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ 
        success: false, 
        error: '数据库配置错误' 
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 检查是否获取所有公告（管理页面）
    const getAll = req.nextUrl.searchParams.get('all') === 'true'
    
    let query = supabase
      .from('announcements')
      .select('*')
    
    if (!getAll) {
      // 普通用户只看到有效的公告
      query = query
        .eq('is_active', true)
        .or(`end_time.is.null,end_time.gt.${new Date().toISOString()}`)
    }
    
    const { data: announcements, error } = await query
      .order('is_pinned', { ascending: false })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('查询公告失败:', error)
      return Response.json({ success: false, error: '查询公告失败' })
    }

    // 更新缓存
    announcementsCache.data = announcements
    announcementsCache.timestamp = now

    return Response.json({ 
      success: true, 
      announcements: announcements || [],
      fromCache: false
    })

  } catch (error) {
    console.error('公告API错误:', error)
    return Response.json({ 
      success: false, 
      error: '获取公告失败' 
    })
  }
}

export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    // 检查管理员权限
    if (!userInfo.isAdmin) {
      return Response.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    const body = await req.json()
    const { title, content, type, priority, is_pinned, start_time, end_time } = body

    // 验证必填字段
    if (!title || !content) {
      return Response.json({ success: false, error: '标题和内容不能为空' })
    }

    // 初始化Supabase客户端
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      return Response.json({ 
        success: false, 
        error: '数据库配置错误' 
      })
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 插入新公告
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        type: type || 'info',
        priority: priority || 0,
        is_pinned: is_pinned || false,
        start_time: start_time || new Date().toISOString(),
        end_time: end_time || null,
        created_by: userInfo.username
      })
      .select()

    if (error) {
      console.error('创建公告失败:', error)
      return Response.json({ success: false, error: '创建公告失败' })
    }

    // 清除缓存
    announcementsCache.data = null
    announcementsCache.timestamp = 0

    return Response.json({ 
      success: true, 
      announcement: data[0]
    })

  } catch (error) {
    console.error('创建公告API错误:', error)
    return Response.json({ 
      success: false, 
      error: '创建公告失败' 
    })
  }
} 