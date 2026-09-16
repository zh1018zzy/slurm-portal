import { createClient } from '@supabase/supabase-js'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

// 获取动态的noVNC网关地址
function getNovncGateway(): string {
  // 1. 优先使用环境变量
  if (process.env.NOVNC_GATEWAY && process.env.NOVNC_GATEWAY !== 'localhost') {
    return process.env.NOVNC_GATEWAY
  }
  
  // 2. 使用默认VNC节点IP
  if (process.env.DEFAULT_VNC_NODE_IP) {
    return process.env.DEFAULT_VNC_NODE_IP
  }
  
  // 3. 回退到配置文件中的默认值
  try {
    const fs = require('fs')
    const path = require('path')
    const configPath = path.join(process.cwd(), 'config', 'node-ip-map.json')
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (config.default) {
        return config.default
      }
      if (config.nodes && config.nodes['*']) {
        return config.nodes['*']
      }
    }
  } catch (error) {
    console.warn('[VNC Manager] 获取默认网关失败:', error)
  }
  
  // 4. 最后回退到localhost（仅用于开发环境）
  return 'localhost'
}

// VNC 配置
const VNC_CONFIG = {
  DEFAULT_GEOMETRY: '1920x1080',
  SECURITY_TYPE: 'None',
  DISPLAY_RANGE: [101, 999],
  NOVNC_GATEWAY: getNovncGateway(),
  TURBO_VNC_PATH: process.env.TURBO_VNC_PATH || '/opt/TurboVNC/bin/',
  NOVNC_PORT: process.env.NOVNC_PORT || '6080'
}

// 动态获取节点IP映射
async function getNodeIpMap(): Promise<Record<string, string>> {
  // 只使用环境变量，简化IP映射逻辑
  const nodeIpEnv = process.env.NODE_IP_MAP
  if (nodeIpEnv) {
    try {
      return JSON.parse(nodeIpEnv)
    } catch (error) {
      console.warn('[VNC Manager] 解析NODE_IP_MAP环境变量失败:', error)
    }
  }
  
  // 如果没有配置NODE_IP_MAP，使用DEFAULT_VNC_NODE_IP作为默认值
  const defaultVncNodeIpEnv = process.env.DEFAULT_VNC_NODE_IP
  if (defaultVncNodeIpEnv) {
    return {
      'localhost': defaultVncNodeIpEnv,
      '*': defaultVncNodeIpEnv
    }
  }
  
  // 最后的回退：使用localhost
  console.warn('[VNC Manager] 未配置NODE_IP_MAP或DEFAULT_VNC_NODE_IP，使用localhost')
  return {
    'localhost': 'localhost',
    '*': 'localhost'
  }
}

// 获取节点IP地址
async function getNodeIp(hostname: string): Promise<string> {
  const nodeMap = await getNodeIpMap()
  
  // 直接匹配
  if (nodeMap[hostname]) {
    return nodeMap[hostname]
  }
  
  // 通配符匹配
  if (nodeMap['*']) {
    return nodeMap['*']
  }
  
  // 最后回退到hostname本身
  return hostname
}

// 调试：输出 noVNC 配置信息

// 获取下一个可用的 display 号 - 改进版本，支持端口回收、实时检查和冲突重试
export async function getNextDisplay(): Promise<number> {
  try {
    // 1. 获取活跃作业使用的display号
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('params')
      .in('status', ['PENDING', 'RUNNING'])
      .eq('scheduler_type', 'slurm')
    
    const activeDisplays: number[] = []
    if (activeJobs) {
      for (const job of activeJobs) {
        if (job.params && job.params.vncDisplay) {
          activeDisplays.push(job.params.vncDisplay)
        }
      }
    }
    
    // 2. 清理已结束作业的VNC记录
    await cleanupFinishedVncSessions()
    
    // 3. 实时检查compute-node-01节点上的端口占用情况
    const occupiedDisplays = await checkVtdevOccupiedDisplays()
    
    // 4. 合并所有被占用的display号
    const allOccupiedDisplays = Array.from(new Set([...activeDisplays, ...occupiedDisplays]))
    
    // 5. 寻找最小可用的display号（优先复用低号码）
    for (let display = VNC_CONFIG.DISPLAY_RANGE[0]; display <= VNC_CONFIG.DISPLAY_RANGE[1]; display++) {
      if (!allOccupiedDisplays.includes(display)) {
        // 额外检查：验证端口是否真的可用（避免非VNC程序占用）
        const isPortAvailable = await verifyPortAvailability(display)
        if (isPortAvailable) {
          return display
        } else {
          console.log(`[getNextDisplay] Display ${display} 端口被非VNC程序占用，跳过`)
          // 标记为占用，继续寻找下一个
          allOccupiedDisplays.push(display)
        }
      }
    }
    
    // 6. 如果没有可用display，说明系统负载过高
    console.error('[getNextDisplay] 没有可用的Display号，当前被占用:', allOccupiedDisplays.length)
    throw new Error(`VNC Display号已耗尽，当前有${allOccupiedDisplays.length}个被占用的VNC会话，请稍后重试`)
    
  } catch (error) {
    console.error('获取display失败:', error)
    // 在出错时仍返回一个相对安全的display号
    return VNC_CONFIG.DISPLAY_RANGE[0]
  }
}

