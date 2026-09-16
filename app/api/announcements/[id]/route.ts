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

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return Response.json({ success: false, error: '无效的公告ID' })
    }

    const body = await req.json()
    const { title, content, type, priority, is_active, is_pinned, start_time, end_time } = body

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

    // 更新公告
    const { data, error } = await supabase
      .from('announcements')
      .update({
        title,
        content,
        type: type || 'info',
        priority: priority || 0,
        is_active: is_active !== undefined ? is_active : true,
        is_pinned: is_pinned || false,
        start_time: start_time || new Date().toISOString(),
        end_time: end_time || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()

    if (error) {
      console.error('更新公告失败:', error)
      return Response.json({ success: false, error: '更新公告失败' })
    }

    if (!data || data.length === 0) {
      return Response.json({ success: false, error: '公告不存在' })
    }

    // 清除缓存
    announcementsCache.data = null
    announcementsCache.timestamp = 0

    return Response.json({ 
      success: true, 
      announcement: data[0]
    })

  } catch (error) {
    console.error('更新公告API错误:', error)
    return Response.json({ 
      success: false, 
      error: '更新公告失败' 
    })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return Response.json({ success: false, error: '无效的公告ID' })
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

    // 删除公告
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('删除公告失败:', error)
      return Response.json({ success: false, error: '删除公告失败' })
    }

    // 清除缓存
    announcementsCache.data = null
    announcementsCache.timestamp = 0

    return Response.json({ 
      success: true, 
      message: '公告删除成功'
    })

  } catch (error) {
    console.error('删除公告API错误:', error)
    return Response.json({ 
      success: false, 
      error: '删除公告失败' 
    })
  }
} 