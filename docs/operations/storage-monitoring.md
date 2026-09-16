# 集群存储监控功能说明

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 功能概述

集群存储监控功能专门为HPC集群环境设计，用于监控集群共享存储和用户个人存储的使用情况。

## 配置说明

### 存储配置文件

配置文件位置：`config/storage-config.json`

```json
{
  "sharedStorage": {
    "name": "集群共享存储",
    "mountPath": "/shared",
    "description": "集群共享存储空间，供所有用户使用",
    "quotaEnabled": false,
    "warningThreshold": 80,
    "criticalThreshold": 90
  },
  "userStorage": {
    "name": "用户个人存储",
    "mountPath": "/home",
    "description": "用户个人存储空间",
    "quotaEnabled": true,
    "warningThreshold": 75,
    "criticalThreshold": 85
  },
  "scratchStorage": {
    "name": "临时存储",
    "mountPath": "/scratch",
    "description": "高性能临时存储空间",
    "quotaEnabled": false,
    "warningThreshold": 70,
    "criticalThreshold": 85
  }
}
```

### 配置参数说明

- **name**: 存储名称，显示在界面上
- **mountPath**: 存储挂载路径，系统会检查此路径是否存在
- **description**: 存储描述信息
- **quotaEnabled**: 是否启用配额检查
- **warningThreshold**: 警告阈值（百分比）
- **criticalThreshold**: 严重阈值（百分比）

## 功能特性

### 1. 集群共享存储监控
- 监控集群共享存储空间的使用情况
- 显示总容量、已用空间、可用空间
- 实时使用率计算和可视化
- 状态指示器（充足/正常/紧张/不足）

### 2. 用户个人存储监控
- 监控用户个人存储空间使用情况
- 显示用户目录路径和大小
- 支持存储配额检查（如果启用）
- 个人使用率统计

### 3. 智能状态判断
- 根据配置的阈值自动判断存储状态
- 颜色编码：绿色（充足）、橙色（正常）、黄色（紧张）、红色（不足）
- 图标指示器提供直观的状态反馈

### 4. 错误处理
- 路径不存在时的友好提示
- 权限不足时的错误处理
- 网络问题的重试机制

## 使用方法

### 1. 配置存储路径
编辑 `config/storage-config.json` 文件，设置正确的挂载路径：

```json
{
  "sharedStorage": {
    "mountPath": "/your/shared/storage/path"
  },
  "userStorage": {
    "mountPath": "/your/user/storage/path"
  }
}
```

### 2. 访问存储信息
- 在仪表盘侧边栏查看存储信息
- 自动刷新：每5分钟更新一次
- 手动刷新：点击刷新按钮

### 3. 监控指标
- **使用率**: 当前使用量占总容量的百分比
- **状态**: 基于阈值的状态判断
- **配额**: 用户存储配额信息（如果启用）

## 技术实现

### 后端API
- **路径**: `/api/storage`
- **方法**: GET
- **认证**: 需要JWT token
- **缓存**: 5分钟内存缓存

### 系统命令
- **df**: 获取磁盘使用情况
- **du**: 获取目录大小
- **quota**: 获取用户配额信息

### 前端组件
- **StorageInfoCard**: 存储信息展示组件
- **useStorage**: 存储数据Hook
- **实时更新**: 自动刷新机制

## 常见配置场景

### 1. 标准HPC集群
```json
{
  "sharedStorage": {
    "mountPath": "/shared",
    "name": "集群共享存储"
  },
  "userStorage": {
    "mountPath": "/home",
    "name": "用户主目录"
  }
}
```

### 2. 多存储集群
```json
{
  "sharedStorage": {
    "mountPath": "/lustre/shared",
    "name": "Lustre共享存储"
  },
  "userStorage": {
    "mountPath": "/lustre/home",
    "name": "用户存储"
  },
  "scratchStorage": {
    "mountPath": "/lustre/scratch",
    "name": "临时存储"
  }
}
```

### 3. 网络存储集群
```json
{
  "sharedStorage": {
    "mountPath": "/nfs/shared",
    "name": "NFS共享存储"
  },
  "userStorage": {
    "mountPath": "/nfs/home",
    "name": "NFS用户存储"
  }
}
```

## 故障排除

### 1. 存储路径不存在
- 检查配置文件中的 `mountPath` 是否正确
- 确认存储设备已正确挂载
- 检查系统权限

### 2. 权限问题
- 确认Web服务有读取存储信息的权限
- 检查用户目录访问权限
- 验证quota命令执行权限

### 3. 性能问题
- 调整缓存时间（默认5分钟）
- 检查系统负载
- 优化存储查询频率

## 更新日志

### v1.0.0 (2025-07-24)
- 初始版本发布
- 支持集群共享存储监控
- 支持用户个人存储监控
- 配置文件驱动的路径设置
- 智能状态判断和可视化
- 完善的错误处理机制 
