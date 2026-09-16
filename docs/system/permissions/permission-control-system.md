# HPC系统权限控制方案

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 项目概述

本项目是一个基于Next.js的HPC（高性能计算）集群管理系统，集成了Slurm作业调度器、LDAP认证、Supabase数据库等功能。当前系统已具备基础的认证和简单权限控制，但需要进一步完善权限控制体系。

## 🔍 当前权限控制现状分析

### 现有功能模块

#### 1. 用户认证系统
- **LDAP认证**：支持LDAP目录服务认证
- **Linux本地认证**：支持系统用户认证
- **JWT令牌管理**：基于JWT的会话管理
- **用户角色**：基础的用户/管理员角色区分

#### 2. 功能模块权限分布
```
📁 系统模块
├── 🏠 仪表盘 (所有用户)
├── 📊 大屏展示 (所有用户)
├── 🖥️ 计算提交 (所有用户)
├── ⚙️ 作业管理 (用户查看自己的，管理员查看所有)
├── 📱 应用中心 (基于应用权限配置)
├── 📁 文件管理 (用户访问自己的目录)
├── 🔔 消息通知 (所有用户)
├── 👤 个人信息 (用户自己的信息)
└── ⚙️ 系统管理 (仅管理员)
    ├── 🔧 系统设置
    ├── 📱 应用管理
    ├── 👥 用户管理
    ├── 📋 系统日志
    └── 💾 备份与恢复
```

#### 3. 当前权限控制实现

**优点：**
- ✅ 基础认证体系完整（LDAP + JWT）
- ✅ 用户角色区分（admin/user）
- ✅ API层面的权限验证
- ✅ 前端页面权限控制

**不足：**
- ❌ 权限粒度较粗（仅admin/user两级）
- ❌ 缺乏细粒度权限控制
- ❌ 无权限中间件统一管理
- ❌ 应用权限配置不完善
- ❌ 缺乏权限审计日志
- ❌ 无权限继承和组合机制

## 🎯 权限控制方案设计

### 1. 权限模型设计

#### 1.1 角色层级结构
```
👑 超级管理员 (super_admin)
├── 🔧 系统管理员 (system_admin)
│   ├── 👥 用户管理员 (user_admin)
│   ├── 📱 应用管理员 (app_admin)
│   ├── ⚙️ 作业管理员 (job_admin)
│   └── 💾 存储管理员 (storage_admin)
├── 👤 普通用户 (user)
│   ├── 📊 高级用户 (advanced_user)
│   └── 🔬 研究员 (researcher)
└── 👀 访客 (guest)
```

#### 1.2 权限类型定义
```typescript
interface Permission {
  // 基础权限
  resource: string;        // 资源类型: 'user', 'job', 'app', 'file', 'system'
  action: string;          // 操作类型: 'create', 'read', 'update', 'delete', 'admin'
  scope: string;           // 作用域: 'own', 'department', 'all'
  
  // 高级权限
  conditions?: object;     // 权限条件
  timeLimit?: Date;        // 时间限制
  ipRestriction?: string[]; // IP限制
}
```

#### 1.3 权限矩阵
| 资源/操作 | 创建 | 读取 | 更新 | 删除 | 管理 |
|-----------|------|------|------|------|------|
| 用户 | super_admin | own + admin | own + admin | super_admin | user_admin |
| 作业 | all | own + admin | own + admin | own + admin | job_admin |
| 应用 | app_admin | based on app config | app_admin | app_admin | app_admin |
| 文件 | all | own + shared | own | own + admin | storage_admin |
| 系统 | system_admin | admin | system_admin | system_admin | super_admin | 
