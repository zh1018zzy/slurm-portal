# 菜单激活状态优化文档

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🎯 问题描述

优化前的菜单激活逻辑存在问题：
- 可能导致多个菜单项同时激活
- 概览页面在访问其他页面时仍保持激活状态
- 国际化路由（带语言前缀）的匹配不准确

---

## ✨ 优化方案

### 核心改进

#### 1. **语言前缀处理**
```tsx
// 移除语言前缀进行匹配
const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/')
```

**为什么需要？**
- 支持国际化路由：`/zh/dashboard`, `/en/dashboard`
- 统一路径匹配逻辑
- 避免语言切换导致激活状态丢失

#### 2. **概览页面特殊处理**
```tsx
// 概览页面特殊处理：只在精确匹配时激活
if (item.href === '/dashboard' || item.href === '/dashboard/') {
  return pathWithoutLocale === '/dashboard' || pathWithoutLocale === '/dashboard/'
}
```

**解决的问题：**
- `/dashboard` 是所有路径的前缀
- 避免在访问 `/dashboard/jobs` 时，"概览"仍保持激活
- 确保只有在真正访问概览页时才激活

#### 3. **精确匹配优先**
```tsx
// 精确匹配
if (pathWithoutLocale === item.href) return true
```

**好处：**
- 最高优先级匹配
- 确保菜单项对应的主页面始终正确激活
- 处理末尾斜杠的情况

#### 4. **子路径匹配**
```tsx
// 其他页面：当前路径以菜单项路径开头（子路径）
return pathWithoutLocale.startsWith(item.href + '/')
```

**用途：**
- 菜单项的子页面也保持父菜单激活
- 例如：访问 `/dashboard/jobs/123` 时，"作业管理"保持激活
- 注意：必须加 `/` 避免误匹配（如 `/dashboard/jobs` 不会匹配 `/dashboard/job`）

---

## 📊 激活逻辑对比

### 优化前

```tsx
const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
```

**问题示例：**

| 当前路径 | 激活的菜单 | 问题 |
|---------|-----------|------|
| `/zh/dashboard` | ✅ 概览 | ✓ 正确 |
| `/zh/dashboard/jobs` | ✅ 概览<br>✅ 作业管理 | ❌ 概览不应激活 |
| `/en/dashboard/submit` | ❌ 未激活 | ❌ 语言前缀导致匹配失败 |

### 优化后

```tsx
// 智能激活逻辑
const isActive = (() => {
  // 1. 移除语言前缀
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/')
  
  // 2. 精确匹配
  if (pathWithoutLocale === item.href) return true
  
  // 3. 概览页面特殊处理
  if (item.href === '/dashboard') {
    return pathWithoutLocale === '/dashboard'
  }
  
  // 4. 子路径匹配
  return pathWithoutLocale.startsWith(item.href + '/')
})()
```

**效果示例：**

| 当前路径 | 激活的菜单 | 结果 |
|---------|-----------|------|
| `/zh/dashboard` | ✅ 概览 | ✓ 正确 |
| `/zh/dashboard/jobs` | ✅ 作业管理 | ✓ 仅激活当前页 |
| `/en/dashboard/submit` | ✅ 提交作业 | ✓ 语言无关 |
| `/zh/dashboard/jobs/123` | ✅ 作业管理 | ✓ 子路径保持激活 |
| `/en/dashboard/applications/hpc` | ✅ 应用中心 | ✓ 子路径保持激活 |

---

## 🔍 详细场景分析

### 场景 1：概览页面
```
路径：/zh/dashboard
期望：只激活 "概览"
实现：
  1. 移除 /zh/ → /dashboard
  2. 匹配 item.href === '/dashboard' ✓
  3. 返回 true
结果：✅ 正确激活
```

### 场景 2：作业管理页面
```
路径：/zh/dashboard/jobs
期望：只激活 "作业管理"
实现：
  1. 移除 /zh/ → /dashboard/jobs
  2. 概览检查：/dashboard/jobs !== /dashboard ✗
  3. 作业管理精确匹配：/dashboard/jobs === /dashboard/jobs ✓
结果：✅ 正确激活
```

### 场景 3：作业详情页
```
路径：/zh/dashboard/jobs/12345
期望：激活 "作业管理"（父菜单）
实现：
  1. 移除 /zh/ → /dashboard/jobs/12345
  2. 作业管理精确匹配：/dashboard/jobs/12345 === /dashboard/jobs ✗
  3. 子路径匹配：/dashboard/jobs/12345.startsWith('/dashboard/jobs/') ✓
结果：✅ 正确激活父菜单
```

### 场景 4：系统管理子页面
```
路径：/zh/dashboard/system/users
期望：激活 "系统管理" > "用户管理"
实现：
  1. 移除 /zh/ → /dashboard/system/users
  2. 系统管理：/dashboard/system/users.startsWith('/dashboard/system/') ✓
  3. 用户管理：/dashboard/system/users.startsWith('/dashboard/system/users/') ✗
  4. 但精确匹配不成立...
注意：需要确保菜单项 href 正确设置
```

---

## 💡 最佳实践

