# HPC系统前端风格指南

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🎨 绿色Matrix科技风格规范

本文档为HPC管理系统的前端开发提供统一的风格指南和最佳实践。

---

## 🎯 核心设计理念

### 简洁 · 科技感 · 现代感

**简洁** - 去除冗余，突出核心功能
**科技感** - Matrix风格，绿色霓虹光效
**现代感** - 渐变、光晕、流畅动画

---

## 🎨 配色方案

### 主色系（绿色科技风）

```css
/* 主色 - Green */
--tech-green-400: #4ade80
--tech-green-500: #22c55e  /* 主色 */
--tech-green-600: #16a34a
--tech-green-700: #15803d

/* 辅色 - Emerald */
--tech-emerald-400: #34d399
--tech-emerald-500: #10b981
--tech-emerald-600: #059669

/* 点缀色 - Teal */
--tech-teal-400: #2dd4bf
--tech-teal-500: #14b8a6
--tech-teal-600: #0d9488
```

### 状态色

```css
/* 运行/成功 */
--status-success: #16a34a (green-600)

/* 等待/警告 */
--status-warning: #ca8a04 (yellow-600)

/* 失败/错误 */
--status-error: #dc2626 (red-600)

/* 完成/信息 */
--status-info: #2563eb (blue-600)

/* 取消/中性 */
--status-neutral: #4b5563 (gray-600)
```

### 渐变组合

```css
/* 主要渐变（按钮、Logo等） */
bg-gradient-to-r from-green-500 via-emerald-600 to-teal-600

/* Hover 渐变 */
bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500

/* 背景渐变 */
bg-gradient-to-r from-green-500/10 to-emerald-500/10

/* 文字渐变 */
bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400
bg-clip-text text-transparent

/* 装饰线渐变 */
bg-gradient-to-r from-transparent via-green-400/30 to-transparent
```

---

## 🧩 组件使用规范

### 1. TechCard（科技感卡片）

#### 基础使用
```tsx
import { TechCard } from '@/components/ui/tech-card'
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card'

<TechCard>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>
    内容
  </CardContent>
</TechCard>
```

#### 高级用法
```tsx
// 启用 Hover 效果
<TechCard hover>...</TechCard>

// 启用光晕效果
<TechCard glowEffect>...</TechCard>

// 禁用角落装饰
<TechCard cornerDecoration={false}>...</TechCard>

// 组合使用
<TechCard hover glowEffect className="my-custom-class">
  ...
</TechCard>
```

#### 使用场景
- ✅ 所有信息卡片
- ✅ 表单容器
- ✅ 数据展示
- ✅ 功能入口

---

### 2. StatusBadge（状态标签）

#### 基础使用
```tsx
import { StatusBadge } from '@/components/ui/status-badge'

<StatusBadge status="running">运行中</StatusBadge>
<StatusBadge status="pending">等待中</StatusBadge>
<StatusBadge status="completed">已完成</StatusBadge>
<StatusBadge status="failed">失败</StatusBadge>
<StatusBadge status="cancelled">已取消</StatusBadge>
```

#### 高级用法
```tsx
// 脉冲效果（适用于运行中状态）
<StatusBadge status="running" pulse>运行中</StatusBadge>

// 不同尺寸
<StatusBadge status="running" size="sm">小</StatusBadge>
<StatusBadge status="running" size="md">中</StatusBadge>
<StatusBadge status="running" size="lg">大</StatusBadge>

// 其他状态
<StatusBadge status="success">成功</StatusBadge>
<StatusBadge status="warning">警告</StatusBadge>
<StatusBadge status="error">错误</StatusBadge>
<StatusBadge status="info">信息</StatusBadge>
```

#### 使用场景
- ✅ 作业状态
- ✅ 系统状态
- ✅ 用户状态
- ✅ 进程状态

---

### 3. PrimaryButton（主操作按钮）

#### 基础使用
```tsx
import { PrimaryButton, SecondaryButton, DangerButton } from '@/components/ui/primary-button'

// 主要操作
<PrimaryButton>提交</PrimaryButton>

// 次要操作
<SecondaryButton>取消</SecondaryButton>

// 危险操作
<DangerButton>删除</DangerButton>
```

