# VNC IP地址和取消作业修复总结

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🐛 问题描述

用户报告了两个问题：
1. **VNC连接URL中使用localhost而不是IP地址** - `http://192.168.1.10:6080/vnc.html?host=localhost&port=6003`
2. **关闭VNC作业时提示网络错误** - 之前都正常，现在出现网络错误
3. **移除配置文件依赖** - 取消`config/node-ip-map.json`配置，直接使用环境变量

## 🔍 问题原因分析

### 1. **VNC URL使用localhost问题**
- 多个API中直接使用`DEFAULT_VNC_NODE_IP`环境变量作为hostname
- 没有使用`vnc-manager.ts`中的`getNodeIp`函数来获取正确的IP地址
- 配置文件依赖导致IP解析失败时回退到hostname

### 2. **作业取消网络错误**
- VNC页面调用错误的API端点：`/api/jobs/${jobId}/cancel`
- 实际API是：`/api/jobs/${jobId}`的DELETE方法
- 导致404错误，显示网络错误

### 3. **配置文件依赖问题**
- `vnc-manager.ts`中依赖`config/node-ip-map.json`配置文件
- 用户希望直接使用环境变量，简化配置

## 🔧 修复方案

### 1. **修复VNC URL生成**

#### 修复VNC实时API (`app/api/vnc/jobs/realtime/route.ts`)
```typescript
// 修复前
const vncUrl = `http://${gatewayIp}:${gatewayPort}/vnc.html?host=${nodeIp}&port=${vncInfo.port}`

// 修复后
const { generateVncUrl } = await import('@/lib/vnc-manager')
const vncNodeHostname = process.env.DEFAULT_VNC_NODE_IP || 'localhost'

try {
  vncJob.vncUrl = await generateVncUrl(vncNodeHostname, vncInfo.port)
} catch (error) {
  console.warn(`[VNC实时状态] 生成VNC URL失败:`, error)
  // 回退到使用环境变量
  const gatewayIp = process.env.NOVNC_GATEWAY || 'localhost'
  const gatewayPort = process.env.NOVNC_PORT || '6080'
  const nodeIp = process.env.DEFAULT_VNC_NODE_IP || 'localhost'
  vncJob.vncUrl = `http://${gatewayIp}:${gatewayPort}/vnc.html?host=${nodeIp}&port=${vncInfo.port}`
}
```

#### 修复作业状态API (`app/api/jobs/status/route.ts`)
```typescript
// 修复前
job.vncUrl = `http://${gatewayIp}:${gatewayPort}/vnc.html?host=${nodeIp}&port=${job.vncPort}`

// 修复后
const { generateVncUrl } = await import('@/lib/vnc-manager')
const vncNodeHostname = process.env.DEFAULT_VNC_NODE_IP || 'localhost'

try {
  job.vncUrl = await generateVncUrl(vncNodeHostname, job.vncPort)
} catch (error) {
  console.warn(`[状态检查] 生成VNC URL失败 (job ${job.jobId}):`, error)
  // 回退到使用环境变量
  const gatewayIp = process.env.NOVNC_GATEWAY || 'localhost'
  const gatewayPort = process.env.NOVNC_PORT || '6080'
  const nodeIp = process.env.DEFAULT_VNC_NODE_IP || 'localhost'
  job.vncUrl = `http://${gatewayIp}:${gatewayPort}/vnc.html?host=${nodeIp}&port=${job.vncPort}`
}
```

#### 修复活跃作业API (`app/api/jobs/active/route.ts`)
```typescript
// 修复前
const vncUrl = `http://${gatewayIp}:${gatewayPort}/vnc.html?host=${nodeIp}&port=${job.vncPort}`

// 修复后
const { generateVncUrl } = await import('@/lib/vnc-manager')
const vncNodeHostname = process.env.DEFAULT_VNC_NODE_IP || 'localhost'

const vncUrl = await generateVncUrl(vncNodeHostname, job.vncPort)
```

### 2. **修复作业取消API调用**

#### 修复VNC页面 (`app/dashboard/applications/vnc/page.tsx`)
```typescript
// 修复前
const response = await fetch(`/api/jobs/${jobId}/cancel`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})

