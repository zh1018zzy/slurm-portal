import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { NotificationPreferences } from '@/lib/notification-types'
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

// GET /api/notifications/preferences - 获取用户通知偏好
export async function GET(req: NextRequest) {
  // 构建时保护 - 返回默认响应
  if (process.env.NODE_ENV === 'production' && !req.headers.get('authorization')) {
    return Response.json({ 
      success: false, 
      error: '构建时无法访问此API',
      preferences: {
        userId: '',
        emailNotifications: true,
        webNotifications: true,
        mobileNotifications: false,
        jobNotifications: {
          statusChanges: true,
          queueUpdates: true,
          errors: true,
          timeWarnings: true
        },
        systemNotifications: {
          resourceAlerts: true,
          maintenance: true,
          outages: true
        },
        securityNotifications: {
          loginAlerts: true,
          policyChanges: true,
          accountWarnings: true
        },
        minimumPriority: 'low',
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'Asia/Shanghai'
        },
        batchNotifications: {
          enabled: false,
          interval: 30,
          maxBatchSize: 10
        }
      }
    })
  }

  try {
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userInfo.username)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('获取通知偏好失败:', error)
      return Response.json({ success: false, error: '获取通知偏好失败' })
    }

    // 如果没有找到偏好设置，返回默认设置
    if (!data) {
      const defaultPreferences: NotificationPreferences = {
        userId: userInfo.username,
        emailNotifications: true,
        webNotifications: true,
        mobileNotifications: false,
        jobNotifications: {
          statusChanges: true,
          queueUpdates: true,
          errors: true,
          timeWarnings: true
        },
        systemNotifications: {
          resourceAlerts: true,
          maintenance: true,
          outages: true
        },
        securityNotifications: {
          loginAlerts: true,
          policyChanges: true,
          accountWarnings: true
        },
        minimumPriority: 'low',
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'Asia/Shanghai'
        },
        batchNotifications: {
          enabled: false,
          interval: 30,
          maxBatchSize: 10
        }
      }

      return Response.json({ success: true, preferences: defaultPreferences })
    }

    // 转换数据格式
    const preferences: NotificationPreferences = {
      userId: data.user_id,
      emailNotifications: data.email_notifications,
      webNotifications: data.web_notifications,
      mobileNotifications: data.mobile_notifications,
      jobNotifications: data.job_notifications,
      systemNotifications: data.system_notifications,
      securityNotifications: data.security_notifications,
      minimumPriority: data.minimum_priority,
      quietHours: data.quiet_hours,
      batchNotifications: data.batch_notifications
    }

    return Response.json({ success: true, preferences })

  } catch (error: any) {
    console.error('获取通知偏好失败:', error)
    return Response.json({ success: false, error: error.message })
  }
}

// PUT /api/notifications/preferences - 更新用户通知偏好
export async function PUT(req: NextRequest) {
  try {
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }

    const preferences: NotificationPreferences = await req.json()

    // 验证用户只能修改自己的偏好
    if (preferences.userId !== userInfo.username) {
      return Response.json({ success: false, error: '权限不足' }, { status: 403 })
    }

    const { createClient } = await import('@supabase/supabase-js')
    const supabaseUrl = process.env.SUPABASE_URL || ''
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data, error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: preferences.userId,
        email_notifications: preferences.emailNotifications,
        web_notifications: preferences.webNotifications,
        mobile_notifications: preferences.mobileNotifications,
        job_notifications: preferences.jobNotifications,
        system_notifications: preferences.systemNotifications,
        security_notifications: preferences.securityNotifications,
        minimum_priority: preferences.minimumPriority,
        quiet_hours: preferences.quietHours,
        batch_notifications: preferences.batchNotifications,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('更新通知偏好失败:', error)
      return Response.json({ success: false, error: '更新通知偏好失败' })
    }

    return Response.json({ success: true, preferences: data, message: '通知偏好已更新' })

  } catch (error: any) {
    console.error('更新通知偏好失败:', error)
    return Response.json({ success: false, error: error.message })
  }
}