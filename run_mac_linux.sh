#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
python3 -m http.server 8080 &
server_pid=$!
cleanup() { kill "$server_pid" 2>/dev/null || true; }
trap cleanup EXIT INT TERM
sleep 1
if command -v open >/dev/null 2>&1; then
  open http://127.0.0.1:8080 || true
elif command -v xdg-open >/dev/null 2>&1; then
  xdg-open http://127.0.0.1:8080 >/dev/null 2>&1 || true
fi
wait "$server_pid"