// 清理已结束作业的VNC记录
async function cleanupFinishedVncSessions(): Promise<void> {
  try {
    // 获取所有已结束的VNC作业
    const { data: finishedJobs } = await supabase
      .from('jobs')
      .select('job_id, params, nodes')
      .in('status', ['COMPLETED', 'FAILED', 'CANCELLED'])
      .not('params->vncDisplay', 'is', null)
      .eq('scheduler_type', 'slurm')
      .order('end_time', { ascending: false })
      .limit(100) // 只处理最近的100个已结束作业
    
    if (!finishedJobs || finishedJobs.length === 0) {
      return
    }
    
    
    // 并发清理VNC会话资源（但不删除数据库记录，仅清理VNC进程）
    const cleanupPromises = finishedJobs.map(async (job: any) => {
      try {
        const vncDisplay = job.params?.vncDisplay
        const nodes = job.nodes ? job.nodes.split(',') : []
        
        if (vncDisplay && nodes.length > 0) {
          // 尝试清理VNC进程（如果还在运行的话）
          await cleanupVncSession('system', vncDisplay, nodes[0])
        }
      } catch (error) {
        // 清理单个VNC会话失败不影响整体流程
        console.warn(`清理VNC会话失败 (job ${job.job_id}):`, error)
      }
    })
    
    await Promise.allSettled(cleanupPromises)
    
  } catch (error) {
    console.warn('[cleanupFinishedVncSessions] 批量清理VNC会话失败:', error)
    // 清理失败不影响display分配流程
  }
}

// display 号转 VNC 端口
export function displayToVncPort(display: number): number {
  return 5900 + display
}

