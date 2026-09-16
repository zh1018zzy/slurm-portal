#!/bin/bash
#SBATCH --job-name=abaqus_multinode
#SBATCH --nodes=2                    # 使用4个计算节点
#SBATCH --ntasks-per-node=1          # 每个节点1个任务
#SBATCH --cpus-per-task=64           # 每个任务64个CPU核心
#SBATCH --partition=x86_64          # 计算分区
#SBATCH --output=abaqus_%j.out       # 标准输出文件
#SBATCH --error=abaqus_%j.err        # 标准错误文件

# ==================== 环境变量设置 ====================
# 共享存储路径 - 根据实际集群环境修改
SHARED_STORAGE="${SHARED_STORAGE:-$SLURM_SUBMIT_DIR}"

# 使用共享存储用于多节点作业
export ABAQUS_SCRATCH_DIR=$SHARED_STORAGE/abaqus_scratch_$SLURM_JOB_ID
export ABAQUS_WORK_DIR=$SLURM_SUBMIT_DIR/abaqus_work_$SLURM_JOB_ID
export ABAQUS_TMPDIR=$ABAQUS_SCRATCH_DIR

# 创建必要的工作目录
mkdir -p $ABAQUS_TMPDIR $ABAQUS_SCRATCH_DIR $ABAQUS_WORK_DIR

# ==================== 加载模块 ====================
#source /share/opt/intel/oneapi/setvars.sh

# ==================== ABAQUS环境变量 ====================
export ABAQUS_SCRATCH=$ABAQUS_SCRATCH_DIR
export ABAQUS_WORK=$ABAQUS_WORK_DIR
export ABAQUS_TMP=$ABAQUS_TMPDIR
export ABAQUS_HOME=/share/usr/SIMULIA
export PATH=$ABAQUS_HOME/Commands:$PATH

export I_MPI_FABRICS=shm:ofi
export I_MPI_PIN=1
export I_MPI_FALLBACK=0

#export MPI_REMSH=srun

# 显示作业信息
echo "=================================================="
echo "作业ID: $SLURM_JOB_ID"
echo "节点数: $SLURM_JOB_NUM_NODES"
echo "总CPU核心数: $((SLURM_JOB_NUM_NODES * SLURM_CPUS_PER_TASK))"
echo "节点列表: $SLURM_JOB_NODELIST"
echo "工作目录: $ABAQUS_WORK_DIR"
echo "Scratch目录: $ABAQUS_SCRATCH_DIR (共享存储)"
echo "=================================================="

# ==================== 作业参数设置 ====================
INPUT_FILE="sin15Hz_z_fullload.inp"          # 输入文件名
JOB_NAME="abaqus_job"                # 作业名称
SOLVER_TYPE="standard"               # 求解器类型: standard/explicit
PARALLEL_TYPE="mpi"                  # 并行类型: mpi/threads/hybrid

# 计算总CPU数 - 使用实际分配的CPU数量
# SLURM_NTASKS = 节点数 × 每节点任务数
# SLURM_CPUS_PER_TASK = 每个任务的CPU核心数
if [ -n "$SLURM_NTASKS" ] && [ -n "$SLURM_CPUS_PER_TASK" ]; then
    TOTAL_CPUS=$((SLURM_NTASKS * SLURM_CPUS_PER_TASK))
elif [ -n "$SLURM_JOB_CPUS_PER_NODE" ] && [ -n "$SLURM_JOB_NUM_NODES" ]; then
    TOTAL_CPUS=$((SLURM_JOB_CPUS_PER_NODE * SLURM_JOB_NUM_NODES))
else
    # 回退到默认计算方式
    TOTAL_CPUS=$((SLURM_JOB_NUM_NODES * SLURM_CPUS_PER_TASK))
fi

echo "检测到的CPU资源:"
echo "  SLURM_NTASKS=$SLURM_NTASKS"
echo "  SLURM_CPUS_PER_TASK=$SLURM_CPUS_PER_TASK"
echo "  SLURM_JOB_CPUS_PER_NODE=$SLURM_JOB_CPUS_PER_NODE"
echo "  SLURM_CPUS_ON_NODE=$SLURM_CPUS_ON_NODE"
echo "计算出的总CPU数: $TOTAL_CPUS"

