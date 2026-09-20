import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry } from '@/lib/application-registry'
import { JobNotificationService } from '@/lib/job-notification-service'
import { BUILTIN_VNC_APPS } from '@/lib/builtin-vnc-apps'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir } from 'fs/promises'
import path from 'path'
import crypto from 'crypto'
import { verifyJwt } from '@/lib/jwt'

const execFileAsync = promisify(execFile)

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic'

/**
 * 提交HPC应用作业
 * POST /api/applications/[id]/submit
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  try {
    const { id } = resolvedParams
    
    // 检查请求内容类型
    const contentType = request.headers.get('content-type') || ''
    
    let formData: any
    let uploadedFiles: { [key: string]: File } = {}
    
    if (contentType.includes('multipart/form-data')) {
      // 处理文件上传
      const formDataObj = await request.formData()
      formData = {}
      uploadedFiles = {}
      
      for (const [key, value] of Array.from(formDataObj.entries())) {
        // 在Node.js环境中，文件对象是Buffer或Blob，不是File
        if (value && typeof value === 'object' && 'name' in value && 'size' in value) {
          uploadedFiles[key] = value as any
          // 对于文件字段，保存文件名而不是文件对象
          formData[key] = (value as any).name
        } else {
          formData[key] = value
        }
      }
    } else {
      // 处理JSON数据
      formData = await request.json()
    }
    
    // 获取应用规范 - 支持应用名称或ID，包括内置VNC应用
    let app = await applicationRegistry.get(id, formData.version)
    
    // 如果按名称没找到，尝试按ID查找（向后兼容）
    if (!app) {
      const allApps = await applicationRegistry.getAll()
      app = allApps.find(a => 
        a.metadata.name === id || 
        `${a.metadata.name}@${a.metadata.version}` === id
      )
    }
    
    // 如果还没找到，检查内置VNC应用
    if (!app) {
      const vncApp = BUILTIN_VNC_APPS.find(vncApp => vncApp.id === id)
      if (vncApp) {
        // 处理VNC应用提交
        return await handleVncAppSubmission(vncApp, formData, request)
      }
    }
    
    if (!app) {
      return NextResponse.json({
        success: false,
        message: `应用 ${id} 未找到`
      }, { status: 404 })
    }

    // 选择执行模板
    const templateName = formData.templateName || formData.analysisType || 'default'
    const template = app.execution.templates.find(t => t.name === templateName) || app.execution.templates[0]
    
    if (!template) {
      return NextResponse.json({
        success: false,
        message: '未找到匹配的执行模板'
      }, { status: 400 })
    }

    // 获取当前用户信息（从JWT token）
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: '未授权访问'
      }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo?.username) {
      return NextResponse.json({
        success: false,
        message: '无效的认证令牌'
      }, { status: 401 })
    }
    
    const username = userInfo.username
    
    // 使用用户主目录管理器获取用户信息和创建作业目录
    const { UserHomeManager } = await import('@/lib/user-home-manager')
    const { jobDir, myJobsDir, home: userHome, uid, gid } = await UserHomeManager.createJobDirectory(username)
    
    // 上传文件到作业目录
    for (const [fieldName, file] of Object.entries(uploadedFiles)) {
      const filePath = path.join(jobDir, (file as any).name)
      
      // 在Node.js环境中，文件可能是Buffer或Blob
      let fileBuffer: Buffer
      if (file instanceof Buffer) {
        fileBuffer = file
      } else if ('arrayBuffer' in file) {
        const bytes = await (file as any).arrayBuffer()
        fileBuffer = Buffer.from(bytes)
      } else {
        // 如果是其他类型，尝试转换为Buffer
        fileBuffer = Buffer.from(file as any)
      }
      
      await writeFile(filePath, new Uint8Array(fileBuffer))
      
      // 设置文件权限
      try {
        await execFileAsync('chown', [`${uid}:${gid}`, filePath])
      } catch (error) {
        console.warn('设置文件权限失败:', error)
      }
      
      // 更新formData中的文件路径
      formData[fieldName] = path.join(jobDir, (file as any).name)
    }

    // 生成作业脚本
    const jobScript = generateJobScript(template, formData, app, jobDir)
    
    // 创建作业脚本文件在作业目录中
    const scriptPath = path.join(jobDir, 'job.sh')
    
    await writeFile(scriptPath, jobScript, 'utf8')
    
    // 设置脚本文件权限
    try {
      await execFileAsync('chown', [`${uid}:${gid}`, scriptPath])
      await execFileAsync('chmod', ['700', scriptPath])
    } catch (error) {
      console.warn('设置脚本文件权限失败:', error)
    }
    
    try {
      // 提交作业到Slurm - 使用用户身份提交，而不是root
      const cleanPartition = (formData.partition || app.resources.default.partition || 'compute').replace(/\*$/, '')
      const sbatchArgs = [
        '-p', cleanPartition,
        '-J', formData.jobName || `${app.metadata.name}-job`,
        '-N', String(formData.nodes || app.resources.default.nodes || 1),
        '--cpus-per-task', String(formData.cpusPerTask || formData.cpus || app.resources.default.cpusPerTask || 1),
        '-o', path.join(jobDir, 'slurm-%j.out'),
        '-e', path.join(jobDir, 'slurm-%j.err'),
        path.join(jobDir, 'job.sh')
      ]
      
      // 处理内存参数 - 只有在不是系统默认或不限时才添加
      console.log('Debug - Memory param:', {
        memory: formData.memory,
        shouldAddMem: formData.memory && 
          formData.memory !== 'unlimited' && 
          formData.memory !== 'default' && 
          formData.memory !== '0' && 
          formData.memory !== '0G' && 
          formData.memory !== '0M'
      })
      
      if (formData.memory && 
          formData.memory !== 'unlimited' && 
          formData.memory !== 'default' && 
          formData.memory !== '0' && 
          formData.memory !== '0G' && 
          formData.memory !== '0M') {
        sbatchArgs.splice(-1, 0, '--mem', formData.memory)
        console.log('Debug - Added memory param:', formData.memory)
      } else {
        console.log('Debug - Skipped memory param')
      }
      
      // 处理时间参数 - 只有在不是分区默认或不限时才添加  
      if (formData.walltime && 
          formData.walltime !== 'unlimited' && 
          formData.walltime !== 'default' && 
          formData.walltime.trim()) {
        sbatchArgs.splice(-1, 0, '-t', formData.walltime)
      }
      
      const sbatchCmd = `sbatch ${sbatchArgs.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ')}`
      const suCmd = `su -l ${username} -c "${sbatchCmd}"`
      
      const { stdout, stderr } = await execFileAsync('sh', ['-c', suCmd])
      
      // 解析作业ID
      const slurmJobId = extractJobId(stdout)
      
      if (!slurmJobId) {
        throw new Error(`无法解析作业ID: ${stdout}`)
      }
      
      // 脚本文件现在在作业目录中，不需要清理
      
      // 保存作业到数据库
      try {
        const { upsertJobToDb } = await import('@/lib/job-db')
        const jobData = {
          jobId: slurmJobId,
          user: username, // 使用从JWT获取的实际用户名
          jobName: formData.jobName || `${app.metadata.name}-job`,
          partition: cleanPartition,
          status: 'PENDING',
          submitTime: new Date().toISOString(),
          script: jobScript,
          extra: {
            applicationName: app.metadata.displayName || app.metadata.name,
            templateName: template.name,
            parameters: formData,
            uploadedFiles: Object.keys(uploadedFiles),
            jobDir: jobDir,
            scriptPath: scriptPath, // 保存脚本文件路径
            stdoutPath: path.join(jobDir, 'slurm-%j.out'), // 保存标准输出路径
            stderrPath: path.join(jobDir, 'slurm-%j.err')   // 保存标准错误路径
          }
        }
        await upsertJobToDb(jobData)
      } catch (dbError) {
        console.warn('保存作业到数据库失败:', dbError)
        // 数据库保存失败不影响作业提交
      }
      
      // 发送作业提交通知
      try {
        await JobNotificationService.notifyJobStatusChange(
          slurmJobId,
          app.metadata.displayName || app.metadata.name,
          username, // 使用从JWT获取的实际用户名
          'NEW',
          'PENDING',
          {
            partition: cleanPartition,
            submitTime: new Date().toISOString()
            // jobDir: jobDir // 保存作业目录路径 - 暂时注释掉，避免类型错误
          }
        )
      } catch (notificationError) {
        console.warn('作业提交通知发送失败:', notificationError)
        // 通知失败不影响作业提交
      }
      
      return NextResponse.json({
        success: true,
        message: '作业提交成功',
        data: {
          jobId: slurmJobId,
          applicationName: app.metadata.displayName || app.metadata.name,
          templateName: template.name,
          submittedAt: new Date().toISOString(),
          parameters: formData,
          uploadedFiles: Object.keys(uploadedFiles)
        }
      })
      
    } catch (execError) {
      // 脚本文件在作业目录中，不需要清理
      throw execError
    }
    
  } catch (error) {
    console.error('作业提交失败:', error)
    return NextResponse.json({
      success: false,
      message: '作业提交失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * 生成作业脚本
 */
