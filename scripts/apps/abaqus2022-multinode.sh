#!/bin/bash
#SBATCH --job-name=abaqus_multinode
#SBATCH --nodes=4                    # 使用4个计算节点
#SBATCH --ntasks-per-node=1          # 每个节点1个任务
#SBATCH --cpus-per-task=32           # 每个任务32个CPU核心
#SBATCH --mem=128G                   # 每个节点128GB内存
#SBATCH --time=48:00:00              # 最大运行时间48小时
#SBATCH --partition=compute          # 计算分区
#SBATCH --output=abaqus_%j.out       # 标准输出文件
#SBATCH --error=abaqus_%j.err        # 标准错误文件

# ==================== 环境变量设置 ====================
# 共享存储路径 - 使用提交目录的子目录作为共享scratch
# 这确保所有节点都能访问相同的路径
SHARED_STORAGE="${SHARED_STORAGE:-$SLURM_SUBMIT_DIR}"

# 使用提交目录下的scratch子目录用于多节点作业
export ABAQUS_SCRATCH_DIR=$SHARED_STORAGE/abaqus_scratch_$SLURM_JOB_ID
export ABAQUS_WORK_DIR=$SLURM_SUBMIT_DIR/abaqus_work_$SLURM_JOB_ID
export ABAQUS_TMPDIR=$ABAQUS_SCRATCH_DIR/tmp

# 创建必要的工作目录
mkdir -p $ABAQUS_TMPDIR $ABAQUS_SCRATCH_DIR $ABAQUS_WORK_DIR

echo "使用Scratch目录: $ABAQUS_SCRATCH_DIR"
echo "提交目录: $SLURM_SUBMIT_DIR"

# ==================== 加载模块 ====================
module purge
module load abaqus/2022
# 加载与ABAQUS兼容的MPI - 注意顺序很重要
module load intel/2020
module load mpi/openmpi

# 显示加载的模块
echo "已加载的模块:"
module list 2>&1 | grep -E "(abaqus|intel|mpi)"

# ==================== ABAQUS环境变量 ====================
export ABAQUS_SCRATCH=$ABAQUS_SCRATCH_DIR
export ABAQUS_WORK=$ABAQUS_WORK_DIR
export ABAQUS_TMP=$ABAQUS_TMPDIR

# Intel MPI 环境变量 - 用于多节点 InfiniBand 通信
export I_MPI_FABRICS=shm:ofi
export I_MPI_PIN=1
export I_MPI_FALLBACK=0

# 重要：设置 MPI_REMSH 为 srun wrapper，确保使用 Slurm 进行节点间通信
export MPI_REMSH=$ABAQUS_WORK_DIR/srun_wrapper.sh

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
# 用户需要修改的参数
INPUT_FILE="${INPUT_FILE:-your_model.inp}"  # 输入文件名（可通过环境变量设置）
JOB_NAME="${JOB_NAME:-abaqus_job}"          # 作业名称
SOLVER_TYPE="${SOLVER_TYPE:-standard}"      # 求解器类型: standard/explicit
PARALLEL_TYPE="mpi"                         # 并行类型: mpi/threads/hybrid

# 检查输入文件是否存在
if [ ! -f "$SLURM_SUBMIT_DIR/$INPUT_FILE" ]; then
    echo "=================================================="
    echo "错误：输入文件不存在: $SLURM_SUBMIT_DIR/$INPUT_FILE"
    echo "=================================================="
    echo "请设置 INPUT_FILE 环境变量或修改脚本中的 INPUT_FILE 参数"
    echo "示例："
    echo "  export INPUT_FILE=your_model.inp"
    echo "  sbatch $0"
    echo "=================================================="
    exit 1
fi

