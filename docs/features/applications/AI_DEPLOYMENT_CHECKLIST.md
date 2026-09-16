# AI应用管理系统 - 部署验证清单

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## ✅ 已完成的工作

### 核心文件 (11个)

1. ✅ **lib/applications/ai/index.ts** - AI应用统一导出
2. ✅ **lib/applications/ai/pytorch.ts** - PyTorch深度学习框架
3. ✅ **lib/applications/ai/vllm.ts** - vLLM大模型推理
4. ✅ **lib/applications/ai/jupyter.ts** - Jupyter Lab (已存在)
5. ✅ **scripts/register-ai-apps.ts** - AI应用注册脚本
6. ✅ **app/api/applications/ai/route.ts** - AI应用API路由
7. ✅ **app/[locale]/dashboard/applications/ai/page.tsx** - AI应用中心UI
8. ✅ **messages/ai-apps-zh.json** - 完整中文翻译
9. ✅ **docs/features/applications/AI_APPLICATION_MANAGEMENT.md** - 完整架构文档
10. ✅ **docs/features/applications/AI_QUICK_START.md** - 快速开始指南
11. ✅ **docs/features/applications/AI_IMPLEMENTATION_SUMMARY.md** - 实施总结

---

## 🚀 部署步骤

### 步骤1: 运行注册脚本

```bash
cd /opt/my-hpcapp
npx tsx scripts/register-ai-apps.ts
```

**检查项**:
- [ ] 脚本执行无错误
- [ ] 输出显示 "✅ 成功: 3"
- [ ] 输出显示 "❌ 失败: 0"
- [ ] 3个应用验证通过

### 步骤2: 合并翻译文件

```bash
# 方法1: 使用jq合并
jq -s '.[0] * .[1]' messages/zh.json messages/ai-apps-zh.json > messages/zh-new.json
mv messages/zh-new.json messages/zh.json

# 方法2: 手动合并
# 将 messages/ai-apps-zh.json 的内容复制到 messages/zh.json
```

**检查项**:
- [ ] messages/zh.json 包含 hpcApps.pytorch
- [ ] messages/zh.json 包含 hpcApps.vllm
- [ ] messages/zh.json 包含 aiApplications

### 步骤3: 重启应用

```bash
pm2 restart hpc-app
# 或开发环境
npm run dev
```

**检查项**:
- [ ] 服务启动无错误
- [ ] http://localhost:3000 可访问

---

## 🧪 功能验证

### 数据库验证

```bash
psql -U postgres -d your_database -c "
  SELECT name, version, metadata->>'category' as category
  FROM hpc_applications
  WHERE metadata->>'tags' @> '[\"ai\"]'
  ORDER BY name;
"
```

**预期结果**:
- [ ] jupyter | 4.0 | development-tools
- [ ] pytorch | 2.1.0 | deep-learning
- [ ] vllm | 0.4.0 | machine-learning

### API验证

```bash
curl http://localhost:3000/api/applications/ai | jq '.data.metadata'
```

**预期结果**:
```json
{
  "total": 3,
  "deepLearning": 1,
  "machineLearning": 1,
  "interactive": 1,
  "gpuRequired": 2,
  "gpuOptional": 1
}
```

**检查项**:
- [ ] API返回 success: true
- [ ] total 为 3
- [ ] gpuRequired 为 2
- [ ] data.all 包含3个应用

### UI验证

