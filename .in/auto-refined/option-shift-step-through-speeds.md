Holding down option should step through speeds in-between those defined in settings. Likewise holding down shift should skip speeds.

## Auto-investigation
**Investigated:** 2026-02-09

### Findings
- **Current modifier key behaviour:** Extension has NO modifier key logic for speed changes
- Searched content.js for existing modifier handling - none found for speed control
- **Long press detection EXISTS:** Extension already has long press functionality (lines 246-256, 1001-1013 in content.js)
  - Detects when reset key is held down (inverts speed: >1x becomes <1x and vice versa)
  - Uses `isLongPressing`, `longPressTimer`, `speedBeforeLongPress` state
- **Speed array:** Users define custom speeds in settings (line 242: `this.speeds = [...this.defaultSpeeds]`)
- Default speeds: 0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10, 16 (from CLAUDE.md)

### Scope
**Files to modify:**
- `content.js` - Keyboard handler (keydownHandler, line 964+)
  - Check for `e.altKey` (Option on Mac) or `e.shiftKey`
  - **Option behaviour:** Generate intermediate speeds between array values on the fly
  - **Shift behaviour:** Skip speeds (e.g., step by 2 instead of 1 in the array)
- `popup.html` - Potentially add explanation of modifier behaviour in UI
- No manifest.json or storage changes needed (modifier behaviour can be hardcoded)

**Estimated complexity:** Medium (requires new speed interpolation logic for Option key)

### Questions for refinement
1. **Option key - intermediate speeds:** Should intermediate speeds be generated at fixed intervals (e.g., 0.1x steps), or calculated as midpoints between array values?
2. **Option key - how many steps?** If user has speeds [1, 2], should Option create [1, 1.25, 1.5, 1.75, 2] (4 intermediates) or [1, 1.5, 2] (1 intermediate)?
3. **Shift key - skip pattern:** Skip every other speed (step by 2), or skip a fixed number (e.g., skip 3 speeds per press)?
4. **Combined modifiers:** What happens if user holds BOTH Option and Shift?
5. **Long press conflict:** Reset key already uses long press for speed inversion. Should Option/Shift work during long press?
6. **Platform differences:** Option key (Mac) vs Alt key (Windows/Linux) - are these equivalent for this feature?

### Dependencies
None. Independent task.
