/**
 * Defensive DOM query utilities with caching and null checks
 */

export class DOMCache {
    constructor() {
        this.cache = new Map();
        this.observers = new Map();
        this.cacheTimeout = 30000; // 30 seconds
        this.setupMutationObserver();
    }

    // Get element with caching and validation
    getElement(selector, options = {}) {
        const {
            useCache = true,
            validate = true,
            timeout = this.cacheTimeout
        } = options;

        const cacheKey = `${selector}:${JSON.stringify(options)}`;
        
        // Check cache first
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (this.isValidElement(cached.element)) {
                cached.timestamp = Date.now();
                return cached.element;
            } else {
                // Remove invalid cache entry
                this.cache.delete(cacheKey);
            }
        }

        // Query DOM
        const element = document.querySelector(selector);
        
        if (validate && !this.isValidElement(element)) {
            return null;
        }

        // Cache the result
        if (useCache && element) {
            this.cache.set(cacheKey, {
                element,
                timestamp: Date.now(),
                timeout
            });
        }

        return element;
    }

    // Get multiple elements with caching
    getElements(selector, options = {}) {
        const {
            useCache = true,
            validate = true,
            timeout = this.cacheTimeout
        } = options;

        const cacheKey = `multi:${selector}:${JSON.stringify(options)}`;
        
        // Check cache first
        if (useCache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Array.isArray(cached.element) && cached.element.every(el => this.isValidElement(el))) {
                cached.timestamp = Date.now();
                return cached.element;
            } else {
                this.cache.delete(cacheKey);
            }
        }

        // Query DOM
        const elements = Array.from(document.querySelectorAll(selector));
        
        if (validate) {
            const validElements = elements.filter(el => this.isValidElement(el));
            if (validElements.length !== elements.length) {
                console.warn(`Some elements for selector "${selector}" were invalid`);
            }
        }

        // Cache the result
        if (useCache && elements.length > 0) {
            this.cache.set(cacheKey, {
                element: elements,
                timestamp: Date.now(),
                timeout
            });
        }

        return elements;
    }

    // Validate element is still in DOM and usable
    isValidElement(element) {
        if (!element) return false;
        if (!(element instanceof Element)) return false;
        
        // Check if element is still connected to DOM
        if (!element.isConnected) return false;
        
        // Check if element is not a document fragment or other invalid node
        if (element.nodeType !== Node.ELEMENT_NODE) return false;
        
        // Additional checks for common issues
        const tagName = element.tagName?.toLowerCase();
        if (!tagName) return false;
        
        return true;
    }

    // Get video elements with additional validation
    getVideoElements(options = {}) {
        const videos = this.getElements('video', { ...options, validate: true });
        
        return videos.filter(video => {
            // Additional video-specific validation
            if (!video.src && !video.currentSrc) {
                return false; // Video has no source
            }
            
            if (video.readyState === HTMLMediaElement.HAVE_NOTHING) {
                return false; // Video not loaded
            }
            
            return true;
        });
    }

    // Get first valid video element
    getFirstVideo(options = {}) {
        const videos = this.getVideoElements(options);
        return videos.length > 0 ? videos[0] : null;
    }

    // Safe element property access
    safeGetProperty(element, property, defaultValue = null) {
        if (!this.isValidElement(element)) {
            return defaultValue;
        }
        
        try {
            const value = element[property];
            return value !== undefined ? value : defaultValue;
        } catch (error) {
            console.warn(`Error accessing property "${property}" on element:`, error);
            return defaultValue;
        }
    }

    // Safe element method call
    safeCallMethod(element, method, ...args) {
        if (!this.isValidElement(element)) {
            return null;
        }
        
        try {
            if (typeof element[method] === 'function') {
                return element[method](...args);
            } else {
                console.warn(`Method "${method}" is not a function on element`);
                return null;
            }
        } catch (error) {
            console.warn(`Error calling method "${method}" on element:`, error);
            return null;
        }
    }

    // Setup mutation observer to invalidate cache when DOM changes
    setupMutationObserver() {
        if (!window.MutationObserver) return;
        
        const observer = new MutationObserver((mutations) => {
            let shouldClearCache = false;
            
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && 
                    (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    shouldClearCache = true;
                }
            });
            
            if (shouldClearCache) {
                this.clearCache();
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        this.observers.set('main', observer);
    }

    // Clear cache
    clearCache() {
        this.cache.clear();
    }

    // Clean up old cache entries
    cleanupCache() {
        const now = Date.now();
        
        for (const [key, cached] of this.cache.entries()) {
            if (now - cached.timestamp > cached.timeout) {
                this.cache.delete(key);
            }
        }
    }

    // Get cache statistics
    getCacheStats() {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.entries()).map(([key, value]) => ({
                key,
                age: Date.now() - value.timestamp,
                timeout: value.timeout
            }))
        };
    }

    // Destroy all observers and clean up
    destroy() {
        this.observers.forEach(observer => observer.disconnect());
        this.observers.clear();
        this.clearCache();
    }
}

