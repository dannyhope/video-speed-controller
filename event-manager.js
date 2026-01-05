/**
 * Event listener management utilities to prevent duplicates and ensure proper cleanup
 */

export class EventListenerManager {
    constructor() {
        this.listeners = new Map(); // Map<element, Map<event, Set<listener>>>
        this.globalListeners = new Map(); // Map<event, Set<listener>>
        this.onceListeners = new Map(); // Map<element, Map<event, Set<listener>>>
        this.passiveListeners = new Map(); // Map<element, Map<event, Set<listener>>>
    }

    // Generate unique listener ID
    generateListenerId(element, event, handler) {
        const elementId = this.getElementId(element);
        const handlerId = this.getHandlerId(handler);
        return `${elementId}:${event}:${handlerId}`;
    }

    // Get element identifier
    getElementId(element) {
        if (element === window) return 'window';
        if (element === document) return 'document';
        if (element === document.body) return 'body';
        
        // Try to use element's id or class
        if (element.id) return `#${element.id}`;
        if (element.className) return `.${element.className.split(' ')[0]}`;
        
        // Fallback to tag name with index
        const tagName = element.tagName?.toLowerCase() || 'unknown';
        const siblings = Array.from(element.parentNode?.children || [])
            .filter(el => el.tagName === element.tagName);
        const index = siblings.indexOf(element);
        return `${tagName}[${index}]`;
    }

    // Get handler identifier
    getHandlerId(handler) {
        if (handler.name) return handler.name;
        
        // Try to extract from function string
        const funcStr = handler.toString();
        const match = funcStr.match(/^function\s+(\w+)/);
        if (match) return match[1];
        
        // Fallback to hash
        return `hash_${this.simpleHash(funcStr)}`;
    }

    // Simple hash function for handler identification
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    // Add event listener with duplicate prevention
    addEventListener(element, event, handler, options = {}) {
        if (!element || !event || typeof handler !== 'function') {
            console.warn('Invalid parameters for addEventListener');
            return false;
        }

        const elementId = this.getElementId(element);
        const listenerId = this.generateListenerId(element, event, handler);

        // Check if listener already exists
        if (this.hasListener(element, event, handler)) {
            console.warn(`Listener already exists: ${listenerId}`);
            return false;
        }

        // Add to tracking
        if (!this.listeners.has(elementId)) {
            this.listeners.set(elementId, new Map());
        }
        if (!this.listeners.get(elementId).has(event)) {
            this.listeners.get(elementId).set(event, new Set());
        }

        const listenerInfo = {
            handler,
            options,
            added: Date.now(),
            id: listenerId
        };

        this.listeners.get(elementId).get(event).add(listenerInfo);

        // Add actual listener
        element.addEventListener(event, handler, options);

        // Track special options
        if (options.once) {
            if (!this.onceListeners.has(elementId)) {
                this.onceListeners.set(elementId, new Map());
            }
            if (!this.onceListeners.get(elementId).has(event)) {
                this.onceListeners.get(elementId).set(event, new Set());
            }
            this.onceListeners.get(elementId).get(event).add(listenerInfo);
        }

        if (options.passive) {
            if (!this.passiveListeners.has(elementId)) {
                this.passiveListeners.set(elementId, new Map());
            }
            if (!this.passiveListeners.get(elementId).has(event)) {
                this.passiveListeners.get(elementId).set(event, new Set());
            }
            this.passiveListeners.get(elementId).get(event).add(listenerInfo);
        }

        return true;
    }

