# 登录页面定制指南

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 🎨 快速定制

### 1. 修改主题颜色

#### 方案 A：青蓝紫配色（当前默认）
```tsx
// 无需修改，默认即是
主色：cyan (青色)
辅色：blue (蓝色)
点缀：purple (紫色)
```

#### 方案 B：更改为绿色科技风
在 `components/LoginForm.tsx` 和 `app/[locale]/page.tsx` 中：

```tsx
// 替换所有 cyan-xxx → green-xxx
// 替换所有 blue-xxx → emerald-xxx

// 例如：
className="text-cyan-400" → className="text-green-400"
className="from-cyan-500" → className="from-green-500"
```

#### 方案 C：更改为橙色科技风
```tsx
// cyan → orange
// blue → amber
// purple → red

// 例如：
className="text-cyan-400" → className="text-orange-400"
```

---

### 2. 调整背景风格

#### 更深的背景（更强对比）
```tsx
// app/[locale]/page.tsx
className="bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-950"
↓ 改为 ↓
className="bg-gradient-to-br from-black via-slate-950 to-black"
```

#### 更亮的背景（减少对比）
```tsx
className="bg-gradient-to-br from-slate-950 via-blue-950/50 to-slate-950"
↓ 改为 ↓
className="bg-gradient-to-br from-slate-900 via-blue-900/50 to-slate-900"
```

#### 移除扫描线效果
```tsx
// app/[locale]/page.tsx
// 删除或注释这行：
<div className="absolute inset-0 bg-[linear-gradient(...)] animate-scan" />
```

---

### 3. 调整动画速度

#### 加快动画（更激进）
```css
/* app/globals.css */

/* Logo 浮动：3s → 2s */
.animate-float {
  animation: float 2s ease-in-out infinite;
}

/* 扫描线：8s → 4s */
.animate-scan {
  animation: scan 4s linear infinite;
}

/* 旋转光环：8s → 4s */
.animate-spin-slow {
  animation: spin-slow 4s linear infinite;
}
```

#### 减慢动画（更舒缓）
```css
/* Logo 浮动：3s → 5s */
.animate-float {
  animation: float 5s ease-in-out infinite;
}

/* 扫描线：8s → 12s */
.animate-scan {
  animation: scan 12s linear infinite;
}

/* 旋转光环：8s → 15s */
.animate-spin-slow {
  animation: spin-slow 15s linear infinite;
}
```

---

### 4. 自定义 Logo

#### 使用图片 Logo
```tsx
// components/LoginHeader.tsx

// 替换 Cpu 图标为图片：
<Cpu className="w-10 h-10 text-white relative z-10" />
↓ 改为 ↓
<img src="/logo.png" alt="Logo" className="w-10 h-10 relative z-10" />
```

#### 移除旋转光环
```tsx
// components/LoginHeader.tsx

// 删除或注释这部分：
<div className="absolute inset-0 animate-spin-slow">
  <div className="w-20 h-20 border-2 border-transparent border-t-cyan-400 border-r-blue-400 rounded-full" />
</div>
```

---

### 5. 简化输入框（移除浮动标签）

如果您更喜欢传统的静态标签：

```tsx
// components/LoginForm.tsx

// 用户名输入框 - 恢复静态标签
<div className="space-y-2">
  <Label htmlFor="username" className="text-sm font-medium text-gray-200">
    {t('username')}
  </Label>
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
      <User className="h-5 w-5 text-gray-400" />
    </div>
    <Input
      id="username"
      type="text"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      required
      className="h-14 pl-12 pr-4 bg-white/5 border border-white/10 text-white
                 focus:border-cyan-400/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.15)]
                 transition-all duration-300 rounded-xl"
    />
  </div>
</div>
```

---

### 6. 修改卡片样式

#### 移除角落装饰
```tsx
// app/[locale]/page.tsx

// 删除这4行：
<div className="absolute top-4 left-4 w-3 h-3 border-l-2 border-t-2 border-cyan-400/50" />
<div className="absolute top-4 right-4 w-3 h-3 border-r-2 border-t-2 border-cyan-400/50" />
<div className="absolute bottom-4 left-4 w-3 h-3 border-l-2 border-b-2 border-cyan-400/50" />
<div className="absolute bottom-4 right-4 w-3 h-3 border-r-2 border-b-2 border-cyan-400/50" />
```

#### 使用圆角卡片
```tsx
// app/[locale]/page.tsx
className="rounded-2xl" → className="rounded-3xl"
```

#### 增加卡片透明度
```tsx
className="bg-slate-900/80" → className="bg-slate-900/60"
```

---

### 7. 自定义状态指示器

#### 只显示关键状态
```tsx
// app/[locale]/page.tsx

// 只保留"系统在线"：
<div className="mt-8 flex justify-center">
  <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
    <div className="relative">
      <div className="w-2 h-2 bg-green-400 rounded-full" />
      <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping" />
    </div>
    <Shield className="w-3 h-3 text-green-400" />
    <span className="text-gray-300 font-medium">{t('systemOnline')}</span>
  </div>
</div>
```

#### 完全移除状态指示器
```tsx
// app/[locale]/page.tsx
// 删除整个状态指示器区块（第73-97行）
```

---

## 🔧 高级定制

### 1. 添加"记住我"选项

