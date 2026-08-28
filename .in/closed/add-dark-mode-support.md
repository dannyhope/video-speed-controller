# Feature: Add dark mode / system theme support

**Readiness:** refined
**Roadmap:** next
**Skipped human refinement:** 2026-02-21
**Done when:** Extension renders correctly in system dark mode; popup has a System/Light/Dark theme selector; preference persists via chrome.storage.sync; all hardcoded colours replaced with CSS variables responding to `prefers-color-scheme`

## Issue
The extension uses hardcoded colours that don't adapt to system dark mode. On macOS/Windows in dark mode, white text on light backgrounds is unreadable.

## Acceptance Criteria
- [ ] CSS variables for all colours (background, text, borders, accents)
- [ ] System/Light/Dark theme selector in popup settings
- [ ] Default to "System" to respect OS preference
- [ ] `prefers-color-scheme` media query in popup.css and styles.css
- [ ] Theme preference persists across sessions
- [ ] All UI elements properly styled in both light and dark modes

## Files to Update
- `popup.css` – convert hardcoded colours to CSS variables
- `styles.css` – apply same theming to on-screen controls overlay
- `popup.html` – add theme selector control
- `popup.js` – handle theme selection and persistence

## Auto-investigation
**Investigated:** 2026-02-21

### Findings
- **popup.css** has 19 unique colour values across ~30 selectors: 8 semantic colour roles (text-primary, text-secondary, bg-page, bg-card, border, accent-blue, error-red, success-green)
- **styles.css** has 7 colour values across ~15 selectors; overlay is intentionally dark (rgba black backgrounds), minimal theming needed
- **Settings schema** is V2; adding `theme` field requires a V3 migration in migration.js
- **Storage pattern** uses inline `safeStorageGet`/`safeStorageSet` in popup.js (3 retries, exponential backoff)
- **popup.html** has a natural "Appearance" section slot after "Playback Options", before "Skip Silence"
- **UX lint report** (`.in/auto-refined/ux-lint-report.md`) also flags dark mode as issue #2 (🟠 Medium), confirming documented UX debt

### Scope
- **popup.css**: Medium — 19 unique values → ~25 CSS variables (light + dark variants per semantic token)
- **styles.css**: Low — 7 values; overlay stays dark-only, variables for consistency
- **popup.js**: Small — add `theme` to defaultSettings, load/apply on init, listen for changes
- **migration.js**: Small — V2→V3 migration adds `theme: 'system'` default
- **popup.html**: Small — one `<select>` or radio group for System/Light/Dark
- **Estimated complexity: Medium** (CSS refactoring is the bulk of work; ~2–3 sessions)
- **Docs impact**: Create `_docs/help/modes.md` documenting theme persistence behaviour (per CLAUDE.md standards)

### Questions for refinement
1. **Theme selector UX**: `<select>` dropdown, radio buttons, or 3-way toggle? (Dropdown is simplest; radio clearer; toggle most modern)
2. **Overlay in light mode**: Keep overlay dark-only (intentional high-contrast on video), or apply light mode to overlay too?
3. **Sequencing**: Should this be done before or alongside the broader appearance refinement task (`.in/auto-refined/improve appearance...md`)?
4. **Colour palette approach**: Existing palette is cool/grey-blue — dark mode needs validated contrast ratios (WCAG AA minimum)

### Documentation impact
- Create `_docs/help/modes.md` — document System/Light/Dark themes, persistence, keyboard shortcut (Ctrl+Shift+D per CLAUDE.md), localStorage/chrome.storage key

### Related items
- `.in/auto-refined/ux-lint-report.md` — overlapping (dark mode listed as UX issue #2)
- `.in/auto-refined/improve appearance of video speed controller settings and all browser extensions.md` — complementary (broader appearance work; consider sequencing together)

### Suggested CSS variable structure
```css
:root {
  --color-text-primary: #343F44;
  --color-text-secondary: #7B858A;
  --color-bg-page: #F8F9FA;
  --color-bg-card: white;
  --color-border: #E1E4E6;
  --color-accent: #0066cc;
  --color-error: #D32F2F;
  --color-success: #00B400;
}
html[data-theme="dark"], @media (prefers-color-scheme: dark) when system {
  --color-text-primary: #E8ECEF;
  --color-bg-page: #1A1D20;
  --color-bg-card: #2A2E33;
  --color-border: #3A3F44;
  --color-accent: #0080FF;
  /* etc */
}
```
