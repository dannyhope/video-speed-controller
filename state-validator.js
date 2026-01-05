/**
 * State consistency checks and validation utilities
 */

export class StateValidator {
    constructor() {
        this.validationRules = new Map();
        this.stateHistory = [];
        this.maxHistorySize = 50;
        this.inconsistencies = [];
        this.setupDefaultRules();
    }

    // Setup default validation rules
    setupDefaultRules() {
        // Speed validation rules
        this.addRule('speeds', (speeds) => {
            if (!Array.isArray(speeds)) return { valid: false, error: 'Speeds must be an array' };
            if (speeds.length === 0) return { valid: false, error: 'Speeds array cannot be empty' };
            
            for (let i = 0; i < speeds.length; i++) {
                const speed = speeds[i];
                if (typeof speed !== 'number' || isNaN(speed)) {
                    return { valid: false, error: `Speed at index ${i} is not a valid number` };
                }
                if (speed < 0.05 || speed > 16) {
                    return { valid: false, error: `Speed at index ${i} (${speed}) is out of range [0.05, 16]` };
                }
            }
            
            // Check for duplicates
            const uniqueSpeeds = [...new Set(speeds)];
            if (uniqueSpeeds.length !== speeds.length) {
                return { valid: false, error: 'Speeds array contains duplicate values' };
            }
            
            // Check if sorted
            const sortedSpeeds = [...speeds].sort((a, b) => a - b);
            for (let i = 0; i < speeds.length; i++) {
                if (speeds[i] !== sortedSpeeds[i]) {
                    return { valid: false, error: 'Speeds array must be sorted in ascending order' };
                }
            }
            
            return { valid: true };
        });

        // Current speed index validation
        this.addRule('currentSpeedIndex', (index, speeds) => {
            if (typeof index !== 'number' || isNaN(index)) {
                return { valid: false, error: 'Current speed index must be a number' };
            }
            if (index < 0 || index >= speeds.length) {
                return { valid: false, error: `Current speed index ${index} is out of bounds [0, ${speeds.length - 1}]` };
            }
            return { valid: true };
        });

        // Settings validation rules
        this.addRule('settings.shortcuts', (shortcuts) => {
            if (!shortcuts || typeof shortcuts !== 'object') {
                return { valid: false, error: 'Shortcuts must be an object' };
            }
            
            const requiredKeys = ['speedUp', 'speedDown', 'reset'];
            for (const key of requiredKeys) {
                if (!(key in shortcuts)) {
                    return { valid: false, error: `Missing required shortcut: ${key}` };
                }
                const value = shortcuts[key];
                if (typeof value !== 'string' || value.length !== 1) {
                    return { valid: false, error: `Shortcut ${key} must be a single character` };
                }
            }
            
            // Check for duplicates
            const values = Object.values(shortcuts);
            if (values.length !== new Set(values).size) {
                return { valid: false, error: 'All shortcuts must be unique' };
            }
            
            return { valid: true };
        });

        this.addRule('settings.enableNumberShortcuts', (value) => {
            if (typeof value !== 'boolean') {
                return { valid: false, error: 'enableNumberShortcuts must be a boolean' };
            }
            return { valid: true };
        });

        this.addRule('settings.showSpeedButtons', (value) => {
            if (typeof value !== 'boolean') {
                return { valid: false, error: 'showSpeedButtons must be a boolean' };
            }
            return { valid: true };
        });

        this.addRule('settings.showShortcutHints', (value) => {
            if (typeof value !== 'boolean') {
                return { valid: false, error: 'showShortcutHints must be a boolean' };
            }
            return { valid: true };
        });

        // Video state validation
        this.addRule('video.playbackRate', (rate, speeds) => {
            if (typeof rate !== 'number' || isNaN(rate)) {
                return { valid: false, error: 'Video playback rate must be a number' };
            }
            if (rate < 0.05 || rate > 16) {
                return { valid: false, error: `Video playback rate ${rate} is out of range [0.05, 16]` };
            }
            if (!speeds.includes(rate)) {
                return { valid: false, error: `Video playback rate ${rate} is not in the speeds array` };
            }
            return { valid: true };
        });

        this.addRule('video.readyState', (state) => {
            const validStates = [0, 1, 2, 3, 4]; // HAVE_NOTHING through HAVE_ENOUGH_DATA
            if (!validStates.includes(state)) {
                return { valid: false, error: `Invalid video ready state: ${state}` };
            }
            return { valid: true };
        });
    }

    // Add a validation rule
    addRule(name, validator) {
        this.validationRules.set(name, validator);
    }

    // Remove a validation rule
    removeRule(name) {
        return this.validationRules.delete(name);
    }

