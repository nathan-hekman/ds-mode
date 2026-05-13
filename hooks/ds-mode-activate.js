#!/usr/bin/env node
// ds-mode-activate.js — Claude Code SessionStart hook for DS Mode
//
// On every session start:
//   1. Resolve active mode (from flag file, or default).
//   2. Write/refresh flag file at $CLAUDE_CONFIG_DIR/.ds-mode-active.
//   3. If mode != off, emit the DS Mode ruleset filtered to the active mode,
//      so Claude carries those instructions into the session.

const fs = require('fs');
const path = require('path');
const {
  getDefaultMode,
  claudeConfigDir,
  safeWriteFlag,
  readFlag,
  deleteFlag,
  VALID_MODES,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');

// Mode resolution: existing flag wins (user's per-session choice persists),
// otherwise fall back to the configured default.
const existing = readFlag(flagPath);
const mode = (existing && VALID_MODES.includes(existing)) ? existing : getDefaultMode();

if (mode === 'off') {
  deleteFlag(flagPath);
  process.stdout.write('OK');
  process.exit(0);
}

safeWriteFlag(flagPath, mode);

// Read the SKILL.md ruleset. Plugin install layout:
//   __dirname = <plugin_root>/hooks/
//   SKILL.md at <plugin_root>/skills/ds-mode/SKILL.md
const skillPath = path.join(__dirname, '..', 'skills', 'ds-mode', 'SKILL.md');
let skillContent = '';
try {
  skillContent = fs.readFileSync(skillPath, 'utf8');
} catch (e) {
  // Defensive: emit minimal fallback if the SKILL.md was moved.
  process.stdout.write(
    'DS MODE ACTIVE — mode: ' + mode + '\n' +
    'TLDR block at bottom of every non-trivial response. ' +
    'HTML one-pager fires per prime directive. Brand label: "DS Mode".'
  );
  process.exit(0);
}

// Strip YAML frontmatter.
const body = skillContent.replace(/^---[\s\S]*?---\s*/, '');

// Filter the Modes table: keep header rows, drop non-active rows.
const filtered = body.split('\n').reduce((acc, line) => {
  const tableRowMatch = line.match(/^\|\s*\*\*(\S+?)\*\*\s*\|/);
  if (tableRowMatch) {
    if (tableRowMatch[1] === mode) acc.push(line);
    return acc;
  }
  acc.push(line);
  return acc;
}, []).join('\n');

process.stdout.write('DS MODE ACTIVE — mode: ' + mode + '\n\n' + filtered);
