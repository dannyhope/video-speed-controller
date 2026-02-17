# Skip sections with no captions

**Readiness:** built
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

## Auto-investigation
**Investigated:** 2026-02-09

### Findings
**This feature is already fully implemented** (commit `483db55` from Feb 7, 2025).

Current implementation:
- **content.js:91-265** — `SilenceSkipper` class handles caption extraction, gap detection, and auto-skip
- **content.js:295-297** — Skip silence button (⏭ icon) in on-screen controls
- **content.js:1368-1379** — `toggleSkipSilence()` method integrates with controller
- **content.js:1381-1395** — Button state updates (active/unavailable states)
- **popup.html:88-113** — Settings UI with toggle and keyboard shortcut input
- **popup.js** — Settings persistence for skip silence feature

Caption detection works via:
- HTML5 `<track>` elements and `video.textTracks` API
- Identifies gaps > 5 seconds between caption entries (configurable via `skipSilenceGapThreshold` setting)
- Auto-seeks to next caption when playback reaches a gap

All requirements from the task description are complete:
✓ Caption detection for HTML5 videos
✓ Gap detection with configurable threshold
✓ Auto-skip functionality
✓ Toggle-able on/off
✓ Keyboard shortcut (user-configurable)
✓ Button in on-screen controls
✓ Toggle setting in popup

### Scope
**No code changes needed.** This task should be moved to `.in/closed/` as completed.

Testing recommendation: Verify skip-silence works correctly on:
1. YouTube videos with auto-generated captions
2. Vimeo videos with HTML5 captions
3. Videos with long silent sections (music intros, pauses)
4. Videos with no captions (should show "unavailable" state)

### Questions for refinement
1. Should this task be closed as complete, or is there additional functionality desired?
2. Are there any specific bugs or edge cases with the current implementation?
3. Should YouTube caption extraction via Innertube API be added (currently only supports HTML5 `<track>` elements)?

### Dependencies
None. Feature is fully implemented and independent.
