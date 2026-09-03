# Video Speed Controller: YouTube assigns its own speed-up/slow down functionality to the < (⇧,) and > (⇧.) keys. We should acquire these keys for our speed-up/slow down functionality. This will mean that these two keys will now increment through the users full list of speeds

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
1. Should `<` and `>` replace the current `a` and `d` shortcuts, or work in addition to them?
2. Should these keys work only on YouTube, or on every website with a video?
3. When someone presses one of these keys on YouTube, should the extension take over completely, or should YouTube also respond?
4. Should these keys be enabled for everyone by default, or should each person turn them on in settings?
5. Should the unshifted comma and full-stop keys also control speed, or only `<` and `>`?

### Dependencies
None. Independent task.