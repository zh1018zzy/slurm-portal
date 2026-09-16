# noVNC 配置修复

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

VNC 作业已运行，但 noVNC 无法连接桌面：
- URL: `http://192.168.31.130:6080/vnc.html?host=vtdev&port=6001`
- 状态：页面可以访问（HTTP 200），但无法连接 VNC 服务

## 问题分析

### 1. VNC 服务状态
- ✅ VNC 服务正常运行在 vtdev 节点
- ✅ 端口 6001 正常监听
- ✅ 网络连接正常（telnet 测试通过）

### 2. noVNC 配置问题
发现 noVNC 是通过 Docker 容器运行的：
```bash
$ docker ps | grep novnc
74459626eb9f   theasp/novnc   "/app/entrypoint.sh"   2 weeks ago   Up 4 hours   
          0.0.0.0:6080->8080/tcp, [::]:6080->8080/tcp   novnc
```

### 3. websockify 配置错误
Docker 容器内的 websockify 配置错误：
```bash
# 错误配置
command=websockify --web /usr/share/novnc 8080 localhost:5900

# 正确配置
command=websockify --web /usr/share/novnc 8080 localhost:6001
```

**问题根源**：websockify 代理到错误的端口（5900 而不是 6001）

## 解决方案

### 1. 修改 Docker 容器配置

```bash
# 进入容器修改配置文件
docker exec novnc sed -i 's/localhost:5900/localhost:6001/g' /app/conf.d/websockify.conf

# 验证修改
docker exec novnc cat /app/conf.d/websockify.conf
```

### 2. 重启 Docker 容器

```bash
docker restart novnc
```

### 3. 验证修复

```bash
# 测试 HTTP 访问
curl -s -o /dev/null -w "%{http_code}" "http://192.168.31.130:6080/vnc.html?host=vtdev&port=6001"
# 返回: 200

# 测试 VNC 连接
telnet vtdev 6001
# 返回: RFB 003.008 (VNC 协议握手)
```

## 修复效果

修复后，noVNC 应该能够：
- ✅ **正确代理到 VNC 服务端口 6001**
- ✅ **建立 WebSocket 连接**
- ✅ **显示 VNC 桌面内容**
- ✅ **前端显示"noVNC访问"按钮**

## 技术细节

### Docker 容器架构
```
外部访问: 192.168.31.130:6080
    ↓ (端口映射)
Docker 容器: localhost:8080
    ↓ (websockify 代理)
VNC 服务: localhost:6001
```

### 配置文件位置
- **websockify 配置**: `/app/conf.d/websockify.conf`
- **supervisor 配置**: `/app/supervisord.conf`

### 端口映射
- **外部端口**: 6080
- **容器端口**: 8080
- **VNC 端口**: 6001

## 相关文件

- `lib/scheduler/slurm-adapter.ts` - VNC URL 生成逻辑
- `lib/vnc-manager.ts` - VNC 管理配置
- `app/api/vnc-config/route.ts` - VNC 配置 API

## 注意事项

1. **端口一致性**：确保 VNC 服务端口与 websockify 代理端口一致
2. **容器重启**：修改配置后需要重启 Docker 容器
3. **网络连通性**：确保 Docker 容器可以访问主机网络
4. **防火墙设置**：确保端口 6080 对外可访问 
