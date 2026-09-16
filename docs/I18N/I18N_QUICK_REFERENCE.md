# 国际化快速参考 / i18n Quick Reference

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🚀 快速开始 / Quick Start

### 在服务端组件中使用 / Server Components
```tsx
import { getT } from '@/lib/i18n-utils';

export default async function Page() {
  const t = await getT('common');
  return <button>{t('submit')}</button>;
}
```

### 在客户端组件中使用 / Client Components
```tsx
'use client';
import { useT } from '@/lib/i18n-utils';

export function Component() {
  const t = useT('common');
  return <button>{t('submit')}</button>;
}
```

## 📦 常用导入 / Common Imports

```tsx
// 翻译函数 / Translation functions
import { useT, getT } from '@/lib/i18n-utils';

// 语言切换 / Language switcher
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// 获取当前语言 / Get current locale
import { useLocale } from 'next-intl';

// 格式化工具 / Formatting utils
import { formatDateTime, formatNumber, formatFileSize } from '@/lib/i18n-utils';
```

## 🎯 常用命名空间 / Common Namespaces

| 命名空间 / Namespace | 用途 / Purpose | 示例键 / Example Keys |
|---------------------|---------------|---------------------|
| `common` | 通用文本 | submit, cancel, save, loading |
| `dashboard` | 仪表盘 | title, welcome, overview |
| `jobs` | 作业管理 | submit, list, status.running |
| `errors` | 错误信息 | general, network, notFound |

## 🔧 常用 API / Common APIs

### 获取翻译 / Get Translation
```tsx
// 基础用法 / Basic
const t = useT('common');
t('submit') // "提交" or "Submit"

// 嵌套键 / Nested keys
const t = useT('jobs');
t('status.running') // "运行中" or "Running"
```

### 获取当前语言 / Get Current Locale
```tsx
import { useLocale } from 'next-intl';

function Component() {
  const locale = useLocale(); // 'zh' or 'en'
  return <div>Language: {locale}</div>;
}
```

### 格式化日期 / Format Date
```tsx
import { formatDateTime } from '@/lib/i18n-utils';
import { useLocale } from 'next-intl';

function DateDisplay() {
  const locale = useLocale();
  const formatted = formatDateTime(new Date(), locale);
  return <span>{formatted}</span>;
}
```

### 格式化数字 / Format Number
```tsx
import { formatNumber } from '@/lib/i18n-utils';

formatNumber(1234567.89, 'zh') // "1,234,567.89"
formatNumber(1234567.89, 'en') // "1,234,567.89"
```

### 格式化文件大小 / Format File Size
```tsx
import { formatFileSize } from '@/lib/i18n-utils';

formatFileSize(1024, 'zh')      // "1 KB"
formatFileSize(1048576, 'en')   // "1 MB"
```

## 🔗 导航 / Navigation

### 使用 Link 组件 / Using Link Component
```tsx
import Link from 'next/link';

// ✅ 正确 - 自动添加语言前缀 / Correct - auto adds locale
<Link href="/dashboard">Dashboard</Link>

// ❌ 错误 - 不要手动添加 / Wrong - don't add manually
<Link href="/zh/dashboard">Dashboard</Link>
```

### 编程式导航 / Programmatic Navigation
```tsx
'use client';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';

function Component() {
  const router = useRouter();
  const locale = useLocale();
  
  const navigate = () => {
    router.push(`/${locale}/dashboard`);
  };
  
  return <button onClick={navigate}>Go</button>;
}
```

## 🎨 语言切换器 / Language Switcher

```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function Header() {
  return (
    <header>
      <LanguageSwitcher />
    </header>
  );
}
```

## 📝 添加新翻译 / Adding New Translations

### 1. 在翻译文件中添加 / Add to translation files
```json
// messages/zh.json
{
  "myFeature": {
    "title": "我的功能"
  }
}

// messages/en.json
{
  "myFeature": {
    "title": "My Feature"
  }
}
```

### 2. 在组件中使用 / Use in component
```tsx
const t = useT('myFeature');
<h1>{t('title')}</h1>
```

## 🌐 URL 结构 / URL Structure

```
访问 / Access          重定向到 / Redirects to
/                  →  /zh/
/dashboard         →  /zh/dashboard (or /en/dashboard)
/zh/dashboard      →  中文仪表盘 / Chinese dashboard
/en/dashboard      →  英文仪表盘 / English dashboard
```

## ⚡ 性能提示 / Performance Tips

1. **优先使用服务端组件 / Prefer Server Components**
   ```tsx
   // ✅ 更好 / Better - Server Component
   const t = await getT('common');
   
   // ⚠️  仅在需要时 / Only when needed - Client Component
   const t = useT('common');
   ```

2. **按需导入命名空间 / Import namespaces as needed**
   ```tsx
   // ✅ 好 / Good
   const tCommon = useT('common');
   const tJobs = useT('jobs');
   
   // ❌ 避免 / Avoid - 不要多次获取相同命名空间
   const t1 = useT('common');
   const t2 = useT('common'); // 重复
   ```

## 🧪 测试 / Testing

```bash
# 验证配置 / Verify configuration
npm run verify:i18n

# 启动开发服务器 / Start dev server
npm run dev

# 访问不同语言 / Visit different locales
# http://localhost:3000/zh/
# http://localhost:3000/en/
# http://localhost:3000/zh/i18n-example
```

## 📋 常用翻译键 / Common Translation Keys

### 按钮 / Buttons
```tsx
t('common.submit')   // 提交 / Submit
t('common.cancel')   // 取消 / Cancel
t('common.save')     // 保存 / Save
t('common.delete')   // 删除 / Delete
t('common.edit')     // 编辑 / Edit
```

### 状态 / Status
```tsx
t('common.loading')  // 加载中... / Loading...
t('common.success')  // 成功 / Success
t('common.error')    // 错误 / Error
t('common.warning')  // 警告 / Warning
```

### 作业状态 / Job Status
```tsx
t('jobs.status.pending')    // 等待中 / Pending
t('jobs.status.running')    // 运行中 / Running
t('jobs.status.completed')  // 已完成 / Completed
t('jobs.status.failed')     // 失败 / Failed
```

## 🐛 常见问题 / Common Issues

### 问题：翻译不显示 / Translation not showing
```tsx
// ❌ 错误 / Wrong
t('submit')  // 如果命名空间不是 common

// ✅ 正确 / Correct
const t = useT('common');
t('submit')
```

### 问题：类型错误 / Type error
```bash
# 解决方案 / Solution
# 1. 重启 TS 服务器 / Restart TS server
# 2. 检查 types/i18n.d.ts / Check types/i18n.d.ts
# 3. 清除缓存 / Clear cache
rm -rf .next
```

### 问题：路由错误 / Routing error
```tsx
// ❌ 错误 / Wrong
<Link href="/zh/dashboard">

// ✅ 正确 / Correct
<Link href="/dashboard">  // 自动添加语言前缀
```

## 📚 更多资源 / More Resources

- 📖 [完整文档 / Full Documentation](./I18N_USAGE.md)
- 📋 [配置总结 / Setup Summary](./I18N_SETUP_SUMMARY.md)
- 🔍 [示例页面 / Example Page](../../app/[locale]/i18n-example/page.tsx)
- 🌐 [官方文档 / Official Docs](https://next-intl-docs.vercel.app/)

---

**提示 / Tip**: 收藏此页面以便快速查阅！ / Bookmark this page for quick reference!

