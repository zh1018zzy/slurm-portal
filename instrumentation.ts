/**
 * Next.js 应用初始化钩子
 * 用于在服务器启动时初始化定时任务等
 * 
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // 构建阶段跳过，避免 next build 时连 LDAP / 启动 cron
  if (process.env.NEXT_PHASE === 'phase-production-build') return

  // 只在 Node.js 运行时初始化（服务端）
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] 初始化服务器组件...')
    
    // 启动作业状态同步定时任务
    try {
      const { jobSyncScheduler } = await import('./lib/cron/job-sync-scheduler')
      jobSyncScheduler.start()
      console.log('[Instrumentation] ✅ 作业同步定时任务已启动')
    } catch (error) {
      console.error('[Instrumentation] ❌ 启动定时任务失败:', error)
    }
  }
}
