# 应用板块分类指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

**版本**: v1.0
**最后更新**: 2025-10-27

---

## 📋 目录

1. [板块分类规则](#板块分类规则)
2. [分类优先级](#分类优先级)
3. [如何为新应用选择板块](#如何为新应用选择板块)
4. [常见应用分类示例](#常见应用分类示例)
5. [避免常见错误](#避免常见错误)
6. [测试验证](#测试验证)

---

## 🎯 板块分类规则

应用中心有3个主要板块：

### 1. ⚡ AI工具板块

**显示条件**（满足任一即可）:
```typescript
category.includes('machine-learning') ||
category.includes('deep-learning') ||
(category === 'development-tools' && (tags.includes('ai') || tags.includes('jupyter')))
```

**适用应用**:
- 机器学习框架 (TensorFlow, PyTorch, scikit-learn)
- 深度学习工具 (Keras, MXNet, Caffe)
- 大语言模型 (vLLM, FastChat, Text-generation-webui)
- AI开发工具 (Jupyter Lab, JupyterHub)
- AI相关的notebook环境

**Category选择**:
- `machine-learning` - 机器学习
- `deep-learning` - 深度学习
- `development-tools` (需配合tags: `ai`或`jupyter`)

### 2. 🧬 生物信息学工具板块

**显示条件**（满足任一即可）:
```typescript
category === 'bioinformatics' ||
tags.includes('bioinformatics')
```

**适用应用**:
- 基因组分析 (GATK, BWA, Bowtie)
- 变异检测 (VarScan, MuTect)
- 序列比对 (BLAST, BLAT)
- 转录组分析 (Cufflinks, StringTie)
- 工作流管理 (Nextflow, Snakemake)
- 生信统计 (R, Bioconductor)
- 生信数据处理 (Cloudgene)

**Category选择**:
- `bioinformatics` (推荐)
- 任何category配合tags: `bioinformatics`

### 3. 💻 HPC应用板块

**显示条件**:
```typescript
// 不匹配AI和生信条件的所有其他应用
else { ... }
```

**适用应用**:
- 结构分析 (ABAQUS, ANSYS Mechanical)
- 流体力学 (ANSYS Fluent, OpenFOAM)
- 多物理场 (COMSOL Multiphysics)
- 分子模拟 (LAMMPS, GROMACS, Materials Studio)
- 量子化学 (Gaussian, VASP, Quantum ESPRESSO)
- 科学计算 (MATLAB, Mathematica, Octave)

**Category选择**:
- `structural-analysis`
- `cfd`
- `multiphysics`
- `molecular-simulation`
- `quantum-chemistry`
- `scientific-computing`
- 等等...

---

## 🔢 分类优先级

**重要**: 分类判断按以下顺序进行（if-else if-else结构）

```
1️⃣ 生物信息学 (最高优先级)
   ↓ 不匹配
2️⃣ AI工具
   ↓ 不匹配
3️⃣ HPC应用 (默认)
```

**为什么这个顺序？**

- 生信工具可能包含AI技术（如深度学习的变异检测）
- 生信工具可能使用jupyter（如R、Python生信分析）
- 但它们的**主要用途**是生物信息学，所以优先级最高

**示例**:
```javascript
// R应用:
{
  category: 'bioinformatics',  // 主要类别
  type: ['jupyter', 'batch'],  // 技术实现
  tags: ['statistics', 'bioinformatics', 'genomics']
}
// 分类结果: 生信 ✅ (虽然有jupyter type，但category优先)
```

---

## 🆕 如何为新应用选择板块

### 步骤1: 确定应用的主要用途

问自己：**这个应用主要用来做什么？**

| 主要用途 | 推荐板块 | Category |
|---------|---------|----------|
| 训练神经网络、ML模型 | AI工具 | `machine-learning` / `deep-learning` |
| 运行LLM推理服务 | AI工具 | `machine-learning` |
| AI开发环境（Jupyter等） | AI工具 | `development-tools` + tags:`ai` |
| 基因组/蛋白质分析 | 生信工具 | `bioinformatics` |
| 生信数据处理 | 生信工具 | `bioinformatics` |
| 结构力学仿真 | HPC应用 | `structural-analysis` |
| 流体动力学 | HPC应用 | `cfd` |
| 分子动力学 | HPC应用 | `molecular-simulation` |
| 量子化学计算 | HPC应用 | `quantum-chemistry` |

### 步骤2: 设置metadata.category

```typescript
// AI工具示例
metadata: {
  category: 'machine-learning',  // 或 'deep-learning'
  // ...
}

// 生信工具示例
metadata: {
  category: 'bioinformatics',
  // ...
}

// HPC应用示例
metadata: {
  category: 'structural-analysis',  // 或其他HPC相关category
  // ...
}
```

### 步骤3: 设置tags辅助分类

```typescript
// AI工具
tags: ['ai', 'machine-learning', 'deep-learning', 'gpu']

// 生信工具
tags: ['bioinformatics', 'genomics', 'variant-calling']

// HPC应用
tags: ['simulation', 'cfd', 'structural-analysis']
```

### 步骤4: 避免使用type分类

⚠️ **重要**: `type`字段描述**技术特性**，不用于板块分类

```typescript
// ❌ 错误思路: 使用type分类
metadata: {
  category: 'scientific-computing',
  type: ['jupyter']  // 这不会让它进入AI板块
}

// ✅ 正确思路: 使用category和tags
metadata: {
  category: 'development-tools',  // 或 'bioinformatics'
  tags: ['ai', 'jupyter'],  // AI工具需要这个
  type: ['jupyter', 'web']  // 仅描述技术特性
}
```

---

## 📚 常见应用分类示例

### AI工具示例

#### 1. PyTorch (深度学习框架)
```typescript
export const pytorchApp: HpcApplicationSpec = {
  metadata: {
    name: 'pytorch',
    category: 'deep-learning',  // ✅ 关键
    tags: ['deep-learning', 'neural-networks', 'gpu', 'ai'],
    type: ['batch', 'gpu', 'interactive']
  }
}
```
**板块**: ⚡ AI工具 (因为category包含'deep-learning')

#### 2. TensorFlow (机器学习框架)
```typescript
export const tensorflowApp: HpcApplicationSpec = {
  metadata: {
    name: 'tensorflow',
    category: 'machine-learning',  // ✅ 关键
    tags: ['machine-learning', 'deep-learning', 'ai', 'gpu'],
    type: ['batch', 'gpu']
  }
}
```
**板块**: ⚡ AI工具 (因为category包含'machine-learning')

#### 3. Jupyter Lab (AI开发工具)
```typescript
export const jupyterApp: HpcApplicationSpec = {
  metadata: {
    name: 'jupyter',
    category: 'development-tools',  // ⚠️ 需配合tags
    tags: ['jupyter', 'notebook', 'python', 'ai'],  // ✅ 包含'ai'
    type: ['jupyter', 'web', 'interactive']
  }
}
```
**板块**: ⚡ AI工具 (因为category='development-tools' 且 tags包含'ai')

### 生信工具示例

#### 4. GATK (变异检测)
```typescript
export const gatkApp: HpcApplicationSpec = {
  metadata: {
    name: 'gatk',
    category: 'bioinformatics',  // ✅ 关键
    tags: ['variant-calling', 'genomics', 'gatk'],
    type: ['batch']
  }
}
```
**板块**: 🧬 生信工具 (因为category='bioinformatics')

#### 5. R (生信统计)
```typescript
export const rApp: HpcApplicationSpec = {
  metadata: {
    name: 'r',
    category: 'bioinformatics',  // ✅ 关键
    tags: ['statistics', 'bioinformatics', 'genomics'],
    type: ['interactive', 'batch', 'jupyter']  // ⚠️ 虽然有jupyter，但category优先
  }
}
```
**板块**: 🧬 生信工具 (因为category='bioinformatics'，优先级高于type)

#### 6. Nextflow (生信流程)
```typescript
export const nextflowApp: HpcApplicationSpec = {
  metadata: {
    name: 'nextflow',
    category: 'workflow-management',  // ⚠️ 不是'bioinformatics'
    tags: ['bioinformatics', 'workflow', 'pipeline'],  // ✅ 包含'bioinformatics'
    type: ['batch']
  }
}
```
**板块**: 🧬 生信工具 (虽然category不是bioinformatics，但tags包含)

### HPC应用示例

#### 7. COMSOL (多物理场仿真)
```typescript
export const comsolApp: HpcApplicationSpec = {
  metadata: {
    name: 'comsol-multiphysics',
    category: 'multiphysics',  // ✅ 关键
    tags: ['simulation', 'fem', 'cfd', 'structural'],
    type: ['batch', 'interactive']
  }
}
```
**板块**: 💻 HPC应用 (不匹配AI和生信条件)

#### 8. ABAQUS (结构分析)
```typescript
export const abaqusApp: HpcApplicationSpec = {
  metadata: {
    name: 'abaqus-standard',
    category: 'structural-analysis',  // ✅ 关键
    tags: ['fem', 'structural', 'simulation'],
    type: ['batch']
  }
}
```
**板块**: 💻 HPC应用

#### 9. MATLAB (科学计算)
```typescript
export const matlabApp: HpcApplicationSpec = {
  metadata: {
    name: 'matlab',
    category: 'scientific-computing',  // ✅ 关键
    tags: ['programming', 'numerical-computing', 'matrix'],
    type: ['interactive', 'batch']
  }
}
```
**板块**: 💻 HPC应用

---

## ⚠️ 避免常见错误

### 错误1: 使用type字段分类

```typescript
// ❌ 错误
metadata: {
  category: 'scientific-computing',
  type: ['jupyter']  // 期望进入AI板块 - 不会的！
}

// ✅ 正确
metadata: {
  category: 'development-tools',
  tags: ['ai', 'jupyter'],  // 必须有这些tags
  type: ['jupyter', 'web']
}
```

### 错误2: category和tags不一致

```typescript
// ⚠️ 混乱
metadata: {
  category: 'bioinformatics',  // 说是生信
  tags: ['ai', 'deep-learning']  // 但tags是AI
}
// 结果: 进入生信板块（因为category优先级高）
// 建议: 保持category和tags一致

// ✅ 清晰
metadata: {
  category: 'bioinformatics',
  tags: ['bioinformatics', 'genomics', 'variant-calling']
}
```

### 错误3: 跨领域应用分类不明确

**场景**: 应用既做AI又做生信（如深度学习变异检测）

```typescript
// ❌ 混乱
metadata: {
  category: 'deep-learning',
  tags: ['ai', 'bioinformatics']  // 矛盾
}
// 结果: AI板块（category匹配deep-learning）

// ✅ 方案1: 主要用途优先
metadata: {
  category: 'bioinformatics',  // 主要用途
  tags: ['bioinformatics', 'deep-learning', 'variant-calling']
}
// 结果: 生信板块

// ✅ 方案2: 技术特性优先
metadata: {
  category: 'deep-learning',  // 技术特性
  tags: ['ai', 'genomics', 'variant-calling']
}
// 结果: AI板块
```

**原则**: 选择**主要用途**作为category

### 错误4: 误用development-tools

```typescript
// ❌ 错误: development-tools但没有ai/jupyter tags
metadata: {
  category: 'development-tools',
  tags: ['ide', 'editor']
}
// 结果: HPC板块（不满足AI条件）

// ✅ 正确: development-tools + ai/jupyter
metadata: {
  category: 'development-tools',
  tags: ['ai', 'jupyter', 'notebook']
}
// 结果: AI板块
```

---

## 🧪 测试验证

### 方法1: 使用测试脚本

创建测试文件 `/tmp/test-app-classification.js`:

```javascript
const ApplicationCategory = {
  BIOINFORMATICS: 'bioinformatics',
  MACHINE_LEARNING: 'machine-learning',
  DEEP_LEARNING: 'deep-learning'
};

// 你的新应用
const newApp = {
  metadata: {
    name: 'my-new-app',
    category: 'bioinformatics',  // 修改这里
    tags: ['genomics', 'variant-calling'],
    type: ['batch']
  }
};

// 分组逻辑
const category = newApp.metadata.category;
const tags = newApp.metadata.tags || [];

let板块 = '';

if (category === ApplicationCategory.BIOINFORMATICS || tags.includes('bioinformatics')) {
  板块 = '🧬 生信工具';
} else if (
  category.includes('machine-learning') ||
  category.includes('deep-learning') ||
  category === 'development-tools' && (tags.includes('ai') || tags.includes('jupyter'))
) {
  板块 = '⚡ AI工具';
} else {
  板块 = '💻 HPC应用';
}

console.log(`应用: ${newApp.metadata.name}`);
console.log(`Category: ${category}`);
console.log(`Tags: ${tags.join(', ')}`);
console.log(`板块: ${板块}`);
```

运行测试:
```bash
node /tmp/test-app-classification.js
```

### 方法2: 检查API返回

注册应用后，检查API:
```bash
# 注册新应用
npx tsx scripts/register-my-app.ts

# 查看分类
curl -s 'http://localhost:3000/api/applications' | \
  jq '.data[] | select(.metadata.name == "my-new-app") | {
    name: .metadata.name,
    category: .metadata.category,
    tags: .metadata.tags
  }'
```

### 方法3: 浏览器验证

1. 访问应用中心
2. 强制刷新 (Ctrl+Shift+R)
3. 查看应用出现在哪个板块
4. 打开Console (F12)，查看分组日志

---

## 📊 快速决策流程图

```
开始
  ↓
应用主要用于生物信息学？
  ├─ 是 → category = 'bioinformatics' → 🧬 生信板块
  └─ 否 ↓

应用主要用于机器学习/深度学习？
  ├─ 是 → category = 'machine-learning' 或 'deep-learning' → ⚡ AI板块
  └─ 否 ↓

应用是AI开发工具（如Jupyter）？
  ├─ 是 → category = 'development-tools' + tags包含'ai' → ⚡ AI板块
  └─ 否 ↓

💻 HPC应用板块
  category = 'structural-analysis' / 'cfd' / 'multiphysics' / 等
```

---

## 🔍 分类检查清单

在注册新应用前，确认：

- [ ] ✅ 明确了应用的主要用途
- [ ] ✅ 选择了正确的`metadata.category`
- [ ] ✅ `tags`与`category`保持一致
- [ ] ✅ 没有依赖`type`字段进行分类
- [ ] ✅ 使用测试脚本验证了分类结果
- [ ] ✅ 了解了分类优先级（生信 > AI > HPC）

---

## 📝 ApplicationCategory 枚举参考

完整的category定义（`lib/hpc-application-spec.ts`）:

```typescript
export enum ApplicationCategory {
  // AI类
  MACHINE_LEARNING = 'machine-learning',
  DEEP_LEARNING = 'deep-learning',

  // 生信类
  BIOINFORMATICS = 'bioinformatics',

  // HPC类
  STRUCTURAL_ANALYSIS = 'structural-analysis',
  CFD = 'cfd',
  MULTIPHYSICS = 'multiphysics',
  MOLECULAR_SIMULATION = 'molecular-simulation',
  QUANTUM_CHEMISTRY = 'quantum-chemistry',
  SCIENTIFIC_COMPUTING = 'scientific-computing',
  DEVELOPMENT_TOOLS = 'development-tools',

  // 其他
  GENERAL = 'general'
}
```

---

## 🎯 总结

### 记住这三个原则

1. **Category优先**: 用category定义主要用途，不要用type
2. **Tags辅助**: 用tags补充说明，但category是主要判断依据
3. **优先级**: 生信 > AI > HPC（if-else if-else结构）

### 新应用分类公式

```typescript
// 生信工具
category: 'bioinformatics'
// 或
tags: ['bioinformatics', ...]

// AI工具
category: 'machine-learning' / 'deep-learning'
// 或
category: 'development-tools' + tags: ['ai'] / ['jupyter']

// HPC应用
// 其他所有category
```

---

**文档版本**: v1.0
**维护者**: HPC Platform Team
**最后更新**: 2025-10-27

如有疑问或需要添加新的分类规则，请联系开发团队。
