/**
 * Settings migration and versioning system
 */

// Current settings schema version
export const CURRENT_SCHEMA_VERSION = 2;

// Settings schema definitions
export const SETTINGS_SCHEMAS = {
    1: {
        version: 1,
        description: 'Initial schema',
        fields: {
            customSpeeds: { type: 'array', required: true, default: [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10, 16] },
            shortcuts: { type: 'object', required: true, default: { speedUp: 'd', speedDown: 's', reset: 'r' } },
            enableNumberShortcuts: { type: 'boolean', required: true, default: true },
            showSpeedButtons: { type: 'boolean', required: true, default: true },
            showShortcutHints: { type: 'boolean', required: true, default: true }
        }
    },
    2: {
        version: 2,
        description: 'Added activeSpeeds tracking and improved validation',
        fields: {
            customSpeeds: { type: 'array', required: true, default: [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10, 16] },
            shortcuts: { type: 'object', required: true, default: { speedUp: 'd', speedDown: 's', reset: 'r' } },
            enableNumberShortcuts: { type: 'boolean', required: true, default: true },
            showSpeedButtons: { type: 'boolean', required: true, default: true },
            showShortcutHints: { type: 'boolean', required: true, default: true },
            activeSpeeds: { type: 'object', required: false, default: {} }
        }
    }
};

// Migration functions
export const MIGRATIONS = {
    // Migration from version 1 to version 2
    '1->2': (oldSettings) => {
        const newSettings = { ...oldSettings };
        
        // Add new activeSpeeds field
        if (!newSettings.activeSpeeds) {
            newSettings.activeSpeeds = {};
        }
        
        // Validate and clean existing speeds
        if (Array.isArray(newSettings.customSpeeds)) {
            newSettings.customSpeeds = newSettings.customSpeeds
                .filter(speed => typeof speed === 'number' && speed >= 0.05 && speed <= 16)
                .sort((a, b) => a - b);
        }
        
        // Ensure shortcuts are valid
        if (newSettings.shortcuts && typeof newSettings.shortcuts === 'object') {
            const validShortcuts = {};
            ['speedUp', 'speedDown', 'reset'].forEach(key => {
                const value = newSettings.shortcuts[key];
                if (typeof value === 'string' && value.length === 1) {
                    validShortcuts[key] = value.toLowerCase();
                }
            });
            newSettings.shortcuts = validShortcuts;
        }
        
        return newSettings;
    }
};

export class SettingsMigrator {
    constructor() {
        this.currentVersion = CURRENT_SCHEMA_VERSION;
        this.schemas = SETTINGS_SCHEMAS;
        this.migrations = MIGRATIONS;
    }

    // Get current settings version
    async getCurrentVersion() {
        try {
            const result = await chrome.storage.sync.get({ _schemaVersion: 1 });
            return result._schemaVersion || 1;
        } catch (error) {
            console.error('Error getting current version:', error);
            return 1; // Assume oldest version if error
        }
    }

    // Set current settings version
    async setVersion(version) {
        try {
            await chrome.storage.sync.set({ _schemaVersion: version });
            return true;
        } catch (error) {
            console.error('Error setting version:', error);
            return false;
        }
    }

