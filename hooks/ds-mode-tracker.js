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
  // The full format spec is restated at SessionStart. The per-prompt reminder
  // only needs to keep the contract alive turn-to-turn. In lite mode emit a
  // compact version (~250 tok) instead of the full one (~675 tok); full mode
  // keeps the verbose spec since its auto-HTML behavior is higher-stakes.
  const COMMON = (mode === 'lite')
    ? `DS MODE ACTIVE (mode: ${mode} · theme: ${theme}). ` +
      'Render the ☻ TLDR [ds-mode] block at the bottom of non-trivial replies (skip for one-line / yes-no / "done" / short status). ' +
      'Header `☻ TLDR [ds-mode] ──────────` (U+2500 dashes INLINE on the header line) as PLAIN markdown, never code-fenced; then MAX 3 bullets, MAX 12 words each, ELI8, zero jargon. No standalone dash-only lines. ' +
      'If calling AskUserQuestion with substantive content already in the turn, render the TLDR in text IMMEDIATELY BEFORE the tool call (choices go in the tool, not a ⚑ text block). ' +
      'IMAGES: do not auto-Read every screenshot/PNG; Read inline only to show a finished visual, prefer text preview tools while iterating.'
    : `DS MODE ACTIVE (mode: ${mode} · theme: ${theme}). ` +
    'MANDATORY: render the ☻ TLDR [ds-mode] block at the bottom of any non-trivial reply. ' +
    'TLDR FORMAT (strict): header line `☻ TLDR [ds-mode] ──────────` (10 × U+2500 INLINE on the header line, never on their own line). Bullets directly under. Questions block (if used) header `⚑ Questions for you ──────────` (same inline-dashes shape). NO standalone close-rule dash lines anywhere — Claude mobile parses dash-only lines as a table divider and emits literal <tr><td>. ' +
    'CRITICAL: render the TLDR header + bullets as PLAIN MARKDOWN — do NOT wrap them in a fenced code block (triple backticks) or any other code formatting. The U+2500 box-drawing chars are not ASCII hyphens and do not trigger Setext-heading or table-divider parsing, so the header is safe as plain text. Wrapping in a code fence makes mobile render the whole TLDR as a gray monospace block. ' +
    'TLDR CONTENT (hard caps — count before sending): MAX 3 bullets. MAX 12 words per bullet. ELI8 (a 2nd-grader reads it). ZERO jargon — none of: orchestrator, daemon, WebSocket, SIGINT, kernel, async, cron, regex, endpoint, hook, runtime, payload, socket, process, subprocess. ' +
    'Skip the TLDR only for one-line answers, yes/no, or "done" confirmations, or short status/fix updates. ' +
    'BEFORE AN AskUserQuestion TOOL CALL: that tool pauses the turn, so an end-of-turn TLDR never renders before the user must answer. When you are about to call AskUserQuestion AND the turn already has substantive content, render the full TLDR block in your text IMMEDIATELY BEFORE the tool call. Put the choices in the AskUserQuestion tool itself — do NOT also emit a ⚑ Questions for you text block in that case. ' +
    'Add the ⚑ Questions for you block only when real blockers exist (no close-rule dashes there either). ' +
    'QUESTIONS BLOCK MUST STAND ALONE — never leave an open decision buried in the body prose. Fire the block whenever the reply leaves a real choice open, INCLUDING when you are NOT calling AskUserQuestion. Triggers: you wrote "we could" / "you may want to" / "worth deciding" / "another option"; you worked under an unconfirmed assumption; you found a second problem and did not fix it; you asked a rhetorical question. Each question carries its own context so the user can answer WITHOUT scrolling up: (1) a one-sentence plain-English statement of the problem, (2) 2-4 lettered options, each with what you get and what you give up, ~20 words max, (3) a closing "My pick: **X** — [short reason]" line. NEVER present options flat and wait to be asked which you recommend. Caps: MAX 2 questions, MAX 4 options each. Same plain-English bar as the TLDR bullets. When you DO call AskUserQuestion, the same standard applies to the tool: problem sentence before the call, a real consequence in every option description, recommended option first and marked "(Recommended)". ' +
    'Brand label outside the header is always "DS Mode".';

  let html;
  if (mode === 'full') {
    html =
      ' Visual HTML one-pager fires when reply is a decent length ' +
      '(≥~300 words, 2+ headings, multi-part concept, code+narrative, A/B decision). ' +
      'The HTML must be illustration-first: hero SVG + captioned tiles, NOT bullet lists or paragraph blocks. ' +
      `For the common 4 shapes (explainer / comparison / decision / status) use the stamper: \`node "${stamperPath}" <kind> --slots '<json>' --screenshot\`. ` +
      'For shapes outside those four — tree diagrams, timelines, full-bleed hero, unusual tile counts — either stamp + post-edit, OR hand-write the HTML using the same tokens from `templates/_shared.css`. The stamper is a starting point, not a cage. Tile captions ≤ 12 words. ELI8.' +
      ' INLINE RENDER (primary delivery): the stamper run with --screenshot prints the .png path on its own line after the .html path. ' +
      'IMMEDIATELY Read that .png path with the Read tool — Claude Code renders PNGs inline, so the one-pager appears directly in the chat (works on mobile and desktop). ' +
      'Do this every time you stamp a one-pager. The inline image IS how the user sees the visual now — it replaces tapping a link as the default.';
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
      'Use templates/build.mjs with --screenshot to stamp it, then Read the printed .png path so it renders inline in the chat.';
  }

  let mobileClause = '';
  if (mobileEnabled && mobileCfg) {
    mobileClause =
      ' Mobile mode is ON: in addition to the inline render (which is the primary delivery), the stamper ' +
      'run with --screenshot auto-publishes the PNG to https://github.com/' + mobileCfg.repo + ' (private, ' +
      'owner-only) in the background. The stamper prints the GitHub URL on the line after the PNG path — include that ' +
      'URL verbatim in your reply as a persistent/phone-fallback link, placed near the "Opened a one-page ' +
      'visual summary" mention. It is a backup share link; the inline image is still the main way the user sees it.';
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
