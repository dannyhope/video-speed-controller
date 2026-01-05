/**
 * Input validation and sanitization utilities
 */

// Speed validation
export function validateSpeed(speed) {
    const parsed = parseFloat(speed);
    if (isNaN(parsed)) return { valid: false, error: 'Invalid number' };
    if (parsed < 0.05) return { valid: false, error: 'Speed must be at least 0.05x' };
    if (parsed > 16) return { valid: false, error: 'Speed must be at most 16x' };
    return { valid: true, value: parsed };
}

// Speed array validation
export function validateSpeedArray(speeds) {
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

// Keyboard shortcut validation
export function validateShortcut(key) {
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

// Shortcut object validation
export function validateShortcuts(shortcuts) {
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

// Boolean validation
export function validateBoolean(value) {
    if (typeof value === 'boolean') return { valid: true, value };
    if (value === 'true' || value === '1') return { valid: true, value: true };
    if (value === 'false' || value === '0') return { valid: true, value: false };
    return { valid: false, error: 'Must be true or false' };
}

// Complete settings validation
export function validateSettings(settings) {
    if (typeof settings !== 'object' || settings === null) {
        return { valid: false, error: 'Settings must be an object' };
    }
    
    const validatedSettings = {};
    const errors = [];
    
    // Validate customSpeeds
    if ('customSpeeds' in settings) {
        const result = validateSpeedArray(settings.customSpeeds);
        if (result.valid) {
            validatedSettings.customSpeeds = result.value;
        } else {
            errors.push(...result.errors.map(e => `Speeds: ${e}`));
        }
    }
    
    // Validate shortcuts
    if ('shortcuts' in settings) {
        const result = validateShortcuts(settings.shortcuts);
        if (result.valid) {
            validatedSettings.shortcuts = result.value;
        } else {
            errors.push(...result.errors.map(e => `Shortcuts: ${e}`));
        }
    }
    
    // Validate boolean settings
    const booleanKeys = ['enableNumberShortcuts', 'showSpeedButtons', 'showShortcutHints'];
    for (const key of booleanKeys) {
        if (key in settings) {
            const result = validateBoolean(settings[key]);
            if (result.valid) {
                validatedSettings[key] = result.value;
            } else {
                errors.push(`${key}: ${result.error}`);
            }
        }
    }
    
    return {
        valid: errors.length === 0,
        value: validatedSettings,
        errors
    };
}

// Sanitize HTML content (basic XSS prevention)
export function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

// Validate and sanitize text input
export function validateTextInput(input, options = {}) {
    const {
        maxLength = 1000,
        allowEmpty = false,
        trim = true
    } = options;
    
    if (typeof input !== 'string') {
        return { valid: false, error: 'Must be text' };
    }
    
    let processed = trim ? input.trim() : input;
    
    if (!allowEmpty && processed.length === 0) {
        return { valid: false, error: 'Cannot be empty' };
    }
    
    if (processed.length > maxLength) {
        return { valid: false, error: `Too long (max ${maxLength} characters)` };
    }
    
    return {
        valid: true,
        value: sanitizeHTML(processed)
    };
}
