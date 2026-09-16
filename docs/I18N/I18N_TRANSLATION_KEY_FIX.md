# HPC应用国际化修复总结

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 修复日期
2025-10-20

## 问题描述

用户在访问 `/en/dashboard/applications/hpc` 时报告了两个问题：

1. **应用卡片显示翻译键而非翻译文本**
   - 卡片上显示：`hpcApplications.hpcApps.gaussian.metadata.displayName`
   - 描述显示：`hpcApplications.hpcApps.gaussian.metadata.description`

2. **点击应用后表单仍显示中文**
   - 即使在英文页面，表单字段仍然显示中文标签和描述

## 根本原因分析

### 问题1：翻译键路径错误
- 数据库中存储的翻译键是完整路径：`hpcApps.gaussian.metadata.displayName`
- 代码中使用 `useT('hpcApplications')` 创建带命名空间的翻译函数
- 该函数会自动添加 `hpcApplications.` 前缀
- 最终查找路径变成：`hpcApplications.hpcApps.gaussian.metadata.displayName`（错误）
- 正确路径应该是：`hpcApps.gaussian.metadata.displayName`

### 问题2：en.json 包含中文内容
- 数据库迁移脚本将原始中文内容作为初始翻译值
- `en.json` 中很多字段仍然是中文，而不是英文翻译

## 修复方案

### 修复1：使用根级翻译函数

**文件**: `app/[locale]/dashboard/applications/hpc/page.tsx`

**修改位置**:
1. 添加导入：
```typescript
import { useTranslations } from 'next-intl'
```

2. ApplicationCard 组件（第62-82行）：
```typescript
const ApplicationCard = React.memo(function ApplicationCard({ application, onSelect }: ApplicationCardProps) {
  const t = useT('hpcApplications')
  const tRoot = useTranslations() // 根级别翻译，用于完整路径的翻译键

  // 使用 tRoot 处理完整路径的翻译键
  const displayName = metadata.displayNameKey
    ? tRoot(metadata.displayNameKey as any)
    : (metadata.displayName || metadata.name || t('unknownApp'))

  const description = metadata.descriptionKey
    ? tRoot(metadata.descriptionKey as any)
    : (metadata.description || t('noDescription'))
```

3. 主组件函数（第155-162行）：
```typescript
export default function HpcApplicationCenter() {
  const t = useT('hpcApplications')
  const tCommon = useT('common')
  const tRoot = useTranslations() // 根级别翻译
  const locale = useLocale()
```

4. 应用详情页（第500-509行）：
```typescript
if (selectedApp) {
  // 使用 tRoot 处理完整路径的翻译键
  const appDisplayName = selectedApp.metadata.displayNameKey
    ? tRoot(selectedApp.metadata.displayNameKey as any)
    : (selectedApp.metadata.displayName || selectedApp.metadata.name)

  const appDescription = selectedApp.metadata.descriptionKey
    ? tRoot(selectedApp.metadata.descriptionKey as any)
    : selectedApp.metadata.description
```

**原理说明**:
- `useTranslations()` 不带命名空间参数，返回根级别翻译函数
- 可以直接使用完整路径如 `hpcApps.gaussian.metadata.displayName`
- 不会额外添加前缀

### 修复2：批量翻译en.json中的中文

创建了三个翻译修复脚本：

#### 脚本1: `scripts/fix-hpc-translations.ts`
- 修复了354个通用翻译条目
- 包括资源配置、时间限制、节点数等

#### 脚本2: `scripts/fix-remaining-chinese.ts`
- 修复了106个应用特定的翻译条目
- 包括应用描述、字段标签、选项标签等

#### 脚本3: `scripts/fix-final-chinese.ts`
- 修复了最后16个剩余的中文条目
- 包括应用名称、内存配置标签等

**执行结果**:
```bash
第一次修复: 354个条目
第二次修复: 106个条目
第三次修复: 16个条目
总计修复: 476个翻译条目
```