**应用中心页面** (http://localhost:3000/dashboard/applications):
- [ ] "AI工具"板块可见
- [ ] 显示3个应用卡片
- [ ] PyTorch图标显示正确 (🔥)
- [ ] vLLM图标显示正确 (⚡)
- [ ] Jupyter Lab图标显示正确 (📓)
- [ ] GPU徽章显示正确

**AI应用中心** (http://localhost:3000/dashboard/applications/ai):
- [ ] 页面正常加载
- [ ] 4个统计卡片显示
- [ ] 5个标签页可切换
- [ ] 应用卡片网格布局
- [ ] 管理员看到"注册AI应用"按钮

### 翻译验证

- [ ] PyTorch显示 "PyTorch 深度学习框架"
- [ ] vLLM显示 "vLLM 大模型推理"
- [ ] 所有字段标签为中文
- [ ] 无翻译键名显示 (如 hpcApps.xxx)

---

## 🎯 功能测试

### 测试1: 查看AI应用列表

1. 登录系统
2. 访问 /dashboard/applications
3. 找到"AI工具"板块
4. 验证显示3个应用

**检查项**:
- [ ] 应用卡片样式正确
- [ ] 点击卡片可跳转
- [ ] GPU徽章显示正确
- [ ] 版本号显示正确

### 测试2: 管理员注册功能

1. 以管理员身份登录
2. 访问 /dashboard/applications/ai
3. 点击"注册AI应用"按钮
4. 等待注册完成

**检查项**:
- [ ] 按钮可见(仅管理员)
- [ ] 注册过程显示loading
- [ ] 注册成功显示toast
- [ ] 列表自动刷新

### 测试3: 标签页筛选

1. 访问 /dashboard/applications/ai
2. 点击"深度学习"标签
3. 验证只显示PyTorch
4. 切换到"GPU必需"
5. 验证显示PyTorch和vLLM

**检查项**:
- [ ] 标签页切换流畅
- [ ] 筛选结果正确
- [ ] 应用数量更新

---

## 🔧 故障排查

### 问题: 脚本执行失败

**检查**:
```bash
# 检查文件存在
ls -la lib/applications/ai/
ls -la scripts/register-ai-apps.ts

# 检查TypeScript语法
npx tsc --noEmit lib/applications/ai/pytorch.ts

# 检查环境变量
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

**解决**:
- 确保所有文件已创建
- 检查环境变量配置
- 查看详细错误日志

### 问题: 应用未显示

**检查**:
```bash
# 查询数据库
psql -c "SELECT name, status FROM hpc_applications WHERE metadata->>'tags' @> '[\"ai\"]';"

# 清除缓存
curl -X DELETE http://localhost:3000/api/applications/ai

# 重新注册
npx tsx scripts/register-ai-apps.ts
```

**解决**:
- 重新运行注册脚本
- 清除浏览器缓存
- 检查应用status为active

### 问题: 翻译显示键名

**检查**:
```bash
# 检查翻译文件
cat messages/zh.json | jq '.hpcApps.pytorch'

# 检查文件大小
wc -l messages/zh.json
```

**解决**:
- 确保翻译已合并
- 重启Next.js应用
- 清除浏览器缓存

---

## 📊 代码统计

| 组件 | 文件数 | 代码行数 |
|------|--------|----------|
| 应用定义 | 4 | ~2,000 |
| 脚本 | 1 | ~150 |
| API | 1 | ~120 |
| UI | 1 | ~400 |
| 翻译 | 1 | ~800 |
| 文档 | 4 | ~2,500 |
| **总计** | **12** | **~6,000** |

---

## ✅ 最终检查清单

### 部署完成

- [ ] 所有11个核心文件已创建
- [ ] 注册脚本执行成功
- [ ] 数据库包含3个AI应用
- [ ] API返回正确数据
- [ ] UI界面正常显示
- [ ] 翻译文本正确
- [ ] 文档完整

### 功能正常

- [ ] 可以查看应用列表
- [ ] 可以按类别筛选
- [ ] 管理员可以注册应用
- [ ] 权限控制正常
- [ ] 缓存机制正常
- [ ] 统计数据准确

### 生产就绪

- [ ] 无严重bug
- [ ] 性能满足要求
- [ ] 安全检查通过
- [ ] 文档齐全
- [ ] 团队已培训
- [ ] 备份已创建

---

## 🎉 部署成功标准

✅ **基础标准**:
- 3个AI应用成功注册到数据库
- Web界面可以查看和筛选应用
- 翻译显示正确

✅ **功能标准**:
- 用户可以提交PyTorch/vLLM作业
- Jupyter Lab会话可以启动
- 权限控制正常工作

✅ **质量标准**:
- 代码质量高,无明显bug
- 性能良好,响应快速
- 用户体验流畅

---

## 📞 支持信息

- **文档**: `docs/features/applications/AI_*.md`
- **问题反馈**: GitHub Issues
- **技术支持**: 团队内部渠道

---

**检查清单版本**: v1.0.0
**创建日期**: 2025-10-24
**状态**: ✅ 可用于生产部署
