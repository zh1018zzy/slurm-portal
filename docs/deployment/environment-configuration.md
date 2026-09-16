# 环境配置指南 - 多环境兼容

> 适用范围：部署流程、环境配置与发布运维
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

本系统已重构为支持多种环境部署，不再依赖硬编码的IP地址。通过环境变量和配置文件，可以轻松适配不同的集群环境。

## 环境变量配置

### 1. **noVNC 网关配置**

```bash
# noVNC 网关地址（必需）
export NOVNC_GATEWAY="your-novnc-gateway-ip"

# noVNC 端口（可选，默认6080）
export NOVNC_PORT="6080"

# TurboVNC 路径（可选，默认/opt/TurboVNC/bin/）
export TURBO_VNC_PATH="/opt/TurboVNC/bin/"
```

### 2. **节点IP映射配置**

#### 方法1：环境变量（推荐）
```bash
# JSON格式的节点IP映射
export NODE_IP_MAP='{"node1":"192.168.1.10","node2":"192.168.1.11","gpu-node":"192.168.1.20"}'
```

#### 方法2：配置文件
```bash
# 配置文件路径（可选，默认/etc/hpcapp/node-ip-map.json）
export NODE_IP_CONFIG_PATH="/etc/hpcapp/node-ip-map.json"
```

配置文件内容：
```json
{
  "node1": "192.168.1.10",
  "node2": "192.168.1.11", 
  "gpu-node": "192.168.1.20",
  "compute-01": "192.168.1.30",
  "compute-02": "192.168.1.31"
}
```

#### 方法3：默认IP（回退方案）
```bash
# 当无法找到具体节点映射时使用的默认IP
export DEFAULT_NODE_IP="192.168.1.100"
```

## 部署场景

### 1. **开发环境**

```bash
# .env.local
NOVNC_GATEWAY="localhost"
NOVNC_PORT="6080"
NODE_IP_MAP='{"localhost":"127.0.0.1"}'
```

### 2. **单节点集群**

```bash
# .env.production
NOVNC_GATEWAY="192.168.1.100"
NOVNC_PORT="6080"
DEFAULT_NODE_IP="192.168.1.100"
```

### 3. **多节点集群**

```bash
# .env.production
NOVNC_GATEWAY="192.168.1.100"
NOVNC_PORT="6080"
NODE_IP_MAP='{"compute-01":"192.168.1.10","compute-02":"192.168.1.11","gpu-01":"192.168.1.20"}'
```

### 4. **云环境部署**

```bash
# .env.cloud
NOVNC_GATEWAY="your-load-balancer-ip"
NOVNC_PORT="6080"
NODE_IP_MAP='{"worker-1":"10.0.1.10","worker-2":"10.0.1.11","gpu-worker":"10.0.1.20"}'
```

## 动态IP发现

系统支持多种IP发现方式，按优先级排序：

### 1. **环境变量配置** ⭐⭐⭐⭐⭐
- 最可靠，推荐生产环境使用
- 支持JSON格式的节点映射

### 2. **配置文件** ⭐⭐⭐⭐
- 便于管理大量节点
- 支持热更新（重启应用后生效）

### 3. **动态DNS解析** ⭐⭐⭐
- 自动通过nslookup/dig解析节点IP
- 适用于有DNS配置的环境

### 4. **hostname解析** ⭐⭐
- 使用hostname -I获取本地IP
- 适用于单节点或简单环境

### 5. **默认回退** ⭐
- 使用hostname作为IP
- 最后的安全网

## 配置验证

### 1. **检查环境变量**
```bash
# 检查noVNC配置
echo "NOVNC_GATEWAY: $NOVNC_GATEWAY"
echo "NOVNC_PORT: $NOVNC_PORT"

# 检查节点IP映射
echo "NODE_IP_MAP: $NODE_IP_MAP"
```

### 2. **测试VNC连接**
```bash
# 测试noVNC网关可访问性
curl -I "http://$NOVNC_GATEWAY:$NOVNC_PORT/vnc.html"

# 测试节点IP解析
nslookup your-node-name
```

### 3. **应用日志检查**
```bash
# 查看VNC管理器日志
tail -f /var/log/hpcapp/app.log | grep "VNC Manager"
```

## 故障排除

### 1. **VNC URL生成失败**

**症状：** 作业运行但无法生成VNC URL

**解决方案：**
```bash
# 检查节点IP映射
echo $NODE_IP_MAP

# 手动测试IP解析
nslookup your-node-name

# 检查配置文件
cat /etc/hpcapp/node-ip-map.json
```

### 2. **noVNC连接失败**

**症状：** 点击VNC按钮但无法连接

**解决方案：**
```bash
# 检查noVNC网关
curl -I "http://$NOVNC_GATEWAY:$NOVNC_PORT/vnc.html"

# 检查防火墙
iptables -L | grep 6080

# 检查网络连通性
ping $NOVNC_GATEWAY
```

### 3. **动态IP发现失败**

**症状：** 日志显示"动态发现节点IP失败"

**解决方案：**
```bash
# 检查sinfo命令
sinfo -h -o %N

# 检查hostname命令
hostname -I

# 检查DNS工具
which nslookup
which dig
```

## 最佳实践

### 1. **生产环境配置**
```bash
# 使用环境变量配置，避免硬编码
export NOVNC_GATEWAY="your-gateway-ip"
export NODE_IP_MAP='{"node1":"ip1","node2":"ip2"}'

# 使用配置文件管理大量节点
echo '{"node1":"ip1","node2":"ip2"}' > /etc/hpcapp/node-ip-map.json
```

### 2. **开发环境配置**
```bash
# 简化配置，使用localhost
export NOVNC_GATEWAY="localhost"
export NODE_IP_MAP='{"localhost":"127.0.0.1"}'
```

### 3. **容器化部署**
```dockerfile
# Dockerfile
ENV NOVNC_GATEWAY="your-gateway-ip"
ENV NODE_IP_MAP='{"node1":"ip1","node2":"ip2"}'
```

```yaml
# docker-compose.yml
environment:
  - NOVNC_GATEWAY=your-gateway-ip
  - NODE_IP_MAP={"node1":"ip1","node2":"ip2"}
```

### 4. **Kubernetes部署**
```yaml
# deployment.yaml
env:
- name: NOVNC_GATEWAY
  value: "your-gateway-ip"
- name: NODE_IP_MAP
  value: '{"node1":"ip1","node2":"ip2"}'
```

## 迁移指南

### 从硬编码配置迁移

1. **备份当前配置**
```bash
# 记录当前的硬编码IP
echo "当前配置:"
echo "NOVNC_GATEWAY: 192.168.31.130"
echo "节点映射: vtdev->192.168.31.130, haomgt->192.168.31.100"
```

2. **设置环境变量**
```bash
export NOVNC_GATEWAY="192.168.31.130"
export NODE_IP_MAP='{"vtdev":"192.168.31.130","haomgt":"192.168.31.100"}'
```

3. **验证配置**
```bash
# 重启应用
npm run dev

# 检查日志
tail -f logs/app.log | grep "VNC Manager"
```

4. **测试功能**
- 提交一个图形作业
- 检查VNC URL生成
- 测试noVNC连接

## 总结

通过这种配置方式，系统现在可以：

✅ **支持多种环境** - 开发、测试、生产环境  
✅ **动态IP发现** - 自动解析节点IP地址  
✅ **灵活配置** - 环境变量、配置文件多种方式  
✅ **向后兼容** - 保持原有功能不变  
✅ **易于维护** - 集中管理配置信息  

现在可以轻松部署到任何新环境，只需配置相应的环境变量即可！🎉 
