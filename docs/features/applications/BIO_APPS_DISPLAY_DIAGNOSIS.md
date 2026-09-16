# 生信应用板块不显示问题诊断

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

**诊断日期**: 2025-10-27
**状态**: 🔍 已诊断，待用户验证

---

## ✅ 服务端验证（全部正常）

### 1. API返回数据
```bash
curl 'http://localhost:3000/api/applications?forUser=sc_admin'
```

**结果**: ✅ 返回11个应用，包括2个生信应用

```json
{
  "total": 11,
  "bio_apps": [
    {
      "name": "gatk",
      "category": "bioinformatics"
    },
    {
      "name": "r",
      "category": "bioinformatics"
    }
  ]
}
```

### 2. 应用发布状态
```
gatk:
  - category: "bioinformatics" ✅
  - isPublic: true ✅
  - tags: ["variant-calling", "genomics", "gatk", "broad-institute"] ✅

r:
  - category: "bioinformatics" ✅
  - isPublic: true ✅
  - tags: ["statistics", "bioinformatics", "genomics"] ✅
```

### 3. 分组逻辑测试
```javascript
// 测试结果:
生信应用: 2 ['gatk', 'r'] ✅
```

分组条件:
```typescript
else if (category === ApplicationCategory.BIOINFORMATICS || tags.includes('bioinformatics')) {
  groups.bio.push(app)
}
```

**匹配测试**: ✅ 通过
- `"bioinformatics" === "bioinformatics"` → true

### 4. 翻译key验证
```json
{
  "hpcApplications": {
    "bioTools": "生物信息学工具"  ✅
  }
}
```

**使用方式**: `t('bioTools')` 在 `hpcApplications` 命名空间 ✅

---

## ⚠️ 可能的原因

### 原因1: 浏览器缓存（最可能）

**症状**:
- API返回正确数据
- 前端代码逻辑正确
- 但浏览器显示旧版本页面

**原因**:
浏览器缓存了旧的JavaScript文件（`.next/static/`下的文件），这些文件是在生信应用发布之前编译的。

**验证方法**:
1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 勾选 "Disable cache"
4. 刷新页面
5. 查看Console输出应用数量

### 原因2: 应用未重新加载

**症状**:
- 页面加载时调用了旧的API缓存
- Console显示少于11个应用

**验证方法**:
查看浏览器Console:
```
[HPC Application Center] Loaded X applications for user sc_admin
```

如果X < 11，说明前端获取的是旧数据。

### 原因3: 前端状态未更新

**症状**:
- API返回11个应用
- 但React状态没有更新

**验证方法**:
在Console中执行:
```javascript
// 查看应用数量
console.log('Apps:', applications.length)

// 查看分组结果
console.log('Grouped:', {
  ai: groupedApplications.ai.length,
  bio: groupedApplications.bio.length,
  hpc: groupedApplications.hpc.length
})
```

---

## 🔧 解决方案

### 方案1: 强制刷新浏览器（首选）

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

**作用**: 清除缓存并重新下载所有资源

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

### 方案3: 无痕模式测试

打开浏览器的无痕模式:
- **Chrome**: `Ctrl + Shift + N`
- **Firefox**: `Ctrl + Shift + P`
- **Safari**: `Cmd + Shift + N`

然后访问应用中心，应该能看到生信板块。

### 方案4: 重新构建并清除服务端缓存

如果前3个方案都不行，执行:

```bash
# 清除Next.js缓存
rm -rf .next

# 重新构建
npm run build

# 重启服务
pm2 restart hpc-app

# 清除应用注册表缓存（可选）
curl -X POST http://localhost:3000/api/applications/clear-cache
```

---

## 🧪 完整验证步骤

### 步骤1: 验证API数据
```bash
curl -s 'http://localhost:3000/api/applications?forUser=sc_admin' | jq '{
  total: .total,
  bio_count: [.data[] | select(.metadata.category == "bioinformatics")] | length,
  bio_apps: [.data[] | select(.metadata.category == "bioinformatics") | .metadata.name]
}'
```

**预期输出**:
```json
{
  "total": 11,
  "bio_count": 2,
  "bio_apps": ["gatk", "r"]
}
```

### 步骤2: 强制刷新浏览器
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### 步骤3: 打开浏览器Console（F12）
查看加载日志:
```
[HPC Application Center] Loaded 11 applications for user sc_admin
```

如果看到11，说明API正常。

### 步骤4: 检查分组结果
在Console中输入:
```javascript
// 这些变量可能在React DevTools中查看
// 或者查看页面底部的统计信息
```