#### 高级用法
```tsx
// 加载状态
<PrimaryButton loading>处理中...</PrimaryButton>

// 带图标（左侧）
<PrimaryButton icon={<CheckIcon />}>
  确认
</PrimaryButton>

// 带图标（右侧）
<PrimaryButton icon={<ArrowRight />} iconPosition="right">
  继续
</PrimaryButton>

// 禁用光晕效果
<PrimaryButton glowEffect={false}>
  确认
</PrimaryButton>

// 自定义样式
<PrimaryButton className="w-full h-12">
  提交作业
</PrimaryButton>
```

#### 图标注意事项
```tsx
// ✅ 推荐：直接在children中使用图标
<PrimaryButton>
  <SendIcon className="h-4 w-4 mr-2" />
  提交
</PrimaryButton>

// ❌ 不要使用 icon prop（已移除）
// <PrimaryButton icon={<SendIcon />}>提交</PrimaryButton>
```

#### 使用场景
- ✅ 主要操作：PrimaryButton
- ✅ 次要操作：SecondaryButton  
- ✅ 危险操作：DangerButton
- ✅ 普通操作：Button (原生)

---

### 4. LoadingSpinner（加载器）

#### 基础使用
```tsx
import { LoadingSpinner, InlineLoading, PageLoading, LoadingIcon } from '@/components/ui/loading-spinner'

// 基础加载器
<LoadingSpinner size="md" />

// 带文字
<LoadingSpinner size="lg" text="加载中..." />

// 行内加载
<InlineLoading text="正在处理..." />

// 页面级加载
<PageLoading text="加载数据..." />

// 仅图标
<LoadingIcon size="sm" />
```

#### 高级用法
```tsx
// 全屏加载
<LoadingSpinner fullScreen text="正在处理，请稍候..." />

// 不同样式
<LoadingSpinner variant="spinner" />  // 旋转圈（默认）
<LoadingSpinner variant="dots" />     // 跳动点
<LoadingSpinner variant="pulse" />    // 脉冲

// 不同尺寸
<LoadingSpinner size="xs" />  // 最小
<LoadingSpinner size="sm" />  // 小
<LoadingSpinner size="md" />  // 中（默认）
<LoadingSpinner size="lg" />  // 大
<LoadingSpinner size="xl" />  // 最大
```

#### 使用场景
- ✅ 数据加载：LoadingSpinner
- ✅ 行内提示：InlineLoading
- ✅ 页面加载：PageLoading
- ✅ 按钮加载：LoadingIcon

---

## 📏 布局规范

### 间距系统

```tsx
// 卡片间距
space-y-4    // 卡片之间垂直间距
space-y-6    // 页面大区块间距
gap-3        // 按钮组间距
gap-4        // 表单字段间距

// 内边距
p-4          // 卡片内容
p-6          // 页面容器
p-8          // 大卡片内容

// 外边距
mb-4         // 小标题
mb-6         // 大标题
mt-2         // 副标题
```

### 圆角规范

```tsx
rounded-lg   // 卡片、输入框
rounded-xl   // 大卡片、按钮
rounded-full // 徽章、状态点
rounded-2xl  // 登录页卡片
```

### 边框规范

```tsx
// 装饰边框
border border-green-500/10    // 默认边框
border border-green-400/20    // 深一点
border border-green-400/30    // 更深
border border-green-400/60    // Hover状态

// 分隔线
border-t border-green-500/10
border-b border-green-500/10
```

---

## 🎭 动画规范

### 过渡时长

```css
/* 统一使用 300ms */
transition-all duration-300

/* 特殊情况 */
duration-500  /* 缓慢过渡（光晕） */
duration-1000 /* 扫过光效 */
```

### 常用动画

```css
/* Hover 缩放 */
hover:scale-[1.02]

/* 图标缩放 */
group-hover:scale-110

/* 旋转 */
animate-spin

/* 脉冲 */
animate-pulse

/* 自定义动画 */
animate-float      /* 浮动 */
animate-scan       /* 扫描线 */
animate-spin-slow  /* 慢速旋转 */
animate-pulse-slow /* 慢速脉冲 */
```

---

## 🖼️ 页面标题规范

### 统一的标题样式

```tsx
// 三色渐变标题（推荐）
<h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
  页面标题
</h1>

// 副标题
<p className="text-muted-foreground mt-2">
  页面描述
</p>
```

### 卡片标题

```tsx
// 带图标的标题
<CardTitle className="flex items-center gap-2">
  <IconComponent className="h-5 w-5 text-green-600 dark:text-green-400" />
  标题文字
</CardTitle>
```

---

## 🎨 特殊场景

### 1. 空状态

