#!/usr/bin/env bash
# atomic-sync.sh — the ABSOLUTE-UNIFICATION inbound sync.
#
# Pulls the canonical atomic from origin/master so EVERY consumer that runs this — every CLI agent's
# MCP launch (the single launcher chokepoint), the benchmark run-ab.sh, a SessionStart hook — runs the
# latest committed atomic. One source, everywhere. The launcher's own dist self-rebuild then compiles
# any pulled .ts change, so the running server reflects it.
#
# DESIGN: fully best-effort and SAFE — it must NEVER block, hang, or corrupt a launch:
#   - only when on `master` AND the working tree is clean (never clobbers local/uncommitted work),
#   - fast-forward only (never creates merge commits / conflicts),
#   - bounded network budget (~10s) via a background-fetch + watchdog (macOS has no `timeout`),
#   - rate-limited (skips if synced < 300s ago) so it doesn't hammer the network every launch,
#   - all failures swallowed (offline / air-gapped = silent no-op),
#   - opt-out with ATOMIC_NO_SELFSYNC=1.
set +e
[ "${ATOMIC_NO_SELFSYNC:-0}" = "1" ] && exit 0

REPO_ROOT="${ATOMIC_SYNC_REPO_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." 2>/dev/null && pwd)}"
[ -d "${REPO_ROOT}/.git" ] || exit 0
cd "${REPO_ROOT}" 2>/dev/null || exit 0

# self-install the outbound auto-publish hook (so improvements propagate to master automatically)
if [ -f "${REPO_ROOT}/.githooks/post-commit" ] && [ "$(git config core.hooksPath 2>/dev/null)" != ".githooks" ]; then
  git config core.hooksPath .githooks 2>/dev/null
fi

# rate-limit: skip if we synced in the last 5 minutes
STAMP="${REPO_ROOT}/.atomic/.atomic-sync-stamp"
mkdir -p "${REPO_ROOT}/.atomic" 2>/dev/null
if [ -f "${STAMP}" ]; then
  now=$(date +%s 2>/dev/null || echo 0); then_=$(cat "${STAMP}" 2>/dev/null || echo 0)
  [ $((now - then_)) -lt 300 ] 2>/dev/null && exit 0
fi
date +%s > "${STAMP}" 2>/dev/null

# only sync a clean master (never clobber local/feature work)
br="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo)"
[ "${br}" = "master" ] || exit 0
git diff --quiet 2>/dev/null || exit 0
git diff --cached --quiet 2>/dev/null || exit 0

# bounded fetch (~10s watchdog), then fast-forward only
( git fetch --quiet origin master 2>/dev/null ) & fpid=$!
( sleep 10; kill -9 "$fpid" 2>/dev/null ) & wpid=$!
wait "$fpid" 2>/dev/null; kill -9 "$wpid" 2>/dev/null; wait "$wpid" 2>/dev/null

before="$(git rev-parse HEAD 2>/dev/null)"
git merge --ff-only --quiet origin/master 2>/dev/null
after="$(git rev-parse HEAD 2>/dev/null)"

if [ -n "${before}" ] && [ "${before}" != "${after}" ]; then
  # source advanced — rebuild dist so the running/next server reflects it (best-effort)
  PKG="${REPO_ROOT}/core/atomic-edit"
  if [ -f "${PKG}/build.mjs" ]; then
    node="$(command -v node || echo /opt/homebrew/bin/node)"
    ( cd "${PKG}" && "${node}" build.mjs >/dev/null 2>&1 ) || true
  fi
  echo "atomic-sync: ${before:0:8} -> ${after:0:8} (pulled + rebuilt)" >&2
fi
exit 0
