import { NotificationService } from './notification-service'
import { NotificationType, NotificationPriority } from './notification-types'

// 作业状态变化通知服务
export class JobNotificationService {
  
  /**
   * 作业状态变化通知
   */
  static async notifyJobStatusChange(
    jobId: string,
    jobName: string,
    userId: string,
    oldStatus: string,
    newStatus: string,
    additionalInfo?: {
      partition?: string
      nodes?: string
      reason?: string
      timeLimit?: string
      submitTime?: string
      startTime?: string
      endTime?: string
    }
  ): Promise<boolean> {
    try {
      // 确定通知类型和优先级
      const { type, priority, title, message } = this.getJobStatusNotification(
        oldStatus, 
        newStatus, 
        jobName, 
        jobId,
        additionalInfo
      )

      // 创建通知
      const success = await NotificationService.createNotification(
        type,
        {
          jobId,
          jobName,
          oldStatus,
          newStatus,
          ...additionalInfo
        },
        {
          userId,
          priority,
          customTitle: title,
          customMessage: message
        }
      )

      if (success) {
      } else {
        console.error(`作业状态变化通知创建失败: ${jobId}`)
      }

      return success
    } catch (error) {
      console.error('作业状态变化通知异常:', error)
      return false
    }
  }

  /**
   * 作业执行错误通知
   */
  static async notifyJobError(
    jobId: string,
    jobName: string,
    userId: string,
    errorMessage: string,
    additionalInfo?: {
      partition?: string
      nodes?: string
      submitTime?: string
      startTime?: string
      endTime?: string
    }
  ): Promise<boolean> {
    try {
      const success = await NotificationService.createNotification(
        'job_execution_error',
        {
          jobId,
          jobName,
          errorMessage,
          ...additionalInfo
        },
        {
          userId,
          priority: 'high',
          customTitle: `作业执行错误: ${jobName}`,
          customMessage: `作业 ${jobName} (ID: ${jobId}) 执行失败。错误信息: ${errorMessage}`
        }
      )

      if (success) {
      }

      return success
    } catch (error) {
      console.error('作业错误通知异常:', error)
      return false
    }
  }

  /**
   * 作业时间限制警告通知
   */
  static async notifyJobTimeWarning(
    jobId: string,
    jobName: string,
    userId: string,
    timeLimit: string,
    currentRuntime: string,
    additionalInfo?: {
      partition?: string
      nodes?: string
      submitTime?: string
      startTime?: string
    }
  ): Promise<boolean> {
    try {
      const success = await NotificationService.createNotification(
        'job_time_limit',
        {
          jobId,
          jobName,
          timeLimit,
          currentRuntime,
          ...additionalInfo
        },
        {
          userId,
          priority: 'medium',
          customTitle: `作业时间警告: ${jobName}`,
          customMessage: `作业 ${jobName} (ID: ${jobId}) 已运行 ${currentRuntime}，接近时间限制 ${timeLimit}。请注意作业状态。`
        }
      )

      if (success) {
      }

      return success
    } catch (error) {
      console.error('作业时间警告通知异常:', error)
      return false
    }
  }

  /**
   * 作业资源分配通知
   */
  static async notifyJobResourceAllocated(
    jobId: string,
    jobName: string,
    userId: string,
    partition: string,
    nodes: string,
    cpus: number,
    gpus: number,
    memory: string,
    additionalInfo?: {
      submitTime?: string
      startTime?: string
    }
  ): Promise<boolean> {
    try {
      const success = await NotificationService.createNotification(
        'job_resource_allocated',
        {
          jobId,
          jobName,
          partition,
          nodes,
          cpus,
          gpus,
          memory,
          ...additionalInfo
        },
        {
          userId,
          priority: 'low',
          customTitle: `作业资源已分配: ${jobName}`,
          customMessage: `作业 ${jobName} (ID: ${jobId}) 已获得资源分配。分区: ${partition}，节点: ${nodes}，CPU: ${cpus}核，GPU: ${gpus}卡，内存: ${memory}。`
        }
      )

      if (success) {
      }

      return success
    } catch (error) {
      console.error('作业资源分配通知异常:', error)
      return false
    }
  }

  /**
   * 根据作业状态变化确定通知类型和内容
   */
  private static getJobStatusNotification(
    oldStatus: string,
    newStatus: string,
    jobName: string,
    jobId: string,
    additionalInfo?: any
  ): {
    type: NotificationType
    priority: NotificationPriority
    title: string
    message: string
  } {
    const statusMap: Record<string, { type: NotificationType; priority: NotificationPriority; message: string }> = {
      'PENDING': {
        type: 'job_queue_update',
        priority: 'low',
        message: `作业 ${jobName} (ID: ${jobId}) 已提交并等待资源分配。`
      },
      'RUNNING': {
        type: 'job_status_change',
        priority: 'medium',
        message: `作业 ${jobName} (ID: ${jobId}) 已开始运行。`
      },
      'COMPLETED': {
        type: 'job_status_change',
        priority: 'medium',
        message: `作业 ${jobName} (ID: ${jobId}) 已成功完成。`
      },
      'FAILED': {
        type: 'job_execution_error',
        priority: 'high',
        message: `作业 ${jobName} (ID: ${jobId}) 执行失败。${additionalInfo?.reason ? `原因: ${additionalInfo.reason}` : ''}`
      },
      'CANCELLED': {
        type: 'job_status_change',
        priority: 'medium',
        message: `作业 ${jobName} (ID: ${jobId}) 已被取消。`
      },
      'TIMEOUT': {
        type: 'job_time_limit',
        priority: 'high',
        message: `作业 ${jobName} (ID: ${jobId}) 因超时而被终止。时间限制: ${additionalInfo?.timeLimit || '未知'}`
      },
      'OUT_OF_MEMORY': {
        type: 'job_execution_error',
        priority: 'high',
        message: `作业 ${jobName} (ID: ${jobId}) 因内存不足而失败。`
      },
      'NODE_FAIL': {
        type: 'job_execution_error',
        priority: 'high',
        message: `作业 ${jobName} (ID: ${jobId}) 因节点故障而失败。`
      }
    }

    const config = statusMap[newStatus] || {
      type: 'job_status_change',
      priority: 'medium',
      message: `作业 ${jobName} (ID: ${jobId}) 状态从 ${oldStatus} 变为 ${newStatus}。`
    }

    return {
      type: config.type,
      priority: config.priority,
      title: `作业状态变化: ${jobName}`,
      message: config.message
    }
  }

  /**
   * 批量作业状态变化通知
   */
  static async notifyBatchJobStatusChange(
    jobs: Array<{
      jobId: string
      jobName: string
      userId: string
      oldStatus: string
      newStatus: string
      additionalInfo?: any
    }>
  ): Promise<boolean> {
    try {
      const promises = jobs.map(job => 
        this.notifyJobStatusChange(
          job.jobId,
          job.jobName,
          job.userId,
          job.oldStatus,
          job.newStatus,
          job.additionalInfo
        )
      )

      const results = await Promise.all(promises)
      const successCount = results.filter(Boolean).length


      return successCount === jobs.length
    } catch (error) {
      console.error('批量作业状态通知异常:', error)
      return false
    }
  }
} 