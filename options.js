// Debug logging wrapper
function debug(...args) {
    console.log('[VSC Settings]', ...args);
}

// Import validation utilities (using inline implementation for now)
function validateSpeed(speed) {
    const parsed = parseFloat(speed);
    if (isNaN(parsed)) return { valid: false, error: 'Invalid number' };
    if (parsed < 0.05) return { valid: false, error: 'Speed must be at least 0.05x' };
    if (parsed > 16) return { valid: false, error: 'Speed must be at most 16x' };
    return { valid: true, value: parsed };
}

function validateSpeedArray(speeds) {
    if (!Array.isArray(speeds)) return { valid: false, error: 'Must be an array' };
    
    const validatedSpeeds = [];
    const errors = [];
    
    for (let i = 0; i < speeds.length; i++) {
        const result = validateSpeed(speeds[i]);
        if (result.valid) {
            validatedSpeeds.push(result.value);
        } else {
            errors.push(`Item ${i + 1}: ${result.error}`);
        }
    }
    
    // Remove duplicates and sort
    const uniqueSpeeds = [...new Set(validatedSpeeds)].sort((a, b) => a - b);
    
    return {
        valid: errors.length === 0,
        value: uniqueSpeeds,
        errors
    };
}

function validateShortcut(key) {
    if (typeof key !== 'string') return { valid: false, error: 'Must be a string' };
    
    const sanitized = key.trim().toLowerCase();
    if (sanitized.length === 0) return { valid: false, error: 'Cannot be empty' };
    if (sanitized.length > 1) return { valid: false, error: 'Must be a single character' };
    
    // Disallowed keys
    const disallowedKeys = ['control', 'alt', 'shift', 'meta', 'tab', 'escape', 'enter', 'backspace', 'delete'];
    if (disallowedKeys.includes(sanitized)) {
        return { valid: false, error: 'Control keys not allowed' };
    }
    
    return { valid: true, value: sanitized };
}

function validateShortcuts(shortcuts) {
    if (typeof shortcuts !== 'object' || shortcuts === null) {
        return { valid: false, error: 'Must be an object' };
    }
    
    const validatedShortcuts = {};
    const errors = [];
    
    const requiredKeys = ['speedUp', 'speedDown', 'reset'];
    
    for (const key of requiredKeys) {
        if (!(key in shortcuts)) {
            errors.push(`Missing required key: ${key}`);
            continue;
        }
        
        const result = validateShortcut(shortcuts[key]);
        if (result.valid) {
            validatedShortcuts[key] = result.value;
        } else {
            errors.push(`${key}: ${result.error}`);
        }
    }
    
    // Check for duplicates
    const values = Object.values(validatedShortcuts);
    if (values.length !== new Set(values).size) {
        errors.push('All shortcuts must be unique');
    }
    
    return {
        valid: errors.length === 0,
        value: validatedShortcuts,
        errors
    };
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Default settings
const defaultSpeeds = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4, 8, 16];

const defaultSettings = {
    customSpeeds: defaultSpeeds,
    shortcuts: {
        speedUp: 'd',
        speedDown: 'a',
        reset: 's'
    },
    // All interface options are always enabled (removed from UI)
    enableNumberShortcuts: true,
    showSpeedButtons: true,
    showShortcutHints: true
};

// Current settings state
let currentSettings = { ...defaultSettings };

