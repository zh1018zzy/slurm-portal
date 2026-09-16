# Jupyter 无GPU环境测试指南

> 适用范围：功能模块长期知识（WebShell、VNC、应用中心等）
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

**更新日期**: 2025-10-27
**状态**: ✅ 已配置，可测试

---

## 📋 配置变更

### Jupyter应用GPU设置

**GPU要求**: ❌ **不需要GPU**

```typescript
// lib/applications/ai/jupyter.ts
requirements: {
  hardware: {
    gpu: {
      required: false,      // ✅ GPU不是必需的
      count: { min: 0, max: 4, default: 0 }  // ✅ 默认0个GPU
    }
  }
}
```

### 分区配置更新

**原配置** (不适用于当前环境):
- `partition: 'interactive'` ❌ 环境中不存在
- `partition: 'gpu'` ❌ 环境中不存在
- `partition: 'highmem'` ❌ 环境中不存在

**新配置** (适配当前环境):
- `partition: 'compute'` ✅ 使用实际存在的分区

**当前可用分区** (通过`sinfo`查询):
```
PARTITION AVAIL TIMELIMIT NODES NODELIST
compute*  up    infinite  1     login-node
graphics  up    infinite  1     compute-node-01
```

---

## 🎯 可用资源配置

### 1. 轻量级配置 (light)
```yaml
分区: compute
CPU核心: 2
内存: 8GB
时间限制: 4小时
GPU: 无
推荐用途: 数据探索、简单脚本测试
```

### 2. 标准配置 (default) ⭐ 推荐
```yaml
分区: compute
CPU核心: 4
内存: 16GB
时间限制: 8小时
GPU: 无
推荐用途: 一般数据分析、机器学习（CPU版本）
```

### 3. 标准增强配置 (standard)
```yaml
分区: compute
CPU核心: 8
内存: 32GB
时间限制: 12小时
GPU: 无
推荐用途: 中等规模数据处理和计算
```

### 4. 大内存配置 (high-memory)
```yaml
分区: compute
CPU核心: 16
内存: 64GB
时间限制: 24小时
GPU: 无
推荐用途: 大规模数据处理
```

---

## 🧪 测试步骤

### 步骤1: 访问应用中心
```
浏览器访问: http://your-server:3000/dashboard/applications
```

### 步骤2: 找到Jupyter应用
```
在 "AI工具" 板块中找到:
📓 Jupyter Lab
```

### 步骤3: 点击启动应用
```
1. 点击 "启动应用" 按钮
2. 应用表单会自动打开
```

### 步骤4: 配置作业参数
```
作业名称: jupyter-test
资源配置: 标准配置 (default)
启用GPU: ❌ 关闭 (默认关闭)
运行时间: 8:00:00
工作目录: $HOME
```

### 步骤5: 提交作业
```
点击 "提交作业" 按钮
```

### 步骤6: 验证作业提交
```bash
# 检查作业队列
squeue -u $(whoami)

# 预期输出:
JOBID PARTITION     NAME     USER ST       TIME  NODES NODELIST
  123   compute jupyter-t demo_user  R       0:05      1 login-node
```

### 步骤7: 检查作业日志
```bash
# 查看输出日志
cat ~/.jupyter/logs/jupyter_<JOBID>.out

# 预期看到:
=== Jupyter Lab 连接信息 ===
作业ID: <JOBID>
节点: login-node
访问URL: http://<NODE_IP>:<PORT>/?token=<TOKEN>
Token: <RANDOM_TOKEN>
启动时间: 2025-10-27 12:30:00
```

### 步骤8: 访问Jupyter Lab
```
1. 从日志中复制访问URL
2. 在浏览器中打开
3. 使用token登录
```

---

## 🔧 Slurm作业脚本示例

生成的Slurm脚本会类似于:

```bash
#!/bin/bash
#SBATCH --job-name=jupyter-test
#SBATCH --partition=compute
#SBATCH --nodes=1
#SBATCH --ntasks=1
#SBATCH --cpus-per-task=4
#SBATCH --mem=16GB
#SBATCH --time=8:00:00
#SBATCH --output=$HOME/.jupyter/logs/jupyter_%j.out
#SBATCH --error=$HOME/.jupyter/logs/jupyter_%j.err

# 注意: 没有 #SBATCH --gres=gpu 这一行，因为不需要GPU

# 加载必要模块
module purge
module load python/3.11 nodejs/18

# 激活Jupyter环境
source /opt/software/jupyter-env/bin/activate

# ... 其余Jupyter启动脚本
```

**关键点**: ✅ 没有`--gres=gpu`参数

---

## ⚠️ 常见问题

### Q1: 提交时提示"GPU资源不足"
**A**: 检查以下设置:
1. "启用GPU" 选项应该是**关闭**状态
2. 资源配置选择非GPU配置（light/default/standard/high-memory）
3. 不要选择已删除的"GPU配置"