# ABAQUS MPI模式的特殊要求:
# 对于多节点MPI作业,ABAQUS需要知道每个节点的核心数
if [ "$PARALLEL_TYPE" = "mpi" ] && [ $SLURM_JOB_NUM_NODES -gt 1 ]; then
    # 多节点MPI模式:使用每节点的CPU数
    CPUS_PER_NODE=$SLURM_CPUS_PER_TASK
    echo "多节点MPI模式:每节点使用 $CPUS_PER_NODE 个CPU核心,共 $SLURM_JOB_NUM_NODES 个节点"
    USE_MPI_HOSTFILE=true

    # 生成节点列表文件供ABAQUS使用
    # 使用InfiniBand网络主机名以确保MPI通信使用高速IB网络
    USE_IB_HOSTNAME=${USE_IB_HOSTNAME:-false}  # 默认使用IB主机名
    IB_SUFFIX=${IB_SUFFIX:--ib}  # IB主机名后缀

    if [ "$USE_IB_HOSTNAME" = "true" ]; then
        echo "使用InfiniBand网络主机名 (后缀: $IB_SUFFIX)"
        scontrol show hostname $SLURM_JOB_NODELIST | while read node; do
            echo "${node}${IB_SUFFIX}"
        done > $ABAQUS_WORK_DIR/hostfile
    else
        scontrol show hostname $SLURM_JOB_NODELIST > $ABAQUS_WORK_DIR/hostfile
    fi

    echo "节点列表:"
    cat $ABAQUS_WORK_DIR/hostfile

    # 创建ABAQUS环境文件,明确指定每个节点及其CPU数
    rm -f $ABAQUS_WORK_DIR/abaqus_v6.env

    echo "使用 ABAQUS 自带的 Platform MPI (PMPI)"

    # 使用 ABAQUS 自带的 Platform MPI (PMPI)
    cat > $ABAQUS_WORK_DIR/abaqus_v6.env <<'EOF_HEADER'
# -*- coding: utf-8 -*-
# ABAQUS Environment File for Multi-node MPI Jobs
# 使用 ABAQUS 自带的 Platform MPI (PMPI)

import os

# 调试级别
verbose=3

# 使用 Platform MPI (PMPI) - ABAQUS 2021 自带
mp_mpi_implementation=PMPI

# 关键修复:使用 Slurm srun 进行节点间通信,而不是 SSH
# 这避免了 SSH 认证问题和权限问题
import driverUtils
mp_rsh_command = 'srun -N1 -n1 -w %H %C'
mp_rcp_command = None  # 使用默认的 scp

# 域分解内存优化 - 使用90%的可用内存
memory="90%"

EOF_HEADER

    # 构建并追加mp_host_list数组
    echo -n "mp_host_list=[" >> $ABAQUS_WORK_DIR/abaqus_v6.env
    FIRST=true
    while read node; do
        if [ "$FIRST" = true ]; then
            echo -n "['$node', $CPUS_PER_NODE]" >> $ABAQUS_WORK_DIR/abaqus_v6.env
            FIRST=false
        else
            echo -n ", ['$node', $CPUS_PER_NODE]" >> $ABAQUS_WORK_DIR/abaqus_v6.env
        fi
    done < $ABAQUS_WORK_DIR/hostfile
    echo "]" >> $ABAQUS_WORK_DIR/abaqus_v6.env

    echo "ABAQUS环境文件: $ABAQUS_WORK_DIR/abaqus_v6.env"
    cat $ABAQUS_WORK_DIR/abaqus_v6.env

    # 设置环境变量
    export ABA_ENVIRONMENT_FILE=$ABAQUS_WORK_DIR/abaqus_v6.env
else
    # 单节点或threads模式:使用总CPU数
    CPUS_PER_NODE=$TOTAL_CPUS
    USE_MPI_HOSTFILE=false
fi

# ==================== 复制输入文件 ====================
cp $INPUT_FILE $ABAQUS_WORK_DIR/
cd $ABAQUS_WORK_DIR

# 获取不含扩展名的文件名
#INPUT_BASENAME=$(basename $INPUT_FILE .inp)

# ==================== 构建ABAQUS命令 ====================
ABAQUS_CMD="abaqus job=$JOB_NAME input=$INPUT_FILE"

