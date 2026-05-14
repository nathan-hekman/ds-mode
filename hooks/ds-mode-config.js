// hooks/ds-mode-config.js — shared utilities for DS Mode hooks
//
// DS Mode supports two active modes (`lite`, `full`) plus an absent flag = off.
// The flag file at $CLAUDE_CONFIG_DIR/.ds-mode-active stores the active mode
// name as a single line (`lite\n` or `full\n`). Missing file = off.

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_MODES = ['lite', 'full'];
const DEFAULT_MODE = 'full';

// Resolve $CLAUDE_CONFIG_DIR with homedir fallback.
function claudeConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// Read configured default mode. `DS_MODE_DEFAULT=off` keeps sessions disabled
// on first run; any other valid mode name (lite|full) becomes the default;
// anything else (or unset) falls back to `full`.
function getDefaultMode() {
  const env = (process.env.DS_MODE_DEFAULT || '').trim().toLowerCase();
  if (env === 'off') return 'off';
  if (VALID_MODES.includes(env)) return env;
  return DEFAULT_MODE;
}

// Symlink-safe flag write: refuses to follow a pre-existing symlink at the
// target path (defense against a malicious symlink clobbering a real file).
function safeWriteFlag(flagPath, mode) {
  if (!VALID_MODES.includes(mode)) {
    return false;
  }
  try {
    const stat = fs.lstatSync(flagPath);
    if (stat.isSymbolicLink()) {
      return false;
    }
  } catch (e) {
    // File does not exist yet — fine.
  }
  const tempPath = `${flagPath}.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tempPath, mode + '\n', { mode: 0o600 });
  fs.renameSync(tempPath, flagPath);
  return true;
}

// Read the current mode. Returns null if flag missing or content invalid.
function readMode(flagPath) {
  try {
    const raw = fs.readFileSync(flagPath, 'utf8').trim().toLowerCase();
    return VALID_MODES.includes(raw) ? raw : null;
  } catch (e) {
    return null;
  }
}

function deleteFlag(flagPath) {
  try { fs.unlinkSync(flagPath); } catch (e) {}
}

module.exports = {
  VALID_MODES,
  DEFAULT_MODE,
  claudeConfigDir,
  getDefaultMode,
  safeWriteFlag,
  readMode,
  deleteFlag,
};
