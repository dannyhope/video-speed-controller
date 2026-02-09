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
