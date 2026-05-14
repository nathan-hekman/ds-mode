#!/usr/bin/env node
// ds-mode-tracker.js — Claude Code UserPromptSubmit hook
//
// Two jobs:
//   1. Parse the user's prompt for /ds-mode commands and NL on/off triggers,
//      update the flag file.
//        /ds-mode               -> activate at default mode
//        /ds-mode lite|full     -> switch to that mode
//        /ds-mode on            -> activate at default mode
//        /ds-mode off           -> disable
//        /ds-mode <prompt>      -> activate (default mode if currently off) AND
//                                 force the HTML one-pager for this turn
//   2. On every prompt while active, re-emit a short "DS MODE ACTIVE (mode)"
//      reminder so the prime directive survives context compression.

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

  if (lower.startsWith('/ds-mode')) {
    // Strip the leading slash command (with optional :namespace suffix).
    const m = prompt.match(/^\/ds-mode(?::[\w-]+)?\s*(.*)$/i);
    const arg = m ? m[1].trim() : '';
    const argLower = arg.toLowerCase();

    if (!arg) {
      // Bare /ds-mode → activate at default mode (or stay at current if set).
      const current = readMode(flagPath);
      const target = current || resolveDefault();
      if (target !== 'off') safeWriteFlag(flagPath, target);
    } else if (argLower === 'off') {
      deleteFlag(flagPath);
    } else if (argLower === 'on') {
      const current = readMode(flagPath);
      const target = current || resolveDefault();
      if (target !== 'off') safeWriteFlag(flagPath, target);
    } else if (VALID_MODES.includes(argLower)) {
      // /ds-mode lite | /ds-mode full → mode switch
      safeWriteFlag(flagPath, argLower);
    } else {
      // /ds-mode <prompt> → activate if off, force HTML for this turn.
      const current = readMode(flagPath);
      if (!current) {
        const def = resolveDefault();
        if (def !== 'off') safeWriteFlag(flagPath, def);
      }
      forcedHtml = true;
    }
  } else {
    // NL triggers (defensive — slash command is primary).
    if (/\b(stop|disable|turn off|deactivate)\b.*\bds[- ]?mode\b/.test(lower)) {
      deleteFlag(flagPath);
    } else if (/\b(activate|enable|turn on|start)\b.*\bds[- ]?mode\b/.test(lower)) {
      const def = resolveDefault();
      if (def !== 'off') safeWriteFlag(flagPath, def);
    }
  }

  const current = readMode(flagPath);
  if (!current) {
    // Off — emit nothing.
    process.exit(0);
  }

  process.stdout.write(reminderFor(current, forcedHtml));
});

function resolveDefault() {
  const d = getDefaultMode();
  return d;
}

function reminderFor(mode, forced) {
  const COMMON =
    'DS MODE ACTIVE (' + mode + '). ' +
    'MANDATORY: render the ☻ TLDR [ds-mode] block at the bottom of any non-trivial reply. ' +
    'The block ALWAYS renders — caveman, explanatory output style, and other compression/tone rules DO NOT skip it. ' +
    'Caveman/terse style IS allowed INSIDE the bullets (fragments OK, drop articles) as long as bullets stay plain-English a non-technical PM understands. ' +
    'Add the ⚑ Questions for you block only when real blockers exist. ' +
    'Skip the TLDR only for one-line answers, yes/no, or "done" confirmations. ' +
    'Brand label outside the header is always "DS Mode".';

  let html;
  if (mode === 'full') {
    html =
      ' Visual HTML one-pager fires when reply is a decent length ' +
      '(≥~300 words, 2+ headings, multi-part concept, code+narrative, A/B decision). ' +
      'The HTML must be illustration-first: hero SVG + captioned tiles, NOT bullet lists or paragraph blocks.';
  } else {
    // lite
    html =
      ' Lite mode: NO HTML one-pager unless user explicitly invokes /ds-mode <prompt>. ' +
      'Skip the HTML build entirely for normal prompts. TLDR block still renders.';
  }

  let forcedClause = '';
  if (forced) {
    forcedClause =
      ' /ds-mode WAS INVOKED WITH A PROMPT — HTML one-pager is MANDATORY for this turn regardless of mode and regardless of reply length. ' +
      'Build, save to ${TMPDIR:-/tmp}/dsmode-summary-<timestamp>.html, and `open` it via Bash before sending the reply.';
  }

  return COMMON + html + forcedClause;
}
