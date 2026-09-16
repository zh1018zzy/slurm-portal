# 用户家目录前缀同步功能

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

系统设置中的用户家目录前缀修改功能现在会自动同步到数据库中的用户表，确保所有用户的家目录路径与系统配置保持一致。

## 功能特性

### 自动同步
- 当管理员在系统设置中修改用户家目录前缀时，系统会自动更新数据库中所有用户的 `home_directory` 字段
- 同步操作在配置文件保存成功后立即执行
- 支持批量更新，提高效率

### 数据一致性
- 确保配置文件中的前缀与数据库中的用户家目录路径保持一致
- 避免因配置不一致导致的问题

### 错误处理
- 如果数据库同步失败，会返回详细的错误信息
- 配置文件保存和数据库同步是分离的，即使同步失败也不会影响配置文件的保存

## 技术实现

### API 修改
- 修改了 `/api/system/settings` 接口
- 添加了 Supabase 客户端支持
- 实现了智能检测：只有当用户家目录前缀发生变化时才执行同步

### 前端优化
- 用户家目录前缀修改现在支持自动保存
- 添加了用户友好的提示信息
- 更新了页面说明文字

### 数据库操作
- 使用 `upsert` 操作确保数据更新的一致性
- 批量更新所有用户的家目录路径
- 格式：`新前缀/用户名`

## 使用场景

### 环境迁移
当系统需要迁移到不同的环境时，可能需要修改用户家目录的前缀：
- 从 `/home` 改为 `/data/home`
- 从 `/home` 改为 `/users`
- 从 `/home` 改为 `/mnt/data/users`

### 存储结构调整
当存储结构发生变化时，需要调整用户家目录的位置：
- 将用户数据迁移到新的存储设备
- 调整目录结构以优化性能
- 实现多级存储策略

## 配置示例

### 系统设置文件
```json
{
  "platformName": "HPC平台",
  "logoUrl": "/logo.png",
  "watermarkText": "",
  "watermarkEnabled": true,
  "webshellCopyPasteEnabled": true,
  "websiteTitle": "高性能计算管理平台",
  "websiteDescription": "高性能计算环境管理与监控平台",
  "applicationsCenterEnabled": true,
  "userHomeDirectoryPrefix": "/data/home"
}
```

### 数据库用户表
```sql
-- 修改前
username | home_directory
---------|----------------
user1    | /home/user1
user2    | /home/user2
user3    | /home/user3

-- 修改后
username | home_directory
---------|----------------
user1    | /data/home/user1
user2    | /data/home/user2
user3    | /data/home/user3
```

## 测试

### 手动测试
1. 进入系统设置页面
2. 修改用户家目录前缀（如从 `/home` 改为 `/data/home`）
3. 检查数据库中用户表的 `home_directory` 字段是否已更新
4. 验证用户相关功能是否正常工作

### 自动化测试
运行测试脚本验证功能：
```bash
node scripts/test-home-directory-sync.js
```

## 注意事项

### 权限要求
- 需要 Supabase 服务角色密钥 (`SUPABASE_SERVICE_ROLE_KEY`)
- 确保数据库连接正常

### 性能考虑
- 同步操作会更新所有用户记录
- 对于大量用户的系统，建议在低峰期执行

### 数据备份
- 建议在执行重要配置修改前备份数据库
- 配置文件会自动备份到版本控制系统

### 回滚策略
- 如果同步失败，可以手动恢复配置文件
- 数据库中的用户家目录路径可以手动修正

## 故障排除

### 常见问题

1. **同步失败**
   - 检查 Supabase 连接配置
   - 验证服务角色密钥权限
   - 查看服务器日志获取详细错误信息

2. **部分用户未更新**
   - 检查用户记录是否完整
   - 验证用户名格式是否正确
   - 手动更新遗漏的用户记录

3. **配置不一致**
   - 检查配置文件格式
   - 验证 JSON 语法
   - 重新加载配置

### 日志信息
系统会在控制台输出详细的同步信息：
```
成功更新 25 个用户的家目录前缀
```

## 相关文件

- `app/api/system/settings/route.ts` - API 实现
- `app/dashboard/system/settings/page.tsx` - 前端界面
- `config/system-settings.json` - 配置文件
- `scripts/test-home-directory-sync.js` - 测试脚本
- `lib/user-home-manager.ts` - 用户家目录管理器 
