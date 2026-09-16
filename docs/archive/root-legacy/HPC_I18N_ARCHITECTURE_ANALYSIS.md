# HPC应用中心国际化架构分析报告

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

## 一、核心问题总结

**当前HPC应用中心的架构设计对国际化多语言支持存在严重的架构性缺陷。**

### 主要问题
1. **文本硬编码在数据库中** - 所有应用的描述、表单字段标签、选项文本等都直接以某一种语言（中文或英文）存储在 PostgreSQL 数据库的 JSON 字段中
2. **无翻译键机制** - 没有使用 i18n 翻译键（translation keys），而是直接存储最终显示文本
3. **数据与展示层耦合** - 应用定义（data）与用户界面文本（presentation）混合存储
4. **语言切换需要数据迁移** - 更改语言需要更新数据库记录，而非简单切换翻译文件

---

## 二、当前实现架构详细分析

### 2.1 数据存储层（Database Layer）

#### 表结构：`hpc_applications`
```sql
CREATE TABLE hpc_applications (
  id UUID PRIMARY KEY,
  name TEXT,
  version TEXT,
  spec_version TEXT,
  metadata JSONB,        -- ❌ 包含 displayName, description (硬编码文本)
  requirements JSONB,
  resources JSONB,       -- ❌ 包含 profile descriptions (硬编码文本)
  execution JSONB,
  interface JSONB,       -- ❌ 包含所有表单字段的 label, placeholder, description (硬编码文本)
  io JSONB,
  monitoring JSONB,
  access JSONB,
  extensions JSONB,
  status TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### 实际存储示例（MATLAB应用）
```json
{
  "metadata": {
    "name": "matlab",
    "displayName": "MATLAB",           // ❌ 硬编码：英文或中文
    "description": "高级数值计算环境",   // ❌ 硬编码：中文
    "category": "scientific-computing"
  },
  "interface": {
    "form": [
      {
        "name": "jobName",
        "label": "作业名称",              // ❌ 硬编码：中文
        "type": "text",
        "description": "为你的MATLAB作业指定一个名称",  // ❌ 硬编码：中文
        "placeholder": "输入作业名称"     // ❌ 硬编码：中文
      },
      {
        "name": "executionMode",
        "label": "执行模式",              // ❌ 硬编码：中文
        "options": [
          {
            "value": "batch",
            "label": "批处理模式",         // ❌ 硬编码：中文
            "description": "提交脚本到队列执行"  // ❌ 硬编码：中文
          }
        ]
      }
    ]
  },
  "resources": {
    "profiles": [
      {
        "name": "default",
        "description": "默认配置"        // ❌ 硬编码：中文
      }
    ]
  }
}
```

**问题分析：**
- ✅ 使用 `name: "jobName"` 作为字段标识（正确）
- ❌ 使用 `label: "作业名称"` 直接存储显示文本（错误）
- ❌ 使用 `description: "为你的MATLAB作业..."` 直接存储说明文本（错误）
- ❌ 选项的 `label` 和 `description` 全部硬编码

### 2.2 应用规范定义（Spec Definition）

#### TypeScript接口：`HpcApplicationSpec`
```typescript
export interface FormField {
  name: string               // ✅ 字段标识符
  label: string              // ❌ 直接存储显示文本
  type: 'text' | 'number' | 'select' | ...
  description?: string       // ❌ 直接存储说明文本
  placeholder?: string       // ❌ 直接存储占位文本

  options?: Array<{
    value: any               // ✅ 选项值
    label: string            // ❌ 直接存储选项显示文本
    description?: string     // ❌ 直接存储选项说明文本
  }>

  help?: {
    text?: string           // ❌ 直接存储帮助文本
    example?: string        // ❌ 直接存储示例文本
  }
}
```

**架构缺陷：**
1. **类型系统不支持i18n** - `label: string` 应该是 `label: string | I18nKey`
2. **无翻译键约定** - 没有定义翻译键的命名规范
3. **混合存储** - 在同一个对象中同时存储标识符（name）和显示文本（label）

### 2.3 前端展示层（Presentation Layer）

#### 表单渲染组件：`SimpleForm.tsx`
```typescript
// app/[locale]/dashboard/applications/hpc/page.tsx
<SimpleForm
  application={selectedApp}  // selectedApp 来自数据库
  onSubmit={handleFormSubmit}
