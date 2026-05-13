#!/usr/bin/env bash
#
# DS Mode — Claude Code one-liner installer
#
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
#
# Curls the rule files directly into ~/.claude/ and sets the outputStyle key
# in ~/.claude/settings.json so DS Mode is on for every session.
#
set -euo pipefail

readonly RAW="https://raw.githubusercontent.com/nathan-hekman/ds-mode/main"
CLAUDE_DIR="${CLAUDE_DIR:-$HOME/.claude}"
STYLES_DIR="$CLAUDE_DIR/output-styles"
COMMANDS_DIR="$CLAUDE_DIR/commands"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"

echo "DS Mode → Claude Code"
mkdir -p "$STYLES_DIR" "$COMMANDS_DIR"

curl -fsSL "$RAW/output-styles/ds-mode.md" -o "$STYLES_DIR/ds-mode.md"
curl -fsSL "$RAW/commands/ds-mode.md"      -o "$COMMANDS_DIR/ds-mode.md"
curl -fsSL "$RAW/commands/dsm.md"          -o "$COMMANDS_DIR/dsm.md"
echo "  ✓ rules + slash commands copied"

python3 - "$SETTINGS_FILE" <<'PY'
import json, pathlib, sys
p = pathlib.Path(sys.argv[1])
data = {}
if p.exists():
    try:
        data = json.loads(p.read_text())
    except json.JSONDecodeError:
        print(f"  ! {p} is not valid JSON. Skipping settings update.", file=sys.stderr)
        sys.exit(0)
if data.get("outputStyle") == "DS Mode":
    print("  ✓ outputStyle already set")
else:
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.exists():
        backup = p.with_suffix(".json.bak.preDSmode")
        backup.write_text(p.read_text())
    prev = data.get("outputStyle")
    data["outputStyle"] = "DS Mode"
    p.write_text(json.dumps(data, indent=2) + "\n")
    if prev:
        print(f"  ✓ outputStyle migrated from {prev!r} to DS Mode")
    else:
        print("  ✓ outputStyle set to DS Mode")
PY

echo ""
echo "Done. Restart Claude Code or run /dsm in any session."
