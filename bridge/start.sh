#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Namesti Node.js: https://nodejs.org"
  exit 1
fi
echo "Most išče releje v omrežju. To okno pusti odprto."
exec node ./server.mjs
