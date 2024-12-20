class VideoSpeedController {
    constructor() {
        this.defaultSpeeds = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10];
        this.speeds = [...this.defaultSpeeds];
        this.currentSpeedIndex = this.speeds.indexOf(1);
        this.previousSpeedIndex = null;
        this.longPressTimer = null;
        this.settings = null;
        this.overlay = this.createOverlay();
        this.controls = this.createControls();
        this.loadSettings();
        this.setupEventListeners();
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
        controls.innerHTML = `
            <button class="speed-down" title="Decrease speed">
                <span class="icon">-</span>
                <span class="shortcut"></span>
            </button>
            <button class="speed-reset" title="Reset to normal speed">
                <span class="icon">1×</span>
                <span class="shortcut"></span>
            </button>
            <button class="speed-up" title="Increase speed">
                <span class="icon">+</span>
                <span class="shortcut"></span>
            </button>
        `;
        document.body.appendChild(controls);
        return controls;
    }

    async loadSettings() {
        const defaultSettings = {
            customSpeeds: this.defaultSpeeds,
            shortcuts: {
                speedUp: 'd',
                speedDown: 's',
                reset: 'r'
            },
            enableNumberShortcuts: true,
            showSpeedButtons: true,
            showShortcutHints: true
        };

        const result = await chrome.storage.sync.get(defaultSettings);
        this.settings = result;
        this.speeds = [...new Set([...this.defaultSpeeds, ...result.customSpeeds])].sort((a, b) => a - b);
        this.currentSpeedIndex = this.speeds.indexOf(1);
        this.updateControlsVisibility();
        this.updateShortcutHints();
    }

    updateControlsVisibility() {
        this.controls.style.display = this.settings.showSpeedButtons ? 'flex' : 'none';
    }

    updateShortcutHints() {
        if (this.settings.showShortcutHints) {
            this.controls.querySelector('.speed-down .shortcut').textContent = `[${this.settings.shortcuts.speedDown}]`;
            this.controls.querySelector('.speed-reset .shortcut').textContent = `[${this.settings.shortcuts.reset}]`;
            this.controls.querySelector('.speed-up .shortcut').textContent = `[${this.settings.shortcuts.speedUp}]`;
        } else {
            this.controls.querySelectorAll('.shortcut').forEach(el => el.textContent = '');
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const video = document.querySelector('video');
            if (!video) return;

            const key = e.key.toLowerCase();
            
            if (key === this.settings.shortcuts.speedUp) {
                this.changeSpeed(video, 1);
            } else if (key === this.settings.shortcuts.speedDown) {
                this.changeSpeed(video, -1);
            } else if (key === this.settings.shortcuts.reset) {
                this.resetSpeed(video);
            } else if (this.settings.enableNumberShortcuts && /^[1-9]$/.test(key)) {
                this.jumpToSpeed(video, parseInt(key) - 1);
            }
        });

        // Button click handlers
        this.controls.querySelector('.speed-down').addEventListener('click', () => {
            const video = document.querySelector('video');
            if (video) this.changeSpeed(video, -1);
        });

        this.controls.querySelector('.speed-up').addEventListener('click', () => {
            const video = document.querySelector('video');
            if (video) this.changeSpeed(video, 1);
        });

        this.controls.querySelector('.speed-reset').addEventListener('click', () => {
            const video = document.querySelector('video');
            if (video) this.resetSpeed(video);
        });

        // Listen for settings updates
        chrome.storage.onChanged.addListener((changes) => {
            this.loadSettings();
        });
    }

    resetSpeed(video) {
        this.currentSpeedIndex = this.speeds.indexOf(1);
        video.playbackRate = 1;
        this.showSpeedIndicator(1);
    }

    jumpToSpeed(video, index) {
        if (index >= 0 && index < this.speeds.length) {
            this.currentSpeedIndex = index;
            const newSpeed = this.speeds[this.currentSpeedIndex];
            video.playbackRate = newSpeed;
            this.showSpeedIndicator(newSpeed);
        }
    }

    changeSpeed(video, direction) {
        this.currentSpeedIndex = Math.max(0, Math.min(this.speeds.length - 1, this.currentSpeedIndex + direction));
        const newSpeed = this.speeds[this.currentSpeedIndex];
        video.playbackRate = newSpeed;
        this.showSpeedIndicator(newSpeed);
    }

    showSpeedIndicator(speed) {
        const speedText = speed === 1 ? 'Normal speed' : `${speed}×`;
        this.overlay.textContent = speedText;
        this.overlay.style.display = 'block';
        this.overlay.style.opacity = '1';

        // Clear any existing timeouts
        if (this.fadeTimeout) clearTimeout(this.fadeTimeout);
        if (this.hideTimeout) clearTimeout(this.hideTimeout);

        // Start fade after 1 second
        this.fadeTimeout = setTimeout(() => {
            this.overlay.style.opacity = '0';
            // Hide completely after fade animation (1 second)
            this.hideTimeout = setTimeout(() => {
                this.overlay.style.display = 'none';
            }, 1000);
        }, 1000);
    }
}

// Initialize the controller
new VideoSpeedController();
