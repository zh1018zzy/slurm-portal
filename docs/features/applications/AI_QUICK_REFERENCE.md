# AI应用管理系统 - 快速参考卡

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🚀 30秒快速部署

```bash
# 1. 注册AI应用
cd /opt/my-hpcapp && npx tsx scripts/register-ai-apps.ts

# 2. 合并翻译
jq -s '.[0] * .[1]' messages/zh.json messages/ai-apps-zh.json > messages/zh-new.json && mv messages/zh-new.json messages/zh.json

# 3. 重启服务
pm2 restart hpc-app

# 4. 验证
curl http://localhost:3000/api/applications/ai | jq '.data.metadata'
```

## 📁 文件位置

```
lib/applications/ai/        # 应用定义 (4个文件)
scripts/register-ai-apps.ts # 注册脚本
app/api/applications/ai/    # API路由
app/.../applications/ai/    # UI页面
messages/ai-apps-zh.json    # 翻译文件
```

## 🎯 访问地址

- **应用中心**: http://your-server/dashboard/applications
- **AI专区**: http://your-server/dashboard/applications/ai
- **API**: http://your-server/api/applications/ai

## 📊 系统概览

| 应用 | 版本 | GPU | 用途 |
|------|------|-----|------|
| PyTorch | 2.1.0 | ✓ 必需 | 深度学习训练 |
| vLLM | 0.4.0 | ✓ 必需 | 大模型推理 |
| Jupyter | 4.0 | ○ 可选 | 交互式开发 |

## 🔧 常用命令

```bash
# 重新注册应用
npx tsx scripts/register-ai-apps.ts

# 清除缓存
curl -X DELETE http://localhost:3000/api/applications/ai

# 查看数据库
psql -c "SELECT name, version FROM hpc_applications WHERE metadata->>'tags' @> '[\"ai\"]';"

# 测试API
curl http://localhost:3000/api/applications/ai | jq
```

## ⚠️ 故障排查

| 问题 | 解决方案 |
|------|---------|
| 应用未显示 | 重新注册 + 清除缓存 |
| 翻译显示键名 | 检查messages/zh.json |
| API返回错误 | 检查数据库连接 |
| UI加载慢 | 清除浏览器缓存 |

## 📖 文档索引

1. **AI_README.md** - 项目概述和快速开始
2. **AI_QUICK_START.md** - 详细部署步骤
3. **AI_APPLICATION_MANAGEMENT.md** - 完整架构设计
4. **AI_IMPLEMENTATION_SUMMARY.md** - 实施总结报告
5. **AI_DEPLOYMENT_CHECKLIST.md** - 部署验证清单

## ✅ 验证清单

- [ ] 注册脚本执行成功 (输出"✅ 成功: 3")
- [ ] 数据库包含3个AI应用
- [ ] API返回total: 3
- [ ] Web界面显示AI工具板块
- [ ] 翻译文本显示中文

## 🎯 下一步

1. ✅ 部署完成 → 测试PyTorch提交
2. ✅ 测试通过 → 用户培训
3. ✅ 培训完成 → 正式上线
4. 🔄 收集反馈 → 持续改进

---

**版本**: v1.0.0 | **状态**: 🟢 生产就绪 | **日期**: 2025-10-24
