// Debug logging wrapper
function debug(...args) {
    console.log('[VSC Popup]', ...args);
}

// Validation utilities (copied inline from options.js)
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

    // Enforce minimum 3 speeds
    if (uniqueSpeeds.length < 3) {
        return { valid: false, error: 'At least 3 speeds required', value: uniqueSpeeds };
    }

    return {
        valid: errors.length === 0,
        value: uniqueSpeeds,
        errors
    };
}

// Validate a single key character
function validateSingleKey(key) {
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

// Validate shortcut (supports comma-separated keys like "d, =, +")
function validateShortcut(keys) {
    if (typeof keys !== 'string') return { valid: false, error: 'Must be a string' };

    const keyList = keys.split(',').map(k => k.trim().toLowerCase()).filter(k => k.length > 0);

    if (keyList.length === 0) return { valid: false, error: 'Cannot be empty' };

    const validKeys = [];
    const errors = [];

    for (const key of keyList) {
        const result = validateSingleKey(key);
        if (result.valid) {
            if (!validKeys.includes(result.value)) {
                validKeys.push(result.value);
            }
        } else {
            errors.push(`"${key}": ${result.error}`);
        }
    }

    if (validKeys.length === 0) {
        return { valid: false, error: errors.join(', ') || 'No valid keys' };
    }

    return { valid: true, value: validKeys.join(', '), keys: validKeys, errors };
}

function validateShortcuts(shortcuts) {
    if (typeof shortcuts !== 'object' || shortcuts === null) {
        return { valid: false, error: 'Must be an object' };
    }

    const validatedShortcuts = {};
    const allKeys = {}; // Track which action each key belongs to
    const errors = [];

    const requiredKeys = ['speedUp', 'speedDown', 'reset', 'skipSilence'];

    for (const key of requiredKeys) {
        if (!(key in shortcuts)) {
            errors.push(`Missing required key: ${key}`);
            continue;
        }

        const result = validateShortcut(shortcuts[key]);
        if (result.valid) {
            validatedShortcuts[key] = result.value;

            // Check for conflicts with other actions
            for (const singleKey of result.keys) {
                if (allKeys[singleKey] && allKeys[singleKey] !== key) {
                    errors.push(`Key "${singleKey}" is used by both ${allKeys[singleKey]} and ${key}`);
                } else {
                    allKeys[singleKey] = key;
                }
            }
        } else {
            errors.push(`${key}: ${result.error}`);
        }
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

// Resilient storage utilities (copied inline from options.js)
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

// Default settings (loaded from constants.js)
const defaultSpeeds = DEFAULT_SPEEDS;
const defaultSettings = DEFAULT_SETTINGS;

// Current settings state
let currentSettings = { ...defaultSettings };
let editingSpeedIndex = null;

// DOM elements
let elements = {};

// Load settings from storage
async function loadSettings() {
    try {
        debug('Loading settings...');

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
            if (Array.isArray(result.customSpeeds)) {
                currentSettings.customSpeeds = result.customSpeeds;
            }

            if (result.shortcuts) {
                currentSettings.shortcuts = {
                    ...defaultSettings.shortcuts,
                    ...result.shortcuts
                };
            }

            if (typeof result.pausingResetsSpeed === 'boolean') {
                currentSettings.pausingResetsSpeed = result.pausingResetsSpeed;
            }

            if (typeof result.skipSilenceEnabled === 'boolean') {
                currentSettings.skipSilenceEnabled = result.skipSilenceEnabled;
            }

            if (typeof result.skipSilenceGapThreshold === 'number') {
                currentSettings.skipSilenceGapThreshold = result.skipSilenceGapThreshold;
            }
        }

        debug('Final settings:', currentSettings);
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

        const storageResult = await safeStorageSet(settings);
        if (!storageResult.success) {
            throw new Error(storageResult.error?.message || 'Failed to save settings');
        }

        currentSettings = { ...settings };
        debug('Settings saved successfully');
        showStatus('Saved');
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        debug('Failed to save settings');
        showStatus('Error saving');
        return false;
    }
}

// Show status message
function showStatus(message) {
    if (!elements.status) return;
    debug('Showing status:', message);
    elements.status.textContent = message;
    elements.status.classList.add('show');
    setTimeout(() => {
        elements.status.classList.remove('show');
    }, 1500);
}

// Render speed pills
function renderSpeeds() {
    if (!elements.speedList) return;

    debug('Rendering speeds:', currentSettings.customSpeeds);

    // Clear existing pills
    elements.speedList.innerHTML = '';

    // Create a pill for each speed
    currentSettings.customSpeeds.forEach((speed, index) => {
        const pill = document.createElement('div');
        pill.className = 'speed-pill';
        pill.setAttribute('role', 'listitem');

        // Create speed value element
        const valueEl = document.createElement('span');
        valueEl.className = 'speed-value';
        valueEl.textContent = `${speed}×`;
        valueEl.setAttribute('data-index', index);

        // Click to edit
        valueEl.addEventListener('click', () => startEditingSpeed(index));

        // Create remove button (but not for 1x speed)
        if (speed !== 1) {
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-speed';
            removeBtn.innerHTML = '×';
            removeBtn.setAttribute('aria-label', `Remove ${speed}× speed`);
            removeBtn.setAttribute('data-index', index);

            // Click to remove
            removeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeSpeed(index);
            });

            pill.appendChild(valueEl);
            pill.appendChild(removeBtn);
        } else {
            pill.appendChild(valueEl);
            pill.classList.add('non-removable');
        }

        elements.speedList.appendChild(pill);
    });
}

