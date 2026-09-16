# WebShell 故障排除指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 问题诊断

### 1. 检查服务状态

```bash
# 检查 WebShell 服务是否运行
ps aux | grep webshell-server

# 检查端口是否被占用
netstat -tlnp | grep 3001

# 检查服务日志
tail -f logs/webshell.log
```

### 2. 检查 JWT 令牌

```bash
# 运行 JWT 调试工具
node scripts/debug-frontend-token.js

# 测试 WebShell 连接
node scripts/test-webshell-real-token.js
```

### 3. 浏览器端调试

在浏览器控制台中运行：

```javascript
// 检查 localStorage 中的 token
console.log('Token:', localStorage.getItem('token'))

// 检查用户信息
console.log('User:', JSON.parse(localStorage.getItem('user') || 'null'))

// 运行浏览器测试脚本
// 复制 scripts/test-webshell-browser.js 的内容到控制台
```

## 常见问题

### 问题 1: "无效的认证令牌"

**原因**: JWT 令牌验证失败

**解决方案**:
1. 检查 JWT_SECRET 环境变量是否一致
2. 重新登录获取新的令牌
3. 检查令牌是否过期

```bash
# 检查环境变量
echo $JWT_SECRET

# 重启 WebShell 服务
pkill -f webshell-server
./scripts/start-webshell.sh
```

### 问题 2: "连接超时"

**原因**: WebShell 服务未启动或网络问题

**解决方案**:
1. 启动 WebShell 服务
2. 检查防火墙设置
3. 检查端口是否被占用

```bash
# 启动服务
./scripts/start-webshell.sh

# 检查端口
netstat -tlnp | grep 3001
```

### 问题 3: "缺少必要的认证信息"

**原因**: 前端未登录或 token 丢失

**解决方案**:
1. 重新登录系统
2. 检查 localStorage 中的 token
3. 清除浏览器缓存

```javascript
// 在浏览器控制台中检查
console.log('Token exists:', !!localStorage.getItem('token'))
console.log('User exists:', !!localStorage.getItem('user'))
```

### 问题 4: "无法连接到WebShell服务"

**原因**: 网络连接问题或服务配置错误

**解决方案**:
1. 检查服务是否在正确的端口运行
2. 检查 CORS 配置
3. 检查网络连接

```bash
# 测试服务连接
curl http://localhost:3001

# 检查服务配置
cat scripts/webshell-server.js | grep -A 5 -B 5 "cors"
```

## 调试步骤

### 步骤 1: 服务端调试

```bash
# 1. 停止现有服务
pkill -f webshell-server

# 2. 启动服务并查看详细日志
DEBUG=* node scripts/webshell-server.js

# 3. 在另一个终端测试连接
node scripts/test-webshell-real-token.js
```

### 步骤 2: 前端调试

```bash
# 1. 启动前端应用
npm run dev

# 2. 在浏览器中打开开发者工具
# 3. 在控制台中运行测试脚本
# 4. 查看网络标签页中的 WebSocket 连接
```

### 步骤 3: 网络调试

```bash
# 1. 检查端口监听
netstat -tlnp | grep 3001

# 2. 测试端口连通性
telnet localhost 3001

# 3. 检查防火墙
sudo ufw status
```

## 环境配置

### 必需的环境变量

```env
# JWT 密钥（必须与前端一致）
JWT_SECRET=my-hpcapp-secret

# 前端应用 URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WebShell 服务端口
WEBSHELL_PORT=3001
```

### 依赖检查

```bash
# 检查必需依赖
npm list node-pty socket.io jsonwebtoken

# 安装缺失依赖
npm install node-pty socket.io jsonwebtoken
```

## 性能优化

### 1. 连接优化

```javascript
// 在 WebShell 组件中添加连接优化
const socket = io('http://localhost:3001', {
  auth: { token },
  transports: ['websocket'],
  timeout: 10000,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
})
```

### 2. 内存管理

```javascript
// 在组件卸载时清理资源
useEffect(() => {
  return () => {
    if (socketRef.current) {
      socketRef.current.disconnect()
    }
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.dispose()
    }
  }
}, [])
```

## 日志分析

### 服务端日志

```bash
# 查看连接日志
grep "WebShell连接" logs/webshell.log

# 查看错误日志
grep "ERROR\|错误" logs/webshell.log

# 查看认证日志
grep "认证" logs/webshell.log
```

### 前端日志

在浏览器控制台中查看：
- 连接状态
- 错误信息
- 网络请求

## 联系支持

如果问题仍然存在，请提供以下信息：

1. **错误日志**: 服务端和前端的所有错误信息
2. **环境信息**: 操作系统、Node.js 版本、依赖版本
3. **配置信息**: 环境变量、网络配置
4. **重现步骤**: 详细的问题重现步骤

---

**注意**: 本文档会随着问题发现而持续更新。 
