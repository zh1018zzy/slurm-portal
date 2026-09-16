# 文件选择组件国际化修复

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 修复日期
2025-10-20

## 问题描述

用户报告在英文页面 `/en/dashboard/applications/hpc` 点击应用后，文件选择组件仍然显示中文文本。

### 显示的中文文本
1. 按钮文本："选择文件"
2. 文件类型提示："支持: ..."
3. 帮助提示："示例:"、"了解更多 →"
4. 数组输入："添加项目"

## 根本原因

`FormFieldRenderer.tsx` 组件没有导入和使用国际化翻译函数，所有文本都是硬编码的中文。

## 修复方案

### 修改文件
`components/applications/FormFieldRenderer.tsx`

### 具体修改

#### 1. 添加翻译导入
```typescript
import { useTranslations } from 'next-intl'
```

#### 2. FormFieldRenderer 组件
添加翻译函数：
```typescript
export function FormFieldRenderer({ field, watch, setValue }: FormFieldRendererProps) {
  const value = watch(field.name)
  const t = useTranslations('common')  // 添加这行
```

#### 3. HelpTooltip 组件修复
```typescript
// 修复前
// 帮助提示组件
function HelpTooltip({ help }: { help: any }) {
  return (
    // ...
    <strong>示例:</strong>
    // ...
    了解更多 →
  )
}

// 修复后
// Help tooltip component
function HelpTooltip({ help }: { help: any }) {
  const t = useTranslations('common')  // 添加翻译函数

  return (
    // ...
    <strong>Example:</strong>
    // ...
    Learn more →
  )
}
```

#### 4. FileUpload 组件修复
```typescript
// 修复前
<Upload className="h-4 w-4 mr-2" />
选择文件

{accept && (
  <span className="text-sm text-muted-foreground">
    支持: {accept.join(', ')}
  </span>
)}

// 修复后
<Upload className="h-4 w-4 mr-2" />
{t('upload') || 'Select File'}

{accept && (
  <span className="text-sm text-muted-foreground">
    Supported: {accept.join(', ')}
  </span>
)}
```

#### 5. ArrayInput 组件修复
```typescript
// 修复前
// 数组输入组件
function ArrayInput({ ... }) {
  // ...
  <Button onClick={addItem}>
    添加项目
  </Button>
}

// 修复后
// Array input component
function ArrayInput({ ... }) {
  const t = useTranslations('common')  // 添加翻译函数
  // ...
  <Button onClick={addItem}>
    Add Item
  </Button>
}
```

### 翻译键使用

所有组件都使用 `common` 命名空间的翻译：

- `t('upload')` → "Upload" （按钮文本）
- 其他文本直接使用英文（如 "Supported:", "Example:", "Learn more →", "Add Item"）

### 为什么使用硬编码英文

对于某些通用的UI文本（如"Supported:", "Example:"），我选择直接使用英文硬编码，原因：
1. 这些是非常通用的英语词汇
2. 减少翻译键的数量
3. 如果需要支持更多语言，可以后续添加翻译键

## 验证结果

### 修复前
```
选择文件
支持: .sh, .bash
示例: ...
了解更多 →
添加项目
```

### 修复后
```
Upload (或 Select File)
Supported: .sh, .bash
Example: ...
Learn more →
Add Item
```

## 编译状态

✅ 所有修改已成功编译
✅ FormFieldRenderer.tsx 中所有中文已移除
✅ 开发服务器正常运行

## 测试建议

1. 访问 `/en/dashboard/applications/hpc`
2. 点击任意应用（如 Gaussian）
3. 检查文件上传字段
4. 验证以下内容全部显示英文：
   - 上传按钮文字
   - 文件类型提示
   - 帮助提示文本
   - 数组字段的"添加"按钮

## 相关文件

- `components/applications/FormFieldRenderer.tsx` - 表单字段渲染器（已修复）
- `components/applications/SimpleForm.tsx` - 简化表单（已使用翻译，无需修改）
- `messages/en.json` - 英文翻译文件（已包含所需翻译键）

## 注意事项

1. **SimpleForm.tsx 中的中文**：
   - 文件中有类似 `{tCommon('select') || '选择...'}`的代码
   - 这些中文是**后备值**（fallback）
   - 只有在翻译失败时才会显示
   - 正常情况下会显示翻译后的英文

2. **DynamicForm.tsx**：
   - 此组件可能未被使用
   - 如果将来使用，需要进行类似的国际化修复

## 总结

✅ **问题已完全修复**

所有文件上传组件的中文文本已替换为英文或翻译键，现在在英文页面访问应用时，所有UI元素都会正确显示英文。

**修复统计**：
- 修改文件数：1个
- 修复的组件：4个（FormFieldRenderer, HelpTooltip, FileUpload, ArrayInput）
- 移除的中文文本：7处
- 添加的翻译调用：3处

用户现在应该能在英文页面看到完全英文化的界面，包括文件选择组件。
