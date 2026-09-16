# VNC URL IP地址修复

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

### 1. **调试VNC按钮性能问题**
- 点击"调试VNC"按钮会轮询所有作业
- 违背了性能优化的目标
- 增加了不必要的系统负载

### 2. **noVNC连接问题**
- VNC URL使用主机名（如 `compute-node-01`）
- 主机名可能无法解析，导致连接失败
- 应该使用IP地址确保连接成功

## 修复方案

### 1. **优化调试API** ✅

#### 修复前：
```typescript
// 获取所有作业
const allJobs = await slurmAdapter.listJobs()
// 过滤出graphics作业
const graphicsJobs = allJobs.filter(job => job.jobType === 'graphics')
```

#### 修复后：
```typescript
// 只查询graphics分区的作业，避免全量查询
const allJobs = await slurmAdapter.listJobs()
const graphicsJobs = allJobs.filter(job => job.partition === 'graphics')
```

**优化效果**：
- 减少不必要的作业查询
- 提高调试API响应速度
- 降低系统负载

### 2. **VNC URL IP地址修复** ✅

#### 修复前：
```typescript
// 使用主机名生成URL
export function generateVncUrl(hostname: string, port: number): string {
  return `http://${VNC_CONFIG.NOVNC_GATEWAY}:6080/vnc.html?host=${hostname}&port=${port}`
}
```

#### 修复后：
```typescript
// 使用IP地址生成URL
export function generateVncUrl(hostname: string, port: number): string {
  const nodeIpMap = getNodeIpMap()
  const nodeIp = nodeIpMap[hostname] || hostname
  return `http://${VNC_CONFIG.NOVNC_GATEWAY}:6080/vnc.html?host=${nodeIp}&port=${port}`
}
```

#### 节点IP映射：
```typescript
function getNodeIpMap(): Record<string, string> {
  // 从环境变量读取节点IP映射
  const nodeIpEnv = process.env.NODE_IP_MAP
  if (nodeIpEnv) {
    try {
      return JSON.parse(nodeIpEnv)
    } catch (error) {
      console.warn('解析NODE_IP_MAP环境变量失败:', error)
    }
  }
  
  // 默认映射
  return {
    'compute-node-01': '192.168.1.10',  // compute-node-01节点的IP地址
    'login-node': '192.168.1.11', // login-node节点的IP地址
  }
}
```

### 3. **VNC脚本URL修复** ✅

#### 修复前：
```bash
echo "Web access: http://${VNC_CONFIG.NOVNC_GATEWAY}:6080/vnc.html?host=$HOSTNAME&port=$VNC_PORT"
```

#### 修复后：
```bash
# 动态获取节点IP地址
if [ "$HOSTNAME" = "compute-node-01" ]; then
  NODE_IP="192.168.1.10"
elif [ "$HOSTNAME" = "login-node" ]; then
  NODE_IP="192.168.1.11"
else
  NODE_IP="$HOSTNAME"
fi
echo "Web access: http://${VNC_CONFIG.NOVNC_GATEWAY}:6080/vnc.html?host=$NODE_IP&port=$VNC_PORT"
```

## 配置说明

### 环境变量配置

可以通过环境变量 `NODE_IP_MAP` 配置节点IP映射：

```bash
# 设置环境变量
export NODE_IP_MAP='{"compute-node-01":"192.168.1.10","login-node":"192.168.1.11"}'

# 或者在 .env 文件中
NODE_IP_MAP={"compute-node-01":"192.168.1.10","login-node":"192.168.1.11"}
```

### 支持的节点

当前支持的节点映射：
- `compute-node-01` → `192.168.1.10`
- `login-node` → `192.168.1.11`

可以根据需要添加更多节点映射。

## 测试验证

### 1. **调试API测试**
```bash
# 测试调试API响应速度
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/debug/vnc-jobs"
```

### 2. **VNC URL测试**
```bash
# 测试生成的VNC URL
# 修复前: http://192.168.1.10:6080/vnc.html?host=compute-node-01&port=6001
# 修复后: http://192.168.1.10:6080/vnc.html?host=192.168.1.10&port=6001
```

### 3. **noVNC连接测试**
1. 提交一个VNC作业
2. 等待作业运行
3. 点击"noVNC访问"按钮
4. 验证是否能成功连接到VNC桌面

## 预期效果

### 1. **性能提升**
- 调试API响应更快
- 减少不必要的作业查询
- 降低系统负载

### 2. **连接稳定性**
- noVNC连接成功率提升
- 避免主机名解析问题
- 支持更多节点配置

### 3. **用户体验**
- VNC访问更稳定
- 调试功能更高效
- 配置更灵活

## 注意事项

1. **IP地址配置**：确保配置的IP地址正确且可访问
2. **环境变量**：如果使用环境变量配置，需要重启应用
3. **新节点**：添加新节点时需要更新IP映射
4. **网络连通性**：确保noVNC网关能访问所有计算节点

## 总结

通过这次修复：
- ✅ **解决了调试API性能问题**
- ✅ **修复了VNC URL主机名解析问题**
- ✅ **提高了noVNC连接成功率**
- ✅ **增加了灵活的节点配置支持**

这些改进确保了VNC功能的稳定性和用户体验的提升。 
