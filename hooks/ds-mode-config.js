// hooks/ds-mode-config.js — shared utilities for DS Mode hooks
//
// DS Mode is on/off only. Flag presence = active. Flag missing = off.

const fs = require('fs');
const path = require('path');
const os = require('os');

// Resolve $CLAUDE_CONFIG_DIR with homedir fallback.
function claudeConfigDir() {
  return process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
}

// Symlink-safe flag write: refuses to follow a pre-existing symlink at the
// target path (defense against a malicious symlink clobbering a real file).
function safeWriteFlag(flagPath) {
  try {
    const stat = fs.lstatSync(flagPath);
    if (stat.isSymbolicLink()) {
      return false;
    }
  } catch (e) {
    // File does not exist yet — fine.
  }
  const tempPath = `${flagPath}.${process.pid}.${Date.now()}`;
  fs.writeFileSync(tempPath, 'on\n', { mode: 0o600 });
  fs.renameSync(tempPath, flagPath);
  return true;
}

function isActive(flagPath) {
  try {
    fs.accessSync(flagPath, fs.constants.R_OK);
    return true;
  } catch (e) {
    return false;
  }
}

function deleteFlag(flagPath) {
  try { fs.unlinkSync(flagPath); } catch (e) {}
}

// Default is on. To start a session disabled, set DS_MODE_DEFAULT=off.
function defaultIsOff() {
  return (process.env.DS_MODE_DEFAULT || '').trim().toLowerCase() === 'off';
}

module.exports = {
  claudeConfigDir,
  safeWriteFlag,
  isActive,
  deleteFlag,
  defaultIsOff,
};
