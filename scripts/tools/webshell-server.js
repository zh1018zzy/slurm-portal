#!/usr/bin/env node

// 加载环境变量 - 优先加载.env，然后加载.env.local
require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })

const { createServer } = require('http')
const { Server } = require('socket.io')
const pty = require('node-pty')
const os = require('os')
const jwt = require('jsonwebtoken')

// 配置
const PORT = process.env.WEBSHELL_PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'slurm-portal-dev-secret'

// 存储活跃会话
const activeSessions = new Map()

// 创建 HTTP 服务器
const server = createServer()

// 创建 Socket.IO 服务器
const io = new Server(server, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
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
  

  // 创建伪终端 - 使用 su 命令切换到正确的用户
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
  
  // 动态获取用户主目录
  let userHome = `/home/${user.username}` // 默认值
  try {
    const { execSync } = require('child_process')
    userHome = execSync(`eval echo ~${user.username}`).toString().trim()
  } catch (error) {
    console.warn(`无法获取用户 ${user.username} 主目录，使用默认值:`, error)
  }
  
  // 设置用户特定的环境变量
  const env = { ...process.env }
  env.USER = user.username
  env.USERNAME = user.username
  env.HOME = userHome
  env.PWD = userHome
  env.LOGNAME = user.username
  env.SHELL = '/bin/bash'
  env.TERM = 'xterm-color'
  env.PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
  env.LANG = 'en_US.UTF-8'
  env.LC_ALL = 'en_US.UTF-8'
  
  // 尝试切换到用户目录
  let cwd = userHome
  try {
    const fs = require('fs')
    if (!fs.existsSync(cwd)) {
      cwd = process.env.HOME || process.env.USERPROFILE || '/tmp'
    }
  } catch (error) {
    cwd = process.env.HOME || process.env.USERPROFILE || '/tmp'
  }
  
  // 使用 runuser 切换到正确的用户（不需要密码）
  const ptyProcess = pty.spawn('runuser', ['-u', user.username, '--', 'bash', '--login'], {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: cwd,
    env: env
  })

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

// 启动服务器
server.listen(PORT, () => {
  console.log(`WebShell 服务器已启动，监听端口 ${PORT}`)
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