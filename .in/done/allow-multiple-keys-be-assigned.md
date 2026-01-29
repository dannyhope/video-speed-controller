# Allow multiple keys to be assigned, each delimited with commas

**Original:** - Allow multiple keys to be assigned, each delimited with commas

## A.I.'s guess at what this item is about

Currently, each shortcut (speedUp, speedDown, reset) can only be assigned a single key. This feature would allow users to assign multiple keys to the same action.

For example:
- Speed up: `d, =, +` (three different keys all increase speed)
- Speed down: `s, -, _` (three different keys all decrease speed)
- Reset: `r, 0`

Implementation would require:
1. **Settings storage:** Change shortcuts from strings to arrays or comma-delimited strings
   - Current: `shortcuts: { speedUp: 'd', speedDown: 's', reset: 'r' }`
   - New: `shortcuts: { speedUp: 'd,=,+', speedDown: 's,-', reset: 'r,0' }`
2. **Validation:** Update validation.js to accept comma-delimited keys
3. **UI changes:** Update popup.html input fields to accept/display comma-separated values
4. **Event handling:** Update keyboard event listener in content.js to check if pressed key matches any key in the comma-delimited list

Benefits:
- Users can use multiple convenient keys (e.g., both `=` and `+` which are on the same key)
- Better keyboard layout support (different layouts have symbols in different places)
- Muscle memory from other apps (some users might prefer `-`/`+` for speed control)
