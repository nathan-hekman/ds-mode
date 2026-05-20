#!/usr/bin/env node
// ds-mode-tracker.js — Claude Code UserPromptSubmit hook for DS Mode.
//
// Parses /ds-mode sub-commands and updates the matching flag file, then
// re-emits a short "DS MODE ACTIVE (mode · theme)" reminder so the
// prime directive survives context compression.
//
//   /ds-mode                  → activate at default mode
//   /ds-mode on               → activate at default mode
//   /ds-mode off              → disable (delete flag)
//   /ds-mode lite | full      → switch mode
//   /ds-mode dark|light|auto  → switch theme
//   /ds-mode <free text>      → activate AND force HTML one-pager this turn

const path = require('path');
const fs = require('fs');
const {
  VALID_MODES, VALID_THEMES,
  claudeConfigDir,
  getDefaultMode, readMode, safeWriteMode,
  getDefaultTheme, readTheme, safeWriteTheme,
  readMobileConfig, writeMobileConfig, mobileIsEnabled,
  deleteFlag,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');
const themePath = path.join(claudeDir, '.ds-mode-theme');
const mobilePath = path.join(claudeDir, '.ds-mode-mobile');

let mobileNote = '';
let previewNote = '';

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
    const previewMatch = argLower.match(/^preview(?:\s+(on|off|status))?$/);

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
    } else if (mobileMatch) {
      handleMobileSubcommand(mobileMatch[1] || 'status');
      ensureActive();
    } else if (previewMatch) {
      handlePreviewSubcommand(previewMatch[1] || 'status');
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
  const mobileEnabled = mobileIsEnabled(mobilePath);
  const mobileCfg = readMobileConfig(mobilePath);
  const previewState = readPreviewState();
  process.stdout.write(reminderFor({
    mode, theme,
    mobileEnabled, mobileCfg,
    previewState,
    forcedHtml, toggleNote, mobileNote, previewNote,
  }));
});

function readPreviewState() {
  try {
    const p = path.join(process.cwd(), '.ds-mode', 'preview.json');
    const raw = fs.readFileSync(p, 'utf8');
    const data = JSON.parse(raw);
    if (data && typeof data === 'object' && data.enabled === true) return data;
  } catch (e) {}
  return null;
}

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

function handlePreviewSubcommand(sub) {
  const previewScript = path.resolve(__dirname, 'ds-mode-preview.js');

  if (sub === 'on') {
    previewNote =
      ' /ds-mode preview on invoked (Research Preview feature). Follow these steps in order: ' +
      '(1) FIRST verify the `mcp__Claude_Preview__preview_start` tool is available in this session. ' +
      'If it is NOT available, abort BEFORE touching any files and tell the user: "DS Mode Preview ' +
      'requires Claude Desktop. The preview_start tool is not available in this session. No files were modified." ' +
      '(2) If the tool IS available, CONFIRM with the user in ONE line and wait for explicit yes/no: ' +
      '"Enable DS Mode Preview for THIS project? I will write .claude/launch.json (merging any existing ' +
      'configs), append .ds-mode/ to .gitignore, create a .ds-mode/ folder, and start a tiny local feed ' +
      'server on 127.0.0.1 that the Preview pane mounts. [yes/no]" ' +
      '(3) If yes, run: `node "' + previewScript + '" on` from the user\'s project root via Bash. ' +
      'Parse the JSON it prints to stdout. ' +
      '(4) Call mcp__Claude_Preview__preview_start with { "name": "ds-mode-feed" }. ' +
      '(5) Confirm to the user in one line: "DS Mode Preview is ON for <project>. Pane mounted on ' +
      'http://127.0.0.1:<port>/. The pane auto-refreshes every 3 seconds. Disable with /ds-mode preview off." ' +
      'Do NOT generate a TLDR or HTML one-pager for this turn.';
    return;
  }

  if (sub === 'off') {
    previewNote =
      ' /ds-mode preview off invoked. Follow these steps in order: ' +
      '(1) Run: `node "' + previewScript + '" off` from the user\'s project root via Bash. ' +
      'Parse the JSON it prints. ' +
      '(2) If the `mcp__Claude_Preview__preview_list` tool is available, call it, find the server entry ' +
      'whose name is "ds-mode-feed" (or whose runtimeArgs reference preview-server.mjs), and call ' +
      'mcp__Claude_Preview__preview_stop with that serverId. If the tool is not available, skip this step. ' +
      '(3) Confirm to the user in one line: "DS Mode Preview is OFF for <project>. .claude/launch.json ' +
      'cleaned up. .ds-mode/ directory left in place — delete manually to clear past visuals." ' +
      'Do NOT generate a TLDR or HTML one-pager for this turn.';
    return;
  }

  // status
  previewNote =
    ' /ds-mode preview status invoked. Run: `node "' + previewScript + '" status` from the user\'s ' +
    'project root via Bash. Parse the JSON it prints. Report to the user in one concise line whether ' +
    'preview is ON or OFF for this project, and if ON include the port and server name. Do NOT generate ' +
    'a TLDR or HTML one-pager for this turn.';
}

function reminderFor({ mode, theme, mobileEnabled, mobileCfg, previewState, forcedHtml, toggleNote, mobileNote, previewNote }) {
  const stamperPath = path.resolve(__dirname, '..', 'templates', 'build.mjs');
  const COMMON =
    `DS MODE ACTIVE (mode: ${mode} · theme: ${theme}). ` +
    'MANDATORY: render the ☻ TLDR [ds-mode] block at the bottom of any non-trivial reply. ' +
    'TLDR FORMAT (strict): header line `☻ TLDR [ds-mode] ──────────` (10 × U+2500 INLINE on the header line, never on their own line). Bullets directly under. Questions block (if used) header `⚑ Questions for you ──────────` (same inline-dashes shape). NO standalone close-rule dash lines anywhere — Claude mobile parses dash-only lines as a table divider and emits literal <tr><td>. ' +
    'TLDR CONTENT (hard caps — count before sending): MAX 3 bullets. MAX 12 words per bullet. ELI8 (a 2nd-grader reads it). ZERO jargon — none of: orchestrator, daemon, WebSocket, SIGINT, kernel, async, cron, regex, endpoint, hook, runtime, payload, socket, process, subprocess. ' +
    'Skip the TLDR only for one-line answers, yes/no, or "done" confirmations, or short status/fix updates. ' +
    'Add the ⚑ Questions for you block only when real blockers exist (no close-rule dashes there either). ' +
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

  let previewClause = '';
  if (previewState && previewState.enabled) {
    previewClause =
      ' DS Mode Preview is ON for this project (Research Preview). The stamper now auto-routes its HTML ' +
      'output into .ds-mode/ inside the project root, so every visual one-pager you generate this turn ' +
      'will also appear in the Preview pane on http://127.0.0.1:' + (previewState.port || 49100) + '/ ' +
      'within ~3 seconds. Keep stamping normally — no extra flags needed. The pane will list newest-first ' +
      'with the latest visual inlined.';
  }

  return COMMON + html + themeClause + mobileClause + previewClause +
    (toggleNote || '') + (mobileNote || '') + (previewNote || '') + forcedClause;
}
