#!/usr/bin/env bash
#
# DS Mode installer — local clone path
#
# Default: install the plugin (copies into ~/.claude/plugins/), wire hooks,
#          install statusline element, set default mode to `full`.
# Flags:
#   --minimal       Plugin install only (no hooks, no statusline tweak).
#   --plugin-only   Same as --minimal — explicit name parity with caveman.
#   --dry-run       Print planned actions, write nothing.
#   --force         Re-run even if files already exist.
#   --default-mode <mode>  Set DS_MODE_DEFAULT in ~/.zshenv / ~/.bashrc.
#   --help|-h       Print this help and exit.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
FLAG_FILE="$CLAUDE_DIR/.ds-mode-active"
PLUGINS_DIR="$CLAUDE_DIR/plugins/marketplaces/ds-mode"

MINIMAL=0
DRY=0
FORCE=0
DEFAULT_MODE="full"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --minimal|--plugin-only) MINIMAL=1; shift ;;
    --dry-run) DRY=1; shift ;;
    --force) FORCE=1; shift ;;
    --default-mode) DEFAULT_MODE="$2"; shift 2 ;;
    --help|-h)
      sed -n '2,/^set -e/p' "$0" | sed 's/^# \{0,1\}//;/^set -e/d'
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

case "$DEFAULT_MODE" in lite|full|visual) ;; *)
  echo "Error: --default-mode must be lite | full | visual" >&2; exit 1 ;; esac

run() {
  if [[ "$DRY" -eq 1 ]]; then printf 'DRY: %s\n' "$*"; else eval "$@"; fi
}

echo "DS Mode installer"
echo "  source:  $SCRIPT_DIR"
echo "  target:  $CLAUDE_DIR"
echo "  mode default: $DEFAULT_MODE"
echo

# 1. Mirror repo into plugins dir (caveman-style local install).
run "mkdir -p \"$(dirname "$PLUGINS_DIR")\""
if [[ -d "$PLUGINS_DIR" && "$FORCE" -ne 1 ]]; then
  echo "  ! $PLUGINS_DIR already exists — pass --force to overwrite"
  exit 1
fi
run "rm -rf \"$PLUGINS_DIR\""
run "cp -R \"$SCRIPT_DIR\" \"$PLUGINS_DIR\""
echo "  ✓ plugin copied to $PLUGINS_DIR"

# 2. Strip stale outputStyle from settings.json (defensive cleanup).
if [[ -f "$SETTINGS_FILE" ]]; then
  if [[ "$DRY" -eq 1 ]]; then
    printf 'DRY: cp "%s" "%s.bak.preDSmode"\n' "$SETTINGS_FILE" "$SETTINGS_FILE"
    printf 'DRY: python3 strip stale outputStyle (DS Mode | Dipsh*t Mode | ds-mode) from %s\n' "$SETTINGS_FILE"
  else
    cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak.preDSmode"
    python3 - "$SETTINGS_FILE" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
try:
    data = json.loads(p.read_text())
except json.JSONDecodeError:
    print("  ! settings.json invalid JSON — skipping cleanup", file=sys.stderr)
    sys.exit(0)
stale_values = {"DS Mode", "Dipsh*t Mode", "ds-mode"}
val = data.get("outputStyle")
if isinstance(val, str) and val in stale_values:
    del data["outputStyle"]
    p.write_text(json.dumps(data, indent=2) + "\n")
    print(f"  ✓ removed stale outputStyle={val!r} from settings.json")
PY
  fi
fi

# 3. Write flag file with the chosen default.
run "echo \"$DEFAULT_MODE\" > \"$FLAG_FILE\""
echo "  ✓ wrote $FLAG_FILE = $DEFAULT_MODE"

# 4. Add DS_MODE_DEFAULT export (so future sessions inherit).
if [[ "$MINIMAL" -ne 1 ]]; then
  for rc in "$HOME/.zshenv" "$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile"; do
    [[ -f "$rc" ]] || continue
    if ! grep -q 'DS_MODE_DEFAULT' "$rc" 2>/dev/null; then
      run "echo 'export DS_MODE_DEFAULT=\"$DEFAULT_MODE\"' >> \"$rc\""
      echo "  ✓ added DS_MODE_DEFAULT=$DEFAULT_MODE to $rc"
    fi
  done
fi

cat <<EOF

Installed.

Next steps:
  - Restart Claude Code (or open a new session) — the SessionStart hook
    will inject the DS Mode ruleset.
  - Toggle in any session:
      /dsm           activate at default ($DEFAULT_MODE)
      /dsm lite|full|visual
      /dsm off       disable for this session

Statusline:
  Claude Code's statusline (configurable in settings.json) can pick up
  the DS Mode chip via:
      $PLUGINS_DIR/hooks/ds-mode-statusline.sh

Docs: $SCRIPT_DIR/INSTALL.md
EOF