// Load settings from storage
async function loadSettings() {
    try {
        debug('Loading settings...');
        
        // Import migration utilities (inline for now)
        const migrateSettings = async () => {
            const CURRENT_SCHEMA_VERSION = 2;
            const getCurrentVersion = async () => {
                try {
                    const result = await chrome.storage.sync.get({ _schemaVersion: 1 });
                    return result._schemaVersion || 1;
                } catch (error) {
                    return 1;
                }
            };
            
            const setVersion = async (version) => {
                try {
                    await chrome.storage.sync.set({ _schemaVersion: version });
                    return true;
                } catch (error) {
                    return false;
                }
            };
            
            const currentVersion = await getCurrentVersion();
            
            if (currentVersion < CURRENT_SCHEMA_VERSION) {
                console.log(`Migrating settings from version ${currentVersion} to ${CURRENT_SCHEMA_VERSION}`);
                
                const result = await chrome.storage.sync.get(null);
                let settings = result;
                
                // Migration from version 1 to 2
                if (currentVersion === 1) {
                    settings.activeSpeeds = settings.activeSpeeds || {};
                    
                    // Validate and clean speeds
                    if (Array.isArray(settings.customSpeeds)) {
                        settings.customSpeeds = settings.customSpeeds
                            .filter(speed => typeof speed === 'number' && speed >= 0.05 && speed <= 16)
                            .sort((a, b) => a - b);
                    }
                    
                    // Validate shortcuts
                    if (settings.shortcuts && typeof settings.shortcuts === 'object') {
                        const validShortcuts = {};
                        ['speedUp', 'speedDown', 'reset'].forEach(key => {
                            const value = settings.shortcuts[key];
                            if (typeof value === 'string' && value.length === 1) {
                                validShortcuts[key] = value.toLowerCase();
                            }
                        });
                        settings.shortcuts = validShortcuts;
                    }
                }
                
                await chrome.storage.sync.set(settings);
                await setVersion(CURRENT_SCHEMA_VERSION);
                
                return { migrated: true, settings };
            }
            
            return { migrated: false, settings: result };
        };
        
        // Run migration first
        const migrationResult = await migrateSettings();
        
        // Use resilient storage get
        const storageResult = await safeStorageGet(null, defaultSettings);
        if (!storageResult.success) {
            throw new Error(storageResult.error?.message || 'Failed to load settings');
        }
        
        const result = storageResult.result;
        debug('Raw storage result:', result);

        // Start with default settings
        currentSettings = { ...defaultSettings };

        // If we have stored settings, update the defaults
        if (result && Object.keys(result).length > 0) {
            try {
                if (Array.isArray(result.customSpeeds)) {
                    currentSettings.customSpeeds = result.customSpeeds;
                }

                if (result.shortcuts) {
                    currentSettings.shortcuts = {
                        ...defaultSettings.shortcuts,
                        ...result.shortcuts
                    };
                }

                // All boolean settings are always enabled, not loaded from UI
            } catch (parseError) {
                console.error('Error parsing stored settings:', parseError);
                debug('Using default settings due to parse error');
            }
        }

        debug('Final settings:', currentSettings);
        
        if (migrationResult.migrated) {
            debug('Settings migration completed successfully');
        }
        
        return currentSettings;
    } catch (error) {
        console.error('Error loading settings:', error);
        debug('Using fallback default settings');
        return defaultSettings;
    }
}

// Save settings to storage
async function saveSettings(settings) {
    try {
        debug('Saving settings:', settings);
        
        // Use resilient storage set
        const storageResult = await safeStorageSet(settings);
        if (!storageResult.success) {
            throw new Error(storageResult.error?.message || 'Failed to save settings');
        }
        
        currentSettings = { ...settings };
        debug('Settings saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        debug('Failed to save settings');
        return false;
    }
}

// Resilient storage utilities (simplified for options page)
async function safeStorageGet(keys, defaults = {}) {
    try {
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const result = await chrome.storage.sync.get(keys || defaults);
                return { success: true, result, attempts: attempt };
            } catch (error) {
                lastError = error;
                if (attempt < 3) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
        return { success: false, error: lastError, attempts: 3 };
    } catch (error) {
        return { success: false, error, attempts: 0 };
    }
}

async function safeStorageSet(items) {
    try {
        // Check quota first (simplified check)
        const dataSize = JSON.stringify(items).length;
        if (dataSize > 100000) { // 100KB limit
            throw new Error('Data too large for storage');
        }
        
        let lastError;
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                await chrome.storage.sync.set(items);
                return { success: true, result: items, attempts: attempt };
            } catch (error) {
                lastError = error;
                if (attempt < 3 && !error.message.includes('quota')) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                } else {
                    break; // Don't retry quota errors
                }
            }
        }
        return { success: false, error: lastError, attempts: 3 };
    } catch (error) {
        return { success: false, error, attempts: 0 };
    }
}

