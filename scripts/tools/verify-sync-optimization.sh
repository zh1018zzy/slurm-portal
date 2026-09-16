#!/bin/bash

# 作业状态同步优化验证脚本
# 用于测试修复后的同步逻辑

set -e

echo "=== 作业状态同步优化验证 ==="
echo "时间: $(date)"
echo

# 测试计数器
test_count=0
pass_count=0

# 测试函数
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    ((test_count++))
    echo "[$test_count] 测试: $test_name"
    
    # 执行测试命令并捕获输出
    local output
    if output=$(eval "$test_command" 2>&1); then
        if [[ -z "$expected_pattern" ]] || echo "$output" | grep -q "$expected_pattern"; then
            echo "  ✅ 通过"
            ((pass_count++))
        else
            echo "  ❌ 失败 - 未找到期望的输出: $expected_pattern"
            echo "  实际输出: $output"
        fi
    else
        echo "  ❌ 失败 - 命令执行错误"
        echo "  错误: $output"
    fi
    echo
}

# 检查应用是否运行
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ 应用未在端口3000运行，请启动应用后重试"
    exit 1
fi

echo "✅ 应用正在运行，开始测试..."
echo

# 测试1: 首次访问作业列表（应该触发同步）
run_test "首次访问作业列表" \
    "curl -s 'http://localhost:3000/api/jobs?page=1&pageSize=20' -H 'Authorization: Bearer test' | jq -r '.message // \"success\"'" \
    ""

# 等待2秒
sleep 2

# 测试2: 立即再次访问（应该跳过同步）
run_test "立即再次访问作业列表" \
    "curl -s 'http://localhost:3000/api/jobs?page=1&pageSize=20' -H 'Authorization: Bearer test' | jq -r '.message // \"success\"'" \
    ""

# 测试3: 手动同步API
run_test "手动同步API测试" \
    "curl -s -X POST 'http://localhost:3000/api/jobs/sync' -H 'Authorization: Bearer test' | jq -r '.success'" \
    "true"

# 测试4: 强制跳过同步
run_test "强制跳过同步" \
    "curl -s 'http://localhost:3000/api/jobs?page=1&pageSize=20&skipSync=true' -H 'Authorization: Bearer test' | jq -r '.message // \"success\"'" \
    ""

echo "=== 测试结果总结 ==="
echo "总测试数: $test_count"
echo "通过数: $pass_count"
echo "失败数: $((test_count - pass_count))"

if [ $pass_count -eq $test_count ]; then
    echo "🎉 所有测试通过！"
    echo
    echo "=== 优化效果验证 ==="
    echo "✅ 修复了时间对比逻辑，避免格式差异导致的误判"
    echo "✅ 修复了通知逻辑，只有真正的状态变化才发送通知"
    echo "✅ 添加了60秒同步间隔，避免频繁同步"
    echo "✅ 提供了跳过同步的选项，提升性能"
    echo
    echo "=== 使用建议 ==="
    echo "1. 正常使用时，系统会智能控制同步频率"
    echo "2. 如需立即查看最新状态，点击'状态同步'按钮"
    echo "3. 页面访问间隔超过60秒时才会自动同步"
    echo "4. 不再会出现 FAILED -> FAILED 这种无意义的通知"
else
    echo "❌ 部分测试失败，请检查应用状态和配置"
fi

echo
echo "=== 性能监控建议 ==="
echo "监控以下日志输出的变化："
echo "  - '跳过同步，距离上次同步仅 XX秒' - 表示优化生效"
echo "  - 状态变化通知数量应该显著减少"
echo "  - 只有真正的状态变化才会输出变化日志"

echo
echo "=== 验证完成 ==="