```tsx
<div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-3">
  <FolderOpen className="h-12 w-12 text-green-400/50" />
  <p>暂无数据</p>
</div>
```

### 2. 错误状态

```tsx
<TechCard>
  <CardContent className="p-6">
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center text-red-600 dark:text-red-400">
        <AlertCircle className="h-5 w-5 mr-2" />
        <span>错误信息</span>
      </div>
      <SecondaryButton onClick={retry}>
        <RefreshCw className="h-4 w-4 mr-2" />
        重试
      </SecondaryButton>
    </div>
  </CardContent>
</TechCard>
```

### 3. 批量操作

```tsx
<TechCard className="border-green-400/30 bg-green-500/5">
  <CardContent className="pt-6">
    <div className="flex items-center justify-between">
      <div className="text-sm text-green-700 dark:text-green-300 font-medium flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        已选择 {count} 项
      </div>
      <div className="flex gap-2">
        <DangerButton size="sm">删除</DangerButton>
        <SecondaryButton size="sm">取消</SecondaryButton>
      </div>
    </div>
  </CardContent>
</TechCard>
```

### 4. 表格表头

```tsx
<div className="grid grid-cols-12 gap-4 p-4 bg-gradient-to-r from-green-500/5 to-emerald-500/5 border border-green-400/20 rounded-lg font-medium text-sm">
  <div className="col-span-3 text-green-700 dark:text-green-300">列名1</div>
  <div className="col-span-3 text-green-700 dark:text-green-300">列名2</div>
  <div className="col-span-3 text-green-700 dark:text-green-300">列名3</div>
  <div className="col-span-3 text-green-700 dark:text-green-300">操作</div>
</div>
```

---

## 🔧 技术规范

### 导入顺序

```tsx
// 1. React 相关
import { useState, useEffect } from 'react'

// 2. Next.js 相关
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// 3. UI 组件
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// 4. 自定义组件
import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton } from '@/components/ui/primary-button'

// 5. Hooks
import { useAuth } from '@/hooks/use-auth'

// 6. 图标
import { Play, RefreshCw } from 'lucide-react'

// 7. 工具函数
import { cn } from '@/lib/utils'

// 8. 类型定义
import type { JobInfo } from '@/lib/scheduler-types'
```

### TypeScript 规范

```tsx
// ✅ 使用 interface
interface CardProps {
  title: string
  children: React.ReactNode
}

// ✅ 明确的类型定义
const handleClick = (id: string): void => {
  // ...
}

// ✅ 泛型使用
const [data, setData] = useState<JobInfo[]>([])
```

---

## 📱 响应式规范

### 断点使用

```tsx
// 手机优先
className="text-sm md:text-base lg:text-lg"

// 网格布局
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"

// Flex布局
className="flex flex-col md:flex-row gap-4"

// 显示/隐藏
className="hidden sm:block"
```

### 常用模式

```tsx
// 卡片响应式
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <TechCard>...</TechCard>
  <TechCard>...</TechCard>
  <TechCard>...</TechCard>
</div>

// 按钮组响应式
<div className="flex flex-col sm:flex-row gap-2">
  <PrimaryButton>主操作</PrimaryButton>
  <SecondaryButton>次操作</SecondaryButton>
</div>
```

---

## 🌓 暗色模式规范

### 颜色使用

```tsx
// ✅ 推荐：同时支持暗色
className="text-green-600 dark:text-green-400"
className="bg-white dark:bg-gray-800"
className="border-gray-200 dark:border-gray-700"

// ❌ 避免：只定义亮色
className="text-green-600"
className="bg-white"
```

### 常用组合

```tsx
// 背景
bg-white dark:bg-gray-800
bg-gray-50 dark:bg-gray-900

// 文字
text-gray-900 dark:text-gray-100
text-gray-600 dark:text-gray-400

// 边框
border-gray-200 dark:border-gray-700
border-green-400/30 dark:border-green-400/20
```

---

## ✨ 最佳实践

### 1. 卡片设计

```tsx
// ✅ 好的例子
<TechCard hover glowEffect>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-green-600 dark:text-green-400" />
      标题
    </CardTitle>
  </CardHeader>
  <CardContent>
    内容
  </CardContent>
</TechCard>

// ❌ 避免
<Card>
  <CardHeader>
    <CardTitle>标题</CardTitle>
  </CardHeader>
  <CardContent>
    内容
  </CardContent>
</Card>
```

### 2. 按钮设计

