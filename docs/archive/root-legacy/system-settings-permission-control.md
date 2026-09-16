# 系统设置页面权限限制实现说明

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 概述

已成功实现对系统设置页面中**安全设置**和**版权信息配置**部分的超级管理员权限限制。

## 实现内容

### 1. 前端权限控制

**文件**: `/opt/my-hpcapp/app/[locale]/dashboard/system/settings/page.tsx`

#### 变更内容：
1. **引入依赖**：
   - 导入 `useAuth` hook
   - 导入 `isSuperAdminUser` 辅助函数

2. **添加权限检查**：
   ```typescript
   const { user } = useAuth()
   const isSuperAdmin = isSuperAdminUser(user)
   ```

3. **条件渲染**：
   - **安全设置**部分（第785-992行）使用 `{isSuperAdmin && (...)}`
   - **版权信息配置**部分（第995-1325行）使用 `{isSuperAdmin && (...)}`
   - 添加了权限标识提示：`🔒 仅超级管理员可见和修改`

4. **API请求携带认证token**：
   - GET请求获取设置时携带token
   - POST请求保存设置时携带token
   - 所有相关的fetch调用都更新为携带 `Authorization: Bearer ${token}` 头

### 2. 后端权限控制

**文件**: `/opt/my-hpcapp/app/api/system/settings/route.ts`

#### 变更内容：

1. **引入依赖**：
   ```typescript
   import { verifyJwt } from '@/lib/jwt'
   import { isSuperAdminUser } from '@/lib/admin-utils'
   ```

2. **GET请求权限过滤**：
   - 从请求头获取并验证JWT token
   - 检查是否为超级管理员
   - 如果不是超级管理员，自动过滤并删除敏感字段：
     - `watermarkText`
     - `watermarkEnabled`
     - `webshellCopyPasteEnabled`
     - `applicationsCenterEnabled`
     - `bigScreenButtonEnabled`
     - `copyright`
     - `channel`
     - `client`
     - `branding`

3. **POST请求权限验证**：
   - 验证JWT token并获取用户信息
   - 检查请求体是否包含敏感字段
   - 如果包含敏感字段但用户不是超级管理员，返回403错误：
     ```json
     {
       "success": false,
       "error": "仅超级管理员可以修改安全设置和版权信息配置"
     }
     ```

## 受保护的敏感字段

### 安全设置
- **水印设置**：
  - `watermarkText` - 水印文本
  - `watermarkEnabled` - 水印开关

- **WebShell权限**：
  - `webshellCopyPasteEnabled` - 复制粘贴权限

- **功能开关**：
  - `applicationsCenterEnabled` - 应用中心开关
  - `bigScreenButtonEnabled` - 大屏按钮开关

### 版权信息配置
- **公司版权**：
  - `copyright.companyName` - 公司名称
  - `copyright.companyUrl` - 公司网址
  - `copyright.copyrightText` - 版权文字
  - `copyright.poweredBy` - Powered by文字
  - `copyright.showPoweredBy` - 是否显示Powered by

- **渠道信息**：
  - `channel.enabled` - 渠道启用开关
  - `channel.channelName` - 渠道名称
  - `channel.channelUrl` - 渠道网址
  - `channel.channelCopyright` - 渠道版权

- **客户信息**：
  - `client.enabled` - 客户启用开关
  - `client.clientName` - 客户名称
  - `client.clientUrl` - 客户网址
  - `client.clientCopyright` - 客户版权

- **品牌设置**：
  - `branding.showFooter` - 显示页脚
  - `branding.footerText` - 页脚文字
  - `branding.showLoginBranding` - 登录页品牌
  - `branding.showDashboardBranding` - 仪表盘品牌

## 普通管理员可见的内容

普通管理员（非超级管理员）仍然可以看到和修改以下设置：

1. **基本信息**：
   - 平台名称
   - 系统Logo
   - 网站标题
   - 网站描述

2. **系统配置**：
   - 用户家目录前缀

## 权限验证流程

### 前端流程
1. 页面加载时检查用户是否为超级管理员
2. 根据权限决定是否渲染敏感设置部分
3. 所有API请求携带JWT token

### 后端流程
1. 接收请求，从Authorization头提取JWT token
2. 验证token并解析用户信息
3. 检查用户是否为超级管理员
4. **GET请求**：过滤敏感字段后返回
5. **POST请求**：如果包含敏感字段但无权限，返回403

## 安全特性

1. ✅ **前端权限保护**：普通管理员看不到敏感设置选项
2. ✅ **后端权限验证**：即使前端被绕过，后端仍会验证权限
3. ✅ **数据过滤**：GET请求自动过滤敏感数据
4. ✅ **修改拦截**：POST请求拒绝未授权的敏感字段修改
5. ✅ **清晰提示**：带有🔒图标和说明文字，明确告知仅超级管理员可用

## 测试建议

### 超级管理员测试
1. 使用 `vtadmin` / `Vtkj2407` 登录
2. 访问 `/zh/dashboard/system/settings`
3. 应该能看到完整的安全设置和版权信息配置
4. 应该能成功修改这些设置

### 普通管理员测试
1. 使用普通管理员账户登录
2. 访问 `/zh/dashboard/system/settings`
3. 应该**看不到**安全设置和版权信息配置部分
4. 只能看到基本信息和系统配置部分
5. 尝试通过API直接修改敏感字段应该返回403错误

## 相关文件

- **前端页面**: `/opt/my-hpcapp/app/[locale]/dashboard/system/settings/page.tsx`
- **后端API**: `/opt/my-hpcapp/app/api/system/settings/route.ts`
- **工具函数**: `/opt/my-hpcapp/lib/admin-utils.ts`
- **超级管理员指南**: `/opt/my-hpcapp/docs/super-admin-guide.md`

## 注意事项

⚠️ **重要**：
1. 普通管理员无法绕过此限制
2. 敏感字段的修改完全受超级管理员控制
3. 系统基本功能（平台名称、Logo等）仍然对普通管理员开放
4. 家目录前缀配置对所有管理员开放（考虑到这是系统运维必需功能）

## 实现总结

✅ 前端UI层面隐藏敏感设置
✅ 后端API层面验证权限
✅ 数据读取时自动过滤
✅ 数据写入时严格验证
✅ 用户体验良好（带权限标识）
✅ 安全性高（双重保护）
