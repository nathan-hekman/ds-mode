// hooks/ds-mode-config.js — shared utilities for DS Mode hooks.
//
// Settings tracked via flag files in $CLAUDE_CONFIG_DIR:
//   .ds-mode-active     mode: lite | full   (absent = off)
//   .ds-mode-theme      theme: auto | light | dark  (absent = auto)
//   .ds-mode-mobile     mobile mode JSON config (opt-in private GitHub publish)
//   .ds-mode-installed  sentinel — written on first SessionStart so a
//                       user-chosen "off" mode survives subsequent sessions.

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_MODES = ['lite', 'full'];
const DEFAULT_MODE = 'full';

const VALID_THEMES = ['auto', 'light', 'dark'];
const DEFAULT_THEME = 'auto';

function claudeConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// ---- mode (lite | full | off) ----

function getDefaultMode() {
  const env = (process.env.DS_MODE_DEFAULT || '').trim().toLowerCase();
  if (env === 'off') return 'off';
  if (VALID_MODES.includes(env)) return env;
  return DEFAULT_MODE;
}

function readMode(flagPath) {
  try {
    const raw = fs.readFileSync(flagPath, 'utf8').trim().toLowerCase();
    return VALID_MODES.includes(raw) ? raw : null;
  } catch (e) { return null; }
}

function safeWriteMode(flagPath, mode) {
  if (!VALID_MODES.includes(mode)) return false;
  return safeWrite(flagPath, mode);
}

// ---- theme (auto | light | dark) ----

function getDefaultTheme() {
  const env = (process.env.DS_MODE_THEME || '').trim().toLowerCase();
  return VALID_THEMES.includes(env) ? env : DEFAULT_THEME;
}

function readTheme(flagPath) {
  try {
    const raw = fs.readFileSync(flagPath, 'utf8').trim().toLowerCase();
    return VALID_THEMES.includes(raw) ? raw : null;
  } catch (e) { return null; }
}

function safeWriteTheme(flagPath, theme) {
  if (!VALID_THEMES.includes(theme)) return false;
  return safeWrite(flagPath, theme);
}

// ---- generic safe-write + delete ----

function safeWrite(flagPath, content) {
  try {
    const stat = fs.lstatSync(flagPath);
    if (stat.isSymbolicLink()) return false;
  } catch (e) { /* fine */ }
  const tempPath = `${flagPath}.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tempPath, content + '\n', { mode: 0o600 });
  fs.renameSync(tempPath, flagPath);
  return true;
}

function deleteFlag(flagPath) {
  try { fs.unlinkSync(flagPath); } catch (e) {}
}

// ---- mobile mode (private GitHub publish) ----

// Mobile mode is opt-in. Config persists as JSON at
// $CLAUDE_CONFIG_DIR/.ds-mode-mobile so the setup wizard's choices
// (repo path, clone dir) carry across sessions.
//
//   { "enabled": true, "repo": "user/ds-mode-mobile",
//     "clone_path": "/Users/.../.claude/ds-mode-mobile",
//     "owner": "user" }
//
// `enabled: false` keeps the config (so disabling and re-enabling
// reuses the same repo).

function readMobileConfig(flagPath) {
  try {
    const raw = fs.readFileSync(flagPath, 'utf8');
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return data;
  } catch (e) {
    return null;
  }
}

function writeMobileConfig(flagPath, config) {
  try {
    const stat = fs.lstatSync(flagPath);
    if (stat.isSymbolicLink()) return false;
  } catch (e) { /* fine */ }
  const tmp = `${flagPath}.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  fs.renameSync(tmp, flagPath);
  return true;
}

function mobileIsEnabled(flagPath) {
  const cfg = readMobileConfig(flagPath);
  return !!(cfg && cfg.enabled && cfg.repo && cfg.clone_path);
}

module.exports = {
  VALID_MODES, DEFAULT_MODE,
  VALID_THEMES, DEFAULT_THEME,
  claudeConfigDir,
  getDefaultMode, readMode, safeWriteMode,
  getDefaultTheme, readTheme, safeWriteTheme,
  readMobileConfig, writeMobileConfig, mobileIsEnabled,
  deleteFlag,
};
