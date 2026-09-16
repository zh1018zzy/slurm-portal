# 集群峰值算力设置指南

> 适用范围：性能优化、容量规划与调优实践
> 主入口链接：`docs/README.md`
> 文档状态：`active`
> 最后验证日期：`2026-03-27`

## 概述

集群峰值算力是HPC系统的重要指标，需要根据实际的硬件配置来计算。本系统提供了多种设置方案来适应不同的部署环境。

## 设置方案

### 方案1：配置文件方案（推荐）

#### 1.1 编辑配置文件
编辑 `config/cluster-performance.json` 文件：

```json
{
  "cluster": {
    "name": "HPC-Cluster",
    "description": "高性能计算集群",
    "peakComputePower": "500万亿次",
    "autoCalculate": true,
    "fallbackValues": {
      "cpuPerCore": 25,
      "gpuPerCard": 50
    }
  },
  "nodes": {
    "compute": {
      "count": 47,
      "cpuCores": 3400,
      "gpuCards": 36,
      "memoryGB": 17408,
      "storageTB": 1126
    }
  }
}
```

#### 1.2 配置说明

**autoCalculate**: 
- `true`: 自动从Slurm获取集群信息并计算
- `false`: 使用固定的 `peakComputePower` 值

**fallbackValues**:
- `cpuPerCore`: 每CPU核心的算力（GFLOPS）
- `gpuPerCard`: 每GPU卡的算力（TFLOPS）

#### 1.3 常见硬件算力参考

**CPU算力（GFLOPS/核心）**:
- Intel Xeon Gold 6248: 44.8
- Intel Xeon Platinum 8280: 56.0
- AMD EPYC 7763: 112.0
- 现代CPU（估算）: 20-60

**GPU算力（TFLOPS/卡）**:
- Tesla V100: 112.0
- Tesla A100: 312.0
- Tesla H100: 989.0
- RTX 4090: 83.0
- 现代GPU（估算）: 10-1000

### 方案2：环境变量方案

在 `.env` 文件中设置：

```bash
# 集群峰值算力
PEAK_COMPUTE_POWER="500万亿次"

# 或分别设置
CLUSTER_CPU_CORES=3400
CLUSTER_GPU_CARDS=36
CPU_PER_CORE_GFLOPS=25
GPU_PER_CARD_TFLOPS=50
```

### 方案3：手动计算方案

#### 3.1 计算步骤

1. **统计集群资源**:
   ```bash
   # 获取CPU核心总数
   sinfo -h -o "%C" | awk -F'/' '{sum+=$4} END {print sum}'
   
   # 获取GPU卡总数
   sinfo -h -o "%G" | awk -F'/' '{sum+=$4} END {print sum}'
   ```

2. **计算峰值算力**:
   ```
   CPU算力 = CPU核心数 × 单核算力
   GPU算力 = GPU卡数 × 单卡算力
   总峰值算力 = CPU算力 + GPU算力
   ```

3. **格式化显示**:
   - < 1000 GFLOPS: "X十亿次"
   - 1000-1000000 GFLOPS: "X万亿次"
   - > 1000000 GFLOPS: "X万亿次"

#### 3.2 示例计算

假设集群配置：
- 47个计算节点
- 每节点20核CPU（Xeon Gold 6248）
- 每节点2张GPU（Tesla V100）

计算：
```
CPU核心总数 = 47 × 20 = 940核
CPU算力 = 940 × 44.8 = 42,112 GFLOPS

GPU卡总数 = 47 × 2 = 94张
GPU算力 = 94 × 112 = 10,528 TFLOPS = 10,528,000 GFLOPS

总峰值算力 = 42,112 + 10,528,000 = 10,570,112 GFLOPS
格式化显示 = "1057.0万亿次"
```

## 部署建议

### 小型集群（< 10节点）
- 使用配置文件方案
- 手动设置准确的硬件参数
- 定期更新配置文件

### 中型集群（10-100节点）
- 使用自动计算模式
- 配置SSH免密登录以获取节点信息
- 建立硬件信息数据库

### 大型集群（> 100节点）
- 使用配置文件 + 自动计算混合模式
- 实现硬件信息缓存机制
- 考虑使用数据库存储节点信息

## 故障排除

### 常见问题

1. **Slurm命令失败**
   - 检查Slurm服务状态
   - 确认用户权限
   - 使用配置文件作为备选方案

2. **SSH连接失败**
   - 配置SSH免密登录
   - 检查防火墙设置
   - 使用配置文件中的固定值

3. **算力计算不准确**
   - 更新硬件性能数据库
   - 使用实际基准测试结果
   - 咨询硬件厂商获取准确数据

### 调试命令

```bash
# 检查Slurm状态
sinfo -h -o "%N %C %G %m %t"

# 检查节点硬件
ssh <node-name> 'lscpu | grep "Model name"'
ssh <node-name> 'nvidia-smi --query-gpu=name --format=csv,noheader'

# 测试API
curl -s http://localhost:3000/api/big-screen | jq '.data.hardwareResources.peakComputePower'
```

## 更新和维护

1. **定期更新硬件数据库**
2. **监控算力计算准确性**
3. **根据实际使用情况调整参数**
4. **备份配置文件**

## 相关文件

- `config/cluster-performance.json`: 集群性能配置
- `scripts/calculate-peak-performance.js`: 单节点算力计算
- `scripts/calculate-cluster-performance.js`: 集群算力计算
- `app/api/big-screen/route.ts`: 大屏API实现 
