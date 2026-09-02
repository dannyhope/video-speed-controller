Make sure video speed controller settings get saved and are respected when changing speeds.

## Auto-investigation
**Investigated:** 2026-02-09

### Findings
- **Settings storage:** Extension uses `chrome.storage.sync` with localStorage fallback (content.js line 331+)
- **Settings loaded:** `loadSettings()` called in constructor (line 267) before any speed changes happen
- **Settings structure** (from CLAUDE.md):
  - `customSpeeds`: number[]
  - `shortcuts`: {speedUp, speedDown, reset}
  - `enableNumberShortcuts`: boolean
  - `showSpeedButtons`: boolean
  - `showShortcutHints`: boolean
  - `pausingResetsSpeed`: boolean
  - `skipSilenceEnabled`: boolean
- **Storage listeners:** Extension listens for chrome.storage.onChanged to update when settings change (setup in setupEventListeners)
- **Speed application:** When `changeSpeed()` is called, it uses `this.speeds` array (merged from defaults + custom speeds)

**Potential issue:** Need to verify if settings are properly awaited/loaded before first speed change, and if speed array is rebuilt when settings change.

### Scope
**Files to check:**
- `content.js` - Verify async loading in `loadSettings()` completes before speeds can be changed
- `content.js` - Check if chrome.storage.onChanged handler rebuilds `this.speeds` array
- `popup.js` - Verify saves actually write to chrome.storage.sync

**Estimated complexity:** Small (likely a bug fix or verification task)

### Questions for refinement
1. **What goes wrong?** Are changes not saved, or are they saved but not used on the page that is already open?
2. **Which settings are affected?** The speed list, keyboard shortcuts, or on/off options?
3. **When does it fail?** Does the change work after reloading the page, but not immediately?
4. **Where does it fail?** On every website, or only on a particular site such as YouTube?
5. **Which Chrome version is being used?** This may help us check whether the problem is specific to Chrome’s settings sync.

### Dependencies
None identified, but may relate to other storage-dependent features.
