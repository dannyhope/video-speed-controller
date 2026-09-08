# Video Speed Controller

Browser extension that lets you control HTML5 video playback speed on any website with customisable keyboard shortcuts and a Speed preferences link.

**Now built with WXT + TypeScript + browser.* API for Chrome and Firefox!** See [MIGRATION.md](MIGRATION.md) for details.

## Defaults

| Key | Action |
|-----|--------|
| **D** | Speed up |
| **A** | Slow down |
| **S** | Reset / toggle normal speed |

Change speeds and shortcuts from the extension popup (or **Speed preferences** on the video).

## Build & Development

### Production Build

```bash
npm install               # Install dependencies
npm run build:chrome      # Build for Chrome (Manifest V3)
npm run build:firefox     # Build for Firefox (Manifest V3)
npm run build             # Build for both browsers
```

Builds are created in `.output/chrome-mv3/` and `.output/firefox-mv3/`.

### Create Distribution Zips

```bash
npm run zip:chrome        # Create Chrome store zip
npm run zip:firefox       # Create Firefox AMO zip
npm run zip               # Create both zips
```

Zips are created in `.output/` directory.

### Development Mode

```bash
npm run dev               # Start dev server for Chrome
npm run dev:firefox       # Start dev server for Firefox
```

Then:
1. Open `chrome://extensions/` (or `about:debugging` in Firefox)
2. Enable **Developer mode**
3. **Load unpacked** → select `.output/chrome-mv3/` (or `.output/firefox-mv3/`)
4. Extension auto-reloads on code changes

### Legacy Build (Deprecated)

The old `npm run pack:unpacked` command still works but is deprecated. Use the WXT-based build commands above.

## Load unpacked (local - Legacy)

Do **not** load this repo folder. Chrome rejects `_docs` (names starting with `_` are reserved).

The preferred local hostname is recorded in [`.local-domain`](.local-domain) as `video-speed-controller.local`. The preferred development port is recorded in [`.dev-port`](.dev-port) as `5237`. Run `npm run dev` to serve the repository on `127.0.0.1:5237`; the command checks the hostname first and supports normal browser live reload when the page is open through Bombay’s shared port-80 proxy.

Bombay route required: `video-speed-controller.local` → `127.0.0.1:5237`.

1. `npm run pack:unpacked` — writes a Chrome-safe copy to `dist/`
2. Open `chrome://extensions/`
3. Enable **Developer mode**
4. **Load unpacked** → select the `dist` folder
5. After code changes, run `npm run pack:unpacked` again, then reload the extension
6. Open a page with a video and try **D** / **A**

## Chrome Web Store publish

Open [`publish/index.html`](publish/index.html) in a browser — checklist, copy-paste fields, images, and the upload zip.

## Docs

- [`_docs/spec.md`](_docs/spec.md) — how it should work  
- [`_docs/design.md`](_docs/design.md) — how it should look  
- [`privacy-policy.html`](privacy-policy.html) — for store hosting  

## Feedback

Send it at [dannyhope.co.uk/feedback](https://dannyhope.co.uk/feedback).