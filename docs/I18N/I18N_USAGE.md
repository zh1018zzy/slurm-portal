# 国际化（i18n）使用指南

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

本项目已集成 `next-intl` 实现完整的国际化支持，支持中文（zh）和英文（en）两种语言。

## 目录结构

```
/opt/my-hpcapp/
├── app/
│   ├── [locale]/          # 语言路由目录
│   │   ├── layout.tsx     # 语言布局（提供翻译上下文）
│   │   ├── page.tsx       # 登录页面
│   │   └── dashboard/     # 所有页面都在 [locale] 下
│   └── layout.tsx         # 根布局
├── messages/              # 翻译文件
│   ├── zh.json           # 中文翻译
│   └── en.json           # 英文翻译
├── components/
│   └── LanguageSwitcher.tsx  # 语言切换组件
├── lib/
│   └── i18n-utils.ts     # i18n 工具函数
├── types/
│   └── i18n.d.ts         # i18n 类型定义
├── i18n.ts               # i18n 配置
└── middleware.ts         # 中间件（包含语言路由）
```

## 基本使用

### 1. 在客户端组件中使用

```tsx
'use client';

import { useT } from '@/lib/i18n-utils';

export function MyClientComponent() {
  const t = useT('common');
  
  return (
    <div>
      <button>{t('submit')}</button>
      <button>{t('cancel')}</button>
    </div>
  );
}
```

### 2. 在服务端组件中使用

```tsx
import { getT } from '@/lib/i18n-utils';

export default async function MyServerComponent() {
  const t = await getT('dashboard');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <p>{t('welcome')}</p>
    </div>
  );
}
```

### 3. 使用嵌套的翻译键

```tsx
import { useT } from '@/lib/i18n-utils';

export function JobStatus() {
  const t = useT('jobs');
  
  return <span>{t('status.running')}</span>;
}
```

### 4. 添加语言切换器

在任何客户端组件中添加语言切换器：

```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Header() {
  return (
    <header>
      <nav>
        {/* 其他导航项 */}
        <LanguageSwitcher />
      </nav>
    </header>
  );
}
```

## 翻译文件管理

### 添加新的翻译

1. 在 `messages/zh.json` 中添加中文翻译
2. 在 `messages/en.json` 中添加对应的英文翻译

示例：

```json
// messages/zh.json
{
  "myFeature": {
    "title": "我的功能",
    "description": "这是功能描述"
  }
}

// messages/en.json
{
  "myFeature": {
    "title": "My Feature",
    "description": "This is the feature description"
  }
}
```

### 翻译命名空间

项目中已定义的翻译命名空间：

- `common` - 通用文本（按钮、状态等）
- `login` - 登录页面
- `dashboard` - 仪表盘
- `jobs` - 作业管理
- `compute` - 计算节点
- `applications` - 应用管理
- `files` - 文件管理
- `system` - 系统管理
- `profile` - 个人资料
- `notifications` - 通知
- `errors` - 错误信息

## 工具函数

### 格式化日期时间

```tsx
import { formatDateTime } from '@/lib/i18n-utils';
import { useLocale } from 'next-intl';

export function DateDisplay({ date }: { date: Date }) {
  const locale = useLocale();
  
  return <span>{formatDateTime(date, locale)}</span>;
}
```

### 格式化数字

```tsx
import { formatNumber } from '@/lib/i18n-utils';
import { useLocale } from 'next-intl';

export function NumberDisplay({ value }: { value: number }) {
  const locale = useLocale();
  
  return <span>{formatNumber(value, locale)}</span>;
}
```

### 格式化文件大小

```tsx
import { formatFileSize } from '@/lib/i18n-utils';
import { useLocale } from 'next-intl';

export function FileSizeDisplay({ bytes }: { bytes: number }) {
  const locale = useLocale();
  
  return <span>{formatFileSize(bytes, locale)}</span>;
}
```

## URL 路由

所有页面 URL 都包含语言前缀：

- 中文：`/zh/dashboard`
- 英文：`/en/dashboard`

访问根路径 `/` 会自动重定向到 `/zh/`（默认语言）。

## 链接处理

使用 Next.js Link 组件时，无需手动添加语言前缀：

```tsx
import Link from 'next/link';

// ✅ 正确 - 会自动添加语言前缀
<Link href="/dashboard">Dashboard</Link>

// ❌ 错误 - 不要手动添加语言前缀
<Link href="/zh/dashboard">Dashboard</Link>
```

## 类型安全

项目配置了 TypeScript 类型安全，使用 `useT()` 或 `getT()` 时会有完整的类型提示和自动补全。

```tsx
const t = useT('common');
// TypeScript 会提示所有可用的键
t('submit')  // ✅ 正确
t('invalid') // ❌ TypeScript 错误
```

## 最佳实践

1. **保持翻译文件同步**：添加新翻译时，确保中英文文件都有对应的键
2. **使用命名空间**：按功能模块组织翻译，避免全局命名冲突
3. **避免硬编码文本**：所有用户可见的文本都应该通过翻译文件管理
4. **复用通用翻译**：按钮、状态等通用文本使用 `common` 命名空间
5. **语义化键名**：使用描述性的键名，如 `submitJob` 而不是 `button1`

## 添加新语言

要添加新语言（如日语 `ja`）：

1. 在 `i18n.ts` 中添加语言代码：
   ```ts
   export const locales = ['zh', 'en', 'ja'] as const;
   ```

2. 创建翻译文件 `messages/ja.json`

3. 在 `LanguageSwitcher.tsx` 中添加语言显示名称：
   ```ts
   const languageNames = {
     zh: { native: '中文', english: 'Chinese' },
     en: { native: 'English', english: 'English' },
     ja: { native: '日本語', english: 'Japanese' },
   };
   ```

## 常见问题

### Q: 如何获取当前语言？
```tsx
import { useLocale } from 'next-intl';

export function MyComponent() {
  const locale = useLocale(); // 'zh' 或 'en'
  return <div>Current language: {locale}</div>;
}
```

### Q: 如何在 API 路由中使用翻译？
API 路由不在 `[locale]` 目录下，无法直接使用翻译。建议在客户端处理 API 响应时翻译错误信息。

### Q: 如何处理动态内容？
对于需要插值的翻译：
```json
{
  "welcome": "欢迎, {name}！"
}
```

```tsx
const t = useT('common');
t('welcome', { name: userName })
```

## 性能优化

- 翻译文件在构建时被静态优化
- 服务端组件使用 `getT()` 避免客户端包体积增大
- 只有当前语言的翻译会被加载

## 测试

要测试不同语言：

1. 访问 `/zh/` 查看中文版本
2. 访问 `/en/` 查看英文版本
3. 使用语言切换器在运行时切换语言

## 参考资源

- [next-intl 官方文档](https://next-intl-docs.vercel.app/)
- [Next.js 国际化指南](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

