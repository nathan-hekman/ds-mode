#!/usr/bin/env bash
#
# DS Mode — Claude Code one-liner installer
#
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
#
# Clones the repo to a temp dir and runs install.sh. Idempotent — re-runs
# are safe with --force.
#
set -euo pipefail

readonly REPO="nathan-hekman/ds-mode"
readonly BRANCH="${DS_MODE_BRANCH:-main}"

echo "DS Mode → Claude Code"
echo "  cloning $REPO@$BRANCH"

TMP_DIR="$(mktemp -d -t ds-mode-XXXXXX)"
trap 'rm -rf "$TMP_DIR"' EXIT

git clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" "$TMP_DIR/repo"
"$TMP_DIR/repo/install.sh" --force "$@"

echo
echo "Done. Restart Claude Code — DS Mode is active automatically. /ds-mode off to disable."
