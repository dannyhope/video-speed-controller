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
