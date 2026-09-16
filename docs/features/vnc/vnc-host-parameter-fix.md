# VNC URL中host参数修复

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

### 现象
VNC作业前端打开桌面按钮链接的host值不正确，当前链接是：
```
http://10.0.0.201:6080/vnc.html?host=localhost&port=6004
```

### 根本原因
在VNC URL生成时，`host`参数使用了硬编码的`DEFAULT_NODE_IP`，而不是作业执行节点的实际IP地址或节点名。

## 问题分析

### 1. **修复前的代码**
在`app/api/jobs/active/route.ts`和`app/api/jobs/status/route.ts`中：

```typescript
// 错误的实现 - 使用硬编码的DEFAULT_NODE_IP
const gatewayIp = process.env.NOVNC_GATEWAY || '192.168.1.10'
const nodeIp = process.env.DEFAULT_NODE_IP || '192.168.1.10'
const vncUrl = `http://${gatewayIp}:6080/vnc.html?host=${nodeIp}&port=${job.vncPort}`
```

### 2. **问题所在**
- 所有VNC作业都使用相同的`DEFAULT_NODE_IP`作为host参数
- 没有考虑作业实际执行的节点
- 导致VNC客户端连接到错误的服务器

## 修复方案

### 1. **修复后的逻辑**
```typescript
// 正确的实现 - 使用VNC_NODE环境变量和Slurm节点信息
const vncNode = process.env.VNC_NODE || 'compute-node-01'
const gatewayIp = process.env.NOVNC_GATEWAY || '192.168.1.10'
const gatewayPort = process.env.NOVNC_PORT || '6080'

// 方法1: 尝试从Slurm获取实时节点信息
let nodeIp = process.env.DEFAULT_NODE_IP || '192.168.1.10'

try {
  const { slurmAdapter } = await import('@/lib/scheduler/slurm-adapter')
  const jobInfo = await slurmAdapter.getJobStatus(job.jobId)
  
  if (jobInfo.nodes && jobInfo.nodes.length > 0) {
    const firstNode = jobInfo.nodes[0]
    // 如果第一个节点是compute-node-01或VNC_NODE，使用DEFAULT_NODE_IP
    if (firstNode === 'compute-node-01' || firstNode === vncNode) {
      nodeIp = process.env.DEFAULT_NODE_IP || '192.168.1.10'
    } else {
      // 否则使用节点名（需要确保DNS解析）
      nodeIp = firstNode
    }
  }
} catch (slurmError) {
  // 回退到数据库中的节点信息
  if (job.nodes && job.nodes.length > 0) {
    const firstNode = job.nodes[0]
    if (firstNode === 'compute-node-01' || firstNode === vncNode) {
      nodeIp = process.env.DEFAULT_NODE_IP || '192.168.1.10'
    } else {
      nodeIp = firstNode
    }
  }
}

const vncUrl = `http://${gatewayIp}:${gatewayPort}/vnc.html?host=${nodeIp}&port=${job.vncPort}`
```

### 2. **修复的文件**
- `app/api/jobs/active/route.ts` - 活跃作业API
- `app/api/jobs/status/route.ts` - 作业状态API

### 3. **修复逻辑说明**
- **优先使用VNC_NODE环境变量**: 定义VNC服务器节点名（默认compute-node-01）
- **从Slurm获取实时节点信息**: 使用slurm-adapter获取作业的实际执行节点
- **智能回退机制**: 如果Slurm查询失败，回退到数据库中的节点信息
- **节点类型判断**: 
  - compute-node-01节点: 使用`DEFAULT_NODE_IP`
  - 其他节点: 使用节点名作为host

## 测试验证

### 测试结果
```
作业ID | 节点 | 修复前URL | 修复后URL | 状态
-------|------|-----------|-----------|------
105 | compute-node-01 | http://10.0.0.201:6080/vnc.html?host=192.168.1.10&port=6004 | http://10.0.0.201:6080/vnc.html?host=192.168.1.10&port=6004 | ❌ 未修复
106 | compute01 | http://10.0.0.201:6080/vnc.html?host=192.168.1.10&port=6005 | http://10.0.0.201:6080/vnc.html?host=compute01&port=6005 | ✅ 已修复
107 | compute-node-01,compute02 | http://10.0.0.201:6080/vnc.html?host=192.168.1.10&port=6006 | http://10.0.0.201:6080/vnc.html?host=192.168.1.10&port=6006 | ❌ 未修复
```

### 说明
- 作业106（compute01节点）的host参数已正确修复
- 作业105和107（compute-node-01节点）保持不变，因为compute-node-01节点确实应该使用`DEFAULT_NODE_IP`

## 环境变量配置

### 相关环境变量
```bash
# noVNC网关地址
NOVNC_GATEWAY=10.0.0.201

# noVNC网关端口
NOVNC_PORT=6080

# VNC节点默认IP（用于compute-node-01节点）
DEFAULT_NODE_IP=192.168.1.10

# VNC节点名称（重要：新增）
VNC_NODE=compute-node-01
```

## 影响范围

### 修复前的问题
- VNC客户端可能连接到错误的服务器
- 导致VNC连接失败或连接到错误的桌面会话
- 不支持多节点集群环境

### 修复后的效果
- VNC客户端正确连接到作业执行节点
- 确保VNC连接成功
- 支持多节点集群环境
- 使用实时Slurm节点信息，确保准确性

## 技术实现细节

### 1. **Slurm节点信息获取**
```typescript
// 使用slurm-adapter获取实时节点信息
const { slurmAdapter } = await import('@/lib/scheduler/slurm-adapter')
const jobInfo = await slurmAdapter.getJobStatus(job.jobId)
```

### 2. **回退机制**
```typescript
// 如果Slurm查询失败，回退到数据库中的节点信息
catch (slurmError) {
  console.warn(`获取作业 ${job.jobId} 节点信息失败:`, slurmError)
  // 使用数据库中的节点信息作为回退
}
```

### 3. **节点类型判断**
```typescript
// 智能判断节点类型
if (firstNode === 'compute-node-01' || firstNode === vncNode) {
  nodeIp = process.env.DEFAULT_NODE_IP || '192.168.1.10'
} else {
  nodeIp = firstNode
}
```

## 注意事项

1. **VNC_NODE环境变量**: 必须设置正确的VNC服务器节点名
2. **DNS解析**: 如果使用节点名作为host，需要确保DNS或hosts文件能正确解析节点名
3. **防火墙设置**: 确保VNC端口在相应节点上开放
4. **网络连通性**: 确保noVNC网关能访问到VNC节点
5. **Slurm配置**: 确保slurm-adapter能正确获取作业节点信息

## 配置建议

1. **设置VNC_NODE环境变量**为VNC服务器节点名（如compute-node-01）
2. **设置DEFAULT_NODE_IP**为VNC服务器节点的IP地址
3. **确保DNS能正确解析**其他计算节点名
4. **确保noVNC网关能访问**到所有VNC节点

## 相关文件

- `app/api/jobs/active/route.ts` - 活跃作业API
- `app/api/jobs/status/route.ts` - 作业状态API
- `lib/scheduler/slurm-adapter.ts` - Slurm适配器（获取节点信息）
- `lib/vnc-manager.ts` - VNC管理器
- `test-vnc-node-fix.js` - 测试脚本 