### Q2: 作业一直处于PENDING状态
**A**: 检查分区配置:
```bash
# 查看分区状态
sinfo -p compute

# 查看节点资源
sinfo -N -l
```

### Q3: 找不到Jupyter环境
**A**: 需要先安装Jupyter环境:
```bash
# 创建虚拟环境
python3.11 -m venv /opt/software/jupyter-env

# 激活环境
source /opt/software/jupyter-env/bin/activate

# 安装JupyterLab
pip install jupyterlab==4.0.0 ipykernel numpy pandas matplotlib scikit-learn

# 安装CPU版本的PyTorch (如果需要)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
```

### Q4: 无法访问Jupyter URL
**A**: 检查网络和防火墙:
```bash
# 检查端口是否开放
netstat -tuln | grep <PORT>

# 从登录节点测试连接
curl http://<NODE_IP>:<PORT>

# 检查作业是否还在运行
squeue -j <JOBID>
```

---

## 📊 性能预期

### CPU模式性能
**适用场景**:
- ✅ 数据探索和可视化
- ✅ 小规模机器学习 (scikit-learn)
- ✅ 数据预处理和清洗
- ✅ 统计分析
- ⚠️ 深度学习训练 (速度较慢)
- ❌ 大规模神经网络训练 (不推荐)

### 推荐的CPU模式库
```python
# 数据处理
import pandas as pd
import numpy as np

# 可视化
import matplotlib.pyplot as plt
import seaborn as sns

# 机器学习 (CPU优化)
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression

# 深度学习 (CPU版本)
import torch  # CPU版本
# 注意: 训练速度会比GPU慢10-100倍
```

---

## 🎯 测试清单

完成以下检查，确保Jupyter可以在无GPU环境中正常运行:

- [ ] ✅ 应用中心显示Jupyter应用
- [ ] ✅ 点击"启动应用"打开表单
- [ ] ✅ 资源配置选项中有4个非GPU选项
- [ ] ✅ "启用GPU"开关默认关闭
- [ ] ✅ 默认分区为"compute"
- [ ] ✅ 提交作业成功
- [ ] ✅ 作业进入运行状态 (squeue显示R状态)
- [ ] ✅ 日志文件正确生成
- [ ] ✅ 日志中显示访问URL和token
- [ ] ✅ 可以通过浏览器访问Jupyter Lab
- [ ] ✅ 可以创建和运行notebook
- [ ] ✅ Python kernel正常工作
- [ ] ✅ 可以导入常用库 (numpy, pandas, matplotlib)

---

## 📝 验证命令

### 验证应用配置
```bash
# 检查Jupyter应用是否注册
curl -s http://localhost:3000/api/applications | jq '.data[] | select(.metadata.name == "jupyter") | {name: .metadata.name, gpu_required: .requirements.hardware.gpu.required, default_partition: .resources.default.partition}'

# 预期输出:
{
  "name": "jupyter",
  "gpu_required": false,
  "default_partition": "compute"
}
```

### 验证分区可用性
```bash
# 检查compute分区
sinfo -p compute -o "%P %a %l %D %N"

# 预期输出:
PARTITION AVAIL TIMELIMIT NODES NODELIST
compute*  up    infinite  1     login-node
```

### 验证环境安装
```bash
# 检查Jupyter环境
ls -la /opt/software/jupyter-env/

# 测试激活环境
source /opt/software/jupyter-env/bin/activate
jupyter --version
python -c "import torch; print(f'PyTorch: {torch.__version__}, CUDA: {torch.cuda.is_available()}')"
deactivate
```

---

## 🚀 下一步操作

### 1. 强制刷新浏览器
```
Ctrl + Shift + R (Windows/Linux)
Cmd + Shift + R (Mac)
```

### 2. 访问应用中心
```
http://your-server:3000/dashboard/applications
```

### 3. 测试Jupyter启动
按照上述测试步骤完成一次完整的Jupyter启动流程

### 4. 验证结果
确认可以正常访问Jupyter Lab界面并执行Python代码

---

## ✅ 配置总结

**修改的文件**:
1. `lib/applications/ai/jupyter.ts`
   - 分区: `interactive` → `compute`
   - 资源配置: 移除`gpu` profile，添加`standard` profile
   - 模板变量: 默认分区改为`compute`

2. `messages/zh.json`
   - 添加`standard`配置的中文翻译
   - 移除`gpu`配置的翻译

**验证状态**:
- ✅ 应用重新注册成功
- ✅ 服务重启完成
- ✅ 配置适配当前环境

**GPU要求**: ❌ **不需要GPU，可直接测试**

---

**创建时间**: 2025-10-27
**最后更新**: 2025-10-27 12:30
**测试状态**: ⏳ 待用户测试

🎉 **Jupyter已配置为CPU-only模式，可以在无GPU环境中测试!**
