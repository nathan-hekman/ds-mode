#!/usr/bin/env bash
# Install repo-local git hooks into .git/hooks/.
# Run once per clone — hooks live outside the working tree and don't survive
# a fresh `git clone`, so this script restores them.
set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
SRC="$REPO/scripts/hooks"
DST="$REPO/.git/hooks"

if [ ! -d "$SRC" ]; then
  echo "install-git-hooks: $SRC missing — nothing to install"
  exit 1
fi

mkdir -p "$DST"

for hook in "$SRC"/*; do
  [ -f "$hook" ] || continue
  name="$(basename "$hook")"
  cp "$hook" "$DST/$name"
  chmod +x "$DST/$name"
  echo "installed: .git/hooks/$name"
done

echo "install-git-hooks: done"
