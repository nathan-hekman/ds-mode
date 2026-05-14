#!/usr/bin/env node
// ds-mode-activate.js — Claude Code SessionStart hook for DS Mode
//
// On every session start:
//   1. Resolve active mode (lite | full | off). Existing flag wins, else
//      fall back to getDefaultMode(). First-run sentinel logic preserves a
//      user-chosen "off" across sessions.
//   2. Resolve theme (auto | light | dark) from its flag file.
//   3. If mode is on, emit:
//      - one-line `DS MODE ACTIVE — mode: X · theme: Y · version: Z`
//      - the DS Mode ruleset (filtered to the active mode's table row)

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const {
  VALID_MODES,
  claudeConfigDir,
  getDefaultMode,
  readMode, safeWriteMode,
  getDefaultTheme, readTheme,
  deleteFlag,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');
const themePath = path.join(claudeDir, '.ds-mode-theme');
const sentinelPath = path.join(claudeDir, '.ds-mode-installed');
const updateFlagPath = path.join(claudeDir, '.ds-mode-update-available');

const existingMode = readMode(flagPath);
const hasSentinel = fs.existsSync(sentinelPath);

let mode;
if (existingMode) {
  mode = existingMode;
} else if (!hasSentinel) {
  try { fs.writeFileSync(sentinelPath, '1\n', { mode: 0o600 }); } catch (e) {}
  const def = getDefaultMode();
  if (def === 'off') {
    deleteFlag(flagPath);
    process.stdout.write('OK');
    process.exit(0);
  }
  safeWriteMode(flagPath, def);
  mode = def;
} else {
  // sentinel exists but no flag → user previously disabled. Stay off.
  process.stdout.write('OK');
  process.exit(0);
}

const theme = readTheme(themePath) || getDefaultTheme();

const stamperPath = path.resolve(__dirname, '..', 'templates', 'build.mjs');

// ----- update nudge (passive, never blocks) -----
const installedVersion = readInstalledVersion();
const updateLine = renderUpdateLine(installedVersion);
// Fire-and-forget the next refresh in the background so it never delays
// session start. The flag we just read was set by a PREVIOUS run.
spawnUpdateCheck();

const header = `DS MODE ACTIVE — mode: ${mode} · theme: ${theme} · version: ${installedVersion}${updateLine}\nStamper: ${stamperPath}\nThe stamper covers ~80% of one-pager shapes (explainer / comparison / decision / status). For those, invoke it via the absolute path above (do NOT use \${CLAUDE_PLUGIN_ROOT}; that variable is only set inside hook scripts, not the Bash tool). Example: \`node "${stamperPath}" explainer --slots '<json>' --screenshot\`. For shapes outside those four — tree diagrams, timelines, full-bleed hero, unusual tile counts — stamp + post-edit OR hand-write the HTML using the tokens from templates/_shared.css. The stamper is a starting point, not a cage.`;

// ----- main ruleset -----
const rulePath = path.join(__dirname, '..', 'rules', 'ds-mode.md');
let body = '';
try {
  const raw = fs.readFileSync(rulePath, 'utf8');
  body = raw.replace(/^---[\s\S]*?---\s*/, '');
  // Filter the Modes table: keep only the active mode's row.
  body = body.split('\n').reduce((acc, line) => {
    const m = line.match(/^\|\s*\*\*(\S+?)\*\*\s*\|/);
    if (m && VALID_MODES.includes(m[1])) {
      if (m[1] === mode) acc.push(line);
      return acc;
    }
    acc.push(line);
    return acc;
  }, []).join('\n');
} catch (e) {
  body =
    'TLDR block at bottom of every non-trivial response. ' +
    (mode === 'full'
      ? 'Visual HTML one-pager fires when reply is a decent length. '
      : 'No HTML in lite mode unless /ds-mode <prompt> invoked. ') +
    'Brand label: "DS Mode".';
}

// ----- theme overlay -----
let themeNote = '';
if (theme === 'dark') {
  themeNote = '\n\n**Active theme: dark.** When invoking the stamper, pass `--theme dark` so the one-pager hardcodes the dark palette regardless of OS preference.';
} else if (theme === 'light') {
  themeNote = '\n\n**Active theme: light.** When invoking the stamper, pass `--theme light` so the one-pager hardcodes the light palette regardless of OS preference.';
} else {
  themeNote = '\n\n**Active theme: auto.** The one-pager follows the OS dark-mode preference via prefers-color-scheme.';
}

process.stdout.write(header + '\n\n' + body + themeNote);

// ---------------------------------------------------------------------------

function readInstalledVersion() {
  try {
    const plugin = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8')
    );
    return plugin.version || '0.0.0';
  } catch (e) {
    return '0.0.0';
  }
}

// Renders the per-session "update available" line appended to the header, OR
// empty when no update OR when the flag's contents are stale (we already are
// at-or-above that version). Mode-on only — this function is never reached
// when DS Mode is off.
function renderUpdateLine(installed) {
  try {
    const latest = fs.readFileSync(updateFlagPath, 'utf8').trim();
    if (!latest || !/^\d+\.\d+\.\d+/.test(latest)) return '';
    if (!semverGt(latest, installed)) {
      try { fs.unlinkSync(updateFlagPath); } catch (e) {}
      return '';
    }
    return `\nDS Mode v${latest} is available — run \`claude plugin update ds-mode@ds-mode\` and restart Claude Code to pick it up.`;
  } catch (e) {
    return '';
  }
}

function semverGt(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const ai = pa[i] || 0;
    const bi = pb[i] || 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return false;
}

// Fire-and-forget the update-check script as a detached child process so the
// network call never delays SessionStart. The child writes the flag for the
// next session to read.
function spawnUpdateCheck() {
  try {
    const child = spawn(
      process.execPath,
      [path.join(__dirname, 'ds-mode-update-check.js')],
      {
        detached: true,
        stdio: 'ignore',
        env: process.env,
      }
    );
    child.unref();
  } catch (e) { /* silent */ }
}
