class VideoSpeedController {
    constructor() {
        this.defaultSpeeds = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10];
        this.speeds = [...this.defaultSpeeds];
        this.currentSpeedIndex = this.speeds.indexOf(1);
        this.overlay = this.createOverlay();
        this.loadCustomSpeeds();
        this.setupEventListeners();
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'video-speed-overlay';
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        return overlay;
    }

    async loadCustomSpeeds() {
        const result = await chrome.storage.sync.get('customSpeeds');
        if (result.customSpeeds) {
            this.speeds = [...new Set([...this.defaultSpeeds, ...result.customSpeeds])].sort((a, b) => a - b);
            this.currentSpeedIndex = this.speeds.indexOf(1);
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            const video = document.querySelector('video');
            if (!video) return;

            if (e.key === 's') {
                this.changeSpeed(video, -1);
            } else if (e.key === 'd') {
                this.changeSpeed(video, 1);
            }
        });

        // Listen for custom speed updates
        chrome.storage.onChanged.addListener((changes) => {
            if (changes.customSpeeds) {
                this.loadCustomSpeeds();
            }
        });
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
