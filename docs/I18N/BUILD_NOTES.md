# 构建注意事项

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 国际化相关

### 开发模式（推荐用于测试国际化）

```bash
npm run dev
```

开发模式不会进行静态预渲染，可以正常测试国际化功能。

### 生产构建问题

当前构建可能会遇到 LDAP 连接错误，这是因为：

1. Next.js 在构建时尝试预渲染某些页面
2. 这些页面在服务端组件中尝试连接 LDAP 服务器
3. 如果 LDAP 服务器不可达，构建会失败

### 解决方案

#### 方案 1：跳过预渲染（推荐用于开发）
在需要外部服务的页面中添加 `dynamic`:

```tsx
// 在页面顶部添加
export const dynamic = 'force-dynamic';
```

#### 方案 2：配置构建跳过静态生成
在 `next.config.mjs` 中：

```javascript
experimental: {
  isrMemoryCacheSize: 0, // 禁用 ISR 缓存
}
```

#### 方案 3：使用环境变量控制
构建时使用模拟数据：

```bash
BUILD_MODE=offline npm run build
```

## 国际化测试

国际化功能在开发模式下完全正常：

```bash
# 启动开发服务器
npm run dev

# 访问测试
# 中文: http://localhost:3000/zh/
# 英文: http://localhost:3000/en/
# 示例: http://localhost:3000/zh/i18n-example
```

## 验证国际化配置

```bash
npm run verify:i18n
```

这个验证脚本不需要构建，可以随时运行。

