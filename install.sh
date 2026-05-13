#!/usr/bin/env bash
#
# DS Mode installer
#
# Usage:
#   ./install.sh                # copy files only — activate per-session with /dsm
#   ./install.sh --permanent    # also set DS Mode as the default output style
#                                 (writes "outputStyle": "DS Mode" into ~/.claude/settings.json)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
STYLES_DIR="$CLAUDE_DIR/output-styles"
COMMANDS_DIR="$CLAUDE_DIR/commands"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
PERMANENT=0

for arg in "$@"; do
  case "$arg" in
    --permanent|-p) PERMANENT=1 ;;
    --help|-h)
      cat <<'HELP'
DS Mode installer

Usage:
  ./install.sh                # copy files only — activate per-session with /dsm
  ./install.sh --permanent    # also set DS Mode as the default output style
                                (writes "outputStyle": "DS Mode" into ~/.claude/settings.json)
HELP
      exit 0
      ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

echo "DS Mode installer"
echo "  source:  $SCRIPT_DIR"
echo "  target:  $CLAUDE_DIR"
echo

if [[ ! -f "$SCRIPT_DIR/output-styles/ds-mode.md" ]]; then
  echo "Error: source files not found. Run from inside the cloned repo." >&2
  exit 1
fi

mkdir -p "$STYLES_DIR" "$COMMANDS_DIR"

cp -v "$SCRIPT_DIR/output-styles/ds-mode.md" "$STYLES_DIR/ds-mode.md"
cp -v "$SCRIPT_DIR/commands/ds-mode.md"      "$COMMANDS_DIR/ds-mode.md"
cp -v "$SCRIPT_DIR/commands/dsm.md"          "$COMMANDS_DIR/dsm.md"

if [[ "$PERMANENT" -eq 1 ]]; then
  echo
  echo "Setting DS Mode as default output style in $SETTINGS_FILE..."
  python3 - "$SETTINGS_FILE" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
data = {}
if p.exists():
    try:
        data = json.loads(p.read_text())
    except json.JSONDecodeError:
        print(f"Error: {p} is not valid JSON. Refusing to overwrite.", file=sys.stderr)
        sys.exit(1)
if data.get("outputStyle") == "DS Mode":
    print(f"  already set — no change")
else:
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        backup = p.with_suffix(".json.bak.preDSmode")
        backup.write_text(p.read_text())
        print(f"  backup: {backup}")
    prev = data.get("outputStyle")
    data["outputStyle"] = "DS Mode"
    p.write_text(json.dumps(data, indent=2) + "\n")
    if prev:
        print(f"  migrated outputStyle from {prev!r} to DS Mode")
    else:
        print(f"  wrote outputStyle = DS Mode")
PY
fi

cat <<'EOF'

Installed.

Activate it:

  Just this session
      /dsm
      (or the longer form: /ds-mode)

  Permanent (every session, every restart)
      Re-run this installer with the --permanent flag:
          ./install.sh --permanent
      Or edit ~/.claude/settings.json by hand and add:
          "outputStyle": "DS Mode"

  Turn it off later
      Remove the "outputStyle" line from ~/.claude/settings.json
      (or set it to "default").

Docs: https://nathan-hekman.github.io/ds-mode/
EOF
