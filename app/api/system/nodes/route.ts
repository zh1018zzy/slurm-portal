import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { exec } from 'child_process'
import path from 'path'
import { promisify } from 'util'
export const dynamic = 'force-dynamic'

function getClientIP(req: NextRequest): string {
  const forwardedFor = req.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  const realIP = req.headers.get('x-real-ip')
  if (realIP) return realIP
  const cfConnectingIP = req.headers.get('cf-connecting-ip')
  if (cfConnectingIP) return cfConnectingIP
  return 'unknown'
}


const execAsync = promisify(exec)

// 执行 Slurm 命令时的环境，确保 PATH 包含常见 Slurm 安装路径（Node 进程由 systemd/pm2 启动时可能 PATH 过窄）
const SLURM_ENV = {
  ...process.env,
  PATH: [process.env.PATH, '/usr/bin', '/usr/local/bin', '/opt/slurm/bin'].filter(Boolean).join(':')
}

// 缓存和限流配置
let nodeDataCache: { data: any; timestamp: number } | null = null
const CACHE_DURATION = 60 * 1000 // 1分钟缓存
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30 // 每分钟最多30次请求（支持多页面和手动刷新场景）
const RATE_LIMIT_WINDOW = 60 * 1000 // 1分钟窗口

// 获取当前用户信息
function getCurrentUser(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    const token = authHeader.substring(7)
    const payload = verifyJwt(token)
    return payload
  } catch (error) {
    return null
  }
}

