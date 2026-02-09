---
title: "The Journey So Far: Building Video Speed Controller"
date: 2026-01-31
type: behind-the-scenes
summary: "From initial commit to a robust, full-featured extension in seven weeks"
---

# The Journey So Far: Building Video Speed Controller

Seven weeks ago, Video Speed Controller was a simple idea: control video playback speed with keyboard shortcuts. Today it's a polished extension with on-screen controls, resilient storage, smart video detection, and customisable everything. Here's how we got here.

## December 2024: The Spark

The first commit landed on December 11th. The core was simple: inject a content script, listen for keypresses, change `video.playbackRate`. Three shortcuts: `A` to slow down, `D` to speed up, `S` to reset. A subtle overlay to show the current speed. It worked on YouTube, Vimeo, and most HTML5 video sites.

## Early January 2026: Making It Bulletproof

Real-world usage revealed edge cases. Sites with multiple videos (which one to control?). Dynamically loaded players. Storage sync failures. We added:

- **Smart video detection** – prioritise playing videos, fall back to largest
- **Resilient storage** – retry logic, graceful degradation, data validation
- **Proper cleanup** – no more memory leaks from orphaned listeners

## Mid-January 2026: The UI Leap

Keyboard shortcuts are great for power users, but not everyone wants to memorise keys. We added:

- **On-screen controls** – speed buttons overlaid on the video
- **In-page settings modal** – change settings without leaving your video
- **Pause-to-reset option** – automatically return to 1× when pausing
- **Keyboard hints** – show shortcuts on the on-screen buttons

## Late January 2026: Polish and Power Features

The final push added:

- **Multi-key shortcuts** – assign multiple keys to the same action
- **Automated testing** – catch regressions before they ship
- **Manual test checklist** – because some things need human eyes

## What We Learned

1. **Start simple, iterate** – The first version was intentionally minimal. User feedback (and our own usage) guided what to add.

2. **Reliability is invisible** – The robustness improvements don't look like much, but they're why the extension "just works" on sites where others fail.

3. **Options need defaults** – Every new feature is off by default if it changes the experience. Power users can enable; casual users aren't overwhelmed.

4. **Browser extensions are tricky** – Content scripts run in a sandboxed environment with limited access. Module imports don't work the same way. Chrome storage has quirks. These constraints shaped the architecture.

## What's Next

- Exploring YouTube's native speed keys for site-specific integration
- Considering a Firefox port
- Always: listening to feedback and fixing what breaks

Thanks for using Video Speed Controller. If you've got ideas or issues, [open a GitHub issue](https://github.com/dannyhope/video-speed-controller) – we read them all.

---

*Have feedback? Open an issue on [GitHub](https://github.com/dannyhope/video-speed-controller).*
