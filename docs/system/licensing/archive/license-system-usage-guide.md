# HPC管理平台许可证系统使用指南 v2.0

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 📋 概述

本许可证系统采用先进的多层验证架构，提供完整的商业版和试用版管理功能，包括：

- **双模式支持** - 试用版(90天) + 商业版(无限期)
- **智能验证** - 统一验证器 + 增强管理器 + 安全管理器
- **自动恢复** - 智能问题诊断和自动修复机制
- **全面监控** - 实时审计、警告管理、使用统计
- **安全防护** - 多重防篡改 + 硬件绑定 + 数字签名
- **运维工具** - 完整的部署、备份、恢复、故障排除工具集

## 🚀 快速开始

### 试用版模式（默认）

系统首次启动时自动进入90天试用版模式：
- **用户限制**: 最多10个用户，5个并发用户
- **节点限制**: 最多5个计算节点，超限时自动下线
- **功能限制**: 除历史报表外的所有功能
- **自动激活**: 无需任何配置，开箱即用
- **智能监控**: 自动节点限制强制执行服务

### 商业版部署

#### 1. 安装许可证文件

```bash
# 使用许可证安装工具
node scripts/install-license.js /path/to/license.json

# 或手动安装
node scripts/install-license.js --help
```

#### 2. 验证许可证

```bash
# 快速验证
node scripts/validate-license.js --quick

# 完整验证
node scripts/validate-license.js

# 仅验证不修复
node scripts/validate-license.js --skip-signature --skip-hardware
```

#### 3. 健康检查

```bash
# 全面健康检查
./scripts/license/check-license-health.sh

# 快速检查
./scripts/license/check-license-health.sh --quick

# 自动修复问题
./scripts/license/check-license-health.sh --fix
```

## 📊 许可证类型说明

### 试用版 (Trial)
- **时长**: 90天（从首次安装开始计算）
- **用户限制**: 10个用户，5个并发用户
- **节点限制**: 5个计算节点
- **功能访问**: 
  - ✅ 所有基础功能（作业管理、文件管理、系统监控）
  - ✅ 用户管理、WebShell、VNC访问
  - ❌ 历史报表分析
  - ❌ 高级分析报告
- **适用场景**: 评估测试、小型团队试用

### 商业版 (Commercial)
- **时长**: 根据许可证协议（通常1年或永久）
- **用户限制**: 无限制（或根据许可证协议）
- **节点限制**: 无限制（或根据许可证协议）
- **功能访问**: 所有功能无限制
- **附加服务**: 技术支持、更新服务
- **适用场景**: 生产环境、企业部署

## 🛠️ 功能模块详解

### 基础功能（试用版+商业版）
| 功能 | 描述 | 试用版 | 商业版 |
|------|------|--------|--------|
| 作业管理 | 作业提交、监控、取消 | ✅ | ✅ |
| 文件管理 | 文件上传、下载、编辑 | ✅ | ✅ |
| 系统监控 | 节点状态、资源使用 | ✅ | ✅ |
| 用户管理 | 用户创建、权限管理 | ✅ | ✅ |
| WebShell | 终端访问 | ✅ | ✅ |
| VNC桌面 | 远程桌面访问 | ✅ | ✅ |
| API访问 | REST API接口 | ✅ | ✅ |

### 高级功能（仅商业版）
| 功能 | 描述 | 试用版 | 商业版 |
|------|------|--------|--------|
| 历史报表 | 作业历史分析报告 | ❌ | ✅ |
| 高级分析 | 性能趋势、使用统计 | ❌ | ✅ |

## 💻 开发者使用指南

### React组件中的许可证保护

```tsx
import { LicenseProtected } from '@/components/LicenseProtected'

// 保护特定功能
function HistoricalReportsPage() {
  return (
    <LicenseProtected feature="historical_reports">
      <HistoricalReportsComponent />
    </LicenseProtected>
  )
}

// 自定义fallback
function AdvancedAnalyticsPage() {
  return (
    <LicenseProtected 
      feature="advanced_analytics"
      fallback={<TrialVersionPrompt />}
    >
      <AdvancedAnalyticsComponent />
    </LicenseProtected>
  )
}
```

### Hook使用

```tsx
import { useLicenseCheck, useLicenseStatus } from '@/hooks/use-license-check'

function MyComponent() {
  // 检查特定功能权限
  const featureCheck = useLicenseCheck('historical_reports')
  
  // 获取许可证状态
  const licenseStatus = useLicenseStatus()
  
  if (featureCheck.loading) return <Loading />
  
  return (
    <div>
      <p>许可证类型: {licenseStatus.type}</p>
      <p>剩余天数: {licenseStatus.remainingDays}</p>
      {featureCheck.allowed ? (
        <HistoricalReports />
      ) : (
        <UpgradePrompt reason={featureCheck.reason} />
      )}
    </div>
  )
}
```

### API路由中的权限检查

