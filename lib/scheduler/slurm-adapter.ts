import { SchedulerAdapter, SubmitJobOptions, JobInfo, PartitionInfo, NodeInfo } from '../scheduler-types'
import { execFile, execSync } from 'child_process'
import { promisify } from 'util'
import fsOrig from 'fs'
import path from 'path'
import crypto from 'crypto'
import process from 'process'
import { getNextDisplay, displayToVncPort, generateVncScript, generateVncUrl, cleanupVncSession } from '../vnc-manager'

const execFileAsync = promisify(execFile)
const TMP_DIR = '/tmp/job-scripts'

const slurmStatusMap: Record<string, import('../scheduler-types').JobStatus> = {
  PD: 'PENDING',
  R: 'RUNNING',
  CG: 'COMPLETED',
  CD: 'COMPLETED',
  F: 'FAILED',
  CA: 'CANCELLED',
  // sacct 输出的状态
  PENDING: 'PENDING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
  TIMEOUT: 'FAILED',
  OUT_OF_MEMORY: 'FAILED',
  NODE_FAIL: 'FAILED',
  PREEMPTED: 'CANCELLED',
  SUSPENDED: 'SUSPENDED',
  ST: 'SUSPENDED',  // squeue 暂停状态
  S: 'SUSPENDED',
  // 添加更多可能的取消状态
  CANCELED: 'CANCELLED',
  'CANCELLED+': 'CANCELLED',
  'CANCELED+': 'CANCELLED',
  // 修复TIMEOUT状态映射
  TO: 'FAILED',
}

// 新增：统一处理 SLURM 状态，去除 + 及后缀
function normalizeSlurmState(state: string): string {
  if (!state) return ''
  // 去除状态后缀（如 CANCELLED+, RUNNING+）和空格
  const normalizedState = state.trim().split(/[ +]/)[0].toUpperCase()
  return normalizedState
}

