# DS Mode — Install Reference

## Pure Claude Code commands (recommended)

```bash
claude plugin marketplace add nathan-hekman/ds-mode
claude plugin install ds-mode@ds-mode
```

That's the canonical install path. It clones the marketplace into `$CLAUDE_CONFIG_DIR/plugins/marketplaces/ds-mode/`, registers it in `$CLAUDE_CONFIG_DIR/plugins/known_marketplaces.json`, installs the plugin into `$CLAUDE_CONFIG_DIR/plugins/cache/ds-mode/ds-mode/<commit>/`, and records it in `$CLAUDE_CONFIG_DIR/plugins/installed_plugins.json` — so DS Mode shows up in `/plugin list` and in Claude Code's desktop plugin UI.

Restart Claude Code (or open a new session) and DS Mode is active automatically. No mode flag to set.

## One-line install (includes shell-rc setup)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
```

This clones the repo to a temp dir and runs `install.sh --force`, which does the two `claude plugin` commands above plus:

- writes the flag file `$CLAUDE_CONFIG_DIR/.ds-mode-active` so DS Mode is active immediately
- strips any legacy `"outputStyle": "DS Mode"` (or `"Dipsh*t Mode"`) entry from `settings.json` left behind by the deprecated v1 install

Idempotent. Safe to re-run.

## Local clone install

```bash
git clone https://github.com/nathan-hekman/ds-mode.git
cd ds-mode
./install.sh                          # plugin install + active flag
./install.sh --minimal                # plugin only (skip flag write)
./install.sh --default-off            # install but start sessions disabled by default
./install.sh --dry-run                # preview, write nothing
./install.sh --force                  # re-run even if already installed
```

## What the installer does

1. Runs `claude plugin marketplace add nathan-hekman/ds-mode` (registers the marketplace).
2. Runs `claude plugin install ds-mode@ds-mode` (clones into the plugins cache + records the install).
3. Backs up `$CLAUDE_CONFIG_DIR/settings.json` to `settings.json.bak.preDSmode` and strips any stale `outputStyle` value left over from v1.
4. Writes `$CLAUDE_CONFIG_DIR/.ds-mode-active` so DS Mode is active immediately (skipped with `--default-off`).

## Activating in Claude Code

Once the two `claude plugin` commands have run, hooks fire automatically on the next session. If they don't:

- Confirm registration: `claude plugin list` should show `ds-mode@ds-mode`.
- Confirm marketplace: `claude plugin marketplace list` should show `ds-mode`.
- Restart Claude Code (the SessionStart hook only fires on a fresh session).

## Verifying

```bash
ls $CLAUDE_CONFIG_DIR/.ds-mode-active   # should exist
```

In Claude Code, the next session should open with `DS MODE ACTIVE` in the system context. Ask any non-trivial question and you should see:

- A TLDR block at the bottom of the reply, AND
- A visual HTML one-pager opened in your browser when the reply is a decent length.

## Toggling

| Command | Effect |
|---|---|
| `/ds-mode` or `/ds-mode on` | activate (or re-activate) for this session |
| `/ds-mode off` | disable for this session |
| `/ds-mode <your question>` | answer the question under DS Mode rules AND force the visual HTML one-pager for this turn, regardless of length |

State persists across sessions in `$CLAUDE_CONFIG_DIR/.ds-mode-active` (flag present = active, flag absent = off).

To start *new* sessions disabled by default, set an env var:

```bash
export DS_MODE_DEFAULT=off
```

## Uninstall

```bash
claude plugin uninstall ds-mode@ds-mode
claude plugin marketplace remove ds-mode
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active" "$CLAUDE_CONFIG_DIR/.ds-mode-installed"
# Optionally restore your settings.json from the backup:
# cp "$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode" "$CLAUDE_CONFIG_DIR/settings.json"
```

## Files this plugin writes

| Path | Purpose |
|---|---|
| `$CLAUDE_CONFIG_DIR/.ds-mode-active` | flag — exists when DS Mode is active for this session |
| `$CLAUDE_CONFIG_DIR/.ds-mode-installed` | sentinel — written on first run so a user-chosen "off" state survives subsequent sessions |
| `$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode` | one-time backup of pre-install settings.json |
| `$TMPDIR/dsmode-summary-<ts>.html` | auto-generated visual one-pagers (ephemeral) |

The plugin never writes into your project repo or homedir without explicit opt-in.

## Other tools (Cursor, Copilot, Codex)

These get the TLDR + visual rules via `adapters/<tool>/`. Cursor and Codex can run the HTML build themselves (they have shell access); Copilot Chat in standard mode falls back to a markdown summary block. See `adapters/<tool>/README.md`.
