# Add 'Pausing resets speed' feature

**ID:** [2026-01-21T051928]
**Status:** ✅ Implemented

## Description
Add a tick-box in the popup settings interface for "Pausing resets speed"

## Behaviour
- When enabled, pausing the video resets playback speed to 1x
- Unpausing keeps the speed at 1x (previous speed is lost)
- This is optional behaviour controlled by the tick-box

## Implementation ✅

### popup.html
- ✅ Added "Playback Options" section with checkbox

### popup.js
- ✅ Added `pausingResetsSpeed: false` to defaultSettings
- ✅ Added `updatePlaybackOptionsUI()` function
- ✅ Added `handlePausingResetsSpeedChange()` event handler
- ✅ Added checkbox to elements object
- ✅ Updated loadSettings to handle pausingResetsSpeed
- ✅ Updated storage change listener

### content.js
- ✅ Added `pausingResetsSpeed: false` to defaultSettings and fallback settings
- ✅ Modified pauseHandler in addListenersToVideo to reset speed to 1x when enabled
- ✅ Updates currentSpeedIndex and shows overlay

## Testing
1. Load extension in Chrome (chrome://extensions/)
2. Refresh extension
3. Open popup, enable "Pausing resets speed to 1×" checkbox
4. Go to any video page (YouTube, etc.)
5. Set speed to 2x
6. Pause video → should reset to 1x
7. Unpause → should stay at 1x (not return to 2x)
