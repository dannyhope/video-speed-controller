# Video Speed Controller

Chrome extension that lets you control HTML5 video playback speed on any website with customisable keyboard shortcuts and a Speed preferences link.

## Defaults

| Key | Action |
|-----|--------|
| **D** | Speed up |
| **A** | Slow down |
| **S** | Reset / toggle normal speed |

Change speeds and shortcuts from the extension popup (or **Speed preferences** on the video).

## Load unpacked (local)

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