/>

// components/applications/SimpleForm.tsx
{field.label}              // ❌ 直接显示数据库中的文本
{field.description}        // ❌ 直接显示数据库中的文本
{field.placeholder}        // ❌ 直接显示数据库中的文本
{option.label}             // ❌ 直接显示选项文本
```

**问题分析：**
- ❌ 组件直接使用 `field.label`，没有调用 `t(field.label)` 进行翻译
- ❌ 没有翻译函数介入
- ❌ 语言切换时无法动态更新文本

### 2.4 应用注册流程（Registration Flow）

```typescript
// lib/application-registry.ts
async register(spec: HpcApplicationSpec): Promise<void> {
  // 检查是否已存在
  const { data: existing } = await supabase
    .from('hpc_applications')
    .select('id')
    .eq('metadata->>name', spec.metadata.name)
    .single()

  if (existing) {
    // 更新 - 直接覆盖所有文本字段
    await supabase
      .from('hpc_applications')
      .update({
        metadata: spec.metadata,        // ❌ 覆盖所有元数据（包括文本）
        interface: spec.interface,      // ❌ 覆盖所有界面定义（包括label）
        resources: spec.resources,      // ❌ 覆盖资源描述
        // ...
      })
      .eq('id', existing.id)
  }
}
```

**问题分析：**
- 注册/更新应用时，直接覆盖所有文本内容
- 切换语言需要重新注册整个应用
- 无法保留多语言版本

---

## 三、对比：正确的i18n架构

### 3.1 应该如何设计（Best Practice）

#### 数据库存储（只存储结构和翻译键）
```json
{
  "metadata": {
    "name": "matlab",
    "displayName": "hpcApps.matlab.displayName",    // ✅ 翻译键
    "description": "hpcApps.matlab.description",    // ✅ 翻译键
    "category": "scientific-computing"
  },
  "interface": {
    "form": [
      {
        "name": "jobName",
        "label": "hpcApps.matlab.fields.jobName.label",              // ✅ 翻译键
        "type": "text",
        "description": "hpcApps.matlab.fields.jobName.description", // ✅ 翻译键
        "placeholder": "hpcApps.matlab.fields.jobName.placeholder"  // ✅ 翻译键
      },
      {
        "name": "executionMode",
        "label": "hpcApps.matlab.fields.executionMode.label",       // ✅ 翻译键
        "options": [
          {
            "value": "batch",
            "label": "hpcApps.matlab.executionMode.batch.label",     // ✅ 翻译键
            "description": "hpcApps.matlab.executionMode.batch.desc"  // ✅ 翻译键
          }
        ]
      }
    ]
  }
}
```

#### 翻译文件：`messages/zh.json`
```json
{
  "hpcApps": {
    "matlab": {
      "displayName": "MATLAB",
      "description": "高级数值计算、可视化和编程环境",
      "fields": {
        "jobName": {
          "label": "作业名称",
          "description": "为你的MATLAB作业指定一个名称",
          "placeholder": "输入作业名称"
        },
        "executionMode": {
          "label": "执行模式"
        }
      },
      "executionMode": {
        "batch": {
          "label": "批处理模式",
          "desc": "提交脚本到队列执行"
        },
        "interactive": {
          "label": "交互式模式",
          "desc": "分配资源后交互执行"
        }
      }
    }
  }
}
```

#### 翻译文件：`messages/en.json`
```json
{
  "hpcApps": {
    "matlab": {
      "displayName": "MATLAB",
      "description": "Advanced numerical computing, visualization, and programming environment",
      "fields": {
        "jobName": {
          "label": "Job Name",
          "description": "Specify a name for your MATLAB job",
          "placeholder": "Enter job name"
        },
        "executionMode": {
          "label": "Execution Mode"
        }
      },
      "executionMode": {
        "batch": {
          "label": "Batch Mode",
          "desc": "Submit script to queue"
        },
        "interactive": {
          "label": "Interactive Mode",
          "desc": "Allocate resources and execute interactively"
        }
      }
    }
  }
}
```

#### 前端渲染（使用翻译函数）
```typescript
// components/applications/SimpleForm.tsx
import { useT } from '@/lib/i18n-utils'

