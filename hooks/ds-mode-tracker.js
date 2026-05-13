#!/usr/bin/env node
// ds-mode-tracker.js — Claude Code UserPromptSubmit hook
//
// Two jobs:
//   1. Parse the user's prompt for /dsm or /ds-mode mode-switch commands and
//      NL triggers ("ds mode on", "stop ds mode") — update the flag file.
//   2. On every prompt, re-emit a short "DS MODE ACTIVE" reminder so the
//      prime directive survives context compression mid-session.

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

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let prompt = '';
  try {
    const data = JSON.parse(input);
    prompt = (data.prompt || '').trim().toLowerCase();
  } catch (e) {
    // No prompt context — just emit reminder if mode active.
  }

  // 1. Mode-switch commands: /dsm, /dsm <mode>, /ds-mode, /ds-mode <mode>
  const slashMatch = /^\/(dsm|ds-mode)(?:\s+(\w+))?$/.exec(prompt);
  if (slashMatch) {
    const arg = (slashMatch[2] || '').toLowerCase();
    if (!arg) {
      safeWriteFlag(flagPath, getDefaultMode());
    } else if (arg === 'off') {
      deleteFlag(flagPath);
    } else if (VALID_MODES.includes(arg)) {
      safeWriteFlag(flagPath, arg);
    }
    // Fall through to emit reminder below.
  }

  // 2. NL triggers (defensive — slash commands are primary).
  if (/\b(stop|disable|turn off|deactivate)\b.*\bds[- ]?mode\b/.test(prompt)) {
    deleteFlag(flagPath);
  } else if (/\b(activate|enable|turn on|start)\b.*\bds[- ]?mode\b/.test(prompt) ||
             /\b(talk like|ds[- ]?mode)\b.*\b(mode|on|active)\b/.test(prompt)) {
    safeWriteFlag(flagPath, getDefaultMode());
  }

  // 3. Re-anchor reminder.
  const current = readFlag(flagPath);
  if (!current || current === 'off' || !VALID_MODES.includes(current)) {
    // No active mode — emit nothing.
    process.exit(0);
  }

  const reminder = {
    lite:   'DS MODE ACTIVE (lite). TLDR block at bottom of non-trivial replies. NO HTML one-pager. Brand label "DS Mode".',
    full:   'DS MODE ACTIVE (full). TLDR block at bottom of non-trivial replies. HTML one-pager fires when prime directive triggers fire (length/density/decision/blocker). Brand label "DS Mode".',
    visual: 'DS MODE ACTIVE (visual). TLDR block at bottom of every non-trivial reply. HTML one-pager fires on EVERY reply >3 sentences. Brand label "DS Mode".',
  };
  process.stdout.write(reminder[current]);
});
