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
