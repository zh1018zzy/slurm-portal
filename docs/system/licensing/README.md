# 许可证系统文档索引

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 核心文档（当前有效）

### 1. 用户指南
- **[LICENSE-WEB-ACTIVATION-GUIDE.md](LICENSE-WEB-ACTIVATION-GUIDE.md)** - Web界面激活指南（推荐）
  - 生成激活申请
  - 安装许可证
  - 故障排除

### 2. 系统分析
- **[LICENSE-SYSTEM-ANALYSIS.md](LICENSE-SYSTEM-ANALYSIS.md)** - 许可证系统架构分析
  - 系统架构
  - 验证流程
  - 安全机制

### 3. 授权流程
- **[LICENSE-AUTHORIZATION-FLOW.md](LICENSE-AUTHORIZATION-FLOW.md)** - 授权流程说明
  - 申请流程
  - 授权流程
  - 安装流程

## 历史文档（仅供参考）

以下文档记录了系统开发和清理过程，仅作为历史参考：

- LICENSE-CLEANUP-CORRECTION.md - 清理修正记录
- LICENSE-CLEANUP-PLAN.md - 清理计划
- LICENSE-CLEANUP-SUMMARY.md - 清理总结
- LICENSE-FINAL-CLEANUP-REPORT.md - 最终清理报告
- LICENSE-VALIDATION-SCRIPT-UPDATE.md - 验证脚本更新

## 许可证类型

系统支持两种许可证类型：

### 1. 试用版 (Trial)
- **有效期**: 90天
- **用户限制**: 最多10个用户
- **功能限制**: 
  - ✅ 基础功能（作业管理、文件管理、WebShell、VNC）
  - ❌ 历史报表功能
  - ❌ 高级报表功能

### 2. 商业版 (Commercial)
- **有效期**: 根据购买协议
- **用户限制**: 无限制
- **功能限制**: 无限制，所有功能可用

**注意**: 系统只有 trial 和 commercial 两种类型，没有基础版/标准版/企业版的区分。

## 快速开始

### 用户端（Web界面）

1. 访问 **系统管理 > 许可管理**
2. 点击 **"生成申请"** 按钮填写信息
3. 下载生成的申请文件发送给授权人员
4. 收到许可证后点击 **"安装许可"** 粘贴内容

详细步骤见 [LICENSE-WEB-ACTIVATION-GUIDE.md](LICENSE-WEB-ACTIVATION-GUIDE.md)

### 授权人员（命令行）

```bash
# 1. 生成许可证
node scripts/license/generate-license.js /path/to/request.json

# 2. 发送生成的许可证文件给用户
```

## 故障排除

常见问题解决方案请参考：
- [LICENSE-WEB-ACTIVATION-GUIDE.md - 故障排除章节](LICENSE-WEB-ACTIVATION-GUIDE.md#故障排除)

## 技术实现

核心验证器位于：
- `lib/license/unified-license-validator.ts` - 统一许可证验证器

API接口：
- `/api/license/activation-request` - 生成激活申请
- `/api/license/install` - 安装许可证
- `/api/license/stats` - 许可证统计信息

## 更新日志

### 2025-11-07
- ✨ 新增Web界面激活申请功能
- ✨ 新增Web界面许可证安装功能
- 🔧 简化许可配置（移除tier/maxUsers字段）
- 📝 更新所有相关文档
- 🗑️ 标记历史文档

### 历史版本
参见各个历史文档文件
