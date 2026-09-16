#!/bin/bash

# Slurm 节点监控脚本 - 基于 Slurm 原生命令收集节点使用情况
# 支持输出 JSON 格式便于集成到应用中

set -e

# 配置项
OUTPUT_FORMAT="${1:-json}"  # 输出格式: json, text
DETAILED="${2:-false}"      # 是否详细模式
LOG_FILE="/var/log/slurm/node-monitor.log"

# 记录日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# 错误处理
error_exit() {
    echo "错误: $1" >&2
    log "ERROR: $1"
    exit 1
}

# 检查 Slurm 命令可用性
check_slurm_commands() {
    for cmd in sinfo squeue sacct sstat; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            error_exit "Slurm 命令 $cmd 不可用"
        fi
    done
}

# 获取节点基本信息
get_node_info() {
    sinfo -N -h -o "%N|%t|%c|%C|%m|%G|%P|%e|%f" 2>/dev/null || {
        error_exit "无法获取节点信息"
    }
}

# 获取分区信息
get_partition_info() {
    sinfo -h -o "%P|%D|%C|%G|%t|%l" 2>/dev/null || {
        error_exit "无法获取分区信息"
    }
}

# 获取正在运行的作业
get_running_jobs() {
    squeue -h -t RUNNING -o "%i|%j|%u|%N|%C|%m|%P|%S|%M" 2>/dev/null || {
        log "WARN: 无法获取运行作业信息"
        echo ""
    }
}

# 获取作业历史统计
get_job_stats() {
    local days=${1:-7}
    local start_date=$(date -d "$days days ago" '+%Y-%m-%d')
    
    sacct --starttime="$start_date" -a --format=JobID,State,CPUTime,Elapsed,NCPUS,NodeList,User,Submit,Start,End --parsable2 --noheader 2>/dev/null | 
    grep -v "\.batch\|\.extern" || {
        log "WARN: 无法获取作业历史统计"
        echo ""
    }
}

# 计算节点利用率
calculate_node_utilization() {
    local node_data="$1"
    local total_cpus=0
    local alloc_cpus=0
    local idle_cpus=0
    local total_memory=0
    local healthy_nodes=0
    local total_nodes=0
    
    while IFS='|' read -r name state cpu_total cpu_info memory gpu partition reason features; do
        if [[ -z "$name" || "$name" == "NODELIST" ]]; then
            continue
        fi
        
        total_nodes=$((total_nodes + 1))
        
        # 解析CPU信息 (格式: alloc/idle/other/total)
        if [[ "$cpu_info" =~ ([0-9]+)/([0-9]+)/([0-9]+)/([0-9]+) ]]; then
            local node_alloc=${BASH_REMATCH[1]}
            local node_idle=${BASH_REMATCH[2]}
            local node_total=${BASH_REMATCH[4]}
            
            alloc_cpus=$((alloc_cpus + node_alloc))
            idle_cpus=$((idle_cpus + node_idle))
            total_cpus=$((total_cpus + node_total))
        fi
        
        # 累加内存 (MB)
        if [[ "$memory" =~ ^[0-9]+$ ]]; then
            total_memory=$((total_memory + memory))
        fi
        
        # 统计健康节点
        if [[ "$state" =~ idle|alloc|mix ]]; then
            healthy_nodes=$((healthy_nodes + 1))
        fi
    done <<< "$node_data"
    
    # 计算利用率
    local cpu_utilization=0
    if [[ $total_cpus -gt 0 ]]; then
        cpu_utilization=$(( alloc_cpus * 100 / total_cpus ))
    fi
    
    local node_availability=0
    if [[ $total_nodes -gt 0 ]]; then
        node_availability=$(( healthy_nodes * 100 / total_nodes ))
    fi
    
    echo "$total_nodes|$healthy_nodes|$total_cpus|$alloc_cpus|$idle_cpus|$cpu_utilization|$node_availability|$total_memory"
}