// Check if speeds match defaults
function areSpeedsDefault(speeds) {
    if (!Array.isArray(speeds)) return true;
    const normalize = s => s.map(x => parseFloat(x.toFixed(2))).sort((a, b) => a - b);
    return JSON.stringify(normalize(speeds)) === JSON.stringify(normalize(defaultSpeeds));
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', async () => {
    try {
        debug('Options page loaded');

        // Get DOM elements
        const elements = {
            speedList: document.getElementById('speedList'),
            resetSpeeds: document.getElementById('resetSpeeds'),
            speedUp: document.getElementById('shortcutSpeedUp'),
            speedDown: document.getElementById('shortcutSpeedDown'),
            reset: document.getElementById('shortcutReset')
            // All interface options removed from UI
        };

        // Validate required elements
        if (!elements.speedList) {
            console.error('Speed list element not found!');
            return;
        }

        // Show version
        if (elements.version) {
            try {
                const manifest = chrome.runtime.getManifest();
                elements.version.textContent = `v${manifest.version}`;
            } catch (versionError) {
                console.error('Error getting version:', versionError);
                elements.version.textContent = 'Unknown version';
            }
        }

        // Show status message
        function showStatus(message) {
            try {
                if (!elements.status) return;
                debug('Showing status:', message);
                elements.status.textContent = message;
                elements.status.style.opacity = '1';
                setTimeout(() => {
                    try {
                        if (elements.status) {
                            elements.status.style.opacity = '0';
                        }
                    } catch (timeoutError) {
                        console.error('Error hiding status:', timeoutError);
                    }
                }, 2000);
            } catch (statusError) {
                console.error('Error showing status:', statusError);
            }
        }

        // Update UI with current settings
        function updateUI(settings) {
            try {
                debug('Updating UI with settings:', settings);
                
                // Update speeds list
                if (Array.isArray(settings.customSpeeds)) {
                    const speedsText = settings.customSpeeds.join('\n');
                    debug('Setting speeds text:', speedsText);
                    elements.speedList.value = speedsText;
                }
                
                // Show/hide reset button
                const isDefault = areSpeedsDefault(settings.customSpeeds);
                if (elements.resetButton) {
                    elements.resetButton.style.display = isDefault ? 'none' : 'block';
                }
                
                // Update shortcuts
                if (elements.speedUp) elements.speedUp.value = settings.shortcuts.speedUp;
                if (elements.speedDown) elements.speedDown.value = settings.shortcuts.speedDown;
                if (elements.reset) elements.reset.value = settings.shortcuts.reset;

                // All checkboxes are always enabled, not updated from UI

                debug('UI update complete');
            } catch (updateError) {
                console.error('Error updating UI:', updateError);
                showStatus('Error updating interface');
            }
        }

        // Save settings with debounce
        const debouncedSave = debounce(async (settings) => {
            try {
                const success = await saveSettings(settings);
                showStatus(success ? 'Settings saved' : 'Error saving settings');
            } catch (saveError) {
                console.error('Error in debounced save:', saveError);
                showStatus('Error saving settings');
            }
        }, 250);

        // Load initial settings
        try {
            debug('Loading initial settings...');
            const settings = await loadSettings();
            updateUI(settings);
        } catch (loadError) {
            console.error('Error loading initial settings:', loadError);
            showStatus('Error loading settings');
        }

        // Handle speed list changes
        if (elements.speedList) {
            elements.speedList.addEventListener('input', (e) => {
                try {
                    debug('Speed list changed');
                    const newSpeeds = e.target.value
                        .split('\n')
                        .map(s => s.trim())
                        .filter(s => s.length > 0) // Keep non-empty lines
                        .map(s => {
                            const parsed = parseFloat(s);
                            return !isNaN(parsed) && parsed >= 0.05 && parsed <= 16 ? parsed : null;
                        })
                        .filter(s => s !== null);
                    
                    // Validate speeds
                    const validation = validateSpeedArray(newSpeeds);
                    if (!validation.valid) {
                        debug('Speed validation failed:', validation.errors);
                        showStatus(`Invalid speeds: ${validation.errors.join(', ')}`);
                        return;
                    }
                    
                    const newSettings = { ...currentSettings, customSpeeds: validation.value };
                    debug('New speeds:', validation.value);
                    currentSettings = newSettings; // Update immediately for better UX
                    debouncedSave(newSettings);
                } catch (speedError) {
                    console.error('Error processing speed changes:', speedError);
                    showStatus('Error processing speeds');
                }
            });
        }

        // Handle shortcut changes
        const handleShortcutKeydown = (e) => {
            try {
                e.preventDefault(); // Prevent default key behavior
                const key = e.target.id.replace('shortcut', '').toLowerCase();
                const value = e.key.toLowerCase();
                
                // Validate shortcut
                const validation = validateShortcut(value);
                if (!validation.valid) {
                    debug('Shortcut validation failed:', validation.error);
                    showStatus(`Invalid shortcut: ${validation.error}`);
                    return;
                }
                
                // Check for conflicts with other shortcuts
                const newShortcuts = { ...currentSettings.shortcuts, [key]: validation.value };
                const shortcutValidation = validateShortcuts(newShortcuts);
                if (!shortcutValidation.valid) {
                    debug('Shortcut conflict detected:', shortcutValidation.errors);
                    showStatus(`Shortcut conflict: ${shortcutValidation.errors.join(', ')}`);
                    return;
                }
                
                // Ignore modifier keys and special keys
                if (['control', 'alt', 'shift', 'meta', 'tab'].includes(value)) {
                    return;
                }

                const newSettings = {
                    ...currentSettings,
                    shortcuts: shortcutValidation.value
                };
                debug('New shortcut:', key, validation.value);
                currentSettings = newSettings; // Update immediately
                updateUI(newSettings);
                debouncedSave(newSettings);
            } catch (shortcutError) {
                console.error('Error handling shortcut change:', shortcutError);
                showStatus('Error setting shortcut');
            }
        };

        // Handle input changes (for manual typing/pasting)
        const handleShortcutInput = (e) => {
            try {
                const key = e.target.id.replace('shortcut', '').toLowerCase();
                const value = e.target.value.trim().toLowerCase();
                
                if (value.length === 0) return; // Don't process empty input
                
                // Validate shortcut
                const validation = validateShortcut(value);
                if (!validation.valid) {
                    debug('Shortcut validation failed:', validation.error);
                    showStatus(`Invalid shortcut: ${validation.error}`);
                    return;
                }
                
                // Check for conflicts with other shortcuts
                const newShortcuts = { ...currentSettings.shortcuts, [key]: validation.value };
                const shortcutValidation = validateShortcuts(newShortcuts);
                if (!shortcutValidation.valid) {
                    debug('Shortcut conflict detected:', shortcutValidation.errors);
                    showStatus(`Shortcut conflict: ${shortcutValidation.errors.join(', ')}`);
                    return;
                }

                const newSettings = {
                    ...currentSettings,
                    shortcuts: shortcutValidation.value
                };
                debug('New shortcut from input:', key, validation.value);
                currentSettings = newSettings; // Update immediately
                updateUI(newSettings);
                debouncedSave(newSettings);
            } catch (inputError) {
                console.error('Error handling shortcut input:', inputError);
                showStatus('Error setting shortcut');
            }
        };

        // Handle checkbox changes
        const handleCheckboxChange = (e) => {
            try {
                const newSettings = { ...currentSettings, [e.target.id]: e.target.checked };
                updateUI(newSettings);
                debouncedSave(newSettings);
            } catch (checkboxError) {
                console.error('Error handling checkbox change:', checkboxError);
                showStatus('Error updating setting');
            }
        };

        // Handle reset speeds
        if (elements.resetButton) {
            elements.resetButton.addEventListener('click', () => {
                try {
                    const newSettings = { ...currentSettings, customSpeeds: [...defaultSpeeds] };
                    updateUI(newSettings);
                    debouncedSave(newSettings);
                    showStatus('Speeds reset to defaults');
                } catch (resetError) {
                    console.error('Error resetting speeds:', resetError);
                    showStatus('Error resetting speeds');
                }
            });
        }

        // Add event listeners (no checkbox events needed - all always enabled)
        if (elements.speedUp) {
            elements.speedUp.addEventListener('keydown', handleShortcutKeydown);
            elements.speedUp.addEventListener('input', handleShortcutInput);
        }
        if (elements.speedDown) {
            elements.speedDown.addEventListener('keydown', handleShortcutKeydown);
            elements.speedDown.addEventListener('input', handleShortcutInput);
        }
        if (elements.reset) {
            elements.reset.addEventListener('keydown', handleShortcutKeydown);
            elements.reset.addEventListener('input', handleShortcutInput);
        }

        debug('Setup complete');
    } catch (initError) {
        console.error('Error initializing options page:', initError);
        // Show a basic error message to the user
        document.body.innerHTML = `
            <div style="padding: 20px; font-family: sans-serif;">
                <h2>Error Loading Settings</h2>
                <p>There was an error loading the Video Speed Controller settings page.</p>
                <p>Please try refreshing the page or check the browser console for details.</p>
            </div>
        `;
    }
});
