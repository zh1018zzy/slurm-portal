# VNC 问题调试指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 当前问题

前端显示"VNC启动中..."，但后端测试显示 VNC URL 应该正确生成。

## 调试步骤

### 1. 强制刷新页面
```
Ctrl+F5 (Windows/Linux) 或 Cmd+Shift+R (Mac)
```

### 2. 清除浏览器缓存
- 打开开发者工具 (F12)
- 右键点击刷新按钮
- 选择"清空缓存并硬性重新加载"

### 3. 检查浏览器控制台
1. 打开开发者工具 (F12)
2. 切换到 Console 标签
3. 查看是否有错误信息
4. 查看我们添加的调试日志：
   - `API 返回的所有作业:`
   - `过滤后的 graphics 作业:`
   - `渲染作业: 105`

### 4. 检查网络请求
1. 打开开发者工具 (F12)
2. 切换到 Network 标签
3. 刷新页面
4. 查找 `/api/jobs` 请求
5. 点击查看响应内容，确认：
   - `jobType` 是否为 `"graphics"`
   - `vncUrl` 是否有值
   - `status` 是否为 `"RUNNING"`

### 5. 手动测试 API
```bash
# 在浏览器控制台中运行
fetch('/api/jobs?page=1&pageSize=50&user=testuser3', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(r => r.json())
.then(data => {
  console.log('API 响应:', data);
  const job105 = data.jobs?.find(j => j.jobId === '105');
  console.log('作业 105:', job105);
});
```

## 预期结果

如果修复生效，应该看到：

### 控制台日志
```
API 返回的所有作业: [..., {jobId: "105", jobType: "graphics", vncUrl: "http://192.168.1.10:6080/vnc.html?host=compute-node-01&port=6001", ...}]
过滤后的 graphics 作业: [{jobId: "105", jobType: "graphics", vncUrl: "http://192.168.1.10:6080/vnc.html?host=compute-node-01&port=6001", ...}]
渲染作业: 105 {status: "RUNNING", jobType: "graphics", vncUrl: "http://192.168.1.10:6080/vnc.html?host=compute-node-01&port=6001", ...}
```

### 页面显示
- 作业 105 显示绿色的"noVNC访问"按钮
- 不再显示"VNC启动中..."

## 如果问题仍然存在

### 检查后端日志
```bash
tail -f logs/app.log | grep -E "(getJobStatus|作业 105)"
```

### 检查 noVNC 连接
```bash
curl -s -o /dev/null -w "%{http_code}" "http://192.168.1.10:6080/vnc.html?host=compute-node-01&port=6001"
```

### 检查 VNC 服务
```bash
ssh compute-node-01 "ps aux | grep Xvnc"
ssh compute-node-01 "netstat -tlnp | grep 6001"
```

## 常见问题

### 1. 前端缓存问题
- 强制刷新页面
- 清除浏览器缓存
- 重启 Next.js 服务

### 2. 后端代码未生效
- 检查 TypeScript 编译错误
- 重启 Next.js 服务
- 检查文件是否保存

### 3. API 认证问题
- 检查 localStorage 中的 token
- 重新登录
- 检查 JWT 是否过期

### 4. noVNC 配置问题
- 检查 Docker 容器状态
- 检查 websockify 配置
- 检查端口映射

## 联系支持

如果以上步骤都无法解决问题，请提供：
1. 浏览器控制台的完整日志
2. Network 标签中 `/api/jobs` 的响应内容
3. 后端日志中的相关错误信息 
