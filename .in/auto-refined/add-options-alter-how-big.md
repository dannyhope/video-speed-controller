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
1. **Is this feature actually wanted?** The extension is focused on SPEED control, not seeking/scrubbing. Adding seeking would expand the scope significantly.
2. **Which keys should be used?** j/l conflict with typing in comment boxes. Arrow keys might conflict with native controls on some sites.
3. **What's the default seek interval?** YouTube uses 5s for arrows, 10s for j/l.
4. **Should this respect the site's native seeking, or override it?** (e.g., YouTube already handles arrow keys)
5. **Should the extension also handle Shift+Left/Right for frame-by-frame seeking?**

### Dependencies
None. Independent feature request.
