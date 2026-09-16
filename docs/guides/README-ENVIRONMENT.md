# 🚀 HPC应用环境配置指南

> 适用范围：用户使用与操作指南
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 快速开始

### 1. 自动配置（推荐）

使用提供的配置脚本快速设置环境：

```bash
# 开发环境（localhost）
./scripts/setup-environment.sh -e dev

# 生产环境
./scripts/setup-environment.sh -e prod -g 192.168.1.100

# 交互式配置
./scripts/setup-environment.sh --interactive

# 使用配置文件
./scripts/setup-environment.sh -c config/node-ip-map.example.json
```

### 2. 手动配置

#### 设置环境变量

```bash
# 创建 .env.local 文件
cat > .env.local << EOF
# noVNC配置
NOVNC_GATEWAY="your-gateway-ip"
NOVNC_PORT="6080"

# 节点IP映射
NODE_IP_MAP='{"node1":"192.168.1.10","node2":"192.168.1.11"}'

# 可选配置
TURBO_VNC_PATH="/opt/TurboVNC/bin/"
DEFAULT_NODE_IP="192.168.1.100"
EOF
```

#### 创建节点IP映射文件

```bash
# 创建配置目录
mkdir -p /etc/hpcapp

# 创建节点IP映射文件
cat > /etc/hpcapp/node-ip-map.json << EOF
{
  "node1": "192.168.1.10",
  "node2": "192.168.1.11",
  "gpu-node": "192.168.1.20"
}
EOF
```

## 环境变量说明

| 变量名 | 必需 | 默认值 | 说明 |
|--------|------|--------|------|
| `NOVNC_GATEWAY` | ✅ | `localhost` | noVNC网关IP地址 |
| `NOVNC_PORT` | ❌ | `6080` | noVNC端口 |
| `NODE_IP_MAP` | ❌ | `{}` | JSON格式的节点IP映射 |
| `TURBO_VNC_PATH` | ❌ | `/opt/TurboVNC/bin/` | TurboVNC安装路径 |
| `NODE_IP_CONFIG_PATH` | ❌ | `/etc/hpcapp/node-ip-map.json` | 节点IP映射配置文件路径 |
| `DEFAULT_NODE_IP` | ❌ | - | 默认节点IP（回退方案） |

## 部署场景

### 🏠 开发环境

```bash
# 使用localhost
NOVNC_GATEWAY="localhost"
NODE_IP_MAP='{"localhost":"127.0.0.1"}'
```

### 🏢 单节点集群

```bash
# 使用节点IP
NOVNC_GATEWAY="192.168.1.100"
DEFAULT_NODE_IP="192.168.1.100"
```

### 🏭 多节点集群

```bash
# 配置所有节点
NOVNC_GATEWAY="192.168.1.100"
NODE_IP_MAP='{"compute-01":"192.168.1.10","compute-02":"192.168.1.11","gpu-01":"192.168.1.20"}'
```

### ☁️ 云环境

```bash
# 使用负载均衡器IP
NOVNC_GATEWAY="your-load-balancer-ip"
NODE_IP_MAP='{"worker-1":"10.0.1.10","worker-2":"10.0.1.11"}'
```

## 动态IP发现

系统支持多种IP发现方式，按优先级排序：

1. **环境变量配置** ⭐⭐⭐⭐⭐
   - 最可靠，推荐生产环境使用
   - 支持JSON格式的节点映射

2. **配置文件** ⭐⭐⭐⭐
   - 便于管理大量节点
   - 支持热更新（重启应用后生效）

3. **动态DNS解析** ⭐⭐⭐
   - 自动通过nslookup/dig解析节点IP
   - 适用于有DNS配置的环境

4. **hostname解析** ⭐⭐
   - 使用hostname -I获取本地IP
   - 适用于单节点或简单环境

5. **默认回退** ⭐
   - 使用hostname作为IP
   - 最后的安全网

## 验证配置

### 1. 检查环境变量

```bash
# 检查配置
echo "NOVNC_GATEWAY: $NOVNC_GATEWAY"
echo "NOVNC_PORT: $NOVNC_PORT"
echo "NODE_IP_MAP: $NODE_IP_MAP"
```

### 2. 测试VNC连接

```bash
# 测试noVNC网关
curl -I "http://$NOVNC_GATEWAY:$NOVNC_PORT/vnc.html"

# 测试节点IP解析
nslookup your-node-name
```

### 3. 应用日志检查

```bash
# 查看VNC管理器日志
tail -f logs/app.log | grep "VNC Manager"
```

## 故障排除

### ❌ VNC URL生成失败

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

### ❌ noVNC连接失败

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

### ❌ 动态IP发现失败

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

### 🔧 生产环境

```bash
# 使用环境变量配置，避免硬编码
export NOVNC_GATEWAY="your-gateway-ip"
export NODE_IP_MAP='{"node1":"ip1","node2":"ip2"}'

# 使用配置文件管理大量节点
echo '{"node1":"ip1","node2":"ip2"}' > /etc/hpcapp/node-ip-map.json
```

### 🐳 容器化部署

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

### ☸️ Kubernetes部署

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

✅ **支持多种环境** - 开发、测试、生产环境  
✅ **动态IP发现** - 自动解析节点IP地址  
✅ **灵活配置** - 环境变量、配置文件多种方式  
✅ **向后兼容** - 保持原有功能不变  
✅ **易于维护** - 集中管理配置信息  

现在可以轻松部署到任何新环境，只需配置相应的环境变量即可！🎉

## 相关文档

- [环境配置指南](../deployment/environment-configuration.md) - 详细配置说明
- [VNC集成指南](../features/vnc/VNC_INTEGRATION_GUIDE.md) - VNC功能说明
- [部署指南](../deployment/deployment-guide.md) - 部署相关文档