echo "输入文件: $INPUT_FILE"
echo "作业名称: $JOB_NAME"

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
    USE_IB_HOSTNAME=${USE_IB_HOSTNAME:-false}  # 默认不使用IB主机名，避免IP解析问题
    IB_SUFFIX=${IB_SUFFIX:--ib}  # IB主机名后缀

    if [ "$USE_IB_HOSTNAME" = "true" ]; then
        echo "使用InfiniBand网络主机名 (后缀: $IB_SUFFIX)"
        scontrol show hostname $SLURM_JOB_NODELIST | while read node; do
            echo "${node}${IB_SUFFIX}"
        done > $ABAQUS_WORK_DIR/hostfile
    else
        echo "使用标准主机名"
        scontrol show hostname $SLURM_JOB_NODELIST > $ABAQUS_WORK_DIR/hostfile
    fi

    echo "节点列表:"
    cat $ABAQUS_WORK_DIR/hostfile

    # 创建ABAQUS环境文件,明确指定每个节点及其CPU数
    rm -f $ABAQUS_WORK_DIR/abaqus_v6.env

    # 创建一个 srun wrapper 脚本来处理主机名解析
    cat > $ABAQUS_WORK_DIR/srun_wrapper.sh <<'EOF'
#!/bin/bash
# ABAQUS Platform MPI srun wrapper
# 将 IP 地址转换回主机名
#
# Platform MPI 可能以多种方式调用:
# 1. srun -w <ip> <command>
# 2. srun <ip> <command>
# 3. 直接: <ip> <command>

# 函数：将IP地址转换为主机名
ip_to_hostname() {
    local ip="$1"
    local hostname

    # 尝试从 getent 获取主机名
    hostname=$(getent hosts "$ip" | awk '{print $2}' | head -1)

    if [ -z "$hostname" ]; then
        # 如果无法解析，使用模式匹配
        # IP 192.168.10.X -> t1cnX (或添加-ib后缀)
        local last_octet=$(echo "$ip" | cut -d'.' -f4)
        hostname="t1cn$(printf '%02d' $last_octet)"

        # 如果需要IB网络，添加-ib后缀
        if [ "${USE_IB_HOSTNAME}" = "true" ]; then
            hostname="${hostname}-ib"
        fi
    fi

    echo "$hostname"
}

# 处理参数
args=()
hostname_specified=false

for arg in "$@"; do
    # 检查是否是IP地址
    if [[ "$arg" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        # 转换IP为主机名
        hostname=$(ip_to_hostname "$arg")
        args+=("$hostname")
    else
        args+=("$arg")
    fi
done

# 执行srun
exec /usr/bin/srun "${args[@]}"
EOF
    chmod +x $ABAQUS_WORK_DIR/srun_wrapper.sh

    echo "创建 srun wrapper: $ABAQUS_WORK_DIR/srun_wrapper.sh"

    # 检测MPI实现类型
    MPI_TYPE="INTELMPI"  # 默认使用Intel MPI
    if module list 2>&1 | grep -q openmpi; then
        MPI_TYPE="OPENMPI"
    elif module list 2>&1 | grep -q intel; then
        MPI_TYPE="INTELMPI"
    fi

    echo "检测到MPI类型: $MPI_TYPE"

    # 写入环境文件头部
    if [ "$MPI_TYPE" = "INTELMPI" ]; then
        # Intel MPI 配置 - 不定义 mp_rsh_command，让 MPI_REMSH 环境变量生效
        cat > $ABAQUS_WORK_DIR/abaqus_v6.env <<'EOF_HEADER'
# -*- coding: utf-8 -*-
import os

verbose=3

EOF_HEADER
    else
        # PMPI 配置 - 不定义 mp_rsh_command，让 MPI_REMSH 环境变量生效
        cat > $ABAQUS_WORK_DIR/abaqus_v6.env <<'EOF_HEADER'
# -*- coding: utf-8 -*-
import os

verbose=3
mp_mpi_implementation=PMPI

EOF_HEADER
    fi

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
INPUT_BASENAME=$(basename $INPUT_FILE .inp)

# ==================== 构建ABAQUS命令 ====================
ABAQUS_CMD="abaqus job=$JOB_NAME input=$INPUT_BASENAME"

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
    # 使用标准并行(standard_parallel)而不是默认的domain分解
    # 这在某些复杂算例中更稳定
    ABAQUS_CMD="$ABAQUS_CMD standard_parallel=all"
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
echo "ABAQUS 2022 多节点作业完成!"
echo "作业ID: $SLURM_JOB_ID"
echo "结束时间: $(date)"
echo "=================================================="
