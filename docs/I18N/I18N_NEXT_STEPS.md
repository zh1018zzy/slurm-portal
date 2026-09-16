# 国际化后续步骤指南

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## ✅ 已完成的核心国际化

1. **基础架构** - 完成
   - Layout 结构正确
   - 中间件配置正确
   - 路由包含语言前缀

2. **已国际化的组件**
   - ✅ LoginForm - 登录表单
   - ✅ LoginHeader - 登录头部
   - ✅ app/[locale]/page.tsx - 登录页面
   - ✅ dashboard/layout.tsx - Dashboard 侧边栏菜单

## 📋 需要继续国际化的页面

### 主要页面（按优先级）

1. **Dashboard 概览页**
   - 文件: `app/[locale]/dashboard/page.tsx`
   - 硬编码文本位置:
     - 第16行: "加载趋势图表中..."
     - 第24行: "加载公告中..."
     - 第32行: "存储信息加载中..."
     - 还有其他卡片标题和内容

2. **作业管理页面**
   - `app/[locale]/dashboard/jobs/page.tsx`
   - `app/[locale]/dashboard/submit/page.tsx`

3. **文件管理**
   - `app/[locale]/dashboard/files/page.tsx`

4. **系统管理**
   - `app/[locale]/dashboard/system/*` 下的所有页面

## 🔧 如何国际化一个页面

### 步骤 1: 添加翻译 Hook

**客户端组件** (`'use client'`)
```tsx
import { useT } from '@/lib/i18n-utils'

export default function MyPage() {
  const t = useT('pageName')  // 使用页面命名空间

  return <div>{t('title')}</div>
}
```

**服务器端组件**
```tsx
import { getT } from '@/lib/i18n-utils'

export default async function MyPage() {
  const t = await getT('pageName')

  return <div>{t('title')}</div>
}
```

### 步骤 2: 添加翻译键到 messages 文件

在 `messages/zh.json`:
```json
{
  "pageName": {
    "title": "标题",
    "description": "描述",
    "loadingText": "加载中..."
  }
}
```

在 `messages/en.json`:
```json
{
  "pageName": {
    "title": "Title",
    "description": "Description",
    "loadingText": "Loading..."
  }
}
```

### 步骤 3: 替换硬编码文本

**之前:**
```tsx
<div>加载中...</div>
```

**之后:**
```tsx
<div>{t('loadingText')}</div>
```

## 📝 翻译命名规范

### 命名空间组织

```
common         - 通用文本（按钮、状态等）
login          - 登录相关
dashboard      - Dashboard 菜单和通用
jobs           - 作业管理
files          - 文件管理
system         - 系统管理
compute        - 计算节点
applications   - 应用管理
notifications  - 通知
profile        - 个人资料
errors         - 错误消息
```

### 键名命名规则

- 使用驼峰命名: `submitJob`, `userManagement`
- 动作用动词: `submit`, `delete`, `cancel`
- 状态用名词: `pending`, `running`, `completed`
- 组合名词直接连接: `fileName`, `jobStatus`

## 🎯 快速国际化示例

### Dashboard 页面示例

**修改前** (`dashboard/page.tsx`):
```tsx
<div>加载趋势图表中...</div>
<CardTitle>存储信息</CardTitle>
```

**修改后**:
```tsx
'use client'
import { useT } from '@/lib/i18n-utils'

export default function DashboardPage() {
  const t = useT('dashboard')
  const tCommon = useT('common')

  return (
    <>
      <div>{tCommon('loading')}</div>
      <CardTitle>{t('storageInfo')}</CardTitle>
    </>
  )
}
```

**添加翻译** (`messages/zh.json`):
```json
{
  "dashboard": {
    "storageInfo": "存储信息",
    "trendChart": "趋势图表",
    "announcement": "公告"
  }
}
```

## 🔍 查找硬编码中文的方法

```bash
# 搜索包含中文的文件
grep -r "[\u4e00-\u9fa5]" app/[locale]/dashboard --include="*.tsx" -n

# 搜索特定文件
grep "[\u4e00-\u9fa5]" app/[locale]/dashboard/page.tsx -n
```

## ⚠️ 常见错误

### 1. 嵌套键名错误
❌ 错误: `t('dashboard.overview')`
✅ 正确: `const t = useT('dashboard'); t('overview')`

### 2. 客户端/服务器组件混用
❌ 错误: 在服务端组件使用 `useT`
✅ 正确: 服务端用 `getT`, 客户端用 `useT`

### 3. 忘记添加翻译键
确保 `zh.json` 和 `en.json` 都有相同的键

## 🚀 批量国际化建议

1. **先做高优先级页面**: 登录、Dashboard、作业管理
2. **复用 common 命名空间**: 按钮、状态等通用文本
3. **渐进式迁移**: 不需要一次性全部完成
4. **测试两种语言**: 每完成一个页面都测试中英文

## 📚 参考资源

- next-intl 文档: https://next-intl-docs.vercel.app/
- 已完成示例: `components/LoginForm.tsx`, `components/LoginHeader.tsx`
- 翻译文件: `messages/zh.json`, `messages/en.json`
- 工具函数: `lib/i18n-utils.ts`

---

**当前状态**: 核心功能已国际化，菜单翻译正常。页面内容国际化可以逐步进行。
