#!/usr/bin/env node
// templates/build.mjs — DS Mode one-pager stamper.
//
// Reads a template, fills slots, writes the HTML, optionally takes a PNG
// screenshot via headless Chrome so Claude can embed it inline in chat.
//
// USAGE
//   node templates/build.mjs <kind> --slots <json> [--out <path>] [--theme auto|light|dark] [--screenshot]
//
//   kind        one of: explainer | comparison | decision | status
//   --slots     a JSON object with the placeholder values to fill in
//   --out       output HTML path (defaults to $TMPDIR/dsmode-summary-<ts>.html)
//   --theme     auto (default) keeps the @media query; light/dark hardcodes that palette
//   --screenshot  if set, also writes a sibling .png via headless Chrome
//
// SLOTS by template kind
//   explainer:   eyebrow, title, deck, hero_svg, hero_caption, tiles[], footer
//                tiles[]: array of {svg, label, caption}
//   comparison:  eyebrow, title, deck, left_svg, left_label, left_caption,
//                right_svg, right_label, right_caption, footer
//   decision:    eyebrow, title, deck, rec_label, rec_answer, options[], footer
//                options[]: array of {svg, label, note, shipped?:bool}
//   status:      eyebrow, title, deck, hero_svg, hero_caption, body, footer
//
// EXAMPLES
//   node templates/build.mjs explainer --slots '{...}' --screenshot
//   node templates/build.mjs --help

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename, resolve as pathResolve } from 'node:path';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const HELP = `\
DS Mode stamper — usage:
  node templates/build.mjs <kind> --slots <json> [--out <path>] [--theme auto|light|dark] [--screenshot]

kinds: explainer | comparison | decision | status
slots: a JSON object of placeholder values; see file header for the slot
       names each template expects.
theme: auto (default) | light | dark
       Forces a fixed palette when set to light or dark.
screenshot: also write a sibling .png via headless Chrome (1024x820).

The output path defaults to $TMPDIR/dsmode-summary-YYYYMMDD-HHMMSS.html.
`;

// -------- args --------
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  process.stdout.write(HELP);
  process.exit(args.length === 0 ? 1 : 0);
}
const kind = args[0];
const flags = {};
for (let i = 1; i < args.length; i++) {
  const a = args[i];
  if (a === '--slots') flags.slots = args[++i];
  else if (a === '--out') flags.out = args[++i];
  else if (a === '--theme') flags.theme = args[++i];
  else if (a === '--screenshot') flags.screenshot = true;
}
const validKinds = ['explainer', 'comparison', 'decision', 'status'];
if (!validKinds.includes(kind)) {
  console.error(`Error: kind must be one of: ${validKinds.join(' | ')}`);
  process.exit(1);
}
if (!flags.slots) {
  console.error('Error: --slots <json> is required');
  process.exit(1);
}
const theme = (flags.theme || resolveActiveTheme() || 'auto').toLowerCase();
if (!['auto', 'light', 'dark'].includes(theme)) {
  console.error(`Error: --theme must be auto | light | dark`);
  process.exit(1);
}

let slots;
try {
  slots = JSON.parse(flags.slots);
} catch (e) {
  console.error('Error: --slots must be valid JSON. ' + e.message);
  process.exit(1);
}

// -------- paths --------
const timestamp = new Date()
  .toISOString().replace(/[-:T]/g, '').slice(0, 14)
  .replace(/(\d{8})(\d{6})/, '$1-$2');
const tmp = process.env.TMPDIR || tmpdir();
const outHtml = flags.out
  ? pathResolve(flags.out)
  : join(tmp, `dsmode-summary-${timestamp}.html`);
const outPng = outHtml.replace(/\.html$/, '.png');

// -------- shared CSS with theme override --------
const sharedCss = readFileSync(join(__dirname, '_shared.css'), 'utf8');
const themeBlock = renderThemeBlock(theme);
const css = sharedCss.replace('/* {{THEME_BLOCK}}', themeBlock + ' /* {{THEME_BLOCK}}');

// -------- template fill --------
const tmplPath = join(__dirname, `${kind}.html`);
let html = readFileSync(tmplPath, 'utf8');
html = html.replace('{{SHARED_CSS}}', css);

const filled = fillTemplate(kind, slots);
for (const [key, val] of Object.entries(filled)) {
  html = html.replaceAll(`{{${key}}}`, val);
}

// Strip any leftover {{SLOT}} placeholders to avoid leaking braces in output.
html = html.replace(/\{\{[A-Z_]+\}\}/g, '');

writeFileSync(outHtml, html, { mode: 0o600 });
console.log(outHtml);

if (flags.screenshot) {
  const ok = takeScreenshot(outHtml, outPng);
  if (ok) {
    console.log(outPng);
    // If mobile mode is enabled, fire the publish script in the background.
    // The stamper exits immediately; the child takes ~1-3s to git push.
    // The future URL is deterministic (based on the PNG filename), so we
    // emit it now even before the push completes.
    const mobileUrl = mobilePublishIfEnabled(outPng);
    if (mobileUrl) console.log(mobileUrl);
  } else {
    console.error('warn: screenshot failed; HTML written but no PNG.');
  }
}

// ------------------------------------------------------------------

