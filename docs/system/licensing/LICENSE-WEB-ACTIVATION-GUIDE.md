# 许可证Web激活指南

> 适用范围：系统模块长期知识（认证、权限、许可证、作业同步等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

现在可以直接在许可管理页面完成许可证激活申请和安装，无需使用命令行操作。

## 功能特性

### 1. 生成激活申请

在许可管理页面点击"生成申请"按钮，可以：
- 填写公司和联系信息
- 配置许可证类型和参数
- 自动采集硬件指纹和系统信息
- 下载激活申请JSON文件

### 2. 安装许可证

收到授权人员提供的许可证后：
- 点击"安装许可"按钮
- 粘贴许可证JSON内容
- 自动验证并安装

## 使用流程

### 步骤1: 生成激活申请

1. 访问 **系统管理 > 许可管理** 页面

2. 点击页面右上角的 **"生成申请"** 按钮

3. 在弹出的对话框中填写信息：

   **联系信息：**
   - 公司名称
   - 联系人
   - 部门
   - 邮箱
   - 电话

   **许可配置：**
   - 许可类型（试用版/商业版）
   - 有效期（天数）
   - 备注信息

4. 点击 **"生成并下载"** 按钮

5. 系统会自动：
   - 采集硬件指纹
   - 获取安装信息
   - 检测集群配置
   - 生成申请文件
   - 触发下载 `license-request-YYYY-MM-DD.json`

6. 将下载的申请文件发送给授权人员

### 步骤2: 安装许可证

1. 从授权人员处收到许可证JSON文件

2. 在许可管理页面点击 **"安装许可"** 按钮

3. 点击"选择许可证文件"，选择收到的许可证JSON文件

4. 系统会自动读取文件并显示内容预览

5. 确认内容无误后，点击 **"安装"** 按钮

6. 系统会自动：
   - 验证许可证格式
   - 验证数字签名
   - 检查有效期
   - 备份旧许可证
   - 安装新许可证

7. 安装成功后页面会自动刷新，显示新的许可信息

## 申请文件格式

生成的申请文件 `license-request-YYYY-MM-DD.json` 包含：

```json
{
  "requestId": "REQ-1699999999999-ABCD1234",
  "requestDate": "2025-11-07T10:30:00.000Z",

  "hardware": {
    "fingerprint": "abc123...",
    "features": {
      "hostname": "hpc-node01",
      "platform": "linux",
      "arch": "x64",
      "cpuModel": "Intel(R) Xeon(R) CPU E5-2680 v4",
      "cpuCores": 56,
      "totalMemoryGB": 128,
      "macAddress": "aa:bb:cc:dd:ee:ff"
    }
  },

  "installation": {
    "installDate": "2025-01-01T00:00:00.000Z",
    "installId": "uuid-...",
    "version": "1.0.0"
  },

  "cluster": {
    "nodeCount": 10,
    "partitionCount": 3,
    "partitions": ["compute", "gpu", "highmem"]
  },

  "contact": {
    "company": "示例科技",
    "contactPerson": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "department": "信息中心"
  },

  "requestedConfig": {
    "licenseType": "commercial",
    "duration": 365,
    "features": [...]
  },

  "notes": "测试环境申请"
}
```

## 许可证文件格式

授权人员提供的许可证文件格式：

```json
{
  "signature": "base64-encoded-signature",
  "data": {
    "type": "commercial",
    "issuedTo": {
      "company": "示例科技",
      "contact": "张三",
      "email": "zhangsan@example.com"
    },
    "hardware": {
      "fingerprint": "abc123..."
    },
    "issuedAt": "2025-11-07T00:00:00.000Z",
    "expiresAt": "2026-11-07T00:00:00.000Z",
    "features": [...]
  }
}
```

## 安全说明

### 硬件指纹

系统使用以下信息生成唯一硬件指纹：
- CPU型号和核心数
- 主机名
- 操作系统平台和架构
- 网络接口MAC地址
- 系统总内存

### 签名验证

安装许可证时会进行：
- JSON格式验证
- RSA数字签名验证
- 硬件指纹匹配
- 有效期检查

### 备份机制

每次安装新许可证时，系统会自动备份旧许可证：
- 备份路径：`config/license.json.backup-{timestamp}`
- 保留所有历史版本
- 可用于恢复

## 故障排除

### 1. 生成申请失败

**问题：** 点击"生成并下载"后没有反应

**解决：**
- 检查浏览器控制台是否有错误
- 确认已填写所有必填字段
- 检查网络连接
- 查看服务器日志：`pm2 logs`

### 2. 无法获取集群信息

**问题：** 申请文件中集群信息为0

**解决：**
- 检查Slurm服务是否运行：`systemctl status slurmd`
- 确认当前用户有执行sinfo权限
- 尝试手动执行：`sinfo -N -h`

### 3. 许可证安装失败

**问题：** 提示"签名验证失败"

**解决：**
- 确认许可证文件完整，没有被修改
- 检查公钥文件：`config/license/public.key`
- 联系授权人员重新生成

**问题：** 提示"许可证已过期"

**解决：**
- 检查系统时间是否正确
- 联系授权人员申请新的许可证

### 4. 安装后不生效

**问题：** 安装成功但限制未更新

**解决：**
```bash
# 重启服务
pm2 restart all

# 清除缓存
rm -rf .next/cache

# 重新构建
npm run build
pm2 restart all
```

## API接口说明

### 生成激活申请

```bash
POST /api/license/activation-request
Content-Type: application/json

{
  "company": "示例科技",
  "contactPerson": "张三",
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "department": "信息中心",
  "licenseType": "commercial",
  "tier": "basic",
  "maxUsers": 50,
  "duration": 365,
  "notes": ""
}

Response:
- 200: 返回JSON文件下载
- 500: 生成失败
```

### 安装许可证

```bash
POST /api/license/install
Content-Type: application/json

{license-json-content}

Response:
{
  "success": true,
  "message": "License installed successfully",
  "license": {
    "type": "commercial",
    "issuedTo": {...},
    "issuedAt": "...",
    "expiresAt": "..."
  }
}
```

## 命令行方式（备用）

如果Web界面不可用，仍可使用命令行：

### 生成申请

```bash
node scripts/license/generate-activation-request.js
```

### 安装许可证

```bash
node scripts/license/install-license.js /path/to/license.json
```

## 相关文档

- [许可证系统概述](./LICENSE-SYSTEM-ANALYSIS.md)
- [许可证生成指南](./LICENSE-ACTIVATION-GUIDE.md)
- [授权流程说明](./LICENSE-AUTHORIZATION-FLOW.md)

## 更新日志

### 2025-11-07
- ✨ 新增Web界面激活申请功能
- ✨ 新增Web界面许可证安装功能
- ✨ 自动硬件指纹采集
- ✨ 自动签名验证
- ✨ 自动备份机制
- 📝 完善用户指南
