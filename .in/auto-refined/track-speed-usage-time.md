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
1. **Purpose of tracking:** Personal curiosity, research, feature prioritisation, or something else?
2. **Granularity:** Track total aggregate time per speed, or per-video/per-site breakdowns?
3. **Privacy:** Should data stay local only, or might it be exported/shared? (affects data structure)
4. **UI location:** View stats in popup settings, or separate page/tab?
5. **Data retention:** Keep data forever, or auto-purge after X days/weeks?
6. **Idle detection:** If video is paused or user switches tabs, should that time count?
7. **Background videos:** If video plays in background tab, should that count?

### Dependencies
None. Independent feature request.
