# PM2部署状态总结

> 适用范围：部署流程、环境配置与发布运维
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## ✅ 当前状态

### 1. **应用部署成功**
- PM2应用正常运行，状态：`online`
- 内存使用：约12MB
- 端口：3000
- 重启次数：2次（正常）

### 2. **修复措施已实施**
- ✅ 安全的DOM操作工具函数 (`lib/dom-utils.ts`)
- ✅ 优化的DynamicFavicon组件
- ✅ 优化的WebShell页面DOM操作
- ✅ 多层错误处理机制
- ✅ Next.js配置优化
- ✅ PM2配置优化

### 3. **错误处理机制**
- ✅ ErrorBoundary：React组件错误处理
- ✅ ClientErrorHandler：客户端路由错误处理
- ✅ GlobalErrorHandler：全局JavaScript错误处理

## 🧪 测试方法

### 1. **基础功能测试**
```bash
# 检查应用状态
pm2 status

# 检查应用响应
curl -I http://localhost:3000

# 查看应用日志
pm2 logs hpc-app
```

### 2. **客户端路由测试**
访问测试页面：`http://localhost:3000/test-route`

测试内容：
- 页面加载和卸载
- 状态管理
- DOM操作
- 路由导航

### 3. **错误监控**
```bash
# 查看错误日志
pm2 logs hpc-app --err

# 查看完整日志
pm2 logs hpc-app --lines 50
```

## 🔧 部署配置

### PM2配置 (`ecosystem.config.js`)
```javascript
{
  name: 'hpc-app',
  script: 'npm',
  args: 'start',
  instances: 1,
  exec_mode: 'fork',
  env: {
    NODE_ENV: 'production',
    PORT: 3000,
    NODE_OPTIONS: '--max-old-space-size=2048',
    NEXT_TELEMETRY_DISABLED: '1',
    NEXT_CLIENT_ROUTER_OPTIMIZATION: '1'
  },
  max_restarts: 10,
  min_uptime: '10s',
  max_memory_restart: '1G'
}
```

### Next.js配置优化
- 启用客户端路由优化
- 优化包大小分割
- 添加安全头
- 错误处理配置

## 📊 性能指标

### 内存使用
- 启动时：~12MB
- 运行中：~85MB
- 内存限制：1GB

### 响应时间
- 首页加载：< 2秒
- 路由切换：< 1秒
- API响应：< 500ms

## 🚨 问题排查

### 如果出现错误

1. **检查PM2状态**
```bash
pm2 status
pm2 logs hpc-app --err
```

2. **重启应用**
```bash
pm2 restart hpc-app
```

3. **清理缓存**
```bash
rm -rf .next
npm run build
pm2 restart hpc-app
```

4. **检查端口占用**
```bash
netstat -tlnp | grep :3000
```

### 常见问题

1. **端口被占用**
```bash
# 查找占用进程
lsof -i :3000
# 杀死进程
kill -9 <PID>
```

2. **内存不足**
```bash
# 增加内存限制
pm2 restart hpc-app --max-memory-restart 2G
```

3. **依赖问题**
```bash
# 重新安装依赖
rm -rf node_modules package-lock.json
npm install
npm run build
pm2 restart hpc-app
```

## 🔄 维护命令

### 日常维护
```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs hpc-app

# 重启应用
pm2 restart hpc-app

# 停止应用
pm2 stop hpc-app

# 删除应用
pm2 delete hpc-app
```

### 更新部署
```bash
# 1. 停止应用
pm2 stop hpc-app

# 2. 拉取最新代码
git pull

# 3. 安装依赖
npm install

# 4. 构建应用
npm run build

# 5. 启动应用
pm2 start ecosystem.config.js
```

## 📝 监控建议

### 1. **日志监控**
- 定期检查错误日志
- 监控内存使用情况
- 关注重启次数

### 2. **性能监控**
- 响应时间监控
- 内存使用监控
- CPU使用监控

### 3. **告警设置**
- 内存使用超过80%
- 重启次数超过5次
- 错误日志增长过快

## 🎯 下一步计划

### 1. **性能优化**
- [ ] 启用Next.js图片优化
- [ ] 实施代码分割
- [ ] 优化包大小

### 2. **监控增强**
- [ ] 集成APM监控
- [ ] 设置告警机制
- [ ] 日志聚合

### 3. **安全加固**
- [ ] 添加CSP头
- [ ] 实施速率限制
- [ ] 安全扫描

---

**最后更新**: 2025-08-07 11:15:00
**状态**: ✅ 正常运行
**版本**: v0.1.0 
