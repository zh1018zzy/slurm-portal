#!/bin/bash

# ============================================================
# 检查 users 表的外键约束状态
# ============================================================
# 用途：快速检查数据库中所有引用 users 表的外键约束
# 使用方法：
#   ./scripts/check-user-foreign-keys.sh
# ============================================================

echo "========================================"
echo "检查 users 表的外键约束"
echo "========================================"
echo ""

# 检查是否设置了数据库连接信息
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  警告: DATABASE_URL 环境变量未设置"
    echo "请设置数据库连接字符串，例如："
    echo "export DATABASE_URL='postgresql://user:password@host:port/database'"
    echo ""
    exit 1
fi

# 执行查询
echo "正在查询外键约束..."
echo ""

psql "$DATABASE_URL" << 'EOF'
-- 查询所有引用 users 表的外键约束
SELECT 
    tc.table_name AS "表名",
    tc.constraint_name AS "约束名称",
    kcu.column_name AS "列名",
    rc.delete_rule AS "删除规则",
    CASE 
        WHEN rc.delete_rule = 'CASCADE' THEN '✓ 正确 (级联删除)'
        WHEN rc.delete_rule = 'SET NULL' THEN '✓ 正确 (设为NULL)'
        WHEN rc.delete_rule = 'RESTRICT' THEN '✗ 问题 (限制删除)'
        WHEN rc.delete_rule = 'NO ACTION' THEN '✗ 问题 (无操作)'
        ELSE '⚠ 需要检查'
    END AS "状态"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'users'
AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name;

-- 统计信息
\echo ''
\echo '========================================'
\echo '统计信息'
\echo '========================================'

SELECT 
    rc.delete_rule AS "删除规则",
    COUNT(*) AS "数量"
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'users'
AND tc.constraint_type = 'FOREIGN KEY'
GROUP BY rc.delete_rule
ORDER BY rc.delete_rule;

-- 检查是否有问题
\echo ''
\echo '========================================'
\echo '问题检查'
\echo '========================================'

WITH problem_constraints AS (
    SELECT 
        tc.table_name,
        tc.constraint_name,
        rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc 
        ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'users'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND rc.delete_rule NOT IN ('CASCADE', 'SET NULL')
)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✓ 所有外键约束都已正确配置'
        ELSE '✗ 发现 ' || COUNT(*) || ' 个需要修复的外键约束'
    END AS "检查结果"
FROM problem_constraints;

-- 显示需要修复的约束
SELECT 
    table_name AS "需要修复的表",
    constraint_name AS "约束名称",
    delete_rule AS "当前删除规则"
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc 
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage ccu
    ON rc.unique_constraint_name = ccu.constraint_name
WHERE ccu.table_name = 'users'
AND tc.constraint_type = 'FOREIGN KEY'
AND rc.delete_rule NOT IN ('CASCADE', 'SET NULL');

EOF

echo ""
echo "========================================"
echo "检查完成"
echo "========================================"
echo ""
echo "如果发现问题，请执行以下命令修复："
echo "psql \$DATABASE_URL -f db/fix-user-foreign-keys.sql"
echo ""
echo "或在 Supabase 控制台的 SQL Editor 中执行 db/fix-user-foreign-keys.sql"
echo ""

