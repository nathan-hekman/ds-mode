#!/usr/bin/env bash
#
# DS Mode installer — local clone path
#
# Default: register the marketplace + install the plugin via Claude Code's
#          plugin manager, then set default mode to `full` and export
#          DS_MODE_DEFAULT in your shell rc.
# Flags:
#   --minimal       Plugin install only (skip shell rc export).
#   --plugin-only   Same as --minimal — explicit name parity with caveman.
#   --dry-run       Print planned actions; write nothing.
#   --force         Re-run even if the plugin reports already installed.
#   --default-mode <mode>  Set DS_MODE_DEFAULT (lite | full | visual). Default: full.
#   --help|-h       Print this help and exit.
#
# Requires:
#   - claude CLI on PATH (Claude Code installs this at ~/.local/bin/claude or similar)
#   - git (claude plugin marketplace add clones the repo)
#
set -euo pipefail

REPO="nathan-hekman/ds-mode"
MARKETPLACE_NAME="ds-mode"
PLUGIN_NAME="ds-mode"

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
FLAG_FILE="$CLAUDE_DIR/.ds-mode-active"

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

if ! command -v claude >/dev/null 2>&1; then
  echo "Error: 'claude' CLI not found on PATH. Install Claude Code first." >&2
  exit 1
fi

run() {
  if [[ "$DRY" -eq 1 ]]; then printf 'DRY: %s\n' "$*"; else eval "$@"; fi
}

echo "DS Mode installer"
echo "  target:       $CLAUDE_DIR"
echo "  mode default: $DEFAULT_MODE"
echo "  repo:         github:$REPO"
echo

# 1. Register the marketplace with Claude Code (writes known_marketplaces.json).
already_market=0
if claude plugin marketplace list 2>/dev/null | grep -q "^[[:space:]]*$MARKETPLACE_NAME\b"; then
  already_market=1
fi
if [[ "$already_market" -eq 1 && "$FORCE" -ne 1 ]]; then
  echo "  · marketplace '$MARKETPLACE_NAME' already registered (use --force to re-add)"
else
  run "claude plugin marketplace add \"$REPO\""
  echo "  ✓ registered marketplace: $MARKETPLACE_NAME"
fi

# 2. Install the plugin (writes installed_plugins.json + clones into plugins/cache/).
already_plugin=0
if claude plugin list 2>/dev/null | grep -q "$PLUGIN_NAME@$MARKETPLACE_NAME"; then
  already_plugin=1
fi
if [[ "$already_plugin" -eq 1 && "$FORCE" -ne 1 ]]; then
  echo "  · plugin '$PLUGIN_NAME@$MARKETPLACE_NAME' already installed (use --force to reinstall)"
else
  run "claude plugin install \"$PLUGIN_NAME@$MARKETPLACE_NAME\""
  echo "  ✓ installed plugin: $PLUGIN_NAME@$MARKETPLACE_NAME"
fi

# 3. Strip stale outputStyle from settings.json (defensive cleanup for v1 → v2 migration).
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

# 4. Write flag file with the chosen default.
run "echo \"$DEFAULT_MODE\" > \"$FLAG_FILE\""
echo "  ✓ wrote $FLAG_FILE = $DEFAULT_MODE"

# 5. Add DS_MODE_DEFAULT export (so future sessions inherit), unless --minimal.
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
    will inject the DS Mode ruleset, and DS Mode will appear in the
    plugin list (\`/plugin list\` or the desktop plugin UI).
  - Toggle in any session:
      /dsm           activate at default ($DEFAULT_MODE)
      /dsm lite|full|visual
      /dsm off       disable for this session

Statusline:
  Claude Code's statusline (configurable in settings.json) can pick up
  the DS Mode chip via the hook script at:
      \$(claude plugin list --json 2>/dev/null | python3 -c 'import json,sys; [print(p["installPath"]+"/hooks/ds-mode-statusline.sh") for p in json.load(sys.stdin) if p.get("name")=="ds-mode"]')

Docs:
  https://github.com/$REPO/blob/main/INSTALL.md
EOF