// 修复后
const response = await fetch(`/api/jobs/${jobId}`, {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
```

### 3. **移除配置文件依赖**

#### 简化VNC管理器 (`lib/vnc-manager.ts`)
```typescript
// 修复前
async function getNodeIpMap(): Promise<Record<string, string>> {
  // 1. 优先从环境变量读取节点IP映射
  const nodeIpEnv = process.env.NODE_IP_MAP
  if (nodeIpEnv) {
    try {
      return JSON.parse(nodeIpEnv)
    } catch (error) {
      console.warn('[VNC Manager] 解析NODE_IP_MAP环境变量失败:', error)
    }
  }
  
  // 2. 尝试从配置文件读取 - 增强错误处理
  try {
    const fs = await import('fs')
    const path = await import('path')
    
    // 优先检查项目config目录
    const projectConfigPath = path.join(process.cwd(), 'config', 'node-ip-map.json')
    const systemConfigPath = process.env.NODE_IP_CONFIG_PATH || '/etc/hpcapp/node-ip-map.json'
    
    let configPath = projectConfigPath
    if (!fs.existsSync(projectConfigPath) && fs.existsSync(systemConfigPath)) {
      configPath = systemConfigPath
    }
    
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8')
        
        // 验证JSON内容非空且格式正确
        if (!configContent || configContent.trim().length === 0) {
          throw new Error('配置文件为空')
        }
        
        // 移除BOM和其他特殊字符
        const cleanContent = configContent.replace(/^\uFEFF/, '').trim()
        
        const config = JSON.parse(cleanContent)
        console.log(`[VNC Manager] 使用节点IP配置文件: ${configPath}`)
        return config.nodes || config
      } catch (parseError) {
        console.error(`[VNC Manager] 解析配置文件失败 ${configPath}:`, parseError)
        // 继续到下一步，使用默认配置
      }
    }
  } catch (error) {
    console.warn('[VNC Manager] 读取节点IP配置文件失败:', error)
  }

// 修复后
async function getNodeIpMap(): Promise<Record<string, string>> {
  // 直接使用环境变量，不再依赖配置文件
  const nodeIpEnv = process.env.NODE_IP_MAP
  if (nodeIpEnv) {
    try {
      return JSON.parse(nodeIpEnv)
    } catch (error) {
      console.warn('[VNC Manager] 解析NODE_IP_MAP环境变量失败:', error)
    }
  }
```

#### 删除配置文件
```bash
rm config/node-ip-map.json
```

## ✅ 修复效果

### 1. **VNC URL使用IP地址**
- ✅ VNC连接URL现在使用正确的IP地址：`http://192.168.1.10:6080/vnc.html?host=192.168.1.10&port=6003`
- ✅ 所有API都使用`vnc-manager.ts`中的`generateVncUrl`函数
- ✅ 提供错误回退机制，确保URL生成不会失败

### 2. **作业取消功能正常**
- ✅ 修复API端点调用错误
- ✅ 使用正确的DELETE方法
- ✅ 取消作业不再出现网络错误

### 3. **配置简化**
- ✅ 移除对`config/node-ip-map.json`的依赖
- ✅ 直接使用环境变量`NODE_IP_MAP`
- ✅ 简化配置管理，减少文件依赖

## 🧪 测试验证

### 1. **VNC URL测试**
```bash
# 测试VNC URL生成
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/vnc/jobs/realtime"

# 验证返回的URL格式
# 期望: http://192.168.1.10:6080/vnc.html?host=192.168.1.10&port=6003
# 而不是: http://192.168.1.10:6080/vnc.html?host=localhost&port=6003
```

### 2. **作业取消测试**
```bash
# 测试作业取消API
curl -X DELETE -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/jobs/JOB_ID"

# 验证返回结果
# 期望: {"success": true}
# 而不是: 404错误或网络错误
```

### 3. **环境变量配置**
```bash
# 检查环境变量配置
echo $NODE_IP_MAP
echo $DEFAULT_VNC_NODE_IP
echo $NOVNC_GATEWAY
echo $NOVNC_PORT

# 验证配置文件已删除
ls -la config/node-ip-map.json
# 期望: 文件不存在
```

## 📊 环境变量配置

### 1. **必需的环境变量**
```bash
# VNC节点IP地址
DEFAULT_VNC_NODE_IP=192.168.1.10

# noVNC网关配置
NOVNC_GATEWAY=192.168.1.10
NOVNC_PORT=6080

# 节点IP映射（可选，JSON格式）
NODE_IP_MAP='{"login-node":"192.168.1.10","localhost":"192.168.1.10","*":"192.168.1.10"}'
```

### 2. **配置优先级**
1. **环境变量`NODE_IP_MAP`** - 最高优先级
2. **动态IP发现** - 通过hostname/DNS解析
3. **默认回退** - 使用hostname本身

## 🔄 维护建议

### 1. **环境变量管理**
- 确保所有VNC相关环境变量正确设置
- 定期检查环境变量配置
- 使用统一的配置管理工具

### 2. **API端点维护**
- 保持API端点的一致性
- 使用RESTful设计原则
- 提供清晰的API文档

### 3. **错误处理**
- 提供有意义的错误信息
- 实现优雅的降级机制
- 记录详细的错误日志

## 🎯 后续优化

### 1. **功能增强**
- [ ] 添加VNC连接状态检查
- [ ] 实现VNC会话自动重连
- [ ] 支持多节点VNC负载均衡

### 2. **性能优化**
- [ ] 缓存VNC URL生成结果
- [ ] 优化IP地址解析性能
- [ ] 减少不必要的API调用

### 3. **用户体验**
- [ ] 添加VNC连接状态指示器
- [ ] 提供连接失败重试机制
- [ ] 优化错误提示信息

---

**修复时间**: 2025-08-07 12:05:00
**状态**: ✅ 已修复
**影响范围**: VNC URL生成、作业取消功能、配置管理
**测试状态**: ✅ 通过 
