# Port Video Speed Controller to Safari and Firefox

**Readiness:** auto-refined
**Roadmap:** later
**Type:** technical

Investigate and implement support for distributing Video Speed Controller as Safari and Firefox browser extensions while preserving the existing Chrome experience.

## Scope

- Audit the current Manifest V3 APIs and permissions for Safari Web Extension and Firefox compatibility.
- Identify required manifest variants, build/package steps, and browser-specific fallbacks.
- Verify popup, side panel, storage, commands, background service worker, content scripts, keyboard shortcuts, and video detection in both browsers.
- Keep browser-specific files or build output isolated so the Chrome extension remains straightforward to load and publish.
- Add automated checks where practical and document manual testing for Safari and Firefox.

## Acceptance criteria

- A documented, repeatable build produces a Safari-compatible extension package/project.
- A documented, repeatable build produces a Firefox-compatible extension package.
- Core speed controls, settings persistence, shortcuts, and injected controls work in supported Safari and Firefox versions.
- Unsupported APIs or behaviour have clear fallbacks or are explicitly documented.
- Chrome packaging and behaviour remain unchanged.

## Questions to resolve

- Should Safari support target macOS only, or also iOS/iPadOS?
- Should Firefox use the same Manifest V3 package or a browser-specific manifest variant?
- What minimum Safari and Firefox versions should be supported?

## Auto-investigation
**Investigated:** 2026-09-03

### Findings
- The repository is currently Chrome-first: `manifest.json` is Manifest V3 with `sidePanel`, a background `service_worker`, an `action`, and the `_execute_action` command.
- `background.js` directly calls `chrome.sidePanel.open()`. This is the main browser-specific feature and has no fallback today; Safari and Firefox do not provide an equivalent that can be assumed to work across the same versions.
- Runtime code directly uses `chrome.storage.sync`, `chrome.storage.local`, `chrome.runtime.sendMessage`, and `chrome.storage.onChanged` in `content.js`, `popup.js`, `migration.js`, `storage.js`, and `compatibility.js`. A compatibility wrapper exists in `compatibility.js`, but much of the active code still calls `chrome.*` directly.
- The current pack script copies one Chrome manifest and runtime files into `dist/`; there are no browser-specific manifests, package targets, validation scripts, or Safari Xcode project.
- The acceptance criteria combine two separable deliverables: a cross-browser runtime compatibility layer and browser-specific packaging/distribution, with Safari potentially involving a native Safari Web Extension project and a separate iOS/iPadOS decision.
- Existing product documentation defines the purpose as a Chrome extension and says settings sync via Chrome sync storage. Porting will require updating that product/platform statement and privacy/distribution documentation once target platforms are chosen.

### Scope
- Likely files: `manifest.json`, `background.js`, `content.js`, `popup.js`, `migration.js`, `storage.js`, `compatibility.js`, `scripts/pack-unpacked.sh`, `package.json`, tests, and new browser-specific manifest/build scripts.
- Safari may additionally require a committed Xcode project or a documented conversion/export step using Safari Web Extension tooling; a Firefox package can usually be produced from a browser-specific manifest and the shared web-extension assets.
- The side-panel settings entry point is not portable as-is. The shared fallback should open `popup.html` through the extension action where supported, or expose settings through the action popup without assuming a side panel.
- Automated manifest/schema checks and browser smoke tests are practical; full Safari verification requires macOS Safari and likely Xcode, while Firefox verification requires a Firefox installation and temporary extension loading.
- Estimated complexity: large.
- This should be treated as a parent task with independent runtime, packaging, and browser verification deliverables.

### Proposed implementation
1. Decide target platforms and minimum browser versions, then record a support matrix for Chrome, Firefox, Safari macOS, and optionally Safari iOS/iPadOS.
2. Introduce one small WebExtension API adapter (`browser`/`chrome` normalisation plus promise/callback handling) and route storage, runtime messaging, change listeners, and settings-opening behaviour through it. Keep the Chrome path and manifest unchanged unless a compatibility fix is proven necessary.
3. Create isolated browser targets: a Firefox manifest/package target without Chrome-only `sidePanel`, and a Safari Web Extension target with the chosen macOS/iOS packaging approach. Keep generated output outside the Chrome `dist/` directory or use distinct target directories.
4. Add build-time manifest validation and package scripts, then extend automated tests for manifest constraints, storage/message fallbacks, and core content-script behaviour. Document manual Safari and Firefox smoke tests, including settings persistence, shortcuts, YouTube embeds, captions, and video detection.
5. Update `_docs/spec.md`, `_docs/design.md` if the supported surfaces change, and relevant README/distribution/privacy docs to describe supported browsers and known capability differences.

### Questions for refinement
1. **Safari platform scope** Should the first release support macOS Safari only, or macOS plus iOS/iPadOS Safari? iOS/iPadOS requires a Safari Web Extension app/container and changes the packaging and testing scope substantially.

   **Answer:**

2. **Browser support floor** Which minimum Safari and Firefox versions should be supported? The answer determines whether Manifest V3, service workers, promise-based APIs, and the chosen settings fallback are safe.

   **Answer:**

3. **Settings surface fallback** When a browser lacks `sidePanel`, should the action popup be the supported settings surface, or should the extension open a dedicated extension tab? This changes the user flow and manifest/runtime implementation.

   **Answer:**

### Documentation impact
- Update `_docs/spec.md` to define supported browsers, platform scope, settings-surface fallbacks, storage semantics, and explicit unsupported capabilities.
- Update `_docs/design.md` if Safari/Firefox require a different settings surface or browser-specific interaction.
- Update `README.md`, `docs/chrome-extension.md`, and manual testing documentation with target-specific build and verification commands.
- Update privacy/distribution copy if settings storage or store packaging differs by browser.

### Related items
- `ensure-settings-saved-and-respected.md` (`.in/auto-refined/ensure-settings-saved-and-respected.md`) — prerequisite/overlapping: cross-browser storage abstraction must preserve settings persistence.
- `acquire-youtube-speed-keys.md` (`.in/auto-refined/acquire-youtube-speed-keys.md`) — complementary: browser smoke tests should cover the existing YouTube shortcut behaviour.
- `add-options-alter-how-big.md` (`.in/auto-refined/add-options-alter-how-big.md`) — complementary: future shortcut settings should use the same cross-browser settings adapter.
- `option-shift-step-through-speeds.md` (`.in/auto-refined/option-shift-step-through-speeds.md`) — complementary: future keyboard behaviour should remain compatible across content-script hosts.
