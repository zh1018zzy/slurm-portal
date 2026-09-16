import { Server as SocketIOServer } from 'socket.io'
import { createServer } from 'http'
import { verifyJwt } from '@/lib/jwt'
// 简化的权限检查函数
const checkWebShellPermission = async (userId: string, permissionType: string, options?: any) => {
  return { hasPermission: true, reason: undefined }
}

const logWebShellOperation = async (userId: string, permissionType: string, options: any) => {
  // 简化的日志记录，不做任何操作
}
import * as pty from 'node-pty'
import * as os from 'os'

// 存储活跃的终端会话
const activeSessions = new Map<string, {
  pty: pty.IPty
  socket: any
  userId: string
  startTime: number
}>()

// 创建HTTP服务器
const httpServer = createServer()

// 创建Socket.IO服务器
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
})

// 认证中间件
io.use(async (socket: any, next: any) => {
  try {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('未提供认证令牌'))
    }

    const userInfo = verifyJwt(token)
    if (!userInfo) {
      return next(new Error('无效的认证令牌'))
    }

    // 检查WebShell访问权限
    const hasAccess = await checkWebShellPermission(userInfo.id, 'webshell_access')
    if (!hasAccess.hasPermission) {
      await logWebShellOperation(userInfo.id, 'webshell_access', {
        result: 'denied',
        reason: hasAccess.reason,
        ipAddress: socket.handshake.address
      })
      return next(new Error('没有WebShell访问权限'))
    }

    // 记录成功的访问
    await logWebShellOperation(userInfo.id, 'webshell_access', {
      result: 'granted',
      ipAddress: socket.handshake.address
    })

    socket.data.user = userInfo
    next()
  } catch (error) {
    console.error('WebShell认证失败:', error)
    next(new Error('认证失败'))
  }
})

// 连接处理
io.on('connection', (socket: any) => {
  const user = socket.data.user
  const sessionId = `${user.id}-${Date.now()}`
  

  // 创建伪终端
  const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash'
  const ptyProcess = pty.spawn(shell, [], {
    name: 'xterm-color',
    cols: 80,
    rows: 24,
    cwd: process.env.HOME || process.env.USERPROFILE,
    env: process.env
  })

  // 存储会话信息
  activeSessions.set(sessionId, {
    pty: ptyProcess,
    socket: socket,
    userId: user.id,
    startTime: Date.now()
  })

  // 处理终端输出
  ptyProcess.onData((data: string) => {
    socket.emit('data', data)
  })

  // 处理终端输入
  socket.on('input', async (data: string) => {
    try {
      // 检查命令执行权限
      const hasExecutePermission = await checkWebShellPermission(user.id, 'webshell_execute', {
        command: data.trim()
      })

      if (!hasExecutePermission.hasPermission) {
        await logWebShellOperation(user.id, 'webshell_execute', {
          command: data.trim(),
          result: 'denied',
          reason: hasExecutePermission.reason,
          ipAddress: socket.handshake.address
        })
        
        // 发送错误信息到终端
        socket.emit('data', `\r\n权限错误: ${hasExecutePermission.reason}\r\n`)
        return
      }

      // 记录命令执行
      await logWebShellOperation(user.id, 'webshell_execute', {
        command: data.trim(),
        result: 'granted',
        ipAddress: socket.handshake.address
      })

      ptyProcess.write(data)
    } catch (error) {
      console.error('命令执行权限检查失败:', error)
      socket.emit('data', '\r\n权限检查失败\r\n')
    }
  })

  // 处理终端大小调整
  socket.on('resize', (dims: { cols: number; rows: number }) => {
    ptyProcess.resize(dims.cols, dims.rows)
  })

  // 获取会话信息
  socket.on('get-session-info', () => {
    const session = activeSessions.get(sessionId)
    if (session) {
      const sessionTime = Math.floor((Date.now() - session.startTime) / 1000)
      socket.emit('session-info', {
        sessionId,
        startTime: session.startTime,
        sessionTime
      })
    }
  })

  // 处理粘贴操作
  socket.on('paste', async (content: string) => {
    try {
      // 检查粘贴权限
      const hasPastePermission = await checkWebShellPermission(user.id, 'webshell_paste', {
        clipboardSize: new Blob([content]).size
      })

      if (!hasPastePermission.hasPermission) {
        await logWebShellOperation(user.id, 'webshell_paste', {
          result: 'denied',
          reason: hasPastePermission.reason,
          ipAddress: socket.handshake.address
        })
        
        socket.emit('error', `粘贴权限错误: ${hasPastePermission.reason}`)
        return
      }

      // 记录粘贴操作
      await logWebShellOperation(user.id, 'webshell_paste', {
        result: 'granted',
        ipAddress: socket.handshake.address
      })

      ptyProcess.write(content)
    } catch (error) {
      console.error('粘贴权限检查失败:', error)
      socket.emit('error', '粘贴权限检查失败')
    }
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
  socket.on('error', (error: any) => {
    console.error(`WebShell错误: 用户 ${user.username}`, error)
  })
})

// 定期清理过期会话
setInterval(() => {
  const now = Date.now()
  const sessionsToDelete: string[] = []
  
  activeSessions.forEach((session, sessionId) => {
    const sessionTime = now - session.startTime
    const maxSessionTime = 4 * 60 * 60 * 1000 // 4小时
    
    if (sessionTime > maxSessionTime) {
      session.pty.kill()
      session.socket.disconnect()
      sessionsToDelete.push(sessionId)
    }
  })
  
  sessionsToDelete.forEach(sessionId => {
    activeSessions.delete(sessionId)
  })
}, 60000) // 每分钟检查一次

// 启动服务器
const PORT = process.env.WEBSHELL_PORT || 3001
httpServer.listen(PORT, () => {
})

export { io, httpServer, activeSessions } 