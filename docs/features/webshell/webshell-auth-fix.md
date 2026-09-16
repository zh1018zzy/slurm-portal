# WebShell认证问题修复指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🔍 **问题描述**

WebShell页面可以正常打开，但在连接终端时出现错误：
```
连接错误: 无效的认证令牌
```

## 🔍 **问题原因**

WebShell服务器和主应用使用了不同的环境变量文件，导致JWT_SECRET不一致：

- **主应用**: 从 `.env` 文件加载JWT_SECRET
- **WebShell服务器**: 从 `.env.local` 文件加载JWT_SECRET

## 🛠️ **修复步骤**

### 1. **修复WebShell服务器环境变量加载**

已修复 `scripts/webshell-server.js` 文件：
```javascript
// 修复前
require('dotenv').config({ path: '.env.local' })

// 修复后
require('dotenv').config({ path: '.env' })
require('dotenv').config({ path: '.env.local' })
```

### 2. **确保JWT_SECRET配置一致**

检查 `.env` 文件是否包含JWT_SECRET：
```bash
# 检查当前配置
grep JWT_SECRET .env

# 如果没有，添加配置
echo "JWT_SECRET=your-jwt-secret-here" >> .env
```

### 3. **重启WebShell服务器**

```bash
# 停止WebShell服务器
pkill -f "webshell-server"

# 重新启动
./scripts/start-webshell.sh
```

### 4. **验证修复**

运行测试脚本验证配置：
```bash
node test-webshell-auth.js
```

## 🔧 **详细修复过程**

### 步骤1: 检查环境变量配置

```bash
# 检查主应用环境变量
echo "主应用JWT_SECRET:"
grep JWT_SECRET .env

# 检查WebShell服务器环境变量
echo "WebShell服务器JWT_SECRET:"
node -e "
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local' });
console.log('JWT_SECRET:', process.env.JWT_SECRET || '未设置');
"
```

### 步骤2: 统一JWT_SECRET配置

如果配置不一致，确保两个服务使用相同的JWT_SECRET：

```bash
# 设置统一的JWT_SECRET
export JWT_SECRET="your-secure-jwt-secret-key-here"

# 更新.env文件
echo "JWT_SECRET=$JWT_SECRET" >> .env

# 更新.env.local文件（如果存在）
echo "JWT_SECRET=$JWT_SECRET" >> .env.local
```

### 步骤3: 重启所有服务

```bash
# 重启主应用
pkill -f "next"
npm run dev

# 重启WebShell服务器
pkill -f "webshell-server"
./scripts/start-webshell.sh
```

### 步骤4: 测试连接

1. 打开浏览器访问应用
2. 登录系统
3. 点击WebShell按钮
4. 检查终端连接是否成功

## 🧪 **测试验证**

### 1. **运行认证测试**

```bash
node test-webshell-auth.js
```

预期输出：
```
🔧 WebShell认证配置测试
JWT_SECRET: 已配置
主应用URL: http://10.0.0.201:3000
WebShell服务器URL: http://10.0.0.201:3001

📁 检查环境变量文件...
.env文件: ✅ 存在 ✅ 包含JWT_SECRET
.env.local文件: ✅ 存在 ✅ 包含JWT_SECRET

🧪 测试主应用API...
Token验证: ✅ 有效
✅ 主应用WebShell权限API调用成功: true

🧪 测试WebShell服务器连接...
✅ WebShell服务器连接成功
```

### 2. **手动测试WebShell连接**

在浏览器控制台中运行：
```javascript
// 获取当前用户token
const token = localStorage.getItem('token');
console.log('当前token:', token);

// 测试WebShell服务器连接
const { io } = await import('socket.io-client');
const socket = io('http://10.0.0.201:3001', {
  auth: { token },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ WebShell连接成功');
  socket.disconnect();
});

socket.on('connect_error', (error) => {
  console.log('❌ WebShell连接失败:', error.message);
});
```

## 🚨 **常见问题**

### 问题1: WebShell服务器未启动
```bash
# 检查WebShell服务器状态
ps aux | grep webshell-server

# 启动WebShell服务器
./scripts/start-webshell.sh
```

### 问题2: 端口被占用
```bash
# 检查3001端口
netstat -tlnp | grep :3001

# 杀死占用进程
sudo kill -9 <PID>
```

### 问题3: 防火墙阻止连接
```bash
# 检查防火墙规则
sudo ufw status

# 允许3001端口
sudo ufw allow 3001
```

### 问题4: JWT_SECRET仍然不一致
```bash
# 强制设置环境变量
export JWT_SECRET="your-secret-key"

# 重启所有服务
pkill -f "next"
pkill -f "webshell-server"
npm run dev &
./scripts/start-webshell.sh &
```

## 📋 **验证清单**

- [ ] JWT_SECRET在.env文件中正确配置
- [ ] WebShell服务器已重启
- [ ] 主应用已重启
- [ ] 用户能够成功登录
- [ ] WebShell页面可以正常打开
- [ ] 终端连接成功
- [ ] 可以正常输入命令

## 🔗 **相关文件**

- `scripts/webshell-server.js` - WebShell服务器
- `.env` - 主应用环境变量
- `.env.local` - WebShell服务器环境变量
- `lib/jwt.ts` - JWT工具函数
- `components/WebShellTerminal.tsx` - WebShell终端组件
- `test-webshell-auth.js` - 认证测试脚本

## 📝 **注意事项**

1. **环境变量优先级**: `.env.local` 会覆盖 `.env` 中的相同变量
2. **服务重启**: 修改环境变量后必须重启相关服务
3. **端口配置**: 确保3001端口未被其他服务占用
4. **网络访问**: 确保防火墙允许3001端口访问
5. **用户权限**: 确保用户有WebShell访问权限 
