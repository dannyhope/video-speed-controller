/**
 * Store screenshots using the real extension CSS/UI (system Chrome).
 * Regular Chrome no longer allows --load-extension under automation.
 */
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = __dirname;

const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const popupHtml = fs.readFileSync(path.join(root, 'popup.html'), 'utf8');
const popupCss = fs.readFileSync(path.join(root, 'popup.css'), 'utf8');
const constantsJs = fs.readFileSync(path.join(root, 'constants.js'), 'utf8');
const popupJs = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');

const demoPage = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Video Speed Controller</title>
<style>
html,body{margin:0;height:100%;background:#1a1a1a;color:#eee;font-family:system-ui,sans-serif}
.wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px}
h1{font-size:18px;font-weight:600;margin:0;color:#aaa}
video{width:960px;max-width:90vw;background:#000;border-radius:8px}
${styles}
</style></head><body>
<div class="wrap">
  <h1>Video Speed Controller</h1>
  <video id="v" controls playsinline muted loop
    src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"></video>
</div>
<div class="video-speed-overlay" id="overlay">1.25×</div>
<div class="video-speed-controls" id="controls">
  <button class="speed-down"><span class="icon">-</span></button>
  <button class="speed-reset"><span class="icon">1×</span></button>
  <button class="speed-up"><span class="icon">+</span></button>
  <button class="skip-silence" title="Skip sections without captions"><span class="icon">⏭</span></button>
  <button class="settings" title="Settings"><span class="icon">⚙</span></button>
</div>
<script>
  const v = document.getElementById('v');
  const overlay = document.getElementById('overlay');
  const controls = document.getElementById('controls');
  v.play().catch(() => {});

  function positionUI() {
    const r = v.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.opacity = '1';
    overlay.style.position = 'fixed';
    overlay.style.top = (r.top + r.height / 2) + 'px';
    overlay.style.left = (r.left + r.width / 2) + 'px';
    overlay.style.transform = 'translate(-50%, -50%)';

    controls.style.display = 'flex';
    controls.style.opacity = '1';
    controls.style.position = 'fixed';
    controls.style.top = (r.top + 10) + 'px';
    controls.style.left = (r.left + 10) + 'px';
  }

  window.showOverlayOnly = () => {
    positionUI();
    controls.style.opacity = '0';
    controls.style.display = 'none';
    overlay.textContent = '1.5×';
  };
  window.showControlsAndOverlay = () => {
    positionUI();
    overlay.textContent = '1.25×';
  };

  v.addEventListener('loadeddata', positionUI);
  window.addEventListener('resize', positionUI);
  setTimeout(positionUI, 500);
</script>
</body></html>`;

const settingsPage = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><title>Settings</title>
<style>
html,body{margin:0;background:#f0f2f2}
.frame{width:380px;margin:24px auto;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.12);overflow:hidden}
${popupCss}
</style>
</head><body><div class="frame" id="host"></div>
<script>
  // Stub Chrome APIs so popup.js can render
  const store = {
    customSpeeds: [0.5, 0.75, 1, 1.25, 1.5, 2, 3],
    shortcuts: { speedUp: 'd', speedDown: 'a', reset: 's' },
    enableNumberShortcuts: true,
    showSpeedButtons: true,
    showShortcutHints: true,
    pausingResetsSpeed: false,
    skipSilenceEnabled: false,
    skipSilenceGapThreshold: 5
  };
  window.chrome = {
    storage: {
      sync: {
        get: (keys, cb) => {
          const result = typeof keys === 'object' && keys && !Array.isArray(keys)
            ? { ...keys, ...store }
            : { ...store };
          const done = (cb || (() => {}));
          if (typeof keys === 'function') keys(result);
          else Promise.resolve().then(() => done(result));
          return Promise.resolve(result);
        },
        set: (items, cb) => {
          Object.assign(store, items);
          if (cb) cb();
          return Promise.resolve();
        }
      },
      onChanged: { addListener() {} }
    }
  };
</script>
<script>${constantsJs}</script>
<div id="mount"></div>
<script>
  // Load popup markup into frame
  const host = document.getElementById('host');
  host.innerHTML = ${JSON.stringify(
    popupHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<link[^>]*>/gi, '')
      .replace(/<!DOCTYPE[\s\S]*?<body[^>]*>/i, '')
      .replace(/<\/body>[\s\S]*$/i, '')
  )};
</script>
<script>${popupJs}</script>
</body></html>`;

function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url?.startsWith('/settings')) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(settingsPage);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(demoPage);
    });
    server.listen(0, '127.0.0.1', () => {
      resolve({ server, base: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

const { server, base } = await serve();
const browser = await puppeteer.launch({
  headless: false,
  channel: 'chrome',
  defaultViewport: { width: 1280, height: 800 },
  args: ['--window-size=1280,800'],
});

try {
  const page = await browser.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('video');
  await page.evaluate(async () => {
    const v = document.querySelector('video');
    v.muted = true;
    await v.play();
  });
  await new Promise((r) => setTimeout(r, 1200));

  await page.evaluate(() => window.showOverlayOnly());
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, 'screenshot-overlay.png'), type: 'png' });
  console.log('overlay');

  await page.evaluate(() => window.showControlsAndOverlay());
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({ path: path.join(outDir, 'screenshot-controls.png'), type: 'png' });
  await page.screenshot({ path: path.join(outDir, 'screenshot.png'), type: 'png' });
  fs.copyFileSync(path.join(outDir, 'screenshot.png'), path.join(outDir, 'screenshot-store-1280x800.png'));
  console.log('controls + primary');

  const popup = await browser.newPage();
  await popup.setViewport({ width: 420, height: 700 });
  await popup.goto(base + '/settings', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 800));
  await popup.screenshot({ path: path.join(outDir, 'screenshot-settings.png'), type: 'png' });
  console.log('settings');
} finally {
  await browser.close();
  server.close();
}
