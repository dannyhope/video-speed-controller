/**
 * Browser compatibility fallbacks and feature detection utilities
 */

export class BrowserCompatibility {
    constructor() {
        this.features = this.detectFeatures();
        this.polyfills = new Map();
        this.fallbacks = new Map();
        this.setupPolyfills();
    }

    // Detect browser features
    detectFeatures() {
        return {
            // Storage APIs
            chromeStorage: typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync,
            chromeStorageLocal: typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local,
            chromeRuntime: typeof chrome !== 'undefined' && chrome.runtime,
            
            // DOM APIs
            mutationObserver: typeof MutationObserver !== 'undefined',
            intersectionObserver: typeof IntersectionObserver !== 'undefined',
            resizeObserver: typeof ResizeObserver !== 'undefined',
            
            // Video APIs
            videoPlaybackRate: typeof HTMLMediaElement !== 'undefined' && 
                               'playbackRate' in HTMLMediaElement.prototype,
            videoReadyState: typeof HTMLMediaElement !== 'undefined' && 
                             'readyState' in HTMLMediaElement.prototype,
            
            // Event APIs
            passiveEvents: this.supportsPassiveEvents(),
            onceEvents: this.supportsOnceEvents(),
            
            // Promise APIs
            promise: typeof Promise !== 'undefined',
            asyncAwait: this.supportsAsyncAwait(),
            
            // Console APIs
            console: typeof console !== 'undefined' && console.log,
            
            // Array methods
            arrayIncludes: Array.prototype.includes,
            arrayFrom: Array.from,
            arrayFind: Array.prototype.find,
            arrayFindIndex: Array.prototype.findIndex,
            
            // Object methods
            objectAssign: Object.assign,
            objectKeys: Object.keys,
            objectValues: Object.values,
            objectEntries: Object.entries,
            
            // String methods
            stringIncludes: String.prototype.includes,
            stringStartsWith: String.prototype.startsWith,
            stringEndsWith: String.prototype.endsWith,
            stringTrim: String.prototype.trim,
            
            // JSON
            json: typeof JSON !== 'undefined' && JSON.parse && JSON.stringify,
            
            // Performance APIs
            performance: typeof performance !== 'undefined' && performance.now,
            requestAnimationFrame: typeof requestAnimationFrame !== 'undefined',
            
            // CSS support
            cssTransitions: this.supportsCSSTransitions(),
            cssTransforms: this.supportsCSSTransforms(),
            cssAnimations: this.supportsCSSAnimations(),
            
            // Browser detection
            isChrome: this.isChrome(),
            isFirefox: this.isFirefox(),
            isSafari: this.isSafari(),
            isEdge: this.isEdge(),
            version: this.getBrowserVersion()
        };
    }

    // Test for passive event support
    supportsPassiveEvents() {
        let supported = false;
        try {
            const opts = Object.defineProperty({}, 'passive', {
                get: () => {
                    supported = true;
                    return true;
                }
            });
            window.addEventListener('test', null, opts);
            window.removeEventListener('test', null, opts);
        } catch (e) {
            // Passive events not supported
        }
        return supported;
    }

