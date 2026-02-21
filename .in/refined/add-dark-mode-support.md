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
