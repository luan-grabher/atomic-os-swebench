#!/usr/bin/env bash
# install-unify-sync.sh — set up the cross-machine inbound sync on THIS machine.
# Installs a launchd agent (macOS) or cron entry (linux) that runs atomic-sync.sh every 2 min, so the
# canonical atomic stays current for every CLI agent here without touching the launcher immune system.
# Idempotent. Run once per machine. (Single-machine propagation is already live via shared source +
# the launcher's dist self-rebuild; this adds the cross-machine git pull.)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC="${HERE}/atomic-sync.sh"
[ -f "${SYNC}" ] || { echo "atomic-sync.sh not found at ${SYNC}"; exit 1; }

case "$(uname -s)" in
  Darwin)
    PLIST="${HOME}/Library/LaunchAgents/com.atomic.unify-sync.plist"
    mkdir -p "${HOME}/Library/LaunchAgents"
    cat > "${PLIST}" <<PL
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.atomic.unify-sync</string>
  <key>ProgramArguments</key>
  <array><string>/bin/bash</string><string>${SYNC}</string></array>
  <key>StartInterval</key><integer>120</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardErrorPath</key><string>/tmp/atomic-unify-sync.log</string>
  <key>StandardOutPath</key><string>/tmp/atomic-unify-sync.log</string>
</dict>
</plist>
PL
    launchctl unload "${PLIST}" 2>/dev/null || true
    launchctl load "${PLIST}" && echo "launchd agent com.atomic.unify-sync loaded (every 120s)"
    ;;
  Linux)
    LINE="*/2 * * * * /bin/bash ${SYNC} >/dev/null 2>&1"
    ( crontab -l 2>/dev/null | grep -v "atomic-sync.sh"; echo "${LINE}" ) | crontab - \
      && echo "cron entry installed (every 2 min)"
    ;;
  *) echo "unsupported OS; run ${SYNC} from your own scheduler"; exit 1 ;;
esac
