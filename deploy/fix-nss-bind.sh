#!/bin/bash
# 为 libnss-ldap 配置 binddn，使非 root 也能解析 LDAP 用户
set -euo pipefail
exec > /opt/my-hpcapp/deploy/fix-nss-bind.out 2>&1
echo "===== START $(date) ====="

LDAP_CONF=/etc/ldap.conf
BACKUP=/etc/ldap.conf.bak.webshell.$(date +%s)
cp -a "$LDAP_CONF" "$BACKUP"
echo "backup: $BACKUP"

# 从 nslcd.conf 读取已有 bind 信息
BINDDN=$(awk '/^binddn /{print $2; exit}' /etc/nslcd.conf)
BINDPW=$(awk '/^bindpw /{print $2; exit}' /etc/nslcd.conf)
URI=$(awk '/^uri /{print $2; exit}' /etc/nslcd.conf)
BASE=$(awk '/^base /{print $2; exit}' /etc/nslcd.conf)
echo "binddn=$BINDDN uri=$URI base=$BASE"

# 写入/更新 ldap.conf 中的 binddn/bindpw（供非 root NSS 使用）
# 去掉仅 root 可用的 rootbinddn 依赖路径问题：同时保留 rootbinddn
tmp=$(mktemp)
grep -vE '^(binddn|bindpw|rootbinddn)\s' "$LDAP_CONF" > "$tmp" || true
{
  cat "$tmp"
  echo "binddn $BINDDN"
  echo "bindpw $BINDPW"
  echo "rootbinddn $BINDDN"
} > "$LDAP_CONF"
rm -f "$tmp"
# libnss-ldap 的 root 密码文件
echo -n "$BINDPW" > /etc/ldap.secret
chmod 600 /etc/ldap.secret

echo '--- ldap.conf effective ---'
grep -vE '^\s*#|^\s*$' "$LDAP_CONF"

# 刷新缓存
systemctl restart nscd 2>/dev/null || true
nscd -i passwd 2>/dev/null || true
nscd -i group 2>/dev/null || true
sleep 1

echo '--- as root ---'
getent passwd demo_user | head -1
getent group 2000 | head -1
getent group 500 | head -1

echo '--- as demo_user ---'
runuser -u demo_user -- getent passwd demo_user || echo FAIL_passwd
runuser -u demo_user -- getent group 2000 || echo FAIL_group2000
runuser -u demo_user -- getent group 500 || echo FAIL_group500
runuser -u demo_user -- id
runuser -u demo_user -- whoami
runuser -l demo_user -c 'whoami; id; echo HOME=$HOME'

echo "===== DONE $(date) ====="