export const slurmAdapter: SchedulerAdapter = {
  async submitJob(options: SubmitJobOptions): Promise<JobInfo> {
    // 验证分区名称
    if (options.partition && (options.partition === '*' || options.partition.trim() === '')) {
      throw new Error('无效的分区名称，请选择有效的分区，不能使用 "*" 或空分区')
    }
    
    const username = options.user
    if (!username) throw new Error('未指定作业提交用户，无法创建作业目录')
    
    // 使用用户主目录管理器获取用户信息和创建作业目录
    const { UserHomeManager } = await import('@/lib/user-home-manager')
    const { jobDir: realJobFolder, myJobsDir, home: userHome, uid, gid } = await UserHomeManager.createJobDirectory(username)
    
    let scriptContent = options.script
    let vncDisplay: number | undefined
    let vncPort: number | undefined
    
    // 处理graphics作业
    if (options.jobType === 'graphics') {
      vncDisplay = options.vncDisplay || await getNextDisplay()
      vncPort = options.vncPort || displayToVncPort(vncDisplay)
      
      // 如果没有提供脚本内容，生成VNC脚本
      if (!scriptContent || scriptContent.trim() === '') {
        scriptContent = generateVncScript({
          display: vncDisplay,
          appCommand: options.appCommand,
          userId: username,
          geometry: options.vncGeometry
        })
      }
    }
    
    const scriptPath = path.join(realJobFolder, 'job.sh')
    await fsOrig.promises.writeFile(scriptPath, scriptContent, { mode: 0o700 })
    await fsOrig.promises.chown(scriptPath, uid, gid)
    
    const stdoutPath = path.join(realJobFolder, 'slurm-%j.out')
    const stderrPath = path.join(realJobFolder, 'slurm-%j.err')
    
    // sbatch 参数
    const args = []
    if (options.partition) {
      const cleanPartition = options.partition.replace(/\*$/, '')
      args.push('-p', cleanPartition)
    }
    if (options.jobName) args.push('-J', options.jobName)
    if (options.nodes) args.push('-N', String(options.nodes))
    if (options.ntasks) args.push('-n', String(options.ntasks))
    if (options.cpusPerTask) args.push('--cpus-per-task', String(options.cpusPerTask))
    if (options.gpus) args.push('--gpus', String(options.gpus))
    if (options.mem && options.mem !== '0' && options.mem !== '0G' && options.mem !== '0M') {
      args.push('--mem', options.mem)
    }
    if (options.time && options.time.trim()) {
      args.push('-t', options.time)
    }
    args.push('-o', stdoutPath)
    args.push('-e', stderrPath)
    args.push(scriptPath)
    
    const sbatchArgs = args.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ')
    const sbatchCmd = `sbatch ${sbatchArgs}`
    const suCmd = `su -l ${username} -c "${sbatchCmd}"`
    
    const { stdout, stderr } = await execFileAsync('sh', ['-c', suCmd])
    const jobIdMatch = /Submitted batch job (\d+)/.exec(stdout)
    if (!jobIdMatch) {
      try { await fsOrig.promises.rm(realJobFolder, { recursive: true, force: true }) } catch {}
      throw new Error(`sbatch 执行失败，无法解析作业ID。输出: ${stdout}`)
    }
    
    const jobId = jobIdMatch[1]
    
    // 创建软链接
    const symlinkPath = path.join(myJobsDir, `job_${jobId}`)
    try {
      await fsOrig.promises.symlink(realJobFolder, symlinkPath)
    } catch (e) {
      // 忽略软链接错误
    }
    
    const jobInfo: JobInfo = {
      jobId,
      jobName: options.jobName || '',
      user: options.user || '',
      status: 'PENDING' as import('../scheduler-types').JobStatus,
      submitTime: new Date().toISOString(),
      partition: options.partition ? options.partition.replace(/\*$/, '') : undefined,
      startTime: undefined,
      endTime: undefined,
      nodes: [],
      jobType: options.jobType || 'compute',
      extra: {
        jobFolder: realJobFolder,
        scriptPath,
        stdoutPath: path.join(realJobFolder, `slurm-${jobId}.out`),
        stderrPath: path.join(realJobFolder, `slurm-${jobId}.err`)
      }
    }
    
    // 添加graphics作业特有字段
    if (options.jobType === 'graphics') {
      jobInfo.vncDisplay = vncDisplay
      jobInfo.vncPort = vncPort
      jobInfo.vncGeometry = options.vncGeometry
      jobInfo.appCommand = options.appCommand
    }
    
    return jobInfo
  },
  async getJobStatus(jobId: string): Promise<JobInfo> {
    // 查询作业状态，优先用 sacct，若无则用 squeue
    try {
      // sacct 查询更详细，部分集群需配置 JobAcctGatherType
      const { stdout } = await execFileAsync('sacct', [
        '-j', jobId,
        '-o', 'JobID,JobName,User,State,Partition,Submit,Start,End,NodeList',
        '-P', // pipe 分隔
        '-n', // 不显示表头
      ])
      const lines = stdout.trim().split('\n')
      // 只取主作业行（jobId完全等于参数，且不含 .batch/.extern）
      const mainLine = lines.find(l => l.startsWith(`${jobId}|`))
      if (!mainLine) throw new Error('Job not found')
      const [id, jobName, user, state, partition, submitTime, startTime, endTime, nodeList] = mainLine.split('|')
      const cleanState = state.trim()
      // 优化：只对活跃作业执行 scontrol show job
      let scontrolRaw = ''
      let scriptPath = '', stdoutPath = '', stderrPath = ''
      
      // 只对 PENDING、RUNNING 或 SUSPENDED 状态的作业执行 scontrol show job
      const isActiveJob = ['PENDING', 'RUNNING', 'SUSPENDED'].includes(normalizeSlurmState(cleanState))
      
      if (isActiveJob) {
        try {
          const { stdout: scontrolOut } = await execFileAsync('scontrol', ['show', 'job', jobId])
          scontrolRaw = scontrolOut.trim()

          // 解析脚本和日志路径
          const userMatch = /UserId=([^\s]+)/.exec(scontrolRaw)
          const username = userMatch ? userMatch[1].split('(')[0] : ''

          // 从 Command 字段解析实际的作业目录
          const commandMatch = /Command=([^\s]+)/.exec(scontrolRaw)
          let jobFolder = ''

          if (commandMatch) {
            const commandPath = commandMatch[1]

            // 检查 Command 路径是否已经是完整的脚本路径
            if (commandPath.endsWith('.sh')) {
              // 如果 Command 已经是脚本文件路径，直接使用
              scriptPath = commandPath
              // 从脚本路径推断作业目录
              jobFolder = commandPath.replace(/\/[^\/]+\.sh$/, '')
            } else {
              // 如果 Command 是目录路径，添加 job.sh
              jobFolder = commandPath
              scriptPath = `${commandPath}/job.sh`
            }
          } else {
            // 回退到默认路径
            jobFolder = username ? `/home/${username}/my-jobs/job_${jobId}` : ''
            scriptPath = jobFolder ? `${jobFolder}/job.sh` : ''
          }

          stdoutPath = jobFolder ? `${jobFolder}/slurm-${jobId}.out` : ''
          stderrPath = jobFolder ? `${jobFolder}/slurm-${jobId}.err` : ''

        } catch (e) {
          console.error('[getJobStatus] scontrol show job error:', e)
        }
      } else {
      }
      // 解析 NodeList 字段
      let nodes: string[] = []
      // sacct NodeList 字段优先
      if (nodeList && nodeList !== '(null)' && nodeList.trim() !== '') {
        nodes = nodeList.split(',').map(s => s.trim()).filter(Boolean)
      } else {
        // fallback: scontrol show job
        const nodeMatch = /NodeList=([^\s]+)/.exec(scontrolRaw)
        if (nodeMatch && nodeMatch[1] && nodeMatch[1] !== '(null)') {
          nodes = nodeMatch[1].split(',').map(s => s.trim()).filter(Boolean)
        }
      }
      // 保证 nodes 字段始终为数组
      if (!Array.isArray(nodes)) nodes = nodes ? [String(nodes)] : []
      const result: JobInfo = {
        jobId: id,
        jobName,
        user,
        status: (slurmStatusMap[normalizeSlurmState(cleanState)] || 'UNKNOWN') as import('../scheduler-types').JobStatus,
        partition,
        submitTime: submitTime && submitTime !== 'Unknown' && submitTime !== '' ? submitTime : undefined,
        startTime: startTime && startTime !== 'Unknown' && startTime !== '' ? startTime : undefined,
        endTime: endTime && endTime !== 'Unknown' && endTime !== '' ? endTime : undefined,
        nodes,
        extra: { scontrol: scontrolRaw, scriptPath, stdoutPath, stderrPath },
      }
      
      // 检查是否为graphics作业并生成VNC URL
      if (scriptPath) {
        try {
          const scriptContent = await fsOrig.promises.readFile(scriptPath, 'utf8')
          
          if (scriptContent.includes('vncserver') || scriptContent.includes('VNC')) {
            // 从脚本内容中提取display和port信息
            const displayMatch = /DISPLAY=:(\d+)/.exec(scriptContent)
            const portMatch = /VNC_PORT=\$\(\(5900 \+ (\d+)\)\)/.exec(scriptContent)
            
            
            if (displayMatch) {
              const display = parseInt(displayMatch[1])
              const port = displayToVncPort(display)
              
              
              result.jobType = 'graphics'
              result.vncDisplay = display
              result.vncPort = port
              
              // 如果作业正在运行且有节点信息，生成VNC URL
              if (result.status === 'RUNNING' && nodes.length > 0) {
                result.vncUrl = await generateVncUrl(nodes[0], port)
              } else {
              }
            } else {
            }
          } else {
          }
        } catch (error) {
          console.error(`[getJobStatus] 作业 ${jobId} 读取脚本失败:`, error)
          console.error(`[getJobStatus] 脚本路径: ${scriptPath}`)
        }
      } else {
      }
      
      return result
    } catch (e) {
      // 回退用 squeue 查询
      const { stdout } = await execFileAsync('squeue', [
        '-j', jobId,
        '-o', '%i|%j|%u|%T|%P|%V|%S|%e|%R',
        '-h',
      ])
      const line = stdout.trim().split('\n')[0]
      if (!line) throw new Error('Job not found')
      const [id, jobName, user, state, partition, submitTime, startTime, endTime, nodeList] = line.split('|')
      let scontrolRaw = ''
      let nodes: string[] = []
      let scriptPath = '', stdoutPath = '', stderrPath = ''
      try {
        const { stdout: scontrolOut } = await execFileAsync('scontrol', ['show', 'job', jobId])
        scontrolRaw = scontrolOut.trim()
        // 日志辅助排查
        // 优先用 squeue 的 %R 字段
        if (nodeList && !/\((Priority|Resources|null)\)/.test(nodeList) && nodeList !== 'None' && nodeList !== '') {
          nodes = nodeList.split(',')
        } else {
          const nodeMatch = /NodeList=([^\s]+)/.exec(scontrolRaw)
          if (nodeMatch && nodeMatch[1] && nodeMatch[1] !== '(null)') {
            nodes = nodeMatch[1].split(',')
          } else {
            nodes = []
          }
        }
        const userMatch = /UserId=([^\s]+)/.exec(scontrolRaw)
        const username = userMatch ? userMatch[1].split('(')[0] : ''

        // 从 Command 字段解析实际的作业目录
        const commandMatch = /Command=([^\s]+)/.exec(scontrolRaw)
        let jobFolder = ''

        if (commandMatch) {
          const commandPath = commandMatch[1]

          // 检查 Command 路径是否已经是完整的脚本路径
          if (commandPath.endsWith('.sh')) {
            // 如果 Command 已经是脚本文件路径，直接使用
            scriptPath = commandPath
            // 从脚本路径推断作业目录
            jobFolder = commandPath.replace(/\/[^\/]+\.sh$/, '')
          } else {
            // 如果 Command 是目录路径，添加 job.sh
            jobFolder = commandPath
            scriptPath = `${commandPath}/job.sh`
          }
        } else {
          // 回退到默认路径
          jobFolder = username ? `/home/${username}/my-jobs/job_${jobId}` : ''
          scriptPath = jobFolder ? `${jobFolder}/job.sh` : ''
        }

        stdoutPath = jobFolder ? `${jobFolder}/slurm-${jobId}.out` : ''
        stderrPath = jobFolder ? `${jobFolder}/slurm-${jobId}.err` : ''

      } catch (e) {
        console.error('[getJobStatus] scontrol show job error:', e)
      }
      const result: JobInfo = {
        jobId: id,
        jobName,
        user,
        status: (slurmStatusMap[normalizeSlurmState(state)] || 'UNKNOWN') as import('../scheduler-types').JobStatus,
        partition,
        submitTime: submitTime && submitTime !== 'Unknown' && submitTime !== '' ? submitTime : undefined,
        startTime: startTime && startTime !== 'Unknown' && startTime !== '' ? startTime : undefined,
        endTime: endTime && endTime !== 'Unknown' && endTime !== '' ? endTime : undefined,
        nodes,
        extra: { scontrol: scontrolRaw, scriptPath, stdoutPath, stderrPath },
      }
      
      // 检查是否为graphics作业并生成VNC URL
      if (scriptPath) {
        try {
          const scriptContent = await fsOrig.promises.readFile(scriptPath, 'utf8')
          
          if (scriptContent.includes('vncserver') || scriptContent.includes('VNC')) {
            // 从脚本内容中提取display和port信息
            const displayMatch = /DISPLAY=:(\d+)/.exec(scriptContent)
            
            
            if (displayMatch) {
              const display = parseInt(displayMatch[1])
              const port = displayToVncPort(display)
              
              
              result.jobType = 'graphics'
              result.vncDisplay = display
              result.vncPort = port
              
              // 如果作业正在运行且有节点信息，生成VNC URL
              if (result.status === 'RUNNING' && nodes.length > 0) {
                result.vncUrl = generateVncUrl(nodes[0], port)
              } else {
              }
            } else {
            }
          } else {
          }
        } catch (error) {
          console.error(`[getJobStatus-squeue] 作业 ${jobId} 读取脚本失败:`, error)
          console.error(`[getJobStatus-squeue] 脚本路径: ${scriptPath}`)
        }
      } else {
      }
      
      return result
    }
  },
  async cancelJob(jobId: string): Promise<boolean> {
    try {
      // 获取作业信息以便清理VNC会话
      const jobInfo = await this.getJobStatus(jobId)

      // 取消作业
      await execFileAsync('scancel', [jobId])

      // 如果是graphics作业，清理VNC会话
      if (jobInfo.jobType === 'graphics' && jobInfo.vncDisplay && jobInfo.nodes && jobInfo.nodes.length > 0) {
        const nodeName = jobInfo.nodes[0] // 使用第一个节点
        await cleanupVncSession(jobInfo.user, jobInfo.vncDisplay, nodeName)
      }

      return true
    } catch (e) {
      console.error('取消作业失败:', e)
      return false
    }
  },

  async suspendJob(jobId: string): Promise<boolean> {
    try {
      await execFileAsync('scontrol', ['suspend', jobId])
      return true
    } catch (e) {
      console.error('暂停作业失败:', e)
      return false
    }
  },

  async resumeJob(jobId: string): Promise<boolean> {
    try {
      await execFileAsync('scontrol', ['resume', jobId])
      return true
    } catch (e) {
      console.error('继续作业失败:', e)
      return false
    }
  },
  async listJobs(
    user?: string,
    options?: {
      days?: number
      limit?: number
    }
  ): Promise<JobInfo[]> {
    // 查询作业列表，包括当前作业和历史作业
    const jobs: JobInfo[] = []
    const days = options?.days && options.days > 0 ? options.days : 30
    const limit = options?.limit && options.limit > 0 ? options.limit : undefined

    try {
      // 1. 查询当前作业（正在运行、等待中的作业）
      // %a: Account（如果集群启用 accounting）
      const currentArgs = ['-o', '%i|%j|%u|%T|%P|%V|%S|%e|%a', '-h']
      // 只有当指定了用户时才添加 -u 参数，否则查询所有用户的作业
      if (user && user.trim()) {
        currentArgs.push('-u', user)
      }
      
      const { stdout: currentStdout } = await execFileAsync('squeue', currentArgs)
      const currentJobs = currentStdout.trim().split('\n').filter(Boolean).map(line => {
        const [jobId, jobName, user, state, partition, submitTime, startTime, endTime, account] = line.split('|')
        const cleanState = state.trim()
        return {
          jobId,
          jobName,
          user,
          status: (slurmStatusMap[normalizeSlurmState(cleanState)] || 'UNKNOWN') as import('../scheduler-types').JobStatus,
          partition,
          submitTime,
          startTime,
          endTime,
          account: account && account !== '(null)' ? account : undefined,
        }
      })
      jobs.push(...currentJobs)
    } catch (e) {
      console.error('查询当前作业失败:', e)
    }
    
    try {
      // 2. 增强历史作业查询 - 查询最近 N 天的数据（默认 30 天，可通过 options.days 调整）
      const now = new Date()
      const startAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      const startDate = startAgo.toISOString().split('T')[0] // 格式: YYYY-MM-DD
      const startTime = startAgo.toTimeString().split(' ')[0] // 格式: HH:MM:SS
      
      const historyArgs = [
        '-o', 'JobID,JobName,User,Account,State,Partition,Submit,Start,End',
        '-P', // pipe 分隔
        '-n', // 不显示表头
        '--starttime', `${startDate}T${startTime}`, // 查询最近30天的数据，显示更多历史作业
        '--format=JobID,JobName,User,Account,State,Partition,Submit,Start,End', // 明确指定格式
      ]
      // 只有当指定了用户时才添加 -u 参数，否则查询所有用户的作业
      if (user && user.trim()) {
        historyArgs.push('-u', user)
      }
      
      const { stdout: historyStdout } = await execFileAsync('sacct', historyArgs)
      const historyJobs = historyStdout.trim().split('\n').filter(Boolean)
        .map(line => {
          const [jobId, jobName, user, account, state, partition, submitTime, startTime, endTime] = line.split('|')
          const cleanState = state.trim()
          return {
            jobId,
            jobName,
            user,
            status: (slurmStatusMap[normalizeSlurmState(cleanState)] || 'UNKNOWN') as import('../scheduler-types').JobStatus,
            partition,
            submitTime,
            startTime,
            endTime,
            account: account && account !== '(null)' ? account : undefined,
          }
        })
        .filter(job => {
          // 过滤掉所有带后缀的记录（如 .batch, .extern 等），只保留主作业记录
          return !job.jobId.includes('.')
        })
      
      // 过滤掉已经在当前作业列表中的作业
      const currentJobIds = new Set(jobs.map(j => j.jobId))
      const uniqueHistoryJobs = historyJobs.filter(job => !currentJobIds.has(job.jobId))
      jobs.push(...uniqueHistoryJobs)
      
    } catch (e) {
      console.error('查询历史作业失败:', e)
      // 如果 sacct 失败，尝试使用 scontrol show job 查询最近的作业
      try {
        const { stdout } = await execFileAsync('scontrol', ['show', 'job', '--oneliner'])
        const jobLines = stdout.trim().split('\n').filter(Boolean)
        
        for (const line of jobLines.slice(-50)) { // 只取最近50个作业
          const jobIdMatch = /JobId=(\d+)/.exec(line)
          if (jobIdMatch) {
            const jobId = jobIdMatch[1]
            const jobNameMatch = /JobName=([^\s]+)/.exec(line)
            const userMatch = /UserId=([^\s]+)/.exec(line)
            const stateMatch = /JobState=([^\s]+)/.exec(line)
            const partitionMatch = /Partition=([^\s]+)/.exec(line)
            
            if (jobNameMatch && userMatch && stateMatch) {
              const jobName = jobNameMatch[1]
              const user = userMatch[1].split('(')[0] // 去掉括号部分
              const state = stateMatch[1]
              const cleanState = state.trim()
              const partition = partitionMatch ? partitionMatch[1] : undefined
              
              // 如果指定了用户，只添加该用户的作业；否则添加所有作业
              if (!user || !user.trim() || user === user) {
                jobs.push({
                  jobId,
                  jobName,
                  user,
                  status: (slurmStatusMap[normalizeSlurmState(cleanState)] || 'UNKNOWN') as import('../scheduler-types').JobStatus,
                  partition,
                  submitTime: undefined,
                  startTime: undefined,
                  endTime: undefined,
                })
              }
            }
          }
        }
      } catch (scontrolError) {
        console.error('scontrol 查询也失败:', scontrolError)
      }
    }
    
    // 按jobId倒序排列
    jobs.sort((a, b) => {
      const aId = parseInt(a.jobId) || 0
      const bId = parseInt(b.jobId) || 0
      return bId - aId // 倒序排列
    })

    // 如果设置了 limit，则只返回最新的部分记录
    if (limit && jobs.length > limit) {
      return jobs.slice(0, limit)
    }
    
    return jobs
  },
  
  // 新增：高效批量查询活跃作业状态
  async listActiveJobs(user?: string): Promise<JobInfo[]> {
    const jobs: JobInfo[] = []
    
    try {
      // 只查询活跃作业（PENDING 和 RUNNING）
      // %a: Account（如果集群启用 accounting）
      const args = ['-o', '%i|%j|%u|%T|%P|%V|%S|%e|%a', '-h']
      if (user && user.trim()) {
        args.push('-u', user)
      }
      
      const { stdout } = await execFileAsync('squeue', args)
      const activeJobs = stdout.trim().split('\n').filter(Boolean).map(line => {
        const [jobId, jobName, user, state, partition, submitTime, startTime, endTime, account] = line.split('|')
        const cleanState = state.trim()
        return {
          jobId,
          jobName,
          user,
          status: (slurmStatusMap[normalizeSlurmState(cleanState)] || 'UNKNOWN') as import('../scheduler-types').JobStatus,
          partition,
          submitTime,
          startTime,
          endTime,
          nodes: [], // 活跃作业的节点信息
          account: account && account !== '(null)' ? account : undefined,
        }
      })
      
      jobs.push(...activeJobs)
    } catch (e) {
      console.error('查询活跃作业失败:', e)
    }
    
    return jobs
  },
  
  async listPartitions(): Promise<PartitionInfo[]> {
    // 获取分区健康、负载、GPU等信息
    // %P:分区名 %D:节点数 %C:CPU分配 %G:GPU %t:节点状态
    const { stdout } = await execFileAsync('sinfo', ['-h', '-o', '%P|%D|%C|%G|%t'])
    
    // 基于Slurm作业分配计算资源使用率
    let systemCpuUsage = 0
    let systemMemoryUsage = 0
    let systemGpuUsage = 0
    let systemStorageUsage = 0
    
    try {
      // 获取所有节点的详细资源信息
      const { stdout: nodeStdout } = await execFileAsync('sinfo', ['-N', '-o', '%N %m %C %G %t'])
      const nodeLines = nodeStdout.trim().split('\n').filter(line => !line.includes('NODELIST'))
      
      let totalMemory = 0
      let usedMemory = 0
      let totalGpus = 0
      let usedGpus = 0
      let totalCpuCores = 0
      let usedCpuCores = 0
      
      // 解析节点资源信息
      nodeLines.forEach(line => {
        const [name, memory, cpuInfo, gres, state] = line.split(/\s+/)
        const [cpuAlloc, cpuIdle, cpuOther, cpuTotal] = cpuInfo.split('/').map(Number)
        
        const nodeMemory = parseInt(memory) || 0
        totalMemory += nodeMemory
        
        // 判断节点是否有作业运行
        const hasJobs = cpuAlloc > 0 || state !== 'idle'
        if (hasJobs) {
          usedMemory += nodeMemory
          usedCpuCores += cpuAlloc
        }
        
        totalCpuCores += cpuTotal
        
        // 解析GPU资源 (GRES格式: gpu:type:count 或 (null))
        if (gres && gres !== '(null)') {
          const gpuMatch = gres.match(/gpu:[^:]*:(\d+)/)
          if (gpuMatch) {
            const gpuCount = parseInt(gpuMatch[1]) || 0
            totalGpus += gpuCount
            
            // 如果节点有作业运行，认为GPU被使用
            if (hasJobs) {
              usedGpus += gpuCount
            }
          }
        }
      })
      
      // 计算集群级别的资源使用率
      if (totalMemory > 0) {
        systemMemoryUsage = Math.round((usedMemory / totalMemory) * 100)
      }
      
      if (totalCpuCores > 0) {
        systemCpuUsage = Math.round((usedCpuCores / totalCpuCores) * 100)
      }
      
      if (totalGpus > 0) {
        systemGpuUsage = Math.round((usedGpus / totalGpus) * 100)
      }
      
      // 获取存储使用率
      try {
        const { execFile } = await import('child_process')
        const { promisify } = await import('util')
        const execFileAsync = promisify(execFile)
        
        // 从配置文件读取存储路径，优先使用共享存储
        let storagePath = '/home' // 默认路径
        try {
          const { readFile } = await import('fs/promises')
          const configPath = path.join(process.cwd(), 'config', 'storage-config.json')
          const configData = await readFile(configPath, 'utf8')
          const config = JSON.parse(configData)
          storagePath = config.sharedStorage?.mountPath || '/home'
        } catch (configError) {
          console.log('无法读取存储配置，使用默认路径:', storagePath)
        }
        
        // 获取存储使用率
        const { stdout: storageOutput } = await execFileAsync('sh', ['-c', `df "${storagePath}" | tail -1 | awk '{print $5}' | cut -d'%' -f1`])
        systemStorageUsage = parseInt(storageOutput.trim()) || 0
        
        console.log(`存储使用率: ${systemStorageUsage}% (路径: ${storagePath})`)
      } catch (storageError) {
        console.error('获取存储使用率失败:', storageError)
        systemStorageUsage = 0
      }
      
      console.log(`Slurm资源使用率计算: 内存=${systemMemoryUsage}% (${usedMemory}GB/${totalMemory}GB), CPU=${systemCpuUsage}% (${usedCpuCores}/${totalCpuCores}), GPU=${systemGpuUsage}% (${usedGpus}/${totalGpus}), 存储=${systemStorageUsage}%`)
      
    } catch (e) {
      console.error('基于Slurm计算资源使用率失败，回退到系统级监控:', e)
      
      // 回退到系统级监控
      try {
        // 1. CPU使用率：基于系统负载
        const { readFile } = await import('fs/promises')
        const loadavg = await readFile('/proc/loadavg', 'utf8')
        const load = parseFloat(loadavg.split(' ')[0])
        systemCpuUsage = Math.min(100, Math.round(load * 25)) // 粗略估算
        
        // 2. 内存使用率：基于系统内存
        const meminfo = await readFile('/proc/meminfo', 'utf8')
        const memLines = meminfo.split('\n')
        let totalMem = 0, availableMem = 0
        
        for (const line of memLines) {
          if (line.startsWith('MemTotal:')) {
            totalMem = parseInt(line.split(/\s+/)[1])
          } else if (line.startsWith('MemAvailable:')) {
            availableMem = parseInt(line.split(/\s+/)[1])
          }
        }
        
        if (totalMem > 0) {
          const usedMem = totalMem - availableMem
          systemMemoryUsage = Math.round((usedMem / totalMem) * 100)
        }
        
        // 3. GPU使用率：基于nvidia-smi（如果可用）
        try {
          const { execFile } = await import('child_process')
          const { promisify } = await import('util')
          const execFileAsync = promisify(execFile)
          
          const { stdout: gpuOutput } = await execFileAsync('nvidia-smi', ['--list-gpus'])
          const gpuCount = gpuOutput.trim().split('\n').length
          
          if (gpuCount > 0) {
            const { stdout: utilOutput } = await execFileAsync('nvidia-smi', [
              '--query-gpu=utilization.gpu', 
              '--format=csv,noheader,nounits'
            ])
            const gpuUtils = utilOutput.trim().split('\n').map(Number)
            if (gpuUtils.length > 0) {
              systemGpuUsage = Math.round(gpuUtils.reduce((sum, util) => sum + util, 0) / gpuUtils.length)
            }
          }
        } catch (gpuError) {
          // 没有GPU或nvidia-smi不可用
          systemGpuUsage = 0
        }
      } catch (fallbackError) {
        console.error('系统级监控也失败:', fallbackError)
        systemCpuUsage = 0
        systemMemoryUsage = 0
        systemGpuUsage = 0
        systemStorageUsage = 0
      }
    }
    
    // 获取每个分区的运行作业数
    let partitionJobCounts: Record<string, { running: number; pending: number }> = {}
    try {
      const { stdout: squeueOutput } = await execFileAsync('squeue', ['-h', '-o', '%P|%T'])
      const squeueLines = squeueOutput.trim().split('\n')
      
      squeueLines.forEach(line => {
        if (line.trim()) {
          const [partition, state] = line.split('|')
          if (partition && state) {
            if (!partitionJobCounts[partition]) {
              partitionJobCounts[partition] = { running: 0, pending: 0 }
            }
            
            if (state === 'RUNNING') {
              partitionJobCounts[partition].running++
            } else if (state === 'PENDING') {
              partitionJobCounts[partition].pending++
            }
          }
        }
      })
    } catch (error) {
      console.warn('获取分区作业数失败:', error)
    }
    
    // 先解析为分区对象数组（每行代表该分区下某种状态的节点数）
    const rawPartitions = stdout.trim().split('\n')
      .map(line => {
        const [name, nodeCount, cpuInfo, gpuInfo, nodeState] = line.split('|')
        // CPU: alloc/idle/other/total
        const [cpuAlloc, cpuIdle, cpuOther, cpuTotal] = cpuInfo.split('/').map(Number)
        // GPU: 8(TeslaV100) 或 (null)
        let gpuTotal = 0, gpuAlloc = 0
        if (gpuInfo && gpuInfo !== '(null)') {
          // 解析如8(TeslaV100)
          const match = /([0-9]+)/.exec(gpuInfo)
          if (match) gpuTotal = Number(match[1])
        }
        // 节点健康统计修正：每行的nodeCount即为该状态下节点数
        // 修复：正确判断节点状态，idle、alloc、mix等状态都应该被认为是可用的
        const nCount = Number(nodeCount)
        // 修复：更准确的状态判断，idle和mix都是可用状态
        // 注意：mix状态表示节点部分资源被使用，但仍然是可用的
        const isHealthy = nodeState.includes('idle') || nodeState.includes('mix') || nodeState.includes('alloc')
        
        // 计算分区级别的使用率（基于该行数据）
        const partitionCpuUsage = cpuTotal > 0 ? (cpuAlloc / cpuTotal) * 100 : 0
        const partitionGpuUsage = gpuTotal > 0 ? (gpuAlloc / cpuTotal) * 100 : 0 // 注意：这里应该是cpuTotal，因为GPU使用率基于CPU分配
        
        return {
          name,
          nodeCount: nCount, // 该状态下节点数
          cpuCount: cpuTotal,
          gpuCount: gpuTotal,
          healthyNodes: isHealthy ? nCount : 0,
          unhealthyNodes: isHealthy ? 0 : nCount,
          cpuTotal,
          cpuAlloc,
          cpuIdle,
          gpuTotal,
          gpuAlloc,
          status: isHealthy ? 'healthy' : 'warning',
          // 使用率：使用分区级别的实际使用率，而不是集群整体使用率
          cpuUsage: Math.round(partitionCpuUsage),
          gpuUsage: Math.round(partitionGpuUsage),
          memoryUsage: Math.round(systemMemoryUsage), // 内存使用率仍使用系统级别
          storageUsage: Math.round(systemStorageUsage), // 存储使用率仍使用系统级别
        }
      })
      .filter(partition => partition.name !== '*' && partition.name.trim() !== '')
    
    // --- 聚合同名分区 ---
    // 用Map按name聚合
    const partitionMap = new Map<string, PartitionInfo>()
    for (const part of rawPartitions) {
      if (!partitionMap.has(part.name)) {
        const jobCounts = partitionJobCounts[part.name] || { running: 0, pending: 0 }
        partitionMap.set(part.name, { 
          ...part,
          running: jobCounts.running,
          pending: jobCounts.pending
        })
      } else {
        const agg = partitionMap.get(part.name)!
        // 累加数值型字段
        agg.nodeCount += part.nodeCount
        agg.cpuCount += part.cpuCount
        agg.gpuCount = (agg.gpuCount || 0) + (part.gpuCount || 0)
        agg.healthyNodes = (agg.healthyNodes || 0) + (part.healthyNodes || 0)
        agg.unhealthyNodes = (agg.unhealthyNodes || 0) + (part.unhealthyNodes || 0)
        agg.cpuTotal = (agg.cpuTotal || 0) + (part.cpuTotal || 0)
        agg.cpuAlloc = (agg.cpuAlloc || 0) + (part.cpuAlloc || 0)
        agg.cpuIdle = (agg.cpuIdle || 0) + (part.cpuIdle || 0)
        agg.gpuTotal = (agg.gpuTotal || 0) + (part.gpuTotal || 0)
        agg.gpuAlloc = (agg.gpuAlloc || 0) + (part.gpuAlloc || 0)
        // status: 只要有warning就为warning
        if (part.status === 'warning') agg.status = 'warning'
        // 使用率：使用分区级别的实际使用率，而不是集群整体使用率
        // 这里保持原有的分区级别使用率，不进行加权平均
      }
    }
    
    return Array.from(partitionMap.values())
  },
  async listNodes(): Promise<NodeInfo[]> {
    // 查询节点信息
    const { stdout } = await execFileAsync('sinfo', ['-N', '-h', '-o', '%N|%t|%c|%C|%m|%G'])
    return stdout.trim().split('\n').filter(Boolean).map(line => {
      const [name, state, cpuTotal, cpuAlloc, memTotal, gpuInfo] = line.split('|')
      // 解析 GPU 信息
      let gpuTotal = 0, gpuAlloc = 0
      if (gpuInfo && gpuInfo !== '(null)') {
        const match = /([0-9]+)\(.*\)/.exec(gpuInfo)
        if (match) gpuTotal = Number(match[1])
      }
      return {
        name,
        state,
        cpuTotal: Number(cpuTotal),
        cpuAlloc: Number(cpuAlloc?.split('/')[1] || 0),
        memTotal: Number(memTotal),
        memAlloc: 0, // Slurm sinfo 不直接给出 memAlloc
        gpuTotal,
        gpuAlloc,
      }
    })
  },
  async getJobLogs(jobId: string): Promise<{ stdout: string; stderr: string }> {
    // 获取作业日志，尝试多种方式
    try {
      // 方法1: 使用 sacct 获取日志路径
      const { stdout: sacctOutput } = await execFileAsync('sacct', [
        '-j', jobId,
        '-o', 'StdOut,StdErr',
        '-P', // pipe 分隔
        '-n', // 不显示表头
      ])
      const [stdoutPath, stderrPath] = sacctOutput.trim().split('|')
      let stdout = '', stderr = ''
      // 读取标准输出文件
      if (stdoutPath && stdoutPath !== '(null)' && stdoutPath !== '') {
        try {
          stdout = await fsOrig.promises.readFile(stdoutPath, 'utf-8')
        } catch (e) {
          stdout = `无法读取输出文件: ${stdoutPath}`
        }
      }
      // 读取错误输出文件
      if (stderrPath && stderrPath !== '(null)' && stderrPath !== '') {
        try {
          stderr = await fsOrig.promises.readFile(stderrPath, 'utf-8')
        } catch (e) {
          stderr = `无法读取错误文件: ${stderrPath}`
        }
      }
      // 如果至少有一个日志内容，直接返回
      if (stdout || stderr) return { stdout, stderr }
    } catch (e) {
      // sacct 失败，继续尝试
    }
    // 方法2: scontrol
    try {
      const { stdout: scontrolOutput } = await execFileAsync('scontrol', [
        'show', 'job', jobId
      ])
      // 解析 scontrol 输出中的日志路径
      const stdoutMatch = /StdOut=([^\s]+)/.exec(scontrolOutput)
      const stderrMatch = /StdErr=([^\s]+)/.exec(scontrolOutput)
      let stdout = '', stderr = ''
      if (stdoutMatch && stdoutMatch[1] !== '(null)') {
        try {
          stdout = await fsOrig.promises.readFile(stdoutMatch[1], 'utf-8')
        } catch (e) {
          stdout = `无法读取输出文件: ${stdoutMatch[1]}`
        }
      }
      if (stderrMatch && stderrMatch[1] !== '(null)') {
        try {
          stderr = await fsOrig.promises.readFile(stderrMatch[1], 'utf-8')
        } catch (e) {
          stderr = `无法读取错误文件: ${stderrMatch[1]}`
        }
      }
      if (stdout || stderr) return { stdout, stderr }
    } catch (e2) {
      // scontrol 失败，继续尝试
    }
    // 方法3: 数据库查找
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabaseUrl = process.env.SUPABASE_URL || ''
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data: dbJobs, error: dbError } = await supabase
        .from('jobs')
        .select('stdout_path,stderr_path')
        .eq('job_id', jobId)
        .limit(1)
      if (dbError) {
        console.error('[getJobLogs] 查询数据库失败:', dbError)
      }
      if (dbJobs && dbJobs.length > 0) {
        const { stdout_path, stderr_path } = dbJobs[0]
        let stdout = '', stderr = ''
        if (stdout_path) {
          try {
            stdout = await fsOrig.promises.readFile(stdout_path, 'utf-8')
          } catch (e) {
            stdout = `无法读取输出文件: ${stdout_path}`
          }
        }
        if (stderr_path) {
          try {
            stderr = await fsOrig.promises.readFile(stderr_path, 'utf-8')
          } catch (e) {
            stderr = `无法读取错误文件: ${stderr_path}`
          }
        }
        if (stdout || stderr) return { stdout, stderr }
      }
    } catch (e3) {
      console.error('[getJobLogs] 数据库查找日志路径失败:', e3)
    }
    // 如果都失败，返回错误信息
    return {
      stdout: '无法获取作业日志',
      stderr: '请检查作业是否已完成或日志文件是否存在'
    }
  },
}