// Start editing a speed
function startEditingSpeed(index) {
    const currentValue = currentSettings.customSpeeds[index];

    // Prevent editing 1x speed (normal playback speed)
    if (currentValue === 1) {
        showStatus('Cannot edit 1× (normal speed)');
        return;
    }

    if (editingSpeedIndex !== null) {
        cancelEditingSpeed();
    }

    editingSpeedIndex = index;
    const pill = elements.speedList.children[index];
    pill.classList.add('editing');

    const valueEl = pill.querySelector('.speed-value');

    // Replace span with input
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0.05';
    input.max = '16';
    input.step = '0.05';
    input.value = currentValue;

    // Replace the span
    valueEl.replaceWith(input);
    input.focus();
    input.select();

    // Handle editing
    const finishEdit = () => {
        const newValue = parseFloat(input.value);
        const validation = validateSpeed(newValue);

        if (!validation.valid) {
            showStatus(validation.error);
            cancelEditingSpeed();
            return;
        }

        // Update the speed
        const newSpeeds = [...currentSettings.customSpeeds];
        newSpeeds[index] = validation.value;

        // Validate and save
        const arrayValidation = validateSpeedArray(newSpeeds);
        if (!arrayValidation.valid) {
            showStatus(arrayValidation.error || 'Invalid speeds');
            cancelEditingSpeed();
            return;
        }

        const newSettings = { ...currentSettings, customSpeeds: arrayValidation.value };
        currentSettings = newSettings;
        editingSpeedIndex = null;
        renderSpeeds();
        debouncedSave(newSettings);
    };

    const cancelEdit = () => {
        cancelEditingSpeed();
    };

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finishEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    });
}

// Cancel editing a speed
function cancelEditingSpeed() {
    editingSpeedIndex = null;
    renderSpeeds();
}

// Remove a speed
function removeSpeed(index) {
    const speedToRemove = currentSettings.customSpeeds[index];

    // Prevent removing 1x speed (normal playback speed)
    if (speedToRemove === 1) {
        showStatus('Cannot remove 1× (normal speed)');
        return;
    }

    const newSpeeds = currentSettings.customSpeeds.filter((_, i) => i !== index);

    // Validate (must have at least 3)
    const validation = validateSpeedArray(newSpeeds);
    if (!validation.valid) {
        showStatus(validation.error || 'At least 3 speeds required');
        return;
    }

    const newSettings = { ...currentSettings, customSpeeds: validation.value };
    currentSettings = newSettings;
    renderSpeeds();
    debouncedSave(newSettings);
}

// Add a new speed
function addSpeed() {
    const input = elements.newSpeedInput;
    const value = parseFloat(input.value);

    // Validate the input
    const validation = validateSpeed(value);
    if (!validation.valid) {
        input.classList.add('error');
        showStatus(validation.error);
        setTimeout(() => input.classList.remove('error'), 2000);
        return;
    }

    // Add to speeds array
    const newSpeeds = [...currentSettings.customSpeeds, validation.value];

    // Validate and deduplicate
    const arrayValidation = validateSpeedArray(newSpeeds);
    if (!arrayValidation.valid) {
        input.classList.add('error');
        showStatus(arrayValidation.error || 'Invalid speeds');
        setTimeout(() => input.classList.remove('error'), 2000);
        return;
    }

    const newSettings = { ...currentSettings, customSpeeds: arrayValidation.value };
    currentSettings = newSettings;
    input.value = '';
    renderSpeeds();
    debouncedSave(newSettings);
}

