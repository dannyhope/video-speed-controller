# controls dont work for embedded YouTube videos

**Original:** - [2026-30-18] controls dont work for embedded YouTube videos

## A.I.'s guess at what this item is about

This refers to YouTube videos embedded in other websites (e.g., via `<iframe>`), as opposed to videos on youtube.com directly. The extension's keyboard shortcuts and/or on-screen speed controls likely don't work when the video is in an embedded iframe.

Possible causes:
- **Content script scope:** The content script (content.js) may not be injecting into iframes, only the parent page
- **Video detection:** The `getCurrentVideo()` function may not find `<video>` elements inside iframes due to cross-origin restrictions
- **Event listeners:** Keyboard events may not bubble from the iframe to the parent page where our listeners are attached

This would require investigation of:
- The manifest.json `all_frames` permission (currently not set, which means content scripts only run in top-level frames)
- Whether the video element is accessible from the parent context
- Cross-origin iframe restrictions

This is a compatibility issue affecting a common use case (embedded videos on blogs, news sites, etc.).

## Auto-investigation
**Investigated:** 2026-02-09

### Findings
- **Current manifest.json:** Content scripts have `"matches": ["<all_urls>"]` but NO `"all_frames": true` property
- This means content.js only injects into top-level frames, NOT iframes
- **Video detection:** `getCurrentVideo()` in content.js uses `document.querySelectorAll('video')` which only queries the current document context
- **Cross-origin iframes:** YouTube embeds use `<iframe src="https://www.youtube.com/embed/...">` which are cross-origin from the parent page
- Even if we inject into iframes, cross-origin security prevents parent page from accessing iframe content
- **Keyboard events:** Event listeners are on `document` in content.js (line 1016: `addSafeListener(document, 'keydown', keydownHandler)`)
- These listeners only fire for events in their own frame context

### Scope
**Files to modify:**
- `manifest.json` - Add `"all_frames": true` to content_scripts config
- Potentially `content.js` - May need frame detection logic

**Estimated complexity:** Small to Medium

### Questions for refinement
1. Should the extension work for ALL iframes (including cross-origin YouTube embeds), or only same-origin iframes?
2. For cross-origin YouTube iframes specifically, should we use YouTube's API/postMessage to control playback, or is this out of scope?
3. Should controls appear in the iframe itself, or in the parent page (and somehow communicate with the iframe)?
4. What's the priority - fix same-origin iframes first (easy win), or tackle YouTube embeds specifically?

### Dependencies
None identified. Independent task.
