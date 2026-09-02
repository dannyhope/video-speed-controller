# Add options to alter how big the jumps for j, l, ◀︎ and ▶ are

**Original:** - [2026-01-21T052010] Add options to alter how big the jumps for j, l, ◀︎ and ▶ are

## A.I.'s guess at what this item is about

This assumes the extension has keyboard shortcuts for seeking backward/forward using `j`, `l`, `◀︎` (left arrow), and `▶` (right arrow) keys, similar to YouTube's native controls.

**Current state check needed:** The extension's current keyboard shortcuts are:
- `d` - speed up
- `s` - slow down
- `r` - reset to 1x
- Number keys (1-9) - jump to specific speeds (optional, controlled by `enableNumberShortcuts`)

**This task may be based on incorrect assumptions** - the extension doesn't currently implement j/l/arrow seeking controls. These are YouTube's native shortcuts, not part of this extension.

**If this is a feature request**, it would mean:
1. **Add new shortcuts:** j/l or arrow keys for seeking ±10 seconds (or configurable amount)
2. **Configurable jump size:** Setting in popup to control how many seconds to skip (e.g., 5s, 10s, 30s)
3. **UI in popup.html:** New input field for "Seek interval (seconds)"
4. **Implementation in content.js:** New keyboard event handlers that call `video.currentTime += seekInterval`

**This task needs refinement** to clarify if:
- These controls already exist somewhere and just need configuration
- This is a new feature request
- This is meant for a different extension

## Auto-investigation
**Investigated:** 2026-02-09

### Findings
- **Confirmed:** Extension does NOT currently implement j/l/arrow seeking controls
- Searched content.js for arrow key handling - NO matches found
- **Current keyboard shortcuts** (from keydownHandler in content.js, lines 964-998):
  - Speed up/down/reset based on settings.shortcuts
  - Number keys for direct speed selection (if enabled)
  - Skip silence toggle (if enabled)
  - Long press detection for continuous speed changes
- **No seeking/scrubbing functionality** exists in the extension at all
- This appears to be a **feature request for NEW functionality** (video seeking), not a configuration task

### Scope
**If implemented, would require:**
- `manifest.json` - No changes needed
- `popup.html` - Add new "Seek Controls" section with:
  - Checkbox to enable/disable seeking shortcuts
  - Input field for seek interval (seconds)
  - Shortcut inputs for seek forward/backward keys
- `popup.js` - Handle new settings fields
- `content.js` - Add new keyboard handlers for seeking:
  - `video.currentTime += seekInterval` (forward)
  - `video.currentTime -= seekInterval` (backward)
- `constants.js` - Add new default settings for seeking

**Estimated complexity:** Medium (new feature category, not just config change)

### Questions for refinement
1. **Do we want this feature at all?** This extension currently changes playback speed, not the video’s position. Adding seeking would make it a broader video-control tool.
2. **Which keys should move through the video?** `J` and `L`, the arrow keys, or user-chosen keys? `J` and `L` may type into comment boxes, while arrow keys may already control the player.
3. **How many seconds should each press move?** YouTube uses 5 seconds for arrow keys and 10 seconds for `J`/`L`. Should we use one default, or let people choose?
4. **Should the extension replace the website’s own seeking?** For example, on YouTube, should the extension change the existing arrow-key behaviour or leave it alone?
5. **Do we also need frame-by-frame movement?** For example, should Shift + Left/Right move one video frame at a time?

### Dependencies
None. Independent feature request.
