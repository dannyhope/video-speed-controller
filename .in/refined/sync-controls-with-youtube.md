# Keep controls visible while pointer is over video
**Readiness:** refined
**Refined:** 2026-02-17
**Done when:** Controls remain visible for the entire duration the pointer is over the video, and only fade when the pointer leaves. Keyboard-triggered controls still auto-hide after 2s when the pointer is not over the video.

## Implementation
- In `resetControlsTimer()` (~line 821): add early return if `this.isMouseOverVideo` is true — skip setting the hide timeout
- Same logic applies to iframe mouse listeners for embedded YouTube
- No new settings, no storage changes
- Estimated complexity: **Small** (a few lines)
