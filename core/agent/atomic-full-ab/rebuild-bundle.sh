#!/usr/bin/env bash
# Regenerate the COMPLETE atomic bundle from the canonical core/atomic-edit engine.
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Syncing canonical core/atomic-edit to pkg/atomic-edit..."
rsync -a --delete \
  --exclude 'node_modules' \
  --exclude '.atomic' \
  --exclude '.codex' \
  --exclude '.git' \
  --exclude '.self-evolution-harness-*.json' \
  --exclude 'typescript-language-server501' \
  "$HERE/../../atomic-edit/" "$HERE/pkg/atomic-edit/"

tar -czf "$HERE/../atomic-full-bundle.tgz" -C "$HERE/pkg" atomic-edit
echo "wrote $HERE/../atomic-full-bundle.tgz ($(du -h "$HERE/../atomic-full-bundle.tgz" | cut -f1))"

