# Video Speed Controller

Chrome extension that lets you control HTML5 video playback speed on any website with customisable keyboard shortcuts and on-screen controls.

## Defaults

| Key | Action |
|-----|--------|
| **D** | Speed up |
| **A** | Slow down |
| **S** | Reset / toggle normal speed |

Change speeds and shortcuts from the extension popup (or **Preferences** on the video controls).

## Load unpacked (local)

Do **not** load this repo folder. Chrome rejects `_docs` (names starting with `_` are reserved).

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
