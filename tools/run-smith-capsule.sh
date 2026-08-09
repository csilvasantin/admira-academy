#!/usr/bin/env bash
set -euo pipefail

LOCK_DIR="/tmp/admira-smith-capsule.lock"
RUNNER="/Users/csilvasantin/Documents/RooS/admira-academy/tools/smith-capsule.mjs"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

exec /usr/bin/env node "$RUNNER"
