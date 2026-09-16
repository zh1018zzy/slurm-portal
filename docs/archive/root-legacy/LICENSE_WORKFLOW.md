# 许可证管理完整流程

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

本文档描述了 HPC 管理平台许可证从申请到安装的完整流程。

## 目录

1. [流程概览](#流程概览)
2. [用户端：申请许可证](#用户端申请许可证)
3. [管理员端：生成许可证](#管理员端生成许可证)
4. [用户端：安装许可证](#用户端安装许可证)
5. [故障排除](#故障排除)
6. [技术细节](#技术细节)

---

## 流程概览

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│  用户申请   │ ───> │ 管理员生成   │ ───> │  用户安装   │
│  许可证     │      │  许可证文件  │      │  许可证     │
└─────────────┘      └──────────────┘      └─────────────┘
     │                      │                      │
     ▼                      ▼                      ▼
 申请文件.json        许可证文件.json         系统激活
```

### 关键文件

- **申请文件**: `license-request-YYYY-MM-DD-XXXXXX.json`
- **许可证文件**: `license-REQ-XXXXXX.json` 或 `license.json`
- **安装位置**: `config/license/license.json`

---

## 用户端：申请许可证

### 方式一：通过 Web 界面（推荐）

1. 访问系统管理页面
   ```
   http://your-server:3000/dashboard/system/license
   ```

2. 点击"申请商业版许可证"按钮

3. 填写申请表单：
   - **公司名称**: 必填
   - **联系人**: 必填
   - **邮箱**: 必填
   - **电话**: 选填
   - **部门**: 选填
   - **许可证类型**: commercial（商业版）
   - **有效期**: 默认 365 天
   - **备注**: 选填

4. 点击"生成申请文件"

5. 下载生成的 `license-request-YYYY-MM-DD.json` 文件

6. 将申请文件发送给许可证管理员或供应商

### 方式二：通过 API（高级用户）

```bash
curl -X POST http://your-server:3000/api/license/activation-request \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Your Company",
    "contactPerson": "Zhang San",
    "email": "contact@example.com",
    "phone": "13800138000",
    "department": "IT",
    "licenseType": "commercial",
    "duration": 365,
    "notes": "申请说明"
  }' \
  -o license-request.json
```

### 申请文件内容示例

```json
{
  "requestId": "REQ-1768476240970-54DE8F40",
  "requestDate": "2026-01-15T11:24:00.970Z",
  "hardware": {
    "fingerprint": "e13e3a7b29b326a1...",
    "features": {
      "hostname": "hpc-server",
      "platform": "linux",
      "arch": "x64",
      "cpuModel": "Intel(R) Xeon(R) CPU",
      "cpuCores": 32,
      "totalMemoryGB": 128,
      "macAddress": "00:15:5d:89:0b:12"
    }
  },
  "installation": {
    "installDate": "2025-08-28T19:13:18.653Z",
    "installId": "5d6b9705-ac21-4a44-9057-06dca0e3f614",
    "version": "1.0.0"
  },
  "cluster": {
    "nodeCount": 10,
    "partitionCount": 3,
    "partitions": ["compute", "gpu", "bigmem"]
  },
  "contact": {
    "company": "Your Company",
    "contactPerson": "Zhang San",
    "email": "contact@example.com",
    "phone": "13800138000",
    "department": "IT"
  },
  "requestedConfig": {
    "licenseType": "commercial",
    "duration": 365,
    "features": [
      "job_management",
      "file_management",
      "resource_monitoring",
      "webshell",
      "vnc"
    ]
  }
}
```

---

## 管理员端：生成许可证

### 前提条件

1. 收到用户的许可证申请文件
2. 已安装 Node.js 环境
3. 拥有许可证生成工具和密钥

### 生成步骤

#### 方式一：基于申请文件生成（推荐）

```bash
cd /opt/my-hpcapp

# 基于申请文件生成许可证
node scripts/license/generate-license.js \
  --request /path/to/license-request.json
```

**输出示例：**
```
🔐 HPC管理平台许可证生成工具
================================

📨 基于申请文件生成许可证...

📋 申请文件信息:
   申请ID: REQ-1768476240970-54DE8F40
   申请日期: 1/15/2026, 7:24:00 PM
   硬件指纹: e13e3a7b29b326a1...
   主机名: hpc-server
   集群节点数: 10
   公司: Your Company
   联系人: Zhang San

正在为客户 "Your Company" 生成许可证...

✅ 许可证生成成功!
📄 文件路径: /opt/my-hpcapp/scripts/config/licenses/license-REQ-1768476240970-54DE8F40.json

📋 许可证详情:
   客户: Your Company
   层级: enterprise
   有效期: 1/15/2026 - 1/15/2027
   最大用户数: 100
   最大并发用户数: 100
   启用功能: job_management, file_management, resource_monitoring, ...
   硬件指纹: e13e3a7b29b326a1...
```

