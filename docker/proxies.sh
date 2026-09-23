#!/bin/sh
# Writes the same-origin proxies nginx.conf includes: /seerr/ to the Seerr at $SEERR_URL so the
# client can use its cookie session without CORS, and a read-only /sonarr/ to $SONARR_URL with
# $SONARR_API_KEY added here, open only to requests carrying a Seerr session. Each is skipped
# when its variables are unset.
set -e
: > /etc/nginx/proxies.conf
[ -z "$SEERR_URL" ] || cat >> /etc/nginx/proxies.conf <<CONF
location /seerr/ {
  proxy_pass ${SEERR_URL%/}/;
  proxy_ssl_server_name on;
  proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
  proxy_set_header X-Forwarded-Proto \$scheme;
}
location = /seerr-session {
  internal;
  proxy_pass ${SEERR_URL%/}/api/v1/auth/me;
  proxy_ssl_server_name on;
  proxy_pass_request_body off;
  proxy_set_header Content-Length "";
}
CONF
[ -z "$SONARR_URL" ] || [ -z "$SONARR_API_KEY" ] || [ -z "$SEERR_URL" ] || cat >> /etc/nginx/proxies.conf <<CONF
location ~ ^/sonarr/api/v3/(system/status|series/[0-9]+|episode|queue)$ {
  limit_except GET { deny all; }
  auth_request /seerr-session;
  rewrite ^/sonarr(/.*)$ \$1 break;
  proxy_pass ${SONARR_URL%/};
  proxy_ssl_server_name on;
  proxy_set_header X-Api-Key "${SONARR_API_KEY}";
  proxy_set_header Cookie "";
}
CONF
