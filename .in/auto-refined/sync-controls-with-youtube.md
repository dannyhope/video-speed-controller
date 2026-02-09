# Use YouTube-style control visibility on all sites

## Summary
Replace current mouse-hover detection with YouTube-style control visibility behaviour across all video sites.

## Current behaviour
- Controls appear on mouse enter
- Controls fade after 2 seconds

## Desired behaviour (YouTube-style)
- Controls appear on any mouse movement over video
- Controls stay visible while mouse is moving
- Controls fade after ~3 seconds of no mouse movement
- Controls hide immediately when mouse leaves video area
- Controls reappear on any user interaction (keyboard shortcuts, clicks)

## Implementation
1. Update `setupVideoMouseListeners()` in content.js
2. Change timeout from 2s to 3s
3. Add mousemove debouncing to reset the hide timer on movement
4. Show controls when keyboard shortcuts are used (already partially done)

## Auto-investigation
**Investigated:** 2026-02-09

### Findings
Current implementation in `content.js` already includes **most** YouTube-style behaviour:

**Already implemented:**
- **content.js:688-691** — `mouseenter` shows controls on hover
- **content.js:693-696** — `mouseleave` hides controls when mouse exits video
- **content.js:698-712** — `mousemove` handler with 100ms debounce, resets hide timer
- **content.js:731-747** — `showControls()` makes controls visible and resets timer
- **content.js:769-797** — `hideControls()` fades controls with 300ms animation
- **content.js:992-993** — Controls shown when keyboard shortcuts are used
- **content.js:774-777** — Controls stay visible when hovering over controls themselves

**Differences from YouTube:**
1. **Timeout:** Currently 2000ms (2s) at line 760, task requests 3000ms (3s)
2. **Show on movement:** Controls already show on `mouseenter` (line 690) and reset timer on `mousemove` (line 711), which is essentially YouTube-style
3. **Keyboard shortcuts:** Already implemented (line 992-993)

**Current behaviour analysis:**
- Controls appear when mouse enters video area ✓
- Controls stay visible while mouse moves (via `resetControlsTimer()` on mousemove) ✓
- Controls fade after 2s of no movement (task wants 3s) ⚠️
- Controls hide when mouse leaves (line 695) ✓
- Controls reappear on keyboard shortcuts (line 992-993) ✓

### Scope
**Minimal change needed:** Only needs to update the timeout value.

Files to modify:
- **content.js:760** — Change `2000` to `3000` in `resetControlsTimer()`

Estimated complexity: **Small** (one-line change)

### Questions for refinement
1. Is the 2s → 3s timeout change the only desired modification?
2. Does the current debounce rate (100ms) feel responsive enough, or should it be adjusted?
3. Should there be a user setting to customize the hide delay (like YouTube's settings)?
4. Are there any specific edge cases or sites where the current behaviour feels wrong?

### Dependencies
None. Independent change, no conflicts with other tasks.
