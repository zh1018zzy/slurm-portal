import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { execFile } from 'child_process'
import { promisify } from 'util'
export const dynamic = 'force-dynamic'


const execFileAsync = promisify(execFile)

// 简单的内存缓存，用于减少重复查询
const jobCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_DURATION = 2000 // 2秒缓存，减少到原来的1/5

// 根据作业状态动态调整缓存时间
function getCacheDuration(jobs: any[]): number {
  // 如果有运行中的作业，使用更长的缓存时间
  const hasRunningJobs = jobs.some(job => job.status === 'RUNNING')
  return hasRunningJobs ? 10000 : 2000 // 运行中：10秒，其他：2秒
}

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

// 从脚本内容识别VNC作业 - 优化版本
function isVncJob(scriptContent: string): { isVnc: boolean, display?: number, port?: number } {
  if (!scriptContent) return { isVnc: false }
  
  // 快速检查是否包含VNC相关内容
  if (!scriptContent.includes('vncserver') && !scriptContent.includes('VNC')) {
    return { isVnc: false }
  }
  
  // 提取display和port信息
  const displayMatch = /DISPLAY=:(\d+)/.exec(scriptContent)
  const portMatch = /VNC_PORT=\$\(\(5900 \+ (\d+)\)\)/.exec(scriptContent)
  
  if (displayMatch) {
    const display = parseInt(displayMatch[1])
    const port = 5900 + display
    return { isVnc: true, display, port }
  }
  
  return { isVnc: true }
}

// 批量获取作业信息 - 修复版本
async function getJobsInfo(jobIds: string[]): Promise<Map<string, any>> {
  const jobsInfo = new Map<string, any>()
  
  if (jobIds.length === 0) return jobsInfo
  
  // 逐个查询作业信息，因为scontrol show jobs不支持多个作业ID
  for (const jobId of jobIds) {
    try {
      const { stdout } = await execFileAsync('scontrol', ['show', 'job', jobId])
      const commandMatch = /Command=([^\s]+)/.exec(stdout)
      if (commandMatch) {
        jobsInfo.set(jobId, { scriptPath: commandMatch[1] })
      }
    } catch (error) {
      console.warn(`[VNC实时状态] 获取作业 ${jobId} 信息失败:`, error)
    }
  }
  
  return jobsInfo
}

// GET /api/vnc/jobs/realtime - 实时获取用户的VNC作业状态
export async function GET(req: NextRequest) {
  // 构建时保护 - 返回默认响应
  if (process.env.NODE_ENV === 'production' && !req.headers.get('authorization')) {
    return Response.json({ 
      success: false, 
      error: '构建时无法访问此API',
      jobs: []
    })
  }

  try {
    // 验证用户身份
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }
    
    const username = userInfo.username
    
    // 检查缓存 - 先获取作业状态，再决定是否使用缓存
    const cacheKey = `vnc_jobs_${username}`
    const cached = jobCache.get(cacheKey)
    
    // 如果有缓存，先检查作业状态变化
    if (cached) {
      try {
        // 快速检查Slurm状态变化
        const { stdout } = await execFileAsync('squeue', [
          '-u', username,
          '-o', '%i|%T',
          '-h'
        ])
        
        if (stdout.trim()) {
          const currentJobs = stdout.trim().split('\n').map(line => {
            const [jobId, state] = line.split('|')
            return { jobId, status: state === 'R' ? 'RUNNING' : 
                   state === 'PD' ? 'PENDING' : 
                   state === 'CG' ? 'COMPLETING' : state }
          })
          
          // 检查状态是否有变化
          const cachedJobs = cached.data.jobs || []
          const statusChanged = currentJobs.some(currentJob => {
            const cachedJob = cachedJobs.find((cj: any) => cj.jobId === currentJob.jobId)
            return !cachedJob || cachedJob.status !== currentJob.status
          })
          
          // 如果状态没有变化，根据作业状态决定缓存时间
          if (!statusChanged) {
            const cacheDuration = getCacheDuration(cachedJobs)
            if (Date.now() - cached.timestamp < cacheDuration) {
              return Response.json(cached.data)
            }
          }
        }
      } catch (error) {
        // 如果状态检查失败，使用默认缓存时间
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          return Response.json(cached.data)
        }
      }
    }
    
    
    // 1. 获取用户在Slurm中的所有活跃作业
    let activeJobs: any[] = []
    try {
      const { stdout } = await execFileAsync('squeue', [
        '-u', username,
        '-o', '%i|%j|%T|%P|%V|%S|%e|%N',
        '-h'
      ])
      
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n')
        activeJobs = lines.map(line => {
          const [jobId, jobName, state, partition, submitTime, startTime, endTime, nodes] = line.split('|')
          return {
            jobId,
            jobName,
            status: state === 'R' ? 'RUNNING' : 
                   state === 'PD' ? 'PENDING' : 
                   state === 'CG' ? 'COMPLETING' : state,
            partition,
            submitTime,
            startTime,
            endTime,
            nodes: nodes && nodes !== '(null)' ? nodes.split(',') : []
          }
        })
      }
    } catch (error) {
      console.error('[VNC实时状态] squeue查询失败:', error)
      return Response.json({ 
        success: false, 
        error: 'Slurm查询失败' 
      }, { status: 500 })
    }
    
    
    // 2. 批量获取作业详细信息
    const jobIds = activeJobs.map(job => job.jobId)
    const jobsInfo = await getJobsInfo(jobIds)
    
    // 3. 并行处理VNC作业识别
    const vncJobs: any[] = []
    const fs = await import('fs/promises')
    
    // 并行读取脚本文件
    const scriptReadPromises = activeJobs.map(async (job) => {
      const jobInfo = jobsInfo.get(job.jobId)
      if (!jobInfo?.scriptPath) return null
      
      try {
        const scriptContent = await fs.readFile(jobInfo.scriptPath, 'utf8')
        const vncInfo = isVncJob(scriptContent)
        
        if (vncInfo.isVnc) {
          const vncJob = {
            ...job,
            jobType: 'graphics',
            vncDisplay: vncInfo.display,
            vncPort: vncInfo.port,
            vncUrl: null
          }
          
          // 为运行中的作业生成VNC URL
          if (job.status === 'RUNNING' && vncInfo.port && job.nodes.length > 0) {
            const { generateVncUrl, getVncNodeHost } = await import('@/lib/vnc-manager')
            const vncNodeHostname = await getVncNodeHost()

            try {
              vncJob.vncUrl = await generateVncUrl(vncNodeHostname, vncInfo.port)
            } catch (error) {
              console.warn(`[VNC实时状态] 生成VNC URL失败:`, error)
              vncJob.vncUrl = null
            }
          }
          
          return vncJob
        }
      } catch (fileError) {
        console.warn(`[VNC实时状态] 读取脚本文件失败 ${jobInfo.scriptPath}:`, fileError)
      }
      
      return null
    })
    
    // 等待所有脚本读取完成
    const results = await Promise.all(scriptReadPromises)
    const validVncJobs = results.filter(job => job !== null)
    vncJobs.push(...validVncJobs)
    
    
    const responseData = {
      success: true,
      jobs: vncJobs,
      total: vncJobs.length,
      user: username,
      timestamp: new Date().toISOString()
    }
    
    // 更新缓存
    jobCache.set(cacheKey, { data: responseData, timestamp: Date.now() })
    
    return Response.json(responseData)
    
  } catch (error: any) {
    console.error('[VNC实时状态] 查询失败:', error)
    return Response.json({ 
      success: false, 
      error: error.message || '查询VNC作业状态失败' 
    }, { status: 500 })
  }
}