// Update shortcuts in UI
function updateShortcutsUI() {
    if (elements.shortcutSpeedUp) {
        elements.shortcutSpeedUp.value = currentSettings.shortcuts.speedUp;
    }
    if (elements.shortcutSpeedDown) {
        elements.shortcutSpeedDown.value = currentSettings.shortcuts.speedDown;
    }
    if (elements.shortcutReset) {
        elements.shortcutReset.value = currentSettings.shortcuts.reset;
    }
    if (elements.shortcutSkipSilence) {
        elements.shortcutSkipSilence.value = currentSettings.shortcuts.skipSilence || 'g';
    }
}

// Update playback options in UI
function updatePlaybackOptionsUI() {
    if (elements.pausingResetsSpeed) {
        elements.pausingResetsSpeed.checked = currentSettings.pausingResetsSpeed || false;
    }
    if (elements.skipSilenceEnabled) {
        elements.skipSilenceEnabled.checked = currentSettings.skipSilenceEnabled || false;
    }
}

// Handle pausing resets speed checkbox change
function handlePausingResetsSpeedChange(e) {
    const newSettings = { ...currentSettings, pausingResetsSpeed: e.target.checked };
    currentSettings = newSettings;
    debouncedSave(newSettings);
}

// Handle skip silence enabled checkbox change
function handleSkipSilenceEnabledChange(e) {
    const newSettings = { ...currentSettings, skipSilenceEnabled: e.target.checked };
    currentSettings = newSettings;
    debouncedSave(newSettings);
}

// Handle shortcut keydown - adds pressed key to existing keys
function handleShortcutKeydown(e) {
    const inputId = e.target.id;
    const shortcutKey = inputId.replace('shortcut', '');
    const shortcutName = shortcutKey.charAt(0).toLowerCase() + shortcutKey.slice(1);
    const pressedKey = e.key.toLowerCase();

    // Ignore modifier keys and navigation
    if (['control', 'alt', 'shift', 'meta', 'tab', 'escape', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'home', 'end'].includes(pressedKey)) {
        return;
    }

    // Allow backspace and delete for editing
    if (['backspace', 'delete'].includes(pressedKey)) {
        return;
    }

    // Prevent default for other keys
    e.preventDefault();

    // Get current keys for this shortcut
    const currentKeys = currentSettings.shortcuts[shortcutName] || '';
    const keyList = currentKeys.split(',').map(k => k.trim()).filter(k => k.length > 0);

    // Add new key if not already present
    if (!keyList.includes(pressedKey)) {
        keyList.push(pressedKey);
    }

    const newValue = keyList.join(', ');

    // Validate the new shortcut
    const validation = validateShortcut(newValue);
    if (!validation.valid) {
        e.target.classList.add('error');
        showStatus(validation.error);
        setTimeout(() => e.target.classList.remove('error'), 2000);
        return;
    }

    // Check for conflicts
    const newShortcuts = { ...currentSettings.shortcuts, [shortcutName]: validation.value };
    const shortcutValidation = validateShortcuts(newShortcuts);
    if (!shortcutValidation.valid) {
        e.target.classList.add('error');
        showStatus(shortcutValidation.errors.join(', '));
        setTimeout(() => e.target.classList.remove('error'), 2000);
        return;
    }

    // Update settings
    const newSettings = { ...currentSettings, shortcuts: shortcutValidation.value };
    currentSettings = newSettings;
    updateShortcutsUI();
    debouncedSave(newSettings);
}

