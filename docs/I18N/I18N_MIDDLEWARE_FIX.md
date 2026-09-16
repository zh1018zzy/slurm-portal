# 中间件修复说明

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🐛 问题描述

在初始的国际化实现中，中间件错误地将语言前缀添加到了所有路由，包括：
- API 路由：`/api/*` → `/zh/api/*` ❌
- 静态文件：`/favicon.ico` → `/zh/favicon.ico` ❌
- Next.js 内部路由：`/_next/*` → `/zh/_next/*` ❌

这导致所有 API 请求返回 404 错误。

## ✅ 解决方案

更新 `middleware.ts`，在应用国际化中间件之前，先检查并跳过不需要国际化的路径。

### 修复的路径
- ✅ `/api/*` - API 路由保持不变
- ✅ `/_next/*` - Next.js 内部资源
- ✅ `/favicon.ico` - 网站图标
- ✅ 图片文件（.png, .jpg, .svg 等）

### 修复后的行为

| 路径 | 处理方式 | 结果 |
|------|---------|------|
| `/` | 国际化 → | `/zh/` |
| `/dashboard` | 国际化 → | `/zh/dashboard` |
| `/api/users` | 跳过国际化 → | `/api/users` ✅ |
| `/api/notifications` | 跳过国际化 → | `/api/notifications` ✅ |
| `/_next/static/*` | 跳过国际化 → | `/_next/static/*` ✅ |
| `/favicon.ico` | 跳过国际化 → | `/favicon.ico` ✅ |

## 🔧 如何应用修复

### 方法 1：自动应用（推荐）
如果你接受了修改，代码已经更新。只需重启开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

### 方法 2：手动检查
打开 `middleware.ts` 确认包含以下代码：

```typescript
// 跳过 API 路由、静态文件等，这些不需要国际化
const shouldSkipI18n = 
  pathname.startsWith('/api/') ||
  pathname.startsWith('/_next/') ||
  pathname.startsWith('/favicon.ico') ||
  pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)$/);

if (shouldSkipI18n) {
  // 直接处理，不添加语言前缀
  // ... 许可证验证逻辑
  return NextResponse.next()
}

// 对于其他路径，应用国际化中间件
const response = intlMiddleware(request)
```

## 🧪 验证修复

### 1. 检查 API 路由
重启服务器后，在浏览器控制台或终端运行：

```bash
# 应该返回正常响应，不是 404
curl http://localhost:3000/api/users/theme

# 应该返回正常响应
curl http://localhost:3000/api/notifications
```

### 2. 检查国际化路由
```bash
# 应该重定向到 /zh/
curl -I http://localhost:3000/

# 应该正常访问
curl http://localhost:3000/zh/dashboard
curl http://localhost:3000/en/dashboard
```

### 3. 查看开发服务器日志
修复后，日志应该显示：
```
✓ GET /api/users/theme 200 in 50ms      ✅ 正常
✓ GET /api/notifications 200 in 30ms    ✅ 正常
✓ GET /zh/dashboard 200 in 100ms        ✅ 正常
```

而不是：
```
✗ GET /zh/api/users/theme 404 in 50ms   ❌ 错误
✗ GET /zh/api/notifications 404 in 30ms ❌ 错误
```

## 📋 完整的跳过规则

当前中间件跳过以下路径的国际化处理：

1. **API 路由**: `/api/*`
   - 示例：`/api/users`, `/api/jobs`, `/api/socketio`

2. **Next.js 内部资源**: `/_next/*`
   - 示例：`/_next/static/`, `/_next/image/`

3. **网站图标**: `/favicon.ico`

4. **图片文件**: 匹配 `.png|jpg|jpeg|gif|svg|ico|webp`
   - 示例：`/logo.png`, `/avatar.jpg`

## 🔄 更新文档

相关文档已同步更新：
- ✅ [I18N_IMPLEMENTATION_COMPLETE.md](./I18N_IMPLEMENTATION_COMPLETE.md)
- ✅ [BUILD_NOTES.md](./BUILD_NOTES.md)

## ⚠️ 重要说明

### API 路由的语言处理
API 路由本身不需要语言前缀，但：

1. **API 响应中的文本**：如果 API 返回需要翻译的文本，应该：
   - 在客户端根据当前语言翻译
   - 或者通过查询参数传递语言：`/api/users?lang=zh`

2. **错误信息**：API 错误信息可以：
   - 返回错误代码，客户端翻译
   - 或根据 `Accept-Language` 头返回对应语言

### 示例
```tsx
// 客户端组件
'use client';
import { useT } from '@/lib/i18n-utils';

function MyComponent() {
  const t = useT('errors');
  
  const fetchData = async () => {
    const response = await fetch('/api/users'); // ✅ 不需要 /zh/api/users
    
    if (!response.ok) {
      // 在客户端翻译错误信息
      toast.error(t('network'));
    }
  };
}
```

## 🎉 修复完成

应用此修复后：
- ✅ API 路由正常工作
- ✅ 国际化功能正常
- ✅ 静态资源正常加载
- ✅ 许可证验证正常

---

**修复日期**: 2025-10-14  
**影响文件**: middleware.ts  
**状态**: ✅ 已修复  

重启开发服务器后即可生效！

