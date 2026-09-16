# License验证脚本更新说明

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

**时间**: 2025-11-06
**状态**: ✅ 已完成并验证

---

## 问题背景

### 原始问题
用户发现系统当前处于试用版状态（通过API确认），但运行 `node scripts/license/validate-license.js` 显示的是商业版许可证信息，与实际系统状态不符。

**API返回**:
```json
{
  "status": "trial",
  "type": "trial",
  "remainingDays": 41
}
```

**原脚本输出**:
```
客户: 开发测试
级别: basic
剩余 267 天
```

### 根本原因
- `validate-license.js` 脚本只检查商业版许可证文件 (`config/license.json`)
- 忽略了试用版标记文件 (`config/installation.json`)
- 与 `unified-license-validator.ts` 的检测逻辑不一致

---

## 解决方案

### 修改文件
- **scripts/license/validate-license.js** - 核心验证脚本
- **scripts/license/quick-health-check.sh** - 快速健康检查脚本

### 修改策略
按照 `unified-license-validator.ts` 的逻辑，优先检测试用版：

```javascript
// 检测顺序（与API服务一致）
1. 检查 config/installation.json （试用版标记）
2. 如果存在 → 试用版模式
3. 否则检查 config/license.json （商业版许可证）
4. 如果存在 → 商业版模式
5. 都不存在 → 无许可证
```

---

## 主要变更

### 1. 构造函数更新
```javascript
constructor() {
  this.configDir = path.join(process.cwd(), 'config')
  this.licenseDir = path.join(this.configDir, 'license')
  // 新增试用版标记文件
  this.installationFile = path.join(this.configDir, 'installation.json')
  this.licenseFile = path.join(this.configDir, 'license.json')
  this.publicKeyFile = path.join(this.licenseDir, 'license-public.pem')
  this.TRIAL_DURATION_DAYS = 90
}
```

### 2. 许可证类型检测
```javascript
async detectLicenseType() {
  // 优先检查试用版（与unified-license-validator一致）
  if (fs.existsSync(this.installationFile)) {
    return 'trial'
  }

  if (fs.existsSync(this.licenseFile)) {
    return 'commercial'
  }

  return 'none'
}
```

### 3. 分离验证流程
- **试用版验证**: `validateTrialComplete()`
  - 检查 installation.json 存在性
  - 计算试用期剩余天数
  - 显示试用版限制（最大10用户，5并发）

- **商业版验证**: `validateCommercialComplete()`
  - 原有的完整验证逻辑
  - 格式验证、签名验证、硬件绑定等

### 4. 输出格式更新
```
试用版输出示例:
   类型: 试用版
   安装时间: 9/17/2025, 7:10:13 PM
   安装ID: 5d6b9705-ac21-4a44-9057-06dca0e3f614
   版本: 1.0.0
   剩余天数: 41 天
   最大用户数: 10
   最大并发用户: 5
   ✅ 状态: 有效

商业版输出示例:
   类型: 商业版
   客户: 开发测试
   级别: basic
   有效期: 2025-01-13 - 2025-10-01
   用户限制: 无限制
   启用功能: webshell, vnc, ...
```

---

## 验证结果

### 完整验证测试
```bash
$ node scripts/license/validate-license.js

🔍 许可证验证工具
🔍 开始完整许可证验证...
📋 检测到试用版许可证

📊 验证结果摘要:
==================================================
🎉 总体状态: 验证通过
📋 许可证类型: 试用版

📋 详细检查结果:
✅ 试用版文件检查:
   ✅ 试用版标记文件存在

✅ 试用期验证:
   安装时间: 9/17/2025, 7:10:13 PM
   已使用: 49 天
   剩余: 41 天
   ✅ 试用期有效

✅ 试用版限制:
   ℹ️  最大用户数: 10
   ℹ️  最大并发用户: 5
   ℹ️  功能限制: 部分高级功能不可用

📄 许可证信息:
   类型: 试用版
   安装时间: 9/17/2025, 7:10:13 PM
   安装ID: 5d6b9705-ac21-4a44-9057-06dca0e3f614
   版本: 1.0.0
   剩余天数: 41 天
   最大用户数: 10
   最大并发用户: 5
   ✅ 状态: 有效
==================================================
```

### 快速验证测试
```bash
$ node scripts/license/validate-license.js --quick

🔍 许可证验证工具
⚡ 执行快速验证...
✅ 试用版快速验证通过 (剩余 41 天)
```