// 生成 VNC 脚本
export function generateVncScript(options: {
  display: number
  appCommand?: string
  userId: string
  geometry?: string
}): string {
  const { display, appCommand, userId, geometry = VNC_CONFIG.DEFAULT_GEOMETRY } = options
  
  return `#!/bin/bash
#SBATCH --job-name=vnc-desktop-${display}
#SBATCH --partition=graphics
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=2
#SBATCH --time=04:00:00
#SBATCH --export=ALL

# 日志路径由 sbatch -o/-e 参数指定，脚本内不再写 #SBATCH --output/--error

# 设置环境变量
export APP_ROOT="${process.cwd()}"
export PATH=$PATH:${VNC_CONFIG.TURBO_VNC_PATH}
export DISPLAY=:${display}
export VNC_PORT=$((5900 + ${display}))
export NOVNC_GATEWAY="${VNC_CONFIG.NOVNC_GATEWAY}"
export NOVNC_PORT="${VNC_CONFIG.NOVNC_PORT}"
export TURBO_VNC_PATH="${VNC_CONFIG.TURBO_VNC_PATH}"

# 创建用户目录
mkdir -p /home/${userId}/.vnc
mkdir -p /home/${userId}/.config

# 端口预检查函数 - 智能版本，支持端口跳过
check_port_availability() {
  local display_num=\$1
  local port=\$((5900 + display_num))
  
  echo "检查端口可用性: display :\${display_num}, port \${port}"
  
  # 检查X锁文件
  if [ -f "/tmp/.X\${display_num}-lock" ]; then
    echo "错误: X锁文件 /tmp/.X\${display_num}-lock 已存在"
    return 1
  fi
  
  # 检查X11 socket文件
  if [ -S "/tmp/.X11-unix/X\${display_num}" ]; then
    echo "错误: X11 socket /tmp/.X11-unix/X\${display_num} 已存在"
    return 1
  fi
  
  # 检查端口占用 - 区分VNC和非VNC程序
  local port_occupied=false
  local process_info=""
  
  if netstat -tlnp 2>/dev/null | grep -q ":\${port} "; then
    port_occupied=true
    process_info=$(netstat -tlnp 2>/dev/null | grep ":\${port} " | head -1)
    echo "警告: 端口 \${port} 已被占用: \${process_info}"
  fi
  
  # 检查VNC进程
  if pgrep -f "vncserver.*:\${display_num}" > /dev/null; then
    echo "错误: VNC进程 display :\${display_num} 正在运行"
    return 1
  fi
  
  # 如果端口被非VNC程序占用，标记为需要跳过
  if [ "\${port_occupied}" = "true" ]; then
    # 尝试识别占用进程
    local pid=$(echo "\${process_info}" | awk '{print \$7}' | cut -d'/' -f1)
    if [ -n "\${pid}" ] && [ "\${pid}" != "-" ]; then
      local process_name=$(ps -p "\${pid}" -o comm= 2>/dev/null || echo "未知")
      echo "占用进程PID: \${pid}, 名称: \${process_name}"
      
      # 检查是否是VNC相关进程
      if echo "\${process_name}" | grep -q "vnc\|Xvnc\|TurboVNC"; then
        echo "错误: 端口 \${port} 被VNC程序占用"
        return 1
      else
        echo "信息: 端口 \${port} 被非VNC程序占用，标记为跳过"
        echo "建议: 系统将自动选择下一个可用端口"
        return 2  # 特殊状态码：端口被非VNC程序占用，需要跳过
      fi
    fi
  fi
  
  echo "端口检查通过: display :\${display_num}, port \${port}"
  return 0
}

# 清理残留进程和文件
cleanup_existing_vnc() {
  local display_num=\$1
  
  echo "清理残留的VNC资源: display :\${display_num}"
  
  # 终止VNC进程
  \${TURBO_VNC_PATH}vncserver -kill :\${display_num} 2>/dev/null || true
  
  # 清理锁文件
  rm -f /tmp/.X\${display_num}-lock 2>/dev/null || true
  
  # 清理socket文件
  rm -f /tmp/.X11-unix/X\${display_num} 2>/dev/null || true
  
  # 等待进程完全终止
  sleep 2
  
  # 再次检查是否清理成功
  if pgrep -f "vncserver.*:\${display_num}" > /dev/null; then
    echo "警告: VNC进程仍在运行，尝试强制终止"
    pkill -9 -f "vncserver.*:\${display_num}" 2>/dev/null || true
    sleep 1
  fi
}

# 执行端口预检查
local check_result
check_port_availability ${display}
check_result=\$?

if [ \$check_result -eq 1 ]; then
  echo "端口 ${display} 不可用，尝试清理后重试..."
  cleanup_existing_vnc ${display}
  
  # 再次检查
  check_port_availability ${display}
  check_result=\$?
  
  if [ \$check_result -eq 1 ]; then
    echo "错误: 端口 ${display} 仍然不可用，无法启动VNC服务器"
    exit 1
  elif [ \$check_result -eq 2 ]; then
    echo "错误: 端口 ${display} 被非VNC程序占用，无法清理"
    echo "建议: 请联系系统管理员或选择其他端口"
    exit 1
  fi
elif [ \$check_result -eq 2 ]; then
  echo "端口 ${display} 被非VNC程序占用，请求系统分配下一个端口"
  echo "当前端口信息: display :${display}, port $((5900 + ${display}))"
  echo "占用进程详情已记录，系统将自动选择下一个可用端口"
  exit 2  # 特殊退出码：请求下一个端口
fi

# 定义清理函数
cleanup_vnc() {
  echo "正在清理VNC会话: display :${display}"
  ${VNC_CONFIG.TURBO_VNC_PATH}vncserver -kill :${display} 2>/dev/null || true
  rm -rf /tmp/.X11-unix/X${display} 2>/dev/null || true
  rm -rf /tmp/.X${display}-lock 2>/dev/null || true
  exit 0
}

# 设置信号处理，确保作业取消时清理VNC
trap cleanup_vnc SIGTERM SIGINT

# 启动 TurboVNC Server
${VNC_CONFIG.TURBO_VNC_PATH}vncserver :${display} -geometry ${geometry} -SecurityTypes ${VNC_CONFIG.SECURITY_TYPE}

# 等待 VNC 服务器启动
sleep 5

# 启动应用程序
if [ -n "${appCommand}" ]; then
  export DISPLAY=:${display}
  # 延迟启动应用，确保VNC服务器完全启动
  sleep 2
  ${appCommand} &
fi

echo "VNC Server started on $HOSTNAME:$VNC_PORT (display :${display})"

# 动态获取节点IP地址
get_node_ip() {
  # 方法1: 优先使用DEFAULT_VNC_NODE_IP环境变量（VNC运行节点的IP）
  if [ -n "$DEFAULT_VNC_NODE_IP" ]; then
    echo "$DEFAULT_VNC_NODE_IP"
    return
  fi
  
  # 方法2: 从环境变量获取
  if [ -n "$NODE_IP" ]; then
    echo "$NODE_IP"
    return
  fi
  
  # 方法3: 从hostname获取（当前节点的IP）
  local hostname_ips=$(hostname -I 2>/dev/null)
  if [ -n "$hostname_ips" ]; then
    # 选择第一个非回环IP
    for ip in $hostname_ips; do
      if [[ ! "$ip" =~ ^127\. ]] && [[ ! "$ip" =~ ^::1 ]]; then
        echo "$ip"
        return
      fi
    done
  fi
  
  # 方法4: 从配置文件获取（路径由 Node 侧注入项目根目录）
  if [ -f "${APP_ROOT}/config/node-ip-map.json" ]; then
    local node_ip=$(grep -o '"default"[[:space:]]*:[[:space:]]*"[^"]*"' "${APP_ROOT}/config/node-ip-map.json" | cut -d'"' -f4)
    if [ -n "$node_ip" ] && [ "$node_ip" != "null" ]; then
      echo "$node_ip"
      return
    fi
  fi
  
  # 方法5: 使用NOVNC_GATEWAY作为最后回退（不推荐，但保持兼容性）
  if [ -n "$NOVNC_GATEWAY" ] && [ "$NOVNC_GATEWAY" != "localhost" ]; then
    echo "$NOVNC_GATEWAY"
    return
  fi
  
  # 方法6: 使用默认回退IP
  echo "localhost"
}

NODE_IP=$(get_node_ip)
echo "Node IP: $NODE_IP"
echo "Web access: http://$NODE_IP:\${NOVNC_PORT}/vnc.html?host=$NODE_IP&port=$VNC_PORT"

# 保持脚本运行
tail -f /dev/null
`
}

