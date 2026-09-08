import browser from 'webextension-polyfill';
import { DEFAULT_SPEEDS, DEFAULT_SETTINGS, type Settings } from '~/utils/constants';
import { YouTubeEmbedController } from '~/utils/youtube-embed';
import { safeStorageGet, safeStorageSet } from '~/utils/storage';
import '~/styles/content.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  main() {
    // Initialize the controller
    new VideoSpeedController();
  },
});

interface Cue {
  startTime: number;
  endTime: number;
  text: string;
}

interface Gap {
  start: number;
  end: number;
}

class CaptionExtractor {
  private video: HTMLVideoElement;

  constructor(video: HTMLVideoElement) {
    this.video = video;
  }

  extractCues(): Cue[] {
    const cues: Cue[] = [];

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
            const cue = track.cues[j] as VTTCue;
            cues.push({
              startTime: cue.startTime,
              endTime: cue.endTime || cue.startTime + 5,
              text: cue.text || '',
            });
          }
        }
      }
    }

    // Sort by start time and remove duplicates
    cues.sort((a, b) => a.startTime - b.startTime);

    // Merge overlapping cues
    const mergedCues: Cue[] = [];
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

  hasCaptions(): boolean {
    if (!this.video || !this.video.textTracks) {
      console.log('[VSC] No video or textTracks');
      return false;
    }

    console.log('[VSC] Checking', this.video.textTracks.length, 'text tracks');

    for (let i = 0; i < this.video.textTracks.length; i++) {
      const track = this.video.textTracks[i];
      console.log(
        '[VSC] Track',
        i,
        '- kind:',
        track.kind,
        'mode:',
        track.mode,
        'cues:',
        track.cues?.length || 0
      );

      // Check tracks that are captions or subtitles
      if (track.kind === 'captions' || track.kind === 'subtitles') {
        // If track is disabled, try enabling it temporarily to load cues
        const wasDisabled = track.mode === 'disabled';
        if (wasDisabled) {
          track.mode = 'hidden';
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
  private controller: VideoSpeedController;
  private enabled: boolean;
  private gaps: Gap[];
  private timeUpdateHandler: (() => void) | null;
  private video: HTMLVideoElement | null;
  private gapThreshold: number;
  private lastSkipTime: number;
  private skipCooldown: number;

  constructor(controller: VideoSpeedController) {
    this.controller = controller;
    this.enabled = false;
    this.gaps = [];
    this.timeUpdateHandler = null;
    this.video = null;
    this.gapThreshold = 5;
    this.lastSkipTime = 0;
    this.skipCooldown = 0.5;
  }

  computeGaps(cues: Cue[], videoDuration: number): Gap[] {
    const gaps: Gap[] = [];

    if (!cues || cues.length === 0) {
      return gaps;
    }

    // Check gap at start of video
    if (cues[0].startTime > this.gapThreshold) {
      gaps.push({
        start: 0,
        end: cues[0].startTime,
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
          end: gapEnd,
        });
      }
    }

    // Check gap at end of video (only if we know the duration)
    if (videoDuration && cues.length > 0) {
      const lastCueEnd = cues[cues.length - 1].endTime;
      if (videoDuration - lastCueEnd > this.gapThreshold) {
        gaps.push({
          start: lastCueEnd,
          end: videoDuration,
        });
      }
    }

    return gaps;
  }

  toggle(video: HTMLVideoElement): { enabled: boolean; message: string; unavailable?: boolean; gapCount?: number } {
    if (this.enabled) {
      this.disable();
      return { enabled: false, message: 'Skip Silence: Off' };
    } else {
      return this.enable(video);
    }
  }

  enable(video: HTMLVideoElement): { enabled: boolean; message: string; unavailable?: boolean; gapCount?: number } {
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

  disable(): void {
    if (this.video && this.timeUpdateHandler) {
      this.video.removeEventListener('timeupdate', this.timeUpdateHandler);
    }
    this.enabled = false;
    this.gaps = [];
    this.video = null;
    this.timeUpdateHandler = null;
  }

  onTimeUpdate(): void {
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

  isInGap(time: number): boolean {
    for (const gap of this.gaps) {
      if (time >= gap.start && time < gap.end) {
        return true;
      }
    }
    return false;
  }
}

class VideoSpeedController {
  private defaultSpeeds: number[];
  private speeds: number[];
  private currentSpeedIndex: number;
  private previousSpeedIndex: number | null;
  private lastSpeedIndex: number;
  private longPressTimer: number | null;
  public settings: Settings | null;
  private overlay: HTMLDivElement;
  private controls: HTMLDivElement;
  private helpOverlay: HTMLDivElement;
  private helpOverlayVisible: boolean;
  private currentVideo: HTMLVideoElement | null;
  private controlsTimeout: number | null;
  private hideAfterLeaveTimeout: number | null;
  private isMouseOverVideo: boolean;
  private isMouseOverControls: boolean;
  private youtubePlayer: Element | null;
  private youtubeChromeObserver: MutationObserver | null;
  private isLongPressing: boolean;
  private speedBeforeLongPress: number | null;
  private longPressStartTime: number | null;
  private timeouts: number[];
  private eventListeners: Array<{ element: EventTarget; event: string; handler: EventListener }>;
  private storageListeners: Array<(changes: any, areaName: string) => void>;
  private videoCheckInterval: number | null;
  private silenceSkipper: SilenceSkipper;
  private youtubeEmbedController: YouTubeEmbedController;
  private fadeTimeout: number | null;
  private hideTimeout: number | null;
  private videoObserver: MutationObserver | null;
  private videoEventObserver: MutationObserver | null;

  constructor() {
    this.defaultSpeeds = DEFAULT_SPEEDS;
    this.speeds = [...this.defaultSpeeds];
    this.currentSpeedIndex = this.speeds.indexOf(1);
    this.previousSpeedIndex = null;
    this.lastSpeedIndex = this.currentSpeedIndex;
    this.longPressTimer = null;
    this.settings = null;
    this.overlay = this.createOverlay();
    this.controls = this.createControls();
    this.helpOverlay = this.createHelpOverlay();
    this.helpOverlayVisible = false;
    this.currentVideo = null;
    this.controlsTimeout = null;
    this.hideAfterLeaveTimeout = null;
    this.isMouseOverVideo = false;
    this.isMouseOverControls = false;
    this.youtubePlayer = null;
    this.youtubeChromeObserver = null;
    this.isLongPressing = false;
    this.speedBeforeLongPress = null;
    this.longPressStartTime = null;

    this.timeouts = [];
    this.eventListeners = [];
    this.storageListeners = [];
    this.videoCheckInterval = null;

    this.fadeTimeout = null;
    this.hideTimeout = null;
    this.videoObserver = null;
    this.videoEventObserver = null;

    this.silenceSkipper = new SilenceSkipper(this);

    this.youtubeEmbedController = new YouTubeEmbedController();
    this.youtubeEmbedController.init();

    this.loadSettings();
    this.setupEventListeners();
    this.setupCleanupHandlers();
    this.setupVideoDetection();
  }

  private createOverlay(): HTMLDivElement {
    const overlay = document.createElement('div');
    overlay.className = 'video-speed-overlay';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    return overlay;
  }

  private createControls(): HTMLDivElement {
    const controls = document.createElement('div');
    controls.className = 'video-speed-controls';
    controls.style.display = 'none';
    controls.innerHTML = `
      <button class="settings" type="button" aria-label="Speed preferences">
        Speed preferences
      </button>
    `;
    document.body.appendChild(controls);

    controls.addEventListener('mouseenter', () => {
      this.isMouseOverControls = true;
      this.cancelScheduledHideControls();
      this.showControls();
    });
    controls.addEventListener('mouseleave', () => {
      this.isMouseOverControls = false;
      this.scheduleHideControlsAfterLeave();
    });

    return controls;
  }

  private createHelpOverlay(): HTMLDivElement {
    const help = document.createElement('div');
    help.className = 'video-speed-help';
    help.setAttribute('role', 'dialog');
    help.setAttribute('aria-label', 'Keyboard shortcuts');
    help.innerHTML = `
      <h2>Keyboard shortcuts</h2>
      <dl></dl>
      <p class="help-note">Press Escape or click outside to close. Press ? to show this again.</p>
    `;
    document.body.appendChild(help);
    return help;
  }

  private formatShortcutList(shortcutString?: string): string {
    if (!shortcutString) return '—';
    return shortcutString
      .split(',')
      .map((k) => k.trim().toUpperCase())
      .filter(Boolean)
      .join(', ');
  }

  private refreshHelpOverlay(): void {
    if (!this.helpOverlay || !this.settings?.shortcuts) return;
    const list = this.helpOverlay.querySelector('dl');
    if (!list) return;
    const rows: Array<[string, string]> = [
      ['Slow down', this.formatShortcutList(this.settings.shortcuts.speedDown)],
      ['Speed up', this.formatShortcutList(this.settings.shortcuts.speedUp)],
      ['Reset / toggle 1×', this.formatShortcutList(this.settings.shortcuts.reset)],
      ['Show this help', '?'],
    ];
    list.replaceChildren(
      ...rows.flatMap(([action, keys]) => {
        const dt = document.createElement('dt');
        dt.textContent = action;
        const dd = document.createElement('dd');
        dd.textContent = keys;
        return [dt, dd];
      })
    );
  }

  private showHelpOverlay(): void {
    this.refreshHelpOverlay();
    if (!this.helpOverlay) return;
    this.helpOverlay.classList.add('visible');
    this.helpOverlayVisible = true;
  }

  private hideHelpOverlay(): void {
    if (!this.helpOverlay) return;
    this.helpOverlay.classList.remove('visible');
    this.helpOverlayVisible = false;
  }

  private toggleHelpOverlay(): void {
    if (this.helpOverlayVisible) {
      this.hideHelpOverlay();
    } else {
      this.showHelpOverlay();
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const storageResult = await safeStorageGet<Settings>(null, DEFAULT_SETTINGS);
      if (!storageResult.success) {
        throw new Error(storageResult.error?.message || 'Failed to load settings');
      }

      const result = storageResult.result!;

      const shortcuts = {
        ...DEFAULT_SETTINGS.shortcuts,
        ...result.shortcuts,
      };
      delete (shortcuts as any).skipSilence;
      
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...result,
        shortcuts,
      };

      const validSpeeds = this.settings.customSpeeds.filter(
        (speed) => !isNaN(speed) && speed >= 0.05 && speed <= 16
      );

      this.speeds = [...new Set(validSpeeds)].sort((a, b) => a - b);
      this.currentSpeedIndex = this.speeds.indexOf(1);

      this.updateControlsVisibility();
      this.updateShortcutHints();
      this.refreshHelpOverlay();

      if (validSpeeds.length !== this.settings.customSpeeds.length) {
        this.settings.customSpeeds = validSpeeds;
        try {
          const saveResult = await safeStorageSet({ customSpeeds: validSpeeds });
          if (!saveResult.success) {
            console.warn('Could not save validated settings:', saveResult.error);
          }
        } catch (saveError) {
          console.error('Error saving validated settings:', saveError);
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.settings = DEFAULT_SETTINGS;
      this.speeds = [...this.defaultSpeeds];
      this.currentSpeedIndex = this.speeds.indexOf(1);
      try {
        this.updateControlsVisibility();
        this.updateShortcutHints();
        this.refreshHelpOverlay();
      } catch (uiError) {
        console.error('Error updating UI with fallback settings:', uiError);
      }
    }
  }

  private updateControlsVisibility(): void {
    try {
      this.updateControlsVisibilityBasedOnVideo();
    } catch (error) {
      console.error('Error updating controls visibility:', error);
    }
  }

  private updateShortcutHints(): void {
    try {
      if (!this.controls || !this.settings) return;
      const settingsBtn = this.controls.querySelector('.settings') as HTMLButtonElement;
      if (settingsBtn && settingsBtn.isConnected) {
        settingsBtn.title = 'Speed preferences';
      }
      this.refreshHelpOverlay();
    } catch (error) {
      console.error('Error updating shortcut hints:', error);
    }
  }

  private updateControlsVisibilityBasedOnVideo(): void {
    try {
      if (!this.controls || !this.settings) return;

      if (!this.settings.showSpeedButtons) {
        this.controls.style.display = 'none';
        return;
      }

      const pickLargest = (videos: HTMLVideoElement[]): HTMLVideoElement | null => {
        if (videos.length === 0) return null;
        if (videos.length === 1) return videos[0];
        return videos.reduce((largest, video) => {
          const videoArea = video.offsetWidth * video.offsetHeight;
          const largestArea = largest ? largest.offsetWidth * largest.offsetHeight : 0;
          return videoArea > largestArea ? video : largest;
        }, null as HTMLVideoElement | null);
      };

      const readyVideos = Array.from(document.querySelectorAll('video')).filter(
        (video) =>
          video.isConnected &&
          (video.src || video.currentSrc) &&
          video.readyState !== HTMLMediaElement.HAVE_NOTHING
      ) as HTMLVideoElement[];

      const playingVideo = pickLargest(readyVideos.filter((video) => !video.paused));
      const youtubeVideo = pickLargest(
        readyVideos.filter((video) => video.closest('.html5-video-player'))
      );
      const activeVideo = playingVideo || youtubeVideo;
      this.currentVideo = activeVideo;

      if (activeVideo) {
        this.positionControlsInsideVideo(activeVideo);
        this.setupVideoMouseListeners(activeVideo);
        this.ensureYouTubePreferencesLink(activeVideo.closest('.html5-video-player'));
        if (this.isMouseOverVideo || this.isMouseOverControls) {
          this.showControls();
        }
      } else if (this.youtubeEmbedController && this.youtubeEmbedController.hasEmbeds()) {
        const iframe = this.youtubeEmbedController.getActiveIframe();
        if (iframe) {
          this.positionControlsInsideIframe(iframe);
          this.setupIframeMouseListeners(iframe);
          if (this.isMouseOverVideo || this.isMouseOverControls) {
            this.showControls();
          }
        } else {
          this.teardownYouTubeChromeObserver();
          this.controls.style.display = 'none';
        }
      } else {
        this.teardownYouTubeChromeObserver();
        this.controls.style.display = 'none';
        this.currentVideo = null;
      }
    } catch (error) {
      console.error('Error updating controls visibility based on video:', error);
    }
  }

  private positionControlsInsideVideo(video: HTMLVideoElement): void {
    try {
      if (!video || !this.controls) return;

      const videoRect = video.getBoundingClientRect();

      const padding = 10;
      this.controls.style.position = 'fixed';
      this.controls.style.top = `${videoRect.top + padding}px`;
      this.controls.style.left = `${videoRect.left + padding}px`;
      this.controls.style.display = 'flex';
    } catch (error) {
      console.error('Error positioning controls inside video:', error);
    }
  }

  private positionControlsInsideIframe(iframe: HTMLIFrameElement): void {
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

  private setupIframeMouseListeners(iframe: HTMLIFrameElement): void {
    try {
      const iframeAny = iframe as any;
      if (!iframe || iframeAny._vscMouseListenersAdded) {
        if (iframeAny?._vscMouseListenersAdded && iframe.matches(':hover')) {
          this.isMouseOverVideo = true;
          this.showControls();
        }
        return;
      }

      const mouseEnterHandler = () => {
        this.isMouseOverVideo = true;
        this.cancelScheduledHideControls();
        this.showControls();
      };

      const mouseLeaveHandler = () => {
        this.isMouseOverVideo = false;
        this.scheduleHideControlsAfterLeave();
      };

      let mouseMoveTimeout: number | null = null;
      const mouseMoveHandler = () => {
        if (!this.isMouseOverVideo) return;
        if (mouseMoveTimeout) return;

        mouseMoveTimeout = window.setTimeout(() => {
          mouseMoveTimeout = null;
        }, 100);

        this.showControls();
      };

      iframe.addEventListener('mouseenter', mouseEnterHandler);
      iframe.addEventListener('mouseleave', mouseLeaveHandler);
      iframe.addEventListener('mousemove', mouseMoveHandler);

      iframeAny._vscMouseListenersAdded = true;

      this.eventListeners.push(
        { element: iframe, event: 'mouseenter', handler: mouseEnterHandler },
        { element: iframe, event: 'mouseleave', handler: mouseLeaveHandler },
        { element: iframe, event: 'mousemove', handler: mouseMoveHandler }
      );

      if (iframe.matches(':hover')) {
        this.isMouseOverVideo = true;
        this.showControls();
      }
    } catch (error) {
      console.error('Error setting up iframe mouse listeners:', error);
    }
  }

  private getYouTubePlayer(video: HTMLVideoElement | null = this.currentVideo): Element | null {
    return video?.closest?.('.html5-video-player') || this.youtubePlayer || null;
  }

  private isYouTubeChromeVisible(): boolean {
    const player = this.getYouTubePlayer();
    return !!(player && !player.classList.contains('ytp-autohide'));
  }

  private syncPreferencesButton(): void {
    const settingsBtn = this.controls?.querySelector('.settings') as HTMLButtonElement;
    if (!settingsBtn) return;
    const native = document.querySelector('.vsc-preferences-link');
    settingsBtn.hidden = !!(native && this.isYouTubeChromeVisible());
  }

  private ensureYouTubePreferencesLink(player: Element | null = this.getYouTubePlayer()): HTMLButtonElement | null {
    try {
      if (!player) return null;

      const existing = player.querySelector('.vsc-preferences-link') as HTMLButtonElement;
      if (existing) {
        existing.textContent = 'Speed preferences';
        existing.setAttribute('aria-label', 'Speed preferences');
        this.syncPreferencesButton();
        return existing;
      }

      const rightControls = player.querySelector('.ytp-right-controls');
      if (!rightControls) return null;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ytp-button vsc-preferences-link';
      btn.title = 'Video Speed Controller preferences';
      btn.setAttribute('aria-label', 'Speed preferences');
      btn.textContent = 'Speed preferences';
      btn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        browser.runtime.sendMessage({ action: 'openSidePanel' });
      });
      rightControls.insertBefore(btn, rightControls.firstChild);
      this.syncPreferencesButton();
      return btn;
    } catch (error) {
      console.error('Error adding YouTube preferences link:', error);
      return null;
    }
  }

  private setupYouTubeChromeObserver(player: Element): void {
    try {
      if (!player || !player.classList.contains('html5-video-player')) {
        this.teardownYouTubeChromeObserver();
        return;
      }
      if (this.youtubePlayer === player && this.youtubeChromeObserver) {
        this.ensureYouTubePreferencesLink(player);
        return;
      }

      this.teardownYouTubeChromeObserver();
      this.youtubePlayer = player;

      this.youtubeChromeObserver = new MutationObserver(() => {
        this.ensureYouTubePreferencesLink(player);
      });
      this.youtubeChromeObserver.observe(player, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
      });

      this.ensureYouTubePreferencesLink(player);
    } catch (error) {
      console.error('Error setting up YouTube chrome observer:', error);
    }
  }

  private teardownYouTubeChromeObserver(): void {
    if (this.youtubeChromeObserver) {
      this.youtubeChromeObserver.disconnect();
      this.youtubeChromeObserver = null;
    }
    this.youtubePlayer = null;
  }

  private setupVideoMouseListeners(video: HTMLVideoElement): void {
    try {
      if (!video) return;

      const surface = video.closest('.html5-video-player') || video;
      const surfaceAny = surface as any;
      if (surfaceAny._vscMouseListenersAdded) {
        this.setupYouTubeChromeObserver(surface);
        if (surface.matches(':hover')) {
          this.isMouseOverVideo = true;
          this.showControls();
        }
        return;
      }

      const mouseEnterHandler = () => {
        this.isMouseOverVideo = true;
        this.cancelScheduledHideControls();
        this.showControls();
      };

      const mouseLeaveHandler = () => {
        this.isMouseOverVideo = false;
        this.scheduleHideControlsAfterLeave();
      };

      let mouseMoveTimeout: number | null = null;
      const mouseMoveHandler = () => {
        if (!this.isMouseOverVideo) return;

        if (mouseMoveTimeout) return;

        mouseMoveTimeout = window.setTimeout(() => {
          mouseMoveTimeout = null;
        }, 100);

        this.showControls();
      };

      surface.addEventListener('mouseenter', mouseEnterHandler);
      surface.addEventListener('mouseleave', mouseLeaveHandler);
      surface.addEventListener('mousemove', mouseMoveHandler);

      surfaceAny._vscMouseListenersAdded = true;

      this.eventListeners.push(
        { element: surface, event: 'mouseenter', handler: mouseEnterHandler },
        { element: surface, event: 'mouseleave', handler: mouseLeaveHandler },
        { element: surface, event: 'mousemove', handler: mouseMoveHandler }
      );

      if (surface.matches(':hover')) {
        this.isMouseOverVideo = true;
        this.showControls();
      }

      this.setupYouTubeChromeObserver(surface);
    } catch (error) {
      console.error('Error setting up video mouse listeners:', error);
    }
  }

  private showControls(): void {
    try {
      const hasEmbed =
        this.youtubeEmbedController && this.youtubeEmbedController.hasEmbeds();
      if (!this.controls || (!this.currentVideo && !hasEmbed)) return;

      this.syncPreferencesButton();
      const settingsBtn = this.controls.querySelector('.settings') as HTMLButtonElement;
      if (settingsBtn?.hidden) {
        this.controls.style.opacity = '0';
        this.controls.style.pointerEvents = 'none';
        return;
      }

      const isVisible = this.controls.style.opacity === '1';
      if (!isVisible) {
        this.controls.style.opacity = '1';
        this.controls.style.display = 'flex';
        this.controls.style.pointerEvents = 'auto';
      }

      this.resetControlsTimer();
    } catch (error) {
      console.error('Error showing controls:', error);
    }
  }

  private resetControlsTimer(): void {
    try {
      if (this.isMouseOverVideo || this.isMouseOverControls) return;

      if (this.controlsTimeout) {
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = null;
      }

      this.controlsTimeout = window.setTimeout(() => {
        this.hideControls();
      }, 2000);

      this.timeouts.push(this.controlsTimeout);
    } catch (error) {
      console.error('Error resetting controls timer:', error);
    }
  }

  private cancelScheduledHideControls(): void {
    if (this.hideAfterLeaveTimeout) {
      clearTimeout(this.hideAfterLeaveTimeout);
      this.hideAfterLeaveTimeout = null;
    }
  }

  private scheduleHideControlsAfterLeave(): void {
    this.cancelScheduledHideControls();
    this.hideAfterLeaveTimeout = window.setTimeout(() => {
      this.hideAfterLeaveTimeout = null;
      if (!this.isMouseOverVideo && !this.isMouseOverControls) {
        this.hideControls();
      }
    }, 50);
    this.timeouts.push(this.hideAfterLeaveTimeout);
  }

  private hideControls(): void {
    try {
      if (!this.controls) return;

      if (this.isMouseOverVideo || this.isMouseOverControls) {
        return;
      }

      if (this.controlsTimeout) {
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = null;
      }

      this.controls.style.opacity = '0';
      this.controls.style.pointerEvents = 'none';

      setTimeout(() => {
        if (!this.controls || this.isMouseOverControls || this.isMouseOverVideo) return;
        this.controls.style.display = 'none';
      }, 300);
      this.syncPreferencesButton();
    } catch (error) {
      console.error('Error hiding controls:', error);
    }
  }

  private startLongPress(video: HTMLVideoElement): void {
    try {
      if (!video || this.isLongPressing) return;

      this.isLongPressing = true;
      this.speedBeforeLongPress = video.playbackRate;
      this.longPressStartTime = Date.now();

      this.longPressTimer = window.setTimeout(() => {
        if (this.isLongPressing) {
          this.toggleNormalSpeed(video);
        }
      }, 300);

      this.timeouts.push(this.longPressTimer);
    } catch (error) {
      console.error('Error starting long press:', error);
    }
  }

  private endLongPress(video: HTMLVideoElement): void {
    try {
      if (!video || !this.isLongPressing) return;

      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }

      const pressDuration = Date.now() - (this.longPressStartTime || 0);

      if (pressDuration >= 300 && this.speedBeforeLongPress) {
        video.playbackRate = this.speedBeforeLongPress;
        this.showSpeedIndicator(this.speedBeforeLongPress);

        const restoredIndex = this.speeds.indexOf(this.speedBeforeLongPress);
        if (restoredIndex !== -1) {
          this.currentSpeedIndex = restoredIndex;
        }
      } else {
        this.resetSpeed(video);
      }

      this.isLongPressing = false;
      this.speedBeforeLongPress = null;
      this.longPressStartTime = null;
    } catch (error) {
      console.error('Error ending long press:', error);
    }
  }

  private toggleNormalSpeed(video: HTMLVideoElement): void {
    try {
      if (!video) return;

      const currentSpeed = video.playbackRate;
      let targetSpeed: number;

      if (currentSpeed === 1) {
        if (this.lastSpeedIndex !== undefined && this.lastSpeedIndex !== this.speeds.indexOf(1)) {
          targetSpeed = this.speeds[this.lastSpeedIndex];
        } else {
          const speedsAboveNormal = this.speeds.filter((s) => s > 1);
          targetSpeed = speedsAboveNormal.length > 0 ? speedsAboveNormal[0] : 1.5;
        }
      } else {
        targetSpeed = 1;
      }

      video.playbackRate = targetSpeed;
      this.showSpeedIndicator(targetSpeed);

      const targetIndex = this.speeds.indexOf(targetSpeed);
      if (targetIndex !== -1) {
        this.currentSpeedIndex = targetIndex;
      }

      if (currentSpeed !== 1 && targetSpeed === 1) {
        this.lastSpeedIndex = this.speeds.indexOf(currentSpeed);
      }
    } catch (error) {
      console.error('Error toggling normal speed:', error);
    }
  }

  private changeEmbedSpeed(direction: number): void {
    try {
      this.currentSpeedIndex = Math.max(
        0,
        Math.min(this.speeds.length - 1, this.currentSpeedIndex + direction)
      );
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

  private resetEmbedSpeed(): void {
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

  private showEmbedSpeedIndicator(speed: number): void {
    try {
      if (!this.overlay) return;

      const iframe = this.youtubeEmbedController.getActiveIframe();
      if (!iframe) return;

      const iframeRect = iframe.getBoundingClientRect();
      this.overlay.style.position = 'fixed';
      this.overlay.style.top = `${iframeRect.top + iframeRect.height / 2}px`;
      this.overlay.style.left = `${iframeRect.left + iframeRect.width / 2}px`;
      this.overlay.style.transform = 'translate(-50%, -50%)';

      const speedText = speed === 1 ? 'Normal speed' : `${speed}×`;
      this.overlay.textContent = speedText;
      this.overlay.style.display = 'block';
      this.overlay.style.opacity = '1';

      this.clearTimeouts();

      this.fadeTimeout = window.setTimeout(() => {
        try {
          if (this.overlay) {
            this.overlay.style.opacity = '0';
            this.hideTimeout = window.setTimeout(() => {
              try {
                if (this.overlay) {
                  this.overlay.style.display = 'none';
                }
              } catch (hideError) {
                console.error('Error hiding overlay:', hideError);
              }
            }, 1000);
            this.timeouts.push(this.hideTimeout!);
          }
        } catch (fadeError) {
          console.error('Error fading overlay:', fadeError);
        }
      }, 1000);
      this.timeouts.push(this.fadeTimeout!);
      this.showControls();
    } catch (error) {
      console.error('[VSC] Error showing embed speed indicator:', error);
    }
  }

  private setupEventListeners(): void {
    try {
      const getCurrentVideo = (): HTMLVideoElement | null => {
        const videos = Array.from(document.querySelectorAll('video')).filter(
          (video) =>
            video.isConnected &&
            (video.src || video.currentSrc) &&
            video.readyState !== HTMLMediaElement.HAVE_NOTHING
        ) as HTMLVideoElement[];

        const playingVideo = videos.find((video) => !video.paused);
        if (playingVideo) return playingVideo;

        const largestVideo = videos.reduce((largest, video) => {
          const videoArea = video.offsetWidth * video.offsetHeight;
          const largestArea = largest ? largest.offsetWidth * largest.offsetHeight : 0;
          return videoArea > largestArea ? video : largest;
        }, null as HTMLVideoElement | null);

        return largestVideo || videos[0] || null;
      };

      const matchesShortcut = (pressedKey: string, shortcutString?: string): boolean => {
        if (!shortcutString) return false;
        const keys = shortcutString.split(',').map((k) => k.trim().toLowerCase());
        return keys.includes(pressedKey);
      };

      const keydownHandler = (e: KeyboardEvent) => {
        try {
          const target = e.target as HTMLElement;
          if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
          )
            return;
          if (e.key === 'Escape' && this.helpOverlayVisible) {
            e.preventDefault();
            this.hideHelpOverlay();
            return;
          }
          const asksHelp = e.key === '?' || (e.key === '/' && e.shiftKey);
          if (asksHelp && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            this.toggleHelpOverlay();
            return;
          }
          if (!this.settings?.shortcuts) return;

          const video = getCurrentVideo();
          const key = e.key.toLowerCase();
          let actionTaken = false;

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
            if (!this.isLongPressing) {
              this.startLongPress(video);
            }
            actionTaken = true;
          }

          if (actionTaken && this.currentVideo) {
            this.showControls();
          }
        } catch (keyHandlerError) {
          console.error('Error in keydown handler:', keyHandlerError);
        }
      };

      const keyupHandler = (e: KeyboardEvent) => {
        try {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
          if (!this.settings?.shortcuts) return;

          const key = e.key.toLowerCase();

          if (matchesShortcut(key, this.settings.shortcuts.reset) && this.isLongPressing) {
            this.endLongPress(getCurrentVideo()!);
          }
        } catch (keyUpError) {
          console.error('Error in keyup handler:', keyUpError);
        }
      };

      document.addEventListener('keydown', keydownHandler);
      document.addEventListener('keyup', keyupHandler);

      const settingsBtn = this.controls?.querySelector('.settings');
      if (settingsBtn) {
        const settingsHandler = () => {
          browser.runtime.sendMessage({ action: 'openSidePanel' });
        };
        settingsBtn.addEventListener('click', settingsHandler);
      }

      const documentClickHandler = (event: MouseEvent) => {
        if (!this.helpOverlayVisible || !this.helpOverlay) return;
        if (this.helpOverlay.contains(event.target as Node)) return;
        this.hideHelpOverlay();
      };
      document.addEventListener('click', documentClickHandler);

      const storageHandler = (changes: any) => {
        try {
          this.loadSettings();
        } catch (storageError) {
          console.error('Error handling storage changes:', storageError);
        }
      };

      if (browser.storage && browser.storage.onChanged) {
        browser.storage.onChanged.addListener(storageHandler);
      }
    } catch (setupError) {
      console.error('Error setting up event listeners:', setupError);
    }
  }

  private resetSpeed(video: HTMLVideoElement): void {
    try {
      if (!video) {
        console.error('No video element provided to resetSpeed');
        return;
      }

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

      video.playbackRate = newSpeed;
      this.showSpeedIndicator(newSpeed);
    } catch (error) {
      console.error('Error in resetSpeed:', error);
    }
  }

  private changeSpeed(video: HTMLVideoElement, direction: number): void {
    try {
      if (!video) {
        console.error('No video element provided to changeSpeed');
        return;
      }

      this.currentSpeedIndex = Math.max(
        0,
        Math.min(this.speeds.length - 1, this.currentSpeedIndex + direction)
      );
      const newSpeed = this.speeds[this.currentSpeedIndex];

      if (newSpeed !== 1) {
        this.lastSpeedIndex = this.currentSpeedIndex;
      }

      video.playbackRate = newSpeed;
      this.showSpeedIndicator(newSpeed);
    } catch (error) {
      console.error('Error in changeSpeed:', error);
    }
  }

  private showSpeedIndicator(speed: number): void {
    try {
      if (!this.overlay) {
        console.error('Overlay element not found');
        return;
      }

      const getCurrentVideo = (): HTMLVideoElement | null => {
        const videos = Array.from(document.querySelectorAll('video')).filter(
          (video) =>
            video.isConnected &&
            (video.src || video.currentSrc) &&
            video.readyState !== HTMLMediaElement.HAVE_NOTHING
        ) as HTMLVideoElement[];

        const playingVideo = videos.find((video) => !video.paused);
        if (playingVideo) return playingVideo;

        const largestVideo = videos.reduce((largest, video) => {
          const videoArea = video.offsetWidth * video.offsetHeight;
          const largestArea = largest ? largest.offsetWidth * largest.offsetHeight : 0;
          return videoArea > largestArea ? video : largest;
        }, null as HTMLVideoElement | null);

        return largestVideo || videos[0] || null;
      };

      const video = getCurrentVideo();
      if (!video) {
        console.warn('No video found for overlay positioning');
        return;
      }

      const videoRect = video.getBoundingClientRect();
      this.overlay.style.position = 'fixed';
      this.overlay.style.top = `${videoRect.top + videoRect.height / 2}px`;
      this.overlay.style.left = `${videoRect.left + videoRect.width / 2}px`;
      this.overlay.style.transform = 'translate(-50%, -50%)';

      const speedText = speed === 1 ? 'Normal speed' : `${speed}×`;
      this.overlay.textContent = speedText;
      this.overlay.style.display = 'block';
      this.overlay.style.opacity = '1';

      this.clearTimeouts();

      this.fadeTimeout = window.setTimeout(() => {
        try {
          if (this.overlay) {
            this.overlay.style.opacity = '0';
            this.hideTimeout = window.setTimeout(() => {
              try {
                if (this.overlay) {
                  this.overlay.style.display = 'none';
                }
              } catch (hideError) {
                console.error('Error hiding overlay:', hideError);
              }
            }, 1000);
            this.timeouts.push(this.hideTimeout!);
          }
        } catch (fadeError) {
          console.error('Error fading overlay:', fadeError);
        }
      }, 1000);
      this.timeouts.push(this.fadeTimeout!);
      this.showControls();
    } catch (error) {
      console.error('Error in showSpeedIndicator:', error);
    }
  }

  public showSkipIndicator(skipDuration: number): void {
    const seconds = Math.round(skipDuration);
    this.showOverlayMessage(`Skipped ${seconds}s`);
  }

  private showOverlayMessage(message: string): void {
    try {
      if (!this.overlay) {
        console.error('Overlay element not found');
        return;
      }

      const getCurrentVideo = (): HTMLVideoElement | null => {
        const videos = Array.from(document.querySelectorAll('video')).filter(
          (video) =>
            video.isConnected &&
            (video.src || video.currentSrc) &&
            video.readyState !== HTMLMediaElement.HAVE_NOTHING
        ) as HTMLVideoElement[];

        const playingVideo = videos.find((video) => !video.paused);
        if (playingVideo) return playingVideo;

        const largestVideo = videos.reduce((largest, video) => {
          const videoArea = video.offsetWidth * video.offsetHeight;
          const largestArea = largest ? largest.offsetWidth * largest.offsetHeight : 0;
          return videoArea > largestArea ? video : largest;
        }, null as HTMLVideoElement | null);

        return largestVideo || videos[0] || null;
      };

      const video = getCurrentVideo();
      if (!video) {
        console.warn('No video found for overlay positioning');
        return;
      }

      const videoRect = video.getBoundingClientRect();
      this.overlay.style.position = 'fixed';
      this.overlay.style.top = `${videoRect.top + videoRect.height / 2}px`;
      this.overlay.style.left = `${videoRect.left + videoRect.width / 2}px`;
      this.overlay.style.transform = 'translate(-50%, -50%)';

      this.overlay.textContent = message;
      this.overlay.style.display = 'block';
      this.overlay.style.opacity = '1';

      this.clearTimeouts();

      this.fadeTimeout = window.setTimeout(() => {
        try {
          if (this.overlay) {
            this.overlay.style.opacity = '0';
            this.hideTimeout = window.setTimeout(() => {
              try {
                if (this.overlay) {
                  this.overlay.style.display = 'none';
                }
              } catch (hideError) {
                console.error('Error hiding overlay:', hideError);
              }
            }, 1000);
            this.timeouts.push(this.hideTimeout!);
          }
        } catch (fadeError) {
          console.error('Error fading overlay:', fadeError);
        }
      }, 1000);
      this.timeouts.push(this.fadeTimeout!);
    } catch (error) {
      console.error('Error in showOverlayMessage:', error);
    }
  }

  private clearTimeouts(): void {
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
    if (this.hideAfterLeaveTimeout) {
      clearTimeout(this.hideAfterLeaveTimeout);
      this.hideAfterLeaveTimeout = null;
    }

    this.timeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.timeouts = [];
  }

  private setupVideoDetection(): void {
    this.videoCheckInterval = window.setInterval(() => {
      this.updateControlsVisibilityBasedOnVideo();
    }, 1000);

    const observer = new MutationObserver((mutations) => {
      let mediaAdded = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          mutation.addedNodes.forEach((node) => {
            if (
              node.nodeName === 'VIDEO' ||
              node.nodeName === 'IFRAME' ||
              ((node as Element).querySelectorAll &&
                ((node as Element).querySelectorAll('video').length > 0 ||
                  (node as Element).querySelectorAll('iframe').length > 0))
            ) {
              mediaAdded = true;
            }
          });
        }
      }

      if (mediaAdded) {
        setTimeout(() => this.updateControlsVisibilityBasedOnVideo(), 100);
      } else {
        this.updateControlsVisibilityBasedOnVideo();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.videoObserver = observer;

    this.setupVideoEventListeners();
  }

  private setupVideoEventListeners(): void {
    const addListenersToVideo = (video: HTMLVideoElement) => {
      const videoAny = video as any;
      if (videoAny._vscListenersAdded) return;

      const playHandler = () => this.updateControlsVisibilityBasedOnVideo();
      const pauseHandler = () => {
        this.updateControlsVisibilityBasedOnVideo();

        if (this.settings && this.settings.pausingResetsSpeed) {
          video.playbackRate = 1.0;
          this.currentSpeedIndex = this.speeds.indexOf(1);
          this.showSpeedIndicator(1);
        }
      };

      video.addEventListener('play', playHandler);
      video.addEventListener('pause', pauseHandler);

      videoAny._vscListenersAdded = true;
    };

    document.querySelectorAll('video').forEach((video) => addListenersToVideo(video as HTMLVideoElement));

    const videoEventObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeName === 'VIDEO') {
            addListenersToVideo(node as HTMLVideoElement);
          } else if ((node as Element).querySelectorAll) {
            (node as Element)
              .querySelectorAll('video')
              .forEach((video) => addListenersToVideo(video as HTMLVideoElement));
          }
        });
      }
    });

    videoEventObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.videoEventObserver = videoEventObserver;
  }

  private setupCleanupHandlers(): void {
    const cleanupHandler = () => {
      this.cleanup();
    };

    window.addEventListener('beforeunload', cleanupHandler);
    this.eventListeners.push({ element: window, event: 'beforeunload', handler: cleanupHandler });

    const visibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        this.clearTimeouts();
      }
    };

    document.addEventListener('visibilitychange', visibilityHandler);
    this.eventListeners.push({
      element: document,
      event: 'visibilitychange',
      handler: visibilityHandler,
    });
  }

  private cleanup(): void {
    try {
      console.log('Cleaning up VideoSpeedController resources');

      this.clearTimeouts();

      if (this.silenceSkipper) {
        this.silenceSkipper.disable();
      }

      if (this.youtubeEmbedController) {
        this.youtubeEmbedController.cleanup();
      }

      if (this.videoCheckInterval) {
        clearInterval(this.videoCheckInterval);
        this.videoCheckInterval = null;
      }

      if (this.videoObserver) {
        this.videoObserver.disconnect();
        this.videoObserver = null;
      }

      if (this.videoEventObserver) {
        this.videoEventObserver.disconnect();
        this.videoEventObserver = null;
      }

      this.teardownYouTubeChromeObserver();

      this.settings = null;
      this.speeds = [];
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}
