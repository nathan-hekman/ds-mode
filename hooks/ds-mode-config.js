// hooks/ds-mode-config.js — shared utilities for DS Mode hooks
//
// Owns: valid mode list, default mode resolution, symlink-safe flag I/O.

const fs = require('fs');
const path = require('path');
const os = require('os');

const VALID_MODES = ['lite', 'full', 'visual', 'off'];
const DEFAULT_MODE = 'full';

// Resolve the configured default mode. Reads $DS_MODE_DEFAULT env var first
// (so installs can opt for `lite` start), then falls back to DEFAULT_MODE.
function getDefaultMode() {
  const envMode = (process.env.DS_MODE_DEFAULT || '').trim().toLowerCase();
  if (envMode && VALID_MODES.includes(envMode)) return envMode;
  return DEFAULT_MODE;
}

// Resolve $CLAUDE_CONFIG_DIR with homedir fallback.
function claudeConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// Symlink-safe flag write: refuses to follow a pre-existing symlink at the
// target path (defense against a malicious symlink clobbering a real file).
function safeWriteFlag(flagPath, mode) {
  try {
    const stat = fs.lstatSync(flagPath);
    if (stat.isSymbolicLink()) {
      // Refuse to write through a symlink — silently no-op.
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

function readFlag(flagPath) {
  try {
    return fs.readFileSync(flagPath, 'utf8').trim();
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
  getDefaultMode,
  claudeConfigDir,
  safeWriteFlag,
  readFlag,
  deleteFlag,
};
