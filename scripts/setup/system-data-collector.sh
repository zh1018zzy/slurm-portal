#!/bin/bash

# HPC系统数据收集脚本
# 用于大屏展示的实时数据收集

set -e

# 输出目录
OUTPUT_DIR="/tmp/hpc-dashboard"
mkdir -p $OUTPUT_DIR

# 时间戳
TIMESTAMP=$(date +%s)

echo "开始收集系统数据..."

# 1. 系统基本信息
echo "收集系统基本信息..."
{
    echo "=== 系统基本信息 ==="
    echo "时间戳: $TIMESTAMP"
    echo "主机名: $(hostname)"
    echo "系统版本: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "内核版本: $(uname -r)"
    echo "CPU架构: $(uname -m)"
} > $OUTPUT_DIR/system-info.txt

# 2. CPU信息
echo "收集CPU信息..."
{
    echo "=== CPU信息 ==="
    echo "CPU核心数: $(nproc)"
    echo "CPU型号: $(grep 'model name' /proc/cpuinfo | head -1 | cut -d':' -f2 | xargs)"
    echo "CPU使用率: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)"
} > $OUTPUT_DIR/cpu-info.txt

# 3. 内存信息
echo "收集内存信息..."
{
    echo "=== 内存信息 ==="
    free -h | grep -E "(Mem|Swap)"
    echo "内存使用率: $(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')%"
} > $OUTPUT_DIR/memory-info.txt

# 4. 存储信息
echo "收集存储信息..."
{
    echo "=== 存储信息 ==="
    df -h | grep -E "(/$|/home|/data|/shared)" || df -h | head -5
} > $OUTPUT_DIR/storage-info.txt

# 5. Slurm集群信息
echo "收集Slurm集群信息..."
{
    echo "=== Slurm集群信息 ==="
    if command -v sinfo &> /dev/null; then
        echo "节点总数: $(sinfo -h -o "%D" | wc -l)"
        echo "节点状态:"
        sinfo -h -o "%T" | sort | uniq -c
        echo "分区信息:"
        sinfo -h -o "%P %D %T %C %m %G" | head -10
    else
        echo "Slurm未安装或不可用"
    fi
} > $OUTPUT_DIR/slurm-info.txt

# 6. 作业信息
echo "收集作业信息..."
{
    echo "=== 作业信息 ==="
    if command -v squeue &> /dev/null; then
        echo "运行中作业数: $(squeue -h -t running 2>/dev/null | wc -l || echo 0)"
        echo "排队中作业数: $(squeue -h -t pending 2>/dev/null | wc -l || echo 0)"
        echo "最近作业:"
        squeue -h -o "%.10i %.9P %.20j %.8u %.2t %.10M %.6D %R" 2>/dev/null | head -5 || echo "无作业信息"
    else
        echo "Slurm未安装或不可用"
    fi
} > $OUTPUT_DIR/jobs-info.txt

# 7. GPU信息
echo "收集GPU信息..."
{
    echo "=== GPU信息 ==="
    if command -v nvidia-smi &> /dev/null; then
        nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu --format=csv,noheader 2>/dev/null || echo "GPU不可用"
        echo "GPU使用率: $(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | awk '{sum+=$1} END {print sum/NR}' || echo 0)"
    else
        echo "NVIDIA驱动未安装"
    fi
} > $OUTPUT_DIR/gpu-info.txt

# 8. 网络信息
echo "收集网络信息..."
{
    echo "=== 网络信息 ==="
    echo "网络接口:"
    ip addr show | grep -E "inet.*global" | head -5
    echo "网络连接数: $(ss -tuln | wc -l)"
} > $OUTPUT_DIR/network-info.txt

# 9. 用户信息
echo "收集用户信息..."
{
    echo "=== 用户信息 ==="
    echo "当前登录用户数: $(who | wc -l)"
    echo "系统用户数: $(cat /etc/passwd | wc -l)"
    echo "最近登录用户:"
    last | head -5
} > $OUTPUT_DIR/user-info.txt

# 10. 生成JSON格式的汇总数据
echo "生成JSON汇总数据..."
{
    echo "{"
    echo "  \"timestamp\": $TIMESTAMP,"
    echo "  \"system\": {"
    echo "    \"hostname\": \"$(hostname)\","
    echo "    \"cpu_cores\": $(nproc),"
    echo "    \"cpu_usage\": $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1 || echo 0),"
    echo "    \"memory_usage\": $(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}'),"
    echo "    \"storage_usage\": $(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)"
    echo "  },"
    echo "  \"slurm\": {"
    echo "    \"total_nodes\": $(sinfo -h -o "%D" | wc -l 2>/dev/null || echo 0),"
    echo "    \"running_jobs\": $(squeue -h -t running 2>/dev/null | wc -l || echo 0),"
    echo "    \"pending_jobs\": $(squeue -h -t pending 2>/dev/null | wc -l || echo 0)"
    echo "  },"
    echo "  \"gpu\": {"
    echo "    \"available\": $(command -v nvidia-smi &> /dev/null && echo true || echo false),"
    echo "    \"usage\": $(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits 2>/dev/null | awk '{sum+=$1} END {print sum/NR}' || echo 0)"
    echo "  },"
    echo "  \"users\": {"
    echo "    \"logged_in\": $(who | wc -l),"
    echo "    \"total_users\": $(cat /etc/passwd | wc -l)"
    echo "  }"
    echo "}"
} > $OUTPUT_DIR/system-data.json

echo "数据收集完成！输出目录: $OUTPUT_DIR"
echo "JSON数据文件: $OUTPUT_DIR/system-data.json"

# 显示收集到的数据摘要
echo ""
echo "=== 数据收集摘要 ==="
echo "CPU核心数: $(nproc)"
echo "CPU使用率: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1 || echo 0)%"
echo "内存使用率: $(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')%"
echo "存储使用率: $(df / | tail -1 | awk '{print $5}' | cut -d'%' -f1)%"
echo "Slurm节点数: $(sinfo -h -o "%D" | wc -l 2>/dev/null || echo 0)"
echo "运行中作业: $(squeue -h -t running 2>/dev/null | wc -l || echo 0)"
echo "排队中作业: $(squeue -h -t pending 2>/dev/null | wc -l || echo 0)"
echo "登录用户数: $(who | wc -l)" 