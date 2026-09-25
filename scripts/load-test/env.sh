#!/usr/bin/env bash
# Variables para la prueba de carga local — ver README.md de esta carpeta.
# Uso (Git Bash, desde la raíz del repo): source scripts/load-test/env.sh
#
# Pisa lo de .env.local solo en esta terminal: la app, la siembra y el
# generador de carga apuntan al mock de Upstash, y todos los secretos son
# DE PRUEBA (se generan una vez en out/secrets.sh, que git ignora). Mercado
# Pago y Blob quedan vacíos para que nada salga a un servicio real.
LOAD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$LOAD_DIR/out"
if [ ! -f "$LOAD_DIR/out/secrets.sh" ]; then
  {
    echo "export CASE_SECRET_KEY=$(node -e 'console.log(require("crypto").randomBytes(32).toString("base64"))')"
    echo "export AUTH_SECRET=load-test-$(node -e 'console.log(require("crypto").randomBytes(16).toString("hex"))')"
  } > "$LOAD_DIR/out/secrets.sh"
fi
# shellcheck disable=SC1091
source "$LOAD_DIR/out/secrets.sh"

export UPSTASH_REDIS_REST_URL=http://127.0.0.1:8079
export UPSTASH_REDIS_REST_TOKEN=mock
export KV_REST_API_URL=
export KV_REST_API_TOKEN=
export CRON_SECRET=load-test-cron
export ADMIN_BACKUP_CODE=load-test-backup
export MP_ACCESS_TOKEN=
export MP_WEBHOOK_SECRET=
export BLOB_READ_WRITE_TOKEN=
export NEXT_TELEMETRY_DISABLED=1
echo "Prueba de carga: Upstash → $UPSTASH_REDIS_REST_URL (mock local), secretos de prueba cargados."
