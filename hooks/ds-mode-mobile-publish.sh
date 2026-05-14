#!/usr/bin/env bash
# ds-mode-mobile-publish.sh — fire-and-forget publish to the private mobile repo.
#
# Usage:
#   ds-mode-mobile-publish.sh <path-to-png>
#
# Reads $CLAUDE_CONFIG_DIR/.ds-mode-mobile for the repo + clone path.
# Copies the PNG into the clone, commits, pushes. Quiet-fails on every
# step — a missed publish leaves the local file intact and a 404 at the
# URL until the user re-runs (the next stamp will re-attempt).
#
# Logs go to $CLAUDE_CONFIG_DIR/.ds-mode-mobile.log (last failure stays
# around for debugging).
set -uo pipefail

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
CONFIG_FILE="$CLAUDE_DIR/.ds-mode-mobile"
LOG_FILE="$CLAUDE_DIR/.ds-mode-mobile.log"
PNG_PATH="${1:-}"

log() { printf '[%s] %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >> "$LOG_FILE" 2>/dev/null || true; }

if [[ -z "$PNG_PATH" || ! -f "$PNG_PATH" ]]; then
  log "skip: missing PNG arg"; exit 0
fi
if [[ ! -f "$CONFIG_FILE" ]]; then
  log "skip: no mobile config"; exit 0
fi

# Pull enabled / clone_path with a tiny node one-liner; avoids the jq dep.
ENABLED=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8')).enabled?'1':'0')}catch(e){console.log('0')}" 2>/dev/null || echo 0)
CLONE_PATH=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8')).clone_path||'')}catch(e){console.log('')}" 2>/dev/null || echo '')

if [[ "$ENABLED" != "1" ]]; then
  log "skip: mobile disabled"; exit 0
fi
if [[ -z "$CLONE_PATH" || ! -d "$CLONE_PATH/.git" ]]; then
  log "skip: clone path missing ($CLONE_PATH)"; exit 0
fi

BASENAME="$(basename "$PNG_PATH")"
DEST="$CLONE_PATH/$BASENAME"

cp "$PNG_PATH" "$DEST" || { log "fail: cp"; exit 0; }
cd "$CLONE_PATH" || { log "fail: cd"; exit 0; }

git add -- "$BASENAME" >>"$LOG_FILE" 2>&1 || { log "fail: git add"; exit 0; }
# --quiet keeps the (background) child silent; ignore failure if there's
# nothing to commit (idempotent re-publish).
if ! git commit --quiet -m "ds-mode: publish $BASENAME" >>"$LOG_FILE" 2>&1; then
  log "skip: nothing to commit (already in repo?)"
fi

if ! git push --quiet >>"$LOG_FILE" 2>&1; then
  log "fail: git push (image saved locally; URL will 404 until next push)"
  exit 0
fi

log "ok: pushed $BASENAME"
exit 0
