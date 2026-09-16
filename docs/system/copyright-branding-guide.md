# HPC平台版权信息配置指南

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 概述

本指南介绍如何在HPC平台中配置版权信息，特别适用于通过渠道销售的部署场景。系统支持多层次的版权信息配置，满足不同销售模式的需求。

## 🎯 版权信息层级

### 1. 公司版权信息（基础层）
- **用途**：系统默认的版权信息
- **适用场景**：直接销售给最终客户
- **配置位置**：系统设置 → 版权信息配置 → 公司版权信息

### 2. 渠道信息（中间层）
- **用途**：渠道商的品牌信息
- **适用场景**：通过渠道商销售
- **优先级**：高于公司版权信息
- **配置位置**：系统设置 → 版权信息配置 → 渠道信息

### 3. 客户信息（最高层）
- **用途**：最终客户的品牌信息
- **适用场景**：客户需要完全定制品牌
- **优先级**：最高，覆盖其他层级
- **配置位置**：系统设置 → 版权信息配置 → 客户信息

## 🔧 配置方法

### 步骤1：访问系统设置
1. 登录系统管理员账户
2. 进入 `系统管理` → `系统设置`
3. 滚动到 `版权信息配置` 部分

### 步骤2：配置公司版权信息
```json
{
  "companyName": "您的公司名称",
  "companyUrl": "https://yourcompany.com",
  "copyrightText": "© 2024 您的公司名称. 保留所有权利.",
  "poweredBy": "Powered by HPC Platform",
  "showPoweredBy": true
}
```

### 步骤3：配置渠道信息（可选）
```json
{
  "enabled": true,
  "channelName": "渠道商名称",
  "channelUrl": "https://channel.com",
  "channelCopyright": "© 2024 渠道商名称. 保留所有权利."
}
```

### 步骤4：配置客户信息（可选）
```json
{
  "enabled": true,
  "clientName": "客户公司名称",
  "clientUrl": "https://client.com",
  "clientCopyright": "© 2024 客户公司名称. 保留所有权利."
}
```

## 📊 显示优先级

系统按照以下优先级显示版权信息：

1. **客户信息**（如果启用）
2. **渠道信息**（如果启用且客户信息未启用）
3. **公司信息**（默认）

## 🎨 显示位置

### 1. 页面底部页脚
- 显示版权文本
- 显示公司/渠道/客户名称链接
- 显示 Powered by 信息
- 显示页脚附加文本

### 2. 浏览器元数据
- 页面标题
- 页面描述
- 作者信息
- 版权信息

### 3. 登录页面（可选）
- 品牌标识
- 版权信息

### 4. 仪表板页面（可选）
- 品牌标识
- 版权信息

## 🔄 渠道销售配置示例

### 场景1：标准渠道销售
```json
{
  "copyright": {
    "companyName": "HPC Platform Inc.",
    "companyUrl": "https://hpcplatform.com",
    "copyrightText": "© 2024 HPC Platform Inc. 保留所有权利.",
    "poweredBy": "Powered by HPC Platform",
    "showPoweredBy": true
  },
  "channel": {
    "enabled": true,
    "channelName": "ABC系统集成商",
    "channelUrl": "https://abc-systems.com",
    "channelCopyright": "© 2024 ABC系统集成商. 保留所有权利."
  },
  "client": {
    "enabled": false
  }
}
```

### 场景2：客户定制品牌
```json
{
  "copyright": {
    "companyName": "HPC Platform Inc.",
    "companyUrl": "https://hpcplatform.com",
    "copyrightText": "© 2024 HPC Platform Inc. 保留所有权利.",
    "poweredBy": "Powered by HPC Platform",
    "showPoweredBy": false
  },
  "channel": {
    "enabled": false
  },
  "client": {
    "enabled": true,
    "clientName": "XYZ企业集团",
    "clientUrl": "https://xyz-corp.com",
    "clientCopyright": "© 2024 XYZ企业集团. 保留所有权利."
  }
}
```

### 场景3：完全白标
```json
{
  "copyright": {
    "companyName": "HPC Platform Inc.",
    "companyUrl": "https://hpcplatform.com",
    "copyrightText": "© 2024 HPC Platform Inc. 保留所有权利.",
    "poweredBy": "Powered by HPC Platform",
    "showPoweredBy": false
  },
  "channel": {
    "enabled": false
  },
  "client": {
    "enabled": true,
    "clientName": "客户公司",
    "clientUrl": "https://client.com",
    "clientCopyright": "© 2024 客户公司. 保留所有权利."
  },
  "branding": {
    "showFooter": true,
    "footerText": "客户专用系统",
    "showLoginBranding": true,
    "showDashboardBranding": true
  }
}
```

## ⚙️ 高级配置

### 品牌显示控制
```json
{
  "branding": {
    "showFooter": true,           // 是否显示页脚
    "footerText": "附加信息",     // 页脚附加文本
    "showLoginBranding": true,    // 登录页面品牌
    "showDashboardBranding": true // 仪表板品牌
  }
}
```

### 水印配置
```json
{
  "watermarkEnabled": true,
  "watermarkText": "公司机密"  // 留空则显示用户名
}
```

## 🔒 安全考虑

### 1. 权限控制
- 只有系统管理员可以修改版权信息
- 配置更改需要管理员权限验证

### 2. 数据保护
- 版权信息存储在本地配置文件中
- 不涉及敏感信息的网络传输

### 3. 审计日志
- 版权信息修改会记录在系统日志中
- 可追踪配置变更历史

## 📝 最佳实践

### 1. 版权文本格式
- 使用标准版权符号 ©
- 包含年份和公司名称
- 添加"保留所有权利"声明

### 2. 网址配置
- 使用完整的HTTPS URL
- 确保网址可访问
- 定期验证链接有效性

### 3. 品牌一致性
- 保持各层级品牌信息的一致性
- 统一字体和样式
- 考虑品牌色彩搭配

### 4. 测试验证
- 在不同浏览器中测试显示效果
- 验证移动端适配
- 检查打印样式

## 🚀 部署建议

### 1. 开发环境
- 使用公司版权信息进行开发测试
- 验证配置功能正常工作

### 2. 测试环境
- 模拟渠道销售场景
- 测试不同层级的版权信息显示

### 3. 生产环境
- 根据实际销售模式配置
- 定期检查和更新版权信息
- 备份配置文件

## 🔧 故障排除

### 常见问题

1. **版权信息不显示**
   - 检查页脚显示开关是否启用
   - 验证配置是否正确保存
   - 清除浏览器缓存

2. **优先级显示错误**
   - 确认层级配置正确
   - 检查启用状态设置
   - 验证配置格式

3. **链接无法访问**
   - 检查URL格式是否正确
   - 验证网址是否可访问
   - 确认网络连接正常

### 调试方法

1. **查看配置**
   ```bash
   cat config/system-settings.json
   ```

2. **检查API响应**
   ```bash
   curl http://localhost:3000/api/system/settings
   ```

3. **查看浏览器控制台**
   - 检查网络请求
   - 查看JavaScript错误
   - 验证数据加载

## 📞 技术支持

如果在配置过程中遇到问题，请联系技术支持团队：

- **邮箱**：support@hpcplatform.com
- **文档**：https://docs.hpcplatform.com
- **社区**：https://community.hpcplatform.com 