    // Test for once event support
    supportsOnceEvents() {
        try {
            const opts = { once: true };
            window.addEventListener('test', null, opts);
            window.removeEventListener('test', null, opts);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Test for async/await support
    supportsAsyncAwait() {
        try {
            new Function('async () => {}')();
            return true;
        } catch (e) {
            return false;
        }
    }

    // Test CSS transition support
    supportsCSSTransitions() {
        const el = document.createElement('div');
        const transitions = {
            'transition': 'transitionend',
            'OTransition': 'oTransitionEnd',
            'MozTransition': 'transitionend',
            'WebkitTransition': 'webkitTransitionEnd'
        };
        
        for (const t in transitions) {
            if (el.style[t] !== undefined) {
                return true;
            }
        }
        return false;
    }

    // Test CSS transform support
    supportsCSSTransforms() {
        const el = document.createElement('div');
        const transforms = [
            'transform',
            'WebkitTransform',
            'MozTransform',
            'OTransform',
            'msTransform'
        ];
        
        for (const t of transforms) {
            if (el.style[t] !== undefined) {
                return true;
            }
        }
        return false;
    }

    // Test CSS animation support
    supportsCSSAnimations() {
        const el = document.createElement('div');
        const animations = [
            'animation',
            'WebkitAnimation',
            'MozAnimation',
            'OAnimation',
            'msAnimation'
        ];
        
        for (const a of animations) {
            if (el.style[a] !== undefined) {
                return true;
            }
        }
        return false;
    }

    // Browser detection methods
    isChrome() {
        return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
    }

    isFirefox() {
        return typeof InstallTrigger !== 'undefined' || 
               (typeof navigator !== 'undefined' && navigator.userAgent.includes('Firefox'));
    }

    isSafari() {
        return typeof safari !== 'undefined' || 
               (typeof navigator !== 'undefined' && 
                navigator.userAgent.includes('Safari') && 
                !navigator.userAgent.includes('Chrome'));
    }

    isEdge() {
        return typeof navigator !== 'undefined' && 
               (navigator.userAgent.includes('Edge') || navigator.userAgent.includes('Edg'));
    }

    getBrowserVersion() {
        if (typeof navigator === 'undefined') return null;
        
        const ua = navigator.userAgent;
        const match = ua.match(/(?:Chrome|Firefox|Safari|Edge)\/([0-9.]+)/);
        return match ? match[1] : null;
    }

    // Setup polyfills for missing features
    setupPolyfills() {
        // Array.prototype.includes polyfill
        if (!this.features.arrayIncludes) {
            Array.prototype.includes = function(searchElement, fromIndex) {
                if (this == null) {
                    throw new TypeError('Array.prototype.includes called on null or undefined');
                }
                
                const O = Object(this);
                const len = parseInt(O.length, 10) || 0;
                
                if (len === 0) return false;
                
                const n = parseInt(fromIndex, 10) || 0;
                let k = n >= 0 ? n : Math.max(len + n, 0);
                
                for (; k < len; k++) {
                    if (O[k] === searchElement) {
                        return true;
                    }
                }
                
                return false;
            };
            this.polyfills.set('arrayIncludes', true);
        }

        // Array.from polyfill
        if (!this.features.arrayFrom) {
            Array.from = function(arrayLike) {
                if (arrayLike == null) {
                    throw new TypeError('Array.from requires an array-like object');
                }
                
                const mapFn = arguments.length > 1 ? arguments[1] : undefined;
                const thisArg = arguments.length > 2 ? arguments[2] : undefined;
                
                const items = Object(arrayLike);
                const len = parseInt(items.length, 10) || 0;
                const result = new Array(len);
                
                for (let i = 0; i < len; i++) {
                    if (mapFn) {
                        result[i] = mapFn.call(thisArg, items[i], i);
                    } else {
                        result[i] = items[i];
                    }
                }
                
                return result;
            };
            this.polyfills.set('arrayFrom', true);
        }

        // Object.assign polyfill
        if (!this.features.objectAssign) {
            Object.assign = function(target) {
                if (target == null) {
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                
                const to = Object(target);
                
                for (let i = 1; i < arguments.length; i++) {
                    const nextSource = arguments[i];
                    
                    if (nextSource != null) {
                        for (const nextKey in nextSource) {
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                
                return to;
            };
            this.polyfills.set('objectAssign', true);
        }

        // String.prototype.includes polyfill
        if (!this.features.stringIncludes) {
            String.prototype.includes = function(searchString, position) {
                if (this == null) {
                    throw new TypeError('String.prototype.includes called on null or undefined');
                }
                
                const str = String(this);
                const pos = position || 0;
                
                return str.indexOf(searchString, pos) !== -1;
            };
            this.polyfills.set('stringIncludes', true);
        }

        // Promise polyfill (basic implementation)
        if (!this.features.promise) {
            window.Promise = this.createBasicPromise();
            this.polyfills.set('promise', true);
        }
    }

    // Basic Promise implementation
    createBasicPromise() {
        class SimplePromise {
            constructor(executor) {
                this.state = 'pending';
                this.value = undefined;
                this.reason = undefined;
                this.onFulfilled = [];
                this.onRejected = [];
                
                const resolve = (value) => {
                    if (this.state === 'pending') {
                        this.state = 'fulfilled';
                        this.value = value;
                        this.onFulfilled.forEach(cb => cb(value));
                    }
                };
                
                const reject = (reason) => {
                    if (this.state === 'pending') {
                        this.state = 'rejected';
                        this.reason = reason;
                        this.onRejected.forEach(cb => cb(reason));
                    }
                };
                
                try {
                    executor(resolve, reject);
                } catch (error) {
                    reject(error);
                }
            }
            
            then(onFulfilled, onRejected) {
                return new SimplePromise((resolve, reject) => {
                    const handleFulfilled = (value) => {
                        try {
                            if (typeof onFulfilled === 'function') {
                                resolve(onFulfilled(value));
                            } else {
                                resolve(value);
                            }
                        } catch (error) {
                            reject(error);
                        }
                    };
                    
                    const handleRejected = (reason) => {
                        try {
                            if (typeof onRejected === 'function') {
                                resolve(onRejected(reason));
                            } else {
                                reject(reason);
                            }
                        } catch (error) {
                            reject(error);
                        }
                    };
                    
                    if (this.state === 'fulfilled') {
                        handleFulfilled(this.value);
                    } else if (this.state === 'rejected') {
                        handleRejected(this.reason);
                    } else {
                        this.onFulfilled.push(handleFulfilled);
                        this.onRejected.push(handleRejected);
                    }
                });
            }
            
            catch(onRejected) {
                return this.then(null, onRejected);
            }
        }
        
        return SimplePromise;
    }

    // Get feature-safe method
    getSafeMethod(object, methodName, fallback = null) {
        if (object && typeof object[methodName] === 'function') {
            return object[methodName].bind(object);
        }
        
        if (fallback && typeof fallback === 'function') {
            return fallback;
        }
        
        return () => {
            console.warn(`Method ${methodName} not available and no fallback provided`);
        };
    }

    // Get feature-safe property
    getSafeProperty(object, propertyName, defaultValue = null) {
        if (object && propertyName in object) {
            return object[propertyName];
        }
        
        return defaultValue;
    }

    // Safe event listener addition
    safeAddEventListener(element, event, handler, options = {}) {
        if (!element || typeof element.addEventListener !== 'function') {
            console.warn('addEventListener not supported on this element');
            return false;
        }
        
        // Handle passive events
        if (options.passive && !this.features.passiveEvents) {
            delete options.passive;
        }
        
        // Handle once events
        if (options.once && !this.features.onceEvents) {
            const originalHandler = handler;
            handler = (e) => {
                originalHandler(e);
                element.removeEventListener(event, handler);
            };
            delete options.once;
        }
        
        element.addEventListener(event, handler, options);
        return true;
    }

    // Safe storage operations
    safeStorageGet(keys, callback) {
        if (this.features.chromeStorage) {
            chrome.storage.sync.get(keys, callback);
        } else {
            // Fallback to localStorage
            try {
                const result = {};
                if (typeof keys === 'string') {
                    const value = localStorage.getItem(keys);
                    result[keys] = value ? JSON.parse(value) : undefined;
                } else if (Array.isArray(keys)) {
                    keys.forEach(key => {
                        const value = localStorage.getItem(key);
                        result[key] = value ? JSON.parse(value) : undefined;
                    });
                } else {
                    // Get all items
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        const value = localStorage.getItem(key);
                        result[key] = value ? JSON.parse(value) : undefined;
                    }
                }
                callback(result);
            } catch (error) {
                console.error('Storage fallback failed:', error);
                callback({});
            }
        }
    }

    safeStorageSet(items, callback) {
        if (this.features.chromeStorage) {
            chrome.storage.sync.set(items, callback);
        } else {
            // Fallback to localStorage
            try {
                for (const [key, value] of Object.entries(items)) {
                    localStorage.setItem(key, JSON.stringify(value));
                }
                if (callback) callback();
            } catch (error) {
                console.error('Storage fallback failed:', error);
                if (callback) callback(error);
            }
        }
    }

    // Get compatibility report
    getCompatibilityReport() {
        const report = {
            browser: {
                name: this.features.isChrome ? 'Chrome' : 
                      this.features.isFirefox ? 'Firefox' : 
                      this.features.isSafari ? 'Safari' : 
                      this.features.isEdge ? 'Edge' : 'Unknown',
                version: this.features.version
            },
            features: {},
            polyfills: Array.from(this.polyfills.keys()),
            fallbacks: Array.from(this.fallbacks.keys()),
            issues: []
        };
        
        // Check critical features
        const criticalFeatures = [
            'chromeStorage',
            'videoPlaybackRate',
            'console',
            'json'
        ];
        
        for (const feature of criticalFeatures) {
            const supported = this.features[feature];
            report.features[feature] = supported;
            
            if (!supported) {
                report.issues.push(`Critical feature ${feature} not supported`);
            }
        }
        
        // Check optional features
        const optionalFeatures = [
            'mutationObserver',
            'passiveEvents',
            'cssTransitions',
            'performance'
        ];
        
        for (const feature of optionalFeatures) {
            const supported = this.features[feature];
            report.features[feature] = supported;
        }
        
        return report;
    }
}

// Export singleton instance
export const browserCompat = new BrowserCompatibility();

// Export convenience functions
export function hasFeature(feature) {
    return browserCompat.features[feature] || false;
}

export function safeMethod(object, methodName, fallback) {
    return browserCompat.getSafeMethod(object, methodName, fallback);
}

export function safeProperty(object, propertyName, defaultValue) {
    return browserCompat.getSafeProperty(object, propertyName, defaultValue);
}

export function safeAddEventListener(element, event, handler, options) {
    return browserCompat.safeAddEventListener(element, event, handler, options);
}

export function getCompatibilityReport() {
    return browserCompat.getCompatibilityReport();
}
