#!/usr/bin/env bash
# ds-mode-statusline.sh — emit a "DS:<mode>" chip when DS Mode is active.
# Empty output when mode is off / flag missing so the statusline collapses.

claude_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
flag="$claude_dir/.ds-mode-active"

if [[ -f "$flag" ]]; then
  mode="$(tr -d '[:space:]' < "$flag")"
  case "$mode" in
    lite|full|visual) printf "DS:%s" "$mode" ;;
    *) ;;
  esac
fi
