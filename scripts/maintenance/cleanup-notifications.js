#!/usr/bin/env node

/**
 * 通知清理定时任务脚本
 * 
 * 使用方法:
 * 1. 直接执行: node scripts/cleanup-notifications.js
 * 2. 添加到crontab: 0 2 * * * /path/to/node /path/to/scripts/cleanup-notifications.js
 */

import { notificationCleanupService } from '../lib/notification-cleanup-service.js'
import { logger } from '../lib/logger.js'

async function runCleanup() {
  logger.info('NotificationCleanup-Cron', '开始执行定时清理任务')
  
  try {
    const stats = await notificationCleanupService.performCleanup()
    
    logger.info('NotificationCleanup-Cron', '定时清理任务完成', {
      totalDeleted: stats.totalDeleted,
      expiredNotifications: stats.expiredNotifications,
      oldNotifications: stats.oldNotifications,
      duration: `${stats.duration}ms`
    })
    
    console.log('✅ 通知清理任务完成')
    console.log(`📊 清理统计: 共删除 ${stats.totalDeleted} 条通知`)
    console.log(`⏱️  执行耗时: ${stats.duration}ms`)
    
    process.exit(0)
    
  } catch (error) {
    logger.error('NotificationCleanup-Cron', '定时清理任务失败', error as Error)
    
    console.error('❌ 通知清理任务失败:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

// 处理进程信号
process.on('SIGINT', () => {
  logger.info('NotificationCleanup-Cron', '收到SIGINT信号，退出清理任务')
  process.exit(0)
})

process.on('SIGTERM', () => {
  logger.info('NotificationCleanup-Cron', '收到SIGTERM信号，退出清理任务')
  process.exit(0)
})

// 运行清理任务
runCleanup().catch((error) => {
  logger.error('NotificationCleanup-Cron', '清理任务异常退出', error)
  console.error('❌ 清理任务异常退出:', error)
  process.exit(1)
})