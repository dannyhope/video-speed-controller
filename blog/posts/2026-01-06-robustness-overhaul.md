---
title: "Under the Hood: Making Video Speed Controller Bulletproof"
date: 2026-01-06
type: behind-the-scenes
summary: "How we made the extension more reliable across sites and edge cases"
---

# Under the Hood: Making Video Speed Controller Bulletproof

The first version of Video Speed Controller worked well on most sites, but edge cases were causing headaches. Videos that loaded dynamically, pages with multiple videos, storage sync issues – all needed addressing. Here's what we fixed.

## Smarter Video Detection

Not all videos are created equal. Some sites load videos after the page, some have multiple videos (ads, background loops, the actual content), and some use unusual player implementations.

The new detection logic:
- **Prioritises playing videos** – If you're watching something, that's what you want to control
- **Falls back to the largest video** – On pages with multiple videos, the biggest one is usually the main content
- **Handles dynamic loading** – Videos that appear after page load are now detected

## Resilient Storage

Chrome's sync storage is great for keeping settings across devices, but it can fail – quota limits, sync conflicts, network issues. We now:
- **Retry failed operations** with exponential backoff
- **Fall back to defaults** gracefully when storage is unavailable
- **Validate stored data** to catch corruption

## Resource Cleanup

Browser extensions can leak memory if they don't clean up properly. We now track all timeouts and event listeners, and clean them up when navigating away or closing the page.

## What This Means for You

Honestly? Nothing visible. That's the point. The extension should just work, on more sites, more reliably, without you noticing. If you were having issues with certain sites before, give them another try.

---

*Have feedback? Open an issue on [GitHub](https://github.com/dannyhope/video-speed-controller).*
