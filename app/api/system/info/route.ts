import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { verifyJwt } from '@/lib/jwt'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

// 强制动态渲染，因为使用了 request.headers
export const dynamic = 'force-dynamic'

// 加载存储配置
function loadStorageConfig() {
  try {
    const configPath = path.join(process.cwd(), 'config', 'storage-config.json')
    const configData = fs.readFileSync(configPath, 'utf8')
    return JSON.parse(configData)
  } catch (error) {
    console.error('加载存储配置失败:', error)
    // 返回默认配置
    return {
      sharedStorage: {
        mountPath: "/home"
      }
    }
  }
}

// GET /api/system/info 获取系统信息
export async function GET(request: NextRequest) {
  try {
    // 验证用户身份
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    
    const token = authHeader.substring(7)
    const payload = verifyJwt(token)
    if (!payload) {
      return NextResponse.json({ error: '无效的认证令牌' }, { status: 401 })
    }

    // 加载存储配置
    const config = loadStorageConfig()
    const sharedStoragePath = config.sharedStorage?.mountPath || '/home'
    
    // 获取硬件资源信息（使用Slurm数据）
    const [slurmNodesOutput, storageOutput, sinfoOutput] = await Promise.allSettled([
      execAsync('sinfo -N -o "%N %m %C %G %t"'),
      execAsync(`df -h ${sharedStoragePath} | tail -1 | awk '{print $2}'`),
      execAsync('sinfo -h -N -l | grep -c "alloc\|idle\|mix\|drain\|down"')
    ])

    // 解析Slurm节点信息
    let cpuCores = 2
    let totalMemory = '2G'
    let gpuCards = 0
    
    if (slurmNodesOutput.status === 'fulfilled') {
      const output = (slurmNodesOutput.value.stdout || '').trim()
      if (output && output !== '') {
        const nodeLines = output.split('\n').filter(line => !line.includes('NODELIST'))
        
        let totalCpuCores = 0
        let totalMemoryGB = 0
        let totalGPUs = 0
        
        // 解析每个节点的资源信息
        nodeLines.forEach(line => {
          const [name, memory, cpuInfo, gres, state] = line.split(/\s+/)
          
          // 解析CPU信息 (格式: 已分配/空闲/其他/总数)
          if (cpuInfo) {
            const cpuParts = cpuInfo.split('/')
            if (cpuParts.length >= 4) {
              const cpuTotal = parseInt(cpuParts[3]) || 0
              totalCpuCores += cpuTotal
            }
          }
          
          // 解析内存 (GB)
          const nodeMemory = parseInt(memory) || 0
          totalMemoryGB += nodeMemory
          
          // 解析GPU资源 (GRES格式: gpu:type:count 或 (null))
          if (gres && gres !== '(null)') {
            const gpuMatch = gres.match(/gpu:[^:]*:(\d+)/)
            if (gpuMatch) {
              const gpuCount = parseInt(gpuMatch[1]) || 0
              totalGPUs += gpuCount
            }
          }
        })
        
        cpuCores = totalCpuCores > 0 ? totalCpuCores : 2
        totalMemory = `${totalMemoryGB}G`
        gpuCards = totalGPUs
      }
    }
    
    // 如果Slurm命令失败，使用默认值
    if (cpuCores <= 0) {
      cpuCores = 2
    }

    // 解析存储信息
    let sharedStorage = '0G'
    if (storageOutput.status === 'fulfilled') {
      const output = (storageOutput.value.stdout || '').trim()
      if (output && output !== '') {
        sharedStorage = output
      } else {
        console.warn(`存储路径 ${sharedStoragePath} 查询结果为空，使用默认值`)
        sharedStorage = '0G'
      }
    } else {
      console.warn(`查询存储路径 ${sharedStoragePath} 失败，使用默认值`)
      sharedStorage = '0G'
    }

    // 解析计算节点数
    let computeNodes = 2
    if (sinfoOutput.status === 'fulfilled') {
      computeNodes = parseInt((sinfoOutput.value.stdout || '').trim()) || 2
    }

    // 计算峰值算力
    const peakComputePower = `${cpuCores * 2.5} TFLOPS`

    // 获取系统信息
    const [hostname, osVersion, kernelVersion, uptime, loadAverage] = await Promise.allSettled([
      execAsync('hostname'),
      execAsync('cat /etc/os-release | grep PRETTY_NAME | cut -d\\" -f2'),
      execAsync('uname -r'),
      execAsync('uptime -p'),
      execAsync('cat /proc/loadavg | awk \'{print $1, $2, $3}\'')
    ])

    const systemInfo = {
      hostname: hostname.status === 'fulfilled' ? (hostname.value.stdout || '').trim() || 'unknown' : 'unknown',
      osVersion: osVersion.status === 'fulfilled' ? (osVersion.value.stdout || '').trim() || 'Unknown' : 'Unknown',
      kernelVersion: kernelVersion.status === 'fulfilled' ? (kernelVersion.value.stdout || '').trim() || 'Unknown' : 'Unknown',
      uptime: uptime.status === 'fulfilled' ? (uptime.value.stdout || '').trim() || 'Unknown' : 'Unknown',
      loadAverage: loadAverage.status === 'fulfilled' ? (loadAverage.value.stdout || '').trim() || '0.00 0.00 0.00' : '0.00 0.00 0.00'
    }

    const hardwareResources = {
      computeNodes,
      cpuCores,
      totalMemory,
      gpuCards,
      sharedStorage,
      peakComputePower
    }

    return NextResponse.json({
      success: true,
      data: {
        hardwareResources,
        systemInfo
      }
    })
    
  } catch (error) {
    console.error('获取系统信息失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: '获取系统信息失败' 
    })
  }
} 