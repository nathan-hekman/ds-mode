#!/usr/bin/env bash
# tests/run.sh — orchestrator. Runs static, then dynamic, prints summary.
# Exit code 0 = all green; non-zero = at least one failure (CI-friendly).

set -u
cd "$(dirname "$0")/.."

if [[ -t 1 && -z "${NO_COLOR:-}" ]]; then
  BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  BOLD=''; RED=''; GREEN=''; DIM=''; RESET=''
fi

printf '%sDS Mode test suite%s\n' "$BOLD" "$RESET"
printf '%s$(pwd)%s\n' "$DIM" "$RESET"

OVERALL=0

echo ""
printf '%s━━━ static ━━━%s\n' "$BOLD" "$RESET"
if bash tests/static.sh; then :
else OVERALL=1; fi

echo ""
printf '%s━━━ dynamic ━━━%s\n' "$BOLD" "$RESET"
if bash tests/dynamic.sh; then :
else OVERALL=1; fi

echo ""
if [[ $OVERALL -eq 0 ]]; then
  printf '%sOVERALL: pass%s\n' "$GREEN" "$RESET"
else
  printf '%sOVERALL: fail%s — fix the failures above before shipping\n' "$RED" "$RESET"
fi
exit $OVERALL
