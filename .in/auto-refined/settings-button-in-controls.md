# Add settings button to on-screen controls

## Summary
Add a button to the on-screen speed controls that opens extension settings in a Chrome side panel.

## Approach
Use Chrome's Side Panel API (MV3) to show settings in a side panel rather than a popup or new tab.

## Implementation steps
1. Add `"side_panel"` permission to manifest.json
2. Register side panel in manifest: `"side_panel": { "default_path": "popup.html" }`
3. Add settings button (gear icon) to on-screen controls
4. On click, call `chrome.sidePanel.open()` to open the panel

## Notes
- Side Panel API available in Chrome 114+
- Can reuse existing popup.html/popup.js
- Icon and placement to be decided during implementation

## Auto-investigation
**Investigated:** 2026-02-09

### Findings
**This feature is already fully implemented** (commit `483db55` from Feb 7, 2025).

Current implementation:
- **manifest.json:9** — `"sidePanel"` permission already added
- **manifest.json:11-13** — Side panel configured to use `popup.html`
- **manifest.json:14-16** — Background service worker `background.js` registered
- **background.js:1-5** — Message listener handles `openSidePanel` action, calls `chrome.sidePanel.open()`
- **content.js:298-300** — Settings button (⚙ icon) already exists in controls
- **content.js:1078-1084** — Click handler sends `chrome.runtime.sendMessage({ action: 'openSidePanel' })`

All implementation steps from the task description are complete.

### Scope
**No code changes needed.** This task should be moved to `.in/closed/` as completed.

Testing recommendation: Verify the settings button works correctly in:
1. Regular Chrome tabs
2. YouTube embedded players
3. Other video sites (Netflix, Vimeo, etc.)

### Questions for refinement
1. Should this task be closed as complete, or is there additional functionality desired?
2. Is there a specific bug or missing feature related to the settings button?
3. Should the settings button have different behaviour or appearance?

### Dependencies
None. Feature is fully implemented and independent.