// Video-specific utilities
export class VideoElementManager {
    constructor() {
        this.domCache = new DOMCache();
        this.activeVideos = new Set();
        this.videoObservers = new Map();
    }

    // Get current video with fallback strategies
    getCurrentVideo() {
        // Strategy 1: Try to get the currently playing video
        const videos = this.domCache.getVideoElements();
        const playingVideo = videos.find(video => !video.paused);
        if (playingVideo) return playingVideo;

        // Strategy 2: Get the largest video (likely main content)
        const largestVideo = videos.reduce((largest, video) => {
            const videoArea = video.offsetWidth * video.offsetHeight;
            const largestArea = largest ? largest.offsetWidth * largest.offsetHeight : 0;
            return videoArea > largestArea ? video : largest;
        }, null);
        
        if (largestVideo) return largestVideo;

        // Strategy 3: Get the first video with a source
        const videoWithSource = videos.find(video => video.src || video.currentSrc);
        if (videoWithSource) return videoWithSource;

        // Strategy 4: Return any video element
        return videos.length > 0 ? videos[0] : null;
    }

    // Monitor video for changes
    monitorVideo(video, callback) {
        if (!video || typeof callback !== 'function') return;

        // Remove existing observer for this video
        this.unmonitorVideo(video);

        const observer = new MutationObserver(() => {
            callback(video);
        });

        observer.observe(video, {
            attributes: true,
            attributeFilter: ['src', 'currentSrc', 'paused', 'ended']
        });

        this.videoObservers.set(video, observer);
        this.activeVideos.add(video);
    }

    // Stop monitoring video
    unmonitorVideo(video) {
        const observer = this.videoObservers.get(video);
        if (observer) {
            observer.disconnect();
            this.videoObservers.delete(video);
        }
        this.activeVideos.delete(video);
    }

    // Check if video is still valid
    isVideoValid(video) {
        return this.domCache.isValidElement(video) && 
               video.tagName?.toLowerCase() === 'video';
    }

    // Get safe video property
    getVideoProperty(video, property, defaultValue = null) {
        if (!this.isVideoValid(video)) return defaultValue;
        return this.domCache.safeGetProperty(video, property, defaultValue);
    }

    // Set safe video property
    setVideoProperty(video, property, value) {
        if (!this.isVideoValid(video)) return false;
        
        try {
            video[property] = value;
            return true;
        } catch (error) {
            console.warn(`Error setting video property "${property}":`, error);
            return false;
        }
    }

    // Clean up all video monitoring
    cleanup() {
        this.videoObservers.forEach(observer => observer.disconnect());
        this.videoObservers.clear();
        this.activeVideos.clear();
        this.domCache.destroy();
    }
}

// Export singleton instances
export const domCache = new DOMCache();
export const videoManager = new VideoElementManager();

// Export convenience functions
export function safeQuerySelector(selector, options = {}) {
    return domCache.getElement(selector, options);
}

export function safeQuerySelectorAll(selector, options = {}) {
    return domCache.getElements(selector, options);
}

export function getCurrentVideo() {
    return videoManager.getCurrentVideo();
}

export function isValidVideo(video) {
    return videoManager.isVideoValid(video);
}
