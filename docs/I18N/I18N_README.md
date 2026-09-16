# 国际化（i18n）资源索引

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

> HPC 管理平台已完成国际化配置，支持中文（zh）和英文（en）双语切换

## 📚 文档目录

### 🎯 快速入门（推荐）
- **[实施完成报告](./I18N_IMPLEMENTATION_COMPLETE.md)** ⭐ - 完整的实施总结和快速开始（推荐第一份文档）
- **[配置总结](./I18N_SETUP_SUMMARY.md)** - 了解已完成的配置和快速开始指南
- **[快速参考](./I18N_QUICK_REFERENCE.md)** - 常用 API 和代码片段速查表

### 📖 详细文档
- **[完整使用指南](./I18N_USAGE.md)** - 详细的使用说明、最佳实践和常见问题
- **[详细变更清单](./I18N_CHANGES.md)** - 技术实现细节和迁移指南

### 🔧 技术参考
- **[构建说明](./BUILD_NOTES.md)** - 构建注意事项和问题解决

### 💻 示例代码
- **[示例页面](../../app/[locale]/i18n-example/page.tsx)** - 完整的服务端组件示例
- **[客户端示例](../../app/[locale]/i18n-example/ClientExample.tsx)** - 客户端组件示例

## 🗂️ 核心文件

### 配置文件
```
i18n.ts                     # i18n 主配置文件
middleware.ts               # 路由中间件（含语言检测）
next.config.mjs             # Next.js 配置（集成 next-intl）
```

### 翻译文件
```
messages/
├── zh.json                 # 中文翻译
└── en.json                 # 英文翻译
```

### 应用结构
```
app/
├── layout.tsx              # 根布局
└── [locale]/               # 语言路由目录
    ├── layout.tsx          # 语言布局（提供翻译上下文）
    ├── page.tsx            # 登录页面
    ├── dashboard/          # 仪表盘
    ├── i18n-example/       # 国际化示例
    └── ...                 # 其他页面
```

### 组件和工具
```
components/
└── LanguageSwitcher.tsx    # 语言切换组件

lib/
└── i18n-utils.ts           # i18n 工具函数

types/
└── i18n.d.ts               # TypeScript 类型定义
```

### 脚本
```
scripts/
└── verify-i18n.js          # 国际化配置验证脚本
```

## 🚀 快速命令

```bash
# 验证国际化配置
npm run verify:i18n

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm run start
```

## 🌐 访问地址

| 路径 | 说明 |
|------|------|
| `http://localhost:3000/` | 自动重定向到 `/zh/` |
| `http://localhost:3000/zh/` | 中文版本登录页 |
| `http://localhost:3000/en/` | 英文版本登录页 |
| `http://localhost:3000/zh/dashboard` | 中文仪表盘 |
| `http://localhost:3000/en/dashboard` | 英文仪表盘 |
| `http://localhost:3000/zh/i18n-example` | 中文示例页面 |
| `http://localhost:3000/en/i18n-example` | 英文示例页面 |

## 📖 使用速查

### 服务端组件
```tsx
import { getT } from '@/lib/i18n-utils';

export default async function Page() {
  const t = await getT('common');
  return <button>{t('submit')}</button>;
}
```

### 客户端组件
```tsx
'use client';
import { useT } from '@/lib/i18n-utils';

export function Component() {
  const t = useT('common');
  return <button>{t('submit')}</button>;
}
```

### 语言切换器
```tsx
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

<LanguageSwitcher />
```

## 🎯 翻译命名空间

当前支持的翻译命名空间：

- `common` - 通用文本（按钮、状态等）
- `login` - 登录页面
- `dashboard` - 仪表盘
- `jobs` - 作业管理
- `compute` - 计算节点
- `applications` - 应用管理
- `files` - 文件管理
- `system` - 系统管理
- `profile` - 个人资料
- `notifications` - 通知中心
- `errors` - 错误信息

## 🔧 开发工作流

### 1. 添加新翻译
```bash
# 编辑翻译文件
vim messages/zh.json
vim messages/en.json
```

### 2. 验证配置
```bash
npm run verify:i18n
```

### 3. 测试
```bash
npm run dev
# 访问 /zh/ 和 /en/ 测试不同语言
```

### 4. 在组件中使用
```tsx
const t = useT('yourNamespace');
<div>{t('yourKey')}</div>
```

## 📋 翻译文件结构

```json
{
  "namespace": {
    "key": "翻译文本",
    "nested": {
      "key": "嵌套翻译"
    }
  }
}
```

使用方式：
```tsx
t('namespace.key')           // "翻译文本"
t('namespace.nested.key')    // "嵌套翻译"
```

## 🔍 验证清单

运行 `npm run verify:i18n` 会检查：

- ✅ 翻译文件是否存在
- ✅ 翻译文件格式是否正确
- ✅ 中英文翻译键是否一致
- ✅ 必需的配置文件是否存在
- ✅ 目录结构是否正确
- ✅ next-intl 依赖是否已安装

## 🎨 最佳实践

1. **保持翻译同步** - zh.json 和 en.json 应有相同的键结构
2. **使用命名空间** - 按功能模块组织翻译
3. **语义化键名** - 使用描述性的键名
4. **服务端优先** - 优先使用服务端组件和 `getT()`
5. **类型安全** - 利用 TypeScript 类型提示

## 🆘 获取帮助

- 📖 查看 [完整使用指南](./I18N_USAGE.md)
- 🔍 查看 [快速参考](./I18N_QUICK_REFERENCE.md)
- 💡 查看 [示例代码](../../app/[locale]/i18n-example/)
- 🐛 运行 `npm run verify:i18n` 诊断问题

## 🚀 添加新语言

要添加新语言（如日语）：

1. 在 `i18n.ts` 中添加语言代码
2. 创建 `messages/ja.json` 翻译文件
3. 在 `LanguageSwitcher.tsx` 中添加语言选项
4. 运行 `npm run verify:i18n` 验证

详见 [完整使用指南](./I18N_USAGE.md#添加新语言)

## 📦 依赖信息

- **next-intl**: ^4.3.12
- **Next.js**: 14.2.7
- **React**: 18

## 🎉 完成！

国际化配置已完成，开始使用：

```bash
npm run dev
```

然后访问：
- 中文版：http://localhost:3000/zh/
- 英文版：http://localhost:3000/en/
- 示例页：http://localhost:3000/zh/i18n-example

---

**最后更新**: 2025-10-14  
**版本**: 1.0.0  
**状态**: ✅ 已完成并验证

