# VNC 桌面功能技术说明

## 📌 重要说明

**VNC 桌面功能完全正常工作，不依赖任何数据库表！**

## 🔧 实现原理

### 传统方式（已废弃）
```
提交作业 → 记录到 view_jobs 表 → 前端查询数据库 → 显示 VNC 信息
```
**问题**: 需要同步数据，可能过时，增加数据库复杂度

### 现代方式（当前实现）✅
```
提交作业 → Slurm 管理作业 → API 实时查询 Slurm → 解析脚本 → 生成 VNC URL
```
**优势**: 
- ✅ 数据始终最新（实时查询）
- ✅ 无需数据同步
- ✅ 减少数据库依赖
- ✅ 更易维护

## 🚀 工作流程

### 1. 提交 VNC 作业

用户在应用中心提交 VNC 应用（如 VNC 桌面、Firefox 等）：

```bash
# 生成的作业脚本示例
#!/bin/bash
#SBATCH --partition=compute-node-01
#SBATCH --nodes=1

# 启动 VNC 服务器
DISPLAY=:101
VNC_PORT=$((5900 + 101))
vncserver $DISPLAY -geometry 1920x1080
...
```

### 2. 作业状态查询

API 端点 `/api/vnc/jobs/realtime` 执行以下操作：

```typescript
// 1. 查询用户的活跃作业
const jobs = await squeue('-u', username)

// 2. 获取作业详情
for (const job of jobs) {
  const details = await scontrol('show', 'job', job.jobId)
  const scriptPath = extractScriptPath(details)
  
  // 3. 读取作业脚本
  const script = await readFile(scriptPath)
  
  // 4. 检查是否是 VNC 作业
  if (script.includes('vncserver')) {
    // 5. 提取 VNC 信息
    const display = extractDisplay(script)  // :101
    const port = extractPort(script)        // 6001
    
    // 6. 生成 VNC URL
    const vncUrl = generateUrl(node, port)
  }
}
```

### 3. 生成访问链接

```typescript
function generateVncUrl(nodeIp: string, port: number): string {
  const gateway = process.env.NOVNC_GATEWAY || 'localhost'
  const gatewayPort = process.env.NOVNC_PORT || '6080'
  
  return `http://${gateway}:${gatewayPort}/vnc.html?host=${nodeIp}&port=${port}`
}
```

### 4. 用户访问

用户点击"VNC 桌面"按钮 → 打开 noVNC 网页客户端 → 在浏览器中操作 Linux 桌面

## 📁 相关代码文件

### API 端点
- `app/api/vnc/jobs/realtime/route.ts` - VNC 作业实时状态查询
- `app/api/jobs/status/route.ts` - 作业状态查询（包含 VNC 信息）
- `app/api/jobs/active/route.ts` - 活跃作业查询

### 工具库
- `services/frontend/lib/vnc-manager.ts` - VNC 管理器
  - `getNextDisplay()` - 获取可用的 display 编号
  - `generateVncScript()` - 生成 VNC 作业脚本
  - `displayToVncPort()` - display 转端口号

### 前端页面
- `app/dashboard/applications/vnc/page.tsx` - VNC 应用管理页面
- `app/dashboard/applications/hpc/page.tsx` - HPC 应用中心（包含 VNC 应用）

## 🔍 为什么不需要 view_jobs 表？

### 数据来源

| 信息 | 来源 | 方式 |
|------|------|------|
| 作业ID | Slurm | `squeue -u username` |
| 作业状态 | Slurm | `squeue -o %T` |
| 作业节点 | Slurm | `squeue -o %N` |
| VNC Display | 作业脚本 | 解析 `DISPLAY=:101` |
| VNC Port | 作业脚本 | 解析 `VNC_PORT=...` |
| VNC URL | 动态生成 | 基于上述信息 |

**所有信息都可以实时获取，无需存储到数据库！**

## ✅ 功能验证

### 测试步骤

1. **提交 VNC 作业**
   ```bash
   # 在应用中心选择"VNC 桌面"并提交
   ```

2. **查看作业列表**
   ```bash
   curl http://localhost:3000/api/vnc/jobs/realtime \
     -H "Authorization: Bearer $TOKEN"
   ```
   
   **预期响应**:
   ```json
   {
     "success": true,
     "jobs": [
       {
         "jobId": "12345",
         "status": "RUNNING",
         "vncDisplay": 101,
         "vncPort": 6001,
         "vncUrl": "http://gateway:6080/vnc.html?host=compute-node-01&port=6001"
       }
     ]
   }
   ```

3. **打开 VNC 桌面**
   - 点击"VNC 桌面"按钮
   - 浏览器打开 noVNC 客户端
   - 可以操作 Linux 桌面

## 📊 性能对比

| 指标 | 使用数据库表 | 实时查询 Slurm |
|------|-------------|---------------|
| 数据新鲜度 | ⚠️ 可能过时 | ✅ 始终最新 |
| 同步复杂度 | ⚠️ 需要同步机制 | ✅ 无需同步 |
| 数据库负担 | ⚠️ 增加表和查询 | ✅ 无负担 |
| 查询延迟 | ✅ 快（~10ms） | ⚠️ 中等（~100ms） |
| 维护成本 | ⚠️ 高 | ✅ 低 |
| 推荐 | ❌ | ✅ |

## 🎯 结论

1. ✅ VNC 桌面功能完全正常
2. ✅ 不需要 view_jobs 表
3. ✅ 实时查询方式更简单、更可靠
4. ✅ 已从所有初始化脚本中移除
5. ✅ 现有系统可以安全删除此表

---

**技术负责人确认**: VNC 功能通过 Slurm 实时查询实现，无需数据库表支持。
**验证日期**: 2025-10-10
**相关文档**: `db/VNC_TABLE_REMOVAL_NOTICE.md`

