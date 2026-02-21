// Caption extraction and silence skipping utilities
class CaptionExtractor {
    constructor(video) {
        this.video = video;
    }

    extractCues() {
        const cues = [];

        if (!this.video || !this.video.textTracks) {
            return cues;
        }

        // Iterate through all text tracks
        for (let i = 0; i < this.video.textTracks.length; i++) {
            const track = this.video.textTracks[i];

            // Only process caption/subtitle tracks
            if (track.kind === 'captions' || track.kind === 'subtitles') {
                // Enable disabled tracks to access cues
                if (track.mode === 'disabled') {
                    track.mode = 'hidden';
                }

                if (track.cues) {
                    for (let j = 0; j < track.cues.length; j++) {
                        const cue = track.cues[j];
                        cues.push({
                            startTime: cue.startTime,
                            endTime: cue.endTime || cue.startTime + 5, // Default 5s if no endTime
                            text: cue.text || ''
                        });
                    }
                }
            }
        }

        // Sort by start time and remove duplicates
        cues.sort((a, b) => a.startTime - b.startTime);

        // Merge overlapping cues
        const mergedCues = [];
        for (const cue of cues) {
            if (mergedCues.length === 0) {
                mergedCues.push(cue);
            } else {
                const last = mergedCues[mergedCues.length - 1];
                if (cue.startTime <= last.endTime) {
                    // Overlapping - extend the end time
                    last.endTime = Math.max(last.endTime, cue.endTime);
                } else {
                    mergedCues.push(cue);
                }
            }
        }

        return mergedCues;
    }

    hasCaptions() {
        if (!this.video || !this.video.textTracks) {
            console.log('[VSC] No video or textTracks');
            return false;
        }

        console.log('[VSC] Checking', this.video.textTracks.length, 'text tracks');

        for (let i = 0; i < this.video.textTracks.length; i++) {
            const track = this.video.textTracks[i];
            console.log('[VSC] Track', i, '- kind:', track.kind, 'mode:', track.mode, 'cues:', track.cues?.length || 0);

            // Check tracks that are captions or subtitles
            if (track.kind === 'captions' || track.kind === 'subtitles') {
                // If track is disabled, try enabling it temporarily to load cues
                const wasDisabled = track.mode === 'disabled';
                if (wasDisabled) {
                    track.mode = 'hidden'; // Enable but don't show (we render our own skip)
                    console.log('[VSC] Enabled disabled track', i);
                }

                if (track.cues && track.cues.length > 0) {
                    console.log('[VSC] Found captions in track', i, 'with', track.cues.length, 'cues');
                    return true;
                }
            }
        }
        return false;
    }
}

class SilenceSkipper {
    constructor(controller) {
        this.controller = controller;
        this.enabled = false;
        this.gaps = [];
        this.timeUpdateHandler = null;
        this.video = null;
        this.gapThreshold = 5; // seconds
        this.lastSkipTime = 0; // Prevent rapid repeated skips
        this.skipCooldown = 0.5; // seconds between skips
    }

    computeGaps(cues, videoDuration) {
        const gaps = [];

        if (!cues || cues.length === 0) {
            return gaps;
        }

        // Check gap at start of video
        if (cues[0].startTime > this.gapThreshold) {
            gaps.push({
                start: 0,
                end: cues[0].startTime
            });
        }

        // Check gaps between cues
        for (let i = 0; i < cues.length - 1; i++) {
            const gapStart = cues[i].endTime;
            const gapEnd = cues[i + 1].startTime;
            const gapDuration = gapEnd - gapStart;

            if (gapDuration > this.gapThreshold) {
                gaps.push({
                    start: gapStart,
                    end: gapEnd
                });
            }
        }

        // Check gap at end of video (only if we know the duration)
        if (videoDuration && cues.length > 0) {
            const lastCueEnd = cues[cues.length - 1].endTime;
            if (videoDuration - lastCueEnd > this.gapThreshold) {
                gaps.push({
                    start: lastCueEnd,
                    end: videoDuration
                });
            }
        }

        return gaps;
    }

    toggle(video) {
        if (this.enabled) {
            this.disable();
            return { enabled: false, message: 'Skip Silence: Off' };
        } else {
            return this.enable(video);
        }
    }

    enable(video) {
        if (!video) {
            return { enabled: false, message: 'No video found' };
        }

        this.video = video;
        const extractor = new CaptionExtractor(video);

        if (!extractor.hasCaptions()) {
            return { enabled: false, message: 'No captions available', unavailable: true };
        }

        const cues = extractor.extractCues();
        if (cues.length === 0) {
            return { enabled: false, message: 'No captions available', unavailable: true };
        }

        // Get gap threshold from settings
        if (this.controller.settings && this.controller.settings.skipSilenceGapThreshold) {
            this.gapThreshold = this.controller.settings.skipSilenceGapThreshold;
        }

        this.gaps = this.computeGaps(cues, video.duration);

        if (this.gaps.length === 0) {
            return { enabled: false, message: 'No gaps to skip' };
        }

        // Set up timeupdate listener
        this.timeUpdateHandler = () => this.onTimeUpdate();
        video.addEventListener('timeupdate', this.timeUpdateHandler);

        this.enabled = true;
        return { enabled: true, message: 'Skip Silence: On', gapCount: this.gaps.length };
    }

    disable() {
        if (this.video && this.timeUpdateHandler) {
            this.video.removeEventListener('timeupdate', this.timeUpdateHandler);
        }
        this.enabled = false;
        this.gaps = [];
        this.video = null;
        this.timeUpdateHandler = null;
    }

    onTimeUpdate() {
        if (!this.enabled || !this.video) return;

        const currentTime = this.video.currentTime;
        const now = Date.now() / 1000;

        // Cooldown to prevent rapid skips
        if (now - this.lastSkipTime < this.skipCooldown) {
            return;
        }

        // Check if current time is in a gap
        for (const gap of this.gaps) {
            // Add small buffer (0.5s) to avoid skipping when user manually seeks into gap
            if (currentTime >= gap.start + 0.5 && currentTime < gap.end - 0.5) {
                const skipDuration = gap.end - currentTime;
                this.video.currentTime = gap.end;
                this.lastSkipTime = now;

                // Show skip indicator
                if (this.controller) {
                    this.controller.showSkipIndicator(skipDuration);
                }
                break;
            }
        }
    }

    isInGap(time) {
        for (const gap of this.gaps) {
            if (time >= gap.start && time < gap.end) {
                return true;
            }
        }
        return false;
    }
}

class VideoSpeedController {
    constructor() {
        this.defaultSpeeds = DEFAULT_SPEEDS;
        this.speeds = [...this.defaultSpeeds];
        this.currentSpeedIndex = this.speeds.indexOf(1);
        this.previousSpeedIndex = null;
        this.lastSpeedIndex = this.currentSpeedIndex; // Track last speed for toggle
        this.longPressTimer = null;
        this.settings = null;
        this.overlay = this.createOverlay();
        this.controls = this.createControls();
        this.currentVideo = null;
        this.controlsTimeout = null;
        this.isMouseOverVideo = false;
        this.isMouseOverControls = false;
        this.isLongPressing = false;
        this.speedBeforeLongPress = null;
        this.longPressStartTime = null;

        // Track cleanup resources
        this.timeouts = [];
        this.eventListeners = [];
        this.storageListeners = [];
        this.videoCheckInterval = null;

        // Skip silence feature
        this.silenceSkipper = new SilenceSkipper(this);

        // YouTube embed controller
        this.youtubeEmbedController = new YouTubeEmbedController();
        this.youtubeEmbedController.init();

        this.loadSettings();
        this.setupEventListeners();
        this.setupCleanupHandlers();
        this.setupVideoDetection();
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'video-speed-overlay';
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        return overlay;
    }