```tsx
// ✅ 好的例子
<div className="flex gap-2">
  <PrimaryButton>
    <PlayIcon className="h-4 w-4 mr-2" />
    启动
  </PrimaryButton>
  <SecondaryButton>
    <RefreshIcon className="h-4 w-4 mr-2" />
    刷新
  </SecondaryButton>
</div>

// ❌ 避免混用颜色
<div className="flex gap-2">
  <Button className="bg-blue-600">启动</Button>
  <Button className="bg-green-600">刷新</Button>
  <Button className="bg-orange-600">删除</Button>
</div>
```

### 3. 状态显示

```tsx
// ✅ 好的例子
<StatusBadge status="running" pulse>
  运行中
</StatusBadge>

// ❌ 避免
<Badge className="bg-green-100 text-green-800">
  运行中
</Badge>
```

### 4. 加载状态

```tsx
// ✅ 好的例子
{loading ? (
  <LoadingSpinner size="lg" text="加载中..." />
) : (
  <Content />
)}

// ❌ 避免
{loading ? (
  <div className="animate-spin">...</div>
) : (
  <Content />
)}
```

---

## 🚫 常见错误

### 1. 颜色混用

```tsx
// ❌ 错误
<Button className="bg-blue-600">操作1</Button>
<Button className="bg-green-600">操作2</Button>
<Button className="bg-orange-600">操作3</Button>

// ✅ 正确
<PrimaryButton>主操作</PrimaryButton>
<SecondaryButton>次操作1</SecondaryButton>
<SecondaryButton>次操作2</SecondaryButton>
```

### 2. 不使用通用组件

```tsx
// ❌ 错误
<Card>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</Card>

// ✅ 正确
<TechCard hover>
  <CardHeader>...</CardHeader>
  <CardContent>...</CardContent>
</TechCard>
```

### 3. 忘记暗色模式

```tsx
// ❌ 错误
className="text-green-600 bg-white"

// ✅ 正确
className="text-green-600 dark:text-green-400 bg-white dark:bg-gray-800"
```

### 4. 硬编码颜色

```tsx
// ❌ 错误
style={{ color: '#22c55e' }}

// ✅ 正确
className="text-green-500"
```

---

## 📋 代码检查清单

开发新页面时，请检查：

- [ ] 页面标题使用三色渐变
- [ ] 所有Card改为TechCard
- [ ] 主要按钮使用PrimaryButton
- [ ] 次要按钮使用SecondaryButton
- [ ] 状态标签使用StatusBadge
- [ ] 加载状态使用LoadingSpinner
- [ ] 支持暗色模式
- [ ] 支持响应式布局
- [ ] 添加适当的图标
- [ ] 统一的间距和圆角
- [ ] 绿色hover效果
- [ ] 300ms过渡动画

---

## 🎓 快速参考

### 常用类名组合

```tsx
// 输入框
className="border-green-500/20 focus:border-green-400/50 focus:ring-green-400/20"

// 选择器
className="border-green-500/20"

// 链接
className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"

// 行hover
className="hover:bg-green-500/5"

// 图标容器
className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-400/20 flex items-center justify-center"
```

---

## 📖 完整示例

### 标准页面结构

```tsx
'use client'

import { TechCard } from '@/components/ui/tech-card'
import { PrimaryButton, SecondaryButton } from '@/components/ui/primary-button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { FolderOpen } from 'lucide-react'

export default function MyPage() {
  const [loading, setLoading] = useState(false)
  
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
          我的页面
        </h1>
        <p className="text-muted-foreground mt-2">
          页面描述
        </p>
      </div>
      
      {/* 主要内容 */}
      <TechCard hover glowEffect>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
            内容标题
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingSpinner size="lg" text="加载中..." />
          ) : (
            <div>内容区域</div>
          )}
        </CardContent>
      </TechCard>
      
      {/* 操作按钮 */}
      <div className="flex gap-2">
        <PrimaryButton>
          主操作
        </PrimaryButton>
        <SecondaryButton>
          次操作
        </SecondaryButton>
      </div>
    </div>
  )
}
```

---

## 🎉 总结

遵循本风格指南，可以确保：

- ✅ **视觉统一** - 99%的风格一致性
- ✅ **代码质量** - 零错误，规范化
- ✅ **用户体验** - 流畅、专业、现代
- ✅ **可维护性** - 组件化、文档化
- ✅ **可扩展性** - 易于添加新功能

---

**🎊 遵循规范，打造专业级HPC平台界面！**

