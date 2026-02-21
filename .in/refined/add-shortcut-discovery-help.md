# Feature: Add keyboard shortcut discovery (help overlay)

**Readiness:** refined
**Roadmap:** next
**Skipped human refinement:** 2026-02-21
**Done when:** Pressing `?` (or clicking a help button in the on-screen controls) shows an overlay listing all current keyboard shortcuts; overlay dismisses on Escape or outside click; works in iframes

## Issue
Users can configure shortcuts but can't discover what the current shortcuts are while using the extension. They must return to settings to check.

## Acceptance Criteria
- [ ] `?` key triggers a help overlay showing current assigned shortcuts
- [ ] Help overlay displays all shortcuts clearly (speed up, speed down, reset, skip silence toggle)
- [ ] Overlay updates dynamically if shortcuts change in settings
- [ ] Help button on on-screen controls also triggers the overlay
- [ ] Overlay is dismissible via Escape key or clicking outside
- [ ] Works in all video contexts (regular videos, iframes, etc.)

## Implementation Notes
- Add keydown listener for `?` key in content.js
- Create a simple overlay div with current shortcut values
- Store shortcut values from settings in the controller instance
