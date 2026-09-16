# 🎨 应用图标管理指南

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

本系统支持自定义应用图标，可以通过多种方式修改和管理应用图标。

## 图标文件位置

所有图标文件都存放在 `public/icons/` 目录下：

```
public/
└── icons/
    ├── desktop.svg      # 桌面环境图标
    ├── firefox.svg      # 浏览器图标
    ├── terminal.svg     # 终端图标
    ├── editor.svg       # 编辑器图标
    ├── graphics.svg     # 图形应用图标
    └── your-icon.svg    # 自定义图标
```

## 修改图标的方法

### 1. **替换现有图标文件**

直接替换 `public/icons/` 目录下的SVG文件：

```bash
# 替换桌面图标
cp your-desktop-icon.svg public/icons/desktop.svg

# 替换浏览器图标
cp your-browser-icon.svg public/icons/firefox.svg
```

### 2. **修改应用配置中的图标路径**

编辑 `lib/builtin-vnc-apps.ts` 文件：

```typescript
export const BUILTIN_VNC_APPS = [
  {
    id: 'vnc-desktop',
    name: 'VNC 桌面',
    description: '完整的Linux桌面环境，支持多种图形应用',
    category: '桌面环境',
    icon: '/icons/your-custom-desktop.svg', // 修改这里
    command: 'mate-session',
    // ...
  },
  {
    id: 'vnc-firefox',
    name: 'Firefox 浏览器',
    description: '网页浏览器，支持Web应用访问',
    category: '网络工具',
    icon: '/icons/your-custom-browser.svg', // 修改这里
    command: 'firefox',
    // ...
  }
]
```

### 3. **添加新的应用和图标**

1. **创建新图标文件**：
```bash
# 创建新图标
touch public/icons/new-app.svg
```

2. **添加新应用配置**：
```typescript
// 在 lib/builtin-vnc-apps.ts 中添加
{
  id: 'vnc-new-app',
  name: '新应用',
  description: '新应用的描述',
  category: '应用分类',
  icon: '/icons/new-app.svg', // 新图标路径
  command: 'your-command',
  fields: [
    // 应用参数配置
  ]
}
```

## 图标格式要求

### SVG图标（推荐）

- **尺寸**：24x24 像素（推荐）
- **颜色**：使用 `currentColor` 以支持主题切换
- **样式**：简洁的线条图标

示例SVG结构：
```svg
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <!-- 图标内容 -->
</svg>
```

### PNG/JPG图标

- **尺寸**：32x32 或 64x64 像素
- **格式**：PNG（推荐）或 JPG
- **背景**：透明背景（PNG）

## 图标命名规范

### 内置应用图标
- `desktop.svg` - 桌面环境
- `firefox.svg` - 浏览器
- `terminal.svg` - 终端
- `editor.svg` - 编辑器
- `graphics.svg` - 图形应用

### 自定义应用图标
- 使用小写字母和连字符
- 描述性名称
- 例如：`data-analysis.svg`, `machine-learning.svg`

## 数据库中的应用图标

如果应用存储在数据库中，可以通过管理界面修改图标：

1. **访问应用管理页面**
2. **编辑应用信息**
3. **上传或选择图标文件**
4. **保存更改**

## 图标缓存

### 浏览器缓存
图标文件会被浏览器缓存，修改后可能需要：
- 强制刷新页面（Ctrl+F5）
- 清除浏览器缓存
- 等待缓存过期

### 开发环境
在开发环境中，Next.js会自动处理文件变化，通常不需要手动清除缓存。

## 故障排除

### 图标不显示

1. **检查文件路径**：
```bash
# 确认图标文件存在
ls -la public/icons/your-icon.svg
```

2. **检查网络请求**：
- 打开浏览器开发者工具
- 查看Network标签页
- 确认图标文件请求成功

3. **检查文件权限**：
```bash
# 确保文件可读
chmod 644 public/icons/your-icon.svg
```

### 图标显示异常

1. **SVG格式问题**：
- 检查SVG语法是否正确
- 确认viewBox设置正确
- 验证XML结构完整

2. **尺寸问题**：
- 调整SVG的width和height属性
- 检查viewBox设置

3. **颜色问题**：
- 使用 `currentColor` 而不是固定颜色
- 确保支持主题切换

## 最佳实践

### 1. **图标设计**
- 保持简洁明了
- 使用一致的视觉风格
- 确保在小尺寸下清晰可辨

### 2. **文件管理**
- 使用有意义的文件名
- 保持目录结构清晰
- 定期清理未使用的图标

### 3. **性能优化**
- 使用SVG格式（矢量图形）
- 压缩SVG文件大小
- 避免过大的图标文件

### 4. **版本控制**
- 将图标文件纳入版本控制
- 记录图标变更历史
- 备份重要的图标文件

## 示例：添加新应用图标

### 步骤1：创建图标文件
```bash
# 创建新图标
cat > public/icons/data-science.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M3 3v18h18"/>
  <path d="M18 17V9"/>
  <path d="M13 17V5"/>
  <path d="M8 17v-3"/>
</svg>
EOF
```

### 步骤2：添加应用配置
```typescript
// 在 lib/builtin-vnc-apps.ts 中添加
{
  id: 'vnc-data-science',
  name: '数据科学环境',
  description: 'Python数据科学开发环境',
  category: '开发工具',
  icon: '/icons/data-science.svg',
  command: 'jupyter-lab',
  fields: [
    {
      name: 'geometry',
      label: '分辨率',
      type: 'select',
      default: '1920x1080',
      options: [
        { value: '1280x800', label: '1280x800' },
        { value: '1920x1080', label: '1920x1080' }
      ]
    }
  ]
}
```

### 步骤3：测试图标
1. 重启开发服务器
2. 访问应用中心页面
3. 确认新图标正确显示

## 总结

通过以上方法，你可以轻松地：
- ✅ 替换现有应用图标
- ✅ 添加新的应用和图标
- ✅ 管理图标文件
- ✅ 解决图标显示问题

记住保持图标的一致性和专业性，为用户提供良好的视觉体验！🎨 
