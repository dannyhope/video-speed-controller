# Video Speed Controller — Product Spec

> Living document. Update whenever behaviour changes. Last updated: 2026-08-23.
>
> **This file is the source of truth for how the extension should work.** If code, README, or store listing copy disagree with this spec, update them to match this document.

---

## Purpose

Video Speed Controller is a Chrome extension that lets people change HTML5 video playback speed on any website using keyboard shortcuts and small on-screen controls.

---

## Surfaces

| Surface | Role |
|---------|------|
| Any page with `<video>` (or YouTube embeds) | Content script: shortcuts, overlay, speed buttons |
| Extension popup / side panel (`popup.html`) | Settings: speeds, shortcuts, playback options |

---

## Core behaviour

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

- When a playing video (or supported YouTube embed) is present and `showSpeedButtons` is on: show labelled on-screen buttons (↓ Speed, 1×, ↑ Speed, Skip, ?, Preferences) near the top-left of the video.
- Buttons are at least 40×40px, wrap on narrow viewports, and sit flush (no gap) so hover does not flicker between them.
- Controls appear on hover over the video; stay visible while the pointer is over the video or the control bar; fade after leaving. Keyboard-triggered controls still hide after about 2 seconds if the pointer is not over the video.
- Press `?` or the help button to show a shortcut overlay (current keys for slow down, speed up, reset). Dismiss with Escape or a click outside.
- On YouTube watch pages, **Preferences** sits in the native player bar (right-hand controls) so it appears and hides with YouTube’s own chrome. Changing speed also shows the on-video bar, including Preferences if YouTube’s bar is hidden.
- **Preferences** opens the settings side panel.

### Settings (popup / side panel)

Stored in `chrome.storage.sync`:

| Key | Meaning |
|-----|---------|
| `customSpeeds` | Ordered list of rates (1× cannot be removed) |
| `shortcuts` | `speedUp`, `speedDown`, `reset` |
| `pausingResetsSpeed` | If true, pause sets rate to 1× |
| `skipSilenceEnabled` | Preference for caption-gap skipping (toggle via settings checkbox or on-video button) |
| `skipSilenceGapThreshold` | Minimum caption gap (seconds) to skip |
| `enableNumberShortcuts` | Reserved / default true (not exposed in current popup) |
| `showSpeedButtons` | Show on-video controls (default true) |
| `showShortcutHints` | Tooltips include shortcut keys (default true) |

Popup shortcut fields show a permanent comma-separated example under each input. The Add speed field uses a visible hint, not a placeholder. The popup footer credits “A Danny Hope product”.

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
