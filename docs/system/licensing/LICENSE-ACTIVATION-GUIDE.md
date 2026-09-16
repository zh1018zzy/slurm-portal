# HPC 管理平台许可证激活指南

> 适用范围：项目长期有效知识（模块说明、流程、部署或运维）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

本指南描述了完整的商业版许可证申请→生成→激活流程,适用于客户环境下的部署场景。

## 角色说明

- **实施人员**:在客户环境下负责系统部署和配置的工程师
- **授权人员**:负责生成和颁发商业版许可证的授权方人员

---

## 完整流程

### 步骤 1: 生成激活申请(实施人员 - 客户环境)

在客户环境的服务器上运行:

```bash
cd /opt/my-hpcapp
node scripts/license/generate-activation-request.js
```

**输出示例:**
```
=== 许可证激活申请生成器 ===

正在生成硬件指纹...
✓ 硬件指纹: e13e3a7b29b326a1...

正在获取安装信息...
✓ 安装ID: 2bd3eaad-e247-4ca4-904a-eb44bc361923

正在获取集群信息...
✓ 集群节点数: 2

✓ 申请ID: REQ-1762436943931-14181610

=== 申请文件生成成功 ===
文件位置: /opt/my-hpcapp/config/license-requests/license-request-2025-11-06-1762436943931.json
```

生成的申请文件包含:
- **硬件指纹**: 唯一标识该服务器的哈希值
- **申请ID**: 全局唯一的申请标识符
- **集群信息**: 节点数、分区数等
- **系统信息**: 主机名、平台、CPU、内存等

---

### 步骤 2: 编辑并发送申请文件(实施人员)

1. 编辑申请文件,填写联系信息:

```bash
vi config/license-requests/license-request-2025-11-06-1762436943931.json
```

2. 填写以下字段:

```json
{
  "contact": {
    "company": "某某科技有限公司",
    "contactPerson": "张三",
    "email": "zhangsan@example.com",
    "phone": "138xxxx0000",
    "department": "IT部门"
  },
  "requestedConfig": {
    "licenseType": "commercial",
    "tier": "professional",    // basic/professional/enterprise
    "maxUsers": 100,           // 根据实际需求填写
    "duration": 365,           // 有效期(天)
    "features": [
      "job_management",
      "file_management",
      "resource_monitoring",
      "webshell",
      "vnc",
      "bioinformatics"
    ]
  }
}
```

3. 将申请文件发送给授权人员:

```bash
# 通过邮件、内部系统等方式发送
scp config/license-requests/license-request-*.json 授权人员@授权服务器:/path/to/requests/
```

---

### 步骤 3: 生成商业版许可证(授权人员)

授权人员收到申请后，基于申请文件生成许可证:

```bash
# 方式一: 基于申请文件生成(推荐)
node scripts/license/generate-license.js \
  --request /path/to/license-request-2025-11-06-1762436943931.json

# 方式二: 手动指定参数
node scripts/license/generate-license.js \
  --customer "某某科技有限公司" \
  --tier professional \
  --users 100 \
  --concurrent 50 \
  --days 365 \
  --hardware e13e3a7b29b326a1ddbd936d5f4029449b1f10646b2e824e79bd5f006da4b97c
```

**输出示例:**
```
🔐 HPC管理平台许可证生成工具
================================

📨 基于申请文件生成许可证...

📋 申请文件信息:
   申请ID: REQ-1762436943931-14181610
   申请日期: 2025-11-06
   硬件指纹: e13e3a7b29b326a1...
   主机名: hpc-server-01
   集群节点数: 2
   公司: 某某科技有限公司
   联系人: 张三

正在为客户 "某某科技有限公司" 生成许可证...

✅ 许可证生成成功!
📄 文件路径: /opt/my-hpcapp/config/licenses/license-REQ-1762436943931-14181610.json

📋 许可证详情:
   客户: 某某科技有限公司
   层级: professional
   有效期: 2025-11-06 - 2026-11-06 (365天)
   最大用户数: 100
   最大并发用户数: 50
   启用功能: job_management, file_management, resource_monitoring, webshell, vnc
   硬件指纹: e13e3a7b29b326a1...
   申请ID: REQ-1762436943931-14181610

⚠️  重要提示:
   1. 请妥善保管许可证文件
   2. 不要修改许可证文件内容
   3. 部署时确保硬件指纹匹配
   4. 将此许可证文件发送给客户部署人员
```

生成的许可证文件 `license-REQ-xxxx.json` 包含:
- Base64编码的许可证配置
- 数字签名(生产环境)或开发模式签名
- 硬件指纹绑定
- 用户限制、功能限制、有效期等

---

### 步骤 4: 安装并激活许可证(实施人员 - 客户环境)

1. 接收授权人员发送的许可证文件

2. 安装许可证:

```bash
cd /opt/my-hpcapp

# 安装许可证到指定位置
node scripts/license/install-license.js /path/to/license-REQ-xxxx.json
```

