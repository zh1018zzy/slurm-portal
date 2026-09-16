#!/bin/bash

# 作业状态同步定时任务启动脚本

set -e

echo "🚀 启动作业状态同步定时任务..."

# 检查环境变量
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ 错误: 请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量"
    echo "请确保在 .env 文件中配置了这些变量"
    exit 1
fi

# 检查Node.js是否可用
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装或不在 PATH 中"
    exit 1
fi

# 检查API服务是否运行
API_BASE_URL=${API_BASE_URL:-"http://localhost:3000"}
echo "🔍 检查API服务状态: $API_BASE_URL"

if ! curl -s --max-time 5 "$API_BASE_URL/api/jobs/sync" > /dev/null; then
    echo "⚠️  警告: API服务可能未运行，但继续启动定时任务"
    echo "请确保API服务在 $API_BASE_URL 上运行"
fi

# 设置环境变量
export API_BASE_URL

# 启动定时任务
echo "✅ 启动定时任务..."
node scripts/job-sync-cron.js 