# Skip sections with no captions

**Refined:** 2026-01-31

## Summary

Add a toggle-able feature that automatically skips video sections where there are no captions/subtitles, saving time on silent intros, music-only sections, or long pauses.

## How it works

1. **Caption detection:**
   - On YouTube: Extract captions via Innertube API / `ytInitialPlayerResponse` page data
   - On other sites: Check for HTML5 `<track>` elements
   - If no captions available: Disable feature and show message

2. **Gap detection:**
   - Parse caption timestamps (start time + duration)
   - If captions only have start times, assume 5 seconds of speech
   - Identify gaps > 5 seconds between caption entries

3. **Auto-skip:**
   - When playback reaches a gap, seek to the next caption's start time
   - Feature must be toggle-able on/off

## UI

- Keyboard shortcut (user-configurable)
- Button in on-screen controls
- Toggle setting in popup

## Technical notes

- Chrome extensions can make cross-origin requests from background scripts (no CORS issues)
- YouTube's Innertube API is the standard approach used by transcript tools
- Reference: [youtube-caption-extractor](https://github.com/devhims/youtube-caption-extractor)

---

**Original:** Add a feature (with associated key and UI button) to skip parts with no speaking
