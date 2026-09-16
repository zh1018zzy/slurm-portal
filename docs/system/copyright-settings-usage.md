# 版权信息设置使用说明

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🎯 快速开始

### 1. 访问设置页面
1. 登录系统管理员账户
2. 进入 `系统管理` → `系统设置`
3. 滚动到 `版权信息配置` 部分

### 2. 配置公司版权信息
在 `公司版权信息` 区域配置您的基础版权信息：

- **公司名称**：输入您的公司名称（如：郑州市维通科技有限公司）
- **公司网址**：输入公司官网地址（如：https://vthpc.com）
- **版权文本**：输入版权声明（如：© 2025 郑州市维通科技有限公司. 保留所有权利.）
- **Powered by 文本**：输入技术平台标识（如：Powered by VTHPC Platform）
- **显示 Powered by**：选择是否在页脚显示技术平台信息

### 3. 配置渠道信息（可选）
如果您通过渠道商销售，可以启用渠道信息：

1. 开启 `渠道信息` 开关
2. 填写渠道商名称、网址和版权信息
3. 渠道信息将优先于公司信息显示

### 4. 配置客户信息（可选）
如果客户需要完全定制品牌，可以启用客户信息：

1. 开启 `客户信息` 开关
2. 填写客户公司名称、网址和版权信息
3. 客户信息具有最高优先级

### 5. 品牌显示设置
控制版权信息的显示方式：

- **显示页脚**：是否在页面底部显示版权信息
- **页脚附加文本**：可选的页脚附加信息
- **登录页面品牌**：是否在登录页面显示品牌信息
- **仪表板品牌**：是否在仪表板页面显示品牌信息

## 💾 保存设置

### 自动保存
- 所有配置项都会在修改后 **1秒内自动保存**
- 页面顶部会显示保存状态提示
- 无需手动点击保存按钮

### 手动保存
- 您也可以使用 `保存设置` 按钮手动保存
- 手动保存会立即应用所有更改
- 保存成功后会显示确认消息

## 🔄 配置示例

### 示例1：直接销售
```json
{
  "copyright": {
    "companyName": "郑州市维通科技有限公司",
    "companyUrl": "https://vthpc.com",
    "copyrightText": "© 2025 郑州市维通科技有限公司. 保留所有权利.",
    "poweredBy": "Powered by VTHPC Platform",
    "showPoweredBy": true
  },
  "channel": { "enabled": false },
  "client": { "enabled": false }
}
```

### 示例2：渠道销售
```json
{
  "copyright": {
    "companyName": "郑州市维通科技有限公司",
    "companyUrl": "https://vthpc.com",
    "copyrightText": "© 2025 郑州市维通科技有限公司. 保留所有权利.",
    "poweredBy": "Powered by VTHPC Platform",
    "showPoweredBy": true
  },
  "channel": {
    "enabled": true,
    "channelName": "ABC系统集成商",
    "channelUrl": "https://abc-systems.com",
    "channelCopyright": "© 2025 ABC系统集成商. 保留所有权利."
  },
  "client": { "enabled": false }
}
```

### 示例3：客户定制
```json
{
  "copyright": {
    "companyName": "郑州市维通科技有限公司",
    "companyUrl": "https://vthpc.com",
    "copyrightText": "© 2025 郑州市维通科技有限公司. 保留所有权利.",
    "poweredBy": "Powered by VTHPC Platform",
    "showPoweredBy": false
  },
  "channel": { "enabled": false },
  "client": {
    "enabled": true,
    "clientName": "XYZ企业集团",
    "clientUrl": "https://xyz-corp.com",
    "clientCopyright": "© 2025 XYZ企业集团. 保留所有权利."
  }
}
```

## 📊 显示优先级

系统按照以下优先级显示版权信息：

1. **客户信息**（如果启用）
2. **渠道信息**（如果启用且客户信息未启用）
3. **公司信息**（默认）

## 🎨 显示效果

### 页面底部页脚
- 显示版权文本
- 显示公司/渠道/客户名称链接
- 显示 Powered by 信息（如果启用）
- 显示页脚附加文本（如果配置）

### 浏览器元数据
- 页面标题和描述
- 作者和版权信息
- 网站图标和主题色

## 🔧 故障排除

### 常见问题

1. **版权信息不显示**
   - 检查 `显示页脚` 开关是否启用
   - 确认配置已正确保存
   - 清除浏览器缓存

2. **优先级显示错误**
   - 确认层级配置正确
   - 检查启用状态设置
   - 验证配置格式

3. **自动保存失败**
   - 检查网络连接
   - 确认管理员权限
   - 查看浏览器控制台错误

### 调试方法

1. **查看当前配置**
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

如果在配置过程中遇到问题，请联系技术支持：

- **邮箱**：support@vthpc.com
- **文档**：查看相关技术文档
- **社区**：访问技术社区论坛

## 🎉 完成配置

配置完成后，您将看到：

1. ✅ 页面底部显示正确的版权信息
2. ✅ 浏览器标签页显示正确的标题
3. ✅ 所有配置项自动保存
4. ✅ 系统正常运行

恭喜！您的版权信息配置已完成。 
