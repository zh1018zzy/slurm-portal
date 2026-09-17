#!/bin/bash
set -euo pipefail
CONF_SRC=/opt/my-hpcapp/deploy/nginx-default-with-webshell.conf
TARGET=/etc/nginx/sites-enabled/default
BACKUP=/etc/nginx/sites-available/default.bak.$(date +%Y%m%d%H%M%S)
cp -a "$TARGET" "$BACKUP"
cp "$CONF_SRC" "$TARGET"
nginx -t
systemctl reload nginx
echo "OK: nginx webshell /socket.io proxy applied (backup: $BACKUP)"
echo "--- probe ---"
curl -sS -m 3 'http://127.0.0.1:3001/socket.io/?EIO=4&transport=polling' | head -c 160; echo
curl -sS -m 3 'http://127.0.0.1:3000/socket.io/?EIO=4&transport=polling' | head -c 160; echo
curl -sS -m 3 'http://127.0.0.1/socket.io/?EIO=4&transport=polling' | head -c 160; echo