    // Validate a specific rule
    validateRule(ruleName, value, context = {}) {
        const rule = this.validationRules.get(ruleName);
        if (!rule) {
            return { valid: false, error: `Validation rule '${ruleName}' not found` };
        }
        
        try {
            return rule(value, context);
        } catch (error) {
            return { valid: false, error: `Validation error: ${error.message}` };
        }
    }

    // Validate complete state
    validateState(state) {
        const results = {
            valid: true,
            errors: [],
            warnings: [],
            ruleResults: {}
        };

        // Validate speeds
        const speedsResult = this.validateRule('speeds', state.speeds);
        results.ruleResults.speeds = speedsResult;
        if (!speedsResult.valid) {
            results.valid = false;
            results.errors.push({ field: 'speeds', error: speedsResult.error });
        }

        // Validate current speed index (if speeds are valid)
        if (speedsResult.valid && 'currentSpeedIndex' in state) {
            const indexResult = this.validateRule('currentSpeedIndex', state.currentSpeedIndex, state.speeds);
            results.ruleResults.currentSpeedIndex = indexResult;
            if (!indexResult.valid) {
                results.valid = false;
                results.errors.push({ field: 'currentSpeedIndex', error: indexResult.error });
            }
        }

        // Validate settings
        if (state.settings) {
            for (const [key, value] of Object.entries(state.settings)) {
                const ruleName = `settings.${key}`;
                const settingResult = this.validateRule(ruleName, value);
                results.ruleResults[ruleName] = settingResult;
                if (!settingResult.valid) {
                    results.valid = false;
                    results.errors.push({ field: `settings.${key}`, error: settingResult.error });
                }
            }
        }

        // Validate video state
        if (state.video) {
            for (const [key, value] of Object.entries(state.video)) {
                const ruleName = `video.${key}`;
                const videoResult = this.validateRule(ruleName, value, state.speeds || []);
                results.ruleResults[ruleName] = videoResult;
                if (!videoResult.valid) {
                    results.valid = false;
                    results.errors.push({ field: `video.${key}`, error: videoResult.error });
                }
            }
        }

        // Check for logical inconsistencies
        this.checkLogicalInconsistencies(state, results);

        return results;
    }

    // Check for logical inconsistencies
    checkLogicalInconsistencies(state, results) {
        // Check if current speed index matches the actual current speed
        if (state.speeds && state.currentSpeedIndex !== undefined && state.video && state.video.playbackRate !== undefined) {
            const expectedSpeed = state.speeds[state.currentSpeedIndex];
            const actualSpeed = state.video.playbackRate;
            
            if (Math.abs(expectedSpeed - actualSpeed) > 0.001) { // Allow for floating point precision
                results.valid = false;
                results.errors.push({
                    field: 'state_consistency',
                    error: `Current speed index (${state.currentSpeedIndex}) suggests speed ${expectedSpeed}, but video playback rate is ${actualSpeed}`
                });
            }
        }

        // Check if UI visibility matches settings
        if (state.settings && state.ui) {
            if (state.settings.showSpeedButtons !== state.ui.buttonsVisible) {
                results.warnings.push({
                    field: 'ui_consistency',
                    error: `UI button visibility (${state.ui.buttonsVisible}) doesn't match setting (${state.settings.showSpeedButtons})`
                });
            }
            
            if (state.settings.showShortcutHints !== state.ui.hintsVisible) {
                results.warnings.push({
                    field: 'ui_consistency',
                    error: `UI hints visibility (${state.ui.hintsVisible}) doesn't match setting (${state.settings.showShortcutHints})`
                });
            }
        }

        // Check if overlay state is consistent
        if (state.overlay && state.video) {
            if (state.overlay.visible && !state.video.paused) {
                // Overlay should not be visible for too long during playback
                const overlayAge = Date.now() - state.overlay.shownAt;
                if (overlayAge > 3000) { // 3 seconds
                    results.warnings.push({
                        field: 'overlay_consistency',
                        error: `Overlay has been visible for ${overlayAge}ms during playback`
                    });
                }
            }
        }
    }

    // Record state change
    recordState(state, action = 'unknown') {
        const stateRecord = {
            timestamp: Date.now(),
            action,
            state: this.cloneState(state),
            hash: this.hashState(state)
        };

        this.stateHistory.push(stateRecord);

        // Limit history size
        if (this.stateHistory.length > this.maxHistorySize) {
            this.stateHistory.shift();
        }

        // Check for inconsistencies with previous state
        if (this.stateHistory.length > 1) {
            const previousState = this.stateHistory[this.stateHistory.length - 2];
            this.checkStateTransition(previousState, stateRecord);
        }
    }

