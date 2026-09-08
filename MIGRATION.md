# Migration to WXT + TypeScript

This extension has been migrated from vanilla JavaScript to WXT framework with TypeScript and the `browser.*` API for cross-browser compatibility.

## Changes

### Framework & Build System
- **WXT Framework**: Modern browser extension build tool with TypeScript support
- **TypeScript**: Full type safety across all extension code
- **browser.* API**: Using `webextension-polyfill` for cross-browser compatibility (Chrome + Firefox)

### Project Structure
```
src/
├── entrypoints/           # Extension entry points
│   ├── background.ts      # Background service worker
│   ├── content.ts         # Content script (main controller)
│   └── popup.html         # Popup UI
├── components/            # UI components
│   └── popup-logic.ts     # Popup JavaScript logic
├── styles/                # CSS styles
│   ├── content.css        # Content script styles
│   └── popup.css          # Popup styles
├── utils/                 # Utility modules
│   ├── constants.ts       # Shared constants and types
│   ├── storage.ts         # Storage utilities with browser.* API
│   └── youtube-embed.ts   # YouTube embed controller
└── assets/                # Static assets
    └── icons/             # Extension icons
```

### Build Commands

#### Development
```bash
npm run dev              # Start dev server for Chrome
npm run dev:firefox      # Start dev server for Firefox
```

#### Production Builds
```bash
npm run build            # Build for all browsers
npm run build:chrome     # Build for Chrome only
npm run build:firefox    # Build for Firefox only
```

#### Create Distribution Zips
```bash
npm run zip              # Create zips for all browsers
npm run zip:chrome       # Create Chrome zip
npm run zip:firefox      # Create Firefox zip
```

#### Type Checking
```bash
npm run check            # Run TypeScript type checking
```

### Output

Build outputs are in the `.output` directory:
- `.output/chrome-mv3/` - Chrome Manifest V3 build
- `.output/firefox-mv2/` - Firefox Manifest V2 build
- `.output/*.zip` - Distribution zip files

### Manifest Versions

- **Chrome**: Manifest V3 with service worker
- **Firefox**: Manifest V2 (compatible with current Firefox)

### Breaking Changes

None! All existing functionality has been preserved:
- ✅ Per-video speed control overlay
- ✅ Keyboard shortcuts (customisable, multi-key support)
- ✅ Settings persistence
- ✅ YouTube embed support
- ✅ Caption-based silence skipping
- ✅ British English UI strings

### API Changes

All Chrome-specific APIs have been replaced with `browser.*` equivalents:
- `chrome.storage.sync` → `browser.storage.sync`
- `chrome.runtime` → `browser.runtime`
- `chrome.sidePanel` → `browser.sidePanel`

The extension now works identically on both Chrome and Firefox.

## Development Notes

### TypeScript

All source files are now TypeScript with full type safety. The main types are defined in `src/utils/constants.ts`:

```typescript
interface Settings {
  customSpeeds: number[];
  shortcuts: {
    speedUp: string;
    speedDown: string;
    reset: string;
  };
  enableNumberShortcuts: boolean;
  showSpeedButtons: boolean;
  showShortcutHints: boolean;
  pausingResetsSpeed: boolean;
  skipSilenceEnabled: boolean;
  skipSilenceGapThreshold: number;
}
```

### WXT Configuration

Extension configuration is in `wxt.config.ts`. Modify this file to:
- Change manifest properties
- Add new permissions
- Configure build options
- Set browser-specific overrides

### Adding New Features

1. Create TypeScript files in appropriate directories
2. Import using path aliases (`~/utils/...`, `~/components/...`)
3. Use `browser.*` APIs instead of `chrome.*`
4. Run `npm run check` to verify types
5. Test in both Chrome and Firefox

## Testing

Existing tests remain unchanged. The migration preserves all behaviour while modernising the codebase.

## Compatibility

- **Chrome**: 88+ (Manifest V3 with service worker)
- **Firefox**: 109+ (Manifest V2, webextension-polyfill)
