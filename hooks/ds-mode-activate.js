#!/usr/bin/env node
// ds-mode-activate.js — Claude Code SessionStart hook for DS Mode
//
// On every session start:
//   1. Resolve active mode (lite | full | off). Existing flag wins, else
//      fall back to getDefaultMode(). First-run sentinel logic preserves a
//      user-chosen "off" across sessions.
//   2. Resolve theme (auto | light | dark) and tone (default | surfer) from
//      their flag files.
//   3. If mode is on, emit:
//      - one-line `DS MODE ACTIVE — mode: X · theme: Y · tone: Z`
//      - the DS Mode ruleset (filtered to the active mode's table row)
//      - the surfer overlay ruleset if tone == surfer

const fs = require('fs');
const path = require('path');
const {
  VALID_MODES,
  claudeConfigDir,
  getDefaultMode,
  readMode, safeWriteMode,
  getDefaultTheme, readTheme,
  getDefaultTone, readTone,
  deleteFlag,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');
const themePath = path.join(claudeDir, '.ds-mode-theme');
const tonePath = path.join(claudeDir, '.ds-mode-tone');
const sentinelPath = path.join(claudeDir, '.ds-mode-installed');

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
const tone = readTone(tonePath) || getDefaultTone();

const stamperPath = path.resolve(__dirname, '..', 'templates', 'build.mjs');
const header = `DS MODE ACTIVE — mode: ${mode} · theme: ${theme} · tone: ${tone}\nStamper: ${stamperPath}\nWhen the HTML one-pager fires, invoke the stamper at the absolute path above (do NOT use \${CLAUDE_PLUGIN_ROOT}; that variable is only set inside hook scripts, not the Bash tool). Example: \`node "${stamperPath}" explainer --slots '<json>' --screenshot\`.`;

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

// ----- tone overlay -----
let toneOverlay = '';
if (tone === 'surfer') {
  const surferPath = path.join(__dirname, '..', 'rules', 'ds-mode-surfer.md');
  try {
    const raw = fs.readFileSync(surferPath, 'utf8');
    toneOverlay = '\n\n---\n\n' + raw.replace(/^---[\s\S]*?---\s*/, '');
  } catch (e) {}
}

process.stdout.write(header + '\n\n' + body + themeNote + toneOverlay);