```tsx
// components/LoginForm.tsx

// 在密码输入框后添加：
<div className="flex items-center">
  <input
    id="remember"
    type="checkbox"
    className="w-4 h-4 text-cyan-600 bg-white/5 border-white/20 rounded focus:ring-cyan-500"
  />
  <label htmlFor="remember" className="ml-2 text-sm text-gray-400">
    {t('rememberMe')}
  </label>
</div>
```

### 2. 添加"忘记密码"链接

```tsx
// components/LoginForm.tsx

// 在登录按钮前添加：
<div className="flex justify-end">
  <Link 
    href="/forgot-password" 
    className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
  >
    {t('forgotPassword')}
  </Link>
</div>
```

### 3. 添加社交登录按钮

```tsx
// components/LoginForm.tsx

// 在分隔线后添加：
<div className="space-y-3">
  <Button
    type="button"
    variant="outline"
    className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10"
  >
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
      {/* GitHub 图标 SVG */}
    </svg>
    {t('loginWithGitHub')}
  </Button>
  
  <Button
    type="button"
    variant="outline"
    className="w-full h-12 bg-white/5 border-white/10 text-white hover:bg-white/10"
  >
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
      {/* Google 图标 SVG */}
    </svg>
    {t('loginWithGoogle')}
  </Button>
</div>
```

### 4. 添加注册链接

```tsx
// components/LoginForm.tsx

// 在表单最后添加：
<div className="text-center text-sm text-gray-400">
  {t('noAccount')}
  <Link 
    href="/register" 
    className="ml-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
  >
    {t('signUp')}
  </Link>
</div>
```

---

## 🎨 预设主题方案

### 主题 1：冰蓝科技（默认）
```css
主色：cyan-400
辅色：blue-600
背景：slate-950
光效：cyan + blue
```

### 主题 2：绿色矩阵
```css
主色：green-400
辅色：emerald-600
背景：slate-950
光效：green + emerald
```

### 主题 3：紫色赛博
```css
主色：purple-400
辅色：fuchsia-600
背景：slate-950
光效：purple + fuchsia
```

### 主题 4：橙色能量
```css
主色：orange-400
辅色：amber-600
背景：slate-950
光效：orange + amber
```

### 主题 5：红色警戒
```css
主色：red-400
辅色：rose-600
背景：slate-950
光效：red + rose
```

---

## 🔍 常见问题

### Q1: 如何禁用所有动画？
```css
/* app/globals.css */

/* 在文件底部添加： */
@media (prefers-reduced-motion: reduce) {
  * {
    animation: none !important;
    transition: none !important;
  }
}
```

### Q2: 如何让输入框更大？
```tsx
// components/LoginForm.tsx
className="h-14" → className="h-16"
className="text-sm" → className="text-base"
```

### Q3: 如何移除粒子背景？
```tsx
// app/[locale]/page.tsx
// 删除或注释：
<ParticleBackground />
```

### Q4: 如何加快页面加载？
```tsx
// 移除不必要的效果：
- 扫描线
- 霓虹光晕
- 粒子背景
- 旋转光环
```

### Q5: 如何适配其他语言？
```tsx
// 确保 i18n 配置文件包含所有文本：
// messages/[locale]/login.json

{
  "title": "HPC 管理系统",
  "subtitle": "高性能计算集群管理平台",
  "username": "用户名",
  "password": "密码",
  "login": "登录",
  "loading": "登录中...",
  "loginFailed": "登录失败",
  "systemOnline": "系统在线",
  "clusterNormal": "集群正常",
  "realtimeMonitoring": "实时监控"
}
```

---

## 💡 优化建议

### 性能优化
1. **移动端减少动画**
   ```tsx
   // 使用 CSS media query
   @media (max-width: 768px) {
     .animate-scan { display: none; }
   }
   ```

2. **懒加载粒子背景**
   ```tsx
   import dynamic from 'next/dynamic'
   const ParticleBackground = dynamic(() => import('@/components/ParticleBackground'), {
     ssr: false
   })
   ```

3. **优化图片资源**
   - Logo 使用 SVG 格式
   - 背景图片压缩
   - 使用 WebP 格式

### 用户体验优化
1. **添加键盘导航**
   - Tab 键切换输入框
   - Enter 键提交表单

2. **添加加载状态**
   - 防止重复提交
   - 显示加载进度

3. **改进错误提示**
   - 具体的错误信息
   - 自动消失（3-5秒）

---

## 📚 相关文件

### 核心文件
- `components/LoginForm.tsx` - 登录表单
- `app/[locale]/page.tsx` - 登录页面
- `components/LoginHeader.tsx` - Logo 和标题
- `app/globals.css` - 全局样式和动画

### 配置文件
- `tailwind.config.ts` - Tailwind 配置
- `messages/[locale]/login.json` - 国际化文本
- `app/api/auth/route.ts` - 登录 API

### 组件库
- `components/ui/button.tsx` - 按钮组件
- `components/ui/input.tsx` - 输入框组件
- `components/ParticleBackground.tsx` - 粒子背景

---

## 🎯 下一步

1. ✅ 浏览页面查看效果
2. ✅ 根据需要调整颜色
3. ✅ 自定义 Logo 和文案
4. ✅ 测试移动端体验
5. ✅ 添加额外功能（如需要）

---

**🎉 享受您的现代化登录页面！**

