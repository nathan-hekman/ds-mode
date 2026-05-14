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
const fs = require('fs');
const {
  VALID_MODES, VALID_THEMES, VALID_TONES,
  claudeConfigDir,
  getDefaultMode, readMode, safeWriteMode,
  getDefaultTheme, readTheme, safeWriteTheme,
  getDefaultTone, readTone, safeWriteTone,
  readMobileConfig, writeMobileConfig, mobileIsEnabled,
  deleteFlag,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');
const themePath = path.join(claudeDir, '.ds-mode-theme');
const tonePath = path.join(claudeDir, '.ds-mode-tone');
const mobilePath = path.join(claudeDir, '.ds-mode-mobile');

let mobileNote = '';

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
    const mobileMatch = argLower.match(/^mobile(?:\s+(on|off|setup|status))?$/);

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
          ? ' Surfer overlay rules now apply: chill cadence, plain words. Zero emoji.'
          : ' Default voice restored.');
      ensureActive();
    } else if (mobileMatch) {
      handleMobileSubcommand(mobileMatch[1] || 'status');
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
  const mobileEnabled = mobileIsEnabled(mobilePath);
  const mobileCfg = readMobileConfig(mobilePath);
  process.stdout.write(reminderFor({ mode, theme, tone, mobileEnabled, mobileCfg, forcedHtml, toggleNote, mobileNote }));
});

function ensureActive() {
  const cur = readMode(flagPath);
  if (cur) return;
  const def = getDefaultMode();
  if (def !== 'off') safeWriteMode(flagPath, def);
}

// Handles `/ds-mode mobile [on|off|setup|status]`. Setup is interactive and
// runs as a Bash script, so this function emits an instruction in
// `mobileNote` telling Claude to run the setup script. on/off just flip the
// `enabled` field in the existing config (if any). status prints whether
// mobile mode is currently active and what repo it publishes to.
function handleMobileSubcommand(sub) {
  const cfg = readMobileConfig(mobilePath);
  const setupScript = path.resolve(__dirname, 'ds-mode-mobile-setup.sh');

  if (sub === 'setup') {
    mobileNote =
      ' /ds-mode mobile setup invoked. Run the setup wizard via Bash now: ' +
      '`bash "' + setupScript + '"`. It checks for `gh` CLI, creates (or reuses) a ' +
      'PRIVATE GitHub repo named <user>/ds-mode-mobile under the current `gh` user, ' +
      'clones it to $CLAUDE_CONFIG_DIR/ds-mode-mobile, and writes the config file. ' +
      'Surface the wizard\'s stdout to the user verbatim. ' +
      'Do not generate a TLDR or HTML for this turn.';
    return;
  }

  if (sub === 'on') {
    if (!cfg || !cfg.repo) {
      mobileNote =
        ' /ds-mode mobile on requested but setup has not run yet. ' +
        'Run the setup wizard first: `bash "' + setupScript + '"`. ' +
        'It will create a private GitHub repo using the user\'s existing `gh` auth, ' +
        'then enable mobile mode automatically.';
      return;
    }
    cfg.enabled = true;
    writeMobileConfig(mobilePath, cfg);
    mobileNote =
      ' Mobile mode is now ON. Future one-pagers will auto-publish to https://github.com/' +
      cfg.repo + ' (private, owner-only) in the background. Each reply that triggers a ' +
      'one-pager should include the GitHub URL printed by the stamper alongside the local file.';
    return;
  }

  if (sub === 'off') {
    if (cfg) {
      cfg.enabled = false;
      writeMobileConfig(mobilePath, cfg);
    }
    mobileNote =
      ' Mobile mode is now OFF. The config is preserved — `/ds-mode mobile on` re-enables ' +
      'without re-running setup.';
    return;
  }

  // status
  if (!cfg) {
    mobileNote =
      ' Mobile mode: not configured. Run `/ds-mode mobile setup` to enable.';
  } else if (cfg.enabled) {
    mobileNote =
      ' Mobile mode: ON. Publishing to https://github.com/' + cfg.repo +
      ' (private). Local clone: ' + cfg.clone_path + '.';
  } else {
    mobileNote =
      ' Mobile mode: configured but off. Repo: ' + cfg.repo +
      '. Re-enable with `/ds-mode mobile on`.';
  }
}

function reminderFor({ mode, theme, tone, mobileEnabled, mobileCfg, forcedHtml, toggleNote, mobileNote }) {
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
    toneClause = ' Tone is **surfer** (easter egg). Voice in the body, TLDR, and HTML captions: chill surfer-bro cadence, plain ELI8 words, friendly. Zero emoji anywhere. No exclamation marks.';
  }

  let forcedClause = '';
  if (forcedHtml) {
    forcedClause =
      ' /ds-mode WAS INVOKED WITH A PROMPT — HTML one-pager is MANDATORY for this turn regardless of mode and regardless of reply length. ' +
      'Use templates/build.mjs to stamp it, then `open` it via Bash.';
  }

  let mobileClause = '';
  if (mobileEnabled && mobileCfg) {
    mobileClause =
      ' Mobile mode is ON: when the stamper runs with --screenshot, it auto-publishes the PNG to ' +
      'https://github.com/' + mobileCfg.repo + ' (private, owner-only) in the background. ' +
      'The stamper prints a second URL line after the PNG path — include that URL verbatim in your reply, ' +
      'placed near the "Opened a one-page visual summary" mention. Phone users tap it to view in their ' +
      'logged-in GitHub session.';
  }

  return COMMON + html + themeClause + toneClause + mobileClause + (toggleNote || '') + (mobileNote || '') + forcedClause;
}
