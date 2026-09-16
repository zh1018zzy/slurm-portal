#!/bin/bash

# HPC大屏数据收集服务设置脚本

set -e

echo "设置HPC大屏数据收集服务..."

# 创建数据收集目录
DATA_DIR="/opt/hpc-dashboard-data"
mkdir -p $DATA_DIR
mkdir -p $DATA_DIR/logs

echo "创建数据目录: $DATA_DIR"

# 复制数据收集脚本
cp scripts/system-data-collector.sh $DATA_DIR/
chmod +x $DATA_DIR/system-data-collector.sh

# 创建定时收集脚本
cat > $DATA_DIR/collect-data.sh << 'EOF'
#!/bin/bash

# 定时数据收集脚本
DATA_DIR="/opt/hpc-dashboard-data"
LOG_FILE="$DATA_DIR/logs/collection-$(date +%Y%m%d).log"

# 记录开始时间
echo "$(date): 开始数据收集" >> $LOG_FILE

# 执行数据收集
$DATA_DIR/system-data-collector.sh >> $LOG_FILE 2>&1

# 记录完成时间
echo "$(date): 数据收集完成" >> $LOG_FILE

# 清理旧日志（保留7天）
find $DATA_DIR/logs -name "collection-*.log" -mtime +7 -delete

# 清理旧数据文件（保留24小时）
find /tmp/hpc-dashboard -name "*.txt" -mtime +1 -delete
find /tmp/hpc-dashboard -name "*.json" -mtime +1 -delete
EOF

chmod +x $DATA_DIR/collect-data.sh

# 创建systemd服务文件
cat > /etc/systemd/system/hpc-dashboard-collector.service << EOF
[Unit]
Description=HPC Dashboard Data Collector
After=network.target

[Service]
Type=oneshot
ExecStart=$DATA_DIR/collect-data.sh
User=root
Group=root

[Install]
WantedBy=multi-user.target
EOF

# 创建定时器文件
cat > /etc/systemd/system/hpc-dashboard-collector.timer << EOF
[Unit]
Description=Run HPC Dashboard Data Collector every 30 seconds
Requires=hpc-dashboard-collector.service

[Timer]
OnBootSec=10
OnUnitActiveSec=30
Unit=hpc-dashboard-collector.service

[Install]
WantedBy=timers.target
EOF

# 重新加载systemd配置
systemctl daemon-reload

# 启用并启动定时器
systemctl enable hpc-dashboard-collector.timer
systemctl start hpc-dashboard-collector.timer

echo "检查服务状态..."
systemctl status hpc-dashboard-collector.timer --no-pager

echo ""
echo "=== 设置完成 ==="
echo "数据收集目录: $DATA_DIR"
echo "日志目录: $DATA_DIR/logs"
echo "定时器状态: $(systemctl is-active hpc-dashboard-collector.timer)"
echo ""
echo "手动测试数据收集:"
echo "  $DATA_DIR/collect-data.sh"
echo ""
echo "查看定时器状态:"
echo "  systemctl status hpc-dashboard-collector.timer"
echo ""
echo "查看最新日志:"
echo "  tail -f $DATA_DIR/logs/collection-\$(date +%Y%m%d).log" 