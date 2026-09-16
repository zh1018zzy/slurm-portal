# 应用板块分配快速参考

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

---

## 🎯 三步法

### 1️⃣ 确定主要用途
```
生物信息学？ → 🧬 生信板块
AI/机器学习？ → ⚡ AI板块
其他科学计算？ → 💻 HPC板块
```

### 2️⃣ 设置category
```typescript
// 生信
category: 'bioinformatics'

// AI
category: 'machine-learning' 或 'deep-learning'

// AI开发工具
category: 'development-tools' + tags: ['ai']

// HPC
category: 'structural-analysis' / 'cfd' / 'multiphysics' / ...
```

### 3️⃣ 添加tags
```typescript
// 与category保持一致
category: 'bioinformatics'
tags: ['bioinformatics', 'genomics', ...]
```

---

## ⚡ 快速示例

### AI工具
```typescript
{
  metadata: {
    category: 'machine-learning',  // ✅
    tags: ['ai', 'ml', 'gpu']
  }
}
```

### 生信工具
```typescript
{
  metadata: {
    category: 'bioinformatics',  // ✅
    tags: ['genomics', 'ngs']
  }
}
```

### HPC应用
```typescript
{
  metadata: {
    category: 'cfd',  // ✅
    tags: ['simulation', 'fluent']
  }
}
```

---

## ⚠️ 常见错误

```typescript
// ❌ 使用type分类
type: ['jupyter']  // 这不会进入AI板块

// ✅ 使用category和tags
category: 'development-tools'
tags: ['ai', 'jupyter']
```

---

## 🧪 测试工具

```bash
# 编辑测试文件
vi scripts/test-app-classification.js

# 运行测试
node scripts/test-app-classification.js
```

---

## 📚 完整文档

`docs/features/applications/APPLICATION_CLASSIFICATION_GUIDE.md`
