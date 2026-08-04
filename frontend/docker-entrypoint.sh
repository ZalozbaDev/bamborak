#!/bin/sh

set -e

cat <<EOF > /usr/share/nginx/html/config.js
window.RUNTIME_CONFIG = {
  VITE_URL: "${VITE_URL}",
  VITE_URL_RAG: "${VITE_URL_RAG}"
};
EOF

exec nginx -g "daemon off;"
