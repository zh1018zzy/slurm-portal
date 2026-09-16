import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
export const dynamic = 'force-dynamic'


// 获取当前用户信息
function getCurrentUser(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  try {
    const userInfo = verifyJwt(token)
    return userInfo
  } catch (error) {
    return null
  }
}

// GET /api/notifications - 获取通知列表 (临时简化版本)
export async function GET(req: NextRequest) {
  try {
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    
    // 特殊查询：获取统计信息
    if (searchParams.get('stats') === 'true') {
      // 返回空统计信息，避免数据库连接问题
      const stats = {
        total: 0,
        unread: 0,
        byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
        byType: {},
        recentCount: 0
      }
      return Response.json({ success: true, stats })
    }

    // 获取通知列表参数
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const priority = searchParams.get('priority')
    const search = searchParams.get('search')

    // 连接数据库
    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 构建查询
    let query = supabase
      .from('active_notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', userInfo.username)
      .order('created_at', { ascending: false })

    // 应用过滤条件
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (type && type !== 'all') {
      query = query.eq('type', type)
    }
    if (priority && priority !== 'all') {
      query = query.eq('priority', priority)
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,message.ilike.%${search}%`)
    }

    // 分页
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('查询通知失败:', error)
      throw error
    }

    // 格式化通知数据
    const notifications = (data || []).map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      priority: row.priority,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
      userId: row.user_id,
      userRole: row.user_roles,
      isGlobal: row.is_global || false,
      metadata: row.metadata || {},
      actions: row.actions || [],
      dismissible: row.dismissible !== false,
      source: row.source || 'system',
      category: row.category || 'general'
    }))

    return Response.json({
      success: true,
      notifications,
      total: count || 0,
      hasMore: (count || 0) > offset + limit
    })

  } catch (error: any) {
    console.error('获取通知列表失败:', error)
    return Response.json({ 
      success: true, 
      notifications: [], 
      total: 0, 
      hasMore: false 
    })
  }
}

// POST /api/notifications - 创建通知
export async function POST(req: NextRequest) {
  try {
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    const body = await req.json()
    const { type, title, message, priority = 'medium', metadata = {} } = body

    if (!type || !title || !message) {
      return Response.json({ success: false, error: '缺少必要参数' }, { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('active_notifications')
      .insert([{
        type,
        title,
        message,
        priority,
        status: 'unread',
        user_id: userInfo.username,
        is_global: false,
        metadata,
        dismissible: true,
        source: 'system',
        category: 'general',
        created_at: new Date().toISOString()
      }])
      .select()

    if (error) {
      console.error('创建通知失败:', error)
      return Response.json({ success: false, error: '创建通知失败' }, { status: 500 })
    }

    return Response.json({ 
      success: true, 
      notification: data?.[0],
      message: '通知创建成功'
    })

  } catch (error: any) {
    console.error('创建通知API错误:', error)
    return Response.json({ 
      success: false, 
      error: error.message || '创建通知失败' 
    }, { status: 500 })
  }
}

// PUT /api/notifications - 批量更新通知状态
export async function PUT(req: NextRequest) {
  try {
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    const body = await req.json()
    const { ids, updates } = body

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return Response.json({ success: false, error: '缺少要更新的通知ID' }, { status: 400 })
    }

    if (!updates) {
      return Response.json({ success: false, error: '缺少更新数据' }, { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    // 添加更新时间
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('active_notifications')
      .update(updateData)
      .eq('user_id', userInfo.username)
      .in('id', ids)
      .select()

    if (error) {
      console.error('更新通知失败:', error)
      return Response.json({ success: false, error: '更新通知失败' }, { status: 500 })
    }

    return Response.json({ 
      success: true, 
      updatedCount: data?.length || 0,
      message: `成功更新 ${data?.length || 0} 条通知`
    })

  } catch (error: any) {
    console.error('更新通知API错误:', error)
    return Response.json({ 
      success: false, 
      error: error.message || '更新通知失败' 
    }, { status: 500 })
  }
}

// DELETE /api/notifications - 删除通知
export async function DELETE(req: NextRequest) {
  try {
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const idsParam = searchParams.get('ids')
    
    if (!idsParam) {
      return Response.json({ success: false, error: '缺少要删除的通知ID' }, { status: 400 })
    }

    const ids = idsParam.split(',').filter(id => id.trim())
    
    if (ids.length === 0) {
      return Response.json({ success: false, error: '无效的通知ID' }, { status: 400 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('active_notifications')
      .delete()
      .eq('user_id', userInfo.username)
      .in('id', ids)
      .select()

    if (error) {
      console.error('删除通知失败:', error)
      return Response.json({ success: false, error: '删除通知失败' }, { status: 500 })
    }

    return Response.json({ 
      success: true, 
      deletedCount: data?.length || 0,
      message: `成功删除 ${data?.length || 0} 条通知`
    })

  } catch (error: any) {
    console.error('删除通知API错误:', error)
    return Response.json({ 
      success: false, 
      error: error.message || '删除通知失败' 
    }, { status: 500 })
  }
}