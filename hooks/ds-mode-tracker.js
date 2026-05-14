#!/usr/bin/env node
// ds-mode-tracker.js — Claude Code UserPromptSubmit hook for DS Mode.
//
// Parses /ds-mode sub-commands and updates the matching flag file, then
// re-emits a short "DS MODE ACTIVE (mode · theme · tone)" reminder so the
// prime directive survives context compression.
//
//   /ds-mode                  → activate at default mode
//   /ds-mode on               → activate at default mode
//   /ds-mode off              → disable (delete flag)
//   /ds-mode lite | full      → switch mode
//   /ds-mode dark|light|auto  → switch theme
//   /ds-mode surfer|default   → switch tone (easter egg)
//   /ds-mode <free text>      → activate AND force HTML one-pager this turn

const path = require('path');
const {
  VALID_MODES, VALID_THEMES, VALID_TONES,
  claudeConfigDir,
  getDefaultMode, readMode, safeWriteMode,
  getDefaultTheme, readTheme, safeWriteTheme,
  getDefaultTone, readTone, safeWriteTone,
  deleteFlag,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');
const themePath = path.join(claudeDir, '.ds-mode-theme');
const tonePath = path.join(claudeDir, '.ds-mode-tone');

let input = '';
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = (JSON.parse(input).prompt || '').trim(); } catch (e) {}

  const lower = prompt.toLowerCase();
  let forcedHtml = false;
  let toggleNote = '';

  if (lower.startsWith('/ds-mode')) {
    const m = prompt.match(/^\/ds-mode(?::[\w-]+)?\s*(.*)$/i);
    const arg = m ? m[1].trim() : '';
    const argLower = arg.toLowerCase();

    if (!arg) {
      ensureActive();
    } else if (argLower === 'off') {
      deleteFlag(flagPath);
    } else if (argLower === 'on') {
      ensureActive();
    } else if (VALID_MODES.includes(argLower)) {
      safeWriteMode(flagPath, argLower);
      toggleNote = ` Mode just switched to "${argLower}".`;
    } else if (VALID_THEMES.includes(argLower)) {
      safeWriteTheme(themePath, argLower);
      toggleNote = ` Theme just switched to "${argLower}".` +
        (argLower === 'auto'
          ? ' Stamper will keep the prefers-color-scheme media query.'
          : ` Stamper must pass --theme ${argLower} so the one-pager hardcodes that palette.`);
      ensureActive();
    } else if (VALID_TONES.includes(argLower)) {
      safeWriteTone(tonePath, argLower);
      toggleNote = ` Tone just switched to "${argLower}".` +
        (argLower === 'surfer'
          ? ' Surfer overlay rules now apply: chill cadence, plain words, one 🤙 allowed.'
          : ' Default voice restored.');
      ensureActive();
    } else {
      // free-text → force HTML this turn
      ensureActive();
      forcedHtml = true;
    }
  } else {
    if (/\b(stop|disable|turn off|deactivate)\b.*\bds[- ]?mode\b/.test(lower)) {
      deleteFlag(flagPath);
    } else if (/\b(activate|enable|turn on|start)\b.*\bds[- ]?mode\b/.test(lower)) {
      ensureActive();
    }
  }

  const mode = readMode(flagPath);
  if (!mode) process.exit(0);

  const theme = readTheme(themePath) || getDefaultTheme();
  const tone = readTone(tonePath) || getDefaultTone();
  process.stdout.write(reminderFor({ mode, theme, tone, forcedHtml, toggleNote }));
});

function ensureActive() {
  const cur = readMode(flagPath);
  if (cur) return;
  const def = getDefaultMode();
  if (def !== 'off') safeWriteMode(flagPath, def);
}

function reminderFor({ mode, theme, tone, forcedHtml, toggleNote }) {
  const stamperPath = path.resolve(__dirname, '..', 'templates', 'build.mjs');
  const COMMON =
    `DS MODE ACTIVE (mode: ${mode} · theme: ${theme} · tone: ${tone}). ` +
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
      'The HTML must be illustration-first: hero SVG + captioned tiles, NOT bullet lists or paragraph blocks. ' +
      `For the common 4 shapes (explainer / comparison / decision / status) use the stamper: \`node "${stamperPath}" <kind> --slots '<json>' --screenshot\`. ` +
      'For shapes outside those four — tree diagrams, timelines, full-bleed hero, unusual tile counts — either stamp + post-edit, OR hand-write the HTML using the same tokens from `templates/_shared.css`. The stamper is a starting point, not a cage. Tile captions ≤ 12 words. ELI8.';
  } else {
    html =
      ' Lite mode: NO HTML one-pager unless user explicitly invokes /ds-mode <prompt>. ' +
      'Skip the HTML build entirely for normal prompts. TLDR block still renders.';
  }

  let themeClause = '';
  if (theme === 'auto') {
    themeClause = ' Active theme is `auto` — when the stamper runs, the one-pager keeps the prefers-color-scheme media query and follows OS preference.';
  } else {
    themeClause = ` Active theme is **${theme}** — when invoking the stamper, pass --theme ${theme} so the one-pager hardcodes that palette regardless of OS preference.`;
  }

  let toneClause = '';
  if (tone === 'surfer') {
    toneClause = ' Tone is **surfer** (easter egg). Voice in the body, TLDR, and HTML captions: chill surfer-bro cadence, plain ELI8 words, friendly. One 🤙 allowed in eyebrow or footer only. No exclamation marks. No emoji elsewhere.';
  }

  let forcedClause = '';
  if (forcedHtml) {
    forcedClause =
      ' /ds-mode WAS INVOKED WITH A PROMPT — HTML one-pager is MANDATORY for this turn regardless of mode and regardless of reply length. ' +
      'Use templates/build.mjs to stamp it, then `open` it via Bash.';
  }

  return COMMON + html + themeClause + toneClause + toggleNote + forcedClause;
}
