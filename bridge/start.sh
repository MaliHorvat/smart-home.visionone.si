#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js ni nameščen."
  exit 1
fi
echo "Zaganjam SmartHome most..."
exec node bridge/server.mjs
