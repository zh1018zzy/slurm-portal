import { createClient } from '@supabase/supabase-js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { lookup as dnsLookup } from 'dns/promises'

const execFileAsync = promisify(execFile)

/** SSH 公共参数：短超时，避免 VNC 节点不可达时提交一直卡住 */
const SSH_OPTS = [
  '-o', 'BatchMode=yes',
  '-o', 'ConnectTimeout=3',
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'UserKnownHostsFile=/dev/null',
]

async function sshExec(host: string, remoteCommand: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'ssh',
    [...SSH_OPTS, host, remoteCommand],
    { timeout: 8000, maxBuffer: 2 * 1024 * 1024 }
  )
  return typeof stdout === 'string' ? stdout : String(stdout)
}

// Supabase 客户端
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

let cachedGraphicsNode: string | null | undefined

/** 从 sinfo 发现 graphics 分区首个节点（失败返回 null） */
async function discoverGraphicsNode(): Promise<string | null> {
  if (cachedGraphicsNode !== undefined) return cachedGraphicsNode
  try {
    const { stdout } = await execFileAsync(
      'sinfo',
      ['-p', 'graphics', '-h', '-o', '%N'],
      { timeout: 5000 }
    )
    const first = stdout
      .trim()
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .find(Boolean)
    cachedGraphicsNode = first || null
  } catch {
    cachedGraphicsNode = null
  }
  return cachedGraphicsNode
}

/**
 * 图形节点主机名（SSH / 探测用）
 * 优先级：VNC_NODE → DEFAULT_VNC_NODE_IP → sinfo graphics → localhost
 */
export function getVncNodeHostSync(): string {
  return (
    process.env.VNC_NODE?.trim() ||
    process.env.DEFAULT_VNC_NODE_IP?.trim() ||
    'localhost'
  )
}

export async function getVncNodeHost(): Promise<string> {
  const fromEnv =
    process.env.VNC_NODE?.trim() ||
    process.env.DEFAULT_VNC_NODE_IP?.trim() ||
    ''
  if (fromEnv) return fromEnv
  const discovered = await discoverGraphicsNode()
  return discovered || 'localhost'
}

/** 将主机名解析为 IP；失败则返回主机名本身 */
export async function resolveHostAddress(host: string): Promise<string> {
  if (!host || host === 'localhost' || host === '127.0.0.1') return host
  // 已是 IPv4 字面量则原样返回
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return host
  try {
    const { stdout } = await execFileAsync('getent', ['hosts', host], { timeout: 3000 })
    const ip = stdout.trim().split(/\s+/)[0]
    if (ip) return ip
  } catch {
    // fall through
  }
  try {
    const result = await dnsLookup(host)
    if (result?.address) return result.address
  } catch {
    // fall through
  }
  return host
}

/**
 * 浏览器访问 noVNC 的主机（惰性读取，不在模块加载时固化）
 * 优先级：NOVNC_GATEWAY → 解析 VNC_NODE → NEXT_PUBLIC_BASE_URL hostname → localhost
 */
export async function getNovncGateway(): Promise<string> {
  const explicit = process.env.NOVNC_GATEWAY?.trim()
  if (explicit && explicit !== 'localhost') return explicit

  const node = await getVncNodeHost()
  if (node && node !== 'localhost') {
    return resolveHostAddress(node)
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (base) {
    try {
      return new URL(base).hostname || 'localhost'
    } catch {
      // ignore
    }
  }

  try {
    const fs = require('fs')
    const path = require('path')
    const configPath = path.join(process.cwd(), 'config', 'node-ip-map.json')
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
      if (config.default) return config.default
      if (config.nodes?.['*']) return config.nodes['*']
    }
  } catch (error) {
    console.warn('[VNC Manager] 读取 node-ip-map.json 失败:', error)
  }

  return 'localhost'
}

export function getNovncPort(): string {
  return process.env.NOVNC_PORT || '6080'
}

/** noVNC 的 host= 参数：单节点本机 websockify 默认 localhost，可用 VNC_URL_HOST 覆盖 */
export function getVncUrlHost(): string {
  return process.env.VNC_URL_HOST?.trim() || 'localhost'
}

