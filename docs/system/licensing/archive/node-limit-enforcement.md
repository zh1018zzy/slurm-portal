# 节点限制强制执行系统

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

节点限制强制执行系统是一个自动化的许可证合规性监控和强制执行服务，确保SLURM集群的节点数量不超过许可证限制。

## 系统架构

### 核心组件

1. **NodeLimitEnforcer服务** (`/lib/license/node-limit-enforcer.ts`)
   - 定期监控节点数量
   - 自动下线超限节点
   - 智能恢复机制

2. **API管理接口** (`/api/license/nodes/enforce`)
   - 服务状态查询
   - 服务启动/停止控制
   - 手动触发合规检查

3. **自动启动机制** (`instrumentation.ts`)
   - 应用启动时自动启动服务
   - 确保服务持续运行

## 工作原理

### 1. 定期合规检查
- **检查频率**: 每60分钟自动执行一次
- **检查内容**: 
  - 通过 `sinfo -h -N -o "%N" | wc -l` 获取当前节点数
  - 与许可证限制比较
  - 判断是否超出限制

### 2. 自动节点下线
当节点数超出许可证限制时：
- **选择策略**: 优先选择IDLE状态的节点
- **下线命令**: `scontrol update NodeName=<node> State=DOWN Reason="License limit exceeded - Auto managed"`
- **智能排序**: idle > alloc > mixed > other

### 3. 自动节点恢复
当许可证升级或节点数在限制内时：
- **恢复条件**: 检测到被许可证限制下线的节点
- **恢复命令**: `scontrol update NodeName=<node> State=RESUME`
- **限制检查**: 确保恢复后不超出新的许可证限制

## 技术实现

### 节点数量获取
```typescript
// 直接调用SLURM命令避免API认证问题
const { stdout } = await execAsync('sinfo -h -N -o "%N" | wc -l')
const nodeCount = parseInt(stdout.trim()) || 0
```

### 节点选择算法
```typescript
// 按状态优先级排序
const priorityOrder = ['idle', 'alloc', 'mixed']
availableNodes.sort((a, b) => {
  const aPriority = priorityOrder.indexOf(a.state.toLowerCase())
  const bPriority = priorityOrder.indexOf(b.state.toLowerCase())
  return aPriority - bPriority
})
```

### 许可证标记识别
```typescript
// 识别被许可证限制下线的节点
const LICENSE_DOWN_REASON = 'License limit exceeded - Auto managed'
```

## API接口

### 获取服务状态
```bash
GET /api/license/nodes/enforce
```
响应：
```json
{
  "success": true,
  "data": {
    "running": true,
    "checkInterval": 3600000
  },
  "timestamp": "2025-09-24T04:23:30.000Z"
}
```

### 控制服务
```bash
POST /api/license/nodes/enforce
Content-Type: application/json

{
  "action": "start|stop|trigger"
}
```

### 可用操作
- **start**: 启动定期监控服务
- **stop**: 停止监控服务
- **trigger**: 手动触发一次合规检查

## 许可证限制配置

### 试用版限制
- **最大节点数**: 5个
- **超限行为**: 自动下线多余节点
- **恢复条件**: 升级到商业版

### 商业版限制
- **最大节点数**: 无限制 (-1)
- **超限行为**: 不限制
- **恢复条件**: 自动恢复所有被限制的节点

## 日志和监控

### 日志级别
- **INFO**: 服务启停、合规检查结果
- **DEBUG**: 详细的节点数量获取过程
- **WARN**: SLURM命令执行警告
- **ERROR**: 严重错误和异常

### 关键日志示例
```
[INFO] NodeLimitEnforcer: 启动节点限制监控服务 (checkInterval: 60分钟)
[DEBUG] NodeLimitEnforcer: 获取节点总数: 2
[INFO] NodeLimitEnforcer: 节点下线操作完成 (downedNodes: [node1], reason: 许可证限制)
[INFO] NodeLimitEnforcer: 恢复被许可证限制的节点 (recoveredNodes: [node1], count: 1)
```

## 故障处理

### 常见问题

1. **SLURM命令失败**
   - 检查SLURM服务状态
   - 确认命令权限
   - 查看详细错误日志

2. **节点状态异常**
   - 检查节点物理状态
   - 确认网络连接
   - 手动恢复节点状态

3. **许可证检查失败**
   - 验证许可证文件完整性
   - 检查许可证服务状态
   - 重启强制执行服务

### 手动操作命令

```bash
# 查看被许可证限制的节点
sinfo -h -N -o "%N|%t|%E" | grep "License limit exceeded"

# 手动恢复节点
scontrol update NodeName=<node> State=RESUME

# 手动下线节点
scontrol update NodeName=<node> State=DOWN Reason="Manual maintenance"
```

## 最佳实践

### 1. 监控建议
- 定期检查日志确保服务正常运行
- 监控节点状态变化
- 设置告警机制

### 2. 维护建议
- 在系统维护时临时停止强制执行服务
- 升级许可证后验证节点恢复
- 定期备份关键配置

### 3. 性能优化
- 合理设置检查间隔
- 避免在高峰期执行大量节点操作
- 监控服务资源使用情况

## 安全考虑

### 权限控制
- 服务运行需要SLURM管理员权限
- API接口需要适当的访问控制
- 操作日志需要妥善保存

### 数据保护
- 许可证信息加密存储
- 敏感操作记录审计日志
- 防止未授权的服务控制

## 版本历史

### v1.0.0 (2025-09-24)
- 初始版本发布
- 实现基础的节点限制强制执行
- 支持自动下线和恢复机制
- 提供API管理接口

### 特性
- ✅ 定期合规检查 (每小时)
- ✅ 智能节点选择 (优先IDLE)
- ✅ 自动节点恢复
- ✅ API控制接口
- ✅ 详细日志记录
- ✅ 故障容错机制

---

更多技术细节请参考源代码注释和相关API文档。
