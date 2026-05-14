#!/usr/bin/env bash
# ds-mode-mobile-setup.sh — interactive setup for DS Mode "mobile mode."
#
# What it does:
#   1. Verifies `gh` CLI is installed and authenticated.
#   2. Creates a PRIVATE GitHub repo named <user>/ds-mode-mobile
#      (or reuses one that already exists).
#   3. Clones the repo locally to $CLAUDE_CONFIG_DIR/ds-mode-mobile/
#      so future publish operations can `git push` without an extra clone.
#   4. Writes the config to $CLAUDE_CONFIG_DIR/.ds-mode-mobile
#      with enabled=true so the stamper picks it up automatically.
#
# Privacy properties:
#   - The repo is private. URLs of the form
#     https://github.com/<user>/ds-mode-mobile/blob/main/<file>.png
#     require login as <user> to view. raw.githubusercontent URLs to
#     private repos require an OAuth token, so we use the blob URL.
#   - On the Claude Code mobile app, tapping a URL opens it in the
#     phone's browser; if the user is logged into GitHub there, the
#     image loads.
#
# Exit codes:
#   0  setup complete, mobile mode enabled
#   1  pre-flight failed (gh missing, not authed)
#   2  repo creation or clone failed
set -euo pipefail

CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
CONFIG_FILE="$CLAUDE_DIR/.ds-mode-mobile"
REPO_NAME="${DS_MODE_MOBILE_REPO_NAME:-ds-mode-mobile}"

echo "DS Mode — mobile mode setup"
echo ""

# 1. gh CLI present + authenticated.
if ! command -v gh >/dev/null 2>&1; then
  echo "  ✗ \`gh\` CLI not found on PATH. Install it (\`brew install gh\` or" >&2
  echo "    https://cli.github.com/) and re-run." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "  ✗ \`gh\` is not authenticated. Run \`gh auth login\` first." >&2
  echo "    The mobile-mode flow uses YOUR GitHub credentials to publish" >&2
  echo "    one-pagers to a private repo only you can access." >&2
  exit 1
fi

GH_USER="$(gh api user --jq .login 2>/dev/null || echo '')"
if [[ -z "$GH_USER" ]]; then
  echo "  ✗ Could not resolve your GitHub username via \`gh api user\`." >&2
  exit 1
fi
REPO_FULL="$GH_USER/$REPO_NAME"
echo "  · GitHub user: $GH_USER"
echo "  · target repo: $REPO_FULL (private)"

# 2. Create the repo if it does not exist; reuse otherwise.
if gh repo view "$REPO_FULL" >/dev/null 2>&1; then
  echo "  · repo already exists — reusing"
else
  echo "  · creating private repo..."
  if ! gh repo create "$REPO_FULL" --private --add-readme \
       --description "DS Mode mobile mode — private one-pager screenshots" >/dev/null 2>&1; then
    echo "  ✗ Failed to create $REPO_FULL." >&2
    exit 2
  fi
  echo "  ✓ created $REPO_FULL"
fi

# 3. Clone locally (or pull if a clone already exists).
CLONE_PATH="$CLAUDE_DIR/ds-mode-mobile"
if [[ -d "$CLONE_PATH/.git" ]]; then
  echo "  · local clone exists — pulling latest"
  git -C "$CLONE_PATH" pull --quiet --rebase 2>/dev/null || true
else
  echo "  · cloning to $CLONE_PATH..."
  if ! gh repo clone "$REPO_FULL" "$CLONE_PATH" -- --quiet 2>/dev/null; then
    echo "  ✗ Failed to clone $REPO_FULL into $CLONE_PATH." >&2
    exit 2
  fi
fi

# 4. Write config file.
umask 077
cat > "$CONFIG_FILE.tmp.$$" <<JSON
{
  "enabled": true,
  "repo": "$REPO_FULL",
  "owner": "$GH_USER",
  "clone_path": "$CLONE_PATH"
}
JSON
mv "$CONFIG_FILE.tmp.$$" "$CONFIG_FILE"
echo "  ✓ wrote $CONFIG_FILE"

cat <<EOF

Setup complete. Mobile mode is now ON.

Next time DS Mode generates a one-pager:
  · The screenshot saves locally (as today).
  · A copy publishes in the background to:
      https://github.com/$REPO_FULL
  · Your reply includes a tappable URL pointing at the file.
  · On your phone, log into GitHub once (Safari or GitHub mobile app) —
    the image renders inside the private repo's UI.

To pause: /ds-mode mobile off
To resume: /ds-mode mobile on   (no re-setup needed)
To re-run setup: /ds-mode mobile setup
EOF
