# Allow multiple keys to be assigned, each delimited with commas

**Status:** 🟠 Implemented, needs testing

## Implementation complete (2026-01-29)

Code changes committed in `bce8cd7`. Needs manual testing before marking complete.

### What was done

1. **popup.html** - Removed `maxlength="1"`, added tooltips explaining comma format
2. **popup.js** - Updated validation to handle comma-separated keys, handlers add keys to list
3. **content.js** - `matchesShortcut()` helper checks if pressed key matches any in the list
4. **Tooltips** - Now show all assigned keys (e.g., `[D, =, +]`)

### How to test

1. Refresh extension at `chrome://extensions/`
2. Open popup, test adding multiple keys:
   - Press a key in the shortcut field (should add to existing keys)
   - Or type/paste comma-separated: `d, =, +`
3. Test on a video page:
   - Any assigned key should trigger the action
   - Check tooltips show all keys
4. Test conflict detection (same key can't be used for multiple actions)

### If issues found

- Check browser console for errors
- State validation logs warnings if shortcuts are invalid
- Existing single-key shortcuts should still work (backwards compatible)

---

## Original description

Currently, each shortcut (speedUp, speedDown, reset) can only be assigned a single key. This feature would allow users to assign multiple keys to the same action.

For example:
- Speed up: `d, =, +` (three different keys all increase speed)
- Speed down: `s, -, _` (three different keys all decrease speed)
- Reset: `r, 0`

Benefits:
- Users can use multiple convenient keys (e.g., both `=` and `+` which are on the same key)
- Better keyboard layout support (different layouts have symbols in different places)
- Muscle memory from other apps (some users might prefer `-`/`+` for speed control)
