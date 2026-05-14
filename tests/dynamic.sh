#!/usr/bin/env bash
# tests/dynamic.sh — DS Mode dynamic-check suite.
#
# Runs the actual hook scripts + stamper against a throwaway
# CLAUDE_CONFIG_DIR and verifies their behavior end-to-end. ~30s total
# (Chrome headless for the screenshot is the slow part; skipped when
# Chrome is unavailable). No network — no GitHub API, no git pushes.

set -u
cd "$(dirname "$0")/.."

ROOT="$(pwd)"
FAIL=0
declare -a FAILED
declare -a PASSED

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  RED=''; GREEN=''; DIM=''; RESET=''
fi

pass() { PASSED+=("$1"); printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
fail() { FAILED+=("$1: $2"); FAIL=1; printf '  %s✗%s %s — %s\n' "$RED" "$RESET" "$1" "$2"; }
heading() { printf '\n%s· %s%s\n' "$DIM" "$1" "$RESET"; }

# Throwaway state dir so we never touch the real ~/.claude.
export CLAUDE_CONFIG_DIR="$(mktemp -d -t ds-mode-test-XXXXXX)"
trap 'rm -rf "$CLAUDE_CONFIG_DIR"' EXIT

# ----- 1. Activate hook: first run defaults to full -----
heading "activate hook"
OUT=$(node hooks/ds-mode-activate.js 2>&1 | head -1)
if echo "$OUT" | grep -q "DS MODE ACTIVE — mode: full · theme: auto · version:"; then
  pass "first-run activate emits canonical header (full + auto)"
else
  fail "first-run activate" "unexpected header: '$OUT'"
fi
if [[ -f "$CLAUDE_CONFIG_DIR/.ds-mode-active" ]]; then
  pass "first-run wrote flag file"
else
  fail "first-run flag" "no .ds-mode-active written"
fi
if [[ -f "$CLAUDE_CONFIG_DIR/.ds-mode-installed" ]]; then
  pass "first-run wrote sentinel"
else
  fail "first-run sentinel" "no .ds-mode-installed written"
fi

# ----- 2. Tracker dispatches modes/themes -----
heading "tracker command dispatch"
echo '{"prompt":"/ds-mode lite"}' | node hooks/ds-mode-tracker.js >/dev/null 2>&1
if [[ "$(cat "$CLAUDE_CONFIG_DIR/.ds-mode-active" 2>/dev/null | tr -d '\n')" == "lite" ]]; then
  pass "/ds-mode lite switches mode"
else
  fail "/ds-mode lite" "flag is '$(cat "$CLAUDE_CONFIG_DIR/.ds-mode-active" 2>/dev/null)'"
fi

echo '{"prompt":"/ds-mode dark"}' | node hooks/ds-mode-tracker.js >/dev/null 2>&1
if [[ "$(cat "$CLAUDE_CONFIG_DIR/.ds-mode-theme" 2>/dev/null | tr -d '\n')" == "dark" ]]; then
  pass "/ds-mode dark switches theme"
else
  fail "/ds-mode dark" "flag is '$(cat "$CLAUDE_CONFIG_DIR/.ds-mode-theme" 2>/dev/null)'"
fi

echo '{"prompt":"/ds-mode off"}' | node hooks/ds-mode-tracker.js >/dev/null 2>&1
if [[ ! -f "$CLAUDE_CONFIG_DIR/.ds-mode-active" ]]; then
  pass "/ds-mode off deletes mode flag"
else
  fail "/ds-mode off" "flag still present"
fi

# Re-activate for remaining tests.
echo '{"prompt":"/ds-mode full"}' | node hooks/ds-mode-tracker.js >/dev/null 2>&1

# ----- 3. Tracker reminder shape -----
heading "tracker reminder"
REM=$(echo '{"prompt":"hello"}' | node hooks/ds-mode-tracker.js 2>&1)
if echo "$REM" | grep -q "DS MODE ACTIVE"; then
  pass "reminder includes DS MODE ACTIVE prefix"
else
  fail "reminder prefix" "missing DS MODE ACTIVE"
fi
if echo "$REM" | grep -qF "☻ TLDR [ds-mode] ──────────"; then
  pass "reminder mentions canonical inline-dashed TLDR header"
else
  fail "reminder TLDR header" "missing canonical inline-dashed header reference"
fi
if echo "$REM" | grep -qF "MAX 3 bullets"; then
  pass "reminder includes hard cap (3 bullets)"
else
  fail "reminder hard cap" "missing 'MAX 3 bullets'"
fi

# ----- 4. /ds-mode <prompt> sets FORCE_HTML -----
heading "/ds-mode <prompt> forces HTML"
REM2=$(echo '{"prompt":"/ds-mode Explain how this works"}' | node hooks/ds-mode-tracker.js 2>&1)
if echo "$REM2" | grep -qF "MANDATORY for this turn"; then
  pass "/ds-mode <prompt> sets MANDATORY clause"
else
  fail "/ds-mode <prompt>" "missing MANDATORY clause in reminder"
fi

# ----- 5. Mobile mode dispatch (without actually pushing) -----
heading "/ds-mode mobile status"
REM3=$(echo '{"prompt":"/ds-mode mobile status"}' | node hooks/ds-mode-tracker.js 2>&1)
if echo "$REM3" | grep -qF "Mobile mode: not configured"; then
  pass "/ds-mode mobile status reports unconfigured (no config exists)"
else
  fail "/ds-mode mobile status" "did not report unconfigured: $(echo "$REM3" | head -c 200)"
fi

# Fake a config and re-test.
cat > "$CLAUDE_CONFIG_DIR/.ds-mode-mobile" <<JSON
{"enabled": true, "repo": "testuser/ds-mode-mobile", "owner": "testuser", "clone_path": "/tmp/fake"}
JSON
REM4=$(echo '{"prompt":"/ds-mode mobile status"}' | node hooks/ds-mode-tracker.js 2>&1)
if echo "$REM4" | grep -qF "Mobile mode: ON"; then
  pass "/ds-mode mobile status reports ON when configured"
else
  fail "/ds-mode mobile status (configured)" "did not report ON"
fi

# ----- 6. Stamper smoke per template kind -----
heading "stamper produces valid HTML per template kind"
SMOKE=$(mktemp -d)
trap 'rm -rf "$CLAUDE_CONFIG_DIR" "$SMOKE"' EXIT

stamp_one() {
  local kind="$1"
  local slots="$2"
  local out="$SMOKE/$kind.html"
  if node templates/build.mjs "$kind" --slots "$slots" --out "$out" >/dev/null 2>&1; then
    if [[ -f "$out" ]] && (( $(wc -c < "$out") > 1000 )); then
      pass "stamp $kind ($(wc -c < "$out") bytes)"
    else
      fail "stamp $kind" "output too small or missing"
    fi
  else
    fail "stamp $kind" "stamper exited non-zero"
  fi
}

stamp_one explainer  '{"title":"t","deck":"d","hero_svg":"<svg></svg>","tiles":[{"label":"a","caption":"c","svg":"<svg></svg>"}]}'
stamp_one comparison '{"title":"t","deck":"d","left_svg":"<svg></svg>","left_label":"L","left_caption":"l","right_svg":"<svg></svg>","right_label":"R","right_caption":"r"}'
stamp_one decision   '{"title":"t","deck":"d","rec_label":"rec","rec_answer":"go","options":[{"label":"a","note":"n","svg":"<svg></svg>"}]}'
stamp_one status     '{"title":"t","deck":"d","hero_svg":"<svg></svg>","body":"b"}'

# ----- 7. Stamper screenshot via headless Chrome (optional — skipped if Chrome missing) -----
heading "stamper --screenshot (optional)"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
if [[ -x "$CHROME" ]]; then
  SLOTS='{"title":"t","deck":"d","hero_svg":"<svg></svg>","body":"b"}'
  HTML_OUT="$SMOKE/shot.html"
  PNG_OUT="$SMOKE/shot.png"
  node templates/build.mjs status --slots "$SLOTS" --screenshot --out "$HTML_OUT" >/dev/null 2>&1
  if [[ -f "$PNG_OUT" ]] && (( $(wc -c < "$PNG_OUT") > 5000 )); then
    pass "stamper --screenshot produced PNG ($(wc -c < "$PNG_OUT") bytes)"
  else
    fail "stamper --screenshot" "PNG missing or too small at '$PNG_OUT' ($(test -f "$PNG_OUT" && wc -c < "$PNG_OUT" || echo 0) bytes)"
  fi
else
  printf '  %s· skipped (Chrome not at standard path)%s\n' "$DIM" "$RESET"
fi

# ----- 8. Statusline emits correct chip -----
heading "statusline chip"
echo "full" > "$CLAUDE_CONFIG_DIR/.ds-mode-active"
CHIP=$(bash hooks/ds-mode-statusline.sh)
if [[ "$CHIP" == "DS:full" ]]; then
  pass "statusline emits 'DS:full' for mode=full"
else
  fail "statusline mode=full" "got '$CHIP'"
fi

# With update flag present, should append ↑.
echo "99.0.0" > "$CLAUDE_CONFIG_DIR/.ds-mode-update-available"
CHIP2=$(bash hooks/ds-mode-statusline.sh)
if [[ "$CHIP2" == "DS:full ↑" ]]; then
  pass "statusline appends ↑ when update flag present"
else
  fail "statusline update arrow" "got '$CHIP2'"
fi
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-update-available"

rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active"
CHIP3=$(bash hooks/ds-mode-statusline.sh)
if [[ -z "$CHIP3" ]]; then
  pass "statusline emits empty string when off"
else
  fail "statusline off" "got '$CHIP3', expected empty"
fi

# ----- Summary -----
echo ""
printf '%s%d passed%s · ' "$GREEN" "${#PASSED[@]}" "$RESET"
if [[ $FAIL -eq 0 ]]; then
  printf '%s0 failed%s\n' "$GREEN" "$RESET"
  echo "dynamic tests pass"
  exit 0
else
  printf '%s%d failed%s\n' "$RED" "${#FAILED[@]}" "$RESET"
  echo ""
  echo "failures:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi
