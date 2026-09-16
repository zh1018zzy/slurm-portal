# my-hpcapp 高性能计算管理平台

> 适用范围：用户使用与操作指南
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 项目简介
本项目基于 Next.js（App Router）开发，结合 Shadcn UI、Radix UI、Tailwind CSS，旨在为高性能计算（HPC）环境提供现代化、响应式的管理与监控界面。

## 🚀 功能特性

### ✅ 已完成功能
- 用户认证 (LDAP/Linux)
- 作业管理 (提交、查看、取消)
- 作业统计和趋势分析
- 文件管理
- **WebShell终端** (新增) - 基于Web的Linux终端访问
- VNC远程桌面集成
- 分区状态监控
- 系统公告
- 性能优化 (缓存、分页、虚拟滚动)

### 🔄 开发中功能
- 系统资源监控 (v1.1)
- 节点监控 (v1.2)

### 📋 开发计划
详细功能开发计划请查看 [开发计划文档](../development/development-roadmap.md)

## 🆕 新增功能：WebShell终端

### 功能特点
- **Web终端**：基于xterm.js的完整终端体验
- **权限控制**：细粒度的复制粘贴权限管理
- **实时通信**：WebSocket实时数据传输
- **会话管理**：自动清理过期会话
- **安全审计**：完整的操作日志记录

### 快速开始
```bash
# 安装依赖
npm install xterm@5.3.0 xterm-addon-fit@0.8.0 xterm-addon-web-links@0.9.0 socket.io-client socket.io node-pty

# 启动WebShell服务器
chmod +x scripts/start-webshell.sh
./scripts/start-webshell.sh

# 启动前端应用
npm run dev
```

### 使用方法
1. 登录系统后在右上角找到 **WebShell** 按钮
2. 点击按钮打开终端对话框
3. 点击 **连接终端** 建立连接
4. 开始使用Linux命令

详细使用说明请查看：
- [WebShell快速开始指南](../features/webshell/webshell-quickstart.md)
- [WebShell功能完整说明](../features/webshell/webshell-feature-guide.md)

## 技术栈
- Next.js 14（App Router，React Server Components 优先）
- TypeScript
- React 18
- Shadcn UI + Radix UI（现代无障碍组件）
- Tailwind CSS（移动端优先，原子化样式）
- nuqs（URL参数状态管理）
- Recharts（数据可视化）
- **xterm.js**（Web终端模拟器）
- **Socket.IO**（实时通信）

## 目录结构
```
my-hpcapp/
├─ app/                # Next.js App Router 目录，页面与API路由
│  ├─ dashboard/       # 各业务模块（应用、资产、计算、文件、通知等）
│  ├─ api/             # 后端API接口
│  │   └─ webshell/    # WebShell WebSocket API
│  └─ ...
├─ components/         # 通用UI组件（Shadcn、Radix、定制组件）
│   └─ WebShell.tsx    # WebShell终端组件
├─ hooks/              # 自定义Hooks
├─ lib/                # 工具函数与业务逻辑
│   └─ webshell-server.ts # WebShell服务器
├─ scripts/            # 脚本文件
│   └─ start-webshell.sh # WebShell启动脚本
├─ docs/               # 文档目录
│   ├─ webshell-quickstart.md      # WebShell快速开始
│   ├─ webshell-feature-guide.md   # WebShell功能说明
│   └─ webshell-integration.md     # WebShell集成说明
├─ public/             # 静态资源（建议图片采用WebP格式）
├─ tailwind.config.ts  # Tailwind配置
├─ package.json        # 依赖与脚本
└─ README.md           # 项目说明
```

## 开发与部署
### 本地开发
```bash
npm install         # 安装依赖
npm run dev         # 启动开发服务器，默认 http://localhost:3000
```
或使用 yarn/pnpm/bun，命令一致。

### 构建与生产部署
```bash
npm run build       # 构建生产包
npm run start       # 启动生产环境
```

### WebShell服务部署
```bash
# 启动WebShell服务器
./scripts/start-webshell.sh

# 或手动启动
node lib/webshell-server.ts
```

### 代码检查
```bash
npm run lint        # 运行 ESLint 代码风格检查
```

## 🔐 权限系统

### WebShell权限配置
系统支持细粒度的WebShell权限控制：

- **访问权限**：控制用户是否能使用WebShell
- **复制权限**：控制用户是否能复制终端内容
- **粘贴权限**：控制用户是否能粘贴内容到终端
- **命令权限**：白名单/黑名单控制可执行的命令

详细权限配置请查看 [权限控制系统说明](../system/permissions/permission-control-system.md)

## 📊 监控与审计

### WebShell监控
- **实时会话监控**：查看当前活跃的WebShell会话
- **操作日志**：记录所有终端操作和权限检查
- **性能监控**：监控系统资源使用情况
- **安全审计**：异常操作告警和日志分析

## 🛠️ 故障排除

### WebShell常见问题
1. **连接失败**：检查WebShell服务器状态和端口配置
2. **权限错误**：检查用户权限配置
3. **终端显示异常**：检查编码设置和浏览器兼容性
4. **性能问题**：检查系统资源和会话清理

详细故障排除请查看 [WebShell功能说明](../features/webshell/webshell-feature-guide.md)

## 📚 相关文档

### 核心文档
- [开发计划](../development/development-roadmap.md)
- [环境配置](./README-ENVIRONMENT.md)
- [权限控制系统](../system/permissions/permission-control-system.md)

### WebShell相关文档
- [WebShell快速开始](../features/webshell/webshell-quickstart.md)
- [WebShell功能说明](../features/webshell/webshell-feature-guide.md)
- [WebShell集成说明](../features/webshell/webshell-integration.md)

### 其他功能文档
- [VNC集成指南](../features/vnc/VNC_INTEGRATION_GUIDE.md)
- [性能优化总结](../performance/optimization/performance-optimization-summary.md)

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request 来改进项目。

## 📄 许可证

本项目采用 MIT 许可证。

---

**注意**：WebShell功能需要适当的系统权限和安全配置，请在生产环境中谨慎使用并遵循安全最佳实践。