// VNC 配置（gateway 请用 getNovncGateway()，勿依赖模块加载时快照）
const VNC_CONFIG = {
  DEFAULT_GEOMETRY: '1920x1080',
  SECURITY_TYPE: 'None',
  DISPLAY_RANGE: [101, 999] as [number, number],
  get NOVNC_GATEWAY(): string {
    return (
      process.env.NOVNC_GATEWAY?.trim() ||
      process.env.VNC_NODE?.trim() ||
      process.env.DEFAULT_VNC_NODE_IP?.trim() ||
      'localhost'
    )
  },
  TURBO_VNC_PATH: process.env.TURBO_VNC_PATH || '/opt/TurboVNC/bin/',
  get NOVNC_PORT(): string {
    return getNovncPort()
  },
}

/**
 * 可选 NODE_IP_MAP 覆盖；未配置时不再伪造映射，直接用主机名/DNS
 */
async function getNodeIpMap(): Promise<Record<string, string> | null> {
  const nodeIpEnv = process.env.NODE_IP_MAP
  if (!nodeIpEnv?.trim()) return null
  try {
    return JSON.parse(nodeIpEnv)
  } catch (error) {
    console.warn('[VNC Manager] 解析 NODE_IP_MAP 失败:', error)
    return null
  }
}

/** 解析节点对外地址；优先 NODE_IP_MAP，否则 DNS/hosts */
export async function getNodeIp(hostname: string): Promise<string> {
  const nodeMap = await getNodeIpMap()
  if (nodeMap) {
    if (nodeMap[hostname]) return nodeMap[hostname]
    if (nodeMap['*']) return nodeMap['*']
  }
  return resolveHostAddress(hostname)
}

// 获取下一个可用的 display 号
export async function getNextDisplay(): Promise<number> {
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

  // 2. 清理已结束作业的VNC记录（异步尽力而为，不阻塞选号）
  void cleanupFinishedVncSessions()

  // 3. 一次 SSH：只认 X 锁 / socket（不扫全端口，避免把 Slurm/Redis 等误判为占用）
  const occupiedDisplays = await checkVtdevOccupiedDisplays()

  // 4. 合并所有被占用的display号
  const allOccupied = new Set<number>([...activeDisplays, ...occupiedDisplays])

  // 5. 寻找最小可用 display（最多再 SSH 校验前几个候选，避免 899 次远程调用卡死提交）
  const novncPort = Number(getNovncPort())
  let checked = 0
  for (let display = VNC_CONFIG.DISPLAY_RANGE[0]; display <= VNC_CONFIG.DISPLAY_RANGE[1]; display++) {
    if (allOccupied.has(display)) continue
    const port = displayToVncPort(display)
    if (port === novncPort) continue

    checked += 1
    if (checked <= 5) {
      const ok = await verifyPortAvailability(display)
      if (!ok) {
        allOccupied.add(display)
        continue
      }
    }

    console.log(`[getNextDisplay] 选用 Display ${display} (port ${port})`)
    return display
  }

  console.error('[getNextDisplay] 没有可用的Display号，当前被占用:', allOccupied.size)
  throw new Error(`VNC Display号已耗尽，当前有${allOccupied.size}个被占用的VNC会话，请稍后重试`)
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

# 执行端口预检查（顶层脚本不能用 local）
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

# 启动 TurboVNC Server（xstartup.turbovnc 已会拉起桌面会话）
${VNC_CONFIG.TURBO_VNC_PATH}vncserver :${display} -geometry ${geometry} -SecurityTypes ${VNC_CONFIG.SECURITY_TYPE}

# 等待 VNC 服务器启动
sleep 5

# 启动应用程序：桌面会话由 xstartup 负责，勿再起一份（否则会刷 WM/xsettings 冲突日志）
APP_CMD="${appCommand}"
case "\$APP_CMD" in
  ''|mate-session|gnome-session|startxfce4|xfce4-session|startplasma*|cinnamon-session|lxsession|openbox-session)
    echo "Desktop session handled by TurboVNC xstartup; skip duplicate: \${APP_CMD:-none}"
    ;;
  *)
    export DISPLAY=:${display}
    sleep 2
    \$APP_CMD &
    ;;