# 添加并行参数
if [ "$PARALLEL_TYPE" = "mpi" ]; then
    if [ "$USE_MPI_HOSTFILE" = true ]; then
        # 多节点MPI模式:使用总CPU数,节点分配由环境文件控制
        ABAQUS_CMD="$ABAQUS_CMD cpus=$TOTAL_CPUS mp_mode=mpi"
    else
        # 单节点MPI模式
        ABAQUS_CMD="$ABAQUS_CMD cpus=$CPUS_PER_NODE mp_mode=mpi"
    fi
elif [ "$PARALLEL_TYPE" = "threads" ]; then
    ABAQUS_CMD="$ABAQUS_CMD cpus=$CPUS_PER_NODE mp_mode=threads"
elif [ "$PARALLEL_TYPE" = "hybrid" ]; then
    ABAQUS_CMD="$ABAQUS_CMD cpus=$CPUS_PER_NODE mp_mode=hybrid"
fi

# 添加求解器类型
if [ "$SOLVER_TYPE" = "explicit" ]; then
    ABAQUS_CMD="$ABAQUS_CMD explicit"
fi

# 添加其他参数 - 使用绝对路径确保scratch目录正确
ABAQUS_CMD="$ABAQUS_CMD scratch=\"$ABAQUS_SCRATCH_DIR\""
ABAQUS_CMD="$ABAQUS_CMD interactive"  # 交互模式,等待作业完成

# 对于多节点MPI作业,添加域分解参数以提高稳定性
if [ "$USE_MPI_HOSTFILE" = true ]; then
    # 关键修复:不使用 -preDecomp,而是添加 domains 参数
    # 显式指定域数等于节点数
    ABAQUS_CMD="$ABAQUS_CMD standard_parallel=all "

    # 添加内存参数,根据节点实际内存调整
    # 每个节点分配的内存,不要超过实际物理内存
    # 假设每节点有256GB内存,使用80% = 200GB
    MEMORY_PER_NODE=200  # GB
    TOTAL_MEMORY=$((SLURM_JOB_NUM_NODES * MEMORY_PER_NODE))
    ABAQUS_CMD="$ABAQUS_CMD memory=${TOTAL_MEMORY}gb"
fi

# ==================== 运行ABAQUS ====================
echo "开始运行ABAQUS分析..."
echo "命令: $ABAQUS_CMD"
echo "Scratch目录(验证): $ABAQUS_SCRATCH_DIR"
if [ "$USE_MPI_HOSTFILE" = true ]; then
    echo "使用 $SLURM_JOB_NUM_NODES 个节点进行MPI并行计算"
    echo "总CPU数: $TOTAL_CPUS (每节点 $CPUS_PER_NODE 个CPU)"
    echo "环境文件: $ABA_ENVIRONMENT_FILE"
fi
echo "=================================================="

# 使用 eval 执行命令以正确处理引号
eval $ABAQUS_CMD

# ==================== 检查运行状态 ====================
if [ -f "${JOB_NAME}.sta" ]; then
    echo ""
    echo "=================================================="
    echo "ABAQUS作业状态文件 (.sta) 最后20行:"
    echo "=================================================="
    tail -20 "${JOB_NAME}.sta"
fi

if [ -f "${JOB_NAME}.msg" ]; then
    echo ""
    echo "=================================================="
    echo "ABAQUS消息文件 (.msg) 最后30行:"
    echo "=================================================="
    tail -30 "${JOB_NAME}.msg"
fi

# ==================== 复制结果文件 ====================
echo ""
echo "=================================================="
echo "复制结果文件到提交目录..."
echo "=================================================="

for ext in odb dat msg sta prt log com; do
    if [ -f "${JOB_NAME}.$ext" ]; then
        cp "${JOB_NAME}.$ext" $SLURM_SUBMIT_DIR/
        echo "已复制: ${JOB_NAME}.$ext"
    fi
done

# ==================== 清理临时文件 ====================
echo ""
echo "清理临时文件..."
cd $SLURM_SUBMIT_DIR
rm -rf $ABAQUS_SCRATCH_DIR

# 可选：保留工作目录用于调试
# rm -rf $ABAQUS_WORK_DIR

echo ""
echo "=================================================="
echo "ABAQUS 多节点作业完成!"
echo "作业ID: $SLURM_JOB_ID"
echo "结束时间: $(date)"
echo "=================================================="