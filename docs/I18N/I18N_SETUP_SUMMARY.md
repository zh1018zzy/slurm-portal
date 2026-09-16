# 国际化（i18n）配置总结

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## ✅ 已完成的工作

### 1. 安装依赖
- ✅ 安装 `next-intl` 包及其依赖

### 2. 配置文件
- ✅ 创建 `i18n.ts` - 国际化配置文件
- ✅ 更新 `next.config.mjs` - 集成 next-intl 插件
- ✅ 更新 `middleware.ts` - 添加语言路由和检测

### 3. 目录结构重构
- ✅ 创建 `app/[locale]/` 目录结构
- ✅ 移动所有页面到 `[locale]` 目录下
- ✅ 创建 `app/[locale]/layout.tsx` 提供翻译上下文
- ✅ 更新根 `app/layout.tsx` 支持多语言

### 4. 翻译文件
- ✅ 创建 `messages/zh.json` - 中文翻译
- ✅ 创建 `messages/en.json` - 英文翻译
- ✅ 包含完整的翻译命名空间：
  - common（通用）
  - login（登录）
  - dashboard（仪表盘）
  - jobs（作业）
  - compute（计算节点）
  - applications（应用）
  - files（文件）
  - system（系统）
  - profile（个人资料）
  - notifications（通知）
  - errors（错误）

### 5. 组件和工具
- ✅ 创建 `components/LanguageSwitcher.tsx` - 语言切换组件
- ✅ 创建 `lib/i18n-utils.ts` - i18n 工具函数
- ✅ 创建 `types/i18n.d.ts` - TypeScript 类型定义

### 6. 文档和示例
- ✅ 创建 `docs/I18N_USAGE.md` - 完整使用文档
- ✅ 创建 `app/[locale]/i18n-example/` - 完整示例页面
- ✅ 创建本文档

## 🚀 如何使用

### 启动开发服务器

```bash
cd /opt/my-hpcapp
npm run dev
```

### 访问不同语言版本

- **中文版本**: http://localhost:3000/zh/
- **英文版本**: http://localhost:3000/en/
- **示例页面**: http://localhost:3000/zh/i18n-example 或 http://localhost:3000/en/i18n-example

### 在代码中使用翻译

#### 服务端组件
```tsx
import { getT } from '@/lib/i18n-utils';

export default async function MyPage() {
  const t = await getT('common');
  return <button>{t('submit')}</button>;
}
```

#### 客户端组件
```tsx
'use client';
import { useT } from '@/lib/i18n-utils';

export function MyComponent() {
  const t = useT('common');
  return <button>{t('submit')}</button>;
}
```

#### 添加语言切换器
```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export function Header() {
  return (
    <header>
      <LanguageSwitcher />
    </header>
  );
}
```

## 📁 重要文件

| 文件路径 | 说明 |
|---------|------|
| `i18n.ts` | i18n 配置，定义支持的语言 |
| `middleware.ts` | 路由中间件，处理语言检测 |
| `next.config.mjs` | Next.js 配置，集成 next-intl |
| `messages/zh.json` | 中文翻译文件 |
| `messages/en.json` | 英文翻译文件 |
| `app/[locale]/layout.tsx` | 语言布局，提供翻译上下文 |
| `components/LanguageSwitcher.tsx` | 语言切换组件 |
| `lib/i18n-utils.ts` | 工具函数（useT, getT, 格式化等） |
| `types/i18n.d.ts` | TypeScript 类型定义 |

## 🔧 配置说明

### 支持的语言
```typescript
export const locales = ['zh', 'en'] as const;
export const defaultLocale = 'zh';
```

### URL 结构
- 所有路由都包含语言前缀：`/zh/...` 或 `/en/...`
- 访问 `/` 会自动重定向到 `/zh/`

### 语言检测优先级
1. URL 中的语言前缀（最高优先级）
2. Cookie 中保存的语言偏好
3. 浏览器语言设置
4. 默认语言（中文）

## 📋 翻译命名空间

| 命名空间 | 用途 | 示例键 |
|---------|------|-------|
| `common` | 通用文本 | submit, cancel, save, loading |
| `login` | 登录页面 | username, password, login |
| `dashboard` | 仪表盘 | title, overview, welcome |
| `jobs` | 作业管理 | submit, list, status.running |
| `compute` | 计算节点 | nodes, cpuUsage, status.online |
| `applications` | 应用管理 | install, uninstall, version |
| `files` | 文件管理 | upload, download, fileName |
| `system` | 系统管理 | users, groups, settings |
| `profile` | 个人资料 | username, email, changePassword |
| `notifications` | 通知 | markAsRead, jobCompleted |
| `errors` | 错误信息 | general, network, unauthorized |

## 🎯 下一步

1. **更新现有组件**：将硬编码的中文文本替换为翻译键
2. **添加更多翻译**：根据需要扩展 `messages/*.json` 文件
3. **测试不同语言**：确保所有页面在中英文下都能正常显示
4. **添加语言切换器**：在导航栏或用户菜单中添加 `LanguageSwitcher`

## 💡 最佳实践

1. **保持翻译同步**：在 `zh.json` 和 `en.json` 中保持相同的键结构
2. **使用命名空间**：按功能模块组织翻译，避免命名冲突
3. **语义化键名**：使用描述性的键名，如 `submitJob` 而不是 `button1`
4. **服务端优先**：优先使用服务端组件和 `getT()`，减小客户端包体积
5. **类型安全**：利用 TypeScript 类型提示，避免使用错误的翻译键

## 📚 参考文档

- [完整使用文档](./I18N_USAGE.md)
- [示例页面](../../app/[locale]/i18n-example/page.tsx)
- [next-intl 官方文档](https://next-intl-docs.vercel.app/)

## ⚠️ 注意事项

1. **API 路由**：API 路由 (`/api`) 不在 `[locale]` 目录下，无法直接使用翻译
2. **构建**：首次构建可能需要更长时间，因为需要处理翻译文件
3. **缓存**：语言切换后可能需要刷新页面才能看到完整效果

## 🐛 故障排除

### 问题：翻译不显示
**解决方案**：
1. 检查翻译键是否在 `messages/*.json` 中存在
2. 检查命名空间是否正确
3. 清除浏览器缓存和 Next.js 缓存（`.next` 目录）

### 问题：类型错误
**解决方案**：
1. 重启 TypeScript 服务器
2. 检查 `types/i18n.d.ts` 是否正确导入
3. 运行 `npm run build` 检查类型错误

### 问题：中间件错误
**解决方案**：
1. 检查 `middleware.ts` 的导入是否正确
2. 确保 `i18n.ts` 配置正确
3. 查看控制台错误日志

## ✨ 完成！

国际化配置已完成，系统现在支持中英文双语。你可以：
1. 访问 `/zh/i18n-example` 查看完整示例
2. 使用 `LanguageSwitcher` 组件切换语言
3. 在任何组件中使用 `useT()` 或 `getT()` 获取翻译
4. 按照文档添加新的翻译和语言

有任何问题，请参考 `docs/I18N_USAGE.md` 获取详细信息。