esac

echo "VNC Server started on $HOSTNAME:$VNC_PORT (display :${display})"

# 浏览器访问地址：连 noVNC 网关；RFB 由网关侧 websockify 转发到本机 VNC_PORT
GATEWAY="\${NOVNC_GATEWAY:-}"
if [ -z "\$GATEWAY" ] || [ "\$GATEWAY" = "localhost" ]; then
  # 优先 Tailscale/非局域网段，避免选到失效的 192.168.x
  for ip in \$(hostname -I 2>/dev/null); do
    case "\$ip" in
      127.*|::1*) ;;
      192.168.*|10.*|172.1[6-9].*|172.2[0-9].*|172.3[0-1].*) ;;
      *) GATEWAY="\$ip"; break ;;
    esac
  done
  if [ -z "\$GATEWAY" ]; then
    GATEWAY=\$(hostname -I 2>/dev/null | awk '{print \$1}')
  fi
  GATEWAY=\${GATEWAY:-localhost}
fi
echo "Node: \$HOSTNAME  VNC: localhost:\$VNC_PORT"
echo "Web access: http://\$GATEWAY:\${NOVNC_PORT}/vnc.html?host=\$GATEWAY&port=\${NOVNC_PORT}&path=websockify&autoconnect=true&resize=remote"

# 保持脚本运行
tail -f /dev/null
`
}

// 生成 VNC 访问 URL
// 浏览器应连到 noVNC/websockify 网关；RFB 目标由网关侧 websockify 配置（见 ensureNovncProxy）
export async function generateVncUrl(_hostname: string, port: number): Promise<string> {
  try {
    const gateway = await getNovncGateway()
    const novncPort = getNovncPort()
    // host/port 指向网关自身，供 noVNC 建立 WebSocket；不要填 VNC RFB 端口
    return `http://${gateway}:${novncPort}/vnc.html?host=${gateway}&port=${novncPort}&path=websockify&autoconnect=true&resize=remote`
  } catch (error) {
    console.error(`[VNC Manager] 生成VNC URL失败:`, error)
    const gateway =
      process.env.NOVNC_GATEWAY?.trim() ||
      process.env.VNC_NODE?.trim() ||
      'localhost'
    const novncPort = getNovncPort()
    return `http://${gateway}:${novncPort}/vnc.html?host=${gateway}&port=${novncPort}&path=websockify&autoconnect=true&resize=remote`
  }
}

/**
 * 将 noVNC 容器内 websockify 的固定目标切到当前会话 RFB 端口。
 * 必须用 --network host：bridge 模式下容器 localhost 到不了宿主机上的 TurboVNC。
 */
export async function ensureNovncProxy(vncPort: number): Promise<void> {
  const vncNode = await getVncNodeHost()
  const container = process.env.NOVNC_CONTAINER?.trim() || 'novnc-full'
  const image = process.env.NOVNC_IMAGE?.trim() || 'novnc_novnc-full'
  const novncPort = getNovncPort()
  const remote = [
    `PORT=${vncPort}`,
    `NOVNC_PORT=${novncPort}`,
    `CID=$(docker ps -q -f name=^/${container}$ 2>/dev/null || docker ps -q -f name=${container} | head -1)`,
    `IMG=$(docker inspect --format '{{.Config.Image}}' "$CID" 2>/dev/null || echo ${image})`,
    `docker rm -f ${container} >/dev/null 2>&1 || true`,
    `docker run -d --name ${container} --restart=unless-stopped --network host "$IMG" ` +
      `python3 -m websockify --web /usr/share/novnc "$NOVNC_PORT" localhost:"$PORT" >/dev/null`,
    `echo NOVNC_PROXY_OK:$PORT`,
  ].join('; ')

  try {
    const out = await sshExec(vncNode, remote)
    console.log(`[ensureNovncProxy] ${out.trim()}`)
  } catch (error) {
    console.warn(`[ensureNovncProxy] 切换 noVNC 代理到 ${vncPort} 失败:`, error)
  }
}