function fillTemplate(kind, s) {
  const footer = s.footer || `<em>DS Mode</em> — read in one look.`;
  const eyebrow = s.eyebrow || 'DS Mode · brief';
  const out = {
    TITLE: s.title || '',
    DECK: s.deck || '',
    EYEBROW: eyebrow,
    FOOTER: footer,
  };
  if (kind === 'explainer') {
    out.HERO_SVG = wrapHero(s.hero_svg);
    out.HERO_CAPTION = s.hero_caption || '';
    const tiles = (s.tiles || []).slice(0, 3);
    out.TILE_COUNT = String(Math.max(1, tiles.length));
    out.TILES = tiles.map(t => `
      <div style="text-align:center">
        ${wrapTileSvg(t.svg)}
        <div class="tile-label">${t.label || ''}</div>
        <p class="tile-caption">${t.caption || ''}</p>
      </div>`).join('');
  } else if (kind === 'comparison') {
    out.LEFT_SVG = wrapTileSvg(s.left_svg);
    out.LEFT_LABEL = s.left_label || '';
    out.LEFT_CAPTION = s.left_caption || '';
    out.RIGHT_SVG = wrapTileSvg(s.right_svg);
    out.RIGHT_LABEL = s.right_label || '';
    out.RIGHT_CAPTION = s.right_caption || '';
  } else if (kind === 'decision') {
    out.REC_LABEL = s.rec_label || 'recommendation';
    out.REC_ANSWER = s.rec_answer || '';
    const opts = (s.options || []).slice(0, 3);
    out.OPTION_COUNT = String(Math.max(1, opts.length));
    out.OPTIONS = opts.map(o => `
      <div class="option${o.shipped ? ' shipped' : ''}">
        ${o.shipped ? '<span class="chip">✓ shipped</span>' : ''}
        ${wrapTileSvg(o.svg)}
        <div class="opt-label">${o.label || ''}</div>
        <p class="opt-note">${o.note || ''}</p>
      </div>`).join('');
  } else if (kind === 'status') {
    out.HERO_SVG = wrapHero(s.hero_svg);
    out.HERO_CAPTION = s.hero_caption || '';
    out.BODY = s.body || '';
  }
  return out;
}

function wrapHero(svg) {
  if (!svg) return '';
  return svg.includes('class="hero"') ? svg : svg.replace('<svg', '<svg class="hero"');
}
function wrapTileSvg(svg) {
  if (!svg) return '';
  return svg.includes('class="tile-svg"') ? svg : svg.replace('<svg', '<svg class="tile-svg"');
}

function renderThemeBlock(theme) {
  if (theme === 'dark') {
    return `
:root {
  --ink: #ece8e0;
  --ink-soft: #8a8580;
  --ink-faint: #57534c;
  --bg: #181614;
  --bg-elevated: #221f1b;
  --rule: rgba(236, 232, 224, 0.14);
  --accent: #d4844f;
}`;
  }
  if (theme === 'light') {
    return ``;
  }
  // auto: keep media query so OS preference wins
  return `
@media (prefers-color-scheme: dark) {
  :root {
    --ink: #ece8e0;
    --ink-soft: #8a8580;
    --ink-faint: #57534c;
    --bg: #181614;
    --bg-elevated: #221f1b;
    --rule: rgba(236, 232, 224, 0.14);
    --accent: #d4844f;
  }
}`;
}

// Resolve theme from $CLAUDE_CONFIG_DIR/.ds-mode-theme if --theme not passed.
function resolveActiveTheme() {
  try {
    const claudeDir = process.env.CLAUDE_CONFIG_DIR || join(process.env.HOME || '', '.claude');
    const flag = readFileSync(join(claudeDir, '.ds-mode-theme'), 'utf8').trim().toLowerCase();
    if (['auto', 'light', 'dark'].includes(flag)) return flag;
  } catch (e) {}
  return null;
}

// If mobile mode is enabled in $CLAUDE_CONFIG_DIR/.ds-mode-mobile, spawn the
// publish helper as a detached child so the git push happens in the background
// (~1–3s). The future URL is deterministic from the PNG filename, so we return
// it immediately. Returns null when mobile mode is off or misconfigured.
function mobilePublishIfEnabled(pngPath) {
  let cfg;
  try {
    const claudeDir = process.env.CLAUDE_CONFIG_DIR || join(process.env.HOME || '', '.claude');
    const cfgPath = join(claudeDir, '.ds-mode-mobile');
    cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  } catch (e) { return null; }
  if (!cfg || !cfg.enabled || !cfg.repo) return null;
  const file = basename(pngPath);
  const url = `https://github.com/${cfg.repo}/blob/main/${file}`;
  // Fire-and-forget the publish.
  try {
    const child = spawn(
      join(__dirname, '..', 'hooks', 'ds-mode-mobile-publish.sh'),
      [pngPath],
      { detached: true, stdio: 'ignore', env: process.env }
    );
    child.unref();
  } catch (e) { /* silent — URL will 404 until next attempt */ }
  return url;
}

function takeScreenshot(htmlPath, pngPath) {
  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ];
  const chrome = candidates.find(c => {
    try { readFileSync(c); return true; } catch { return false; }
  });
  if (!chrome) return false;
  const r = spawnSync(chrome, [
    '--headless=new',
    '--disable-gpu',
    `--screenshot=${pngPath}`,
    '--window-size=1024,820',
    // Render at 2× device pixel ratio so the PNG is sharp on Retina
    // displays and phone screens. Adds <50ms to render time on modern
    // hardware (compositor handles DPR cheaply); output file grows ~4×
    // in bytes but still <200KB for a typical one-pager.
    '--force-device-scale-factor=2',
    '--hide-scrollbars',
    '--virtual-time-budget=1500',
    `file://${htmlPath}`,
  ], { stdio: 'pipe', timeout: 8000 });
  return r.status === 0;
}