### 健康检查测试
```bash
$ bash scripts/license/quick-health-check.sh

🔍 License系统快速健康检查 (V2.0架构)
==========================================
📋 许可证类型检测:
  ✅ 试用版许可证 (config/installation.json)
🔑 公钥文件检查:
  ✅ license-public.pem 存在
📚 核心lib文件检查:
  ✅ edge-license-validator.ts
  ✅ license-validator.ts
  ✅ unified-license-validator.ts
  ✅ enhanced-license-manager.ts
🔧 核心scripts检查:
  ✅ generate-license.js
  ✅ validate-license.js
  ✅ install-license.js
✨ 运行许可证验证:
  📋 试用版模式
  ✅ 试用版验证通过
==========================================
✅ 快速健康检查完成！
```

---

## 系统一致性

### 验证逻辑一致性
现在三个层级的验证器都使用相同的检测顺序：

1. **Edge Runtime** (`edge-license-validator.ts`)
   - 轻量级路径过滤
   - 最小开销

2. **API Middleware** (`license-validator.ts`)
   - 完整Node.js验证
   - 文件读取、签名验证

3. **API Service** (`unified-license-validator.ts`)
   - 最全面验证
   - 数据库统计、审计

4. **命令行工具** (`validate-license.js`) ✅ 新增
   - 与API服务逻辑一致
   - 试用版优先检测
   - 准确反映系统状态

---

## 使用说明

### 完整验证
```bash
# 检测并验证当前系统许可证（试用版或商业版）
node scripts/license/validate-license.js

# 跳过签名验证
node scripts/license/validate-license.js --skip-signature

# 跳过硬件绑定验证
node scripts/license/validate-license.js --skip-hardware
```

### 快速验证
```bash
# 仅检查基本有效性
node scripts/license/validate-license.js --quick
```

### 健康检查
```bash
# 运行完整的系统健康检查
bash scripts/license/quick-health-check.sh
```

---

## 关键改进点

### ✅ 准确性
- 与API服务返回结果完全一致
- 准确反映系统实际运行状态
- 试用版和商业版明确区分

### ✅ 一致性
- 与 `unified-license-validator.ts` 逻辑一致
- 所有验证层使用相同的检测顺序
- 统一的试用期计算方式（90天）

### ✅ 完整性
- 支持试用版验证
- 支持商业版验证
- 完整的错误处理和警告提示

### ✅ 用户友好
- 清晰的输出格式
- 明确的许可证类型标识
- 详细的限制说明

---

## 技术细节

### 试用期计算
```javascript
const installDate = new Date(installData.installDate)
const now = new Date()
const daysElapsed = Math.floor((now - installDate) / (1000 * 3600 * 24))
const remainingDays = TRIAL_DURATION_DAYS - daysElapsed // 90天
```

### 试用版限制
- 最大用户数: 10
- 最大并发用户: 5
- 部分高级功能不可用

### 商业版特性
- 用户数: 无限制（根据许可证配置）
- 并发用户: 无限制（根据许可证配置）
- 全功能访问
- 硬件绑定验证
- 数字签名验证

---

## 相关文件

### 核心文件
- `scripts/license/validate-license.js` - 验证脚本（已更新）
- `scripts/license/install-license.js` - 安装脚本
- `scripts/license/generate-license.js` - 生成脚本
- `scripts/license/quick-health-check.sh` - 健康检查（已更新）

### 配置文件
- `config/installation.json` - 试用版标记
- `config/license.json` - 商业版许可证
- `config/license/license-public.pem` - RSA公钥

### 验证器文件
- `lib/license/edge-license-validator.ts` - Edge验证器
- `lib/license/license-validator.ts` - 标准验证器
- `lib/license/unified-license-validator.ts` - 统一验证器

### 文档文件
- `docs/system/licensing/LICENSE-CLEANUP-CORRECTION.md` - 清理修正报告
- `docs/system/licensing/LICENSE-VALIDATION-SCRIPT-UPDATE.md` - 本文档
- `scripts/license/README.md` - 工具手册

---

## 总结

✅ **问题解决**: 验证脚本现在能正确检测试用版，输出与API一致
✅ **逻辑一致**: 与 unified-license-validator.ts 使用相同的检测顺序
✅ **功能完整**: 支持试用版和商业版的完整验证
✅ **用户友好**: 清晰的输出格式和详细的状态信息

系统现在拥有统一、准确、可靠的许可证验证机制，无论是API调用、中间件检查还是命令行验证，都能返回一致的结果。

---

**更新时间**: 2025-11-06
**更新者**: Claude Code
**验证状态**: ✅ 完成并通过测试
