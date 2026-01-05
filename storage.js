/**
 * Storage operation utilities with resilience, quota checking, and retry logic
 */

// Storage quota management
export class StorageManager {
    constructor() {
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second
        this.quotaCheckInterval = 30000; // 30 seconds
        this.lastQuotaCheck = 0;
        this.quotaInfo = null;
    }

    // Check storage quota and usage
    async checkQuota() {
        try {
            const now = Date.now();
            
            // Cache quota info for performance
            if (this.quotaInfo && (now - this.lastQuotaCheck) < this.quotaCheckInterval) {
                return this.quotaInfo;
            }

            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                this.quotaInfo = {
                    quota: estimate.quota || 0,
                    usage: estimate.usage || 0,
                    available: (estimate.quota || 0) - (estimate.usage || 0),
                    usagePercentage: estimate.quota ? ((estimate.usage || 0) / estimate.quota) * 100 : 0
                };
                this.lastQuotaCheck = now;
                return this.quotaInfo;
            } else {
                // Fallback for browsers that don't support storage estimation
                this.quotaInfo = {
                    quota: null,
                    usage: null,
                    available: null,
                    usagePercentage: null,
                    fallback: true
                };
                return this.quotaInfo;
            }
        } catch (error) {
            console.error('Error checking storage quota:', error);
            return {
                quota: null,
                usage: null,
                available: null,
                usagePercentage: null,
                error: error.message
            };
        }
    }

    // Check if there's enough space for the data
    async hasSpaceForData(data) {
        const quota = await this.checkQuota();
        
        if (quota.fallback || quota.quota === null) {
            // Can't check quota, assume there's space
            return true;
        }

        const dataSize = JSON.stringify(data).length * 2; // Rough estimate (2 bytes per char)
        return quota.available > dataSize;
    }

    // Retry wrapper for storage operations
    async withRetry(operation, operationName = 'storage operation') {
        let lastError;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await operation();
                return { success: true, result, attempts: attempt };
            } catch (error) {
                lastError = error;
                console.warn(`${operationName} attempt ${attempt} failed:`, error.message);
                
                // Don't retry on certain errors
                if (this.isNonRetryableError(error)) {
                    break;
                }
                
                // Wait before retry (with exponential backoff)
                if (attempt < this.maxRetries) {
                    await this.delay(this.retryDelay * Math.pow(2, attempt - 1));
                }
            }
        }
        
        return { 
            success: false, 
            error: lastError, 
            attempts: this.maxRetries,
            message: `${operationName} failed after ${this.maxRetries} attempts`
        };
    }

    // Check if error is non-retryable
    isNonRetryableError(error) {
        const nonRetryableMessages = [
            'quota',
            'permission',
            'security',
            'invalid'
        ];
        
        const message = error.message.toLowerCase();
        return nonRetryableMessages.some(msg => message.includes(msg));
    }

    // Delay utility
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Safe storage get with validation
    async safeGet(keys, defaults = {}) {
        return this.withRetry(async () => {
            const result = await chrome.storage.sync.get(keys || defaults);
            
            // Validate the result structure
            if (typeof result !== 'object' || result === null) {
                throw new Error('Invalid storage result format');
            }
            
            return result;
        }, 'storage.get');
    }

    // Safe storage set with quota checking
    async safeSet(items) {
        // Check quota first
        const hasSpace = await this.hasSpaceForData(items);
        if (!hasSpace) {
            const quota = await this.checkQuota();
            throw new Error(`Insufficient storage space. Usage: ${quota.usagePercentage?.toFixed(1)}%`);
        }

        return this.withRetry(async () => {
            await chrome.storage.sync.set(items);
            return items;
        }, 'storage.set');
    }

    // Safe storage remove
    async safeRemove(keys) {
        return this.withRetry(async () => {
            await chrome.storage.sync.remove(keys);
            return keys;
        }, 'storage.remove');
    }

    // Safe storage clear (use with caution)
    async safeClear() {
        return this.withRetry(async () => {
            await chrome.storage.sync.clear();
            return true;
        }, 'storage.clear');
    }

    // Get storage usage statistics
    async getStorageStats() {
        try {
            const quota = await this.checkQuota();
            const allData = await this.safeGet(null);
            
            return {
                quota,
                itemCount: Object.keys(allData.result || {}).length,
                dataSize: JSON.stringify(allData.result || {}).length * 2,
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            console.error('Error getting storage stats:', error);
            return {
                error: error.message,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    // Compact storage by removing old or unnecessary data
    async compactStorage() {
        try {
            const allData = await this.safeGet(null);
            const data = allData.result || {};
            
            // Remove potential old or invalid data
            const compacted = {};
            
            for (const [key, value] of Object.entries(data)) {
                // Keep only valid settings keys
                if (this.isValidSettingKey(key) && this.isValidSettingValue(value)) {
                    compacted[key] = value;
                }
            }
            
            // If we removed anything, update storage
            const removedCount = Object.keys(data).length - Object.keys(compacted).length;
            if (removedCount > 0) {
                await this.safeSet(compacted);
                console.log(`Compacted storage, removed ${removedCount} invalid items`);
            }
            
            return { compacted: true, removedCount };
        } catch (error) {
            console.error('Error compacting storage:', error);
            return { compacted: false, error: error.message };
        }
    }

    // Validate setting key
    isValidSettingKey(key) {
        const validKeys = [
            'customSpeeds',
            'shortcuts',
            'enableNumberShortcuts',
            'showSpeedButtons',
            'showShortcutHints',
            'activeSpeeds'
        ];
        return validKeys.includes(key);
    }

    // Validate setting value
    isValidSettingValue(value) {
        // Basic validation - not null/undefined and serializable
        return value !== null && value !== undefined && 
               typeof value !== 'function' && 
               JSON.stringify(value) !== undefined;
    }
}

// Export singleton instance
export const storageManager = new StorageManager();

// Export convenience functions
export async function safeStorageGet(keys, defaults) {
    return storageManager.safeGet(keys, defaults);
}

export async function safeStorageSet(items) {
    return storageManager.safeSet(items);
}

export async function safeStorageRemove(keys) {
    return storageManager.safeRemove(keys);
}

export async function getStorageQuota() {
    return storageManager.checkQuota();
}

export async function getStorageStats() {
    return storageManager.getStorageStats();
}
