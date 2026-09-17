#!/bin/bash

# 许可证密钥对生成脚本
# 用于生成RSA公私钥对，用于许可证的数字签名验证

set -e

echo "🔑 生成许可证密钥对"
echo "===================="

# 配置
KEY_SIZE=2048
PRIVATE_KEY_FILE="config/license/license-private.pem"
PUBLIC_KEY_FILE="config/license/license-public.pem"

# 私钥口令：优先环境变量，否则交互输入（切勿把真实口令写进仓库）
if [ -z "${LICENSE_PRIVATE_KEY_PASSPHRASE:-}" ]; then
    echo "请设置环境变量 LICENSE_PRIVATE_KEY_PASSPHRASE，或接下来交互输入口令。"
    read -s -p "私钥口令: " LICENSE_PRIVATE_KEY_PASSPHRASE
    echo ""
    read -s -p "再次确认口令: " LICENSE_PRIVATE_KEY_PASSPHRASE_CONFIRM
    echo ""
    if [ "$LICENSE_PRIVATE_KEY_PASSPHRASE" != "$LICENSE_PRIVATE_KEY_PASSPHRASE_CONFIRM" ]; then
        echo "❌ 两次口令不一致"
        exit 1
    fi
    unset LICENSE_PRIVATE_KEY_PASSPHRASE_CONFIRM
fi
if [ -z "$LICENSE_PRIVATE_KEY_PASSPHRASE" ]; then
    echo "❌ 私钥口令不能为空"
    exit 1
fi

# 创建目录
mkdir -p "$(dirname "$PRIVATE_KEY_FILE")"
mkdir -p "$(dirname "$PUBLIC_KEY_FILE")"

# 检查是否已存在密钥文件
if [ -f "$PRIVATE_KEY_FILE" ] || [ -f "$PUBLIC_KEY_FILE" ]; then
    echo "⚠️  密钥文件已存在:"
    [ -f "$PRIVATE_KEY_FILE" ] && echo "   - $PRIVATE_KEY_FILE"
    [ -f "$PUBLIC_KEY_FILE" ] && echo "   - $PUBLIC_KEY_FILE"
    echo ""
    read -p "是否覆盖现有密钥文件? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "❌ 操作已取消"
        exit 1
    fi
fi

echo "📝 生成 ${KEY_SIZE} 位 RSA 密钥对..."

# 生成私钥
echo "🔐 生成私钥..."
openssl genpkey -algorithm RSA -out "$PRIVATE_KEY_FILE" -pkcs8 -aes256 \
    -pass pass:"$LICENSE_PRIVATE_KEY_PASSPHRASE"

if [ $? -ne 0 ]; then
    echo "❌ 私钥生成失败"
    exit 1
fi

# 生成公钥
echo "🔓 生成公钥..."
openssl rsa -pubout -in "$PRIVATE_KEY_FILE" -out "$PUBLIC_KEY_FILE" \
    -passin pass:"$LICENSE_PRIVATE_KEY_PASSPHRASE"

if [ $? -ne 0 ]; then
    echo "❌ 公钥生成失败"
    exit 1
fi

# 设置文件权限
chmod 600 "$PRIVATE_KEY_FILE"
chmod 644 "$PUBLIC_KEY_FILE"

echo ""
echo "✅ 密钥对生成成功!"
echo "📁 文件位置:"
echo "   私钥: $PRIVATE_KEY_FILE"
echo "   公钥: $PUBLIC_KEY_FILE"

echo ""
echo "🔒 安全提示:"
echo "   1. 私钥文件已设置为仅所有者可读 (权限: 600)"
echo "   2. 请妥善保管私钥文件与口令，不要写入仓库或公开文档"
echo "   3. 生产环境部署时只需要公钥文件"
echo "   4. 定期备份密钥文件到安全位置"
echo "   5. 推荐用法: LICENSE_PRIVATE_KEY_PASSPHRASE='...' ./scripts/tools/generate-keypair.sh"

echo ""
echo "📋 下一步操作:"
echo "   1. 使用私钥生成许可证文件:"
echo "      node scripts/generate-license.js --customer \"客户名\""
echo "   2. 部署时将公钥文件和许可证文件复制到目标服务器"
echo "   3. 私钥文件仅在许可证生成时使用，不要部署到生产环境"

# 验证密钥对
echo ""
echo "🔍 验证密钥对..."
echo "test-data" | openssl rsautl -sign -inkey "$PRIVATE_KEY_FILE" -passin pass:"$LICENSE_PRIVATE_KEY_PASSPHRASE" | \
openssl rsautl -verify -inkey "$PUBLIC_KEY_FILE" -pubin > /dev/null

if [ $? -eq 0 ]; then
    echo "✅ 密钥对验证成功"
else
    echo "❌ 密钥对验证失败"
    exit 1
fi

echo ""
echo "🎉 密钥生成完成!"
