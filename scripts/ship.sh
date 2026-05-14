#!/usr/bin/env bash
# scripts/ship.sh — DS Mode release gate.
#
# The shape:
#   1. Run the full test suite — refuse to proceed on failure
#   2. Bump plugin.json + marketplace.json versions
#   3. Show a summary: what changed, what version is going out, what tests passed
#   4. STOP and wait for explicit "ship" input
#   5. On approval: commit + push + tag + release + asset upload
#   6. On rejection / empty / Ctrl-C: leave everything staged, exit clean
#
# Usage:
#   scripts/ship.sh patch     # 1.6.0 -> 1.6.1
#   scripts/ship.sh minor     # 1.6.0 -> 1.7.0
#   scripts/ship.sh major     # 1.6.0 -> 2.0.0
#   scripts/ship.sh --dry-run patch    # everything except the push/tag/release
#
# Required: gh CLI authenticated, git remote set, headless Chrome for hero PNG.

set -u
cd "$(dirname "$0")/.."

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; YELLOW=$'\033[33m'; RESET=$'\033[0m'
else
  BOLD=''; RED=''; GREEN=''; DIM=''; YELLOW=''; RESET=''
fi

DRY=0
BUMP=""
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) DRY=1 ;;
    patch|minor|major) BUMP="$arg" ;;
    -h|--help) head -20 "$0" | sed 's/^# \?//'; exit 0 ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

if [[ -z "$BUMP" ]]; then
  echo "Usage: scripts/ship.sh [patch|minor|major] [--dry-run]" >&2
  exit 1
fi

step() { printf '\n%s━━ %s ━━%s\n' "$BOLD" "$1" "$RESET"; }
say()  { printf '  %s\n' "$1"; }
ok()   { printf '  %s✓%s %s\n' "$GREEN" "$RESET" "$1"; }
warn() { printf '  %s!%s %s\n' "$YELLOW" "$RESET" "$1"; }
die()  { printf '  %s✗%s %s\n' "$RED" "$RESET" "$1"; exit 1; }

# ----- 1. Tests must pass -----
step "tests"
if bash tests/run.sh; then
  ok "all tests passed"
else
  die "tests failed — refusing to ship"
fi

# ----- 2. Bump version -----
step "version bump ($BUMP)"
CURRENT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('.claude-plugin/plugin.json','utf8')).version)")
NEXT=$(node -e "
const cur = '$CURRENT'.split('.').map(Number);
let [maj, min, pat] = cur;
const bump = '$BUMP';
if (bump === 'major') { maj++; min = 0; pat = 0; }
else if (bump === 'minor') { min++; pat = 0; }
else { pat++; }
console.log([maj, min, pat].join('.'));
")
say "current: $CURRENT"
say "next:    $NEXT"

if [[ "$DRY" -eq 0 ]]; then
  node -e "
const fs = require('fs');
for (const p of ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json']) {
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (j.version) j.version = '$NEXT';
  if (j.plugins) j.plugins.forEach(x => { if (x.version) x.version = '$NEXT'; });
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
}
"
  ok "wrote $NEXT to plugin.json + marketplace.json"
else
  warn "dry-run: skipping version write"
fi

# ----- 3. Re-validate -----
if claude plugin validate . >/dev/null 2>&1; then
  ok "plugin manifest validates after bump"
else
  die "manifest validation failed after version bump"
fi

# ----- 4. Diff summary -----
step "diff summary"
say "files changed since last tag:"
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$LAST_TAG" ]]; then
  CHANGED=$(git diff --name-only "$LAST_TAG"..HEAD 2>/dev/null | head -20)
  if [[ -z "$CHANGED" ]]; then
    say "  (no committed changes since $LAST_TAG; new commit will include staged version bump)"
  else
    echo "$CHANGED" | sed 's/^/    /'
  fi
  say ""
  say "current uncommitted:"
  git status --short | head -20 | sed 's/^/    /'
fi

# ----- 5. Confirm gate -----
step "ship confirmation"
say "about to ship: $BOLD$NEXT$RESET"
say "this will:"
say "  - commit version bump + any staged changes"
say "  - push to origin/main"
say "  - claude plugin tag .  (creates ds-mode--v$NEXT git tag)"
say "  - push the tag"
say "  - gh release create with template release notes"
say ""
if [[ "$DRY" -eq 1 ]]; then
  warn "dry-run: NOT pushing anything"
  exit 0
fi
printf '  %sType %sship%s to proceed (anything else aborts): %s' "$BOLD" "$GREEN" "$RESET$BOLD" "$RESET"
read -r CONFIRM
if [[ "$CONFIRM" != "ship" ]]; then
  warn "aborted by user — version bump left in working tree, nothing pushed"
  warn "to undo the bump: git checkout .claude-plugin/"
  exit 1
fi

# ----- 6. Ship -----
step "shipping"

if ! git diff --quiet || ! git diff --cached --quiet; then
  git add -A
  if git commit -m "chore: bump version to $NEXT" >/dev/null 2>&1; then
    ok "committed version bump"
  else
    die "git commit failed"
  fi
fi

if git push origin main >/dev/null 2>&1; then
  ok "pushed to origin/main"
else
  die "git push failed"
fi

if claude plugin tag . >/dev/null 2>&1; then
  ok "created git tag ds-mode--v$NEXT"
else
  die "claude plugin tag failed"
fi

if git push origin "refs/tags/ds-mode--v$NEXT" >/dev/null 2>&1; then
  ok "pushed tag"
else
  die "git push tag failed"
fi

# Create the GitHub Release with placeholder body; user edits in browser.
RELEASE_BODY=$(cat <<EOF
## DS Mode v$NEXT

(release notes pending — edit on the web or via \`gh release edit ds-mode--v$NEXT\`)

[Full diff](https://github.com/nathan-hekman/ds-mode/compare/$LAST_TAG...ds-mode--v$NEXT)
EOF
)
if gh release create "ds-mode--v$NEXT" --title "DS Mode v$NEXT" --notes "$RELEASE_BODY" >/dev/null 2>&1; then
  ok "created GitHub Release ds-mode--v$NEXT"
else
  warn "gh release create failed — release notes not published. Run manually:"
  say "  gh release create ds-mode--v$NEXT --title 'DS Mode v$NEXT' --notes-file <file>"
fi

step "done"
ok "v$NEXT is live"
say ""
say "next steps:"
say "  - edit release notes on github: https://github.com/nathan-hekman/ds-mode/releases/tag/ds-mode--v$NEXT"
say "  - stamp a hero PNG and upload: gh release upload ds-mode--v$NEXT path/to/v$NEXT.png --clobber"