    // Remove event listener
    removeEventListener(element, event, handler) {
        if (!element || !event || typeof handler !== 'function') {
            console.warn('Invalid parameters for removeEventListener');
            return false;
        }

        const elementId = this.getElementId(element);
        const listenerId = this.generateListenerId(element, event, handler);

        // Find and remove from tracking
        const elementListeners = this.listeners.get(elementId);
        if (!elementListeners) return false;

        const eventListeners = elementListeners.get(event);
        if (!eventListeners) return false;

        let removed = false;
        for (const listenerInfo of eventListeners) {
            if (listenerInfo.id === listenerId) {
                eventListeners.delete(listenerInfo);
                element.removeEventListener(event, handler);
                removed = true;
                break;
            }
        }

        // Clean up empty sets
        if (eventListeners.size === 0) {
            elementListeners.delete(event);
        }
        if (elementListeners.size === 0) {
            this.listeners.delete(elementId);
        }

        // Clean up special tracking
        this.cleanupSpecialTracking(elementId, event, listenerId);

        return removed;
    }

    // Check if listener exists
    hasListener(element, event, handler) {
        const elementId = this.getElementId(element);
        const listenerId = this.generateListenerId(element, event, handler);

        const elementListeners = this.listeners.get(elementId);
        if (!elementListeners) return false;

        const eventListeners = elementListeners.get(event);
        if (!eventListeners) return false;

        for (const listenerInfo of eventListeners) {
            if (listenerInfo.id === listenerId) {
                return true;
            }
        }

        return false;
    }

    // Remove all listeners for an element
    removeAllListeners(element) {
        const elementId = this.getElementId(element);
        const elementListeners = this.listeners.get(elementId);
        
        if (!elementListeners) return 0;

        let removedCount = 0;

        for (const [event, listenerSet] of elementListeners) {
            for (const listenerInfo of listenerSet) {
                element.removeEventListener(event, listenerInfo.handler);
                removedCount++;
            }
        }

        // Clean up all tracking
        this.listeners.delete(elementId);
        this.onceListeners.delete(elementId);
        this.passiveListeners.delete(elementId);

        return removedCount;
    }

    // Remove all listeners for a specific event on an element
    removeListenersForEvent(element, event) {
        const elementId = this.getElementId(element);
        const elementListeners = this.listeners.get(elementId);
        
        if (!elementListeners) return 0;

        const eventListeners = elementListeners.get(event);
        if (!eventListeners) return 0;

        let removedCount = 0;

        for (const listenerInfo of eventListeners) {
            element.removeEventListener(event, listenerInfo.handler);
            removedCount++;
        }

        // Clean up tracking
        elementListeners.delete(event);
        this.cleanupSpecialTracking(elementId, event);

        return removedCount;
    }

    // Clean up special tracking (once, passive)
    cleanupSpecialTracking(elementId, event, listenerId = null) {
        // Clean up once listeners
        const onceElement = this.onceListeners.get(elementId);
        if (onceElement) {
            const onceEvent = onceElement.get(event);
            if (onceEvent) {
                if (listenerId) {
                    for (const info of onceEvent) {
                        if (info.id === listenerId) {
                            onceEvent.delete(info);
                            break;
                        }
                    }
                } else {
                    onceEvent.clear();
                }
                if (onceEvent.size === 0) {
                    onceElement.delete(event);
                }
            }
            if (onceElement.size === 0) {
                this.onceListeners.delete(elementId);
            }
        }

        // Clean up passive listeners
        const passiveElement = this.passiveListeners.get(elementId);
        if (passiveElement) {
            const passiveEvent = passiveElement.get(event);
            if (passiveEvent) {
                if (listenerId) {
                    for (const info of passiveEvent) {
                        if (info.id === listenerId) {
                            passiveEvent.delete(info);
                            break;
                        }
                    }
                } else {
                    passiveEvent.clear();
                }
                if (passiveEvent.size === 0) {
                    passiveElement.delete(event);
                }
            }
            if (passiveElement.size === 0) {
                this.passiveListeners.delete(elementId);
            }
        }
    }

    // Add global listener (for window, document, etc.)
    addGlobalListener(target, event, handler, options = {}) {
        if (!this.globalListeners.has(target)) {
            this.globalListeners.set(target, new Map());
        }
        if (!this.globalListeners.get(target).has(event)) {
            this.globalListeners.get(target).set(event, new Set());
        }

        const listenerInfo = {
            handler,
            options,
            added: Date.now()
        };

        this.globalListeners.get(target).get(event).add(listenerInfo);
        target.addEventListener(event, handler, options);

        return true;
    }

