'use client'

import { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Terminal as TerminalIcon, RefreshCw, X } from 'lucide-react'
import dynamic from 'next/dynamic'

// 动态导入WebShell专用水印组件，禁用SSR
const WebShellWatermark = dynamic(() => import('@/components/WebShellWatermark'), { 
  ssr: false,
  loading: () => null
})

export default function WebShellTerminal() {
  const { user, token, authLoaded } = useAuth()
  const terminalRef = useRef<HTMLDivElement>(null)
  const terminalInstanceRef = useRef<any>(null)
  const socketRef = useRef<any>(null)
  const contextMenuHandlerRef = useRef<((e: MouseEvent) => boolean) | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  
  // 复制粘贴权限控制
  const [copyPasteEnabled, setCopyPasteEnabled] = useState(true)
  const copyPasteEnabledRef = useRef(true) // 使用ref来跟踪当前值

  // 获取系统设置中的复制粘贴权限
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null

    fetch('/api/system/settings', { headers: token ? { 'Authorization': `Bearer ${token}` } : {} })
      .then(res => res.json())
      .then((data) => {
        const enabled = data.webshellCopyPasteEnabled !== false
        setCopyPasteEnabled(enabled)
        copyPasteEnabledRef.current = enabled
        
        // 如果终端已经初始化，动态更新权限
        if (terminalInstanceRef.current) {
          updateCopyPastePermissions(enabled)
        }
      })
      .catch(() => {
        // 如果获取失败，默认启用
        setCopyPasteEnabled(true)
        copyPasteEnabledRef.current = true
        
        // 如果终端已经初始化，动态更新权限
        if (terminalInstanceRef.current) {
          updateCopyPastePermissions(true)
        }
      })
  }, [])

  // 动态更新复制粘贴权限的函数
  const updateCopyPastePermissions = (enabled: boolean) => {
    if (!terminalInstanceRef.current) return
    
    const terminal = terminalInstanceRef.current
    
    // 更新终端选项
    terminal.options.copyOnSelection = enabled
    terminal.options.pasteOnMiddleClick = enabled
    terminal.options.rightClickSelectsWord = enabled
    
    // 更新键盘事件监听器
    if (enabled) {
      // 启用复制粘贴 - 不设置任何键盘限制，让所有键正常传递
      terminal.onKey(({ key, domEvent }: { key: string; domEvent: Event }) => {
        // 不阻止任何键盘事件，包括功能键
      })
    } else {
      // 禁用复制粘贴 - 只限制复制粘贴快捷键，不处理功能键
      terminal.onKey(({ key, domEvent }: { key: string; domEvent: Event }) => {
        const event = domEvent as KeyboardEvent
        
        // 只禁用复制粘贴快捷键
        if ((event.ctrlKey || event.metaKey) && 
            (key === 'c' || key === 'C' || key === 'v' || key === 'V' || key === 'x' || key === 'X')) {
          event.preventDefault()
          event.stopPropagation()
          return false
        }
        // 其他所有键（包括功能键）都正常传递
      })
    }
    
    // 更新右键菜单
    if (terminalRef.current) {
      // 移除现有的右键菜单监听器
      if (contextMenuHandlerRef.current) {
        try {
          terminalRef.current.removeEventListener('contextmenu', contextMenuHandlerRef.current)
        } catch (error) {
          console.warn('移除右键菜单监听器时出错:', error)
        }
        contextMenuHandlerRef.current = null
      }
      
      if (!enabled) {
        // 添加禁用右键菜单的监听器
        const handleContextMenu = (e: MouseEvent) => {
          e.preventDefault()
          e.stopPropagation()
          return false
        }
        terminalRef.current.addEventListener('contextmenu', handleContextMenu)
        contextMenuHandlerRef.current = handleContextMenu
      }
    }
  }

  // 初始化终端 - 只在认证加载完成后初始化一次
  useEffect(() => {
    if (!authLoaded) {
      return
    }
    if (!user || !token) {
      setConnectionError('缺少用户认证信息，请重新登录')
      return
    }
    if (terminalInstanceRef.current) {
      return
    }
    
    const initTerminal = async () => {
      if (!terminalRef.current) {
        setTimeout(initTerminal, 100)
        return
      }
      try {
        // @ts-ignore
        const { Terminal } = await import('xterm')
        // @ts-ignore
        const { FitAddon } = await import('xterm-addon-fit')
        // @ts-ignore
        await import('xterm/css/xterm.css')
        const terminal = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Consolas, "Courier New", Monaco, Menlo, "Ubuntu Mono", monospace',
          theme: {
            background: '#1e1e1e',
            foreground: '#ffffff',
            cursor: '#ffffff',
            black: '#000000',
            red: '#cd3131',
            green: '#0dbc79',
            yellow: '#e5e510',
            blue: '#2472c8',
            magenta: '#bc3fbc',
            cyan: '#11a8cd',
            white: '#e5e5e5',
            brightBlack: '#666666',
            brightRed: '#f14c4c',
            brightGreen: '#23d18b',
            brightYellow: '#f5f543',
            brightBlue: '#3b8eea',
            brightMagenta: '#d670d6',
            brightCyan: '#29b8db',
            brightWhite: '#ffffff'
          },
          rows: 24,
          cols: 80,
          allowTransparency: false, // Edge兼容性
          rightClickSelectsWord: copyPasteEnabledRef.current,
          fastScrollModifier: 'alt',
          scrollback: 1000, // 增加滚动缓冲区
          // 禁用功能键处理
          allowProposedApi: false,
          // 根据权限设置复制粘贴功能
          ...(copyPasteEnabledRef.current ? {} : {
            copyOnSelection: false,
            pasteOnMiddleClick: false
          })
        })
        const fitAddon = new FitAddon()
        terminal.loadAddon(fitAddon)
        terminal.open(terminalRef.current)
        
        // 根据权限设置键盘事件监听器
        if (!copyPasteEnabledRef.current) {
          terminal.onKey(({ key, domEvent }: { key: string; domEvent: Event }) => {
            const event = domEvent as KeyboardEvent
            
            // 只禁用复制粘贴快捷键
            if ((event.ctrlKey || event.metaKey) && 
                (key === 'c' || key === 'C' || key === 'v' || key === 'V' || key === 'x' || key === 'X')) {
              event.preventDefault()
              event.stopPropagation()
              return false
            }
            // 其他所有键（包括功能键）都正常传递
          })
        }
        
        // 根据权限设置右键菜单
        if (!copyPasteEnabledRef.current && terminalRef.current) {
          const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            return false
          }
          terminalRef.current.addEventListener('contextmenu', handleContextMenu)
          contextMenuHandlerRef.current = handleContextMenu
        }
        
        setTimeout(() => {
          fitAddon.fit()
          if (terminalRef.current) {
            terminalRef.current.scrollTop = 0
            terminalRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }, 100)
        terminalInstanceRef.current = terminal

        // 添加终端输入处理
        terminal.onData((data: string) => {
          if (socketRef.current && socketRef.current.connected) {
            socketRef.current.emit('input', data)
          }
        })

        // 添加键盘事件处理器，阻止功能键
        terminal.onKey(({ key, domEvent }: { key: string; domEvent: Event }) => {
          const event = domEvent as KeyboardEvent
          
          // 阻止F1-F12功能键
          if (event.key.startsWith('F') && event.key.length > 1) {
            const fNumber = parseInt(event.key.substring(1))
            if (fNumber >= 1 && fNumber <= 12) {
              event.preventDefault()
              event.stopPropagation()
              event.stopImmediatePropagation()
              return false
            }
          }
        })

        // 添加全局键盘事件监听器，阻止F功能键被Xterm.js处理
        const handleGlobalKeyDown = (event: KeyboardEvent) => {
          // 检查是否在终端容器内
          if (terminalRef.current && terminalRef.current.contains(event.target as Node)) {
            // 阻止F1-F12功能键被Xterm.js处理
            if (event.key.startsWith('F') && event.key.length > 1) {
              const fNumber = parseInt(event.key.substring(1))
              if (fNumber >= 1 && fNumber <= 12) {
                event.stopPropagation()
                // 不调用 preventDefault，让浏览器处理这些键
                return
              }
            }
          }
        }
        
        // 添加全局事件监听器
        document.addEventListener('keydown', handleGlobalKeyDown, true)

        terminal.write('\x1b[1;32mWelcome to HPC WebShell!\x1b[0m\r\n')
        terminal.write(`\x1b[1;36mUser: ${user?.username || 'demo_user'}\x1b[0m\r\n`)
        terminal.write('\x1b[1;33mConnecting to terminal...\x1b[0m\r\n')
        terminal.write('\x1b[1;35mTerminal initialized successfully!\x1b[0m\r\n')
        setTimeout(() => { connectWebSocket() }, 1000)
        
        const handleResize = () => {
          if (fitAddon && terminalRef.current) {
            fitAddon.fit()
          }
        }
        window.addEventListener('resize', handleResize)
        
        // 清理函数
        return () => {
          window.removeEventListener('resize', handleResize)
          if (contextMenuHandlerRef.current && terminalRef.current) {
            try {
              terminalRef.current.removeEventListener('contextmenu', contextMenuHandlerRef.current)
            } catch (error) {
              console.warn('移除右键菜单监听器时出错:', error)
            }
            contextMenuHandlerRef.current = null
          }
          // 移除全局键盘事件监听器
          try {
            document.removeEventListener('keydown', handleGlobalKeyDown, true)
          } catch (error) {
            console.warn('移除全局键盘监听器时出错:', error)
          }
        }
      } catch (error) {
        console.error('💥 终端初始化失败:', error)
        setConnectionError('终端初始化失败')
      }
    }
    
    initTerminal()
  }, [authLoaded, user, token]) // 移除 connectWebSocket 依赖，改用 useCallback

  // 连接WebSocket
  const connectWebSocket = async () => {
    if (!user || !token) {
      setConnectionError('缺少用户认证信息')
      return
    }

    if (!terminalInstanceRef.current) {
      setConnectionError('终端未初始化')
      return
    }

    setIsLoading(true)
    setConnectionError(null)

    try {


      // 动态导入 socket.io
      // @ts-ignore
      const { io } = await import('socket.io-client')

      // 优先环境变量；未配置时走同源（由 nginx 反代 /socket.io → 3001）
      const configured = process.env.NEXT_PUBLIC_WEBSHELL_SERVER?.trim()
      const webshellServer = configured
        || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')
      const socket = io(webshellServer, {
        auth: { token },
        transports: ['polling', 'websocket'], // polling 优先，反代场景更稳
        timeout: 15000, // 增加超时时间
        forceNew: true, // 强制新连接
        reconnection: true, // 启用重连
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      })

      socketRef.current = socket

      socket.on('connect', () => {
        setIsConnected(true)
        setIsLoading(false)
        setConnectionError(null)
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.write('\x1b[1;32m✓ Connected!\x1b[0m\r\n')
          terminalInstanceRef.current.write('\x1b[1;33mTerminal is ready. You can start typing commands.\x1b[0m\r\n')
        }
        
        // 连接成功后，发送终端大小
        setTimeout(() => {
          if (terminalInstanceRef.current) {
            const dims = { cols: 80, rows: 24 }  // 使用较小的尺寸
            socket.emit('resize', dims)
          }
        }, 100)
      })

      socket.on('data', (data: string) => {
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.write(data)
        }
      })

      socket.on('disconnect', (reason: any) => {
        setIsConnected(false)
        setIsLoading(false)
        setConnectionError('连接已断开')
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.write('\r\n\x1b[1;31m✗ Connection lost\x1b[0m\r\n')
        }
      })

      socket.on('connect_error', (error: any) => {
        console.error('❌ WebShell连接错误:', error.message)
        setIsLoading(false)
        setConnectionError(`连接错误: ${error.message}`)
        
        if (terminalInstanceRef.current) {
          terminalInstanceRef.current.write(`\r\n\x1b[1;31m✗ Connection error: ${error.message}\x1b[0m\r\n`)
        }
      })

        // 处理终端输入
        socket.on('input', (data: string) => {
          
          // 检查粘贴权限
          // if (!canPaste && data.length > 1) { // This line was commented out in the original file
          //   socket.emit('data', '\r\n\x1b[1;31m粘贴被阻止：您没有粘贴权限\x1b[0m\r\n')
          //   return
          // }
          
          // ptyProcess.write(data) // This line was commented out in the original file
        })

        // 处理粘贴操作
        socket.on('paste', (content: string) => {
          // if (!canPaste) { // This line was commented out in the original file
          //   socket.emit('data', '\r\n\x1b[1;31m粘贴被阻止：您没有粘贴权限\x1b[0m\r\n')
          //   return
          // }
          // ptyProcess.write(content) // This line was commented out in the original file
        })

    } catch (error) {
      console.error('💥 WebShell连接失败:', error)
      setIsLoading(false)
      setConnectionError('连接失败')
    }
  }

  // 重新连接
  const handleReconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
    connectWebSocket()
  }

  // 断开连接
  const handleDisconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    setIsConnected(false)
    setConnectionError(null)
  }

  return (
    <div className="h-screen w-full bg-black flex flex-col overflow-hidden" style={{ height: '100vh', width: '100vw' }}>
      {/* 顶部状态栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white text-sm border-b border-gray-700 flex-shrink-0" style={{ height: '40px' }}>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">
            <TerminalIcon className="w-4 h-4" />
            WebShell 终端
          </span>
          <span>用户: {user?.username || '加载中...'}</span>
          <span>状态: {isConnected ? '已连接' : isLoading ? '连接中' : '未连接'}</span>
          <span className={copyPasteEnabled ? 'text-green-400' : 'text-red-400'}>
            复制粘贴: {copyPasteEnabled ? '已启用' : '已禁用'}
          </span>
          {connectionError && (
            <span className="text-red-400">错误: {connectionError}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReconnect}
            disabled={isLoading}
            className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded text-xs"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            重连
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-1 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs"
          >
            <X className="w-3 h-3" />
            断开
          </button>
        </div>
      </div>
      {/* 终端容器 */}
      {!authLoaded ? (
        <div className="flex-1 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-gray-300">正在加载用户认证信息...</p>
            <p className="text-gray-500 text-sm mt-2">请稍候...</p>
          </div>
        </div>
      ) : !user || !token ? (
        <div className="flex-1 flex items-center justify-center text-white">
          <div className="text-center">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <p className="text-red-400 text-lg mb-2">认证失败</p>
            <p className="text-gray-300">缺少用户认证信息，请重新登录</p>
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              返回登录
            </button>
          </div>
        </div>
      ) : (
                <WebShellWatermark username={user?.username || ''}>
          <div className="flex-1 p-2 min-h-0 overflow-hidden" style={{ 
            height: 'calc(100vh - 40px)', 
            display: 'flex', 
            flexDirection: 'column',
            position: 'relative',
            maxHeight: 'calc(100vh - 40px)'
          }}>
            <div 
              ref={terminalRef} 
              className="h-full w-full bg-black text-green-400 font-mono text-sm"
              style={{ 
                height: '100%', 
                width: '100%', 
                flex: 1,
                position: 'relative',
                top: 0,
                left: 0,
                maxHeight: '100%',
                overflow: 'hidden',
                zIndex: 100
              }}
            />
          </div>
        </WebShellWatermark>
      )}
    </div>
  )
} 