// 清理 VNC 会话 - 简化版本，主要清理由VNC脚本的信号处理完成
export async function cleanupVncSession(userId: string, display: number, nodeName?: string): Promise<void> {
  try {
    const target = nodeName || (await getVncNodeHost())
    if (!target) return

    const cleanupCommand = `export PATH=$PATH:${VNC_CONFIG.TURBO_VNC_PATH}; ${VNC_CONFIG.TURBO_VNC_PATH}vncserver -kill :${display} 2>/dev/null || true; rm -rf /tmp/.X11-unix/X${display} 2>/dev/null || true; rm -rf /tmp/.X${display}-lock 2>/dev/null || true; echo "VNC会话清理完成: display :${display}"`

    await sshExec(target, cleanupCommand)
  } catch (error) {
    // 忽略清理失败，主要的清理工作由VNC脚本的信号处理完成
  }
}

// 检查VNC节点上实际占用的display号（单次 SSH）
async function checkVtdevOccupiedDisplays(): Promise<number[]> {
  try {
    const vncNode = await getVncNodeHost()
    const [lo, hi] = VNC_CONFIG.DISPLAY_RANGE
    console.log(`[checkVtdevOccupiedDisplays] 检查VNC节点: ${vncNode}`)

    const occupiedDisplays: number[] = []

    // 只认 X 锁与 socket；全量扫监听端口会把 6443/6379/6818 等误判成 display
    const remoteOut = await sshExec(
      vncNode,
      `ls -1 /tmp/.X[0-9]*-lock /tmp/.X11-unix/X[0-9]* 2>/dev/null || true`
    )

    for (const line of remoteOut.split('\n')) {
      const lockMatch = line.match(/\/tmp\/\.X(\d+)-lock/)
      if (lockMatch) {
        const display = parseInt(lockMatch[1], 10)
        if (
          display >= lo &&
          display <= hi &&
          !occupiedDisplays.includes(display)
        ) {
          occupiedDisplays.push(display)
        }
        continue
      }
      const sockMatch = line.match(/\/tmp\/\.X11-unix\/X(\d+)$/)
      if (sockMatch) {
        const display = parseInt(sockMatch[1], 10)
        if (
          display >= lo &&
          display <= hi &&
          !occupiedDisplays.includes(display)
        ) {
          occupiedDisplays.push(display)
        }
      }
    }

    console.log(`[checkVtdevOccupiedDisplays] 占用 display 数: ${occupiedDisplays.length}`)
    return occupiedDisplays
  } catch (error) {
    console.warn(`[checkVtdevOccupiedDisplays] 检查VNC节点端口占用失败:`, error)
    return []
  }
}

// 验证单个 display 是否可用（仅必要时调用；避免 pgrep 自匹配）
async function verifyPortAvailability(display: number): Promise<boolean> {
  try {
    const port = displayToVncPort(display)
    const vncNode = await getVncNodeHost()

    const remoteOut = await sshExec(
      vncNode,
      `if [ -f /tmp/.X${display}-lock ] || [ -S /tmp/.X11-unix/X${display} ]; then echo BUSY_LOCK; fi; ` +
      `(ss -tlnH 2>/dev/null || netstat -tln 2>/dev/null || true) | grep -E ':${port}([^0-9]|$)' >/dev/null && echo BUSY_PORT; true`
    )

    if (remoteOut.includes('BUSY_LOCK') || remoteOut.includes('BUSY_PORT')) {
      console.log(`[verifyPortAvailability] Display ${display} 不可用`)
      return false
    }

    console.log(`[verifyPortAvailability] Display ${display} 端口可用`)
    return true
  } catch (error) {
    console.warn(`[verifyPortAvailability] 验证端口 ${display} 可用性失败:`, error)
    return true
  }
}

// 导出配置信息，供其他模块使用
export { VNC_CONFIG }