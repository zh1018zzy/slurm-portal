// SSE管理器 - 处理Server-Sent Events连接和广播

// 存储客户端连接的Map
const clients = new Map<string, ReadableStreamDefaultController>()

// 广播作业状态更新给所有连接的客户端
export function broadcastJobUpdate(jobUpdate: any) {
  const message = `data: ${JSON.stringify(jobUpdate)}\n\n`
  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message))
    } catch (error) {
      console.warn('[SSE] 发送消息失败:', error)
    }
  })
}

// 添加客户端连接
export function addClient(username: string, controller: ReadableStreamDefaultController) {
  clients.set(username, controller)
}

// 移除客户端连接
export function removeClient(username: string) {
  clients.delete(username)
}

// 获取当前连接数
export function getClientCount(): number {
  return clients.size
} 
 