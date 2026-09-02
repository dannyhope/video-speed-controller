Keep a record of which speeds are used and for how much (real) time.

## Auto-investigation
**Investigated:** 2026-02-09

### Findings
- **No analytics currently:** Extension has NO tracking or analytics of any kind
- **Current speed tracking:** Extension only tracks `currentSpeedIndex` in memory (not persisted)
- **Storage available:** Could use `chrome.storage.local` for unlimited analytics data (sync has quota limits)
- **Timing approach:** Would need to track:
  - When speed changes occur (timestamp)
  - When video plays/pauses (listen to 'play'/'pause' events)
  - When page unloads (cleanup/save final stats)
- **"Real time" clarification:** Likely means wall-clock time, not video playback time (e.g., 10 minutes at 2x speed = 10 real minutes, not 5)

### Scope
**Files to modify:**
- `content.js` - Add analytics tracking:
  - New `speedUsageTracker` class or object
  - Listen to video 'play', 'pause', 'ended' events
  - Track active speed and elapsed real time
  - Accumulate stats in memory, periodically save to storage
  - On cleanup/page unload, save final stats
- `manifest.json` - No changes needed (storage permission already exists)
- `popup.html` + `popup.js` - Add new "Usage Statistics" section to view tracked data:
  - Table showing each speed and total time used
  - Clear/reset button
  - Export data option?
- `constants.js` - Add storage keys for analytics data

**Estimated complexity:** Medium (new feature with UI component)

### Questions for refinement
1. **Why do we want this?** Is it mainly for your own curiosity, to help decide what to improve, or for another reason?
2. **What should the report show?** Only the total time spent at each speed, or also which videos and websites used those speeds?
3. **Where should the data stay?** Only on this person’s computer, or should they be able to export and share it?
4. **Where should people see it?** Inside the existing settings panel, or on a separate page?
5. **How long should the data be kept?** Forever, or should older records be deleted automatically?
6. **What counts as time used?** Count only while a video is playing, or also while it is paused?
7. **Should background playback count?** If a video keeps playing in another browser tab, should that time be included?

### Dependencies
None. Independent feature request.