    // Check state transition for issues
    checkStateTransition(fromRecord, toRecord) {
        const fromState = fromRecord.state;
        const toState = toRecord.state;

        // Check for invalid speed changes
        if (fromState.speeds && toState.speeds) {
            if (fromState.currentSpeedIndex !== undefined && toState.currentSpeedIndex !== undefined) {
                const speedChange = Math.abs(toState.currentSpeedIndex - fromState.currentSpeedIndex);
                if (speedChange > 1 && toRecord.action !== 'jump') {
                    this.inconsistencies.push({
                        timestamp: Date.now(),
                        type: 'invalid_speed_change',
                        from: fromState.currentSpeedIndex,
                        to: toState.currentSpeedIndex,
                        action: toRecord.action
                    });
                }
            }
        }

        // Check for setting changes without proper action
        if (fromState.settings && toState.settings) {
            for (const [key, fromValue] of Object.entries(fromState.settings)) {
                const toValue = toState.settings[key];
                if (fromValue !== toValue && !toRecord.action.includes('setting')) {
                    this.inconsistencies.push({
                        timestamp: Date.now(),
                        type: 'untracked_setting_change',
                        setting: key,
                        from: fromValue,
                        to: toValue,
                        action: toRecord.action
                    });
                }
            }
        }
    }

    // Clone state for history (avoid reference issues)
    cloneState(state) {
        try {
            return JSON.parse(JSON.stringify(state));
        } catch (error) {
            console.error('Error cloning state:', error);
            return {};
        }
    }

    // Hash state for comparison
    hashState(state) {
        try {
            const str = JSON.stringify(state);
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const char = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return hash.toString(36);
        } catch (error) {
            return 'unknown';
        }
    }

    // Get state consistency report
    getConsistencyReport() {
        return {
            historySize: this.stateHistory.length,
            inconsistencies: this.inconsistencies,
            recentStates: this.stateHistory.slice(-5),
            validationRules: Array.from(this.validationRules.keys()),
            lastValidation: this.lastValidation || null
        };
    }

    // Auto-repair state if possible
    repairState(state) {
        const repaired = { ...state };
        let repairs = [];

        // Repair speeds array
        if (repaired.speeds) {
            const speedsResult = this.validateRule('speeds', repaired.speeds);
            if (!speedsResult.valid) {
                // Remove invalid speeds and sort
                repaired.speeds = repaired.speeds
                    .filter(speed => typeof speed === 'number' && !isNaN(speed) && speed >= 0.05 && speed <= 16)
                    .sort((a, b) => a - b);
                
                // Remove duplicates
                repaired.speeds = [...new Set(repaired.speeds)];
                
                // Ensure we have at least the default speeds
                if (repaired.speeds.length === 0) {
                    repaired.speeds = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10, 16];
                }
                
                repairs.push('Repaired speeds array');
            }
        }

        // Repair current speed index
        if (repaired.currentSpeedIndex !== undefined && repaired.speeds) {
            if (repaired.currentSpeedIndex < 0 || repaired.currentSpeedIndex >= repaired.speeds.length) {
                repaired.currentSpeedIndex = repaired.speeds.indexOf(1);
                if (repaired.currentSpeedIndex === -1) {
                    repaired.currentSpeedIndex = Math.floor(repaired.speeds.length / 2);
                }
                repairs.push('Repaired current speed index');
            }
        }

        // Repair settings
        if (repaired.settings) {
            const defaultSettings = {
                shortcuts: { speedUp: 'd', speedDown: 's', reset: 'r' },
                enableNumberShortcuts: true,
                showSpeedButtons: true,
                showShortcutHints: true
            };

            for (const [key, defaultValue] of Object.entries(defaultSettings)) {
                if (!(key in repaired.settings)) {
                    repaired.settings[key] = defaultValue;
                    repairs.push(`Added missing setting: ${key}`);
                } else {
                    const ruleName = `settings.${key}`;
                    const result = this.validateRule(ruleName, repaired.settings[key]);
                    if (!result.valid) {
                        repaired.settings[key] = defaultValue;
                        repairs.push(`Repaired setting: ${key}`);
                    }
                }
            }
        }

        return {
            repaired,
            repairs,
            valid: this.validateState(repaired).valid
        };
    }

    // Clear history
    clearHistory() {
        this.stateHistory = [];
        this.inconsistencies = [];
    }

    // Get validation statistics
    getValidationStats() {
        return {
            rulesCount: this.validationRules.size,
            historySize: this.stateHistory.length,
            inconsistenciesCount: this.inconsistencies.length,
            ruleNames: Array.from(this.validationRules.keys())
        };
    }
}

// Export singleton instance
export const stateValidator = new StateValidator();

// Export convenience functions
export function validateState(state) {
    return stateValidator.validateState(state);
}

export function recordState(state, action) {
    return stateValidator.recordState(state, action);
}

export function repairState(state) {
    return stateValidator.repairState(state);
}

export function getConsistencyReport() {
    return stateValidator.getConsistencyReport();
}
