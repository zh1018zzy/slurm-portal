# ABAQUS 多节点作业脚本使用说明

## 故障排查指南

### 问题: MPI 进程崩溃 (Segmentation fault)

如果遇到以下错误:
```
*** ABAQUS/pre rank 1 terminated by signal 11 (Segmentation fault)
```

**可能原因:**

1. **算例不支持 MPI 域分解**
   - 某些复杂接触、子模型、子结构等特性不支持 MPI 并行
   - 解决方案: 使用 `threads` 模式而非 `mpi` 模式

2. **内存不足**
   - 预处理阶段需要大量内存
   - 解决方案: 增加 `#SBATCH --mem` 或减少每节点 CPU 数

3. **节点间通信问题**
   - MPI 网络配置不正确
   - 解决方案: 先在单节点测试

## 推荐的调试步骤

### 步骤 1: 单节点 threads 模式测试

修改脚本参数:
```bash
#SBATCH --nodes=1
#SBATCH --cpus-per-task=64
PARALLEL_TYPE="threads"
```

### 步骤 2: 单节点 MPI 模式测试

```bash
#SBATCH --nodes=1
#SBATCH --cpus-per-task=64
PARALLEL_TYPE="mpi"
```

### 步骤 3: 多节点 MPI 模式 (少量CPU)

```bash
#SBATCH --nodes=2
#SBATCH --cpus-per-task=16  # 先用较少的CPU测试
PARALLEL_TYPE="mpi"
```

### 步骤 4: 多节点 MPI 模式 (全部CPU)

```bash
#SBATCH --nodes=2
#SBATCH --cpus-per-task=64
PARALLEL_TYPE="mpi"
```

## 不同并行模式对比

| 模式 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| threads | 单节点 | 稳定,兼容性好 | 只能用单节点资源 |
| mpi (单节点) | 单节点大核数 | 比threads稍快 | 某些算例不支持 |
| mpi (多节点) | 超大规模计算 | 可用多节点资源 | 配置复杂,易出错 |

## 常见错误解决

### 错误 1: "cpus exceeds cpus available"
- 原因: CPU数量设置超过节点实际核心数
- 解决: 检查 `#SBATCH --cpus-per-task` 是否正确

### 错误 2: "scratch directory is not valid"
- 原因: 共享存储路径不存在
- 解决: 设置正确的共享目录 `export SHARED_STORAGE=/your/shared/path`

### 错误 3: MPI rank terminated by signal 11
- 原因: 算例与MPI不兼容或内存不足
- 解决: 改用 threads 模式或增加内存

## 最佳实践

1. **首选 threads 模式**: 对于大多数算例,单节点 threads 模式最稳定
2. **逐步扩展**: 从小规模开始测试,确认可行后再扩展
3. **检查算例**: 查看 ABAQUS 文档确认算例特性是否支持 MPI
4. **监控资源**: 使用 `squeue` 和 `top` 监控作业运行状态
5. **保留日志**: 保存 `.msg`, `.sta` 文件用于问题排查

## 性能建议

对于您当前的 2 节点 × 64 核配置:

**推荐配置 (稳定性优先):**
```bash
#SBATCH --nodes=1
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=64
PARALLEL_TYPE="threads"
```

**高性能配置 (如果算例支持):**
```bash
#SBATCH --nodes=2
#SBATCH --ntasks-per-node=1
#SBATCH --cpus-per-task=64
PARALLEL_TYPE="mpi"
```
