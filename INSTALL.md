# DS Mode — Install Reference

## Pure Claude Code commands (recommended)

```bash
claude plugin marketplace add nathan-hekman/ds-mode
claude plugin install ds-mode@ds-mode
```

That's the canonical install path. It clones the marketplace into `$CLAUDE_CONFIG_DIR/plugins/marketplaces/ds-mode/`, registers it in `$CLAUDE_CONFIG_DIR/plugins/known_marketplaces.json`, installs the plugin into `$CLAUDE_CONFIG_DIR/plugins/cache/ds-mode/ds-mode/<commit>/`, and records it in `$CLAUDE_CONFIG_DIR/plugins/installed_plugins.json` — so DS Mode shows up in `/plugin list` and in Claude Code's desktop plugin UI.

Restart Claude Code (or open a new session) and DS Mode is active in `full` mode (default).

## One-line install (includes shell-rc setup)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
```

This clones the repo to a temp dir and runs `install.sh --force`, which does the two `claude plugin` commands above plus:

- writes `$CLAUDE_CONFIG_DIR/.ds-mode-active` with the chosen mode (`full` by default)
- strips any legacy `"outputStyle": "DS Mode"` (or `"Dipsh*t Mode"`) entry from `settings.json` left behind by the deprecated v1 install
- appends `export DS_MODE_DEFAULT="full"` to your shell rc so the default survives flag deletion

Idempotent. Safe to re-run.

## Local clone install

```bash
git clone https://github.com/nathan-hekman/ds-mode.git
cd ds-mode
./install.sh                              # plugin + flag + shell rc (full default)
./install.sh --default-mode lite          # default to lite mode
./install.sh --default-off                # install but start sessions disabled
./install.sh --minimal                    # plugin only (skip flag + shell rc edit)
./install.sh --dry-run                    # preview, write nothing
./install.sh --force                      # re-run even if already installed
```

## What the installer does

1. Runs `claude plugin marketplace add nathan-hekman/ds-mode` (registers the marketplace).
2. Runs `claude plugin install ds-mode@ds-mode` (clones into the plugins cache + records the install).
3. Backs up `$CLAUDE_CONFIG_DIR/settings.json` to `settings.json.bak.preDSmode` and strips any stale `outputStyle` value left over from v1.
4. Writes `$CLAUDE_CONFIG_DIR/.ds-mode-active` with the active mode (`full` or your `--default-mode`). Skipped with `--minimal` or `--default-off`.
5. Adds/updates `export DS_MODE_DEFAULT="<mode>"` in your shell rc (`~/.zshenv` / `~/.zshrc` / `~/.bashrc` / `~/.bash_profile`) so future shells inherit the default. With `--default-off`, exports `DS_MODE_DEFAULT=off`. Skipped with `--minimal`.

## How to install but start disabled

```bash
./install.sh --default-off
```

This skips writing the active flag and writes `DS_MODE_DEFAULT=off` to your shell rc, so the SessionStart hook stays silent on new sessions. Re-enable any time with `/ds-mode on` (or `/ds-mode lite|full`).

## Activating in Claude Code

Once the two `claude plugin` commands have run, hooks fire automatically on the next session. If they don't:

- Confirm registration: `claude plugin list` should show `ds-mode@ds-mode`.
- Confirm marketplace: `claude plugin marketplace list` should show `ds-mode`.
- Restart Claude Code (the SessionStart hook only fires on a fresh session).

## Verifying

```bash
cat $CLAUDE_CONFIG_DIR/.ds-mode-active   # should print: full (or your chosen mode)
```

In Claude Code, the next session should open with `DS MODE ACTIVE — mode: full` in the system context. Ask any non-trivial question and you should see:

- A TLDR block at the bottom of the reply, AND
- A visual HTML one-pager opened in your browser when the reply is a decent length (full mode only — lite skips HTML unless you invoke `/ds-mode <prompt>`).

## Toggling

| Command | Effect |
|---|---|
| `/ds-mode` or `/ds-mode on` | activate at the session's default mode |
| `/ds-mode lite` | TLDR only, no HTML |
| `/ds-mode full` | TLDR + auto HTML when triggers fire |
| `/ds-mode off` | disable for this session |
| `/ds-mode <your question>` | answer the question + force the visual HTML one-pager (works in lite and full) |

State persists across sessions in `$CLAUDE_CONFIG_DIR/.ds-mode-active`.

## Uninstall

```bash
claude plugin uninstall ds-mode@ds-mode
claude plugin marketplace remove ds-mode
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active" "$CLAUDE_CONFIG_DIR/.ds-mode-installed"
# Optionally restore your settings.json from the backup:
# cp "$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode" "$CLAUDE_CONFIG_DIR/settings.json"
# Remove the DS_MODE_DEFAULT export from ~/.zshenv / ~/.zshrc / ~/.bashrc if you don't want it.
```

## Files this plugin writes

| Path | Purpose |
|---|---|
| `$CLAUDE_CONFIG_DIR/.ds-mode-active` | active mode (`lite` or `full`; absent = off) |
| `$CLAUDE_CONFIG_DIR/.ds-mode-installed` | sentinel — written on first run so a user-chosen disable state survives subsequent sessions |
| `$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode` | one-time backup of pre-install settings.json |
| `$TMPDIR/dsmode-summary-<ts>.html` | auto one-pagers fired during normal chat (ephemeral) |

The plugin never writes into your project repo or homedir without explicit opt-in.

## Other tools (Cursor, Copilot, Codex)

These get the TLDR + visual rules via `adapters/<tool>/`. Cursor and Codex can run the HTML build themselves (they have shell access); Copilot Chat in standard mode falls back to a markdown summary block. See `adapters/<tool>/README.md`.
