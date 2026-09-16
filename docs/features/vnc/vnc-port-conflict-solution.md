# VNC端口冲突问题解决方案

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 问题描述

用户提交VNC作业后，作业提交成功但VNC服务器无法正常启动，出现以下错误：

```
WARNING: vtdev:101 is taken because of /tmp/.X101-lock
Remove this file if there is no X server vtdev:101
A VNC server is already running as :101
** (mate-session:3522929): WARNING **: 22:59:20.751: Cannot open display:
```

## 问题分析

### 根本原因
1. **锁文件残留**：之前的VNC会话没有正确清理，导致锁文件`/tmp/.X101-lock`仍然存在
2. **端口冲突**：新作业尝试使用已被占用的`:101`端口
3. **数据库状态不同步**：数据库显示作业已完成，但实际的VNC进程和锁文件仍然存在
4. **端口分配逻辑缺陷**：原有的端口分配逻辑只依赖数据库状态，没有实时检查节点上的实际占用情况

### 影响范围
- VNC作业无法正常启动
- 用户无法访问VNC桌面
- 系统资源浪费（端口被占用但无法使用）

## 解决方案

### 1. 立即清理（已执行）

#### VNC会话清理脚本
创建并执行了`scripts/cleanup-vnc-sessions.sh`脚本：

```bash
# 清理VNC进程
ps aux | grep -E "vncserver|Xvnc|TurboVNC" | grep -v grep

# 清理X锁文件
ls /tmp/.X*-lock
rm -f /tmp/.X101-lock /tmp/.X102-lock /tmp/.X103-lock ...

# 清理X11 socket文件
ls /tmp/.X11-unix/X*
rm -f /tmp/.X11-unix/X101 /tmp/.X11-unix/X102 ...

# 检查端口占用
netstat -tlnp | grep ":59"
```

#### 清理结果
- ✅ 清理了7个残留的X锁文件
- ✅ 清理了7个残留的X11 socket文件
- ✅ 确认无VNC进程残留
- ✅ 确认无VNC端口占用

### 2. 改进端口分配逻辑

#### 实时端口检查
在`lib/vnc-manager.ts`中添加了`checkVtdevOccupiedDisplays()`函数：

```typescript
// 检查vtdev节点上实际占用的display号
async function checkVtdevOccupiedDisplays(): Promise<number[]> {
  // 1. 检查X锁文件
  const { stdout: lockFiles } = await execFileAsync('ssh', ['vtdev', 'ls', '/tmp/.X*-lock'])
  
  // 2. 检查X11 socket文件
  const { stdout: socketFiles } = await execFileAsync('ssh', ['vtdev', 'ls', '/tmp/.X11-unix/X*'])
  
  // 3. 检查VNC端口占用
  const { stdout: vncPorts } = await execFileAsync('ssh', ['vtdev', 'netstat', '-tlnp | grep ":59"'])
  
  return occupiedDisplays
}
```

#### 改进的分配逻辑
```typescript
export async function getNextDisplay(): Promise<number> {
  // 1. 获取数据库中的活跃作业
  const activeDisplays = await getActiveDisplaysFromDb()
  
  // 2. 实时检查vtdev节点上的端口占用
  const occupiedDisplays = await checkVtdevOccupiedDisplays()
  
  // 3. 合并所有被占用的display号
  const allOccupiedDisplays = Array.from(new Set([...activeDisplays, ...occupiedDisplays]))
  
  // 4. 寻找最小可用的display号
  for (let display = 101; display <= 999; display++) {
    if (!allOccupiedDisplays.includes(display)) {
      return display
    }
  }
}
```

### 3. 测试验证

#### 端口分配测试脚本
创建了`scripts/test-vnc-port-allocation.js`用于验证端口分配逻辑：

```bash
node scripts/test-vnc-port-allocation.js
```

#### 测试结果
- ✅ 正确识别被占用的端口
- ✅ 成功分配可用端口（Display: 104）
- ✅ 生成正确的VNC访问URL

## 预防措施

### 1. 端口预检查（推荐）
在VNC程序启动前进行端口预检查，避免冲突：

