#!/usr/bin/env node
// ds-mode-preview.js — subcommand runner for /ds-mode preview on|off|status.
//
// Run from the user's project directory (cwd). The tracker hook tells Claude
// to invoke this script and then call preview_start / preview_stop MCP tools.
// This script ONLY touches files. It does NOT call MCP tools itself.
//
// Usage:
//   node ds-mode-preview.js on [--port N]
//   node ds-mode-preview.js off
//   node ds-mode-preview.js status
//
// Output:
//   Prints a single JSON line to stdout. Claude reads it and:
//     on  → calls mcp__Claude_Preview__preview_start({ name: <server_name> })
//     off → calls mcp__Claude_Preview__preview_stop on the matching server
//     status → reports state to user
//
// State:
//   <cwd>/.ds-mode/preview.json — presence + enabled:true = preview ON
//   <cwd>/.claude/launch.json   — merged entry named "ds-mode-feed"
//   <cwd>/.gitignore            — appended ".ds-mode/" line if absent

const fs = require('fs');
const path = require('path');

const cwd = process.cwd();
const subcommand = process.argv[2];

const STATE_DIR = path.join(cwd, '.ds-mode');
const STATE_FILE = path.join(STATE_DIR, 'preview.json');
const LAUNCH_DIR = path.join(cwd, '.claude');
const LAUNCH_FILE = path.join(LAUNCH_DIR, 'launch.json');
const GITIGNORE = path.join(cwd, '.gitignore');
const SERVER_SCRIPT = path.resolve(__dirname, 'preview-server.mjs');
const DEFAULT_PORT = 49100;
const ENTRY_NAME = 'ds-mode-feed';

function readJsonWithComments(p) {
  try {
    const raw = fs.readFileSync(p, 'utf8');
    const stripped = raw
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    return JSON.parse(stripped);
  } catch (e) {
    return null;
  }
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function appendGitignore() {
  let gi = '';
  try { gi = fs.readFileSync(GITIGNORE, 'utf8'); } catch (e) {}
  const lines = gi.split('\n').map(l => l.trim());
  if (lines.some(l => l === '.ds-mode/' || l === '.ds-mode' || l === '/.ds-mode' || l === '/.ds-mode/')) {
    return false;
  }
  if (gi && !gi.endsWith('\n')) gi += '\n';
  gi += '.ds-mode/\n';
  fs.writeFileSync(GITIGNORE, gi);
  return true;
}

function mergeLaunchJson(port) {
  fs.mkdirSync(LAUNCH_DIR, { recursive: true });
  let launch = readJsonWithComments(LAUNCH_FILE);
  if (!launch || typeof launch !== 'object') {
    launch = { version: '0.0.1', configurations: [] };
  }
  if (!Array.isArray(launch.configurations)) {
    launch.configurations = [];
  }
  const entry = {
    name: ENTRY_NAME,
    runtimeExecutable: 'node',
    runtimeArgs: [SERVER_SCRIPT],
    port,
    autoPort: true,
  };
  const idx = launch.configurations.findIndex(c => c && c.name === ENTRY_NAME);
  if (idx >= 0) launch.configurations[idx] = entry;
  else launch.configurations.push(entry);
  fs.writeFileSync(LAUNCH_FILE, JSON.stringify(launch, null, 2) + '\n');
  return { existed: idx >= 0, total_entries: launch.configurations.length };
}

function removeLaunchEntry() {
  const launch = readJsonWithComments(LAUNCH_FILE);
  if (!launch || !Array.isArray(launch.configurations)) return { removed: false, file_deleted: false };
  const before = launch.configurations.length;
  launch.configurations = launch.configurations.filter(c => !c || c.name !== ENTRY_NAME);
  const removed = launch.configurations.length < before;
  if (!removed) return { removed: false, file_deleted: false };
  if (launch.configurations.length === 0) {
    try { fs.unlinkSync(LAUNCH_FILE); return { removed: true, file_deleted: true }; }
    catch (e) {
      fs.writeFileSync(LAUNCH_FILE, JSON.stringify(launch, null, 2) + '\n');
      return { removed: true, file_deleted: false };
    }
  }
  fs.writeFileSync(LAUNCH_FILE, JSON.stringify(launch, null, 2) + '\n');
  return { removed: true, file_deleted: false };
}

function readState() {
  return readJsonWithComments(STATE_FILE);
}

if (subcommand === 'on') {
  const portFlagIdx = process.argv.indexOf('--port');
  let port = DEFAULT_PORT;
  if (portFlagIdx > -1 && process.argv[portFlagIdx + 1]) {
    const n = parseInt(process.argv[portFlagIdx + 1], 10);
    if (Number.isFinite(n) && n > 0 && n < 65536) port = n;
  }

  fs.mkdirSync(STATE_DIR, { recursive: true });
  const giAppended = appendGitignore();
  const launchInfo = mergeLaunchJson(port);

  const readmePath = path.join(STATE_DIR, 'README.md');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath,
      '# DS Mode local feed\n\n' +
      'This directory is auto-managed by DS Mode (Research Preview).\n' +
      'Visual one-pagers DS Mode generates land here so the Preview pane in\n' +
      'Claude Desktop can render them side-by-side with the chat.\n\n' +
      'Safe to delete — DS Mode will regenerate visuals on the next reply.\n' +
      'Disable the feature with `/ds-mode preview off`.\n');
  }

  const state = {
    version: 1,
    enabled: true,
    port,
    feed_dir: '.ds-mode',
    launch_entry_name: ENTRY_NAME,
    server_script: SERVER_SCRIPT,
    enabled_at: new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');

  emit({
    ok: true,
    action: 'on',
    server_name: ENTRY_NAME,
    port,
    cwd,
    launch_file: LAUNCH_FILE,
    launch_entry_replaced: launchInfo.existed,
    launch_total_entries: launchInfo.total_entries,
    gitignore_appended: giAppended,
    next: `Call mcp__Claude_Preview__preview_start with { "name": "${ENTRY_NAME}" } to mount the Preview pane on http://127.0.0.1:${port}/.`,
  });
  process.exit(0);
}

if (subcommand === 'off') {
  const state = readState();
  const launchResult = removeLaunchEntry();
  let stateDeleted = false;
  if (state) {
    try { fs.unlinkSync(STATE_FILE); stateDeleted = true; } catch (e) {}
  }
  emit({
    ok: true,
    action: 'off',
    server_name: ENTRY_NAME,
    cwd,
    was_enabled: !!(state && state.enabled),
    launch_entry_removed: launchResult.removed,
    launch_file_deleted: launchResult.file_deleted,
    state_deleted: stateDeleted,
    next: `Call mcp__Claude_Preview__preview_list, find the server with name "${ENTRY_NAME}", then mcp__Claude_Preview__preview_stop with its serverId. .ds-mode/ directory left in place — delete manually if you also want to clear past visuals.`,
  });
  process.exit(0);
}

if (subcommand === 'status') {
  const state = readState();
  const launch = readJsonWithComments(LAUNCH_FILE);
  const entry = launch && Array.isArray(launch.configurations)
    ? launch.configurations.find(c => c && c.name === ENTRY_NAME)
    : null;
  emit({
    ok: true,
    action: 'status',
    enabled: !!(state && state.enabled === true),
    state,
    launch_entry: entry,
    cwd,
    server_name: ENTRY_NAME,
    server_script: SERVER_SCRIPT,
  });
  process.exit(0);
}

process.stderr.write('Usage: node ds-mode-preview.js on|off|status [--port N]\n');
process.exit(1);
