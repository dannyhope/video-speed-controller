# Fix: Increase touch target sizes on on-screen controls

**Readiness:** refined
**Roadmap:** now
**Skipped human refinement:** 2026-02-21
**Done when:** Control buttons in `.video-speed-controls` are at least 40×40px tap targets with padding ≥ 8px and font size ≥ 14px; layout fits at 375px viewport width without overlap

## Issue
Control buttons have only 5px padding, making them ~30px—too small for accurate touch targeting on mobile (target minimum: 44×44px per WCAG).

## Acceptance Criteria
- [ ] All buttons in `.video-speed-controls` are at least 44×44px (or 40×40px minimum)
- [ ] Touch targets maintain proper spacing (no accidental overlaps)
- [ ] Layout still fits on mobile screens (test at 375px width)
- [ ] Controls remain positioned at top-left without obscuring video content
- [ ] Font sizes are legible (at least 12px)

## Implementation
- Increase padding from 5px to 8–10px
- Increase font-size to 14px
- Test on mobile viewport (375px width)
- Consider responsive sizing if controls wrap on very small screens

## Files to Update
- `styles.css` – `.video-speed-controls` and `.video-speed-controls button`
