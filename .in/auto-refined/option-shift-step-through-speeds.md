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
1. **What should Option do between two saved speeds?** Add regular steps such as 0.1×, or use the halfway point between them?
2. **How many extra steps should Option add?** For saved speeds of 1× and 2×, should it offer 1.5× only, or 1.25×, 1.5× and 1.75×?
3. **How far should Shift jump?** Skip every other saved speed, or skip a larger fixed number?
4. **What should happen when both keys are held?** Should Option take priority, Shift take priority, or should the combination do nothing?
5. **Should these modifiers work while holding the reset key?** Holding reset currently has a separate meaning: it reverses the speed direction.
6. **Should this work on every computer?** Should Windows and Linux use Alt in the same way that Mac uses Option?

### Dependencies
None. Independent task.
