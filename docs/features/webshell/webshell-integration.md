# WebShell 集成说明文档

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

WebShell 功能通过独立的 Node.js 服务提供，使用 Socket.IO 和 node-pty 实现实时终端功能。

## 架构设计

### 服务架构
```
前端 (Next.js) ←→ WebSocket ←→ 独立 WebShell 服务 (Node.js + node-pty)
```

### 组件说明
- **前端**: `components/WebShell.tsx` - React 组件，使用 xterm.js 和 socket.io-client
- **后端**: `scripts/webshell-server.js` - 独立 Node.js 服务，使用 node-pty 和 Socket.IO
- **启动脚本**: `scripts/start-webshell.sh` - 服务启动脚本

## 安装和配置

### 1. 依赖安装

```bash
# 安装 WebShell 相关依赖
npm install node-pty socket.io jsonwebtoken xterm xterm-addon-fit xterm-addon-web-links socket.io-client
```

### 2. 环境变量配置

在 `.env.local` 文件中添加：

```env
# JWT 密钥（用于用户认证）
JWT_SECRET=your-secret-key

# 前端应用 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WebShell 服务端口（可选，默认 3001）
WEBSHELL_PORT=3001
```

### 3. 启动服务

#### 方法一：使用启动脚本
```bash
./scripts/start-webshell.sh
```

#### 方法二：直接启动
```bash
node scripts/webshell-server.js
```

## 功能特性

### 1. 用户认证
- 使用 JWT 令牌进行用户身份验证
- 支持用户权限检查（已简化）

### 2. 终端功能
- 实时命令执行
- 终端大小调整
- 复制/粘贴支持
- 会话管理

### 3. 安全特性
- 会话超时自动清理（4小时）
- 用户隔离
- 命令执行日志

## 使用说明

### 1. 前端使用

WebShell 组件已集成到全局导航栏，用户登录后可直接使用：

```tsx
// 在 app/dashboard/layout.tsx 中已集成
import dynamic from 'next/dynamic'

const WebShell = dynamic(() => import('@/components/WebShell'), { ssr: false })
```

### 2. 连接流程

1. 用户点击 WebShell 按钮
2. 前端建立 Socket.IO 连接到 `http://localhost:3001`
3. 发送 JWT 令牌进行认证
4. 后端创建伪终端会话
5. 用户可开始输入命令

### 3. 命令执行

- 支持所有标准 Linux 命令
- 实时输出显示
- 支持交互式命令（如 vim、top 等）

## 故障排除

### 1. 连接失败

**问题**: 前端无法连接到 WebShell 服务

**解决方案**:
```bash
# 检查服务是否运行
ps aux | grep webshell-server

# 检查端口是否被占用
netstat -tlnp | grep 3001

# 重启服务
pkill -f webshell-server
./scripts/start-webshell.sh
```

### 2. 依赖问题

**问题**: node-pty 编译失败

**解决方案**:
```bash
# 安装编译依赖
sudo apt-get update
sudo apt-get install python3 make g++

# 重新安装 node-pty
npm rebuild node-pty
```

### 3. 权限问题

**问题**: 终端无法执行某些命令

**解决方案**:
- 检查用户权限
- 确认 JWT_SECRET 配置正确
- 查看服务日志

## 开发说明

### 1. 添加新功能

在 `scripts/webshell-server.js` 中添加新的 Socket.IO 事件处理：

```javascript
socket.on('custom-event', (data) => {
  // 处理自定义事件
  console.log('收到自定义事件:', data)
})
```

### 2. 修改前端组件

在 `components/WebShell.tsx` 中添加新的 UI 功能：

```tsx
// 添加新的状态
const [customState, setCustomState] = useState(false)

// 添加新的事件处理
const handleCustomAction = () => {
  if (socketRef.current) {
    socketRef.current.emit('custom-event', { data: 'value' })
  }
}
```

### 3. 调试技巧

#### 后端调试
```bash
# 启动服务并查看详细日志
DEBUG=* node scripts/webshell-server.js
```

#### 前端调试
```javascript
// 在浏览器控制台中查看连接状态
console.log('WebShell 连接状态:', socket.connected)
```

## 性能优化

### 1. 会话管理
- 自动清理过期会话（4小时超时）
- 限制最大并发会话数
- 内存使用监控

### 2. 网络优化
- WebSocket 连接复用
- 数据压缩
- 心跳检测

### 3. 安全优化
- JWT 令牌验证
- 用户权限检查
- 命令执行审计

## 部署说明

### 1. 开发环境
```bash
# 终端 1: 启动 Next.js 应用
npm run dev

# 终端 2: 启动 WebShell 服务
./scripts/start-webshell.sh
```

### 2. 生产环境

#### 使用 PM2 管理服务
```bash
# 安装 PM2
npm install -g pm2

# 启动 WebShell 服务
pm2 start scripts/webshell-server.js --name webshell

# 查看服务状态
pm2 status

# 查看日志
pm2 logs webshell
```

#### 使用 Docker 部署
```dockerfile
# Dockerfile 示例
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
EXPOSE 3001

CMD ["node", "scripts/webshell-server.js"]
```

## 监控和维护

### 1. 日志监控
- 连接日志
- 错误日志
- 性能日志

### 2. 健康检查
```bash
# 检查服务状态
curl http://localhost:3001/health

# 检查活跃会话数
curl http://localhost:3001/stats
```

### 3. 备份和恢复
- 定期备份配置文件
- 会话数据清理
- 服务重启策略

## 常见问题

### Q: 为什么需要独立的 WebShell 服务？
A: Next.js API 路由不支持 WebSocket 协议，必须使用独立的 Node.js 服务来处理 Socket.IO 连接。

### Q: 如何修改 WebShell 端口？
A: 设置环境变量 `WEBSHELL_PORT` 或修改 `scripts/webshell-server.js` 中的 `PORT` 常量。

### Q: 如何添加用户权限控制？
A: 在 `scripts/webshell-server.js` 的认证中间件中添加权限检查逻辑。

### Q: 如何自定义终端主题？
A: 修改 `components/WebShell.tsx` 中的 Terminal 配置选项。

## 更新日志

### v1.0.0 (2025-01-26)
- 初始版本发布
- 支持基本的终端功能
- 集成用户认证
- 添加会话管理

---

**注意**: 本文档会随着功能更新而持续维护，请定期查看最新版本。 
