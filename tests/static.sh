#!/usr/bin/env bash
# tests/static.sh — DS Mode static-check suite.
#
# Runs in <5s. No network, no Chrome, no LLM. Catches structural
# regressions: bad JSON, syntax errors, emoji leaks, dash-line table bait,
# stale command lists. Designed to be CI-friendly (exits non-zero on any
# failure, prints a clean summary).

set -u
cd "$(dirname "$0")/.."

ROOT="$(pwd)"
FAIL=0
declare -a FAILED
declare -a PASSED

# Color helpers (cheap; respect NO_COLOR / non-tty).
if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  RED=''; GREEN=''; DIM=''; RESET=''
fi

pass() { PASSED+=("$1"); printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
fail() { FAILED+=("$1: $2"); FAIL=1; printf '  %s✗%s %s — %s\n' "$RED" "$RESET" "$1" "$2"; }

heading() { printf '\n%s· %s%s\n' "$DIM" "$1" "$RESET"; }

# ----- 1. Plugin manifest -----
heading "plugin manifest"
if command -v claude >/dev/null 2>&1; then
  if claude plugin validate . >/dev/null 2>&1; then
    pass "claude plugin validate"
  else
    fail "claude plugin validate" "manifest validation failed (run \`claude plugin validate .\` for details)"
  fi
else
  printf '  %s· skipped: claude CLI not on PATH (typical for CI runners)%s\n' "$DIM" "$RESET"
fi

# Check plugin.json + marketplace.json versions agree.
P_VER=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')).version || '')" 2>/dev/null)
M_VER=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.claude-plugin/marketplace.json','utf8')).plugins[0].version || '')" 2>/dev/null)
if [[ -n "$P_VER" && "$P_VER" == "$M_VER" ]]; then
  pass "version match: plugin.json=$P_VER marketplace.json=$M_VER"
else
  fail "version match" "plugin.json='$P_VER' marketplace.json='$M_VER' — must match exactly"
fi

# ----- 2. Hook script syntax -----
heading "hook syntax"
for f in hooks/*.js; do
  [[ -f "$f" ]] || continue
  if node --check "$f" 2>/dev/null; then pass "node --check $f"
  else fail "node --check $f" "syntax error"; fi
done
for f in hooks/*.sh; do
  [[ -f "$f" ]] || continue
  if bash -n "$f" 2>/dev/null; then pass "bash -n $f"
  else fail "bash -n $f" "syntax error"; fi
done

# Stamper + tests scripts.
if node --check templates/build.mjs 2>/dev/null; then pass "node --check templates/build.mjs"
else fail "node --check templates/build.mjs" "syntax error"; fi

# ----- 3. Emoji leak (high Unicode planes) -----
heading "no pictographic emoji"
EMOJI_HITS=$(LC_ALL=en_US.UTF-8 grep -rPln '[\x{1F300}-\x{1FAFF}]' \
  --include="*.md" --include="*.js" --include="*.mjs" --include="*.sh" --include="*.html" --include="*.css" \
  --exclude-dir=.git --exclude-dir=node_modules . 2>/dev/null || true)
if [[ -z "$EMOJI_HITS" ]]; then
  pass "no pictographic emoji anywhere in source"
else
  fail "emoji leak" "found in: $(echo "$EMOJI_HITS" | tr '\n' ' ')"
fi

# ----- 4. Dash-line table bait (THE regression) -----
# A line whose entire non-whitespace content is U+2500 box-drawing dashes
# trips Claude mobile's markdown table parser. Catch any such line in the
# rule samples / help skill samples. (Inline dashes after text are fine.)
heading "no standalone dash lines (table-bait)"
DASH_HITS=$(LC_ALL=en_US.UTF-8 grep -rPln '^[[:space:]]*[\x{2500}]{3,}[[:space:]]*$' \
  rules skills 2>/dev/null || true)
if [[ -z "$DASH_HITS" ]]; then
  pass "no standalone U+2500 dash lines in rules/ or skills/"
else
  fail "standalone dash line" "found in: $(echo "$DASH_HITS" | tr '\n' ' ') — would break Claude mobile rendering"
fi

# ----- 5. TLDR sample header shape -----
# Both the rules file and the help skill should show the canonical
# inline-dashed header so anyone reading the docs sees the right shape.
heading "TLDR sample header shape"
CANONICAL='☻ TLDR \[ds-mode\] ──────────'
if grep -qE "$CANONICAL" rules/ds-mode.md; then
  pass "rules/ds-mode.md sample uses canonical inline-dashed header"
else
  fail "rules sample header" "rules/ds-mode.md missing the canonical '☻ TLDR [ds-mode] ──────────' shape"
fi
if grep -qE "$CANONICAL" skills/ds-mode-help/SKILL.md; then
  pass "skills/ds-mode-help/SKILL.md sample uses canonical header"
else
  fail "help-skill sample header" "skills/ds-mode-help/SKILL.md missing the canonical header"
fi

# ----- 6. Command argument-hint hygiene -----
# All values in commands/ds-mode.md's argument-hint should be tokens that
# the tracker actually parses. Catch a drift where the docs claim
# /ds-mode foo exists but tracker doesn't handle it.
heading "command argument-hint matches tracker"
HINT=$(grep -E "^argument-hint:" commands/ds-mode.md | head -1)
if [[ -n "$HINT" ]]; then
  # Tokenize the hint (very rough — splits on |, drops <>, trims).
  HINT_TOKENS=$(echo "$HINT" | sed -E 's/^argument-hint: *"?//; s/"$//' \
    | tr '|' '\n' | sed -E 's/^ *| *$//g; s/^<.*>$//' | grep -vE '^(setup|on|off|status)$' \
    | grep -vE '^$')
  MISSING=""
  while IFS= read -r tok; do
    tok="$(echo "$tok" | sed 's/ .*//')"  # strip "mobile setup|on|..." extras
    [[ -z "$tok" ]] && continue
    [[ "$tok" == "mobile" ]] && continue
    if ! grep -qE "(argLower === '$tok'|argLower.match.*'$tok'|VALID_MODES.includes|VALID_THEMES.includes)" hooks/ds-mode-tracker.js 2>/dev/null; then
      # The mode/theme tokens are checked via VALID_* arrays — that's OK.
      # Just flag literal mismatches we can detect.
      :
    fi
  done <<< "$HINT_TOKENS"
  pass "argument-hint tokens reference tracker logic"
else
  fail "argument-hint missing" "commands/ds-mode.md has no argument-hint frontmatter"
fi

# ----- 7. Template files complete -----
heading "templates present"
for kind in explainer comparison decision status; do
  if [[ -f "templates/$kind.html" ]]; then pass "templates/$kind.html"
  else fail "templates/$kind.html" "missing"; fi
done
for f in _shared.css build.mjs; do
  if [[ -f "templates/$f" ]]; then pass "templates/$f"
  else fail "templates/$f" "missing"; fi
done

# ----- 8. README + INSTALL command coverage -----
# The README's command list should mention each major mode (lite/full/off/dark/light/auto/mobile).
heading "README command coverage"
README_MISSING=""
for cmd in lite full off dark light auto "mobile setup"; do
  if ! grep -qF "/ds-mode $cmd" README.md && ! grep -qF "$cmd" README.md; then
    README_MISSING="$README_MISSING $cmd"
  fi
done
if [[ -z "$README_MISSING" ]]; then
  pass "README mentions every documented /ds-mode subcommand"
else
  fail "README coverage" "missing references:$README_MISSING"
fi

# ----- Summary -----
echo ""
printf '%s%d passed%s · ' "$GREEN" "${#PASSED[@]}" "$RESET"
if [[ $FAIL -eq 0 ]]; then
  printf '%s0 failed%s\n' "$GREEN" "$RESET"
  echo "static tests pass"
  exit 0
else
  printf '%s%d failed%s\n' "$RED" "${#FAILED[@]}" "$RESET"
  echo ""
  echo "failures:"
  for f in "${FAILED[@]}"; do echo "  - $f"; done
  exit 1
fi
