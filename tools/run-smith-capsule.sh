#!/usr/bin/env bash
set -euo pipefail

LOCK_DIR="/tmp/admira-smith-capsule.lock"
RUNNER="/Users/csilvasantin/Library/Application Support/Admira/SmithCapsule/smith-capsule.mjs"

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

/opt/homebrew/bin/node "$RUNNER"
