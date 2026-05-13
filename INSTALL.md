# DS Mode — Install Reference

## Pure Claude Code commands (recommended)

```bash
claude plugin marketplace add nathan-hekman/ds-mode
claude plugin install ds-mode@ds-mode
```

That's the canonical install path. It clones the marketplace into `$CLAUDE_CONFIG_DIR/plugins/marketplaces/ds-mode/`, registers it in `$CLAUDE_CONFIG_DIR/plugins/known_marketplaces.json`, installs the plugin into `$CLAUDE_CONFIG_DIR/plugins/cache/ds-mode/ds-mode/<commit>/`, and records it in `$CLAUDE_CONFIG_DIR/plugins/installed_plugins.json` — so DS Mode shows up in `/plugin list` and in Claude Code's desktop plugin UI.

Restart Claude Code (or open a new session) and DS Mode is active.

## One-line install (includes shell-rc setup)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
```

This clones the repo to a temp dir and runs `install.sh --force`, which does the two `claude plugin` commands above plus:

- writes `$CLAUDE_CONFIG_DIR/.ds-mode-active = full` so the SessionStart hook has a mode to read
- strips any legacy `"outputStyle": "DS Mode"` (or `"Dipsh*t Mode"`) entry from `settings.json` left behind by the deprecated v1 install
- appends `export DS_MODE_DEFAULT="full"` to your shell rc so the default survives flag deletion

Idempotent. Safe to re-run.

## Local clone install

```bash
git clone https://github.com/nathan-hekman/ds-mode.git
cd ds-mode
./install.sh                          # plugin + flag + shell rc (full default)
./install.sh --minimal                # plugin only (skip shell rc edit)
./install.sh --default-mode lite      # default to lite mode in new sessions
./install.sh --dry-run                # preview, write nothing
./install.sh --force                  # re-run even if already installed
```

## What the installer does

1. Runs `claude plugin marketplace add nathan-hekman/ds-mode` (registers the marketplace).
2. Runs `claude plugin install ds-mode@ds-mode` (clones into the plugins cache + records the install).
3. Backs up `$CLAUDE_CONFIG_DIR/settings.json` to `settings.json.bak.preDSmode` and strips any stale `outputStyle` value left over from v1.
4. Writes `$CLAUDE_CONFIG_DIR/.ds-mode-active = full` (or your `--default-mode`).
5. Adds `export DS_MODE_DEFAULT="full"` (or your default) to `~/.zshenv` / `~/.zshrc` / `~/.bashrc` / `~/.bash_profile` so future shells inherit it (skipped with `--minimal`).

## Activating in Claude Code

Once the two `claude plugin` commands have run, hooks fire automatically on the next session. If they don't:

- Confirm registration: `claude plugin list` should show `ds-mode@ds-mode`.
- Confirm marketplace: `claude plugin marketplace list` should show `ds-mode`.
- Restart Claude Code (the SessionStart hook only fires on a fresh session).

## Verifying

```bash
cat $CLAUDE_CONFIG_DIR/.ds-mode-active   # should print: full (or your chosen default)
```

In Claude Code, the next session should open with the message `DS MODE ACTIVE — mode: full` in the system context. Type any non-trivial question and you should see:
- A TLDR block at the bottom of the reply, AND
- An HTML one-pager opened in your browser (in `full` or `visual` mode, when triggers fire).

## Switching modes

| Command | Effect |
|---|---|
| `/dsm` | activate at install default |
| `/dsm lite` | TLDR only, no HTML |
| `/dsm full` | TLDR + HTML when prime directive fires |
| `/dsm visual` | TLDR + HTML on every non-trivial reply |
| `/dsm off` | disable for this session |

Per-session state persists until you change it or `/dsm off`.

## Uninstall

```bash
claude plugin uninstall ds-mode@ds-mode
claude plugin marketplace remove ds-mode
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active"
# Optionally restore your settings.json from the backup:
# cp "$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode" "$CLAUDE_CONFIG_DIR/settings.json"
# Remove the DS_MODE_DEFAULT export from ~/.zshenv / ~/.zshrc / ~/.bashrc if you don't want it.
```

## Files this plugin writes

| Path | Purpose |
|---|---|
| `$CLAUDE_CONFIG_DIR/.ds-mode-active` | current mode (`lite`/`full`/`visual` or absent for `off`) |
| `$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode` | one-time backup of pre-install settings.json |
| `$TMPDIR/dsmode-summary-<ts>.html` | auto one-pagers fired during normal chat (ephemeral) |
| `$TMPDIR/dsmode-session-summary-<ts>.html` | `/ds-mode-session-summary` output |
| `$TMPDIR/dsmode-user-flows-<slug>-<ts>.{html,json}` | `/ds-mode-user-flows` output |

The plugin never writes into your project repo or homedir without explicit opt-in.

## Other tools (Cursor, Copilot, Codex)

These get the TLDR-bottom rule via `adapters/<tool>/`. They do not get the HTML one-pager, mode toggle, or skills — those depend on Claude Code's hook system. See `adapters/<tool>/README.md`.