```typescript
import { enhancedLicenseManager } from '@/lib/license/enhanced-license-manager'

export async function GET(request: NextRequest) {
  // 检查功能权限
  const featureCheck = await enhancedLicenseManager.checkFeaturePermission('historical_reports')
  
  if (!featureCheck.allowed) {
    return NextResponse.json(
      { 
        error: featureCheck.reason,
        upgradeRequired: featureCheck.upgradeRequired 
      },
      { status: 403 }
    )
  }
  
  // 继续处理
  return NextResponse.json({ data: 'success' })
}
```

## 🔧 管理和监控

### 许可证状态查看

```bash
# API方式
curl http://localhost:3000/api/license/status

# Web界面
# 访问 /dashboard/system/license
```

### 使用统计监控

```bash
# 获取详细统计
curl http://localhost:3000/api/license/stats

# 检查用户注册权限
curl http://localhost:3000/api/license/users/check

# 检查节点添加权限  
curl http://localhost:3000/api/license/nodes/check
```

### 审计日志查询

```bash
# 获取审计日志
curl "http://localhost:3000/api/license/audit?limit=50"

# 获取特定类型的事件
curl "http://localhost:3000/api/license/audit?eventType=license_check"

# 记录审计事件
curl -X POST http://localhost:3000/api/license/audit \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "feature_access",
    "action": "access_denied", 
    "result": "denied",
    "details": {"feature": "historical_reports"}
  }'
```

### 警告管理

```bash
# 获取当前警告
curl "http://localhost:3000/api/license/alerts?unresolved=true"

# 确认警告
curl -X PATCH http://localhost:3000/api/license/alerts \
  -H "Content-Type: application/json" \
  -d '{
    "alertId": "alert_123",
    "action": "acknowledge",
    "userId": "admin"
  }'
```

## 🛠️ 运维工具使用

### 配置备份和恢复

```bash
# 备份当前配置
./scripts/license/backup-license-config.sh

# 加密备份
./scripts/license/backup-license-config.sh --encrypt

# 从备份恢复
./scripts/license/restore-license-config.sh backup_file.tar.gz

# 预览恢复内容
./scripts/license/restore-license-config.sh --dry-run backup_file.tar.gz
```

### 健康检查和诊断

```bash
# 全面健康检查
./scripts/license/check-license-health.sh

# 生成JSON报告
./scripts/license/check-license-health.sh --json --report health.json

# 自动修复问题
./scripts/license/check-license-health.sh --fix --backup
```

### 故障排除

```bash
# 交互式故障排除
./scripts/license/license-troubleshooting.sh --interactive

# 自动修复已知问题
./scripts/license/license-troubleshooting.sh --fix --backup

# 生成详细报告
./scripts/license/license-troubleshooting.sh --verbose --report troubleshoot.txt
```

### 自动恢复

```bash
# 通过API触发自动恢复
curl -X POST http://localhost:3000/api/license/recovery \
  -H "Content-Type: application/json" \
  -d '{"action": "auto_recover"}'

# 执行特定恢复动作
curl -X POST http://localhost:3000/api/license/recovery \
  -H "Content-Type: application/json" \
  -d '{"action": "regenerate_security_markers"}'

# 查看恢复历史
curl "http://localhost:3000/api/license/recovery?action=history"
```

## 🔒 安全最佳实践

### 部署安全
1. **文件权限**: 确保关键文件权限正确设置
   ```bash
   chmod 600 config/.security_markers
   chmod 600 config/license/license-private.pem
   chmod 644 config/license/license-public.pem
   ```

2. **环境变量**: 在.env文件中配置安全参数
   ```bash
   # 启用严格验证
   STRICT_LICENSE_VALIDATION=true
   
   # 许可证文件路径
   LICENSE_FILE_PATH=config/license/license.json
   LICENSE_PUBLIC_KEY_PATH=config/license/license-public.pem
   ```

3. **网络安全**: 限制许可证API的访问
   - 仅管理员可访问许可证管理页面
   - 审计日志API需要认证
   - 限制恢复API的调用权限

### 监控告警
1. **定期检查**: 设置定时任务进行健康检查
   ```bash
   # 添加到crontab
   0 */6 * * * /path/to/scripts/license/check-license-health.sh --quiet
   ```

2. **警告处理**: 及时处理许可证警告
   - 过期提醒：提前30天开始警告
   - 用户限制：达到80%使用率时警告
   - 安全异常：立即处理critical级别的安全威胁

3. **备份策略**: 定期备份许可证配置
   ```bash
   # 每日备份
   0 2 * * * /path/to/scripts/license/backup-license-config.sh --compress
   ```

## 🐛 常见问题解决

### 1. 试用期到期
**问题**: 90天试用期结束，系统提示许可证过期
**解决方案**:
```bash
# 方法1: 安装商业版许可证
node scripts/install-license.js /path/to/commercial-license.json

# 方法2: 重置试用期（仅用于测试）
rm config/installation.json
# 重启服务后会重新生成试用期
```