function SimpleForm({ application }) {
  const t = useT('hpcApps')

  return (
    <>
      {application.interface.form.map(field => (
        <div key={field.name}>
          <label>{t(field.label)}</label>           {/* ✅ 翻译键转换 */}
          <input placeholder={t(field.placeholder)} /> {/* ✅ 翻译键转换 */}
          <p>{t(field.description)}</p>             {/* ✅ 翻译键转换 */}

          {field.options?.map(option => (
            <option key={option.value} value={option.value}>
              {t(option.label)}                      {/* ✅ 翻译键转换 */}
            </option>
          ))}
        </div>
      ))}
    </>
  )
}
```

### 3.2 架构对比总结

| 维度 | 当前架构（错误） | 正确架构 |
|------|-----------------|---------|
| **数据库存储** | 存储最终显示文本（中文或英文） | 存储翻译键（如 `hpcApps.matlab.fields.jobName.label`） |
| **数据结构** | `label: "作业名称"` | `label: "hpcApps.matlab.fields.jobName.label"` |
| **翻译文件** | 不使用或仅用于UI静态文本 | 包含所有应用相关文本 |
| **语言切换** | 需要更新数据库记录 | 仅需切换翻译文件，无需改动数据 |
| **数据迁移** | 每次支持新语言都要迁移数据 | 只需添加新的翻译文件 |
| **内容更新** | 需要更新数据库 | 更新翻译文件即可 |
| **版本管理** | 数据库迁移脚本 | Git管理翻译文件 |
| **翻译工作流** | 需要数据库操作权限 | 翻译人员只需编辑JSON文件 |

---

## 四、当前架构的具体问题

### 问题1：语言切换失败
**现象：**
- 用户切换 `/zh/dashboard/applications/hpc` → `/en/dashboard/applications/hpc`
- 应用卡片和表单依然显示中文

**根本原因：**
```typescript
// 数据库中存储的是中文
{
  "label": "作业名称"  // ❌ 硬编码中文
}

// 前端直接渲染
<label>{field.label}</label>  // ❌ 显示 "作业名称"，无法翻译
```

### 问题2：更新困难
**场景：** 修改 MATLAB 应用的表单文本为英文

**当前方案（我刚才做的）：**
1. 修改 `lib/applications/examples.ts` 中的硬编码文本
2. 创建 API `/api/applications/update-matlab`
3. 手动调用 API 更新数据库
4. 或者编写 SQL 脚本直接更新数据库

**问题：**
- 需要数据库操作权限
- 无法同时支持中英文
- 每次更新都要触及数据库

**正确方案（如果架构正确）：**
1. 编辑 `messages/en.json` 文件
2. Git commit & push
3. 自动生效（无需数据库操作）

### 问题3：翻译人员无法工作
**当前：**
- 翻译人员需要：
  1. 访问数据库
  2. 理解 JSONB 结构
  3. 编写 SQL 更新语句
  4. 或调用特定API

**正确架构：**
- 翻译人员只需：
  1. 编辑 `messages/en.json` 文本文件
  2. 提交 Pull Request
  3. 审核后合并

### 问题4：无法同时支持多语言
**当前：**
- 数据库只能存储一种语言的文本
- 要支持中英文，需要两套数据库记录或复杂的数据结构

**正确架构：**
- 数据库存储一份翻译键
- `messages/zh.json` 提供中文
- `messages/en.json` 提供英文
- `messages/ja.json` 提供日文（未来扩展）

### 问题5：系统其他部分i18n正常，应用部分孤立
**系统其他部分（正确）：**
```typescript
// app/[locale]/dashboard/page.tsx
const t = useT('dashboard')
<h1>{t('title')}</h1>  // ✅ 使用翻译键