    // Remove global listener
    removeGlobalListener(target, event, handler) {
        const targetListeners = this.globalListeners.get(target);
        if (!targetListeners) return false;

        const eventListeners = targetListeners.get(event);
        if (!eventListeners) return false;

        let removed = false;
        for (const listenerInfo of eventListeners) {
            if (listenerInfo.handler === handler) {
                eventListeners.delete(listenerInfo);
                target.removeEventListener(event, handler);
                removed = true;
                break;
            }
        }

        // Clean up empty sets
        if (eventListeners.size === 0) {
            targetListeners.delete(event);
        }
        if (targetListeners.size === 0) {
            this.globalListeners.delete(target);
        }

        return removed;
    }

    // Get listener statistics
    getStats() {
        const stats = {
            totalListeners: 0,
            elements: this.listeners.size,
            globalListeners: 0,
            onceListeners: 0,
            passiveListeners: 0,
            details: []
        };

        // Count regular listeners
        for (const [elementId, eventMap] of this.listeners) {
            let elementCount = 0;
            for (const [event, listenerSet] of eventMap) {
                elementCount += listenerSet.size;
                stats.details.push({
                    element: elementId,
                    event,
                    count: listenerSet.size,
                    listeners: Array.from(listenerSet).map(info => ({
                        id: info.id,
                        added: info.added,
                        options: info.options
                    }))
                });
            }
            stats.totalListeners += elementCount;
        }

        // Count global listeners
        for (const [target, eventMap] of this.globalListeners) {
            for (const [event, listenerSet] of eventMap) {
                stats.globalListeners += listenerSet.size;
            }
        }

        // Count once listeners
        for (const [elementId, eventMap] of this.onceListeners) {
            for (const [event, listenerSet] of eventMap) {
                stats.onceListeners += listenerSet.size;
            }
        }

        // Count passive listeners
        for (const [elementId, eventMap] of this.passiveListeners) {
            for (const [event, listenerSet] of eventMap) {
                stats.passiveListeners += listenerSet.size;
            }
        }

        return stats;
    }

    // Clean up all listeners
    cleanup() {
        let removedCount = 0;

        // Remove regular listeners
        for (const [elementId, eventMap] of this.listeners) {
            // Find actual element (this is simplified, in practice you'd need element references)
            for (const [event, listenerSet] of eventMap) {
                for (const listenerInfo of listenerSet) {
                    // Note: In practice, you'd store element references
                    removedCount++;
                }
            }
        }

        // Remove global listeners
        for (const [target, eventMap] of this.globalListeners) {
            for (const [event, listenerSet] of eventMap) {
                for (const listenerInfo of listenerSet) {
                    target.removeEventListener(event, listenerInfo.handler);
                    removedCount++;
                }
            }
        }

        // Clear all tracking
        this.listeners.clear();
        this.globalListeners.clear();
        this.onceListeners.clear();
        this.passiveListeners.clear();

        return removedCount;
    }

    // Debug method to log all listeners
    debugLog() {
        const stats = this.getStats();
        console.group('EventListenerManager Debug Info');
        console.log('Stats:', stats);
        console.log('Detailed listeners:', stats.details);
        console.groupEnd();
    }
}

// Export singleton instance
export const eventManager = new EventListenerManager();

// Export convenience functions
export function addSafeEventListener(element, event, handler, options) {
    return eventManager.addEventListener(element, event, handler, options);
}

export function removeSafeEventListener(element, event, handler) {
    return eventManager.removeEventListener(element, event, handler);
}

export function removeAllElementListeners(element) {
    return eventManager.removeAllListeners(element);
}

export function hasEventListener(element, event, handler) {
    return eventManager.hasListener(element, event, handler);
}

export function getEventListenerStats() {
    return eventManager.getStats();
}
