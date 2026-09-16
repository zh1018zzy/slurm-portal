# WebShell 使用说明

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

WebShell 是一个基于浏览器的终端工具，允许用户通过 Web 界面访问服务器的命令行终端。

## 功能特点

- 🖥️ **全屏终端体验** - 独立的终端页面，提供更好的用户体验
- 🔐 **安全认证** - 基于 JWT 的用户认证
- 📱 **响应式设计** - 支持不同屏幕尺寸
- 🔄 **自动重连** - 连接断开时自动重连
- 🎨 **美观界面** - 现代化的终端主题

## 使用方法

### 1. 启动 WebShell 服务

```bash
# 在项目根目录执行
./scripts/start-webshell.sh
```

服务将在端口 3001 上运行。

### 2. 访问 WebShell

1. 登录 HPC 管理平台
2. 点击右上角的 **WebShell** 按钮
3. 系统将在新标签页中打开 WebShell 终端

### 3. 使用终端

- 终端会自动连接到服务器
- 支持所有标准的 Linux 命令
- 支持复制粘贴操作
- 支持终端大小调整

## 故障排除

### 连接问题

如果无法连接到 WebShell：

1. **检查服务状态**
   ```bash
   ps aux | grep webshell-server
   ```

2. **检查端口占用**
   ```bash
   netstat -tlnp | grep 3001
   ```

3. **重启服务**
   ```bash
   # 停止服务
   pkill -f webshell-server
   
   # 重新启动
   ./scripts/start-webshell.sh
   ```

### 浏览器问题

1. **清除浏览器缓存**
2. **检查浏览器控制台错误**
3. **尝试使用不同的浏览器**

### 权限问题

确保用户已正确登录，并且 JWT 令牌有效。

## 技术架构

- **前端**: React + xterm.js + Socket.IO
- **后端**: Node.js + Socket.IO + node-pty
- **认证**: JWT 令牌
- **通信**: WebSocket

## 安全注意事项

- WebShell 需要有效的用户认证
- 连接使用 JWT 令牌进行身份验证
- 建议在生产环境中使用 HTTPS
- 定期更新依赖包以修复安全漏洞

## 开发说明

### 文件结构

```
app/dashboard/webshell/page.tsx    # WebShell 页面组件
components/WebShell.tsx            # WebShell 按钮组件
scripts/webshell-server.js         # WebShell 服务器
scripts/start-webshell.sh          # 启动脚本
```

### 自定义配置

可以在 `scripts/webshell-server.js` 中修改：

- 端口号 (默认: 3001)
- JWT 密钥
- 终端配置
- 会话超时时间

## 更新日志

- **v1.0.0** - 初始版本，支持基本的终端功能
- **v1.1.0** - 改为独立页面模式，提升用户体验
- **v1.2.0** - 添加自动重连和错误处理 
