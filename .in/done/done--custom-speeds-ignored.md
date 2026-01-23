# Bug: Custom speed preferences are ignored

**Status:** ✅ Fixed

## Problem

Custom speed preferences are ignored - keyboard shortcuts cycle through default/hardcoded values instead of user's custom speeds set in preferences.

## Expected Behaviour

When user sets custom speeds in preferences (e.g., 0.5, 1.0, 1.5, 2.0), the keyboard shortcuts (speed up/down) should cycle through ONLY those custom values.

## Root Cause

In content.js line 237, the code was merging `defaultSpeeds` with `customSpeeds`:
```javascript
this.speeds = [...new Set([...this.defaultSpeeds, ...validSpeeds])].sort((a, b) => a - b);
```

This meant that even when users customized their speed list, the keyboard shortcuts would still cycle through ALL default speeds merged with their custom ones.

## Fix Applied

Changed line 237 to use `customSpeeds` directly without merging:
```javascript
// Use custom speeds directly (don't merge with defaults)
// customSpeeds already defaults to defaultSpeeds if not customized
this.speeds = [...new Set(validSpeeds)].sort((a, b) => a - b);
```

Since `customSpeeds` already defaults to `defaultSpeeds` when not customized, this change:
- ✅ Respects user's custom speed list when they modify it
- ✅ Still provides default speeds for users who never customize
- ✅ Allows users to remove unwanted speeds from the list

## Testing

1. Load extension and open popup
2. Remove some default speeds (e.g., remove 0.05, 0.1, 0.25)
3. Add a custom speed (e.g., 2.5)
4. Go to any video page
5. Use keyboard shortcuts (d/s) to cycle speeds
6. Verify only the custom speeds from popup are used