// 限流检查函数
function checkRateLimit(clientId: string): boolean {
  const now = Date.now()
  const clientData = requestCounts.get(clientId)
  
  if (!clientData || now > clientData.resetTime) {
    requestCounts.set(clientId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
    return true
  }
  
  if (clientData.count >= RATE_LIMIT) {
    return false
  }
  
  clientData.count++
  return true
}

// 获取缓存数据
function getCachedData() {
  if (nodeDataCache && Date.now() - nodeDataCache.timestamp < CACHE_DURATION) {
    return nodeDataCache.data
  }
  return null
}

// 设置缓存数据
function setCacheData(data: any) {
  nodeDataCache = { data, timestamp: Date.now() }
}

// 解析 SLURM 节点列表的函数
// 支持格式：node001, node[001-010], node[001-003,005-010], node001,node[002-010]
function parseNodeList(nodeListStr: string): string[] {
  const nodeList: string[] = []
  if (!nodeListStr || !nodeListStr.trim()) {
    return nodeList
  }
  
  // 首先按逗号分割，但要小心处理括号内的逗号
  const parts: string[] = []
  let current = ''
  let bracketDepth = 0
  
  for (let i = 0; i < nodeListStr.length; i++) {
    const char = nodeListStr[i]
    if (char === '[') {
      bracketDepth++
      current += char
    } else if (char === ']') {
      bracketDepth--
      current += char
    } else if (char === ',' && bracketDepth === 0) {
      if (current.trim()) {
        parts.push(current.trim())
      }
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) {
    parts.push(current.trim())
  }
  
  // 处理每个部分
  for (const part of parts) {
    // 检查是否是范围格式 node[001-010] 或 node[001-003,005-010]
    const rangeMatch = part.match(/^(\w+)\[(.+)\]$/)
    if (rangeMatch) {
      const [, prefix, ranges] = rangeMatch
      // 处理范围，可能包含多个范围如 "001-003,005-010"
      const rangeParts = ranges.split(',').map(r => r.trim())
      
      for (const rangePart of rangeParts) {
        const singleRangeMatch = rangePart.match(/^(\d+)-(\d+)$/)
        if (singleRangeMatch) {
          const [, start, end] = singleRangeMatch
          const startNum = parseInt(start, 10)
          const endNum = parseInt(end, 10)
          const padding = start.length // 获取填充长度
          
          for (let i = startNum; i <= endNum; i++) {
            nodeList.push(`${prefix}${String(i).padStart(padding, '0')}`)
          }
        } else {
          // 单个数字
          const numMatch = rangePart.match(/^(\d+)$/)
          if (numMatch) {
            const padding = numMatch[1].length
            nodeList.push(`${prefix}${numMatch[1].padStart(padding, '0')}`)
          }
        }
      }
    } else {
      // 单个节点名称
      if (part.trim()) {
        nodeList.push(part.trim())
      }
    }
  }
  
  return nodeList
}

// GET /api/system/nodes - 获取节点监控信息
export async function GET(req: NextRequest) {
  const startTime = Date.now()
  
  try {
    // 验证用户身份
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      console.warn('[节点API] 未授权访问尝试:', { ip: getClientIP(req), userAgent: req.headers.get('user-agent') })
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }
    
    // 限流检查
    const clientIP = getClientIP(req)
    const clientId = clientIP !== 'unknown' ? clientIP : userInfo.username
    if (!checkRateLimit(clientId)) {
      console.warn('[节点API] 请求频率超限:', { clientId, user: userInfo.username })
      return Response.json({ 
        success: false, 
        error: '请求过于频繁，请稍后再试' 
      }, { status: 429 })
    }
    
    console.info('[节点API] 请求开始:', { user: userInfo.username, clientId })

    const { searchParams } = new URL(req.url)
    const detailed = searchParams.get('detailed') === 'true'
    const format = searchParams.get('format') || 'json'
    
    // 检查缓存（仅对JSON格式启用缓存）
    if (format === 'json') {
      const cachedData = getCachedData()
      if (cachedData) {
        console.info('[节点API] 返回缓存数据:', { user: userInfo.username, cacheAge: Date.now() - nodeDataCache!.timestamp })
        return Response.json(cachedData)
      }
    }
    
    // 执行节点监控脚本
    const scriptPath = path.join(process.cwd(), 'scripts/slurm-node-monitor.sh')
    const command = `${scriptPath} ${format} ${detailed}`
    
    console.debug('[节点API] 执行命令:', { command })
    const { stdout, stderr } = await execAsync(command, { timeout: 30000, env: SLURM_ENV }) // 30秒超时
    
    if (stderr) {
      console.warn('[节点API] 脚本警告:', { stderr, user: userInfo.username })
    }
    
    if (format === 'json') {
      try {
        const monitorData = JSON.parse(stdout)
        
        // 增强数据：添加节点详细信息（使用 SLURM_ENV 保证 sinfo 在 systemd/pm2 等环境下可找到）
        console.debug('[节点API] 获取节点详情')
        const { stdout: nodeDetails } = await execAsync('sinfo -N -o "%N|%t|%C|%O|%e|%f|%G" --noheader', { timeout: 10000, env: SLURM_ENV })
        const nodes = nodeDetails.trim().split('\n').filter(Boolean).map(line => {
          const [name, state, cpuInfo, cpuLoad, freeMem, features, gres] = line.split('|')
          const [allocCPUs, idleCPUs, otherCPUs, totalCPUs] = cpuInfo.split('/').map(Number)
          
          return {
            name,
            state,
            cpuTotal: totalCPUs || 0,
            cpuAlloc: allocCPUs || 0,
            cpuIdle: idleCPUs || 0,
            cpuUtilization: totalCPUs > 0 ? Math.round((allocCPUs / totalCPUs) * 100) : 0,
            cpuLoad: parseFloat(cpuLoad) || 0,
            freeMemory: parseInt(freeMem) || 0,
            features: features || '',
            gres: gres || ''
          }
        })
        
        // 增强数据：添加分区信息
        console.debug('[节点API] 获取分区详情')
        const { stdout: partitionDetails } = await execAsync('sinfo -o "%P|%D|%C|%G|%l|%t" --noheader', { timeout: 10000, env: SLURM_ENV })
        const partitionLines = partitionDetails.trim().split('\n').filter(Boolean)
        if (partitionLines.length === 0) {
          console.warn('[节点API] sinfo 分区输出为空，请检查 Node 进程的 PATH 与 Slurm 环境。原始输出:', JSON.stringify(partitionDetails.slice(0, 200)))
        }
        const partitions = partitionLines.map(line => {
          const [name, nodeCount, cpuInfo, gres, timeLimit, state] = line.split('|')
          const [allocCPUs, idleCPUs, otherCPUs, totalCPUs] = cpuInfo.split('/').map(Number)
          
          return {
            name: name.replace('*', ''),
            nodeCount: parseInt(nodeCount) || 0,
            cpuTotal: totalCPUs || 0,
            cpuAlloc: allocCPUs || 0,
            cpuIdle: idleCPUs || 0,
            cpuUtilization: totalCPUs > 0 ? Math.round((allocCPUs / totalCPUs) * 100) : 0,
            gres: gres || '',
            timeLimit: timeLimit || '',
            state: state || ''
          }
        })
        
        // 为每个分区获取节点列表
        console.debug('[节点API] 获取分区节点列表')
        const partitionsWithNodes = await Promise.all(partitions.map(async (partition) => {
          try {
            const { stdout: nodeListOutput } = await execAsync(`sinfo -p ${partition.name} -o "%N" --noheader`, { timeout: 5000, env: SLURM_ENV })
            const nodeListStr = nodeListOutput.trim()
            const parsedNodes = parseNodeList(nodeListStr)
            
            return {
              ...partition,
              nodeList: parsedNodes.length > 0 ? parsedNodes.join(',') : ''
            }
          } catch (error) {
            console.warn(`[节点API] 获取分区 ${partition.name} 的节点列表失败:`, error instanceof Error ? error.message : error)
            return {
              ...partition,
              nodeList: ''
            }
          }
        }))
        
        // 获取实时作业资源使用情况
        let jobResourceUsage = []
        try {
          console.debug('[节点API] 获取运行作业信息')
          const { stdout: runningJobs } = await execAsync('squeue -t RUNNING -o "%i|%j|%u|%N|%C|%m|%P|%M" --noheader', { timeout: 10000, env: SLURM_ENV })
          jobResourceUsage = runningJobs.trim().split('\n').filter(Boolean).map(line => {
            const [jobId, name, user, nodes, cpus, memory, partition, runTime] = line.split('|')
            return {
              jobId,
              name,
              user,
              nodes: nodes || '',
              cpus: parseInt(cpus) || 0,
              memory: memory || '',
              partition,
              runTime
            }
          })
        } catch (error) {
          console.warn('[节点API] 获取作业资源使用失败:', { error: error instanceof Error ? error.message : error, user: userInfo.username })
        }
        
        const result = {
          success: true,
          data: {
            ...monitorData,
            nodes,
            partitions: partitionsWithNodes,
            jobResourceUsage,
            totalNodes: nodes.length, // 添加节点总数
            metadata: {
              script: scriptPath,
              detailed,
              collectTime: new Date().toISOString(),
              processingTime: Date.now() - startTime,
              cached: false
            }
          }
        }

        // 分区为空时不缓存，避免后续请求持续返回空数据（例如 Node 进程 PATH 与终端不一致时）
        if (partitionsWithNodes.length > 0) {
          setCacheData(result)
        } else {
          console.warn('[节点API] 分区列表为空，本次结果不写入缓存')
        }
        console.info('[节点API] 请求完成:', {
          user: userInfo.username, 
          processingTime: Date.now() - startTime,
          nodeCount: nodes.length,
          partitionCount: partitions.length,
          jobCount: jobResourceUsage.length
        })
        
        return Response.json(result)
      } catch (parseError) {
        const parseErrorMsg = parseError instanceof Error ? parseError.message : '解析失败'
        const rawOutput = stdout?.substring(0, 1000) || '' // 限制输出长度
        
        console.error('[节点API] 解析监控数据失败:', { 
          error: parseErrorMsg,
          user: userInfo.username,
          rawOutputLength: stdout?.length || 0,
          rawOutputSample: rawOutput
        })
        
        return Response.json({ 
          success: false, 
          error: '监控数据格式错误',
          details: `JSON解析错误: ${parseErrorMsg}`,
          rawSample: rawOutput.length > 500 ? rawOutput.substring(0, 500) + '...' : rawOutput
        }, { status: 500 })
      }
    } else {
      // 文本格式直接返回
      return new Response(stdout, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      })
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime
    console.error('[节点API] 获取节点监控信息失败:', { 
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime,
      user: getCurrentUser(req)?.username || 'unknown'
    })
    
    // 如果是超时错误，返回特殊状态
    if (error instanceof Error && error.message.includes('timeout')) {
      return Response.json({ 
        success: false, 
        error: '系统响应超时，请稍后重试',
        code: 'TIMEOUT'
      }, { status: 504 })
    }
    
    return Response.json({ 
      success: false, 
      error: '获取节点监控信息失败',
      details: error instanceof Error ? error.message : '未知错误',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

// POST /api/system/nodes - 更新节点状态
export async function POST(req: NextRequest) {
  try {
    // 验证用户身份
    const userInfo = getCurrentUser(req)
    if (!userInfo?.username) {
      return Response.json({ success: false, error: '未登录或登录已过期' }, { status: 401 })
    }
    
    // 检查管理员权限
    if (userInfo.role !== 'admin') {
      return Response.json({ success: false, error: '需要管理员权限' }, { status: 403 })
    }
    
    const body = await req.json()
    const { action, nodes, reason } = body
    
    if (!action || !nodes) {
      return Response.json({ 
        success: false, 
        error: '缺少必需参数：action 和 nodes' 
      }, { status: 400 })
    }
    
    const nodeList = Array.isArray(nodes) ? nodes.join(',') : nodes
    let command = ''
    
    switch (action) {
      case 'drain':
        command = `scontrol update NodeName=${nodeList} State=DRAIN Reason="${reason || 'Manual drain'}"`
        break
      case 'resume':
        command = `scontrol update NodeName=${nodeList} State=RESUME`
        break
      case 'down':
        command = `scontrol update NodeName=${nodeList} State=DOWN Reason="${reason || 'Manual down'}"`
        break
      case 'idle':
        command = `scontrol update NodeName=${nodeList} State=IDLE`
        break
      default:
        return Response.json({ 
          success: false, 
          error: '不支持的操作：' + action 
        }, { status: 400 })
    }
    
    const { stdout, stderr } = await execAsync(command)
    
    if (stderr && !stderr.includes('scontrol: Node')) {
      console.error('节点状态更新错误:', stderr)
      return Response.json({ 
        success: false, 
        error: '更新节点状态失败',
        details: stderr
      }, { status: 500 })
    }
    
    return Response.json({
      success: true,
      message: `节点 ${nodeList} 状态已更新为 ${action.toUpperCase()}`,
      output: stdout
    })
    
  } catch (error) {
    console.error('更新节点状态失败:', error)
    return Response.json({ 
      success: false, 
      error: '更新节点状态失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}