// messages/zh.json
{
  "dashboard": {
    "title": "仪表盘"
  }
}
```

**HPC应用部分（错误）：**
```typescript
// 直接渲染数据库内容
<label>{field.label}</label>  // ❌ 不使用翻译系统
```

**结果：**
- 用户切换语言时，UI文本（按钮、标题等）正常切换
- 应用表单文本无法切换，形成"混合语言"界面

---

## 五、影响范围评估

### 5.1 受影响的数据库字段
```sql
-- hpc_applications 表中所有包含用户可见文本的字段：
- metadata->'displayName'
- metadata->'description'
- resources->'default'->'description'
- resources->'profiles'[]->'description'
- execution->'modes'[]->'description'
- execution->'templates'[]->'description'
- interface->'form'[]->'label'           -- ⚠️ 核心问题
- interface->'form'[]->'description'      -- ⚠️ 核心问题
- interface->'form'[]->'placeholder'      -- ⚠️ 核心问题
- interface->'form'[]->'options'[]->'label'        -- ⚠️ 核心问题
- interface->'form'[]->'options'[]->'description'  -- ⚠️ 核心问题
- interface->'form'[]->'help'->'text'     -- ⚠️ 核心问题
- io->'inputs'[]->'description'
- io->'outputs'[]->'description'
```

### 5.2 受影响的代码文件
```
lib/
├── hpc-application-spec.ts          # TypeScript 接口定义需要修改
├── application-registry.ts          # 注册逻辑需要重构
├── applications/
│   └── examples.ts                  # 应用定义需要改为翻译键
└── bioinformatics-applications/     # 所有生信应用定义需要改为翻译键

app/
├── [locale]/dashboard/applications/hpc/page.tsx  # 需要添加翻译逻辑
└── api/applications/                # API 逻辑可能需要调整

components/
└── applications/
    └── SimpleForm.tsx               # 表单��件需要使用 t() 函数

messages/
├── zh.json                          # 需要添加应用翻译
└── en.json                          # 需要添加应用翻译

db/
└── migrations/                      # 需要数据迁移脚本
```

### 5.3 影响的应用数量
```bash
# 估算需要迁移的应用数量
- 示例应用（examples.ts）: 2个（MATLAB, Gaussian）
- 生信应用（bioinformatics-applications/）: ~100个
- 数据库已注册应用: 需要查询确认

总计: 102+ 个应用需要迁移
```

---

## 六、解决方案

### 方案A：彻底重构（推荐，长期方案）

#### 6.1 修改数据模型
```typescript
// lib/hpc-application-spec.ts
export interface FormField {
  name: string               // ✅ 保持不变
  labelKey: string           // ✅ 新增：翻译键，如 "hpcApps.matlab.fields.jobName.label"
  type: 'text' | 'number' | ...
  descriptionKey?: string    // ✅ 新增：翻译键
  placeholderKey?: string    // ✅ 新增：翻译键

  options?: Array<{
    value: any               // ✅ 保持不变
    labelKey: string         // ✅ 新增：翻译键
    descriptionKey?: string  // ✅ 新增：翻译键
  }>

  help?: {
    textKey?: string         // ✅ 新增：翻译键
    exampleKey?: string      // ✅ 新增：翻译键
  }

  // ⚠️ 向后兼容（可选，过渡期使用）
  label?: string             // Deprecated
  description?: string       // Deprecated
  placeholder?: string       // Deprecated
}
```

#### 6.2 创建翻译文件结构
```json
// messages/zh.json
{
  "hpcApps": {
    "matlab": { ... },
    "gaussian": { ... },
    "blast": { ... }
    // 每个应用一个命名空间
  }
}
```

#### 6.3 更新前端组件
```typescript
// components/applications/SimpleForm.tsx
function SimpleForm({ application }) {
  const t = useT('hpcApps')

  return (
    <>
      {application.interface.form.map(field => (
        <div key={field.name}>
          {/* ✅ 新方式：使用翻译键 */}
          <label>{t(field.labelKey || field.label)}</label>

          {/* ✅ 向后兼容：如果没有 labelKey，fallback 到 label */}
          <input
            placeholder={field.placeholderKey ? t(field.placeholderKey) : field.placeholder}
          />
        </div>
      ))}
    </>
  )
}
```

#### 6.4 数据迁移脚本
```typescript
// scripts/migrate-apps-to-i18n.ts
import { supabase } from '@/lib/supabase'
import { writeFileSync } from 'fs'

