# AI应用板块不显示 - 浏览器缓存清除指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

**问题**: 用户sc_admin登录后只能看到HPC应用，看不到AI和生信板块

**根本原因**: 浏览器缓存了旧版本的JavaScript文件

---

## ✅ 立即解决方案

### 方案1: 强制刷新页面 (推荐)

**Windows/Linux**:
```
Ctrl + Shift + R
```
或
```
Ctrl + F5
```

**Mac**:
```
Cmd + Shift + R
```
或
```
Cmd + Option + R
```

### 方案2: 清除浏览器缓存

#### Chrome/Edge:
1. 按 `F12` 打开开发者工具
2. 右键点击刷新按钮
3. 选择"清空缓存并硬性重新加载"

或者:
1. 打开设置 → 隐私和安全 → 清除浏览数据
2. 选择"缓存的图像和文件"
3. 点击"清除数据"

#### Firefox:
1. 按 `Ctrl + Shift + Delete`
2. 选择"缓存"
3. 点击"立即清除"

#### Safari:
1. 打开偏好设置 → 高级
2. 勾选"在菜单栏中显示开发菜单"
3. 开发 → 清空缓存

### 方案3: 无痕/隐私模式测试

打开浏览器的无痕模式:
- **Chrome**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`
- **Safari**: `Cmd + Shift + N`

然后访问应用中心,应该能看到AI和生信板块。

---

## 🔍 验证步骤

### 步骤1: 打开开发者工具

按 `F12` 或右键 → 检查元素

### 步骤2: 查看Console

检查是否有JavaScript错误

### 步骤3: 查看Network

1. 切换到Network标签
2. 勾选"Disable cache"
3. 刷新页面
4. 查看`/api/applications`请求
5. 确认响应包含14个应用

### 步骤4: 查看Elements

1. 切换到Elements标签
2. 搜索"AI工具"或"aiTools"
3. 确认DOM中存在该元素

---

## 🧪 服务端验证

服务端数据是正确的:

```bash
# API返回14个应用
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/applications | jq '.data | length'
# 输出: 14

# AI应用正确分类
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/applications | \
  jq '.data[] | select(.metadata.category | contains("learning")) | .metadata.name'
# 输出:
# "vllm" (machine-learning)
# "pytorch" (deep-learning)

# 生信应用正确分类
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/applications | \
  jq '.data[] | select(.metadata.category == "bioinformatics") | .metadata.name'
# 输出:
# "gatk"
# "cloudgene"
# "nextflow"
# "r"
```

---

## 🐛 如果清除缓存后仍然不显示

### 检查1: 验证应用数据

打开浏览器Console,输入:

```javascript
// 查看applications状态
console.log('Applications:', applications.length)

// 查看分组结果
console.log('Grouped:', {
  ai: groupedApplications.ai.length,
  bio: groupedApplications.bio.length,
  hpc: groupedApplications.hpc.length
})
```

### 检查2: 验证过滤状态

```javascript
// 查看过滤后的分组
console.log('Filtered:', {
  ai: filteredGroupedApplications.ai.length,
  bio: filteredGroupedApplications.bio.length,
  hpc: filteredGroupedApplications.hpc.length
})

// 查看过滤条件
console.log('Filters:', {
  searchTerm,
  selectedCategory,
  selectedType
})
```

### 检查3: 查看React组件状态

在`app/[locale]/dashboard/applications/page.tsx`中临时添加:

```tsx
// 在组件顶部添加
console.log('=== Application Center Debug ===')
console.log('Total applications:', applications.length)
console.log('Grouped applications:', {
  ai: groupedApplications.ai.length,
  bio: groupedApplications.bio.length,
  hpc: groupedApplications.hpc.length
})
console.log('Filtered grouped applications:', {
  ai: filteredGroupedApplications.ai.length,
  bio: filteredGroupedApplications.bio.length,
  hpc: filteredGroupedApplications.hpc.length
})
```

---

## 📋 完整排查清单

- [ ] 强制刷新页面 (Ctrl+Shift+R)
- [ ] 清除浏览器缓存
- [ ] 在无痕模式下测试
- [ ] 检查Console是否有JavaScript错误
- [ ] 验证`/api/applications`返回14个应用
- [ ] 验证应用包含正确的category和tags
- [ ] 检查React组件状态(通过console.log)
- [ ] 验证分组逻辑是否执行
- [ ] 检查过滤条件是否正确

---

## 💡 临时调试方案

如果需要临时调试,可以在页面中添加一个调试按钮:

```tsx
{user?.role === 'admin' && (
  <Button
    variant="outline"
    onClick={() => {
      console.log('=== Debug Info ===')
      console.log('Applications:', applications)
      console.log('Grouped:', groupedApplications)
      console.log('Filtered:', filteredGroupedApplications)
      alert(`Total: ${applications.length}, AI: ${filteredGroupedApplications.ai.length}, Bio: ${filteredGroupedApplications.bio.length}`)
    }}
  >
    调试信息
  </Button>
)}
```

---

## ✅ 预期结果

清除缓存并刷新后,应该看到:

```
┌─────────────────────────────────────┐
│ ⚡ AI工具 [3]      [查看更多 →]     │
├─────────────────────────────────────┤
│  🔥 PyTorch    ⚡ vLLM   📓 Jupyter  │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 🧬 生物信息学工具 [4]                 │
├─────────────────────────────────────┤
│  GATK  Cloudgene  Nextflow  R       │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ 💻 HPC应用 [7]                       │
├─────────────────────────────────────┤
│  COMSOL  ABAQUS  Fluent  ...        │
└─────────────────────────────────────┘
```

---

**创建时间**: 2025-10-27
**状态**: 服务端正常，问题在浏览器缓存
**解决方案**: 强制刷新浏览器

🔄 **请使用 Ctrl+Shift+R 强制刷新页面!**
