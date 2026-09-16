# HPC板块重命名为"仿真计算"

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

**修改日期**: 2025-10-27
**原因**: HPC是通用术语，改为更具体的描述
**状态**: ✅ 已完成

---

## 🎯 修改原因

### 问题
**"HPC应用"** 是一个过于宽泛的术语：
- HPC (High Performance Computing) 本身是通用概念
- 无法准确描述该板块包含的应用类型
- AI工具、生信工具也可以是HPC应用

### 分析
当前HPC板块包含的应用：
```
1. COMSOL Multiphysics (多物理场仿真)
2. ABAQUS Standard (结构分析)
3. ANSYS Fluent (计算流体力学)
4. Materials Studio (分子模拟)
5. Gaussian (量子化学)
```

**共同特点**: 都是**工程仿真**和**科学计算**领域的应用

---

## ✅ 修改方案

### 新名称
**"仿真计算"**

**优点**:
- ✅ 更具体，准确描述应用类型
- ✅ 涵盖工程仿真（COMSOL, ABAQUS, Fluent）
- ✅ 涵盖科学计算（Materials Studio, Gaussian）
- ✅ 与AI工具、生信工具形成清晰区分

### 其他备选名称（未采用）
- "工程仿真" - 范围稍窄，不包含量子化学等
- "科学计算" - 范围太广，AI也可以算科学计算
- "计算应用" - 太宽泛

---

## 🔧 具体修改

### 1. 应用中心页面
**文件**: `app/[locale]/dashboard/applications/page.tsx`

**修改内容**:
```diff
- {/* HPC应用板块 - 仅当有应用时显示 */}
+ {/* 仿真计算板块 - 仅当有应用时显示 */}

- {t('hpcApps')}
+ {t('simulationApps')}

- // 其他HPC应用
+ // 其他仿真计算应用

- console.log(`[HPC Application Center] Loaded...`)
+ console.log(`[Application Center] Loaded...`)
```

### 2. 应用管理页面
**文件**: `app/[locale]/dashboard/system/applications/management/page.tsx`

**修改内容**:
```diff
- description: '新创建的HPC应用',
+ description: '新创建的应用',
```

### 3. 翻译文件
**文件**: `messages/zh.json`

**新增翻译**:
```json
{
  "hpcApplications": {
    "title": "应用中心",  // 原"HPC应用中心"
    "simulationApps": "仿真计算",  // 新增
    "totalAppsCount": "共加载 {total} 个应用: AI工具 {ai} 个, 生物信息学 {bio} 个, 仿真计算 {hpc} 个"
  },
  "dashboard": {
    "redirectToHpcCenter": "跳转到应用中心"  // 原"跳转到HPC应用中心"
  }
}
```

**保留的HPC命名**（系统管理界面）:
```json
{
  "systemManagement": {
    "hpcAppManagement": "HPC应用管理",  // 保留，专业术语
    "manageHpcApps": "管理HPC应用"  // 保留
  }
}
```

---

## 📊 修改对比

### 修改前
```
┌────────────────────────────────────────┐
│ ⚡ AI工具 [3]                          │
├────────────────────────────────────────┤
│  PyTorch  vLLM  Jupyter                │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🧬 生物信息学工具 [2]                   │
├────────────────────────────────────────┤
│  GATK  R                               │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 💻 HPC应用 [5]  ← 名称不够具体         │
├────────────────────────────────────────┤
│  COMSOL  ABAQUS  Fluent  ...           │
└────────────────────────────────────────┘
```

### 修改后
```
┌────────────────────────────────────────┐
│ ⚡ AI工具 [3]                          │
├────────────────────────────────────────┤
│  PyTorch  vLLM  Jupyter                │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🧬 生物信息学工具 [2]                   │
├────────────────────────────────────────┤
│  GATK  R                               │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 💻 仿真计算 [5]  ← 更具体、更准确       │
├────────────────────────────────────────┤
│  COMSOL  ABAQUS  Fluent  ...           │
└────────────────────────────────────────┘
```

---

## 🎨 界面变化

### 应用中心标题
- **原**: "HPC应用中心"
- **新**: "应用中心"

### 板块标题
- **原**: "HPC应用"
- **新**: "仿真计算"

### 统计信息
- **原**: "共加载 11 个应用: AI工具 3 个, 生物信息学 2 个, HPC应用 6 个"
- **新**: "共加载 11 个应用: AI工具 3 个, 生物信息学 2 个, 仿真计算 6 个"

### Console日志
- **原**: `[HPC Application Center] Loaded 11 applications`
- **新**: `[Application Center] Loaded 11 applications`

---

## 📋 板块定位对比

### 修改前（模糊）
| 板块 | 定位 |
|------|------|
| AI工具 | 机器学习、深度学习 ✅ 清晰 |
| 生信工具 | 生物信息学分析 ✅ 清晰 |
| HPC应用 | 高性能计算？？❓ 模糊 |

