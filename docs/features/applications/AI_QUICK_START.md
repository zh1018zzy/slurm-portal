# AI应用管理 - 快速开始指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 🚀 快速开始

基于已完成的Jupyter Lab集成,快速添加PyTorch和vLLM应用支持。

---

## 📋 前置条件

✅ **已完成**:
- Jupyter Lab应用已注册 (`lib/applications/ai/jupyter.ts`)
- 应用注册系统正常运行
- 应用中心UI已迁移到 `/dashboard/applications`
- 权限管理系统就绪

⚙️ **需要准备**:
- GPU分区已配置 (`sinfo -p gpu`)
- PyTorch/vLLM环境已安装
- 模型文件存储路径已规划

---

## 🎯 实施步骤

### 步骤1: 创建PyTorch应用定义 (15分钟)

```bash
# 创建文件
touch /opt/my-hpcapp/lib/applications/ai/pytorch.ts
```

参考示例: `docs/features/applications/AI_APPLICATION_MANAGEMENT.md` 中的PyTorch应用定义

关键配置:
- GPU硬件要求
- 资源配置文件(小/中/大规模)
- Slurm作业模板(单GPU/多GPU/分布式)
- 表单字段定义

### 步骤2: 创建vLLM应用定义 (15分钟)

```bash
# 创建文件
touch /opt/my-hpcapp/lib/applications/ai/vllm.ts
```

关键配置:
- 模型路径选项
- GPU类型和数量
- 推理服务器配置
- API端口设置

### 步骤3: 创建统一导出 (5分钟)

```bash
# 创建 lib/applications/ai/index.ts
cat > /opt/my-hpcapp/lib/applications/ai/index.ts << 'EOF'
import { jupyterApp } from './jupyter'
import { pytorchApp } from './pytorch'
import { vllmApp } from './vllm'

// 导出所有AI应用
export const aiApplications = [
  jupyterApp,
  pytorchApp,
  vllmApp
]

// 按类别分组
export const aiAppsByCategory = {
  deepLearning: [pytorchApp],
  inference: [vllmApp],
  interactive: [jupyterApp]
}

// 默认导出
export {
  jupyterApp,
  pytorchApp,
  vllmApp
}
EOF
```

### 步骤4: 创建注册脚本 (10分钟)

```bash
# 创建 scripts/register-ai-apps.ts
cat > /opt/my-hpcapp/scripts/register-ai-apps.ts << 'EOF'
#!/usr/bin/env tsx

import { ApplicationRegistry } from '../lib/application-registry'
import { aiApplications } from '../lib/applications/ai'

async function registerAIApps() {
  console.log('====================================')
  console.log('注册AI应用到系统')
  console.log('====================================\n')

  try {
    const registry = ApplicationRegistry.getInstance()

    console.log(`准备注册 ${aiApplications.length} 个AI应用...\n`)

    // 批量注册
    const result = await registry.registerBatch(aiApplications)

    console.log('\n注册结果:')
    console.log(`✅ 成功: ${result.success}`)
    console.log(`❌ 失败: ${result.failed}`)

    if (result.errors.length > 0) {
      console.error('\n错误详情:')
      result.errors.forEach(err => console.error(`  - ${err}`))
    }

    console.log('\n====================================')
    console.log('AI应用注册完成!')
    console.log('====================================\n')

    console.log('下一步:')
    console.log('1. 访问应用中心: /dashboard/applications')
    console.log('2. 查看AI工具板块')
    console.log('3. 选择应用提交作业')

  } catch (error) {
    console.error('\n❌ 注册失败:', error)
    process.exit(1)
  }
}

registerAIApps()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
EOF

chmod +x /opt/my-hpcapp/scripts/register-ai-apps.ts
```

### 步骤5: 添加国际化翻译 (15分钟)

在 `messages/zh.json` 中添加:

```json
{
  "hpcApps": {
    "pytorch": {
      "metadata": {
        "displayName": "PyTorch 深度学习框架",
        "description": "强大的深度学习框架,支持GPU加速训练和推理"
      },
      "fields": {
        "jobName": {
          "label": "作业名称",
          "description": "PyTorch训练作业的唯一标识"
        },
        "executionMode": {
          "label": "执行模式",
          "options": {
            "singleGpu": { "label": "单GPU训练" },
            "multiGpu": { "label": "多GPU训练" },
            "distributedDdp": { "label": "分布式训练(DDP)" }
          }
        },
        "gpuType": {
          "label": "GPU类型",
          "options": {
            "a100": { "label": "NVIDIA A100" },
            "v100": { "label": "NVIDIA V100" },
            "rtx3090": { "label": "NVIDIA RTX 3090" }
          }
        }
      }
    },
    "vllm": {
      "metadata": {
        "displayName": "vLLM 大模型推理",
        "description": "高性能LLM推理引擎,支持LLaMA/Mistral等模型"
      },
      "fields": {
        "modelPath": {
          "label": "模型路径",
          "options": {
            "llama27b": { "label": "LLaMA 2 7B" },
            "llama213b": { "label": "LLaMA 2 13B" },
            "mistral7b": { "label": "Mistral 7B" }
          }
        },
        "maxModelLen": {
          "label": "最大序列长度",
          "options": {
            "2048": { "label": "2048 tokens" },
            "4096": { "label": "4096 tokens" },
            "8192": { "label": "8192 tokens" }
          }
        }
      }
    }
  }
}
```

### 步骤6: 运行注册脚本 (2分钟)

```bash
cd /opt/my-hpcapp
npx tsx scripts/register-ai-apps.ts
```

