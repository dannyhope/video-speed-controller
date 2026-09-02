# Video Speed Controller — Product Spec

> Living document. Update whenever behaviour changes. Last updated: 2026-08-26.
>
> **This file is the source of truth for how the extension should work.** If code, README, or store listing copy disagree with this spec, update them to match this document.

---

## Purpose

Video Speed Controller is a Chrome extension that lets people change HTML5 video playback speed on any website using keyboard shortcuts and a Speed preferences link on the player.

---

## Surfaces

| Surface | Role |
|---------|------|
| Any page with `<video>` (or YouTube embeds) | Content script: shortcuts, overlay, Speed preferences |
| Extension popup / side panel (`popup.html`) | Settings: speeds, shortcuts, playback options |

---

## Core behaviour

### Local development address

- The preferred local hostname is `video-speed-controller.local`, recorded in the root `.local-domain` file.
- `npm run dev` serves the repository from `127.0.0.1:5237` using Python’s static server and checks the hostname first. Bombay’s shared port-80 proxy routes `video-speed-controller.local` to port `5237`; no project-local proxy is created.

### Speed control

- Cycle through a configurable list of playback rates (default includes 0.05×–16×, with **1×** always available and non-removable in settings).
- Default shortcuts:
  - **Speed up:** `d`
  - **Slow down:** `a`
  - **Reset / toggle normal:** `s`
- Shortcuts may be comma-separated (multiple keys per action).
- Shortcuts are ignored while focus is in an `INPUT` or `TEXTAREA`.
- Changing speed shows a brief centred overlay (`Normal speed` or `N×`).

### On-screen controls

- When a playing video (or supported YouTube embed) is present and `showSpeedButtons` is on: show a **Speed preferences** link near the top-left of the video. Speed, skip silence, and shortcut help are not on-video buttons — use the keyboard (`d` / `a` / `s`, `?` for help) and the settings panel.
- The link is at least 40px tall, styled as underlined text (not a row of icon buttons).
- It appears on hover over the video; stays visible while the pointer is over the video or the link; fade after leaving. Keyboard-triggered appearance still hides after about 2 seconds if the pointer is not over the video.
- Press `?` to show a shortcut overlay (current keys for slow down, speed up, reset). Dismiss with Escape or a click outside.
- On YouTube watch pages, **Speed preferences** sits in the native player bar (right-hand controls) so it appears and hides with YouTube’s own chrome. If that bar is hidden, the same link shows on the video overlay.
- **Speed preferences** opens the settings side panel.

### Settings (popup / side panel)

Stored in `chrome.storage.sync`:

| Key | Meaning |
|-----|---------|
| `customSpeeds` | Ordered list of rates (1× cannot be removed) |
| `shortcuts` | `speedUp`, `speedDown`, `reset` |
| `pausingResetsSpeed` | If true, pause sets rate to 1× |
| `skipSilenceEnabled` | Preference for caption-gap skipping (toggle via settings checkbox) |
| `skipSilenceGapThreshold` | Minimum caption gap (seconds) to skip |
| `enableNumberShortcuts` | Reserved / default true (not exposed in current popup) |
| `showSpeedButtons` | Show the on-video Speed preferences link (default true) |
| `showShortcutHints` | Tooltips include shortcut keys (default true) |

The Add speed field uses the input’s min/max constraints without additional helper copy. The popup footer has **Feedback** (https://dannyhope.co.uk/feedback) and “A Danny Hope product”.

### Skip silence

- Uses HTML5 `textTracks` captions/subtitles when available.
- Skips gaps between cues longer than the threshold.
- Shows feedback such as `Skipped Ns` or `No captions available`.

### YouTube embeds

- Detects `youtube.com/embed` / `youtube-nocookie.com/embed` iframes.
- Uses the YouTube IFrame Player API to set playback rate when no local `<video>` is available.

### Privacy

- No developer backend, analytics, or advertising.
- Settings sync via Chrome’s sync storage only.
- See `privacy-policy.html`.

---

## Non-goals

- Replacing site-native players’ full UI.
- Capturing or uploading video content.
- Running on pages without media the user is watching.

---

## Related docs

| Doc | Role |
|-----|------|
| [`design.md`](./design.md) | How it should look |
| [`../publish/LISTING.md`](../publish/LISTING.md) | Chrome Web Store copy |
