#!/usr/bin/env node
// ds-mode-tracker.js — Claude Code UserPromptSubmit hook
//
// Two jobs:
//   1. Parse the user's prompt for /ds-mode commands and NL on/off triggers,
//      update the flag file.
//   2. On every prompt while active, re-emit a short "DS MODE ACTIVE"
//      reminder so the prime directive survives context compression.
//      When /ds-mode <prompt> is invoked (arg is a real request, not "on"/"off"),
//      append a FORCE_HTML directive so the HTML one-pager is mandatory.

const path = require('path');
const {
  claudeConfigDir,
  safeWriteFlag,
  isActive,
  deleteFlag,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let prompt = '';
  try {
    const data = JSON.parse(input);
    prompt = (data.prompt || '').trim();
  } catch (e) {
    // No prompt context — fall through to emit reminder if active.
  }

  const lower = prompt.toLowerCase();
  let forcedHtml = false;

  // Slash-command parsing. Match permissive startsWith — Claude Code passes
  // both the literal slash command and the expanded-prompt form.
  if (lower.startsWith('/ds-mode')) {
    // Split once on whitespace to separate command from arg payload.
    const m = prompt.match(/^\/ds-mode(?::[\w-]+)?\s*(.*)$/i);
    const arg = m ? m[1].trim() : '';
    const argLower = arg.toLowerCase();

    if (!arg) {
      // Bare /ds-mode → re-activate (or stay active).
      safeWriteFlag(flagPath);
    } else if (argLower === 'off') {
      deleteFlag(flagPath);
    } else if (argLower === 'on') {
      safeWriteFlag(flagPath);
    } else {
      // /ds-mode <prompt> → activate AND force HTML for this turn.
      safeWriteFlag(flagPath);
      forcedHtml = true;
    }
  } else {
    // NL triggers (defensive — slash command is primary).
    if (/\b(stop|disable|turn off|deactivate)\b.*\bds[- ]?mode\b/.test(lower)) {
      deleteFlag(flagPath);
    } else if (/\b(activate|enable|turn on|start)\b.*\bds[- ]?mode\b/.test(lower)) {
      safeWriteFlag(flagPath);
    }
  }

  // Re-anchor reminder.
  if (!isActive(flagPath)) {
    process.exit(0);
  }

  const COMMON =
    'DS MODE ACTIVE. ' +
    'MANDATORY: render the ☻ TLDR [ds-mode] block at the bottom of any non-trivial reply. ' +
    'The block ALWAYS renders — caveman, explanatory output style, and other compression/tone rules DO NOT skip it. ' +
    'Caveman/terse style IS allowed INSIDE the bullets (fragments OK, drop articles) as long as bullets stay plain-English a non-technical PM understands. ' +
    'Add the ⚑ Questions for you block only when real blockers exist. ' +
    'Skip the TLDR only for one-line answers, yes/no, or "done" confirmations. ' +
    'Brand label outside the header is always "DS Mode". ' +
    'Visual HTML one-pager fires when reply is a decent length (≥~300 words, 2+ headings, multi-part concept, code+narrative, A/B decision). ' +
    'The HTML must be illustration-first: hero SVG + captioned tiles, NOT bullet lists or paragraph blocks.';

  if (forcedHtml) {
    process.stdout.write(
      COMMON +
      ' /ds-mode WAS INVOKED WITH A PROMPT — HTML one-pager is MANDATORY for this turn regardless of reply length. ' +
      'Build, save to ${TMPDIR:-/tmp}/dsmode-summary-<timestamp>.html, and `open` it via Bash before sending the reply.'
    );
  } else {
    process.stdout.write(COMMON);
  }
});