预期输出:
```
====================================
注册AI应用到系统
====================================

准备注册 3 个AI应用...

注册结果:
✅ 成功: 3
❌ 失败: 0

====================================
AI应用注册完成!
====================================
```

### 步骤7: 验证注册结果 (3分钟)

```bash
# 1. 检查数据库
psql -U postgres -d your_database -c \
  "SELECT name, version, metadata->>'displayName'
   FROM hpc_applications
   WHERE metadata->>'category' IN ('machine-learning', 'deep-learning', 'development-tools');"

# 2. 通过API验证
curl http://localhost:3000/api/applications | jq '.data[] | select(.metadata.tags | contains(["ai"]))'

# 3. 访问Web界面
# 打开浏览器: http://your-server/dashboard/applications
# 查看"AI工具"板块
```

---

## 🎨 可选: 创建AI应用专属页面

### 创建AI应用中心页面

```bash
mkdir -p /opt/my-hpcapp/app/[locale]/dashboard/applications/ai
```

**app/[locale]/dashboard/applications/ai/page.tsx**:
```typescript
'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Cpu, Brain } from 'lucide-react'

export default function AIApplicationsPage() {
  const [apps, setApps] = useState([])

  useEffect(() => {
    fetch('/api/applications/ai')
      .then(res => res.json())
      .then(data => setApps(data.data.all || []))
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">AI应用中心</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {apps.map(app => (
          <Card key={app.metadata.name}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                {app.metadata.displayName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {app.metadata.description}
              </p>
              <div className="mt-4 flex gap-2">
                {app.metadata.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### 添加API路由

**app/api/applications/ai/route.ts**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { applicationRegistry } from '@/lib/application-registry'

export async function GET(request: NextRequest) {
  try {
    const mlApps = await applicationRegistry.getByCategory('machine-learning')
    const dlApps = await applicationRegistry.getByCategory('deep-learning')
    const devApps = await applicationRegistry.getByCategory('development-tools')

    // 过滤包含AI标签的应用
    const aiApps = [...mlApps, ...dlApps, ...devApps].filter(app =>
      app.metadata.tags.some(tag =>
        ['ai', 'gpu', 'deep-learning', 'machine-learning', 'jupyter'].includes(tag)
      )
    )

    return NextResponse.json({
      success: true,
      data: {
        all: aiApps,
        byCategory: {
          deepLearning: dlApps,
          machineLearning: mlApps,
          interactive: devApps
        },
        count: aiApps.length
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
```

---

## 📊 验证和测试

### 1. 验证应用列表

访问: `http://your-server/dashboard/applications`

应该看到:
- ✅ AI工具板块
- ✅ Jupyter Lab图标 📓
- ✅ PyTorch图标 🔥
- ✅ vLLM图标 ⚡

### 2. 测试作业提交

#### 测试PyTorch

1. 点击PyTorch应用卡片
2. 选择"单GPU训练"
3. 上传简单的训练脚本:
```python
import torch
print(f"PyTorch version: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU count: {torch.cuda.device_count()}")
    print(f"GPU name: {torch.cuda.get_device_name(0)}")
```
4. 提交作业
5. 查看作业输出

#### 测试Jupyter Lab

1. 点击Jupyter Lab应用
2. 选择"标准"配置
3. 启动会话
4. 复制Token并打开Jupyter Lab
5. 创建新notebook测试

### 3. 监控GPU使用

```bash
# 查看GPU作业
squeue -p gpu -o "%.18i %.9P %.8j %.8u %.2t %.10M %.6D %R %b"

# 查看GPU利用率
nvidia-smi

# 查看用户GPU配额
sacctmgr show assoc where user=testuser format=user,account,partition,grptresmins%20
```

---

## 🔧 故障排查

### 问题1: 应用未显示在列表中

**解决方案**:
```bash
# 清除缓存
curl http://localhost:3000/api/applications/clear-cache

# 重新注册
npx tsx scripts/register-ai-apps.ts

# 检查数据库
psql -c "SELECT name, status FROM hpc_applications;"
```

### 问题2: GPU资源不可用

**解决方案**:
```bash
# 检查GPU分区
sinfo -p gpu

# 检查节点GPU配置
scontrol show node gpu-node-01 | grep Gres

# 如果GPU未配置,参考:
# docs/deployment/gpu-configuration.md
```

### 问题3: 作业提交失败

**检查清单**:
- [ ] 用户有GPU分区访问权限
- [ ] GPU资源配额未超限
- [ ] Slurm作业脚本语法正确
- [ ] Python环境路径正确

---

## 📚 下一步

### 立即可做

1. **添加更多AI应用**
   - TensorFlow
   - DeepSpeed
   - RAPIDS

2. **优化UI体验**
   - GPU资源实时显示
   - 模型选择器组件
   - 作业模板保存

3. **增强权限控制**
   - GPU配额管理
   - 应用可见性设置
   - 用户组权限

### 进阶功能

1. **模型库管理**
   - 共享模型仓库
   - 模型版本控制
   - 自动下载和缓存

2. **性能监控**
   - GPU利用率仪表盘
   - 训练进度可视化
   - 资源使用统计

3. **自动化工具**
   - 资源推荐引擎
   - 超参数优化
   - 自动checkpoint恢复

---

## 📞 获取帮助

- 📖 完整文档: `docs/features/applications/AI_APPLICATION_MANAGEMENT.md`
- 🔗 Jupyter集成参考: `docs/JUPYTER_LAB_INTEGRATION.md`
- 💬 问题反馈: GitHub Issues

---

**预计总耗时**: 约1-2小时完成基础集成
**难度级别**: 中等(需要熟悉TypeScript和Slurm)
**维护成本**: 低(基于现有架构,易于扩展)
