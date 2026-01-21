# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Video Speed Controller is a Chrome browser extension (Manifest V3) that allows users to control video playback speed on any website using customisable keyboard shortcuts and on-screen controls.

## Architecture

### Core Files

- **content.js**: Main content script injected into all pages. Contains the `VideoSpeedController` class that manages video detection, keyboard shortcuts, speed changes, and UI overlays
- **popup.js**: Popup interface logic for the settings UI
- **popup.html**: Popup UI where users configure speeds and shortcuts via extension icon
- **popup.css**: Styling for the popup interface
- **styles.css**: Styling for the speed overlay and on-screen controls
- **manifest.json**: Chrome extension manifest (V3)

### Utility Modules

These modules are imported inline (not via ES6 imports) in content.js and popup.js:

- **storage.js**: `StorageManager` class with resilient chrome.storage.sync operations, quota checking, and retry logic
- **validation.js**: Input validation functions for speeds and keyboard shortcuts
- **migration.js**: Schema version migration utilities for settings upgrades
- **compatibility.js**: Feature detection and fallback utilities for cross-browser support
- **event-manager.js**: Safe event listener management to prevent duplicates and memory leaks
- **dom-utils.js**: DOM query utilities including video element detection
- **state-validator.js**: Runtime state validation and repair for the controller

### Current Implementation Pattern

The codebase currently uses **inline implementation** of utilities rather than ES6 modules. When content.js or options.js need functionality from a utility module, the code is copied inline within the function that needs it. This is due to Chrome extension content script limitations.

## Extension Architecture

### Content Script (content.js)

- Runs on all pages (`<all_urls>` match pattern)
- Creates `VideoSpeedController` singleton on page load
- Manages keyboard event listeners for speed control shortcuts
- Creates and positions overlay elements for speed feedback
- Maintains state: current speed index, speed array, settings
- Uses chrome.storage.sync to load/save settings
- Listens for chrome.storage.onChanged to update when settings change

### Settings System

Default speeds: `[0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10, 16]`

Settings stored in chrome.storage.sync:
```javascript
{
  customSpeeds: number[],           // Array of playback speeds
  shortcuts: {
    speedUp: string,                // Single character (default: 'd')
    speedDown: string,              // Single character (default: 's')
    reset: string                   // Single character (default: 'r')
  },
  enableNumberShortcuts: boolean,   // Allow 1-9 keys to jump to speeds
  showSpeedButtons: boolean,        // Show on-screen controls
  showShortcutHints: true          // Show keyboard hints on buttons
}
```

### State Management

The VideoSpeedController maintains:
- `speeds`: Merged array of default + custom speeds (sorted, deduplicated)
- `currentSpeedIndex`: Index into speeds array for current playback rate
- `settings`: Loaded from storage
- `overlay`: DOM element for speed feedback display
- `controls`: DOM element for on-screen speed buttons

### Video Detection Logic

The `getCurrentVideo()` function finds videos by:
1. Querying all `<video>` elements that are connected to DOM
2. Filtering to videos with src/currentSrc and non-HAVE_NOTHING readyState
3. Preferring currently playing videos
4. Falling back to largest video by dimensions
5. Returning first valid video if no playing/large video found

## Development

### Loading the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" toggle (top right)
3. Click "Load unpacked"
4. Select the repository root directory
5. The extension should appear in the list

### Testing Changes

After modifying files:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the Video Speed Controller card
3. Reload any pages where you want to test the extension
4. Check the browser console for content script logs
5. Right-click extension icon > "Inspect popup" to debug popup interface

### Debugging

- Content script logs: Open DevTools on any page (F12), check Console
- Popup interface: Right-click extension icon > "Inspect popup" to debug popup.js
- Storage inspection: Go to DevTools > Application tab > Storage > Extension Storage
- Common debug pattern: Look for `[VSC Popup]` prefix in popup.js logs

## Common Patterns

### Error Handling

Functions use try/catch blocks extensively with fallback behaviour:
- Storage operations retry 3 times with exponential backoff
- Settings load failures fall back to defaults
- DOM operations check element existence before manipulation
- State validation runs before applying speed changes

### Resource Cleanup

VideoSpeedController tracks resources for cleanup:
- `timeouts[]`: Array of setTimeout IDs to clear
- `eventListeners[]`: Tracked event listeners for removal
- `setupCleanupHandlers()`: Registers beforeunload/visibilitychange handlers
- `cleanup()`: Removes timeouts, listeners, and DOM elements

### Resilient Storage

Storage operations use retry logic from storage.js:
```javascript
// Instead of direct chrome.storage.sync.get()
const result = await this.safeStorageGet(keys, defaults);
if (!result.success) {
  // Handle error with result.error
}
```

## Known Issues

See docs/tech-debt.md for comprehensive list. Key issues:

- **Module system**: Utilities copied inline rather than imported (Chrome extension limitation workaround)
- **Duplicate code**: Settings defaults defined in multiple files
- **Memory management**: Some event listeners may not be properly cleaned up
- **Permissions**: `<all_urls>` is overly broad
- **No tests**: Zero unit or integration tests

## File Organisation

- `/docs/` - Documentation including user stories, ideas, tech debt tracking
- `/icons/` - Extension icons in multiple sizes (16, 48, 128, 2048)
- Root files are the source code (no build process currently)

## Settings Schema Migration

Current schema version: 2

Migration path (handled in migration.js):
- V1 → V2: Added `activeSpeeds` object, validated/cleaned speed arrays and shortcuts

When adding new settings, increment CURRENT_SCHEMA_VERSION and add migration logic.

## British English

Use British English spellings in user-facing text (customise, colour, etc.).
