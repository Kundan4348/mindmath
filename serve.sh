#!/usr/bin/env bash
# Serve MindMath locally on a secure (localhost) origin so the service worker and install work.
PORT="${1:-8098}"
DIR="$(cd "$(dirname "$0")" && pwd)"
echo "MindMath → http://localhost:${PORT}"
exec python3 -m http.server "${PORT}" --bind 127.0.0.1 --directory "${DIR}"
