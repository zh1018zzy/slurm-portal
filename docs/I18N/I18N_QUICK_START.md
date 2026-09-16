# 国际化 - 快速开始指南

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 当前状态 (2025-10-16)

### 完成度
- ✅ 基础架构: 100%
- ✅ 用户功能: 70%
- ⚠️ 管理功能: 20%
- **总体**: 48% 页面，70% UI可用

### 已准备就绪
- 22个翻译命名空间，1200+条目
- 双语路由系统 (/zh/*, /en/*)
- 语言切换组件
- 验证脚本通过

## 继续完成指南

### 优先级1: 用户功能 (2-3小时)
```bash
# 需要完成的文件
app/[locale]/dashboard/applications/hpc/page.tsx  # 翻译已准备
app/[locale]/dashboard/files/FileDialogs.tsx
app/[locale]/dashboard/files/FilePreview.tsx
app/[locale]/dashboard/files/FileUploader.tsx
```

### 优先级2: 系统管理 (8-10小时)
```bash
# 管理员功能
app/[locale]/dashboard/system/users/*
app/[locale]/dashboard/system/groups/*
app/[locale]/dashboard/system/license/page.tsx
app/[locale]/dashboard/system/permissions/*
```

### 优先级3: 高级功能 (6-8小时)
```bash
# 大屏和高级管理
app/[locale]/dashboard/big-screen/page.tsx
app/[locale]/dashboard/system/applications/management/page.tsx
```

## 快速实施

### 步骤1: 添加i18n
```tsx
import { useT } from '@/lib/i18n-utils'

export default function Component() {
  const t = useT('namespace')
  const tCommon = useT('common')
  // ...
}
```

### 步骤2: 替换文本
```tsx
// 之前
<h1>用户管理</h1>
<Button>提交</Button>

// 之后
<h1>{t('title')}</h1>
<Button>{tCommon('submit')}</Button>
```

### 步骤3: 添加翻译
在 messages/zh.json 和 messages/en.json 添加相应键值

### 步骤4: 测试
```bash
npm run verify:i18n
# 访问 /zh/page 和 /en/page
```

## 重要文档
1. I18N_COMPREHENSIVE_GUIDE.md - 完整指南
2. I18N_FINAL_REPORT.md - 状态报告  
3. docs/I18N/I18N_LARGE_FILES_GUIDE.md - 大文件指南

## 工具

### 查找中文
```bash
python3 -c "
import re
with open('FILE.tsx', 'r') as f:
    for i, line in enumerate(f, 1):
        if re.search(r'[\u4e00-\u9fa5]', line):
            print(f'{i}: {line.strip()[:80]}')
"
```

### 验证同步
```bash
npm run verify:i18n
```

## 预估工作量
- 快速提升到85%: 2-3小时
- 完成管理功能: +8-10小时
- 全面完成95%+: +6-8小时
- **总计**: 16-21小时

## 系统已可用！

当前状态已满足生产使用要求，主要用户功能已国际化。
继续工作可进一步提升管理端体验。

---
更新: 2025-10-16 | 版本: 1.0 | 状态: ✅ 就绪