### 2. 用户数量超限
**问题**: 无法注册新用户，提示用户数量已达上限
**解决方案**:
```bash
# 检查当前状态
curl http://localhost:3000/api/license/users/check

# 方法1: 删除不活跃用户
# 方法2: 升级到商业版许可证
```

### 3. 许可证验证失败
**问题**: 许可证文件存在但验证失败
**解决方案**:
```bash
# 运行故障排除工具
./scripts/license/license-troubleshooting.sh --fix

# 检查文件完整性
node scripts/validate-license.js

# 重新生成安全标记
curl -X POST http://localhost:3000/api/license/recovery \
  -d '{"action": "regenerate_security_markers"}'
```

### 4. 硬件指纹不匹配
**问题**: 更换硬件后许可证验证失败
**解决方案**:
```bash
# 获取新的硬件指纹
curl http://localhost:3000/api/license/hardware

# 联系供应商重新生成许可证文件
# 或临时跳过硬件验证（开发环境）
# SKIP_HARDWARE_BINDING 已废弃，生产环境请勿依赖此类开关
```

### 5. 功能访问被拒绝
**问题**: 商业版功能提示需要升级
**解决方案**:
```bash
# 检查许可证状态
curl http://localhost:3000/api/license/status

# 检查功能权限
curl http://localhost:3000/api/license/features/historical_reports/check

# 强制重新验证
curl -X POST http://localhost:3000/api/license/status
```

## 📈 升级路径

### 从试用版升级到商业版
1. **联系供应商**: 获取商业版许可证文件
2. **备份配置**: 升级前备份当前配置
3. **安装许可证**: 使用安装工具部署商业版许可证
4. **验证升级**: 确认功能解锁和限制移除
5. **更新监控**: 调整监控阈值和告警策略

### 许可证续费
1. **提前准备**: 到期前30天开始准备续费
2. **获取新证**: 从供应商获取续费后的许可证
3. **无缝更新**: 使用安装工具更新许可证
4. **验证状态**: 确认新的到期时间和权限

## 📞 技术支持

### 日志收集
遇到问题时，请收集以下信息：
```bash
# 生成完整诊断报告
./scripts/license/license-troubleshooting.sh --verbose --report diagnostic.txt

# 导出许可证状态
curl http://localhost:3000/api/license/status > license-status.json

# 导出审计日志
curl "http://localhost:3000/api/license/audit?limit=100" > audit-logs.json

# 系统健康报告
./scripts/license/check-license-health.sh --json --report health.json
```

## 🖥️ 节点限制系统

### 自动化节点管理
系统包含智能的节点限制强制执行服务，确保SLURM集群节点数量符合许可证要求：

#### 工作机制
- **定期监控**: 每60分钟自动检查节点数量
- **智能选择**: 超限时优先下线IDLE状态节点
- **自动恢复**: 许可证升级后自动恢复被限制的节点
- **标识管理**: 被限制节点标记为 `License limit exceeded - Auto managed`

#### 服务管理
```bash
# 通过API管理服务
curl -X POST http://localhost:3000/api/license/nodes/enforce \
  -H "Content-Type: application/json" \
  -d '{"action": "start"}'    # 启动服务
  -d '{"action": "stop"}'     # 停止服务  
  -d '{"action": "trigger"}'  # 手动触发检查

# 查看服务状态
curl http://localhost:3000/api/license/nodes/enforce
```

#### 手动节点管理
```bash
# 查看被许可证限制的节点
sinfo -h -N -o "%N|%t|%E" | grep "License limit exceeded"

# 手动恢复节点
scontrol update NodeName=<node> State=RESUME

# 手动下线节点进行维护
scontrol update NodeName=<node> State=DOWN Reason="Manual maintenance"
```

#### 故障排除
如果节点限制服务出现问题：
1. 检查服务状态：`curl http://localhost:3000/api/license/nodes/enforce`
2. 检查SLURM连接：`sinfo -h -N -o "%N" | wc -l`
3. 检查应用日志：查找 `NodeLimitEnforcer` 相关日志
4. 重启服务：`PM2 restart all` 或通过API重新启动

### 许可证界面监控
在许可证管理页面可查看：
- 当前节点数量和使用率
- 节点限制检查状态（正常/警告/超限）
- 节点数量趋势和限制情况

详细技术文档请参考：`docs/node-limit-enforcement.md`

### 联系信息
- 📧 **技术支持邮箱**: support@your-domain.com
- 📱 **技术支持热线**: 400-xxx-xxxx
- 🌐 **在线文档**: https://docs.your-domain.com
- 💬 **即时支持**: 通过管理界面在线咨询

---

**重要说明**: 本许可证系统用于软件功能控制和使用周期管理，请遵守软件许可协议和相关法律法规。
