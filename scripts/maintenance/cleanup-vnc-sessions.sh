#!/bin/bash

# VNC会话清理脚本
# 用于清理compute-node-01节点上的残留VNC进程和锁文件

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 检查是否在compute-node-01节点上运行
if [ "$(hostname)" != "compute-node-01" ]; then
    log_info "在远程节点上执行VNC清理..."
    ssh compute-node-01 "bash -s" < "$0"
    exit $?
fi

log_info "开始清理VNC会话..."

# 1. 检查并清理VNC进程
log_info "检查VNC进程..."
VNC_PROCESSES=$(ps aux | grep -E "vncserver|Xvnc" | grep -v grep || true)

if [ -n "$VNC_PROCESSES" ]; then
    log_warn "发现VNC进程:"
    echo "$VNC_PROCESSES"
    
    # 获取VNC进程的PID
    VNC_PIDS=$(echo "$VNC_PROCESSES" | awk '{print $2}')
    
    for pid in $VNC_PIDS; do
        log_info "终止VNC进程 PID: $pid"
        kill -TERM "$pid" 2>/dev/null || true
        sleep 1
        # 如果进程仍然存在，强制终止
        if kill -0 "$pid" 2>/dev/null; then
            log_warn "强制终止VNC进程 PID: $pid"
            kill -KILL "$pid" 2>/dev/null || true
        fi
    done
else
    log_info "未发现VNC进程"
fi

# 2. 清理X锁文件
log_info "清理X锁文件..."
X_LOCKS=$(ls /tmp/.X*-lock 2>/dev/null || true)

if [ -n "$X_LOCKS" ]; then
    log_warn "发现X锁文件:"
    echo "$X_LOCKS"
    
    for lock_file in $X_LOCKS; do
        # 跳过X0锁文件（系统显示）
        if [[ "$lock_file" == "/tmp/.X0-lock" ]]; then
            log_info "跳过系统显示锁文件: $lock_file"
            continue
        fi
        
        log_info "删除锁文件: $lock_file"
        rm -f "$lock_file"
    done
else
    log_info "未发现X锁文件"
fi

# 3. 清理X11 socket文件
log_info "清理X11 socket文件..."
X_SOCKETS=$(ls /tmp/.X11-unix/X* 2>/dev/null || true)

if [ -n "$X_SOCKETS" ]; then
    log_warn "发现X11 socket文件:"
    echo "$X_SOCKETS"
    
    for socket_file in $X_SOCKETS; do
        # 跳过X0 socket（系统显示）
        if [[ "$socket_file" == "/tmp/.X11-unix/X0" ]]; then
            log_info "跳过系统显示socket: $socket_file"
            continue
        fi
        
        log_info "删除socket文件: $socket_file"
        rm -f "$socket_file"
    done
else
    log_info "未发现X11 socket文件"
fi

# 4. 检查TurboVNC进程
log_info "检查TurboVNC进程..."
TURBO_VNC_PROCESSES=$(ps aux | grep -E "TurboVNC|Xvnc" | grep -v grep || true)

if [ -n "$TURBO_VNC_PROCESSES" ]; then
    log_warn "发现TurboVNC进程:"
    echo "$TURBO_VNC_PROCESSES"
    
    # 获取TurboVNC进程的PID
    TURBO_VNC_PIDS=$(echo "$TURBO_VNC_PROCESSES" | awk '{print $2}')
    
    for pid in $TURBO_VNC_PIDS; do
        log_info "终止TurboVNC进程 PID: $pid"
        kill -TERM "$pid" 2>/dev/null || true
        sleep 1
        # 如果进程仍然存在，强制终止
        if kill -0 "$pid" 2>/dev/null; then
            log_warn "强制终止TurboVNC进程 PID: $pid"
            kill -KILL "$pid" 2>/dev/null || true
        fi
    done
else
    log_info "未发现TurboVNC进程"
fi

# 5. 检查端口占用
log_info "检查VNC端口占用..."
VNC_PORTS=$(netstat -tlnp 2>/dev/null | grep ":59" || true)

if [ -n "$VNC_PORTS" ]; then
    log_warn "发现VNC端口占用:"
    echo "$VNC_PORTS"
else
    log_info "未发现VNC端口占用"
fi

# 6. 清理用户VNC目录
log_info "清理用户VNC目录..."
for user_dir in /home/*; do
    if [ -d "$user_dir" ] && [ -d "$user_dir/.vnc" ]; then
        user=$(basename "$user_dir")
        log_info "清理用户 $user 的VNC目录"
        
        # 清理VNC配置文件
        rm -f "$user_dir/.vnc/passwd" 2>/dev/null || true
        rm -f "$user_dir/.vnc/xstartup" 2>/dev/null || true
        
        # 保留目录结构，只清理配置文件
        log_info "用户 $user 的VNC目录已清理"
    fi
done

# 7. 验证清理结果
log_info "验证清理结果..."

# 检查是否还有VNC进程
REMAINING_VNC=$(ps aux | grep -E "vncserver|Xvnc|TurboVNC" | grep -v grep || true)
if [ -n "$REMAINING_VNC" ]; then
    log_error "仍有VNC进程残留:"
    echo "$REMAINING_VNC"
else
    log_success "所有VNC进程已清理"
fi

# 检查是否还有X锁文件
REMAINING_LOCKS=$(ls /tmp/.X*-lock 2>/dev/null | grep -v "/tmp/.X0-lock" || true)
if [ -n "$REMAINING_LOCKS" ]; then
    log_error "仍有X锁文件残留:"
    echo "$REMAINING_LOCKS"
else
    log_success "所有X锁文件已清理"
fi

# 检查是否还有X11 socket文件
REMAINING_SOCKETS=$(ls /tmp/.X11-unix/X* 2>/dev/null | grep -v "/tmp/.X11-unix/X0" || true)
if [ -n "$REMAINING_SOCKETS" ]; then
    log_error "仍有X11 socket文件残留:"
    echo "$REMAINING_SOCKETS"
else
    log_success "所有X11 socket文件已清理"
fi

log_success "VNC会话清理完成！"

# 8. 显示当前状态
echo
log_info "当前系统状态:"
echo "主机名: $(hostname)"
echo "时间: $(date)"
echo "VNC进程: $(ps aux | grep -E "vncserver|Xvnc|TurboVNC" | grep -v grep | wc -l)"
echo "X锁文件: $(ls /tmp/.X*-lock 2>/dev/null | grep -v "/tmp/.X0-lock" | wc -l)"
echo "VNC端口: $(netstat -tlnp 2>/dev/null | grep ":59" | wc -l)" 