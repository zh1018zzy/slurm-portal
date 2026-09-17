#!/bin/bash
# 将 NSS 从 libnss-ldap(直连/匿名) 切换到 libnss-ldapd(经 nslcd + binddn)
# 修复普通用户 getpwuid 失败 → WebShell "I have no name!"
set -euo pipefail
exec > /opt/my-hpcapp/deploy/fix-nss-ldapd.out 2>&1
echo "===== START $(date) ====="

echo '--- before ---'
getent passwd demo_user | head -1 || true
runuser -u demo_user -- getent passwd demo_user || echo 'demo_user lookup as self: FAIL'

export DEBIAN_FRONTEND=noninteractive
# 安装 libnss-ldapd；与 libnss-ldap 冲突时移除旧包
apt-get install -y libnss-ldapd 2>&1 | tail -20

# 确保 nsswitch 仍包含 ldap（debconf 可能改过）
if ! grep -qE '^passwd:.*ldap' /etc/nsswitch.conf; then
  sed -i 's/^passwd:.*/passwd:         files systemd ldap/' /etc/nsswitch.conf
  sed -i 's/^group:.*/group:          files systemd ldap/' /etc/nsswitch.conf
  sed -i 's/^shadow:.*/shadow:         files systemd ldap/' /etc/nsswitch.conf
fi

systemctl enable nslcd 2>/dev/null || true
systemctl restart nslcd
systemctl restart nscd 2>/dev/null || true
nscd -i passwd 2>/dev/null || true
nscd -i group 2>/dev/null || true
sleep 1

echo '--- packages ---'
dpkg -l | grep -E 'libnss-ldap|nslcd' || true
ls -l /lib/x86_64-linux-gnu/libnss_ldap.so.2 || true
echo '--- after root ---'
getent passwd demo_user | head -1
getent group 2000 | head -1
echo '--- after as demo_user ---'
runuser -u demo_user -- getent passwd demo_user || echo FAIL_passwd
runuser -u demo_user -- getent group 2000 || echo FAIL_group
runuser -u demo_user -- id
runuser -u demo_user -- whoami
runuser -l demo_user -c 'echo PS_USER=$(whoami); id'
echo "===== DONE $(date) ====="