// 生成 VNC 访问 URL - 动态获取IP地址
export async function generateVncUrl(hostname: string, port: number): Promise<string> {
  try {
    // 动态获取节点IP地址
    const nodeIp = await getNodeIp(hostname)
    const url = `http://${VNC_CONFIG.NOVNC_GATEWAY}:${VNC_CONFIG.NOVNC_PORT}/vnc.html?host=${nodeIp}&port=${port}`
    return url
  } catch (error) {
    console.error(`[VNC Manager] 生成VNC URL失败:`, error)
    // 回退到使用hostname
    return `http://${VNC_CONFIG.NOVNC_GATEWAY}:${VNC_CONFIG.NOVNC_PORT}/vnc.html?host=${hostname}&port=${port}`
  }
}

// 清理 VNC 会话 - 简化版本，主要清理由VNC脚本的信号处理完成
export async function cleanupVncSession(userId: string, display: number, nodeName?: string): Promise<void> {
  try {
    if (!nodeName) {
      return
    }
    
    // 通过 SSH 在指定节点上执行清理命令（备用方案）
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)
    
    const cleanupCommand = `export PATH=$PATH:${VNC_CONFIG.TURBO_VNC_PATH}; ${VNC_CONFIG.TURBO_VNC_PATH}vncserver -kill :${display} 2>/dev/null || true; rm -rf /tmp/.X11-unix/X${display} 2>/dev/null || true; rm -rf /tmp/.X${display}-lock 2>/dev/null || true; echo "VNC会话清理完成: display :${display}"`
    
    await execFileAsync('ssh', [
      nodeName,
      cleanupCommand
    ])
    
  } catch (error) {
    // 忽略清理失败，主要的清理工作由VNC脚本的信号处理完成
  }
}