// Handle shortcut input (typing/pasting) - debounced to allow editing
const handleShortcutInputDebounced = debounce((inputId, value) => {
    const shortcutKey = inputId.replace('shortcut', '');
    const shortcutName = shortcutKey.charAt(0).toLowerCase() + shortcutKey.slice(1);

    if (value.length === 0) {
        // Don't allow empty - restore previous value
        updateShortcutsUI();
        return;
    }

    // Validate shortcut
    const validation = validateShortcut(value);
    if (!validation.valid) {
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.add('error');
            showStatus(validation.error);
            setTimeout(() => input.classList.remove('error'), 2000);
        }
        return;
    }

    // Check for conflicts
    const newShortcuts = { ...currentSettings.shortcuts, [shortcutName]: validation.value };
    const shortcutValidation = validateShortcuts(newShortcuts);
    if (!shortcutValidation.valid) {
        const input = document.getElementById(inputId);
        if (input) {
            input.classList.add('error');
            showStatus(shortcutValidation.errors.join(', '));
            setTimeout(() => input.classList.remove('error'), 2000);
        }
        return;
    }

    // Update settings
    const newSettings = { ...currentSettings, shortcuts: shortcutValidation.value };
    currentSettings = newSettings;
    updateShortcutsUI();
    debouncedSave(newSettings);
}, 500);

function handleShortcutInput(e) {
    const value = e.target.value.trim().toLowerCase();
    handleShortcutInputDebounced(e.target.id, value);
}

// Debounced save function
const debouncedSave = debounce(async (settings) => {
    await saveSettings(settings);
}, 250);

// Listen for storage changes from other sources
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'sync') {
        debug('Storage changed:', changes);

        // Reload settings if they changed elsewhere
        if (changes.customSpeeds || changes.shortcuts || changes.pausingResetsSpeed || changes.skipSilenceEnabled || changes.skipSilenceGapThreshold) {
            loadSettings().then((settings) => {
                currentSettings = settings;
                renderSpeeds();
                updateShortcutsUI();
                updatePlaybackOptionsUI();
            });
        }
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        debug('Popup loaded');

        // Get DOM elements
        elements = {
            status: document.getElementById('status'),
            speedList: document.getElementById('speedList'),
            newSpeedInput: document.getElementById('newSpeedInput'),
            addSpeedBtn: document.getElementById('addSpeedBtn'),
            shortcutSpeedUp: document.getElementById('shortcutSpeedUp'),
            shortcutSpeedDown: document.getElementById('shortcutSpeedDown'),
            shortcutReset: document.getElementById('shortcutReset'),
            shortcutSkipSilence: document.getElementById('shortcutSkipSilence'),
            pausingResetsSpeed: document.getElementById('pausingResetsSpeed'),
            skipSilenceEnabled: document.getElementById('skipSilenceEnabled')
        };

        // Load settings
        const settings = await loadSettings();
        currentSettings = settings;

        // Render UI
        renderSpeeds();
        updateShortcutsUI();
        updatePlaybackOptionsUI();

        // Add event listeners

        // Add speed button
        if (elements.addSpeedBtn) {
            elements.addSpeedBtn.addEventListener('click', addSpeed);
        }

        // Add speed on Enter key
        if (elements.newSpeedInput) {
            elements.newSpeedInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addSpeed();
                }
            });
        }

        // Shortcut inputs
        if (elements.shortcutSpeedUp) {
            elements.shortcutSpeedUp.addEventListener('keydown', handleShortcutKeydown);
            elements.shortcutSpeedUp.addEventListener('input', handleShortcutInput);
        }
        if (elements.shortcutSpeedDown) {
            elements.shortcutSpeedDown.addEventListener('keydown', handleShortcutKeydown);
            elements.shortcutSpeedDown.addEventListener('input', handleShortcutInput);
        }
        if (elements.shortcutReset) {
            elements.shortcutReset.addEventListener('keydown', handleShortcutKeydown);
            elements.shortcutReset.addEventListener('input', handleShortcutInput);
        }
        if (elements.shortcutSkipSilence) {
            elements.shortcutSkipSilence.addEventListener('keydown', handleShortcutKeydown);
            elements.shortcutSkipSilence.addEventListener('input', handleShortcutInput);
        }

        // Playback options
        if (elements.pausingResetsSpeed) {
            elements.pausingResetsSpeed.addEventListener('change', handlePausingResetsSpeedChange);
        }

        // Skip silence options
        if (elements.skipSilenceEnabled) {
            elements.skipSilenceEnabled.addEventListener('change', handleSkipSilenceEnabledChange);
        }

        debug('Popup initialized successfully');
    } catch (error) {
        console.error('Error initializing popup:', error);
    }
});