# 分析作业统计
analyze_job_stats() {
    local job_data="$1"
    local total_jobs=0
    local completed_jobs=0
    local failed_jobs=0
    local cancelled_jobs=0
    local total_cpu_hours="0.00"
    local total_wall_hours="0.00"
    
    while IFS='|' read -r job_id state cpu_time elapsed ncpus nodes user submit start end; do
        if [[ -z "$job_id" || "$job_id" == "JobID" ]]; then
            continue
        fi
        
        total_jobs=$((total_jobs + 1))
        
        case "$state" in
            "COMPLETED") completed_jobs=$((completed_jobs + 1)) ;;
            "FAILED"|"TIMEOUT") failed_jobs=$((failed_jobs + 1)) ;;
            "CANCELLED") cancelled_jobs=$((cancelled_jobs + 1)) ;;
        esac
        
        # 解析CPU时间和运行时间
        if [[ "$cpu_time" =~ ([0-9]+)-([0-9]+):([0-9]+):([0-9]+) ]]; then
            # 格式: DD-HH:MM:SS
            local days=$((10#${BASH_REMATCH[1]}))
            local hours=$((10#${BASH_REMATCH[2]}))
            local minutes=$((10#${BASH_REMATCH[3]}))
            local seconds=$((10#${BASH_REMATCH[4]}))
            local cpu_seconds=$((days * 86400 + hours * 3600 + minutes * 60 + seconds))
            total_cpu_hours=$(printf "%.2f" $(echo "$total_cpu_hours + $cpu_seconds / 3600.0" | bc -l 2>/dev/null || echo "$total_cpu_hours"))
        elif [[ "$cpu_time" =~ ([0-9]+):([0-9]+):([0-9]+) ]]; then
            # 格式: HH:MM:SS
            local hours=$((10#${BASH_REMATCH[1]}))
            local minutes=$((10#${BASH_REMATCH[2]}))
            local seconds=$((10#${BASH_REMATCH[3]}))
            local cpu_seconds=$((hours * 3600 + minutes * 60 + seconds))
            total_cpu_hours=$(printf "%.2f" $(echo "$total_cpu_hours + $cpu_seconds / 3600.0" | bc -l 2>/dev/null || echo "$total_cpu_hours"))
        fi
        
        # 解析运行时间
        if [[ "$elapsed" =~ ([0-9]+)-([0-9]+):([0-9]+):([0-9]+) ]]; then
            local days=$((10#${BASH_REMATCH[1]}))
            local hours=$((10#${BASH_REMATCH[2]}))
            local minutes=$((10#${BASH_REMATCH[3]}))
            local seconds=$((10#${BASH_REMATCH[4]}))
            local wall_seconds=$((days * 86400 + hours * 3600 + minutes * 60 + seconds))
            total_wall_hours=$(printf "%.2f" $(echo "$total_wall_hours + $wall_seconds / 3600.0" | bc -l 2>/dev/null || echo "$total_wall_hours"))
        elif [[ "$elapsed" =~ ([0-9]+):([0-9]+):([0-9]+) ]]; then
            local hours=$((10#${BASH_REMATCH[1]}))
            local minutes=$((10#${BASH_REMATCH[2]}))
            local seconds=$((10#${BASH_REMATCH[3]}))
            local wall_seconds=$((hours * 3600 + minutes * 60 + seconds))
            total_wall_hours=$(printf "%.2f" $(echo "$total_wall_hours + $wall_seconds / 3600.0" | bc -l 2>/dev/null || echo "$total_wall_hours"))
        fi
    done <<< "$job_data"
    
    echo "$total_jobs|$completed_jobs|$failed_jobs|$cancelled_jobs|$total_cpu_hours|$total_wall_hours"
}

# 获取实时作业资源使用
get_realtime_job_usage() {
    local running_jobs="$1"
    local job_count=0
    local total_cpus=0
    local total_memory=""
    
    while IFS='|' read -r job_id name user nodes cpus memory partition start runtime; do
        if [[ -z "$job_id" ]]; then
            continue
        fi
        
        job_count=$((job_count + 1))
        
        # 累加CPU
        if [[ "$cpus" =~ ^[0-9]+$ ]]; then
            total_cpus=$((total_cpus + cpus))
        fi
        
        # 尝试获取实时资源使用情况
        if command -v sstat >/dev/null 2>&1; then
            local job_stats
            job_stats=$(sstat -j "$job_id" --format=MaxRSS,AveCPU --parsable --noheader 2>/dev/null | head -1 || echo "")
            if [[ -n "$job_stats" ]]; then
                log "Job $job_id stats: $job_stats"
            fi
        fi
    done <<< "$running_jobs"
    
    echo "$job_count|$total_cpus"
}

# 主函数
main() {
    log "开始节点监控检查"
    
    # 检查命令可用性
    check_slurm_commands
    
    # 获取数据
    log "收集节点信息..."
    local node_info
    node_info=$(get_node_info)
    
    log "收集分区信息..."
    local partition_info
    partition_info=$(get_partition_info)
    
    log "收集运行作业..."
    local running_jobs
    running_jobs=$(get_running_jobs)
    
    # 计算节点利用率
    local node_utilization
    node_utilization=$(calculate_node_utilization "$node_info")
    
    # 获取实时作业使用情况
    local realtime_usage
    realtime_usage=$(get_realtime_job_usage "$running_jobs")
    
    # 获取作业历史统计 (可选，较耗时)
    local job_stats=""
    if [[ "$DETAILED" == "true" ]]; then
        log "收集作业历史统计..."
        local job_history
        job_history=$(get_job_stats 7)
        job_stats=$(analyze_job_stats "$job_history")
    fi
    
    # 解析数据
    IFS='|' read -r total_nodes healthy_nodes total_cpus alloc_cpus idle_cpus cpu_util node_avail total_memory <<< "$node_utilization"
    IFS='|' read -r running_job_count running_total_cpus <<< "$realtime_usage"
    
    local current_time
    current_time=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    
    # 输出结果
    if [[ "$OUTPUT_FORMAT" == "json" ]]; then
        cat << EOF
{
  "timestamp": "$current_time",
  "cluster": {
    "nodes": {
      "total": $total_nodes,
      "healthy": $healthy_nodes,
      "availability_percent": $node_avail
    },
    "cpus": {
      "total": $total_cpus,
      "allocated": $alloc_cpus,
      "idle": $idle_cpus,
      "utilization_percent": $cpu_util
    },
    "memory": {
      "total_mb": $total_memory
    }
  },
  "jobs": {
    "running_count": $running_job_count,
    "running_cpus": $running_total_cpus
  }
EOF
        if [[ -n "$job_stats" && "$DETAILED" == "true" ]]; then
            IFS='|' read -r hist_total hist_completed hist_failed hist_cancelled hist_cpu_hours hist_wall_hours <<< "$job_stats"
            cat << EOF
,
  "history": {
    "total_jobs": $hist_total,
    "completed_jobs": $hist_completed,
    "failed_jobs": $hist_failed,
    "cancelled_jobs": $hist_cancelled,
    "total_cpu_hours": $(printf "%.2f" ${hist_cpu_hours:-0}),
    "total_wall_hours": $(printf "%.2f" ${hist_wall_hours:-0})
  }
EOF
        fi
        echo "}"
    else
        # 文本格式输出
        echo "=== Slurm 集群节点监控报告 ==="
        echo "时间: $current_time"
        echo ""
        echo "节点状态:"
        echo "  总节点数: $total_nodes"
        echo "  健康节点: $healthy_nodes"
        echo "  节点可用率: $node_avail%"
        echo ""
        echo "CPU 资源:"
        echo "  总CPU核数: $total_cpus"
        echo "  已分配: $alloc_cpus"
        echo "  空闲: $idle_cpus"
        echo "  利用率: $cpu_util%"
        echo ""
        echo "内存资源:"
        echo "  总内存: ${total_memory}MB"
        echo ""
        echo "运行作业:"
        echo "  作业数量: $running_job_count"
        echo "  使用CPU: $running_total_cpus"
        
        if [[ -n "$job_stats" && "$DETAILED" == "true" ]]; then
            IFS='|' read -r hist_total hist_completed hist_failed hist_cancelled hist_cpu_hours hist_wall_hours <<< "$job_stats"
            echo ""
            echo "历史统计 (最近7天):"
            echo "  总作业数: $hist_total"
            echo "  完成: $hist_completed"
            echo "  失败: $hist_failed"
            echo "  取消: $hist_cancelled"
            echo "  总CPU时: ${hist_cpu_hours:-0} 小时"
            echo "  总运行时: ${hist_wall_hours:-0} 小时"
        fi
    fi
    
    log "节点监控检查完成"
}

# 执行主函数
main "$@"