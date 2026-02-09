Video Speed Controller: YouTube assigns its own speed-up/slow down functionality to the < (⇧,) and > (⇧.) keys. We should acquire these keys for our speed-up/slow down functionality. This will mean that these two keys will now increment through the users full list of speeds

## Auto-investigation
**Investigated:** 2026-02-09

### Findings
- **Current shortcut system:** Extension uses configurable shortcuts stored in `settings.shortcuts` (speedUp, speedDown, reset)
- Default shortcuts are set in popup.js (not found in constants.js grep results, needs further investigation)
- **Shortcut matching:** Uses `matchesShortcut(key, setting)` helper function that supports comma-separated key lists
- **YouTube's < and > keys:** Shift+Comma and Shift+Period respectively
- YouTube's native speed control increments in fixed steps (0.25x intervals)
- Extension's approach is different: steps through user-configurable speed array
- **Implementation would mean:** When user presses < or >, intercept the event and prevent YouTube's handler from running

### Scope
**Files to modify:**
- `popup.html` - Shortcuts inputs already support comma-separated keys (e.g., "d, =, +" per title attribute)
- No code changes needed if user simply adds ",<" and ",>" to existing shortcut inputs
- **OR** add dedicated < and > as additional default shortcuts alongside existing ones
- `content.js` - Keyboard handler already supports multi-key shortcuts via `matchesShortcut()`
- May need `e.preventDefault()` to stop YouTube's native handler (line 974+ in keydownHandler)

**Estimated complexity:** Small (config change or minor code addition)

### Questions for refinement
1. Should < and > **replace** the current shortcuts (d/a) or be **additional** shortcuts?
2. Should this be YouTube-specific, or apply to all sites?
3. Should the extension prevent the native behaviour (`e.preventDefault()`), or let both handlers run?
4. Should this be a default setting, or something users configure themselves?
5. What about the comma and period keys WITHOUT shift - should those also be acquired?

### Dependencies
None. Independent task.