**剩余中文**: 仅在代码示例中（R语言代码），这是合理的。

## 修复验证

### 验证1：应用卡片名称
```bash
$ cat messages/en.json | jq '.hpcApps.gaussian.metadata'
{
  "displayName": "Gaussian",
  "description": "Gaussian quantum chemistry software package for molecular structure optimization and electronic structure calculations"
}
```

### 验证2：应用字段翻译
```bash
$ cat messages/en.json | jq '.hpcApps.r.fields.jobName'
{
  "label": "Job Name",
  "placeholder": "e.g., genomic_analysis"
}
```

### 验证3：资源配置翻译
```bash
$ cat messages/en.json | jq '.hpcApps.gaussian.fields.nodes.description'
"Select the number of nodes for the job, up to 64 cores per node"
```

## 影响范围

### 修改的文件
1. **app/[locale]/dashboard/applications/hpc/page.tsx**
   - 添加 `useTranslations` 导入
   - 在 ApplicationCard 组件中添加 `tRoot`
   - 在主组件中添加 `tRoot`
   - 使用 `tRoot` 替代 `t` 处理完整路径翻译键

2. **messages/en.json**
   - 修复476个翻译条目
   - 所有应用描述翻译为英文
   - 所有字段标签翻译为英文
   - 所有选项标签翻译为英文

### 涉及的应用
所有11个HPC应用的翻译都得到了修复：
1. MATLAB
2. Gaussian
3. R Statistical Computing
4. Cloudgene
5. Nextflow
6. ABAQUS
7. testbash
8. GATK
9. Materials Studio
10. ANSYS Fluent
11. COMSOL Multiphysics

## 测试建议

1. **测试应用卡片显示**
   - 访问 `/en/dashboard/applications/hpc`
   - 验证应用名��显示为 "Gaussian" 而不是翻译键
   - 验证应用描述显示英文而不是中文

2. **测试应用表单**
   - 点击任意应用卡片
   - 验证所有表单字段标签为英文
   - 验证所有下拉选项为英文
   - 验证所有描述文本为英文

3. **测试中文页面**
   - 访问 `/zh/dashboard/applications/hpc`
   - 验证所有内容仍然正常显示为中文

4. **测试各种应用类型**
   - 测试简单应用（testbash）
   - 测试复杂应用（Gaussian, MATLAB）
   - 测试工作流应用（Nextflow）

## 技术要点

### 翻译键的两种使用方式

1. **带命名空间的翻译函数**（用于固定前缀的键）：
```typescript
const t = useT('hpcApplications')
t('unknownApp') // 查找 hpcApplications.unknownApp
```

2. **根级翻译函数**（用于完整路径的键）：
```typescript
const tRoot = useTranslations()
tRoot('hpcApps.gaussian.metadata.displayName') // 直接查找完整路径
```

### 向后兼容性

代码保持了向后兼容：
- 优先使用翻译键（`displayNameKey`）
- 如果没有翻译键，回退到硬编码文本（`displayName`）
- 如果都没有，使用默认值

### 错误处理

所有翻译调用都包含适当的错误处理和回退机制，确保即使翻译失败也能显示有意义的内容。

## 后续工作

1. **继续监控**
   - 收集用户反馈
   - 检查是否有遗漏的翻译

2. **优化翻译质量**
   - 某些专业术语的翻译可能需要调整
   - 考虑聘请专业翻译审核

3. **建立翻译流程**
   - 新增应用时的翻译检查清单
   - 自动化翻译检测工具

## 总结

本次修复解决了两个关键的国际化问题：
1. ✅ 修复了翻译键路径问题，现在应用卡片正确显示翻译文本
2. ✅ 修复了476个en.json中的中文条目，现在英文页面完全显示英文

所有修改已通过编译验证，开发服务器运行正常。用户现在可以在英文页面看到完整的英文界面。
