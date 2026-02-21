# Fix: Replace placeholder with visible hint text

**Readiness:** refined
**Roadmap:** now
**Skipped human refinement:** 2026-02-21
**Done when:** The "Add speed" input in popup.html shows a permanent visible hint ("Add speed (0.05–16)") below or beside the input field; the placeholder attribute is removed; the hint remains visible while the user types

## Issue
The "Add speed" input uses a placeholder instead of visible hint text. Placeholders disappear when focused, breaking accessibility.

## Acceptance Criteria
- [ ] "Add speed (0.05-16)" hint is visible as permanent text below or inside the input
- [ ] Placeholder is removed or converted to a label
- [ ] Hint text stays visible while user types

## Location
`popup.html:23` – the `newSpeedInput` element
