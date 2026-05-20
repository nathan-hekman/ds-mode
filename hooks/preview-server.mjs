#!/usr/bin/env node
// preview-server.mjs — tiny localhost feed server for DS Mode Preview pane.
//
// Started by Claude Desktop via .claude/launch.json + preview_start MCP tool.
// Reads PORT env var so Claude Desktop's port-collision handling works.
// Binds 127.0.0.1 only. Origin check rejects non-localhost Host headers.
//
// Serves <cwd>/.ds-mode/ as a newest-first feed:
//   "/"      — index page with newest one-pager inlined + chronological list
//   "/<file>" — raw file (any HTML/PNG/SVG/CSS the stamper wrote)
//
// Auto-refreshes every 3s via <meta http-equiv="refresh">. Crude but fine
// for Research Preview — upgrade to SSE later if it sticks.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = parseInt(process.env.PORT || '49100', 10);
const ROOT = path.resolve(process.cwd(), '.ds-mode');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.htm':  'text/html; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const host = (req.headers.host || '').split(':')[0];
  if (host && host !== 'localhost' && host !== '127.0.0.1') {
    res.writeHead(403); res.end('forbidden'); return;
  }

  let urlPath;
  try { urlPath = decodeURIComponent((req.url || '/').split('?')[0]); }
  catch (e) { res.writeHead(400); res.end('bad request'); return; }

  const candidate = path.normalize(path.join(ROOT, urlPath));
  if (!candidate.startsWith(ROOT)) { res.writeHead(403); res.end('forbidden'); return; }

  fs.stat(candidate, (err, stat) => {
    if (err) {
      if (urlPath === '/' || urlPath === '') {
        sendIndex(res, []);
        return;
      }
      res.writeHead(404); res.end('not found'); return;
    }
    if (stat.isDirectory()) {
      sendDirectoryIndex(candidate, res);
      return;
    }
    const ext = path.extname(candidate).toLowerCase();
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
    fs.createReadStream(candidate).pipe(res);
  });
});

function sendDirectoryIndex(dir, res) {
  fs.readdir(dir, { withFileTypes: true }, (err, entries) => {
    if (err) { res.writeHead(500); res.end('error'); return; }
    const items = entries
      .filter(e => e.isFile() && /\.html$/i.test(e.name) && !e.name.startsWith('.'))
      .map(e => {
        const full = path.join(dir, e.name);
        let mtime = 0;
        try { mtime = fs.statSync(full).mtimeMs; } catch (_) {}
        return { name: e.name, mtime };
      })
      .sort((a, b) => b.mtime - a.mtime);
    sendIndex(res, items);
  });
}

function sendIndex(res, items) {
  const latest = items[0];
  const list = items.map(i =>
    `<li><a href="${escapeAttr(i.name)}">${escapeHtml(i.name)}</a>` +
    `<span class="t">${new Date(i.mtime).toLocaleString()}</span></li>`
  ).join('');

  const body = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>DS Mode feed</title>
<meta http-equiv="refresh" content="3">
<style>
  :root { color-scheme: light dark; }
  html, body { margin: 0; padding: 0; height: 100%; }
  body {
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    color: #1f1d1a; background: #fafaf7;
    padding: 16px 20px 32px;
    box-sizing: border-box;
  }
  @media (prefers-color-scheme: dark) {
    body { color: #ece8e0; background: #0f0e0c; }
    .latest { background: #1a1815; border-color: #2a2620; }
    li { border-color: #2a2620; }
    a { color: #c9a96e; }
    .t { color: #8a8580; }
    .empty, h1 { color: #8a8580; }
  }
  h1 {
    font-size: 11px; letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8a8580; margin: 0 0 14px;
    font-weight: 600;
  }
  h1 .count { color: #c9a96e; font-weight: 700; }
  .latest {
    border: 1px solid #e3ddd0; border-radius: 8px;
    overflow: hidden; margin-bottom: 20px;
    background: #fff;
  }
  iframe { width: 100%; height: 540px; border: 0; display: block; }
  ul { list-style: none; padding: 0; margin: 0; }
  li {
    padding: 8px 4px; border-bottom: 1px solid #e3ddd0;
    display: flex; justify-content: space-between; align-items: center;
  }
  li:last-child { border-bottom: 0; }
  a { color: #8a6614; text-decoration: none; }
  a:hover { text-decoration: underline; }
  .t { color: #8a8580; font-size: 11px; font-variant-numeric: tabular-nums; }
  .empty {
    text-align: center; padding: 60px 20px; color: #8a8580;
    font-size: 13px;
  }
  .badge {
    display: inline-block; margin-left: 8px;
    padding: 1px 6px; font-size: 9px; letter-spacing: 0.1em;
    text-transform: uppercase; border-radius: 3px;
    background: #c9a96e; color: #1f1d1a; font-weight: 600;
  }
</style>
</head><body>
<h1>DS Mode feed <span class="count">· ${items.length} visual${items.length === 1 ? '' : 's'}</span><span class="badge">research preview</span></h1>
${latest
  ? `<div class="latest"><iframe src="${escapeAttr(latest.name)}" title="latest visual"></iframe></div>`
  : '<div class="empty">No visuals yet. Send a prompt that triggers a DS Mode visual and this pane will refresh in a few seconds.</div>'}
<ul>${list}</ul>
</body></html>`;

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(body);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[ds-mode preview] serving ${ROOT} at http://127.0.0.1:${PORT}/`);
});

const shutdown = () => { try { server.close(); } catch (e) {} process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