    createControls() {
        const controls = document.createElement('div');
        controls.className = 'video-speed-controls';
        controls.style.display = 'none'; // Hidden by default until video is detected
        controls.innerHTML = `
            <button class="speed-down">
                <span class="icon">-</span>
            </button>
            <button class="speed-reset">
                <span class="icon">1×</span>
            </button>
            <button class="speed-up">
                <span class="icon">+</span>
            </button>
            <button class="skip-silence" title="Skip sections without captions">
                <span class="icon">⏭</span>
            </button>
            <button class="settings" title="Settings">
                <span class="icon">⚙</span>
            </button>
        `;
        document.body.appendChild(controls);

        // Keep controls visible when hovering over them
        controls.addEventListener('mouseenter', () => {
            this.isMouseOverControls = true;
            this.resetControlsTimer();
        });
        controls.addEventListener('mouseleave', () => {
            this.isMouseOverControls = false;
        });

        return controls;
    }

    async loadSettings() {
        try {
            // Import compatibility utilities (inline for now)
            const hasFeature = (feature) => {
                // Basic feature detection
                const features = {
                    chromeStorage: typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync,
                    promise: typeof Promise !== 'undefined',
                    console: typeof console !== 'undefined' && console.log
                };
                return features[feature] || false;
            };
            
            const safeStorageGet = (keys, callback) => {
                if (hasFeature('chromeStorage')) {
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
            };
            
            const safeStorageSet = (items, callback) => {
                if (hasFeature('chromeStorage')) {
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
            };
            
            // Import migration utilities (inline for now)
            const migrateSettings = async () => {
                const CURRENT_SCHEMA_VERSION = 2;
                const getCurrentVersion = async () => {
                    try {
                        if (hasFeature('chromeStorage')) {
                            const result = await new Promise(resolve => {
                                chrome.storage.sync.get({ _schemaVersion: 1 }, resolve);
                            });
                            return result._schemaVersion || 1;
                        } else {
                            // Fallback to localStorage
                            const version = localStorage.getItem('_schemaVersion');
                            return version ? parseInt(version) : 1;
                        }
                    } catch (error) {
                        return 1;
                    }
                };
                
                const setVersion = async (version) => {
                    try {
                        if (hasFeature('chromeStorage')) {
                            await new Promise(resolve => {
                                chrome.storage.sync.set({ _schemaVersion: version }, resolve);
                            });
                        } else {
                            localStorage.setItem('_schemaVersion', version.toString());
                        }
                        return true;
                    } catch (error) {
                        return false;
                    }
                };
                
                const currentVersion = await getCurrentVersion();
                
                if (currentVersion < CURRENT_SCHEMA_VERSION) {
                    console.log(`Migrating settings from version ${currentVersion} to ${CURRENT_SCHEMA_VERSION}`);
                    
                    const result = await new Promise(resolve => {
                        safeStorageGet(null, resolve);
                    });
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
                    
                    await new Promise(resolve => {
                        safeStorageSet(settings, resolve);
                    });
                    await setVersion(CURRENT_SCHEMA_VERSION);
                    
                    return { migrated: true, settings };
                }
                
                return { migrated: false, settings: result };
            };
            
            // Run migration first
            const migrationResult = await migrateSettings();

            const defaultSettings = DEFAULT_SETTINGS;

            // Use resilient storage get
            const storageResult = await this.safeStorageGet(defaultSettings);
            if (!storageResult.success) {
                throw new Error(storageResult.error?.message || 'Failed to load settings');
            }
            
            const result = storageResult.result;
            
            // Ensure all required fields exist
            this.settings = {
                ...defaultSettings,
                ...result,
                shortcuts: {
                    ...defaultSettings.shortcuts,
                    ...result.shortcuts
                }
            };

            // Ensure speeds are valid numbers and within range
            const validSpeeds = this.settings.customSpeeds
                .filter(speed => !isNaN(speed) && speed >= 0.05 && speed <= 16);

            // Use custom speeds directly (don't merge with defaults)
            // customSpeeds already defaults to defaultSpeeds if not customized
            this.speeds = [...new Set(validSpeeds)].sort((a, b) => a - b);
            this.currentSpeedIndex = this.speeds.indexOf(1);

            // Update UI
            this.updateControlsVisibility(); // This now includes video detection
            this.updateShortcutHints();

            // Save validated settings back if they were modified
            if (validSpeeds.length !== this.settings.customSpeeds.length) {
                this.settings.customSpeeds = validSpeeds;
                try {
                    const saveResult = await this.safeStorageSet({ customSpeeds: validSpeeds });
                    if (!saveResult.success) {
                        console.warn('Could not save validated settings:', saveResult.error);
                    }
                } catch (saveError) {
                    console.error('Error saving validated settings:', saveError);
                }
            }
            
            if (migrationResult.migrated) {
                console.log('Settings migration completed successfully');
            }
        } catch (error) {
            console.error('Error loading settings:', error);
            // Fallback to default settings
            this.settings = DEFAULT_SETTINGS;
            this.speeds = [...this.defaultSpeeds];
            this.currentSpeedIndex = this.speeds.indexOf(1);
            try {
                this.updateControlsVisibility();
                this.updateShortcutHints();
            } catch (uiError) {
                console.error('Error updating UI with fallback settings:', uiError);
            }
        }
    }

    // Resilient storage methods
    async safeStorageGet(keys, defaults = {}) {
        try {
            // Simple retry implementation for content script
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

    async safeStorageSet(items) {
        try {
            // Simple retry implementation for content script
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

    updateControlsVisibility() {
        try {
            // Delegate to the video-aware visibility method
            this.updateControlsVisibilityBasedOnVideo();
        } catch (error) {
            console.error('Error updating controls visibility:', error);
        }
    }

    updateShortcutHints() {
        try {
            if (!this.controls || !this.settings) return;

            // Defensive DOM queries with validation
            const getButton = (selector) => {
                const element = this.controls.querySelector(selector);
                return element && element.isConnected ? element : null;
            };

            // Format shortcut for display (show all keys, uppercase)
            const formatShortcut = (shortcutString) => {
                if (!shortcutString) return '';
                return shortcutString.split(',').map(k => k.trim().toUpperCase()).join(', ');
            };

            const speedDownBtn = getButton('.speed-down');
            const resetBtn = getButton('.speed-reset');
            const speedUpBtn = getButton('.speed-up');
            const skipSilenceBtn = getButton('.skip-silence');
            const settingsBtn = getButton('.settings');

            // Update tooltips with keyboard shortcuts
            if (this.settings.showShortcutHints) {
                if (speedDownBtn) speedDownBtn.title = `Decrease speed [${formatShortcut(this.settings.shortcuts.speedDown)}]`;
                if (resetBtn) resetBtn.title = `Reset to normal speed [${formatShortcut(this.settings.shortcuts.reset)}]`;
                if (speedUpBtn) speedUpBtn.title = `Increase speed [${formatShortcut(this.settings.shortcuts.speedUp)}]`;
                if (skipSilenceBtn) skipSilenceBtn.title = `Skip sections without captions [${formatShortcut(this.settings.shortcuts.skipSilence)}]`;
            } else {
                if (speedDownBtn) speedDownBtn.title = 'Decrease speed';
                if (resetBtn) resetBtn.title = 'Reset to normal speed';
                if (speedUpBtn) speedUpBtn.title = 'Increase speed';
                if (skipSilenceBtn) skipSilenceBtn.title = 'Skip sections without captions';
            }
            if (settingsBtn) settingsBtn.title = 'Settings';
        } catch (error) {
            console.error('Error updating shortcut hints:', error);
        }
    }

    updateControlsVisibilityBasedOnVideo() {
        try {
            if (!this.controls || !this.settings) return;

            // Check if showSpeedButtons setting is enabled
            if (!this.settings.showSpeedButtons) {
                this.controls.style.display = 'none';
                return;
            }

            // Check if there's a playing video on the page
            const getPlayingVideo = () => {
                const videos = Array.from(document.querySelectorAll('video'))
                    .filter(video => video.isConnected &&
                           (video.src || video.currentSrc) &&
                           video.readyState !== HTMLMediaElement.HAVE_NOTHING &&
                           !video.paused); // Only include playing videos

                // Return the first playing video, or try to find the largest one
                if (videos.length === 0) return null;

                if (videos.length === 1) return videos[0];

                // If multiple playing videos, return the largest
                return videos.reduce((largest, video) => {
                    const videoArea = video.offsetWidth * video.offsetHeight;
                    const largestArea = largest ? largest.offsetWidth * largest.offsetHeight : 0;
                    return videoArea > largestArea ? video : largest;
                }, null);
            };

            const playingVideo = getPlayingVideo();
            this.currentVideo = playingVideo;

            // Position controls inside the video if there's a playing video
            if (playingVideo) {
                this.positionControlsInsideVideo(playingVideo);
                this.setupVideoMouseListeners(playingVideo);
                // Start with controls hidden, they'll show on mouse movement
                this.hideControls();
            } else if (this.youtubeEmbedController && this.youtubeEmbedController.hasEmbeds()) {
                // No direct video, but YouTube embeds exist — position controls over embed
                const iframe = this.youtubeEmbedController.getActiveIframe();
                if (iframe) {
                    this.positionControlsInsideIframe(iframe);
                    this.setupIframeMouseListeners(iframe);
                    this.hideControls();
                } else {
                    this.controls.style.display = 'none';
                }
            } else {
                this.controls.style.display = 'none';
                this.currentVideo = null;
            }
        } catch (error) {
            console.error('Error updating controls visibility based on video:', error);
        }
    }

    positionControlsInsideVideo(video) {
        try {
            if (!video || !this.controls) return;
            
            const videoRect = video.getBoundingClientRect();
            
            // Position controls in top-left corner of the video, with some padding
            const padding = 10;
            this.controls.style.position = 'fixed';
            this.controls.style.top = `${videoRect.top + padding}px`;
            this.controls.style.left = `${videoRect.left + padding}px`;
            this.controls.style.display = 'flex';
        } catch (error) {
            console.error('Error positioning controls inside video:', error);
        }
    }

    positionControlsInsideIframe(iframe) {
        try {
            if (!iframe || !this.controls) return;

            const iframeRect = iframe.getBoundingClientRect();
            const padding = 10;
            this.controls.style.position = 'fixed';
            this.controls.style.top = `${iframeRect.top + padding}px`;
            this.controls.style.left = `${iframeRect.left + padding}px`;
            this.controls.style.display = 'flex';
        } catch (error) {
            console.error('Error positioning controls inside iframe:', error);
        }
    }

    setupIframeMouseListeners(iframe) {
        try {
            if (!iframe || iframe._vscMouseListenersAdded) return;

            const mouseEnterHandler = () => {
                this.isMouseOverVideo = true;
                this.showControls();
            };

            const mouseLeaveHandler = () => {
                this.isMouseOverVideo = false;
                this.hideControls();
            };

            let mouseMoveTimeout = null;
            const mouseMoveHandler = () => {
                if (!this.isMouseOverVideo) return;
                if (mouseMoveTimeout) return;

                mouseMoveTimeout = setTimeout(() => {
                    mouseMoveTimeout = null;
                }, 100);

                this.resetControlsTimer();
            };

            iframe.addEventListener('mouseenter', mouseEnterHandler);
            iframe.addEventListener('mouseleave', mouseLeaveHandler);
            iframe.addEventListener('mousemove', mouseMoveHandler);

            iframe._vscMouseListenersAdded = true;

            this.eventListeners.push(
                { element: iframe, event: 'mouseenter', handler: mouseEnterHandler },
                { element: iframe, event: 'mouseleave', handler: mouseLeaveHandler },
                { element: iframe, event: 'mousemove', handler: mouseMoveHandler }
            );
        } catch (error) {
            console.error('Error setting up iframe mouse listeners:', error);
        }
    }

    setupVideoMouseListeners(video) {
        try {
            if (!video || video._vscMouseListenersAdded) return;

            const mouseEnterHandler = () => {
                this.isMouseOverVideo = true;
                this.showControls();
            };

            const mouseLeaveHandler = () => {
                this.isMouseOverVideo = false;
                this.hideControls();
            };

            // Debounced mouse move - only reset hide timer, don't re-show if already visible
            let mouseMoveTimeout = null;
            const mouseMoveHandler = () => {
                if (!this.isMouseOverVideo) return;

                // Debounce: ignore rapid movements
                if (mouseMoveTimeout) return;

                mouseMoveTimeout = setTimeout(() => {
                    mouseMoveTimeout = null;
                }, 100);

                // Just reset the hide timer if controls are already visible
                this.resetControlsTimer();
            };

            video.addEventListener('mouseenter', mouseEnterHandler);
            video.addEventListener('mouseleave', mouseLeaveHandler);
            video.addEventListener('mousemove', mouseMoveHandler);

            video._vscMouseListenersAdded = true;
            
            // Store listeners for cleanup
            this.eventListeners.push(
                { element: video, event: 'mouseenter', handler: mouseEnterHandler },
                { element: video, event: 'mouseleave', handler: mouseLeaveHandler },
                { element: video, event: 'mousemove', handler: mouseMoveHandler }
            );
        } catch (error) {
            console.error('Error setting up video mouse listeners:', error);
        }
    }

    showControls() {
        try {
            const hasEmbed = this.youtubeEmbedController && this.youtubeEmbedController.hasEmbeds();
            if (!this.controls || (!this.currentVideo && !hasEmbed)) return;

            // Only update DOM if not already visible
            const isVisible = this.controls.style.opacity === '1';
            if (!isVisible) {
                this.controls.style.opacity = '1';
                this.controls.style.display = 'flex';
            }

            // Reset the hide timer
            this.resetControlsTimer();
        } catch (error) {
            console.error('Error showing controls:', error);
        }
    }

    resetControlsTimer() {
        try {
            // Don't set hide timeout if pointer is over video - keep controls visible
            if (this.isMouseOverVideo) return;

            // Clear any existing hide timeout
            if (this.controlsTimeout) {
                clearTimeout(this.controlsTimeout);
                this.controlsTimeout = null;
            }

            // Set timeout to hide controls after 2 seconds
            this.controlsTimeout = setTimeout(() => {
                this.hideControls();
            }, 2000);

            // Track timeout for cleanup
            this.timeouts.push(this.controlsTimeout);
        } catch (error) {
            console.error('Error resetting controls timer:', error);
        }
    }

    hideControls() {
        try {
            if (!this.controls) return;

            // Don't hide if mouse is over controls
            if (this.isMouseOverControls) {
                this.resetControlsTimer();
                return;
            }

            // Clear any existing timeout
            if (this.controlsTimeout) {
                clearTimeout(this.controlsTimeout);
                this.controlsTimeout = null;
            }

            // Hide controls with fade
            this.controls.style.opacity = '0';

            // Hide completely after fade animation
            setTimeout(() => {
                if (this.controls && !this.isMouseOverVideo && !this.isMouseOverControls) {
                    this.controls.style.display = 'none';
                }
            }, 300);
        } catch (error) {
            console.error('Error hiding controls:', error);
        }
    }

    startLongPress(video) {
        try {
            if (!video || this.isLongPressing) return;
            
            this.isLongPressing = true;
            this.speedBeforeLongPress = video.playbackRate;
            this.longPressStartTime = Date.now();
            
            // Start timer to detect long press (after 300ms)
            this.longPressTimer = setTimeout(() => {
                if (this.isLongPressing) {
                    this.toggleNormalSpeed(video);
                }
            }, 300);
            
            // Track timeout for cleanup
            this.timeouts.push(this.longPressTimer);
        } catch (error) {
            console.error('Error starting long press:', error);
        }
    }

    endLongPress(video) {
        try {
            if (!video || !this.isLongPressing) return;
            
            // Clear long press timer
            if (this.longPressTimer) {
                clearTimeout(this.longPressTimer);
                this.longPressTimer = null;
            }
            
            const pressDuration = Date.now() - this.longPressStartTime;
            
            if (pressDuration >= 300) {
                // This was a long press, restore original speed
                video.playbackRate = this.speedBeforeLongPress;
                this.showSpeedIndicator(this.speedBeforeLongPress);
                
                // Update current speed index to match restored speed
                const restoredIndex = this.speeds.indexOf(this.speedBeforeLongPress);
                if (restoredIndex !== -1) {
                    this.currentSpeedIndex = restoredIndex;
                }
            } else {
                // This was a short press, treat as normal toggle
                this.resetSpeed(video);
            }
            
            // Reset long press state
            this.isLongPressing = false;
            this.speedBeforeLongPress = null;
            this.longPressStartTime = null;
        } catch (error) {
            console.error('Error ending long press:', error);
        }
    }

    toggleNormalSpeed(video) {
        try {
            if (!video) return;
            
            const currentSpeed = video.playbackRate;
            let targetSpeed;
            
            if (currentSpeed === 1) {
                // Currently at normal speed, go to last non-1x speed
                if (this.lastSpeedIndex !== undefined && this.lastSpeedIndex !== this.speeds.indexOf(1)) {
                    targetSpeed = this.speeds[this.lastSpeedIndex];
                } else {
                    // No valid last speed, find the closest speed > 1
                    const speedsAboveNormal = this.speeds.filter(s => s > 1);
                    targetSpeed = speedsAboveNormal.length > 0 ? speedsAboveNormal[0] : 1.5;
                }
            } else {
                // Currently not at normal speed, go to normal speed
                targetSpeed = 1;
            }
            
            // Apply target speed
            video.playbackRate = targetSpeed;
            this.showSpeedIndicator(targetSpeed);
            
            // Update current speed index
            const targetIndex = this.speeds.indexOf(targetSpeed);
            if (targetIndex !== -1) {
                this.currentSpeedIndex = targetIndex;
            }
            
            // Track last speed if we're moving away from non-1x speed
            if (currentSpeed !== 1 && targetSpeed === 1) {
                this.lastSpeedIndex = this.speeds.indexOf(currentSpeed);
            }
        } catch (error) {
            console.error('Error toggling normal speed:', error);
        }
    }

    // YouTube embed speed control methods
    changeEmbedSpeed(direction) {
        try {
            this.currentSpeedIndex = Math.max(0, Math.min(this.speeds.length - 1, this.currentSpeedIndex + direction));
            const newSpeed = this.speeds[this.currentSpeedIndex];

            if (newSpeed !== 1) {
                this.lastSpeedIndex = this.currentSpeedIndex;
            }

            this.youtubeEmbedController.setPlaybackRate(newSpeed);
            this.showEmbedSpeedIndicator(newSpeed);
        } catch (error) {
            console.error('[VSC] Error changing embed speed:', error);
        }
    }

    resetEmbedSpeed() {
        try {
            const normalSpeedIndex = this.speeds.indexOf(1);

            if (this.currentSpeedIndex === normalSpeedIndex) {
                if (this.lastSpeedIndex !== undefined && this.lastSpeedIndex !== normalSpeedIndex) {
                    this.currentSpeedIndex = this.lastSpeedIndex;
                } else {
                    this.currentSpeedIndex = normalSpeedIndex;
                }
            } else {
                this.lastSpeedIndex = this.currentSpeedIndex;
                this.currentSpeedIndex = normalSpeedIndex;
            }

            const newSpeed = this.speeds[this.currentSpeedIndex];
            this.youtubeEmbedController.setPlaybackRate(newSpeed);
            this.showEmbedSpeedIndicator(newSpeed);
        } catch (error) {
            console.error('[VSC] Error resetting embed speed:', error);
        }
    }

    showEmbedSpeedIndicator(speed) {
        try {
            if (!this.overlay) return;

            const iframe = this.youtubeEmbedController.getActiveIframe();
            if (!iframe) return;

            const iframeRect = iframe.getBoundingClientRect();
            this.overlay.style.position = 'fixed';
            this.overlay.style.top = `${iframeRect.top + iframeRect.height / 2}px`;
            this.overlay.style.left = `${iframeRect.left + iframeRect.width / 2}px`;
            this.overlay.style.transform = 'translate(-50%, -50%)';

            const speedText = speed === 1 ? 'Normal speed' : `${speed}\u00d7`;
            this.overlay.textContent = speedText;
            this.overlay.style.display = 'block';
            this.overlay.style.opacity = '1';

            this.clearTimeouts();

            this.fadeTimeout = setTimeout(() => {
                try {
                    if (this.overlay) {
                        this.overlay.style.opacity = '0';
                        this.hideTimeout = setTimeout(() => {
                            try {
                                if (this.overlay) {
                                    this.overlay.style.display = 'none';
                                }
                            } catch (hideError) {
                                console.error('Error hiding overlay:', hideError);
                            }
                        }, 1000);
                        this.timeouts.push(this.hideTimeout);
                    }
                } catch (fadeError) {
                    console.error('Error fading overlay:', fadeError);
                }
            }, 1000);
            this.timeouts.push(this.fadeTimeout);
        } catch (error) {
            console.error('[VSC] Error showing embed speed indicator:', error);
        }
    }

    setupEventListeners() {
        try {
            // Import event manager utilities (inline for now)
            const eventListeners = new Map(); // Track listeners to prevent duplicates
            
            const addSafeListener = (element, event, handler, options = {}) => {
                const key = `${element.constructor.name}:${event}:${handler.name || 'anonymous'}`;
                if (eventListeners.has(key)) {
                    console.warn(`Listener already exists: ${key}`);
                    return false;
                }
                
                element.addEventListener(event, handler, options);
                eventListeners.set(key, { element, event, handler, options });
                return true;
            };
            
            const removeSafeListener = (element, event, handler) => {
                const key = `${element.constructor.name}:${event}:${handler.name || 'anonymous'}`;
                if (eventListeners.has(key)) {
                    element.removeEventListener(event, handler);
                    eventListeners.delete(key);
                    return true;
                }
                return false;
            };
            
            const removeAllListeners = () => {
                for (const [key, listener] of eventListeners) {
                    listener.element.removeEventListener(listener.event, listener.handler);
                }
                eventListeners.clear();
            };
            
            // Import DOM utilities (inline for now)
            const getCurrentVideo = () => {
                const videos = Array.from(document.querySelectorAll('video'))
                    .filter(video => video.isConnected && 
                           (video.src || video.currentSrc) && 
                           video.readyState !== HTMLMediaElement.HAVE_NOTHING);
                
                // Try to find currently playing video
                const playingVideo = videos.find(video => !video.paused);
                if (playingVideo) return playingVideo;
                
                // Try to find largest video
                const largestVideo = videos.reduce((largest, video) => {
                    const videoArea = video.offsetWidth * video.offsetHeight;
                    const largestArea = largest ? largest.offsetWidth * largest.offsetHeight : 0;
                    return videoArea > largestArea ? video : largest;
                }, null);
                
                return largestVideo || videos[0] || null;
            };
            
            const isValidElement = (element) => {
                return element && element instanceof Element && element.isConnected && element.nodeType === Node.ELEMENT_NODE;
            };
            
            // Helper to check if a key matches any key in a comma-separated shortcut string
            const matchesShortcut = (pressedKey, shortcutString) => {
                if (!shortcutString) return false;
                const keys = shortcutString.split(',').map(k => k.trim().toLowerCase());
                return keys.includes(pressedKey);
            };

            // Keydown handler
            const keydownHandler = (e) => {
                try {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                    const video = getCurrentVideo();
                    const key = e.key.toLowerCase();
                    let actionTaken = false;

                    // If no direct video found, try YouTube embeds
                    if (!video && this.youtubeEmbedController.hasEmbeds()) {
                        if (matchesShortcut(key, this.settings.shortcuts.speedUp)) {
                            this.changeEmbedSpeed(1);
                            actionTaken = true;
                        } else if (matchesShortcut(key, this.settings.shortcuts.speedDown)) {
                            this.changeEmbedSpeed(-1);
                            actionTaken = true;
                        } else if (matchesShortcut(key, this.settings.shortcuts.reset)) {
                            this.resetEmbedSpeed();
                            actionTaken = true;
                        }

                        if (actionTaken) {
                            this.showControls();
                        }
                        return;
                    }

                    if (!video) return;

                    if (matchesShortcut(key, this.settings.shortcuts.speedUp)) {
                        this.changeSpeed(video, 1);
                        actionTaken = true;
                    } else if (matchesShortcut(key, this.settings.shortcuts.speedDown)) {
                        this.changeSpeed(video, -1);
                        actionTaken = true;
                    } else if (matchesShortcut(key, this.settings.shortcuts.reset)) {
                        // Handle long press for speed inversion
                        if (!this.isLongPressing) {
                            this.startLongPress(video);
                        }
                        actionTaken = true;
                    } else if (matchesShortcut(key, this.settings.shortcuts.skipSilence)) {
                        this.toggleSkipSilence(video);
                        actionTaken = true;
                    }

                    // Show controls when any speed shortcut is used
                    if (actionTaken && this.currentVideo) {
                        this.showControls();
                    }
                } catch (keyHandlerError) {
                    console.error('Error in keydown handler:', keyHandlerError);
                }
            };
            
            // Keyup handler to detect long press release
            const keyupHandler = (e) => {
                try {
                    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                    const key = e.key.toLowerCase();

                    if (matchesShortcut(key, this.settings.shortcuts.reset) && this.isLongPressing) {
                        this.endLongPress(getCurrentVideo());
                    }
                } catch (keyUpError) {
                    console.error('Error in keyup handler:', keyUpError);
                }
            };
            
            // Add keydown listener safely
            addSafeListener(document, 'keydown', keydownHandler);
            addSafeListener(document, 'keyup', keyupHandler);

            // Button click handlers with defensive queries
            const getButton = (selector) => {
                const button = this.controls?.querySelector(selector);
                return isValidElement(button) ? button : null;
            };
            
            const speedDownBtn = getButton('.speed-down');
            const speedUpBtn = getButton('.speed-up');
            const resetBtn = getButton('.speed-reset');
            
            if (speedDownBtn) {
                const speedDownHandler = () => {
                    try {
                        const video = getCurrentVideo();
                        if (video) {
                            this.changeSpeed(video, -1);
                        } else if (this.youtubeEmbedController.hasEmbeds()) {
                            this.changeEmbedSpeed(-1);
                        }
                    } catch (clickError) {
                        console.error('Error in speed down click handler:', clickError);
                    }
                };
                addSafeListener(speedDownBtn, 'click', speedDownHandler);
            }

            if (speedUpBtn) {
                const speedUpHandler = () => {
                    try {
                        const video = getCurrentVideo();
                        if (video) {
                            this.changeSpeed(video, 1);
                        } else if (this.youtubeEmbedController.hasEmbeds()) {
                            this.changeEmbedSpeed(1);
                        }
                    } catch (clickError) {
                        console.error('Error in speed up click handler:', clickError);
                    }
                };
                addSafeListener(speedUpBtn, 'click', speedUpHandler);
            }

            if (resetBtn) {
                const resetHandler = () => {
                    try {
                        const video = getCurrentVideo();
                        if (video) {
                            this.resetSpeed(video);
                        } else if (this.youtubeEmbedController.hasEmbeds()) {
                            this.resetEmbedSpeed();
                        }
                    } catch (clickError) {
                        console.error('Error in reset click handler:', clickError);
                    }
                };
                addSafeListener(resetBtn, 'click', resetHandler);
            }

            const skipSilenceBtn = getButton('.skip-silence');
            if (skipSilenceBtn) {
                const skipSilenceHandler = () => {
                    try {
                        const video = getCurrentVideo();
                        if (video) this.toggleSkipSilence(video);
                    } catch (clickError) {
                        console.error('Error in skip silence click handler:', clickError);
                    }
                };
                addSafeListener(skipSilenceBtn, 'click', skipSilenceHandler);
            }

            const settingsBtn = getButton('.settings');
            if (settingsBtn) {
                const settingsHandler = () => {
                    chrome.runtime.sendMessage({ action: 'openSidePanel' });
                };
                addSafeListener(settingsBtn, 'click', settingsHandler);
            }

            // Listen for settings updates
            const storageHandler = (changes) => {
                try {
                    this.loadSettings();
                } catch (storageError) {
                    console.error('Error handling storage changes:', storageError);
                }
            };
            
            // Add storage listener safely
            if (chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.addListener(storageHandler);
                eventListeners.set('storage:changed', { 
                    element: chrome.storage.onChanged, 
                    event: 'changed', 
                    handler: storageHandler 
                });
            }
            
            // Store cleanup method
            this.removeAllEventListeners = removeAllListeners;
            
        } catch (setupError) {
            console.error('Error setting up event listeners:', setupError);
        }
    }

    resetSpeed(video) {
        try {
            if (!video) {
                console.error('No video element provided to resetSpeed');
                return;
            }
            
            const oldIndex = this.currentSpeedIndex;
            const normalSpeedIndex = this.speeds.indexOf(1);
            
            // Toggle logic: if currently at normal speed, go to last speed; otherwise go to normal speed
            if (this.currentSpeedIndex === normalSpeedIndex) {
                // Currently at normal speed, go to last speed
                if (this.lastSpeedIndex !== undefined && this.lastSpeedIndex !== normalSpeedIndex) {
                    this.currentSpeedIndex = this.lastSpeedIndex;
                } else {
                    // No valid last speed, stay at normal speed
                    this.currentSpeedIndex = normalSpeedIndex;
                }
            } else {
                // Currently not at normal speed, go to normal speed and remember current speed
                this.lastSpeedIndex = this.currentSpeedIndex;
                this.currentSpeedIndex = normalSpeedIndex;
            }
            
            const newSpeed = this.speeds[this.currentSpeedIndex];
            
            // Validate state before applying
            const stateValidation = this.validateCurrentState();
            if (!stateValidation.valid) {
                console.warn('State validation failed before speed reset:', stateValidation.errors);
            }
            
            video.playbackRate = newSpeed;
            this.showSpeedIndicator(newSpeed);
            
            // Record state change
            this.recordCurrentState('speed_toggle');
            
            // Remove this video from active speeds only if resetting to normal speed
            if (this.currentSpeedIndex === normalSpeedIndex) {
                const videoUrl = video.src || window.location.href;
                try {
                    chrome.storage.local.get({ activeSpeeds: {} }, (result) => {
                        try {
                            const activeSpeeds = result.activeSpeeds;
                            delete activeSpeeds[videoUrl];
                            chrome.storage.local.set({ activeSpeeds });
                        } catch (storageError) {
                            console.error('Error updating active speeds:', storageError);
                        }
                    });
                } catch (storageError) {
                    console.error('Error accessing storage:', storageError);
                }
            }
        } catch (error) {
            console.error('Error in resetSpeed:', error);
        }
    };

    changeSpeed(video, direction) {
        try {
            if (!video) {
                console.error('No video element provided to changeSpeed');
                return;
            }
            
            const oldIndex = this.currentSpeedIndex;
            this.currentSpeedIndex = Math.max(0, Math.min(this.speeds.length - 1, this.currentSpeedIndex + direction));
            const newSpeed = this.speeds[this.currentSpeedIndex];
            
            // Track last speed (only if not normal speed)
            if (newSpeed !== 1) {
                this.lastSpeedIndex = this.currentSpeedIndex;
            }
            
            // Validate state before applying
            const stateValidation = this.validateCurrentState();
            if (!stateValidation.valid) {
                console.warn('State validation failed before speed change:', stateValidation.errors);
                // Attempt to repair state
                const repairResult = this.repairCurrentState();
                if (repairResult.valid) {
                    console.log('State repaired successfully');
                } else {
                    console.error('State repair failed, using fallback');
                    this.currentSpeedIndex = this.speeds.indexOf(1);
                }
            }
            
            video.playbackRate = newSpeed;
            this.showSpeedIndicator(newSpeed);
            
            // Record state change
            this.recordCurrentState('speed_change');
            
        } catch (error) {
            console.error('Error in changeSpeed:', error);
        }
    };

    showSpeedIndicator(speed) {
        try {
            if (!this.overlay) {
                console.error('Overlay element not found');
                return;
            }
            
            // Get current video to position overlay over it
            const getCurrentVideo = () => {
                const videos = Array.from(document.querySelectorAll('video'))
                    .filter(video => video.isConnected && 
                           (video.src || video.currentSrc) && 
                           video.readyState !== HTMLMediaElement.HAVE_NOTHING);
                
                // Try to find currently playing video
                const playingVideo = videos.find(video => !video.paused);
                if (playingVideo) return playingVideo;
                
                // Try to find largest video
                const largestVideo = videos.reduce((largest, video) => {
                    const videoArea = video.offsetWidth * video.offsetHeight;
                    const largestArea = largest ? largest.offsetWidth * largest.offsetHeight : 0;
                    return videoArea > largestArea ? video : largest;
                }, null);
                
                return largestVideo || videos[0] || null;
            };
            
            const video = getCurrentVideo();
            if (!video) {
                console.warn('No video found for overlay positioning');
                return;
            }
            
            // Position overlay over the video
            const videoRect = video.getBoundingClientRect();
            this.overlay.style.position = 'fixed';
            this.overlay.style.top = `${videoRect.top + videoRect.height / 2}px`;
            this.overlay.style.left = `${videoRect.left + videoRect.width / 2}px`;
            this.overlay.style.transform = 'translate(-50%, -50%)';
            
            const speedText = speed === 1 ? 'Normal speed' : `${speed}×`;
            this.overlay.textContent = speedText;
            this.overlay.style.display = 'block';
            this.overlay.style.opacity = '1';

            // Clear any existing timeouts
            this.clearTimeouts();

            // Create new timeouts and track them
            this.fadeTimeout = setTimeout(() => {
                try {
                    if (this.overlay) {
                        this.overlay.style.opacity = '0';
                        // Hide completely after fade animation (1 second)
                        this.hideTimeout = setTimeout(() => {
                            try {
                                if (this.overlay) {
                                    this.overlay.style.display = 'none';
                                }
                            } catch (hideError) {
                                console.error('Error hiding overlay:', hideError);
                            }
                        }, 1000);
                        this.timeouts.push(this.hideTimeout);
                    }
                } catch (fadeError) {
                    console.error('Error fading overlay:', fadeError);
                }
            }, 1000);
            this.timeouts.push(this.fadeTimeout);
        } catch (error) {
            console.error('Error in showSpeedIndicator:', error);
        }
    };

    showSkipIndicator(skipDuration) {
        const seconds = Math.round(skipDuration);
        this.showOverlayMessage(`Skipped ${seconds}s`);
    }

    showOverlayMessage(message) {
        try {
            if (!this.overlay) {
                console.error('Overlay element not found');
                return;
            }

            // Get current video to position overlay over it
            const getCurrentVideo = () => {
                const videos = Array.from(document.querySelectorAll('video'))
                    .filter(video => video.isConnected &&
                           (video.src || video.currentSrc) &&
                           video.readyState !== HTMLMediaElement.HAVE_NOTHING);

                const playingVideo = videos.find(video => !video.paused);
                if (playingVideo) return playingVideo;

                const largestVideo = videos.reduce((largest, video) => {
                    const videoArea = video.offsetWidth * video.offsetHeight;
                    const largestArea = largest ? largest.offsetWidth * largest.offsetHeight : 0;
                    return videoArea > largestArea ? video : largest;
                }, null);

                return largestVideo || videos[0] || null;
            };

            const video = getCurrentVideo();
            if (!video) {
                console.warn('No video found for overlay positioning');
                return;
            }

            // Position overlay over the video
            const videoRect = video.getBoundingClientRect();
            this.overlay.style.position = 'fixed';
            this.overlay.style.top = `${videoRect.top + videoRect.height / 2}px`;
            this.overlay.style.left = `${videoRect.left + videoRect.width / 2}px`;
            this.overlay.style.transform = 'translate(-50%, -50%)';

            this.overlay.textContent = message;
            this.overlay.style.display = 'block';
            this.overlay.style.opacity = '1';

            // Clear any existing timeouts
            this.clearTimeouts();

            // Create new timeouts and track them
            this.fadeTimeout = setTimeout(() => {
                try {
                    if (this.overlay) {
                        this.overlay.style.opacity = '0';
                        this.hideTimeout = setTimeout(() => {
                            try {
                                if (this.overlay) {
                                    this.overlay.style.display = 'none';
                                }
                            } catch (hideError) {
                                console.error('Error hiding overlay:', hideError);
                            }
                        }, 1000);
                        this.timeouts.push(this.hideTimeout);
                    }
                } catch (fadeError) {
                    console.error('Error fading overlay:', fadeError);
                }
            }, 1000);
            this.timeouts.push(this.fadeTimeout);
        } catch (error) {
            console.error('Error in showOverlayMessage:', error);
        }
    }

    toggleSkipSilence(video) {
        if (!video) {
            console.error('No video element provided to toggleSkipSilence');
            return;
        }

        const result = this.silenceSkipper.toggle(video);
        this.showOverlayMessage(result.message);
        this.updateSkipSilenceButton(result.enabled, result.unavailable);

        return result;
    }

    updateSkipSilenceButton(enabled, unavailable = false) {
        const skipBtn = this.controls?.querySelector('.skip-silence');
        if (!skipBtn) return;

        skipBtn.classList.toggle('active', enabled);
        skipBtn.classList.toggle('unavailable', unavailable);

        if (unavailable) {
            skipBtn.title = 'No captions available';
        } else if (enabled) {
            skipBtn.title = 'Skip Silence: On';
        } else {
            skipBtn.title = 'Skip sections without captions';
        }
    }

    // Resource cleanup methods
    clearTimeouts() {
        if (this.fadeTimeout) {
            clearTimeout(this.fadeTimeout);
            this.fadeTimeout = null;
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        if (this.controlsTimeout) {
            clearTimeout(this.controlsTimeout);
            this.controlsTimeout = null;
        }
        
        // Clear all tracked timeouts
        this.timeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.timeouts = [];
    }

    removeEventListeners() {
        try {
            // Use the new cleanup method if available
            if (this.removeAllEventListeners) {
                this.removeAllEventListeners();
                return;
            }
            
            // Fallback to original cleanup method
            // Remove all tracked event listeners
            this.eventListeners.forEach(({ element, event, handler }) => {
                try {
                    element.removeEventListener(event, handler);
                } catch (error) {
                    console.warn('Error removing event listener:', error);
                }
            });
            this.eventListeners = [];
            
            // Remove storage listeners
            this.storageListeners.forEach(listener => {
                try {
                    chrome.storage.onChanged.removeListener(listener);
                } catch (error) {
                    console.warn('Error removing storage listener:', error);
                }
            });
            this.storageListeners = [];
        } catch (error) {
            console.error('Error removing event listeners:', error);
        }
    }

    removeDOMElements() {
        try {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
            if (this.controls && this.controls.parentNode) {
                this.controls.parentNode.removeChild(this.controls);
            }
            this.overlay = null;
            this.controls = null;
        } catch (error) {
            console.error('Error removing DOM elements:', error);
        }
    }

    setupVideoDetection() {
        // Periodically check for video presence and update controls visibility
        this.videoCheckInterval = setInterval(() => {
            this.updateControlsVisibilityBasedOnVideo();
        }, 1000); // Check every second for responsiveness

        // Set up a MutationObserver to detect when videos or iframes are added/removed
        const observer = new MutationObserver((mutations) => {
            // Check if any video or iframe elements were added
            let mediaAdded = false;
            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeName === 'VIDEO' || node.nodeName === 'IFRAME' ||
                            (node.querySelectorAll && (node.querySelectorAll('video').length > 0 || node.querySelectorAll('iframe').length > 0))) {
                            mediaAdded = true;
                        }
                    });
                }
            }

            if (mediaAdded) {
                // Wait a bit for video/iframe to initialize then check
                setTimeout(() => this.updateControlsVisibilityBasedOnVideo(), 100);
            } else {
                this.updateControlsVisibilityBasedOnVideo();
            }
        });

        // Observe the entire document for added/removed video elements
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // Store observer for cleanup
        this.videoObserver = observer;

        // Listen for play/pause events on all current and future videos
        this.setupVideoEventListeners();
    }

    setupVideoEventListeners() {
        // Add event listeners to all existing videos
        const addListenersToVideo = (video) => {
            if (video._vscListenersAdded) return; // Avoid duplicate listeners

            const playHandler = () => this.updateControlsVisibilityBasedOnVideo();
            const pauseHandler = () => {
                this.updateControlsVisibilityBasedOnVideo();

                // Reset speed to 1x if pausingResetsSpeed is enabled
                if (this.settings && this.settings.pausingResetsSpeed) {
                    video.playbackRate = 1.0;
                    this.currentSpeedIndex = this.speeds.indexOf(1);
                    this.showOverlay('1×');
                }
            };

            video.addEventListener('play', playHandler);
            video.addEventListener('pause', pauseHandler);

            // Mark this video as having listeners
            video._vscListenersAdded = true;
        };

        // Add listeners to all current videos
        document.querySelectorAll('video').forEach(addListenersToVideo);

        // Set up observer to add listeners to newly added videos
        const videoEventObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeName === 'VIDEO') {
                        addListenersToVideo(node);
                    } else if (node.querySelectorAll) {
                        node.querySelectorAll('video').forEach(addListenersToVideo);
                    }
                });
            }
        });

        videoEventObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        this.videoEventObserver = videoEventObserver;
    }

    setupCleanupHandlers() {
        // Cleanup on page unload
        const cleanupHandler = () => {
            this.cleanup();
        };

        window.addEventListener('beforeunload', cleanupHandler);
        this.eventListeners.push({ element: window, event: 'beforeunload', handler: cleanupHandler });

        // Cleanup on page visibility change (when user navigates away)
        const visibilityHandler = () => {
            if (document.visibilityState === 'hidden') {
                this.clearTimeouts();
            }
        };

        document.addEventListener('visibilitychange', visibilityHandler);
        this.eventListeners.push({ element: document, event: 'visibilitychange', handler: visibilityHandler });
    }

    cleanup() {
        try {
            console.log('Cleaning up VideoSpeedController resources');

            this.clearTimeouts();
            this.removeEventListeners();
            this.removeDOMElements();

            // Disable silence skipper
            if (this.silenceSkipper) {
                this.silenceSkipper.disable();
            }

            // Clean up YouTube embed controller
            if (this.youtubeEmbedController) {
                this.youtubeEmbedController.cleanup();
            }

            // Clear video detection interval
            if (this.videoCheckInterval) {
                clearInterval(this.videoCheckInterval);
                this.videoCheckInterval = null;
            }

            // Disconnect video observers
            if (this.videoObserver) {
                this.videoObserver.disconnect();
                this.videoObserver = null;
            }

            if (this.videoEventObserver) {
                this.videoEventObserver.disconnect();
                this.videoEventObserver = null;
            }

            // Clear references
            this.settings = null;
            this.speeds = null;

        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }

    // State validation methods
    validateCurrentState() {
        try {
            const state = {
                speeds: this.speeds,
                currentSpeedIndex: this.currentSpeedIndex,
                settings: this.settings
            };
            
            // Basic validation
            const errors = [];
            
            // Validate speeds
            if (!Array.isArray(this.speeds)) {
                errors.push('Speeds is not an array');
            } else if (this.speeds.length === 0) {
                errors.push('Speeds array is empty');
            } else {
                for (let i = 0; i < this.speeds.length; i++) {
                    const speed = this.speeds[i];
                    if (typeof speed !== 'number' || isNaN(speed)) {
                        errors.push(`Speed at index ${i} is not a valid number`);
                    } else if (speed < 0.05 || speed > 16) {
                        errors.push(`Speed at index ${i} (${speed}) is out of range`);
                    }
                }
                
                // Check for duplicates
                const uniqueSpeeds = [...new Set(this.speeds)];
                if (uniqueSpeeds.length !== this.speeds.length) {
                    errors.push('Speeds array contains duplicates');
                }
            }
            
            // Validate current speed index
            if (typeof this.currentSpeedIndex !== 'number' || isNaN(this.currentSpeedIndex)) {
                errors.push('Current speed index is not a number');
            } else if (this.currentSpeedIndex < 0 || this.currentSpeedIndex >= this.speeds.length) {
                errors.push('Current speed index is out of bounds');
            }
            
            // Validate settings
            if (!this.settings || typeof this.settings !== 'object') {
                errors.push('Settings is not a valid object');
            } else {
                // Validate shortcuts (supports comma-separated keys)
                if (!this.settings.shortcuts || typeof this.settings.shortcuts !== 'object') {
                    errors.push('Shortcuts is not a valid object');
                } else {
                    const requiredKeys = ['speedUp', 'speedDown', 'reset', 'skipSilence'];
                    for (const key of requiredKeys) {
                        if (!(key in this.settings.shortcuts)) {
                            // skipSilence is optional for backwards compatibility
                            if (key !== 'skipSilence') {
                                errors.push(`Missing shortcut: ${key}`);
                            }
                        } else if (typeof this.settings.shortcuts[key] !== 'string' || this.settings.shortcuts[key].length === 0) {
                            errors.push(`Invalid shortcut for ${key}`);
                        }
                    }

                    // Check for duplicate shortcuts across all key lists
                    const allKeys = {};
                    for (const [action, shortcutString] of Object.entries(this.settings.shortcuts)) {
                        if (typeof shortcutString === 'string') {
                            const keys = shortcutString.split(',').map(k => k.trim().toLowerCase());
                            for (const singleKey of keys) {
                                if (allKeys[singleKey] && allKeys[singleKey] !== action) {
                                    errors.push(`Key "${singleKey}" is used by multiple actions`);
                                } else {
                                    allKeys[singleKey] = action;
                                }
                            }
                        }
                    }
                }
                
                // Validate boolean settings
                ['enableNumberShortcuts', 'showSpeedButtons', 'showShortcutHints'].forEach(key => {
                    if (typeof this.settings[key] !== 'boolean') {
                        errors.push(`${key} must be a boolean`);
                    }
                });
            }
            
            return {
                valid: errors.length === 0,
                errors,
                state
            };
        } catch (error) {
            return {
                valid: false,
                errors: [`Validation error: ${error.message}`],
                state: null
            };
        }
    }

    repairCurrentState() {
        try {
            const repairs = [];
            
            // Repair speeds
            if (!Array.isArray(this.speeds) || this.speeds.length === 0) {
                this.speeds = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4, 8, 16];
                repairs.push('Reset speeds to defaults');
            } else {
                // Remove invalid speeds
                const validSpeeds = this.speeds.filter(speed => 
                    typeof speed === 'number' && 
                    !isNaN(speed) && 
                    speed >= 0.05 && 
                    speed <= 16
                );
                
                // Remove duplicates and sort
                const uniqueSpeeds = [...new Set(validSpeeds)].sort((a, b) => a - b);
                
                if (uniqueSpeeds.length !== this.speeds.length) {
                    this.speeds = uniqueSpeeds;
                    repairs.push('Cleaned and sorted speeds array');
                }
            }
            
            // Repair current speed index
            if (typeof this.currentSpeedIndex !== 'number' || 
                this.currentSpeedIndex < 0 || 
                this.currentSpeedIndex >= this.speeds.length) {
                this.currentSpeedIndex = this.speeds.indexOf(1);
                if (this.currentSpeedIndex === -1) {
                    this.currentSpeedIndex = Math.floor(this.speeds.length / 2);
                }
                repairs.push('Reset current speed index');
            }
            
            // Repair settings
            if (!this.settings || typeof this.settings !== 'object') {
                this.settings = {
                    ...DEFAULT_SETTINGS,
                    customSpeeds: this.speeds
                };
                repairs.push('Reset settings to defaults');
            } else {
                // Repair shortcuts (supports comma-separated keys)
                if (!this.settings.shortcuts || typeof this.settings.shortcuts !== 'object') {
                    this.settings.shortcuts = DEFAULT_SETTINGS.shortcuts;
                    repairs.push('Reset shortcuts to defaults');
                } else {
                    const defaultShortcuts = DEFAULT_SETTINGS.shortcuts;
                    for (const [key, defaultValue] of Object.entries(defaultShortcuts)) {
                        if (!(key in this.settings.shortcuts) ||
                            typeof this.settings.shortcuts[key] !== 'string' ||
                            this.settings.shortcuts[key].length === 0) {
                            this.settings.shortcuts[key] = defaultValue;
                            repairs.push(`Repaired shortcut: ${key}`);
                        }
                    }
                }
                
                // Repair boolean settings
                ['enableNumberShortcuts', 'showSpeedButtons', 'showShortcutHints'].forEach(key => {
                    if (typeof this.settings[key] !== 'boolean') {
                        this.settings[key] = true;
                        repairs.push(`Repaired boolean setting: ${key}`);
                    }
                });
            }
            
            const validation = this.validateCurrentState();
            return {
                valid: validation.valid,
                repairs,
                errors: validation.errors
            };
        } catch (error) {
            return {
                valid: false,
                repairs: [],
                errors: [`Repair error: ${error.message}`]
            };
        }
    }

    recordCurrentState(action) {
        try {
            const state = {
                speeds: this.speeds,
                currentSpeedIndex: this.currentSpeedIndex,
                settings: this.settings,
                timestamp: Date.now(),
                action
            };
            
            // Store in a simple history (limited size)
            if (!this.stateHistory) {
                this.stateHistory = [];
            }
            
            this.stateHistory.push(state);
            
            // Limit history size
            if (this.stateHistory.length > 20) {
                this.stateHistory.shift();
            }
        } catch (error) {
            console.error('Error recording state:', error);
        }
    }
}

// Initialize the controller
new VideoSpeedController();