### 修改后（清晰）
| 板块 | 定位 | 包含应用 |
|------|------|----------|
| AI工具 | 机器学习、深度学习 | PyTorch, TensorFlow, vLLM, Jupyter |
| 生信工具 | 生物信息学分析 | GATK, R, Nextflow, Cloudgene |
| 仿真计算 | 工程仿真、科学计算 | COMSOL, ABAQUS, Fluent, Gaussian |

---

## 🔍 内部变量名保持不变

为了避免大规模重构，内部变量名保持`hpc`：

```typescript
// 代码中的变量名不变
const groups = {
  ai: [],
  bio: [],
  hpc: []  // 内部仍使用hpc，但显示为"仿真计算"
}

filteredGroupedApplications.hpc  // 变量名
t('simulationApps')  // 显示文本
```

**原因**:
1. 避免大规模代码重构
2. `hpc`作为内部标识符仍然合适（high performance computing的简称）
3. 用户只看到翻译后的文本，不会看到变量名

---

## 📝 修改文件清单

### 已修改文件
1. ✅ `app/[locale]/dashboard/applications/page.tsx`
   - 板块标题: `hpcApps` → `simulationApps`
   - 注释: "HPC应用" → "仿真计算应用"
   - Console日志: "HPC Application Center" → "Application Center"

2. ✅ `app/[locale]/dashboard/system/applications/management/page.tsx`
   - 默认描述: "新创建的HPC应用" → "新创建的应用"

3. ✅ `messages/zh.json`
   - 新增: `simulationApps: "仿真计算"`
   - 更新: `title: "应用中心"`
   - 更新: `totalAppsCount` 统计文本
   - 更新: `redirectToHpcCenter: "跳转到应用中心"`

### 保留HPC命名的文件
以下文件保留HPC命名（系统管理界面，专业术语）:
- 系统管理菜单项
- 管理员界面标题
- 后端API路径和参数名

---

## 🧪 验证步骤

### 1. 检查应用中心
```bash
# 访问应用中心
http://localhost:3000/dashboard/applications

# 应该看到板块标题:
# ⚡ AI工具 [3]
# 🧬 生物信息学工具 [2]
# 💻 仿真计算 [5]  ← 新名称
```

### 2. 检查统计信息
页面底部应该显示:
```
共加载 11 个应用: AI工具 3 个, 生物信息学 2 个, 仿真计算 5 个
```

### 3. 检查Console日志
```
F12 → Console
应该看到: [Application Center] Loaded 11 applications
```

### 4. 检查页面标题
浏览器标签标题: "应用中心"（不再是"HPC应用中心"）

---

## 💡 设计原则

### 1. 用户视角优先
- 面向用户的界面使用具体、易懂的名称
- 避免使用专业缩写（HPC）

### 2. 专业术语适用场景
- 系统管理界面可以保留HPC（管理员理解专业术语）
- 代码内部可以保留HPC变量名（开发者视角）

### 3. 语义清晰
- **AI工具**: 明确指机器学习、深度学习
- **生信工具**: 明确指生物信息学
- **仿真计算**: 明确指工程仿真和科学计算

### 4. 分类互斥
- AI工具 ≠ 生信工具
- AI工具 ≠ 仿真计算
- 生信工具 ≠ 仿真计算

---

## 📚 相关文档更新

### 需要更新的文档
以下文档需要相应更新（如果涉及HPC应用板块）:

1. `docs/features/applications/APPLICATION_CLASSIFICATION_GUIDE.md`
   - 将"HPC应用板块"改为"仿真计算板块"

2. `docs/features/applications/CLASSIFICATION_QUICK_REFERENCE.md`
   - 更新快速参考中的板块名称

3. `scripts/test-app-classification.js`
   - 更新测试工具的输出文本

---

## ✅ 总结

### 修改内容
- ✅ 应用中心页面: 板块标题改为"仿真计算"
- ✅ 应用管理页面: 移除"HPC"冗余描述
- ✅ 翻译文件: 新增`simulationApps`，更新相关文本
- ✅ Console日志: "HPC Application Center" → "Application Center"

### 修改效果
- ✅ 板块名称更具体、更准确
- ✅ 用户更容易理解应用分类
- ✅ 与AI工具、生信工具形成清晰对比
- ✅ 保持代码内部一致性（变量名不变）

### 用户操作
**强制刷新浏览器**: `Ctrl + Shift + R`

刷新后应该看到"仿真计算"板块，而不是"HPC应用"。

---

**修改完成时间**: 2025-10-27
**构建状态**: ✅ 成功
**服务状态**: ✅ 已重启
**用户验证**: ⏳ 待用户刷新浏览器

🎉 **HPC板块已重命名为"仿真计算"，更准确地描述应用类型！**
