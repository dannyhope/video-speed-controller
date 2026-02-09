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
1. **What's the specific symptom?** Settings not saving at all, or settings saved but not applied to current page?
2. **Which settings specifically?** Custom speeds, shortcuts, or feature toggles?
3. **Timing issue?** Does it work after page reload, but not immediately after changing settings?
4. **Does this happen on all sites, or specific ones?** (e.g., YouTube might have special behaviour)
5. **Browser version?** Could be related to chrome.storage.sync sync delays or quota issues

### Dependencies
None identified, but may relate to other storage-dependent features.
