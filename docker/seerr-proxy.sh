#!/bin/sh
# Proxies /seerr/ to the Seerr at $SEERR_URL so the client can use its cookie session
# without CORS. Skipped when SEERR_URL is unset.
set -e
[ -n "$SEERR_URL" ] || exit 0
cat > /etc/nginx/seerr.conf <<CONF
location /seerr/ {
  proxy_pass ${SEERR_URL%/}/;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
}
CONF
