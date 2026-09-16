# 大型文件国际化实施指南

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

本指南针对以下大型文件的国际化工作：

## 待处理文件列表

### 1. applications/hpc/page.tsx (85行 - 高优先级)
**用途**: HPC应用中心主页面
**预估工作量**: 2-3小时
**翻译命名空间**: `hpcApplications`

**主要文本类型**:
- 页面标题和描述
- 应用卡片内容
- 表单标签
- Toast 通知消息
- 按钮文本

**实施步骤**:
1. 添加导入: `import { useT } from '@/lib/i18n-utils'`
2. 在组件中: `const t = useT('hpcApplications')`
3. 替换所有硬编码中文
4. 在 messages/zh.json 和 en.json 中添加翻译键

**关键翻译文本**:
```json
{
  "hpcApplications": {
    "title": "HPC应用中心",
    "description": "浏览和启动HPC计算应用",
    "loadingForm": "加载应用表单中...",
    "accessDenied": "访问被拒绝",
    "centerDisabled": "应用中心功能已被管理员禁用",
    "submitSuccess": "作业提交成功",
    "submitFailed": "提交失败",
    "jobId": "作业ID",
    "discovering": "发现应用中...",
    "initializing": "初始化中..."
  }
}
```

### 2. big-screen/page.tsx (125行 - 中优先级)
**用途**: 集群大屏监控显示
**预估工作量**: 3-4小时
**翻译命名空间**: `bigScreen` (已存在)

**注意**: 这个文件已有bigScreen命名空间，需要检查哪些文本缺失

### 3. system/applications/management/page.tsx (218行 - 管理员功能)
**用途**: 应用管理后台
**预估工作量**: 4-5小时
**翻译命名空间**: `applicationManagement` (需创建)

### 4. system/license/page.tsx (90行 - 管理员功能)
**用途**: 许可证管理
**预估工作量**: 2-3小时
**翻译命名空间**: `license` (部分已存在)

### 5. system/permissions/file-permissions/page.tsx (70行)
**用途**: 文件权限管理
**预估工作量**: 2小时
**翻译命名空间**: `filePermissions` (需创建)

## 通用实施模板

### 步骤1: 添加i18n导入

```tsx
import { useT } from '@/lib/i18n-utils'
import { useLocale } from 'next-intl'

export default function YourComponent() {
  const t = useT('yourNamespace')
  const tCommon = useT('common')
  const locale = useLocale()
  
  // ...
}
```

### 步骤2: 创建翻译文件

在 `messages/zh.json` 添加:
```json
{
  "yourNamespace": {
    "title": "标题",
    "description": "描述",
    ...
  }
}
```

在 `messages/en.json` 添加:
```json
{
  "yourNamespace": {
    "title": "Title",
    "description": "Description",
    ...
  }
}
```

### 步骤3: 替换硬编码文本

**Toast消息**:
```tsx
// 之前
toast({ title: "操作成功", description: "数据已保存" })

// 之后
toast({ title: t('operationSuccess'), description: t('dataSaved') })
```

**页面标题**:
```tsx
// 之前
<h1>系统管理</h1>

// 之后
<h1>{t('title')}</h1>
```

**按钮文本**:
```tsx
// 之前
<Button>提交</Button>

// 之后
<Button>{tCommon('submit')}</Button>
```

### 步骤4: 测试

1. 访问页面的中文版本: `/zh/your-page`
2. 切换到英文: `/en/your-page`
3. 确保所有文本正确显示
4. 检查没有遗漏的硬编码中文

## 快速检查清单

- [ ] 页面标题和描述
- [ ] 按钮文本
- [ ] Toast/Alert 消息
- [ ] 表单标签和占位符
- [ ] 表格标题
- [ ] 错误消息
- [ ] 成功消息
- [ ] 加载状态文本
- [ ] 空状态提示
- [ ] 确认对话框文本

## 常见翻译键命名规范

| 类型 | 中文 | 键名 | 英文 |
|------|------|------|------|
| 标题 | 用户管理 | title | User Management |
| 描述 | 管理系统用户 | description | Manage system users |
| 按钮 | 添加用户 | addUser | Add User |
| 成功 | 操作成功 | operationSuccess | Operation Successful |
| 失败 | 操作失败 | operationFailed | Operation Failed |
| 加载 | 加载中... | loading | Loading... |
| 空状态 | 暂无数据 | noData | No Data |
| 确认 | 确定要删除吗？ | confirmDelete | Are you sure to delete? |

## 工具脚本

### 查找页面中的中文
```bash
python3 -c "
import re
with open('YOUR_FILE.tsx', 'r', encoding='utf-8') as f:
    content = f.read()
    lines = content.split('\n')
    
for i, line in enumerate(lines, 1):
    if re.search(r'[\u4e00-\u9fa5]', line):
        stripped = line.strip()
        if not (stripped.startswith('//') or stripped.startswith('*')):
            print(f'{i}: {stripped[:100]}')
"
```

### 验证翻译文件
```bash
npm run verify:i18n
```

## 预估总工作量

| 文件 | 工作量 | 优先级 |
|------|--------|--------|
| applications/hpc/page.tsx | 2-3h | 高 |
| big-screen/page.tsx | 3-4h | 中 |
| system/applications/management | 4-5h | 低 |
| system/license/page.tsx | 2-3h | 低 |
| system/permissions | 2h | 低 |
| system/users/* | 2-3h | 中 |
| system/groups/* | 2-3h | 中 |
| 其他小文件 | 3-4h | 低 |

**总计**: 20-30小时完整工作量

**建议**: 按优先级分阶段完成，先完成用户常用功能。

---

*创建日期: 2025-10-16*
*版本: 1.0*
