# Fix: Make shortcut input format clearly visible

**Readiness:** refined
**Roadmap:** now
**Skipped human refinement:** 2026-02-21
**Done when:** Each shortcut input in popup.html has a visible hint paragraph (e.g., "e.g., d, =, + (separate with commas)") styled with the existing `.hint` class; tooltip is also retained

## Issue
The shortcut input fields have `title="Enter keys separated by commas"` but this instruction is only visible on hover. Users won't discover they can enter multiple keys without finding the tooltip.

## Acceptance Criteria
- [ ] Hint text "Separate multiple keys with commas" is visible below or next to each shortcut input
- [ ] Example shown (e.g., "e.g., d, =, +")
- [ ] Hint text is styled consistently with other hints in the form
- [ ] Title attribute is retained as redundant help text for hover

## Implementation
Add a small hint paragraph after each shortcut input:
```html
<p class="hint">e.g., d, =, + (separate with commas)</p>
```

## Files to Update
- `popup.html` – Add hint text after shortcutSpeedUp, shortcutSpeedDown, shortcutReset, shortcutSkipSilence inputs
- `popup.css` – Ensure `.hint` styling applies (already defined at line 59–63)