**输出示例:**
```
🔐 许可证安装工具
================================

正在验证许可证文件...
✅ 许可证格式验证通过
⚠️  检测到开发模式签名，跳过数字签名验证
✅ 许可证有效性验证通过

📋 许可证信息:
   客户: 某某科技有限公司
   层级: professional
   有效期至: 2026-11-06 (剩余 365 天)
   用户限制: 100 用户, 50 并发
   硬件指纹: e13e3a7b29b326a1...

正在安装许可证...
✅ 许可证安装成功!

📍 安装位置: /opt/my-hpcapp/config/license/license.json

下一步:
1. (可选)删除试用版标记: rm config/installation.json
2. 重启服务: pm2 restart hpc-app
3. 验证激活状态: curl http://localhost:3000/api/license/status
```

3. 删除或备份试用版标记(推荐):

```bash
# 备份试用版标记
mv config/installation.json config/installation.json.bak

# 或直接删除
rm config/installation.json
```

4. 重启应用:

```bash
pm2 restart hpc-app
```

5. 验证激活状态:

```bash
curl -s http://localhost:3000/api/license/status | jq '.'
```

**预期输出:**
```json
{
  "valid": true,
  "type": "commercial",
  "status": "commercial",
  "message": "商业版许可证有效 (某某科技有限公司 - professional)",
  "remainingDays": 365,
  "startDate": "2025-11-06T00:00:00.000Z",
  "endDate": "2026-11-06T00:00:00.000Z",
  "currentUsage": {
    "totalUsers": 6,
    "activeUsers": 0,
    "concurrentUsers": 1
  },
  "limits": {
    "maxUsers": 100,
    "maxConcurrentUsers": 50
  }
}
```

---

## 核心文件说明

### 申请文件

- **位置**: `config/license-requests/license-request-*.json`
- **作用**: 包含客户环境的硬件指纹和需求配置
- **唯一性**: 每个申请有唯一的申请ID (REQ-timestamp-random)
- **安全性**: 硬件指纹基于CPU、MAC地址、主机名等生成

### 商业版许可证文件

- **位置**: `config/license/license.json`
- **格式**:
  ```json
  {
    "header": {
      "version": "1.0",
      "format": "json",
      "algorithm": "RSA-SHA256"
    },
    "payload": "Base64编码的许可证配置",
    "signature": "数字签名或开发模式签名",
    "checksum": "SHA256校验和"
  }
  ```
- **绑定**: 通过硬件指纹绑定到特定服务器
- **有效期**: 配置中指定的开始和结束日期

### 试用版标记文件

- **位置**: `config/installation.json`
- **作用**: 标识系统为试用模式
- **优先级**: 商业版许可证优先级更高
- **建议**: 安装商业版后删除此文件以避免混淆

---

## 许可证类型对比

| 特性 | 试用版 | Basic | Professional | Enterprise |
|------|--------|-------|--------------|------------|
| 用户数 | 10 | 10 | 50 | 200 |
| 并发用户 | 5 | 5 | 25 | 100 |
| 有效期 | 90天 | 按需 | 按需 | 按需 |
| 作业管理 | ✅ | ✅ | ✅ | ✅ |
| 文件管理 | ✅ | ✅ | ✅ | ✅ |
| 资源监控 | ✅ | ✅ | ✅ | ✅ |
| Web终端 | ✅ | ❌ | ✅ | ✅ |
| VNC桌面 | ✅ | ❌ | ❌ | ✅ |
| 生物信息学 | ❌ | ❌ | ❌ | ✅ |
| API访问 | ❌ | ❌ | ❌ | ✅ |

---

## 常见问题

### Q1: 硬件指纹是如何生成的?

基于以下系统特征:
- CPU型号和核心数
- 主机名
- 系统平台和架构
- 第一个非内部网卡的MAC地址
- 系统总内存

使用SHA256哈希算法生成唯一指纹。

### Q2: 如果更换服务器硬件怎么办?

硬件指纹会改变，需要重新申请许可证。建议:
1. 提前通知授权方
2. 在新服务器上生成新的申请文件
3. 授权方生成新许可证
4. 使用新许可证激活

### Q3: 可以同时有试用版和商业版许可证吗?

可以，但系统会优先使用商业版许可证。建议删除 `config/installation.json` 以避免混淆。

### Q4: 许可证到期后会怎样?

- 系统会自动回退到试用模式(如果trial标记文件存在)
- 或显示许可证过期提示
- 需要续费获取新许可证

### Q5: 如何检查当前许可证状态?

```bash
# 方式1: API查询
curl http://localhost:3000/api/license/status

# 方式2: 查看许可证文件
cat config/license/license.json | jq '.payload' | base64 -d | jq '.'

# 方式3: Web界面
访问: http://your-server:3000/dashboard/system/license
```

---

## 安全建议

1. **保护申请文件**: 申请文件包含系统信息，应通过安全渠道传输
2. **保护许可证文件**: 商业版许可证文件包含敏感配置，避免泄露
3. **备份许可证**: 定期备份许可证文件，防止丢失
4. **监控到期时间**: 提前30天申请续费
5. **验证硬件绑定**: 确保许可证安装在正确的服务器上

---

## 相关文档

- [许可证授权流程详解](./LICENSE-AUTHORIZATION-FLOW.md)
- [许可证安装脚本说明](../../../scripts/license/README.md)
- [系统部署指南](../../archive/root-legacy/DEPLOYMENT.md)

---

## 联系支持

如遇到问题,请联系技术支持并提供:
- 申请ID (REQ-xxx)
- 系统版本
- 错误日志
- 硬件指纹
