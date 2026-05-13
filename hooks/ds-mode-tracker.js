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

  // 1. Mode-switch commands: /dsm, /dsm <mode>, /ds-mode, /ds-mode <mode>.
  //    Match caveman's permissive prefix pattern (startsWith), not a strict
  //    anchored regex — Claude Code sometimes passes the expanded-prompt text
  //    or appends content after the slash, and a $ anchor silently drops the
  //    match on any of those variants.
  if (prompt.startsWith('/dsm') || prompt.startsWith('/ds-mode')) {
    const parts = prompt.split(/\s+/);
    const cmd = parts[0]; // /dsm, /ds-mode, /ds-mode:ds-mode, etc.
    const arg = (parts[1] || '').toLowerCase();

    // Only honor the bare toggle/alias commands here. /ds-mode-help,
    // /ds-mode-session-summary, /ds-mode-user-flows are skills, not toggles.
    if (cmd === '/dsm' || cmd === '/ds-mode' ||
        cmd === '/ds-mode:dsm' || cmd === '/ds-mode:ds-mode') {
      if (!arg) {
        safeWriteFlag(flagPath, getDefaultMode());
      } else if (arg === 'off') {
        deleteFlag(flagPath);
      } else if (VALID_MODES.includes(arg)) {
        safeWriteFlag(flagPath, arg);
      }
      // Fall through to emit reminder below.
    }
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

  const COMMON =
    'MANDATORY: render the ☻ TLDR [ds-mode] block at the bottom of any non-trivial reply. ' +
    'The block ALWAYS renders — caveman, explanatory output style, and other compression/tone rules DO NOT skip it. ' +
    'Caveman/terse style IS allowed INSIDE the bullets (fragments OK, drop articles) as long as bullets stay plain-English a non-technical PM understands. ' +
    'Add the ⚑ Questions for you block only when real blockers exist. ' +
    'Skip the TLDR only for one-line answers, yes/no, or "done" confirmations. ' +
    'Brand label outside the header is always "DS Mode".';

  const reminder = {
    lite:   'DS MODE ACTIVE (lite). ' + COMMON + ' Lite mode: NO HTML one-pager.',
    full:   'DS MODE ACTIVE (full). ' + COMMON + ' HTML one-pager fires when prime directive triggers fire (length / density / decision / blocker).',
    visual: 'DS MODE ACTIVE (visual). ' + COMMON + ' Visual mode: HTML one-pager fires on EVERY reply >3 sentences.',
  };
  process.stdout.write(reminder[current]);
});
