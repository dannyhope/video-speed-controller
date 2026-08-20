// Shared constants for Video Speed Controller extension
// Used by content.js, popup.js, and other modules

const DEFAULT_SPEEDS = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10, 16];

const DEFAULT_SETTINGS = {
    customSpeeds: DEFAULT_SPEEDS,
    shortcuts: {
        speedUp: 'd',
        speedDown: 'a',
        reset: 's'
    },
    enableNumberShortcuts: true,
    showSpeedButtons: true,
    showShortcutHints: true,
    pausingResetsSpeed: false,
    skipSilenceEnabled: false,
    skipSilenceGapThreshold: 5
};

// Export for use in content scripts and popup
if (typeof module !== 'undefined' && module.exports) {
    // Node.js/CommonJS environment
    module.exports = { DEFAULT_SPEEDS, DEFAULT_SETTINGS };
}