### 步骤5: 查看页面底部统计
应该看到:
```
共加载 11 个应用: AI工具 3 个, 生物信息学 2 个, HPC应用 6 个
```

### 步骤6: 验证生信板块显示
应该看到:
```
┌─────────────────────────────────────┐
│ 🧬 生物信息学工具 [2]                │
├─────────────────────────────────────┤
│  [GATK卡片]  [R卡片]                 │
└─────────────────────────────────────┘
```

---

## 📊 预期显示效果

### 应用中心布局

```
┌────────────────────────────────────────┐
│ 🔍 搜索框                               │
│ 🎛️ 过滤器 (分类、类型)                   │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ ⚡ AI工具 [3]            [查看更多 →]   │
├────────────────────────────────────────┤
│  🔥 PyTorch  ⚡ vLLM  📓 Jupyter       │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 🧬 生物信息学工具 [2]                   │  ← 应该显示这个板块
├────────────────────────────────────────┤
│  📊 GATK  📈 R                         │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 💻 HPC应用 [6]                          │
├────────────────────────────────────────┤
│  COMSOL  ABAQUS  Fluent  ...           │
└────────────────────────────────────────┘

┌────────────────────────────────────────┐
│ 共加载 11 个应用: AI 3, 生信 2, HPC 6   │
└────────────────────────────────────────┘
```

---

## 🐛 调试信息收集

如果问题仍然存在，请提供以下信息:

### 1. API响应
```bash
curl -s 'http://localhost:3000/api/applications?forUser=sc_admin' | jq '.total'
```

### 2. 浏览器Console日志
```
打开F12 → Console标签
复制所有包含 "[HPC Application Center]" 的日志
```

### 3. Network请求
```
F12 → Network → 搜索 "applications"
查看请求的响应内容
```

### 4. React状态（如果安装了React DevTools）
```
查看 HpcApplicationCenter 组件的state:
- applications.length
- groupedApplications.bio.length
- filteredGroupedApplications.bio.length
```

### 5. 页面截图
```
截取整个应用中心页面
特别是底部的统计信息
```

---

## 📋 检查清单

请依次检查以下项目:

- [ ] ✅ API返回11个应用（验证完成）
- [ ] ✅ API中包含2个生信应用（验证完成）
- [ ] ✅ 生信应用category正确（验证完成）
- [ ] ✅ 生信应用isPublic=true（验证完成）
- [ ] ✅ 前端分组逻辑正确（验证完成）
- [ ] ✅ 翻译key存在（验证完成）
- [ ] ⏳ 浏览器强制刷新（待用户操作）
- [ ] ⏳ Console显示11个应用（待验证）
- [ ] ⏳ 页面显示生信板块（待验证）
- [ ] ⏳ 生信板块显示2个应用（待验证）

---

## 💡 常见问题

### Q1: 为什么API正确但页面不显示？
**A**: 这是典型的浏览器缓存问题。Next.js编译的JavaScript文件带有hash，浏览器会长期缓存。当服务端代码更新后，如果浏览器没有重新下载新的JavaScript，就会执行旧代码。

### Q2: 为什么cloudgene和nextflow不显示？
**A**: 这两个应用的`isPublic`仍然是`null`，需要手动发布:
```sql
-- 在数据库中执行
UPDATE hpc_applications
SET access = jsonb_set(access, '{isPublic}', 'true')
WHERE metadata->>'name' IN ('cloudgene', 'nextflow');
```

或者通过管理界面发布它们。

### Q3: 如何验证缓存已清除？
**A**:
1. 打开F12 → Network
2. 勾选"Disable cache"
3. 刷新页面
4. 查看`_app-xxx.js`文件的Status应该是200（不是304 Not Modified）

---

## ✅ 结论

**服务端状态**: ✅ 完全正常
- API正确返回2个生信应用
- 应用发布状态正确
- 分组逻辑正确
- 翻译配置正确

**客户端状态**: ⏳ 待验证
- 可能存在浏览器缓存问题

**推荐操作**:
1. **强制刷新浏览器** (Ctrl+Shift+R)
2. 检查Console日志确认应用数量
3. 如果仍不显示，尝试无痕模式
4. 如果仍有问题，提供调试信息

---

**诊断完成时间**: 2025-10-27
**服务端验证**: ✅ 通过
**前端验证**: ⏳ 待用户确认

🔍 **请先尝试强制刷新浏览器，应该就能看到生信板块了！**
