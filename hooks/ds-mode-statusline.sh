#!/usr/bin/env bash
# ds-mode-statusline.sh — emit a "DS" chip when DS Mode is active.
# Empty output when off / flag missing so the statusline collapses.

claude_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
flag="$claude_dir/.ds-mode-active"

if [[ -f "$flag" ]]; then
  printf "DS"
fi
