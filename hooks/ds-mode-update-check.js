#!/usr/bin/env node
// ds-mode-update-check.js — standalone update probe.
//
// Hits GitHub's "latest release" API for nathan-hekman/ds-mode, parses the
// version from the tag (`ds-mode--vX.Y.Z` → `X.Y.Z`), compares to the
// installed plugin.json version, and writes:
//
//   $CLAUDE_CONFIG_DIR/.ds-mode-update-available    contains "X.Y.Z" if newer
//   $CLAUDE_CONFIG_DIR/.ds-mode-update-check        touched on every run (TTL)
//
// Designed to be fire-and-forget from the SessionStart hook so the network
// call never blocks Claude's startup. The next session reads the flag.
//
// Quiet-fails on every error: GitHub down, rate-limited, offline, malformed
// JSON, parse error. A missed check just means the flag stays as it was.

const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const HTTP_TIMEOUT_MS = 4000;
const REPO = 'nathan-hekman/ds-mode';
const TAG_PREFIX = 'ds-mode--v';

const claudeDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
const flagPath = path.join(claudeDir, '.ds-mode-update-available');
const checkPath = path.join(claudeDir, '.ds-mode-update-check');

// Skip if we checked within the TTL window.
try {
  const stat = fs.statSync(checkPath);
  if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
    process.exit(0);
  }
} catch (e) { /* no prior check — proceed */ }

// Resolve installed version from plugin.json (../.claude-plugin/plugin.json
// relative to this script).
let installed;
try {
  const plugin = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '.claude-plugin', 'plugin.json'), 'utf8')
  );
  installed = plugin.version || '0.0.0';
} catch (e) {
  process.exit(0);
}

const req = https.get(
  `https://api.github.com/repos/${REPO}/releases/latest`,
  {
    headers: {
      'User-Agent': 'ds-mode-update-check',
      'Accept': 'application/vnd.github+json',
    },
    timeout: HTTP_TIMEOUT_MS,
  },
  (res) => {
    if (res.statusCode !== 200) {
      touchCheck();
      process.exit(0);
    }
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const tag = json.tag_name || '';
        const latest = tag.startsWith(TAG_PREFIX) ? tag.slice(TAG_PREFIX.length) : null;
        if (latest && semverGt(latest, installed)) {
          safeWrite(flagPath, latest);
        } else {
          // installed is current or newer — clear stale flag.
          try { fs.unlinkSync(flagPath); } catch (e) {}
        }
      } catch (e) { /* silent */ }
      touchCheck();
    });
  }
);

req.on('error', () => { touchCheck(); });
req.on('timeout', () => { req.destroy(); touchCheck(); });

function touchCheck() {
  try {
    fs.writeFileSync(checkPath, '', { mode: 0o600 });
  } catch (e) { /* silent */ }
}

function safeWrite(p, content) {
  try {
    const stat = fs.lstatSync(p);
    if (stat.isSymbolicLink()) return false;
  } catch (e) { /* fine */ }
  try {
    const tmp = `${p}.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmp, content + '\n', { mode: 0o600 });
    fs.renameSync(tmp, p);
    return true;
  } catch (e) { return false; }
}

function semverGt(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const ai = pa[i] || 0;
    const bi = pb[i] || 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return false;
}
