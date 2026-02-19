# Fix: Replace placeholder with visible hint text

**Readiness:** unrefined
**Roadmap:** now

## Issue
The "Add speed" input uses a placeholder instead of visible hint text. Placeholders disappear when focused, breaking accessibility.

## Acceptance Criteria
- [ ] "Add speed (0.05-16)" hint is visible as permanent text below or inside the input
- [ ] Placeholder is removed or converted to a label
- [ ] Hint text stays visible while user types

## Location
`popup.html:23` – the `newSpeedInput` element