// 检查VNC节点上实际占用的display号
async function checkVtdevOccupiedDisplays(): Promise<number[]> {
  try {
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)
    
    // 使用DEFAULT_VNC_NODE_IP环境变量获取VNC节点IP
    const vncNodeIp = process.env.DEFAULT_VNC_NODE_IP || 'localhost'
    console.log(`[checkVtdevOccupiedDisplays] 检查VNC节点: ${vncNodeIp}`)
    
    // 检查X锁文件
    const { stdout: lockFiles } = await execFileAsync('ssh', [vncNodeIp, 'ls', '/tmp/.X*-lock', '2>/dev/null || true'])
    
    const occupiedDisplays: number[] = []
    
    if (lockFiles.trim()) {
      const lines = lockFiles.trim().split('\n')
      for (const line of lines) {
        const match = line.match(/\/tmp\/\.X(\d+)-lock/)
        if (match) {
          const display = parseInt(match[1])
          // 跳过系统显示X0
          if (display !== 0) {
            occupiedDisplays.push(display)
          }
        }
      }
    }
    
    // 检查X11 socket文件
    const { stdout: socketFiles } = await execFileAsync('ssh', [vncNodeIp, 'ls', '/tmp/.X11-unix/X*', '2>/dev/null || true'])
    
    if (socketFiles.trim()) {
      const lines = socketFiles.trim().split('\n')
      for (const line of lines) {
        const match = line.match(/\/tmp\/\.X11-unix\/X(\d+)/)
        if (match) {
          const display = parseInt(match[1])
          // 跳过系统显示X0
          if (display !== 0 && !occupiedDisplays.includes(display)) {
            occupiedDisplays.push(display)
          }
        }
      }
    }
    
    // 检查VNC端口占用
    const { stdout: vncPorts } = await execFileAsync('ssh', [vncNodeIp, 'netstat', '-tlnp', '2>/dev/null | grep ":59" || true'])
    
    if (vncPorts.trim()) {
      const lines = vncPorts.trim().split('\n')
      for (const line of lines) {
        const match = line.match(/:59(\d+)/)
        if (match) {
          const port = parseInt(match[1])
          const display = port - 5900
          if (display >= VNC_CONFIG.DISPLAY_RANGE[0] && display <= VNC_CONFIG.DISPLAY_RANGE[1] && !occupiedDisplays.includes(display)) {
            occupiedDisplays.push(display)
          }
        }
      }
    }
    
    return occupiedDisplays
    
  } catch (error) {
    const vncNodeIp = process.env.DEFAULT_VNC_NODE_IP || 'localhost'
    console.warn(`[checkVtdevOccupiedDisplays] 检查VNC节点 ${vncNodeIp} 端口占用失败:`, error)
    return []
  }
}

// 验证端口是否可用
async function verifyPortAvailability(display: number): Promise<boolean> {
  try {
    const { execFile } = await import('child_process')
    const { promisify } = await import('util')
    const execFileAsync = promisify(execFile)
    
    const port = displayToVncPort(display)
    const vncNodeIp = process.env.DEFAULT_VNC_NODE_IP || 'localhost'
    
    // 检查X锁文件
    try {
      await execFileAsync('ssh', [vncNodeIp, 'test', '-f', `/tmp/.X${display}-lock`])
      console.log(`[verifyPortAvailability] Display ${display} 锁文件存在`)
      return false
    } catch {
      // 锁文件不存在，继续检查
    }

    // 检查X11 socket文件
    try {
      await execFileAsync('ssh', [vncNodeIp, 'test', '-S', `/tmp/.X11-unix/X${display}`])
      console.log(`[verifyPortAvailability] Display ${display} socket文件存在`)
      return false
    } catch {
      // socket文件不存在，继续检查
    }

    // 检查端口占用
    try {
      const { stdout: portCheck } = await execFileAsync('ssh', [vncNodeIp, 'netstat', '-tlnp', '2>/dev/null', '|', 'grep', `:${port} `])
      if (portCheck.trim() !== '') {
        console.log(`[verifyPortAvailability] Display ${display} 端口 ${port} 被占用`)
        return false
      }
    } catch {
      // 端口检查失败，假设端口可用
    }

    // 检查VNC进程
    try {
      const { stdout: vncCheck } = await execFileAsync('ssh', [vncNodeIp, 'pgrep', '-f', `vncserver.*:${display}`])
      if (vncCheck.trim() !== '') {
        console.log(`[verifyPortAvailability] Display ${display} VNC进程正在运行`)
        return false
      }
    } catch {
      // 进程检查失败，假设没有VNC进程
    }

    console.log(`[verifyPortAvailability] Display ${display} 端口可用`)
    return true
    
  } catch (error) {
    console.warn(`[verifyPortAvailability] 验证端口 ${display} 可用性失败:`, error)
    // 检查失败时，保守地返回false，避免端口冲突
    return false
  }
}

// 导出配置信息，供其他模块使用
export { VNC_CONFIG, getNodeIp, getNodeIpMap }