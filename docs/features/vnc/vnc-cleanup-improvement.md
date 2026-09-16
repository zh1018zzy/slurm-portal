# VNC 清理功能改进

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 问题描述

在关闭 VNC 作业时，服务端出现错误提示：
```
sudo: /opt/TurboVNC/bin/vncserver: command not found
```

这是因为 VNC 清理命令在 API 服务器上执行，但 VNC 进程实际运行在计算节点上。

## 解决方案

### 1. VNC 脚本信号处理

在 VNC 脚本中添加信号处理，确保作业取消时自动清理 VNC 会话：

```bash
# 定义清理函数
cleanup_vnc() {
  echo "正在清理VNC会话: display :${display}"
  ${VNC_CONFIG.TURBO_VNC_PATH}vncserver -kill :${display} 2>/dev/null || true
  rm -rf /tmp/.X11-unix/X${display} 2>/dev/null || true
  rm -rf /tmp/.X${display}-lock 2>/dev/null || true
  exit 0
}

# 设置信号处理，确保作业取消时清理VNC
trap cleanup_vnc SIGTERM SIGINT
```

### 2. 备用清理机制

通过 SSH 在计算节点上执行清理命令作为备用方案：

```typescript
// 通过 SSH 在指定节点上执行清理命令（备用方案）
const cleanupCommand = `export PATH=$PATH:${VNC_CONFIG.TURBO_VNC_PATH}; ${VNC_CONFIG.TURBO_VNC_PATH}vncserver -kill :${display} 2>/dev/null || true; rm -rf /tmp/.X11-unix/X${display} 2>/dev/null || true; rm -rf /tmp/.X${display}-lock 2>/dev/null || true; echo "VNC会话清理完成: display :${display}"`

await execFileAsync('ssh', [nodeName, cleanupCommand])
```

### 3. 改进的取消作业流程

在 `slurm-adapter.ts` 中，取消作业时传递节点信息：

```typescript
// 如果是graphics作业，清理VNC会话
if (jobInfo.jobType === 'graphics' && jobInfo.vncDisplay && jobInfo.nodes && jobInfo.nodes.length > 0) {
  const nodeName = jobInfo.nodes[0] // 使用第一个节点
  await cleanupVncSession(jobInfo.user, jobInfo.vncDisplay, nodeName)
}
```

## 清理流程

1. **用户点击取消作业**
2. **Slurm 发送 SIGTERM 信号给作业**
3. **VNC 脚本的信号处理函数自动执行清理**
4. **备用方案：通过 SSH 在计算节点上执行清理命令**
5. **作业完全终止，VNC 会话清理完成**

## 测试

运行测试脚本检查环境配置：

```bash
./test-vnc-cleanup.sh
```

## 优势

- ✅ **自动清理**：VNC 脚本信号处理确保自动清理
- ✅ **备用机制**：SSH 清理作为备用方案
- ✅ **错误容忍**：清理失败不影响作业取消流程
- ✅ **日志记录**：详细的清理过程日志

## 注意事项

1. 确保 SSH 无密码登录到计算节点
2. 确保 TurboVNC 在计算节点上正确安装
3. 清理失败不会阻止作业取消，主要依赖 Slurm 的进程管理 
