# Bug: Custom speed preferences are ignored

## Problem

Custom speed preferences are ignored - keyboard shortcuts cycle through default/hardcoded values instead of user's custom speeds set in preferences.

## Expected Behaviour

When user sets custom speeds in preferences (e.g., 0.5, 1.0, 1.5, 2.0), the keyboard shortcuts (speed up/down) should cycle through those custom values.

## Current Behaviour

Keyboard shortcuts cycle through default/baked-in values regardless of what the user has set in preferences.

## Investigation Steps

1. Check how keyboard shortcuts load speed values in content.js
2. Verify customSpeeds from chrome.storage.sync are being merged properly
3. Ensure the speeds array used by keyboard handlers includes custom speeds
