#!/usr/bin/env node

// 加载环境变量 - 优先加载.env，然后加载.env.local
require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })

const { createServer } = require('http')
const { Server } = require('socket.io')
const pty = require('node-pty')
const jwt = require('jsonwebtoken')

// 配置
const PORT = process.env.WEBSHELL_PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'slurm-portal-dev-secret'

// 存储活跃会话
const activeSessions = new Map()

// 创建 HTTP 服务器
const server = createServer()

// 创建 Socket.IO 服务器（允许同源反代与多入口域名）
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => callback(null, true),
    methods: ['GET', 'POST'],
    credentials: true
  },
  allowEIO3: true
})

// JWT 验证函数
function verifyJwt(token) {
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    return null
  }
}

// 认证中间件
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('未提供认证令牌'))
    }

    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return next(new Error('无效的认证令牌'))
    }

    socket.data.user = userInfo
    next()
  } catch (error) {
    console.error('WebShell认证失败:', error)
    next(new Error('认证失败'))
  }
})

// 连接处理
io.on('connection', (socket) => {
  const user = socket.data.user
  const sessionId = `${user.username}-${Date.now()}`
  

  // 创建伪终端：以登录会话切入目标用户（走 PAM，继承 LDAP/NSS 身份）
  // 动态获取用户主目录（优先 NSS/LDAP）
  let userHome = `/home/${user.username}`
  try {
    const { execSync } = require('child_process')
    const pwHome = execSync(`getent passwd ${user.username} | cut -d: -f6`, {
      encoding: 'utf8',
      timeout: 5000
    }).trim()
    if (pwHome) userHome = pwHome
  } catch (error) {
    try {
      const { execSync } = require('child_process')
      userHome = execSync(`eval echo ~${user.username}`).toString().trim()
    } catch (e) {
      console.warn(`无法获取用户 ${user.username} 主目录，使用默认值:`, e)
    }
  }

  // 解析用户登录 shell
  let userShell = '/bin/bash'
  try {
    const { execSync } = require('child_process')
    const sh = execSync(`getent passwd ${user.username} | cut -d: -f7`, {
      encoding: 'utf8',
      timeout: 5000
    }).trim()
    if (sh) userShell = sh
  } catch (_) {
    // keep default
  }
  
  // 保留 PATH，否则 node-pty/execvp 找不到 runuser
  const env = { ...process.env }
  env.TERM = 'xterm-256color'
  env.USER = user.username
  env.LOGNAME = user.username
  env.HOME = userHome
  env.SHELL = userShell
  env.PATH = process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
  env.LANG = process.env.LANG || 'en_US.UTF-8'
  env.LC_ALL = process.env.LC_ALL || env.LANG
  
  // 尝试切换到用户目录
  let cwd = userHome
  try {
    const fs = require('fs')
    if (!fs.existsSync(cwd)) {
      cwd = '/tmp'
    }
  } catch (error) {
    cwd = '/tmp'
  }

  // 使用绝对路径，避免 PATH 异常时 execvp 失败
  const runuserBin = ['/sbin/runuser', '/usr/sbin/runuser'].find((p) => {
    try { return require('fs').existsSync(p) } catch { return false }
  }) || 'runuser'
  
  // -u + login shell：不依赖 runuser -l 的参数组合，兼容性更好
  const ptyProcess = pty.spawn(runuserBin, ['-u', user.username, '--', userShell, '-l'], {
    name: 'xterm-256color',
    cols: 80,
    rows: 30,
    cwd: cwd,
    env: env
  })

  console.log(`[WebShell] session ${sessionId} user=${user.username} home=${userHome} shell=${userShell}`)

  // 存储会话信息
  activeSessions.set(sessionId, {
    pty: ptyProcess,
    socket: socket,
    userId: user.username,
    startTime: Date.now()
  })

  // 处理终端输出
  ptyProcess.onData((data) => {
    socket.emit('data', data)
  })

  // 处理终端输入
  socket.on('input', (data) => {
    ptyProcess.write(data)
  })

  // 处理终端大小调整
  socket.on('resize', (dims) => {
    // 验证尺寸参数
    const cols = Math.max(1, Math.min(200, dims.cols || 80))
    const rows = Math.max(1, Math.min(100, dims.rows || 24))
    
    try {
      ptyProcess.resize(cols, rows)
    } catch (error) {
      // 静默处理终端大小调整错误
    }
  })

  // 获取会话信息
  socket.on('get-session-info', () => {
    const session = activeSessions.get(sessionId)
    if (session) {
      const sessionTime = Math.floor((Date.now() - session.startTime) / 1000)
      socket.emit('session-info', {
        sessionId,
        startTime: session.startTime,
        sessionTime,
        timeRemaining: 3600
      })
    }
  })

  // 处理粘贴操作
  socket.on('paste', (content) => {
    ptyProcess.write(content)
  })

  // 处理断开连接
  socket.on('disconnect', () => {
    
    const session = activeSessions.get(sessionId)
    if (session) {
      session.pty.kill()
      activeSessions.delete(sessionId)
    }
  })

  // 处理错误
  socket.on('error', (error) => {
    console.error(`WebShell错误: 用户 ${user.username}`, error)
  })
})

// 定期清理过期会话
setInterval(() => {
  const now = Date.now()
  for (const [sessionId, session] of activeSessions.entries()) {
    const sessionTime = now - session.startTime
    const maxSessionTime = 4 * 60 * 60 * 1000 // 4小时
    
    if (sessionTime > maxSessionTime) {
      session.pty.kill()
      session.socket.disconnect()
      activeSessions.delete(sessionId)
    }
  }
}, 60000) // 每分钟检查一次

// 启动服务器（显式绑定 0.0.0.0，避免仅本地可达）
const HOST = process.env.WEBSHELL_HOST || '0.0.0.0'
server.listen(PORT, HOST, () => {
  console.log(`WebShell 服务器已启动，监听 ${HOST}:${PORT}`)
})

// 优雅关闭
process.on('SIGINT', () => {
  for (const [sessionId, session] of activeSessions.entries()) {
    session.pty.kill()
    session.socket.disconnect()
  }
  server.close(() => {
    process.exit(0)
  })
}) 