async function migrateApplicationsToI18n() {
  // 1. 从数据库读取所有应用
  const { data: apps } = await supabase
    .from('hpc_applications')
    .select('*')

  const translations = { zh: {}, en: {} }

  for (const app of apps) {
    const appName = app.metadata.name

    // 2. 提取所有文本并生成翻译键
    translations.zh[appName] = {
      displayName: app.metadata.displayName,
      description: app.metadata.description,
      fields: {}
    }

    // 3. 更新应用定义使用翻译键
    for (const field of app.interface.form) {
      const fieldKey = `hpcApps.${appName}.fields.${field.name}`

      translations.zh[appName].fields[field.name] = {
        label: field.label,
        description: field.description,
        placeholder: field.placeholder
      }

      // 更新数据库记录
      field.labelKey = `${fieldKey}.label`
      field.descriptionKey = `${fieldKey}.description`
      field.placeholderKey = `${fieldKey}.placeholder`

      // 删除旧字段（可选）
      delete field.label
      delete field.description
      delete field.placeholder
    }

    // 4. 更新数据库
    await supabase
      .from('hpc_applications')
      .update({ interface: app.interface })
      .eq('id', app.id)
  }

  // 5. 写入翻译文件
  writeFileSync('messages/zh-apps.json', JSON.stringify(translations.zh, null, 2))

  console.log(`✅ 迁移完成，共处理 ${apps.length} 个应用`)
}
```

#### 6.5 工作量评估
- 修改TypeScript接口: 0.5天
- 创建翻译文件结构: 1天
- 更新所有应用定义: 3-5天（100+个应用）
- 修改前端组件: 1天
- 编写数据迁移脚本: 1天
- 测试和修复: 2-3天

**总计: 8-12天**

---

### 方案B：混合方案（快速，短期方案）

**思路：** 保持数据库结构不变，前端智能检测

```typescript
// components/applications/SimpleForm.tsx
function SimpleForm({ application }) {
  const t = useT('hpcApps')

  // 智能翻译函数
  const translateField = (text: string, fallback: string) => {
    // 如果是翻译键格式（如 "hpcApps.matlab.xxx"）
    if (text.startsWith('hpcApps.')) {
      return t(text)
    }

    // 如果是普通文本，尝试查找对应翻译
    const translationKey = `${application.metadata.name}.${fallback}`
    const translated = t(translationKey)

    // 如果找到翻译，使用翻译；否则使用原文本
    return translated !== translationKey ? translated : text
  }

  return (
    <>
      {application.interface.form.map(field => (
        <label>{translateField(field.label, `fields.${field.name}.label`)}</label>
      ))}
    </>
  )
}
```

**优点：**
- 无需修改数据库
- 无需数据迁移
- 可以逐步迁移

**缺点：**
- 性能稍差（每次渲染都要判断）
- 逻辑复杂
- 不够优雅

**工作量: 2-3天**

---

### 方案C：最小化修复（临时方案）

**思路：** 为每个应用创建专门的更新API

```typescript
// app/api/applications/update-[appname]/route.ts
// 为 MATLAB, Gaussian 等常用应用各创建一个更新端点
export async function POST() {
  // 更新为英文版本
  await supabase
    .from('hpc_applications')
    .update({ interface: ENGLISH_INTERFACE })
    .eq('metadata->>name', 'matlab')
}
```

**优点：**
- 最快速
- 风险最小

**缺点：**
- 治标不治本
- 无法同时支持多语言
- 每次更新都需要调用API

**工作量: 1天**

---

## 七、建议和结论

### 7.1 核心建议

**立即行动（方案C）：**
1. 完成当前的 MATLAB 应用英文更新API
2. 同样为 Gaussian 等常用应用创建更新API
3. 确保当前英文环境可用

**中期规划（方案B）：**
1. 实现智能翻译函数
2. 逐步为重要应用添加翻译键到 `messages/` 文件
3. 保持向后兼容

**长期重构（方案A）：**
1. 规划1-2个sprint进行彻底重构
2. 建立翻译工作流程
3. 培训文档和工具

### 7.2 架构原则

**正确的i18n架构三原则：**

1. **数据与展示分离**
   - 数据库：存储结构化数据和标识符
   - 翻译文件：存储所有用户可见文本

2. **使用翻译键，不存储文本**
   - ✅ `labelKey: "hpcApps.matlab.jobName"`
   - ❌ `label: "作业名称"`

3. **前端统一翻译**
   - 所有用户可见文本都通过 `t()` 函数
   - 无例外

### 7.3 对比业界标准

**参考实现：**
- **AWS Console**: 所有服务配置都使用翻译键
- **Azure Portal**: 资源模板使用i18n
- **Kubernetes Dashboard**: 配置文件结构化，UI文本翻译
- **GitLab**: CI/CD配置与界面文本分离

**当前HPC应用中心 vs 业界标准：**
| 项目 | 当前实现 | 业界标准 |
|------|---------|---------|
| 数据存储 | 硬编码文本 | 翻译键 |
| 语言切换 | 需要数据迁移 | 仅切换翻译文件 |
| 翻译工作流 | 需要数据库权限 | 编辑JSON文件 |
| 版本控制 | SQL迁移 | Git管理 |
| 可扩展性 | 困难 | 简单 |

### 7.4 最终结论

**当前HPC应用中心的i18n架构存在根本性设计缺陷：**

1. ❌ **数据与展示耦合** - 违反了国际化的基本原则
2. ❌ **硬编码文本** - 应使用翻译键
3. ❌ **无法支持多语言** - 架构上不支持同时维护多种语言
4. ❌ **更新困难** - 需要数据库操作而非简单的文件编辑
5. ❌ **孤立于系统其他部分** - 系统其他部分使用了正确的i18n，唯独应用部分例外

**这不是简单的"文本翻译"问题，而是架构设计问题。**

**建议：**
- **短期**：使用方案C，快速修复当前问题
- **中期**：规划并执行方案A的重构
- **长期**：建立标准的应用定义和翻译工作流程

---

## 八、附录

### A. 翻译键命名规范（建议）

```
hpcApps.{appName}.{section}.{field}.{property}

