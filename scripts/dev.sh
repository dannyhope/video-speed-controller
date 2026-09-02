#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOMAIN="$(tr -d '[:space:]' < "$ROOT/.local-domain")"
PORT="$(tr -d '[:space:]' < "$ROOT/.dev-port")"

bash "$ROOT/scripts/ensure-local-domain.sh"
exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$ROOT"
