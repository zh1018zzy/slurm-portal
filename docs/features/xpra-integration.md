# Xpra 图形作业集成使用说明

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

本系统集成了 Xpra 图形作业提交功能，允许用户通过 Web 界面提交图形应用程序作业，并通过浏览器访问 Linux 图形界面。

## 功能特性

- ✅ **自定义应用管理**：支持添加、编辑、删除自定义应用
- ✅ **端口自动分配**：从 14500 开始自动分配端口
- ✅ **桌面号管理**：从 100 开始自动分配桌面号
- ✅ **作业状态监控**：实时监控作业状态和节点信息
- ✅ **Web 桌面访问**：通过浏览器直接访问图形界面
- ✅ **Slurm 集成**：与 Slurm 调度系统无缝集成

## 系统要求

### 服务端要求

1. **Xpra 安装**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install xpra
   
   # CentOS/RHEL
   sudo yum install xpra
   
   # 或从源码编译
   pip install xpra
   ```

2. **Slurm 调度系统**
   - 确保 Slurm 已正确配置
   - 节点上已安装 Xpra

3. **网络配置**
   - 确保计算节点端口（14500-14999）可访问
   - 建议配置防火墙规则

### 客户端要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 支持 WebSocket 连接

## 使用方法

### 1. 访问图形作业页面

登录系统后，导航到 `/dashboard/applications` 页面。

### 2. 提交图形作业

#### 选择预定义应用

1. 在"提交作业"标签页中，选择预定义的应用（如 xterm、gedit、firefox 等）
2. 点击"提交 [应用名] 作业"按钮
3. 系统会自动分配端口和桌面号，并提交到 Slurm

#### 添加自定义应用

1. 点击"添加自定义应用"按钮
2. 填写应用信息：
   - **应用名称**：应用的显示名称
   - **应用命令**：启动应用的命令（如 `matlab`、`gaussian`）
   - **应用描述**：应用的功能描述
   - **应用分类**：选择应用所属分类
3. 点击"提交作业"按钮

### 3. 管理作业

在"作业管理"标签页中：

- **查看作业状态**：实时显示作业运行状态
- **访问桌面**：点击"访问桌面"按钮在新窗口打开图形界面
- **取消作业**：对于等待中的作业可以取消

### 4. 访问图形界面

当作业状态为"运行中"时：

1. 点击"访问桌面"按钮
2. 浏览器会打开新窗口，显示 Xpra Web 客户端
3. 在 Web 界面中可以直接操作 Linux 图形应用程序

## API 接口

### 提交图形作业

```http
POST /api/applications
Content-Type: application/json

{
  "appName": "matlab",
  "appCommand": "matlab",
  "userId": "username"
}
```

### 获取作业状态

```http
GET /api/applications?jobId=12345
```

### 获取应用列表

```http
GET /api/applications/apps
```

### 添加自定义应用

```http
POST /api/applications/apps
Content-Type: application/json

{
  "name": "matlab",
  "command": "matlab",
  "description": "MATLAB 科学计算软件",
  "category": "科学计算",
  "createdBy": "username"
}
```

## 配置说明

### 端口分配

- 起始端口：14500
- 端口范围：14500-14999
- 自动分配：系统自动选择可用端口

### 桌面号分配

- 起始桌面号：100
- 自动分配：系统自动选择可用桌面号

### Slurm 配置

作业脚本模板位于 `app/api/applications/route.ts` 中的 `generateSlurmScript` 函数：

```bash
#!/bin/bash
#SBATCH --job-name=xpra-${appName}
#SBATCH --output=xpra-${appName}-%j.out
#SBATCH --error=xpra-${appName}-%j.err
#SBATCH --partition=compute
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=1
#SBATCH --mem=2G
#SBATCH --time=02:00:00
#SBATCH --export=ALL

export DISPLAY=:${display}

xpra start :${display} \
  --bind-tcp=0.0.0.0:${port} \
  --html=on \
  --start-child="${appCommand}" \
  --daemon=no \
  --exit-with-children=yes
```

## 安全考虑

### 1. 网络安全

- 建议使用反向代理（如 Nginx）统一管理端口访问
- 配置防火墙规则，限制端口访问范围
- 使用 HTTPS/WSS 加密传输

### 2. 认证授权

- 确保只有授权用户可以提交作业
- 考虑为 Xpra 连接添加 token 认证
- 定期清理过期作业

### 3. 资源限制

- 设置合理的作业时间限制
- 监控系统资源使用情况
- 限制并发作业数量

## 故障排除

### 常见问题

1. **作业提交失败**
   - 检查 Slurm 服务状态
   - 确认节点上已安装 Xpra
   - 查看作业输出日志

2. **无法访问图形界面**
   - 确认作业状态为"运行中"
   - 检查节点网络连接
   - 验证端口是否开放

3. **Xpra 启动失败**
   - 检查 Xpra 安装状态
   - 确认显示环境配置
   - 查看 Xpra 日志

### 日志查看

```bash
# 查看 Slurm 作业日志
cat xpra-appname-<jobid>.out
cat xpra-appname-<jobid>.err

# 查看 Xpra 日志
xpra info :<display>
```

## 扩展功能

### 1. 应用模板

可以扩展预定义应用列表，添加更多常用应用：

```typescript
const DEFAULT_APPS: AppConfig[] = [
  // ... 现有应用
  {
    name: 'matlab',
    command: 'matlab',
    description: 'MATLAB 科学计算软件',
    category: '科学计算'
  },
  {
    name: 'gaussian',
    command: 'gaussian',
    description: 'Gaussian 量子化学软件',
    category: '科学计算'
  }
]
```

### 2. 资源监控

可以添加资源使用监控功能：

- CPU 使用率
- 内存使用情况
- GPU 使用率（如果适用）

### 3. 会话管理

可以添加会话管理功能：

- 会话持久化
- 多用户会话隔离
- 会话恢复功能

## 技术支持

如遇到问题，请：

1. 查看系统日志
2. 检查网络连接
3. 确认软件安装状态
4. 联系系统管理员 
