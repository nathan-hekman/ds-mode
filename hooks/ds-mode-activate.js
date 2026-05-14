#!/usr/bin/env node
// ds-mode-activate.js — Claude Code SessionStart hook for DS Mode
//
// On every session start:
//   1. Resolve active mode (lite | full | off):
//        - existing flag wins (user's per-session choice persists),
//        - else fall back to getDefaultMode() (env DS_MODE_DEFAULT or "full"),
//        - first-run with no sentinel honors the default; subsequent sessions
//          with a missing flag = user-disabled, stay off.
//   2. Write the flag + sentinel as needed.
//   3. If mode is `lite` or `full`, emit the DS Mode ruleset (filtered to the
//      active mode's row in the Modes table) so Claude carries it into the
//      session.

const fs = require('fs');
const path = require('path');
const {
  VALID_MODES,
  claudeConfigDir,
  getDefaultMode,
  safeWriteFlag,
  readMode,
  deleteFlag,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');
const sentinelPath = path.join(claudeDir, '.ds-mode-installed');

const existingMode = readMode(flagPath);
const hasSentinel = fs.existsSync(sentinelPath);

let mode;

if (existingMode) {
  // Flag exists and is valid — that wins.
  mode = existingMode;
} else if (!hasSentinel) {
  // First run on this machine — honor the configured default.
  try { fs.writeFileSync(sentinelPath, '1\n', { mode: 0o600 }); } catch (e) {}
  const defaultMode = getDefaultMode();
  if (defaultMode === 'off') {
    deleteFlag(flagPath);
    process.stdout.write('OK');
    process.exit(0);
  }
  safeWriteFlag(flagPath, defaultMode);
  mode = defaultMode;
} else {
  // Sentinel exists but flag is gone — user previously disabled. Stay off.
  process.stdout.write('OK');
  process.exit(0);
}

// Emit the ruleset, filtered to the active mode's table row.
const rulePath = path.join(__dirname, '..', 'rules', 'ds-mode.md');
let ruleContent = '';
try {
  ruleContent = fs.readFileSync(rulePath, 'utf8');
} catch (e) {
  process.stdout.write(
    'DS MODE ACTIVE — mode: ' + mode + '\n' +
    'TLDR block at bottom of every non-trivial response. ' +
    (mode === 'full'
      ? 'Visual HTML one-pager fires when reply is a decent length. '
      : 'No HTML in lite mode unless /ds-mode <prompt> invoked. ') +
    'Brand label: "DS Mode".'
  );
  process.exit(0);
}

// Strip frontmatter.
const body = ruleContent.replace(/^---[\s\S]*?---\s*/, '');

// Filter the Modes table: keep header rows, drop non-active mode rows.
// Mode rows look like: "| **lite** | ... |"
const filtered = body.split('\n').reduce((acc, line) => {
  const m = line.match(/^\|\s*\*\*(\S+?)\*\*\s*\|/);
  if (m && VALID_MODES.includes(m[1])) {
    if (m[1] === mode) acc.push(line);
    return acc;
  }
  acc.push(line);
  return acc;
}, []).join('\n');

process.stdout.write('DS MODE ACTIVE — mode: ' + mode + '\n\n' + filtered);
