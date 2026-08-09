#!/usr/bin/env bash
set -euo pipefail

SOURCE_DIR="/Users/csilvasantin/Documents/RooS/admira-academy/tools"
SOURCE="$SOURCE_DIR/com.admira.smith-capsule.plist"
TARGET="/Users/csilvasantin/Library/LaunchAgents/com.admira.smith-capsule.plist"
RUNTIME_DIR="/Users/csilvasantin/Library/Application Support/Admira/SmithCapsule"
DOMAIN="gui/$(id -u)"

/usr/bin/plutil -lint "$SOURCE" >/dev/null
/bin/mkdir -p "$RUNTIME_DIR"
/usr/bin/install -m 0755 "$SOURCE_DIR/run-smith-capsule.sh" "$RUNTIME_DIR/run-smith-capsule.sh"
/usr/bin/install -m 0755 "$SOURCE_DIR/smith-capsule.mjs" "$RUNTIME_DIR/smith-capsule.mjs"
/usr/bin/install -m 0644 "$SOURCE" "$TARGET"
/bin/launchctl bootout "$DOMAIN/com.admira.smith-capsule" 2>/dev/null || true
/bin/launchctl bootstrap "$DOMAIN" "$TARGET"
/bin/launchctl enable "$DOMAIN/com.admira.smith-capsule"
/bin/launchctl kickstart -k "$DOMAIN/com.admira.smith-capsule"
printf 'Smith cápsulas instalado · cada 30 s · %s\n' "$TARGET"
