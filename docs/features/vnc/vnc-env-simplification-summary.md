# VNC环境变量简化总结

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 修复概述

本次修复完全移除了 `VNC_NODE` 环境变量的使用，简化了VNC配置，统一使用 `DEFAULT_VNC_NODE_IP` 来指定VNC节点的IP地址。

## 主要变更

### 1. 移除的环境变量
- **VNC_NODE**: 不再需要指定VNC节点的主机名

### 2. 保留的环境变量
- **DEFAULT_VNC_NODE_IP**: VNC节点的IP地址（如：192.168.1.10）
- **NOVNC_GATEWAY**: noVNC网关地址（如：10.0.0.201）
- **NOVNC_PORT**: noVNC网关端口（默认：6080）
- **TURBO_VNC_PATH**: TurboVNC安装路径

### 3. 代码修改

#### lib/vnc-manager.ts
- `checkVtdevOccupiedDisplays()` 函数：使用 `DEFAULT_VNC_NODE_IP` 替代硬编码的 `compute-node-01` 主机名
- SSH连接直接使用IP地址而不是主机名

#### API路由文件
- `app/api/jobs/active/route.ts`
- `app/api/jobs/status/route.ts`
- `app/api/vnc/jobs/realtime/route.ts`
- `app/api/debug/vnc-url/route.ts`
- `app/api/vnc-config/route.ts`

**修改内容**：
- 移除对 `compute-node-01` 主机名的检查
- 直接使用 `DEFAULT_VNC_NODE_IP` 作为VNC节点的IP地址
- 简化VNC URL生成逻辑

#### 测试文件
- `test-vnc-debug.js`
- `test-api-fix.js`
- `test-vnc-env-fix.js`

**修改内容**：
- 移除硬编码的 `192.168.1.10`，使用 `localhost` 作为默认值
- 更新测试逻辑，移除对 `compute-node-01` 主机名的依赖

#### 配置文件
- `env.example`: 移除 `VNC_NODE` 环境变量

## 修复效果

### 修复前
```bash
# 需要配置两个环境变量
VNC_NODE=compute-node-01
DEFAULT_VNC_NODE_IP=192.168.1.10

# 代码中需要检查主机名
if (firstNode === 'compute-node-01') {
  nodeIp = process.env.DEFAULT_VNC_NODE_IP
} else {
  nodeIp = firstNode
}
```

### 修复后
```bash
# 只需要配置一个环境变量
DEFAULT_VNC_NODE_IP=192.168.1.10

# 代码直接使用IP地址
const nodeIp = process.env.DEFAULT_VNC_NODE_IP || 'localhost'
```

## 优势

1. **配置简化**: 只需要配置一个环境变量 `DEFAULT_VNC_NODE_IP`
2. **逻辑清晰**: 不再需要检查主机名，直接使用IP地址
3. **灵活性**: 可以轻松更改VNC节点的IP地址，无需修改代码
4. **一致性**: 所有VNC相关功能都使用同一个IP地址配置

## 测试结果

```
=== VNC环境变量重命名和硬编码清理测试 ===

环境变量:
DEFAULT_VNC_NODE_IP: 192.168.1.10

测试结果:
作业ID | 节点 | 生成的VNC URL
-------|------|---------------
105 | compute01 | http://localhost:6080/vnc.html?host=192.168.1.10&port=6001
107 | compute02 | http://localhost:6080/vnc.html?host=192.168.1.10&port=6003
```

## 配置建议

```bash
# .env 文件配置
DEFAULT_VNC_NODE_IP=192.168.1.10
NOVNC_GATEWAY=10.0.0.201
NOVNC_PORT=6080
TURBO_VNC_PATH=/opt/TurboVNC/bin/
```

## 注意事项

1. 确保 `DEFAULT_VNC_NODE_IP` 指向正确的VNC服务器节点
2. SSH连接现在直接使用IP地址，确保SSH配置支持IP地址连接
3. 如果VNC节点IP发生变化，只需要更新 `DEFAULT_VNC_NODE_IP` 环境变量 
