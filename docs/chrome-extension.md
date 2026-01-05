# Chrome Extension Development Guide

## Key Concepts

### Manifest V3
- Current manifest version used in this project
- Requires specific permissions structure
- Uses modern Chrome APIs

### Storage
- Using `chrome.storage.sync` for settings
- Data is synced across user's Chrome instances
- Settings stored under a single key for simplicity

### Content Scripts
- Run in the context of web pages
- Can modify page content and handle events
- Limited access to Chrome APIs

### Permissions
Required permissions in manifest.json:
- `storage`: For saving user settings
- `activeTab`: For accessing current tab
- `scripting`: For injecting content scripts

## Common Tasks

### Updating Settings
```javascript
// Save settings
await chrome.storage.sync.set({ settings: newSettings });

// Load settings
const result = await chrome.storage.sync.get('settings');
```

### Debugging Tips
1. Use Chrome's extension debugging page (chrome://extensions)
2. Enable Developer Mode
3. Use "Inspect views" to debug background/content scripts
4. Check console for storage operations

## Build Process
Last built: Tuesday the 4th of February, 2025 at 12:23PM

## Resources
- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-migration/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
