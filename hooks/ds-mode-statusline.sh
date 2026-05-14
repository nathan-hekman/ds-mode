#!/usr/bin/env bash
# ds-mode-statusline.sh — emit a "DS:<mode>" chip when DS Mode is active.
# Appends "↑" when an update has been detected for the plugin.
# Empty output when off / flag missing so the statusline collapses.

claude_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
flag="$claude_dir/.ds-mode-active"
update_flag="$claude_dir/.ds-mode-update-available"

if [[ -f "$flag" ]]; then
  mode="$(tr -d '[:space:]' < "$flag")"
  case "$mode" in
    lite|full)
      printf "DS:%s" "$mode"
      [[ -f "$update_flag" ]] && printf " ↑"
      ;;
    *) ;;
  esac
fi
