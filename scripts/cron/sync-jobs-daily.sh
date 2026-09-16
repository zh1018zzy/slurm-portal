#!/bin/bash
# 每日作业状态同步脚本
# 用于 crontab: 30 23 * * * /opt/my-hpcapp/scripts/sync-jobs-daily.sh

# 设置日志目录
LOG_DIR="/var/log/hpcapp"
LOG_FILE="${LOG_DIR}/daily-sync.log"

# 创建日志目录（如果不存在）
mkdir -p "${LOG_DIR}"

# 记录开始时间
echo "==========================================" >> "${LOG_FILE}"
echo "每日同步开始: $(date '+%Y-%m-%d %H:%M:%S')" >> "${LOG_FILE}"
echo "==========================================" >> "${LOG_FILE}"

# 执行同步
curl -X POST http://localhost:3000/api/jobs/smart-sync \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "force=true&syncToday=true" \
  >> "${LOG_FILE}" 2>&1

# 记录完成状态
EXIT_CODE=$?
echo "" >> "${LOG_FILE}"
if [ ${EXIT_CODE} -eq 0 ]; then
  echo "✅ 每日同步完成: $(date '+%Y-%m-%d %H:%M:%S')" >> "${LOG_FILE}"
else
  echo "❌ 每日同步失败 (退出码: ${EXIT_CODE}): $(date '+%Y-%m-%d %H:%M:%S')" >> "${LOG_FILE}"
fi
echo "==========================================" >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"

# 清理旧日志（保留最近30天）
find "${LOG_DIR}" -name "daily-sync.log.*" -mtime +30 -delete

# 日志轮转（如果文件超过10MB）
LOG_SIZE=$(stat -f%z "${LOG_FILE}" 2>/dev/null || stat -c%s "${LOG_FILE}" 2>/dev/null || echo 0)
if [ ${LOG_SIZE} -gt 10485760 ]; then
  mv "${LOG_FILE}" "${LOG_FILE}.$(date '+%Y%m%d-%H%M%S')"
  touch "${LOG_FILE}"
fi

exit ${EXIT_CODE}

