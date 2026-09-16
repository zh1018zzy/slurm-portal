import { slurmAdapter } from './scheduler/slurm-adapter'
import { JobInfo } from './scheduler-types'
import { JobNotificationService } from './job-notification-service'
import fs from 'fs/promises'
import path from 'path'

interface JobRecord extends JobInfo {
  lastSync: string
  syncVersion: number
}

interface SyncStats {
  total: number
  new: number
  updated: number
  unchanged: number
  errors: number
}

class JobSyncManager {
  private dbPath: string
  private jobs: Map<string, JobRecord> = new Map()
  private isLoaded = false

  constructor(dbPath: string = './data/jobs.json') {
    this.dbPath = dbPath
  }

  // 加载本地数据库
  async loadDatabase(): Promise<void> {
    try {
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true })
      const data = await fs.readFile(this.dbPath, 'utf-8')
      const records: JobRecord[] = JSON.parse(data)
      
      this.jobs.clear()
      records.forEach(record => {
        this.jobs.set(record.jobId, record)
      })
      
      this.isLoaded = true
    } catch (error) {
      // 如果文件不存在，创建空数据库
      if ((error as any).code === 'ENOENT') {
        await this.saveDatabase()
        this.isLoaded = true
      } else {
        throw error
      }
    }
  }

  // 保存到本地数据库
  async saveDatabase(): Promise<void> {
    const records = Array.from(this.jobs.values())
    await fs.writeFile(this.dbPath, JSON.stringify(records, null, 2))
  }

  // 同步作业数据
  async syncJobs(user?: string): Promise<SyncStats> {
    if (!this.isLoaded) {
      await this.loadDatabase()
    }

    const stats: SyncStats = {
      total: 0,
      new: 0,
      updated: 0,
      unchanged: 0,
      errors: 0
    }

    try {
      // 从 Slurm 获取最新作业数据
      const slurmJobs = await slurmAdapter.listJobs(user)
      stats.total = slurmJobs.length

      const now = new Date().toISOString()
      const syncVersion = Date.now()

      for (const slurmJob of slurmJobs) {
        try {
          // === 新增：补全节点信息 ===
          let nodes: string[] | undefined = undefined
          if (slurmJob.status === 'RUNNING' || slurmJob.status === 'COMPLETED') {
            try {
              const detail = await slurmAdapter.getJobStatus(slurmJob.jobId)
              nodes = detail.nodes
            } catch (e) {
              // 查询失败可忽略
            }
          }
          // === 合并到 slurmJob ===
          const jobWithNodes = { ...slurmJob, nodes }

          const existingJob = this.jobs.get(slurmJob.jobId)
          if (!existingJob) {
            // 新作业
            const newRecord: JobRecord = {
              ...jobWithNodes,
              lastSync: now,
              syncVersion
            }
            this.jobs.set(slurmJob.jobId, newRecord)
            stats.new++
            
            // 发送新作业通知
            await this.sendJobNotification(slurmJob.jobId, 'NEW', slurmJob.status, jobWithNodes)
          } else {
            // 检查是否需要更新
            const needsUpdate = this.hasJobChanged(existingJob, jobWithNodes)
            if (needsUpdate) {
              const updatedRecord: JobRecord = {
                ...jobWithNodes,
                lastSync: now,
                syncVersion
              }
              this.jobs.set(slurmJob.jobId, updatedRecord)
              stats.updated++
              
              // 发送状态变化通知
              await this.sendJobNotification(slurmJob.jobId, existingJob.status, slurmJob.status, jobWithNodes)
            } else {
              stats.unchanged++
            }
          }
        } catch (error) {
          console.error(`处理作业 ${slurmJob.jobId} 时出错:`, error)
          stats.errors++
        }
      }

      // 保存到数据库
      await this.saveDatabase()
      
      
    } catch (error) {
      console.error('同步作业失败:', error)
      throw error
    }

    return stats
  }

  // 检查作业是否有变化
  private hasJobChanged(existing: JobRecord, current: JobInfo): boolean {
    return (
      existing.status !== current.status ||
      existing.jobName !== current.jobName ||
      existing.partition !== current.partition ||
      existing.submitTime !== current.submitTime ||
      existing.startTime !== current.startTime ||
      existing.endTime !== current.endTime
    )
  }

  // 发送作业状态变化通知
  private async sendJobNotification(
    jobId: string,
    oldStatus: string,
    newStatus: string,
    jobInfo: JobInfo
  ): Promise<void> {
    try {
      // 跳过某些状态变化，避免过多通知
      if (oldStatus === 'NEW' && newStatus === 'PENDING') {
        return // 新作业提交时不发送通知
      }

      // 发送状态变化通知
      await JobNotificationService.notifyJobStatusChange(
        jobId,
        jobInfo.jobName,
        jobInfo.user,
        oldStatus,
        newStatus,
        {
          partition: jobInfo.partition,
          nodes: jobInfo.nodes?.join(', '),
          reason: jobInfo.reason,
          timeLimit: jobInfo.timeLimit,
          submitTime: jobInfo.submitTime,
          startTime: jobInfo.startTime,
          endTime: jobInfo.endTime
        }
      )

      // 特殊状态处理
      if (newStatus === 'FAILED' && jobInfo.reason) {
        await JobNotificationService.notifyJobError(
          jobId,
          jobInfo.jobName,
          jobInfo.user,
          jobInfo.reason,
          {
            partition: jobInfo.partition,
            nodes: jobInfo.nodes?.join(', '),
            submitTime: jobInfo.submitTime,
            startTime: jobInfo.startTime,
            endTime: jobInfo.endTime
          }
        )
      }

      // 资源分配通知
      if (newStatus === 'RUNNING' && oldStatus === 'PENDING') {
        await JobNotificationService.notifyJobResourceAllocated(
          jobId,
          jobInfo.jobName,
          jobInfo.user,
          jobInfo.partition || '',
          jobInfo.nodes?.join(', ') || '',
          jobInfo.cpusPerTask || 1,
          jobInfo.gpus || 0,
          jobInfo.memory || '1G',
          {
            submitTime: jobInfo.submitTime,
            startTime: jobInfo.startTime
          }
        )
      }
    } catch (error) {
      console.error(`发送作业通知失败 ${jobId}:`, error)
    }
  }

  // 获取作业列表
  async getJobs(user?: string, options?: {
    status?: string
    limit?: number
    offset?: number
  }): Promise<JobInfo[]> {
    if (!this.isLoaded) {
      await this.loadDatabase()
    }

    let jobs = Array.from(this.jobs.values())

    // 按用户过滤
    if (user) {
      jobs = jobs.filter(job => job.user === user)
    }

    // 按状态过滤
    if (options?.status && options.status !== 'all') {
      jobs = jobs.filter(job => job.status === options.status)
    }

    // 按时间排序（最新的在前面）
    jobs.sort((a, b) => {
      const timeA = a.submitTime ? new Date(a.submitTime).getTime() : 0
      const timeB = b.submitTime ? new Date(b.submitTime).getTime() : 0
      return timeB - timeA
    })

    // 分页
    if (options?.offset) {
      jobs = jobs.slice(options.offset)
    }
    if (options?.limit) {
      jobs = jobs.slice(0, options.limit)
    }

    // 保证每个 job 都有 nodes 字段，且为数组
    return jobs.map(job => {
      const nodesRaw: any = job.nodes
      return {
        ...job,
        nodes: Array.isArray(nodesRaw)
          ? nodesRaw
          : (typeof nodesRaw === 'string' && nodesRaw ? (nodesRaw as string).split(',').map((s: string) => s.trim()).filter(Boolean) : [])
      }
    })
  }

  // 获取作业详情
  async getJob(jobId: string): Promise<JobInfo | null> {
    if (!this.isLoaded) {
      await this.loadDatabase()
    }

    return this.jobs.get(jobId) || null
  }

  // 获取统计信息
  async getStats(user?: string): Promise<{
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    cancelled: number
    unknown: number
  }> {
    if (!this.isLoaded) {
      await this.loadDatabase()
    }

    let jobs = Array.from(this.jobs.values())
    if (user) {
      jobs = jobs.filter(job => job.user === user)
    }

    return {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'PENDING').length,
      running: jobs.filter(j => j.status === 'RUNNING').length,
      completed: jobs.filter(j => j.status === 'COMPLETED').length,
      failed: jobs.filter(j => j.status === 'FAILED').length,
      cancelled: jobs.filter(j => j.status === 'CANCELLED').length,
      unknown: jobs.filter(j => j.status === 'UNKNOWN').length,
    }
  }

  // 清理旧数据
  async cleanupOldJobs(daysToKeep: number = 365): Promise<number> {
    if (!this.isLoaded) {
      await this.loadDatabase()
    }

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const initialCount = this.jobs.size
    const jobsToDelete: string[] = []

    for (const [jobId, job] of Array.from(this.jobs.entries())) {
      if (job.submitTime && new Date(job.submitTime) < cutoffDate) {
        jobsToDelete.push(jobId)
      }
    }

    jobsToDelete.forEach(jobId => this.jobs.delete(jobId))
    
    if (jobsToDelete.length > 0) {
      await this.saveDatabase()
    }

    return jobsToDelete.length
  }
}

// 创建全局实例
export const jobSyncManager = new JobSyncManager() 