function generateJobScript(template: any, formData: any, app: any, jobDir?: string): string {
  let script = template.template
  
  // 替换基本变量，处理 default 值
  const cleanPartition = (formData.partition || app.resources.default.partition || 'compute').replace(/\*$/, '')
  const replacements = {
    jobName: formData.jobName || `${app.metadata.name}-job`,
    nodes: formData.nodes || app.resources.default.nodes || 1,
    cpusPerTask: formData.cpusPerTask || app.resources.default.cpusPerTask || 1,
    partition: cleanPartition,
    modules: app.requirements.modules || [],
    jobDir: jobDir || '$SLURM_SUBMIT_DIR', // 使用作业目录或默认的SLURM_SUBMIT_DIR
    ...formData
  }
  
  // 首先处理特殊的 default 值 - 直接移除包含这些参数的SBATCH行
  if (formData.memory === 'default' || formData.memory === 'unlimited') {
    // 移除内存相关的SBATCH行
    script = script.replace(/^#SBATCH --mem={{memory}}\s*$/gm, '')
  } else {
    replacements.memory = formData.memory || app.resources.default.memory || '8GB'
  }
  
  if (formData.walltime === 'default' || formData.walltime === 'unlimited') {
    // 移除时间相关的SBATCH行  
    script = script.replace(/^#SBATCH --time={{walltime}}\s*$/gm, '')
    script = script.replace(/^#SBATCH -t={{walltime}}\s*$/gm, '')
  } else {
    replacements.walltime = formData.walltime || app.resources.default.walltime || '1:00:00'
  }
  
  // 替换简单变量 {{variable}}
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    script = script.replace(regex, String(value))
  }
  
  // 清理可能残留的无效SBATCH参数行
  script = script.replace(/^#SBATCH --mem=\s*$/gm, '')
  script = script.replace(/^#SBATCH --mem=default\s*$/gm, '')  
  script = script.replace(/^#SBATCH --time=\s*$/gm, '')
  script = script.replace(/^#SBATCH --time=default\s*$/gm, '')
  script = script.replace(/^#SBATCH -t\s*$/gm, '')
  script = script.replace(/^#SBATCH --partition=.*\*\s*$/gm, (match) => {
    // 将 --partition=compute* 替换为 --partition=compute
    return match.replace(/\*\s*$/, '')
  })
  
  // 清理多余的空行
  script = script.replace(/\n\n\n+/g, '\n\n')
  
  // 处理条件块 {{#modules}}...{{/modules}}
  script = script.replace(/{{#modules}}([\s\S]*?){{\/modules}}/g, (match: string, content: string) => {
    if (replacements.modules && Array.isArray(replacements.modules) && replacements.modules.length > 0) {
      return replacements.modules.map((module: string) => content.replace(/{{\.}}/g, module)).join('\n')
    }
    return ''
  })
  
  // 处理反向条件块 {{^script}}...{{/script}}
  script = script.replace(/{{(\^|\#)(\w+)}}([\s\S]*?){{\/\2}}/g, (match: string, operator: string, key: string, content: string) => {
    const value = replacements[key as keyof typeof replacements]
    if (operator === '^') {
      // 反向条件：如果值为空或false则显示
      return (!value || value === '') ? content : ''
    } else {
      // 正向条件：如果值存在且不为空则显示
      return (value && value !== '') ? content.replace(new RegExp(`{{${key}}}`, 'g'), String(value)) : ''
    }
  })
  
  return script
}

/**
 * 从Slurm输出中提取作业ID
 */
function extractJobId(output: string): string | null {
  const match = output.match(/Submitted batch job (\d+)/)
  return match ? match[1] : null
}

/**
 * 处理VNC应用提交
 */
async function handleVncAppSubmission(vncApp: any, formData: any, request: NextRequest) {
  try {
    // 获取当前用户信息（从JWT token）
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        message: '未授权访问'
      }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const userInfo = verifyJwt(token)
    if (!userInfo?.username) {
      return NextResponse.json({
        success: false,
        message: '无效的认证令牌'
      }, { status: 401 })
    }
    
    const username = userInfo.username
    
    // 检查用户是否已有运行中的VNC作业（限制一人一个）- 使用实时Slurm查询
    try {
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execFileAsync = promisify(execFile)
      
      // 查询用户在Slurm中的活跃作业
      const { stdout } = await execFileAsync('squeue', [
        '-u', username,
        '-o', '%i|%j|%T',
        '-h'
      ])
      
      if (stdout.trim()) {
        const activeJobs = stdout.trim().split('\n').map(line => {
          const [jobId, jobName, state] = line.split('|')
          return { jobId, jobName, state }
        })
        
        // 检查是否有VNC作业
        const existingVncJob = activeJobs.find(job => 
          job.jobName?.includes('vnc') || 
          job.jobName?.includes('VNC')
        )
        
        if (existingVncJob) {
          return NextResponse.json({
            success: false,
            message: `您已有正在运行的桌面会话 (${existingVncJob.jobName})，请先结束当前会话再启动新的桌面会话`,
            existingJob: {
              jobId: existingVncJob.jobId,
              jobName: existingVncJob.jobName,
              status: existingVncJob.state === 'R' ? 'RUNNING' : 
                     existingVncJob.state === 'PD' ? 'PENDING' : existingVncJob.state
            }
          }, { status: 409 })
        }
      }
      
    } catch (slurmError) {
      console.warn('检查Slurm作业失败，跳过用户限制检查:', slurmError)
      // 如果Slurm查询失败，允许提交（避免因为系统问题阻止用户使用）
    }
    
    // 导入VNC管理器
    const { getNextDisplay, displayToVncPort, generateVncScript, generateVncUrl, ensureNovncProxy } = await import('@/lib/vnc-manager')
    
    // 获取可用的display号
    const display = await getNextDisplay()
    const vncPort = displayToVncPort(display)
    // 将 noVNC websockify 指到本会话端口（容器为单目标模式）
    await ensureNovncProxy(vncPort)
    
    // 生成VNC脚本
    const vncScript = generateVncScript({
      display,
      appCommand: vncApp.command,
      userId: username,
      geometry: formData.geometry || '1920x1080'
    })
    
    // 使用用户主目录管理器获取用户信息和创建作业目录
    const { UserHomeManager } = await import('@/lib/user-home-manager')
    const { jobDir, myJobsDir, home: userHome, uid, gid } = await UserHomeManager.createJobDirectory(username)
    
    // 创建VNC脚本文件在作业目录中
    const scriptPath = path.join(jobDir, 'vnc_job.sh')
    
    await writeFile(scriptPath, vncScript, 'utf8')
    
    // 设置脚本文件权限
    try {
      await execFileAsync('chown', [`${uid}:${gid}`, scriptPath])
      await execFileAsync('chmod', ['700', scriptPath])
    } catch (error) {
      console.warn('设置脚本文件权限失败:', error)
    }
    
    // 提交作业到Slurm
    const sbatchArgs = [
      '-p', formData.partition || 'graphics',
      '-J', `vnc-desktop-${display}`,
      '-N', '1',
      '--cpus-per-task', String(formData.cpusPerTask || 2),
      '-o', path.join(jobDir, 'slurm-%j.out'),
      '-e', path.join(jobDir, 'slurm-%j.err'),
      '-t', formData.time || '04:00:00',
      scriptPath
    ]
    
    const sbatchCmd = `sbatch ${sbatchArgs.map(a => `'${a.replace(/'/g, `'\\''`)}'`).join(' ')}`
    const suCmd = `su -l ${username} -c "${sbatchCmd}"`
    
    const { stdout, stderr } = await execFileAsync('sh', ['-c', suCmd])
    
    // 解析作业ID
    const slurmJobId = extractJobId(stdout)
    
    if (!slurmJobId) {
      throw new Error(`无法解析作业ID: ${stdout}`)
    }
    
    // 保存作业到数据库
    try {
      const { upsertJobToDb } = await import('@/lib/job-db')
      const jobData = {
        jobId: slurmJobId,
        user: username,
        jobName: `vnc-desktop-${display}`,
        partition: formData.partition || 'graphics',
        status: 'PENDING',
        submitTime: new Date().toISOString(),
        script: vncScript,
        jobType: 'graphics',
        vncDisplay: display,  // 重要：放在顶层
        vncPort: vncPort,     // 重要：放在顶层
        extra: {
          applicationName: vncApp.name,
          vncApp: vncApp,
          parameters: formData,
          jobDir: jobDir,
          scriptPath: scriptPath, // VNC脚本文件路径
          stdoutPath: path.join(jobDir, 'slurm-%j.out'), // VNC标准输出路径
          stderrPath: path.join(jobDir, 'slurm-%j.err')   // VNC标准错误路径
        }
      }
      await upsertJobToDb(jobData)
    } catch (dbError) {
      console.warn('保存VNC作业到数据库失败:', dbError)
    }
    
    // 广播作业更新给所有连接的客户端
    try {
      const { broadcastJobUpdate } = await import('@/lib/sse-manager')
      broadcastJobUpdate({
        type: 'job_submitted',
        user: username,
        job: {
          jobId: slurmJobId,
          jobName: `vnc-desktop-${display}`,
          applicationName: vncApp.name,
          vncDisplay: display,
          vncPort: vncPort,
          status: 'PENDING',
          submitTime: new Date().toISOString()
        }
      })
    } catch (broadcastError) {
      console.warn('广播作业更新失败:', broadcastError)
    }

    return NextResponse.json({
      success: true,
      message: 'VNC作业提交成功',
      job: {
        jobId: slurmJobId,
        jobName: `vnc-desktop-${display}`,
        applicationName: vncApp.name,
        vncDisplay: display,
        vncPort: vncPort,
        vncUrl: await generateVncUrl('vnc', vncPort),
      }
    })
    
  } catch (error) {
    console.error('VNC作业提交失败:', error)
    return NextResponse.json({
      success: false,
      message: 'VNC作业提交失败',
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}