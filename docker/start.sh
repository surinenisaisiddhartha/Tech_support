#!/usr/bin/env bash
set -euo pipefail

# Render provides $PORT for the single listening port.
# Generate nginx config from template with the provided PORT.
export PORT=${PORT:-8080}

envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Show generated config
cat /etc/nginx/conf.d/default.conf

# Start supervisor which launches backend, frontend, and nginx
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
