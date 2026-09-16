import { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/jwt'
import { addClient, removeClient } from '@/lib/sse-manager'
export const dynamic = 'force-dynamic'


// GET /api/vnc/jobs/events - Server-Sent Events端点
export async function GET(req: NextRequest) {
  // 验证用户身份 - 支持URL参数或header
  let token: string | null = null
  
  // 首先尝试从URL参数获取token
  const url = new URL(req.url)
  const tokenParam = url.searchParams.get('token')
  if (tokenParam) {
    token = tokenParam
  } else {
    // 回退到header
    const authHeader = req.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }
  
  if (!token) {
    return new Response('Unauthorized', { status: 401 })
  }
  
  const userInfo = verifyJwt(token)
  if (!userInfo?.username) {
    return new Response('Unauthorized', { status: 401 })
  }

  const username = userInfo.username

  // 设置SSE响应头
  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  }

  // 创建SSE流
  const stream = new ReadableStream({
    start(controller) {
      // 存储客户端连接
      addClient(username, controller)
      
      // 发送连接确认消息
      const connectMessage = `data: ${JSON.stringify({ type: 'connected', user: username })}\n\n`
      controller.enqueue(new TextEncoder().encode(connectMessage))
      
      // 客户端断开连接时的清理
      req.signal.addEventListener('abort', () => {
        removeClient(username)
        controller.close()
      })
    }
  })

  return new Response(stream, { headers })
} 