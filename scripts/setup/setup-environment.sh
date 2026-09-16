#!/bin/bash

# HPC应用环境变量配置脚本
set -e

echo "HPC应用环境变量配置"
echo "=================="

# 检查是否已存在 .env 文件
if [ -f .env ]; then
    echo "发现已存在的 .env 文件"
    read -p "是否要备份现有文件？(y/n): " backup_choice
    if [ "$backup_choice" = "y" ] || [ "$backup_choice" = "Y" ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        echo "已备份到 .env.backup.$(date +%Y%m%d_%H%M%S)"
    fi
fi

# 复制环境变量模板
cp env.example .env

echo ""
echo "请配置以下环境变量："
echo ""

# Supabase 配置
echo "=== Supabase 配置 ==="
read -p "Supabase URL (默认: http://localhost:8000): " supabase_url
supabase_url=${supabase_url:-http://localhost:8000}

read -p "Supabase Service Role Key: " supabase_service_key
if [ -z "$supabase_service_key" ]; then
    echo "警告: Service Role Key 不能为空"
    supabase_service_key="your-service-role-key"
fi

read -p "Supabase Anon Key: " supabase_anon_key
if [ -z "$supabase_anon_key" ]; then
    echo "警告: Anon Key 不能为空"
    supabase_anon_key="your-anon-key"
fi

# 认证配置
echo ""
echo "=== 认证配置 ==="
read -p "NextAuth Secret (默认: 自动生成): " nextauth_secret
if [ -z "$nextauth_secret" ]; then
    nextauth_secret=$(openssl rand -base64 32)
    echo "自动生成的 Secret: $nextauth_secret"
fi

read -p "NextAuth URL (默认: http://localhost:3000): " nextauth_url
nextauth_url=${nextauth_url:-http://localhost:3000}

# LDAP 配置
echo ""
echo "=== LDAP 配置 ==="
read -p "LDAP URL (默认: ldap://localhost:389): " ldap_url
ldap_url=${ldap_url:-ldap://localhost:389}

read -p "LDAP Bind DN (默认: cn=admin,dc=example,dc=com): " ldap_bind_dn
ldap_bind_dn=${ldap_bind_dn:-cn=admin,dc=example,dc=com}

read -p "LDAP Bind Password: " ldap_bind_password
if [ -z "$ldap_bind_password" ]; then
    ldap_bind_password="admin_password"
fi

read -p "LDAP Base DN (默认: dc=example,dc=com): " ldap_base_dn
ldap_base_dn=${ldap_base_dn:-dc=example,dc=com}

# Slurm 配置
echo ""
echo "=== Slurm 配置 ==="
read -p "Slurm Cluster Name (默认: your-cluster): " slurm_cluster
slurm_cluster=${slurm_cluster:-your-cluster}

read -p "Slurm Control Host (默认: localhost): " slurm_host
slurm_host=${slurm_host:-localhost}

# 更新 .env 文件
echo ""
echo "更新 .env 文件..."

# 使用 sed 更新环境变量
sed -i "s|SUPABASE_URL=.*|SUPABASE_URL=$supabase_url|g" .env
sed -i "s|SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$supabase_service_key|g" .env
sed -i "s|NEXT_PUBLIC_SUPABASE_URL=.*|NEXT_PUBLIC_SUPABASE_URL=$supabase_url|g" .env
sed -i "s|NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$supabase_anon_key|g" .env
sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$nextauth_secret|g" .env
sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=$nextauth_url|g" .env
sed -i "s|LDAP_URL=.*|LDAP_URL=$ldap_url|g" .env
sed -i "s|LDAP_BIND_DN=.*|LDAP_BIND_DN=$ldap_bind_dn|g" .env
sed -i "s|LDAP_BIND_PASSWORD=.*|LDAP_BIND_PASSWORD=$ldap_bind_password|g" .env
sed -i "s|LDAP_BASE_DN=.*|LDAP_BASE_DN=$ldap_base_dn|g" .env
sed -i "s|SLURM_CLUSTER_NAME=.*|SLURM_CLUSTER_NAME=$slurm_cluster|g" .env
sed -i "s|SLURM_CONTROL_HOST=.*|SLURM_CONTROL_HOST=$slurm_host|g" .env

echo "环境变量配置完成！"
echo ""
echo "配置摘要："
echo "- Supabase URL: $supabase_url"
echo "- NextAuth URL: $nextauth_url"
echo "- LDAP URL: $ldap_url"
echo "- Slurm Host: $slurm_host"
echo ""
echo "请检查 .env 文件并确保所有配置正确。"
echo "然后运行以下命令启动应用："
echo "  npm run dev" 