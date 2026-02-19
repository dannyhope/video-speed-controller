# Fix speed controls for embedded YouTube videos

**Readiness:** built
**Refined:** 2026-02-17
**Done when:** Keyboard shortcuts and on-screen speed controls work on YouTube videos embedded via `<iframe>` on third-party sites (blogs, news sites, etc.), using the YouTube IFrame Player API

**Original:** - [2026-30-18] controls dont work for embedded YouTube videos

## Summary

YouTube embeds on third-party sites are cross-origin `<iframe>` elements, so the content script can't access the `<video>` element directly. Use the YouTube IFrame Player API / `postMessage` to detect and control embedded YouTube players from the parent page.

## Approach

- **YouTube-specific:** Use YouTube's IFrame Player API to control playback speed via `postMessage` from the parent page context
- **Same controls:** Show the existing overlay and on-screen speed button controls, wired to the YouTube embed via the API
- **Multi-embed:** When multiple YouTube embeds exist on a page, control whichever is currently playing; if none playing, control the most recently interacted with
- **No auto-apply:** Embeds start at YouTube's default speed (1x); speed only changes when the user presses a shortcut key

## Technical notes

- Content script runs in the parent page (no `all_frames` change needed for this approach)
- Detect YouTube embeds by scanning for `<iframe>` elements with `src` matching `youtube.com/embed/`
- Use the YouTube IFrame Player API to send `setPlaybackRate` commands
- Listen for play/pause events from the API to track which embed is active
- Keyboard listeners already exist on `document` in the parent page — extend the handler to route commands to the active YouTube embed when no direct `<video>` is found

## Files likely affected

- `content.js` — YouTube embed detection, IFrame Player API integration, active embed tracking
- Possibly a new `youtube-embed.js` utility module (inline pattern, as per current codebase conventions)