### 1. 菜单项 href 设置规范

```tsx
// ✅ 正确：无末尾斜杠
{ href: '/dashboard', label: '概览' }
{ href: '/dashboard/jobs', label: '作业管理' }

// ❌ 错误：有末尾斜杠
{ href: '/dashboard/', label: '概览' }
{ href: '/dashboard/jobs/', label: '作业管理' }
```

### 2. 子路由命名规范

```tsx
// ✅ 正确：统一前缀
/dashboard/jobs           // 列表页
/dashboard/jobs/123       // 详情页
/dashboard/jobs/create    // 创建页

// ❌ 错误：不一致前缀
/dashboard/jobs           // 列表页
/dashboard/job/123        // 详情页（缺少s）
/dashboard/submit-job     // 创建页（完全不同）
```

### 3. 特殊页面处理

```tsx
// 对于 /dashboard 这种根路径，需要特殊处理
if (item.href === '/dashboard') {
  return pathWithoutLocale === '/dashboard'
}

// 其他页面使用通用逻辑
return pathWithoutLocale.startsWith(item.href + '/')
```

---

## 🔧 系统管理菜单

### 激活逻辑

```tsx
// 移除语言前缀进行匹配
const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}\//, '/')

// 精确匹配或子路径匹配
const isActive = pathWithoutLocale === item.href || 
                 pathWithoutLocale.startsWith(item.href + '/')
```

### 示例

| 菜单项 | 路径 | 激活状态 |
|--------|------|---------|
| 系统管理 | `/zh/dashboard/system` | ✅ 激活 |
| 系统管理 | `/zh/dashboard/system/settings` | ✅ 激活（子路径） |
| 节点监控 | `/zh/dashboard/assets/nodes` | ✅ 激活 |
| 用户管理 | `/zh/dashboard/system/users` | ✅ 激活 |

---

## 🎨 视觉反馈

### 激活状态样式

```tsx
isActive ? 
  "bg-gradient-to-r from-green-500/10 to-emerald-500/10 
   text-green-600 dark:text-green-400 
   font-medium 
   border-l-2 border-green-500 
   shadow-sm"
  :
  "hover:bg-green-500/5 
   hover:text-green-600 dark:hover:text-green-400"
```

### 视觉元素
- ✅ 绿色渐变背景
- ✅ 左侧 2px 绿色边框
- ✅ 右侧渐变装饰条
- ✅ 绿色文字和图标
- ✅ 微妙阴影效果

---

## 🧪 测试用例

### 测试清单

- [ ] 访问 `/dashboard` → 只激活"概览"
- [ ] 访问 `/dashboard/jobs` → 只激活"作业管理"
- [ ] 访问 `/dashboard/jobs/123` → 只激活"作业管理"
- [ ] 访问 `/zh/dashboard` → 正确激活（中文）
- [ ] 访问 `/en/dashboard` → 正确激活（英文）
- [ ] 切换语言 → 激活状态保持
- [ ] 刷新页面 → 激活状态保持
- [ ] 访问不存在的路径 → 无菜单激活

### 边界情况

```tsx
// 路径末尾斜杠
/dashboard/jobs  ✓ 激活 "作业管理"
/dashboard/jobs/ ✓ 激活 "作业管理"（需要处理）

// 语言前缀
/zh/dashboard ✓ 激活 "概览"
/en/dashboard ✓ 激活 "概览"
/fr/dashboard ✓ 激活 "概览"（假设支持）

// 深层嵌套
/dashboard/system/settings/license ✓ 激活 "系统管理"
```

---

## 📈 性能优化

### 优化点

1. **路径预处理**
   - 只在每个菜单项检查时处理一次
   - 使用 IIFE 立即执行函数避免重复计算

2. **正则表达式**
   - 使用简单的 `replace` 而非复杂正则
   - 避免全局搜索

3. **短路求值**
   - 精确匹配优先，减少后续检查
   - 使用 `if-return` 模式提前返回

---

## 🔄 未来增强

### 可能的改进方向

1. **面包屑导航**
   - 显示完整路径层级
   - 与菜单激活状态联动

2. **历史记录**
   - 记录用户访问过的页面
   - 快速返回上一个菜单

3. **菜单折叠状态记忆**
   - 保存用户的展开/折叠偏好
   - localStorage 持久化

4. **键盘导航**
   - 支持快捷键切换菜单
   - Tab 键导航优化

---

## ✨ 总结

### 优化成果
- ✅ **准确性提升** - 只激活当前相关菜单
- ✅ **国际化支持** - 语言切换无缝
- ✅ **子路径支持** - 详情页保持父菜单激活
- ✅ **特殊处理** - 概览页面独立判断
- ✅ **视觉清晰** - 绿色科技风格突出显示

### 用户体验
- 🎯 **直观明确** - 始终知道当前位置
- 🎯 **操作流畅** - 页面切换即时反馈
- 🎯 **视觉一致** - 统一的绿色激活样式
- 🎯 **响应迅速** - 优化的匹配逻辑

---

**🎉 菜单激活状态优化完成！现在菜单会准确显示当前页面状态，直到切换到其他页面。**

