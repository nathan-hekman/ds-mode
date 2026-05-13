# DS Mode — Install Reference

## One-line install (recommended)

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/nathan-hekman/ds-mode/main/install-claude-code.sh)
```

Clones the repo to a temp dir and runs `install.sh --force`. Idempotent. Safe to re-run.

## Local clone install

```bash
git clone https://github.com/nathan-hekman/ds-mode.git
cd ds-mode
./install.sh                          # plugin + hooks + statusline (full default)
./install.sh --minimal                # plugin only (no statusline / shell rc edits)
./install.sh --default-mode lite      # default to lite mode in new sessions
./install.sh --dry-run                # preview, write nothing
./install.sh --force                  # overwrite a prior install
```

## What the installer does

1. Copies the repo into `$CLAUDE_CONFIG_DIR/plugins/marketplaces/ds-mode/`.
2. Backs up `$CLAUDE_CONFIG_DIR/settings.json` to `settings.json.bak.preDSmode` and strips any stale `outputStyle` value left over from v1.
3. Writes `$CLAUDE_CONFIG_DIR/.ds-mode-active = full` (or your `--default-mode`).
4. Adds `export DS_MODE_DEFAULT="full"` (or your default) to `~/.zshenv` / `~/.bashrc` so future shells inherit it (skipped with `--minimal`).

## Activating in Claude Code

The plugin's hooks fire automatically once the plugin is on your `~/.claude/plugins` path and the marketplace is registered. If hooks don't fire:

- Confirm `~/.claude/plugins/marketplaces/ds-mode/.claude-plugin/marketplace.json` exists.
- Open Claude Code's plugin manager and verify `ds-mode` is installed/enabled.
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
rm -rf "$CLAUDE_CONFIG_DIR/plugins/marketplaces/ds-mode"
rm -f "$CLAUDE_CONFIG_DIR/.ds-mode-active"
# Optionally restore your settings.json from the backup:
# cp "$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode" "$CLAUDE_CONFIG_DIR/settings.json"
# Remove the DS_MODE_DEFAULT export from ~/.zshenv / ~/.bashrc if you don't want it.
```

## Files this plugin writes

| Path | Purpose |
|---|---|
| `$CLAUDE_CONFIG_DIR/.ds-mode-active` | current mode (`lite`/`full`/`visual` or absent for `off`) |
| `$CLAUDE_CONFIG_DIR/settings.json.bak.preDSmode` | one-time backup of pre-install settings.json |
| `$TMPDIR/dsmode-summary-<ts>.html` | auto one-pagers fired during normal chat (ephemeral) |
| `$TMPDIR/dsmode-recap-<ts>.html` | `/ds-mode-show` output |
| `$TMPDIR/dsmode-user-flows-<slug>-<ts>.{html,json}` | `/ds-mode-user-flows` output |

The plugin never writes into your project repo or homedir without explicit opt-in.

## Other tools (Cursor, Copilot, Codex)

These get the TLDR-bottom rule via `adapters/<tool>/`. They do not get the HTML one-pager, mode toggle, or skills — those depend on Claude Code's hook system. See `adapters/<tool>/README.md`.
