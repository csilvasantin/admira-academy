#!/usr/bin/env bash
set -euo pipefail

SOURCE="/Users/csilvasantin/Documents/RooS/admira-academy/tools/com.admira.smith-capsule.plist"
TARGET="/Users/csilvasantin/Library/LaunchAgents/com.admira.smith-capsule.plist"
DOMAIN="gui/$(id -u)"

/usr/bin/plutil -lint "$SOURCE" >/dev/null
/usr/bin/install -m 0644 "$SOURCE" "$TARGET"
/bin/launchctl bootout "$DOMAIN/com.admira.smith-capsule" 2>/dev/null || true
/bin/launchctl bootstrap "$DOMAIN" "$TARGET"
/bin/launchctl enable "$DOMAIN/com.admira.smith-capsule"
/bin/launchctl kickstart -k "$DOMAIN/com.admira.smith-capsule"
printf 'Smith cápsulas instalado · cada 5 min · %s\n' "$TARGET"
