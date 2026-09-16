#!/bin/bash
# 每周作业状态同步脚本
# 用于 crontab: 0 22 * * 6 /path/to/slurm-portal/scripts/cron/sync-jobs-weekly.sh

# 设置日志目录
LOG_DIR="/var/log/hpcapp"
LOG_FILE="${LOG_DIR}/weekly-sync.log"

# 创建日志目录（如果不存在）
mkdir -p "${LOG_DIR}"

# 记录开始时间
echo "==========================================" >> "${LOG_FILE}"
echo "每周同步开始: $(date '+%Y-%m-%d %H:%M:%S')" >> "${LOG_FILE}"
echo "==========================================" >> "${LOG_FILE}"

# 执行同步
curl -X POST http://localhost:3000/api/jobs/smart-sync \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "force=true&recentDays=7" \
  >> "${LOG_FILE}" 2>&1

# 记录完成状态
EXIT_CODE=$?
echo "" >> "${LOG_FILE}"
if [ ${EXIT_CODE} -eq 0 ]; then
  echo "✅ 每周同步完成: $(date '+%Y-%m-%d %H:%M:%S')" >> "${LOG_FILE}"
else
  echo "❌ 每周同步失败 (退出码: ${EXIT_CODE}): $(date '+%Y-%m-%d %H:%M:%S')" >> "${LOG_FILE}"
fi
echo "==========================================" >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"

# 清理旧日志（保留最近90天）
find "${LOG_DIR}" -name "weekly-sync.log.*" -mtime +90 -delete

# 日志轮转（如果文件超过10MB）
LOG_SIZE=$(stat -f%z "${LOG_FILE}" 2>/dev/null || stat -c%s "${LOG_FILE}" 2>/dev/null || echo 0)
if [ ${LOG_SIZE} -gt 10485760 ]; then
  mv "${LOG_FILE}" "${LOG_FILE}.$(date '+%Y%m%d-%H%M%S')"
  touch "${LOG_FILE}"
fi

exit ${EXIT_CODE}