```bash
# 端口预检查函数
check_port_availability() {
  local display_num=$1
  local port=$((5900 + display_num))
  
  echo "检查端口可用性: display :${display_num}, port ${port}"
  
  # 检查X锁文件
  if [ -f "/tmp/.X${display_num}-lock" ]; then
    echo "错误: X锁文件 /tmp/.X${display_num}-lock 已存在"
    return 1
  fi
  
  # 检查X11 socket文件
  if [ -S "/tmp/.X11-unix/X${display_num}" ]; then
    echo "错误: X11 socket /tmp/.X11-unix/X${display_num} 已存在"
    return 1
  fi
  
  # 检查端口占用
  if netstat -tlnp 2>/dev/null | grep -q ":${port} "; then
    echo "错误: 端口 ${port} 已被占用"
    return 1
  fi
  
  # 检查VNC进程
  if pgrep -f "vncserver.*:${display_num}" > /dev/null; then
    echo "错误: VNC进程 display :${display_num} 正在运行"
    return 1
  fi
  
  echo "端口检查通过: display :${display_num}, port ${port}"
  return 0
}

# 执行端口预检查
if ! check_port_availability ${display}; then
  echo "端口 ${display} 不可用，尝试清理后重试..."
  cleanup_existing_vnc ${display}
  
  # 再次检查
  if ! check_port_availability ${display}; then
    echo "错误: 端口 ${display} 仍然不可用，无法启动VNC服务器"
    exit 1
  fi
fi
```

**优势**：
- ✅ **实时检查**：在启动前检查端口状态
- ✅ **自动清理**：发现冲突时自动清理残留资源
- ✅ **无需定时任务**：按需检查，资源消耗更少
- ✅ **用户友好**：提供清晰的错误信息和解决建议

### 2. 定期清理（备用方案）
- 设置定时任务定期执行VNC清理脚本
- 监控VNC进程和锁文件状态

### 2. 改进VNC脚本
在VNC作业脚本中加强清理机制：

```bash
# 定义清理函数
cleanup_vnc() {
  echo "正在清理VNC会话: display :${display}"
  ${VNC_CONFIG.TURBO_VNC_PATH}vncserver -kill :${display} 2>/dev/null || true
  rm -rf /tmp/.X11-unix/X${display} 2>/dev/null || true
  rm -rf /tmp/.X${display}-lock 2>/dev/null || true
  exit 0
}

# 设置信号处理
trap cleanup_vnc SIGTERM SIGINT
```

### 3. 监控告警
- 监控VNC端口占用情况
- 设置端口冲突告警
- 定期检查锁文件状态

### 4. 用户限制
- 限制每个用户同时运行的VNC作业数量
- 提供VNC会话管理界面

## 技术改进

### 1. 端口分配算法
- **实时检查**：不仅依赖数据库状态，还实时检查节点上的实际占用
- **多重验证**：检查锁文件、socket文件、端口占用等多个维度
- **智能分配**：优先使用低号码端口，提高资源利用率

### 2. 错误处理
- **优雅降级**：当检查失败时，回退到数据库状态
- **详细日志**：记录端口分配过程，便于问题排查
- **用户友好**：提供清晰的错误信息和解决建议

### 3. 性能优化
- **缓存机制**：缓存端口占用状态，减少SSH调用
- **批量检查**：一次性检查多个端口状态
- **异步处理**：并行处理多个检查任务

## 部署建议

### 1. 生产环境（推荐端口预检查）
```bash
# 端口预检查已集成到VNC脚本中，无需额外配置

# 可选：设置监控脚本（备用）
*/5 * * * * /opt/my-hpcapp/scripts/monitor-vnc-ports.sh

# 可选：定期清理（备用）
0 */6 * * * /opt/my-hpcapp/scripts/cleanup-vnc-sessions.sh
```

### 2. 开发环境
```bash
# 测试端口预检查功能
./scripts/test-vnc-port-precheck.sh

# 测试端口分配逻辑
node scripts/test-vnc-port-allocation.js

# 手动清理（如需要）
./scripts/cleanup-vnc-sessions.sh
```

### 3. 配置优化
```bash
# 环境变量
export VNC_CLEANUP_INTERVAL=3600  # 清理间隔（秒）
export VNC_MAX_SESSIONS=10        # 最大VNC会话数
export VNC_PORT_RANGE="101-999"   # 端口范围
```

## 总结

通过以上措施，成功解决了VNC端口冲突问题：

1. **立即清理**：清理了所有残留的VNC进程和锁文件
2. **逻辑改进**：实现了实时端口检查机制
3. **预防措施**：集成了端口预检查功能，无需定时任务
4. **测试验证**：确保解决方案的可靠性

### 最终解决方案

**端口预检查**是推荐的解决方案，具有以下优势：

- ✅ **主动预防**：在VNC启动前检查端口状态
- ✅ **自动清理**：发现冲突时自动清理残留资源
- ✅ **按需执行**：只在需要时检查，资源消耗更少
- ✅ **用户友好**：提供清晰的错误信息和解决建议
- ✅ **无需维护**：不需要定时任务，减少系统复杂度

现在用户可以正常提交VNC作业，系统会在启动前自动检查端口状态，避免冲突问题。 
