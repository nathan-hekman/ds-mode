#!/usr/bin/env node
// ds-mode-activate.js — Claude Code SessionStart hook for DS Mode
//
// On every session start:
//   1. Default to ACTIVE unless DS_MODE_DEFAULT=off or a prior session
//      explicitly disabled and the user has not re-enabled.
//   2. If active, emit the DS Mode ruleset so Claude carries it into the
//      session.

const fs = require('fs');
const path = require('path');
const {
  claudeConfigDir,
  safeWriteFlag,
  isActive,
  deleteFlag,
  defaultIsOff,
} = require('./ds-mode-config');

const claudeDir = claudeConfigDir();
const flagPath = path.join(claudeDir, '.ds-mode-active');

// Flag exists → user kept it active. Flag missing → either first run or
// user disabled. On first run we honor DS_MODE_DEFAULT=off; otherwise we
// activate by default.
const hasFlag = isActive(flagPath);
const sentinelPath = path.join(claudeDir, '.ds-mode-installed');
const firstRun = !fs.existsSync(sentinelPath);

if (firstRun) {
  try { fs.writeFileSync(sentinelPath, '1\n', { mode: 0o600 }); } catch (e) {}
  if (defaultIsOff()) {
    deleteFlag(flagPath);
    process.stdout.write('OK');
    process.exit(0);
  }
  safeWriteFlag(flagPath);
} else if (!hasFlag) {
  // User previously disabled — stay disabled.
  process.stdout.write('OK');
  process.exit(0);
}

// Active — emit the ruleset.
const rulePath = path.join(__dirname, '..', 'rules', 'ds-mode.md');
let ruleContent = '';
try {
  ruleContent = fs.readFileSync(rulePath, 'utf8');
} catch (e) {
  process.stdout.write(
    'DS MODE ACTIVE\n' +
    'TLDR block at bottom of every non-trivial response. ' +
    'Visual HTML one-pager fires when reply is a decent length. ' +
    'Brand label: "DS Mode".'
  );
  process.exit(0);
}

const body = ruleContent.replace(/^---[\s\S]*?---\s*/, '');
process.stdout.write('DS MODE ACTIVE\n\n' + body);
