#!/usr/bin/env bash
#
# DS Mode — install to every AI tool I can detect
#
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-all.sh)
#
# Installs DS Mode user-globally where possible:
#   - Claude Code  → plugin install (marketplace + plugin + active-mode flag + shell rc)
#                    via install-claude-code.sh
#   - Codex CLI    → ~/.codex/AGENTS.md
# Per-project tools (Cursor, Copilot) print copy-paste one-liners — they
# don't have a sane user-global location, so the user runs those from
# whatever repo they want DS Mode in.
#
set -euo pipefail

readonly RAW="https://raw.githubusercontent.com/nathan-hekman/ds-mode/main"

echo "DS Mode — installing to every detected AI tool"
echo ""

INSTALLED=()
SKIPPED=()

# ----- Claude Code -----
if [[ -d "$HOME/.claude" ]] || command -v claude &>/dev/null; then
  echo "→ Claude Code"
  bash <(curl -fsSL "$RAW/install-claude-code.sh") | sed 's/^/  /'
  INSTALLED+=("Claude Code (user-global)")
else
  echo "→ Claude Code: not detected, skipping"
  SKIPPED+=("Claude Code")
fi

echo ""

# ----- Codex CLI -----
if command -v codex &>/dev/null || [[ -d "$HOME/.codex" ]]; then
  echo "→ Codex CLI"
  mkdir -p "$HOME/.codex"
  if [[ -f "$HOME/.codex/AGENTS.md" ]]; then
    if grep -q "DS Mode for Codex CLI" "$HOME/.codex/AGENTS.md" 2>/dev/null; then
      echo "  ✓ already installed"
    else
      cp "$HOME/.codex/AGENTS.md" "$HOME/.codex/AGENTS.md.bak.preDSmode"
      echo "  backup: ~/.codex/AGENTS.md.bak.preDSmode"
      printf "\n\n" >> "$HOME/.codex/AGENTS.md"
      curl -fsSL "$RAW/adapters/codex/AGENTS.md" >> "$HOME/.codex/AGENTS.md"
      echo "  ✓ appended to existing ~/.codex/AGENTS.md"
    fi
  else
    curl -fsSL "$RAW/adapters/codex/AGENTS.md" -o "$HOME/.codex/AGENTS.md"
    echo "  ✓ wrote ~/.codex/AGENTS.md"
  fi
  INSTALLED+=("Codex CLI (user-global)")
else
  echo "→ Codex CLI: not detected, skipping"
  SKIPPED+=("Codex CLI")
fi

echo ""

# ----- Cursor (per-project) -----
if command -v cursor &>/dev/null || [[ -d "/Applications/Cursor.app" ]]; then
  echo "→ Cursor: detected, but it's per-project."
  echo "  Run this from any project root to enable DS Mode for that project:"
  echo ""
  echo "    curl -fsSL $RAW/adapters/cursor/.cursorrules -o .cursorrules"
  echo ""
  echo "  Or paste the rules into Cursor → Settings → Rules → User Rules to apply globally."
  SKIPPED+=("Cursor (per-project; see above)")
else
  echo "→ Cursor: not detected, skipping"
  SKIPPED+=("Cursor")
fi

echo ""

# ----- Copilot (per-repo) -----
echo "→ GitHub Copilot Chat: per-repo only."
echo "  Run this from any repo to enable DS Mode there:"
echo ""
echo "    mkdir -p .github && curl -fsSL $RAW/adapters/copilot/copilot-instructions.md -o .github/copilot-instructions.md"
SKIPPED+=("Copilot (per-repo; see above)")

# ----- Summary -----
echo ""
echo "─────────────────────────────"
echo "Summary"
echo "─────────────────────────────"
if (( ${#INSTALLED[@]} )); then
  echo "Installed user-globally:"
  for x in "${INSTALLED[@]}"; do echo "  ✓ $x"; done
fi
if (( ${#SKIPPED[@]} )); then
  echo "Manual / not found:"
  for x in "${SKIPPED[@]}"; do echo "  · $x"; done
fi

echo ""
echo "Docs: https://nathan-hekman.github.io/ds-mode/"
