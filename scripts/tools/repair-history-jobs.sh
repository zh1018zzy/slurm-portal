#!/bin/bash
# 历史作业状态修复脚本
# 用于一次性修复历史作业数据

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
API_URL="${API_URL:-http://localhost:3000}"
LOG_DIR="/var/log/hpcapp"
LOG_FILE="${LOG_DIR}/repair-history.log"

# 创建日志目录
mkdir -p "${LOG_DIR}"

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}历史作业状态修复工具${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# 显示帮助
show_help() {
    cat << EOF
用法: $0 [选项]

选项:
    -d, --days <天数>      修复最近N天的作业（默认：30）
    -b, --batch            分批修复模式（推荐，性能更好）
    -a, --all              修复所有历史作业（谨慎使用）
    -t, --test             测试模式，只检查不修复
    -h, --help             显示此帮助信息

示例:
    # 修复最近30天
    $0 -d 30

    # 分批修复最近90天
    $0 -d 90 --batch

    # 测试模式
    $0 -d 7 --test

EOF
}

# 参数解析
DAYS=30
BATCH_MODE=false
TEST_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--days)
            DAYS="$2"
            shift 2
            ;;
        -b|--batch)
            BATCH_MODE=true
            shift
            ;;
        -a|--all)
            DAYS=365
            shift
            ;;
        -t|--test)
            TEST_MODE=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知参数: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

echo "配置信息:"
echo "  - API 地址: ${API_URL}"
echo "  - 修复范围: 最近 ${DAYS} 天"
echo "  - 分批模式: ${BATCH_MODE}"
echo "  - 测试模式: ${TEST_MODE}"
echo ""

# 确认操作
if [ "${TEST_MODE}" = false ]; then
    read -p "确认开始修复？(y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}已取消${NC}"
        exit 0
    fi
fi

# 记录开始
START_TIME=$(date +%s)
echo "=========================================" >> "${LOG_FILE}"
echo "修复开始: $(date '+%Y-%m-%d %H:%M:%S')" >> "${LOG_FILE}"
echo "范围: 最近 ${DAYS} 天" >> "${LOG_FILE}"
echo "=========================================" >> "${LOG_FILE}"

# 执行修复
repair_jobs() {
    local days=$1
    local is_test=$2
    
    echo -e "${YELLOW}正在同步最近 ${days} 天的作业...${NC}"
    
    if [ "${is_test}" = true ]; then
        echo -e "${YELLOW}[测试模式] 不会实际修改数据${NC}"
        # 只查询，不修复
        curl -s "${API_URL}/api/jobs/smart-sync" \
            -X GET 2>&1 | tee -a "${LOG_FILE}"
    else
        # 执行修复
        response=$(curl -s -X POST "${API_URL}/api/jobs/smart-sync" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "force=true&recentDays=${days}" 2>&1)
        
        echo "${response}" | tee -a "${LOG_FILE}"
        
        # 解析结果
        if echo "${response}" | grep -q '"success":true'; then
            updated=$(echo "${response}" | grep -o '"updated":[0-9]*' | cut -d: -f2)
            newJobs=$(echo "${response}" | grep -o '"newJobs":[0-9]*' | cut -d: -f2)
            changedJobs=$(echo "${response}" | grep -o '"changedJobs":[0-9]*' | cut -d: -f2)
            totalJobs=$(echo "${response}" | grep -o '"totalJobs":[0-9]*' | cut -d: -f2)
            
            echo -e "${GREEN}✅ 同步成功${NC}"
            echo "  - 总作业数: ${totalJobs:-0}"
            echo "  - 更新数: ${updated:-0}"
            echo "  - 新增数: ${newJobs:-0}"
            echo "  - 状态变化: ${changedJobs:-0}"
            
            return 0
        else
            echo -e "${RED}❌ 同步失败${NC}"
            return 1
        fi
    fi
}

# 分批修复
repair_batch() {
    local total_days=$1
    local batch_size=7  # 每批7天
    local current_day=0
    local success_count=0
    local fail_count=0
    
    echo -e "${YELLOW}开始分批修复（每批 ${batch_size} 天）...${NC}"
    echo ""
    
    while [ ${current_day} -lt ${total_days} ]; do
        local remaining=$((total_days - current_day))
        local batch_days=$((remaining < batch_size ? remaining : batch_size))
        local batch_num=$((current_day / batch_size + 1))
        
        echo -e "${YELLOW}=== 批次 ${batch_num} ====${NC}"
        echo "范围: 第 ${current_day}-$((current_day + batch_days)) 天"
        
        if repair_jobs ${batch_days} ${TEST_MODE}; then
            ((success_count++))
            echo -e "${GREEN}批次 ${batch_num} 完成${NC}"
        else
            ((fail_count++))
            echo -e "${RED}批次 ${batch_num} 失败${NC}"
        fi
        
        current_day=$((current_day + batch_days))
        
        # 避免过于频繁，休息2秒
        if [ ${current_day} -lt ${total_days} ]; then
            echo "等待 2 秒..."
            sleep 2
        fi
        
        echo ""
    done
    
    echo "========================================="
    echo -e "${GREEN}分批修复完成${NC}"
    echo "  - 成功批次: ${success_count}"
    echo "  - 失败批次: ${fail_count}"
    echo "========================================="
}

# 执行修复
if [ "${BATCH_MODE}" = true ]; then
    repair_batch ${DAYS}
else
    repair_jobs ${DAYS} ${TEST_MODE}
fi

# 记录结束
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "" >> "${LOG_FILE}"
echo "修复完成: $(date '+%Y-%m-%d %H:%M:%S')" >> "${LOG_FILE}"
echo "耗时: ${DURATION} 秒" >> "${LOG_FILE}"
echo "=========================================" >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}修复完成！${NC}"
echo -e "${GREEN}========================================${NC}"
echo "耗时: ${DURATION} 秒"
echo "日志: ${LOG_FILE}"
echo ""
echo "建议："
echo "  1. 检查日志文件确认修复结果"
echo "  2. 在 dashboard/jobs/history 页面验证数据"
echo "  3. 如有问题，查看详细日志"
echo ""