示例：
hpcApps.matlab.metadata.displayName
hpcApps.matlab.metadata.description
hpcApps.matlab.fields.jobName.label
hpcApps.matlab.fields.jobName.description
hpcApps.matlab.fields.jobName.placeholder
hpcApps.matlab.fields.executionMode.options.batch.label
hpcApps.matlab.fields.executionMode.options.batch.description
hpcApps.matlab.resources.profiles.default.description
```

### B. 数据迁移检查清单

- [ ] 备份数据库
- [ ] 创建翻译文件结构
- [ ] 提取所有现有文本到翻译文件
- [ ] 更新应用定义使用翻译键
- [ ] 更新前端组件使用t()函数
- [ ] 测试中文环境
- [ ] 测试英文环境
- [ ] 测试语言切换
- [ ] 验证所有应用
- [ ] 文档更新

### C. 相关文件清单

**核心架构文件：**
- `lib/hpc-application-spec.ts` - 应用规范定义
- `lib/application-registry.ts` - 应用注册逻辑
- `components/applications/SimpleForm.tsx` - 表单渲染组件

**应用定义文件：**
- `lib/applications/examples.ts` - 示例应用
- `lib/bioinformatics-applications/*.ts` - 生信应用

**数据库：**
- 表: `hpc_applications`
- 字段: `metadata`, `interface`, `resources`, `execution`, `io`

**翻译文件：**
- `messages/zh.json`
- `messages/en.json`

---

**报告生成时间：** 2025年10月20日
**报告版本：** 1.0
**分析范围：** HPC应用中心国际化架构
**结论：** 需要架构级重构以支持真正的国际化