    // Validate settings against schema
    validateSettings(settings, schemaVersion = this.currentVersion) {
        const schema = this.schemas[schemaVersion];
        if (!schema) {
            throw new Error(`Unknown schema version: ${schemaVersion}`);
        }

        const validated = {};
        const errors = [];

        for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
            const value = settings[fieldName];
            const { type, required, default: defaultValue } = fieldConfig;

            // Check if required field is missing
            if (required && (value === undefined || value === null)) {
                if (defaultValue !== undefined) {
                    validated[fieldName] = defaultValue;
                } else {
                    errors.push(`Required field '${fieldName}' is missing`);
                }
                continue;
            }

            // Skip validation if field is not provided and not required
            if (value === undefined || value === null) {
                if (defaultValue !== undefined) {
                    validated[fieldName] = defaultValue;
                }
                continue;
            }

            // Type validation
            if (!this.validateType(value, type)) {
                if (defaultValue !== undefined) {
                    validated[fieldName] = defaultValue;
                    errors.push(`Field '${fieldName}' has invalid type, using default`);
                } else {
                    errors.push(`Field '${fieldName}' has invalid type`);
                }
                continue;
            }

            // Additional field-specific validation
            const validationResult = this.validateField(fieldName, value, schemaVersion);
            if (validationResult.valid) {
                validated[fieldName] = validationResult.value;
            } else {
                if (defaultValue !== undefined) {
                    validated[fieldName] = defaultValue;
                    errors.push(`Field '${fieldName}' validation failed: ${validationResult.error}, using default`);
                } else {
                    errors.push(`Field '${fieldName}' validation failed: ${validationResult.error}`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            settings: validated,
            errors
        };
    }

    // Validate basic type
    validateType(value, expectedType) {
        switch (expectedType) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                return true; // Unknown types pass through
        }
    }

    // Validate specific field
    validateField(fieldName, value, schemaVersion) {
        switch (fieldName) {
            case 'customSpeeds':
                if (!Array.isArray(value)) return { valid: false, error: 'Must be an array' };
                
                const validSpeeds = value.filter(speed => 
                    typeof speed === 'number' && 
                    !isNaN(speed) && 
                    speed >= 0.05 && 
                    speed <= 16
                );
                
                if (validSpeeds.length === 0) {
                    return { valid: false, error: 'No valid speeds found' };
                }
                
                return { 
                    valid: true, 
                    value: [...new Set(validSpeeds)].sort((a, b) => a - b)
                };

            case 'shortcuts':
                if (typeof value !== 'object' || value === null) {
                    return { valid: false, error: 'Must be an object' };
                }
                
                const validShortcuts = {};
                const requiredKeys = ['speedUp', 'speedDown', 'reset'];
                
                for (const key of requiredKeys) {
                    const shortcut = value[key];
                    if (typeof shortcut === 'string' && shortcut.length === 1) {
                        validShortcuts[key] = shortcut.toLowerCase();
                    } else {
                        return { valid: false, error: `Invalid shortcut for ${key}` };
                    }
                }
                
                // Check for duplicates
                const values = Object.values(validShortcuts);
                if (values.length !== new Set(values).size) {
                    return { valid: false, error: 'All shortcuts must be unique' };
                }
                
                return { valid: true, value: validShortcuts };

            case 'activeSpeeds':
                if (typeof value !== 'object' || value === null) {
                    return { valid: false, error: 'Must be an object' };
                }
                return { valid: true, value };

            default:
                return { valid: true, value };
        }
    }

    // Migrate settings to current version
    async migrateSettings() {
        try {
            const currentVersion = await this.getCurrentVersion();
            
            if (currentVersion === this.currentVersion) {
                return { success: true, migrated: false, version: currentVersion };
            }

            console.log(`Migrating settings from version ${currentVersion} to ${this.currentVersion}`);

            // Get current settings
            const result = await chrome.storage.sync.get(null);
            let settings = result;

            // Apply migrations step by step
            for (let version = currentVersion; version < this.currentVersion; version++) {
                const migrationKey = `${version}->${version + 1}`;
                const migration = this.migrations[migrationKey];
                
                if (migration) {
                    console.log(`Applying migration ${migrationKey}`);
                    settings = migration(settings);
                } else {
                    console.warn(`No migration found for ${migrationKey}`);
                }
            }

            // Validate migrated settings
            const validation = this.validateSettings(settings, this.currentVersion);
            if (!validation.valid) {
                console.warn('Migrated settings validation failed:', validation.errors);
                settings = validation.settings; // Use validated/corrected settings
            }

            // Save migrated settings
            await chrome.storage.sync.set(settings);
            await this.setVersion(this.currentVersion);

            return { 
                success: true, 
                migrated: true, 
                fromVersion: currentVersion,
                toVersion: this.currentVersion,
                settings: validation.settings,
                validationErrors: validation.errors
            };

        } catch (error) {
            console.error('Settings migration failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Reset settings to defaults for current version
    async resetToDefaults() {
        try {
            const schema = this.schemas[this.currentVersion];
            const defaults = {};
            
            for (const [fieldName, fieldConfig] of Object.entries(schema.fields)) {
                defaults[fieldName] = fieldConfig.default;
            }

            await chrome.storage.sync.clear();
            await chrome.storage.sync.set(defaults);
            await this.setVersion(this.currentVersion);

            return { success: true, settings: defaults };
        } catch (error) {
            console.error('Reset to defaults failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Get migration history
    getMigrationHistory() {
        return {
            currentVersion: this.currentVersion,
            availableVersions: Object.keys(this.schemas).map(Number),
            migrations: Object.keys(this.migrations)
        };
    }
}

// Export singleton instance
export const settingsMigrator = new SettingsMigrator();

// Export convenience functions
export async function migrateSettings() {
    return settingsMigrator.migrateSettings();
}

export async function resetSettingsToDefaults() {
    return settingsMigrator.resetToDefaults();
}

export async function getCurrentSettingsVersion() {
    return settingsMigrator.getCurrentVersion();
}

export function validateCurrentSettings(settings) {
    return settingsMigrator.validateSettings(settings);
}
