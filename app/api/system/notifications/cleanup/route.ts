import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { logger } from '@/lib/logger'
import { notificationCleanupService } from '@/lib/notification-cleanup-service'
export const dynamic = 'force-dynamic'


// 验证管理员权限
function requireAdmin(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  
  const token = authHeader.substring(7)
  const userInfo = verifyJwt(token)
  
  if (!userInfo?.username || userInfo.role !== 'admin') {
    return null
  }
  
  return userInfo
}

// GET /api/system/notifications/cleanup - 获取清理状态和统计信息
export async function GET(req: NextRequest) {
  try {
    const admin = requireAdmin(req)
    if (!admin) {
      return Response.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get('action')

    if (action === 'statistics') {
      // 获取清理统计信息
      const statistics = await notificationCleanupService.getCleanupStatistics()
      return Response.json({
        success: true,
        statistics
      })
    } else if (action === 'config') {
      // 获取清理配置
      const config = notificationCleanupService.getConfig()
      return Response.json({
        success: true,
        config
      })
    } else {
      // 获取服务状态
      const status = notificationCleanupService.getStatus()
      const config = notificationCleanupService.getConfig()
      const statistics = await notificationCleanupService.getCleanupStatistics()

      return Response.json({
        success: true,
        status,
        config,
        statistics
      })
    }

  } catch (error) {
    logger.error('NotificationCleanup-API', 'GET请求失败', error as Error)
    return Response.json({ error: '获取清理信息失败' }, { status: 500 })
  }
}

// POST /api/system/notifications/cleanup - 执行清理操作或更新配置
export async function POST(req: NextRequest) {
  try {
    const admin = requireAdmin(req)
    if (!admin) {
      return Response.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const body = await req.json()
    const { action, ...params } = body

    if (action === 'cleanup') {
      // 手动执行清理
      logger.info('NotificationCleanup-API', '管理员触发手动清理', { admin: admin.username })
      
      const stats = await notificationCleanupService.performCleanup()
      
      return Response.json({
        success: true,
        message: '通知清理完成',
        stats
      })

    } else if (action === 'cleanup-user') {
      // 清理指定用户的通知
      const { userId, options } = params
      
      if (!userId) {
        return Response.json({ error: '缺少用户ID参数' }, { status: 400 })
      }

      logger.info('NotificationCleanup-API', '管理员清理用户通知', { 
        admin: admin.username, 
        targetUser: userId, 
        options 
      })

      const result = await notificationCleanupService.cleanupUserNotifications(userId, options)
      
      return Response.json({
        success: true,
        message: `已清理用户 ${userId} 的通知`,
        deletedCount: result.deletedCount
      })

    } else if (action === 'update-config') {
      // 更新清理配置
      const { config } = params
      
      if (!config) {
        return Response.json({ error: '缺少配置参数' }, { status: 400 })
      }

      // 验证配置参数
      if (config.cleanupIntervalHours !== undefined && config.cleanupIntervalHours < 1) {
        return Response.json({ error: '清理间隔不能小于1小时' }, { status: 400 })
      }

      if (config.retentionPeriods) {
        const periods = config.retentionPeriods
        for (const [key, value] of Object.entries(periods)) {
          if (typeof value === 'number' && value < 1) {
            return Response.json({ error: `${key}保留天数不能小于1天` }, { status: 400 })
          }
        }
      }

      logger.info('NotificationCleanup-API', '管理员更新清理配置', { 
        admin: admin.username, 
        newConfig: config 
      })

      notificationCleanupService.updateConfig(config)
      
      return Response.json({
        success: true,
        message: '清理配置更新成功',
        config: notificationCleanupService.getConfig()
      })

    } else if (action === 'start-auto-cleanup') {
      // 启动自动清理
      logger.info('NotificationCleanup-API', '管理员启动自动清理', { admin: admin.username })
      
      notificationCleanupService.updateConfig({ autoCleanupEnabled: true })
      
      return Response.json({
        success: true,
        message: '自动清理已启动'
      })

    } else if (action === 'stop-auto-cleanup') {
      // 停止自动清理
      logger.info('NotificationCleanup-API', '管理员停止自动清理', { admin: admin.username })
      
      notificationCleanupService.updateConfig({ autoCleanupEnabled: false })
      
      return Response.json({
        success: true,
        message: '自动清理已停止'
      })

    } else {
      return Response.json({ error: '无效的操作类型' }, { status: 400 })
    }

  } catch (error) {
    logger.error('NotificationCleanup-API', 'POST请求失败', error as Error)
    return Response.json({ 
      error: error instanceof Error ? error.message : '清理操作失败' 
    }, { status: 500 })
  }
}

// PUT /api/system/notifications/cleanup - 批量操作
export async function PUT(req: NextRequest) {
  try {
    const admin = requireAdmin(req)
    if (!admin) {
      return Response.json({ error: '需要管理员权限' }, { status: 403 })
    }

    const body = await req.json()
    const { action, targets } = body

    if (action === 'batch-cleanup-users') {
      // 批量清理多个用户的通知
      if (!targets || !Array.isArray(targets)) {
        return Response.json({ error: '缺少目标用户列表' }, { status: 400 })
      }

      logger.info('NotificationCleanup-API', '管理员批量清理用户通知', { 
        admin: admin.username, 
        userCount: targets.length 
      })

      const results = []
      
      for (const target of targets) {
        try {
          const result = await notificationCleanupService.cleanupUserNotifications(
            target.userId, 
            target.options
          )
          results.push({
            userId: target.userId,
            success: true,
            deletedCount: result.deletedCount
          })
        } catch (error) {
          results.push({
            userId: target.userId,
            success: false,
            error: error instanceof Error ? error.message : '清理失败'
          })
        }
      }

      const totalDeleted = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + (r.deletedCount || 0), 0)

      return Response.json({
        success: true,
        message: `批量清理完成，共清理 ${totalDeleted} 条通知`,
        results
      })

    } else {
      return Response.json({ error: '无效的批量操作类型' }, { status: 400 })
    }

  } catch (error) {
    logger.error('NotificationCleanup-API', 'PUT请求失败', error as Error)
    return Response.json({ error: '批量操作失败' }, { status: 500 })
  }
}