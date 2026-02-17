// YouTube Embed Controller
// Detects and controls YouTube videos embedded via <iframe> on third-party sites
// Uses the YouTube IFrame Player API to send playback rate commands

class YouTubeEmbedController {
	constructor() {
		this.players = new Map(); // iframe element -> YT.Player
		this.activePlayer = null;
		this.activeIframe = null;
		this.apiReady = false;
		this.apiLoading = false;
		this.pendingIframes = [];
		this.observer = null;
		this.currentSpeed = 1;
	}

	init() {
		const iframes = this.findYouTubeEmbeds();
		if (iframes.length > 0) {
			this.loadAPI(iframes);
		}
		this.observeForNewEmbeds();
	}

	findYouTubeEmbeds() {
		return Array.from(document.querySelectorAll('iframe'))
			.filter(iframe => this.isYouTubeEmbed(iframe));
	}

	isYouTubeEmbed(iframe) {
		const src = iframe.src || '';
		return /youtube\.com\/embed\//i.test(src) || /youtube-nocookie\.com\/embed\//i.test(src);
	}

	enableJSAPI(iframe) {
		const src = iframe.src || '';
		if (!src) return;

		const url = new URL(src);
		if (url.searchParams.get('enablejsapi') !== '1') {
			url.searchParams.set('enablejsapi', '1');
			// origin param helps with postMessage security
			url.searchParams.set('origin', window.location.origin);
			iframe.src = url.toString();
		}
	}

	loadAPI(iframes) {
		if (this.apiReady || this.apiLoading) {
			if (this.apiReady) {
				iframes.forEach(iframe => this.createPlayer(iframe));
			} else {
				this.pendingIframes.push(...iframes);
			}
			return;
		}

		this.apiLoading = true;
		this.pendingIframes.push(...iframes);

		// Prepare iframes with enablejsapi before loading API
		iframes.forEach(iframe => this.enableJSAPI(iframe));

		// Set up the callback before loading the script
		const previousCallback = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = () => {
			this.apiReady = true;
			this.apiLoading = false;

			// Create players for all pending iframes
			const pending = [...this.pendingIframes];
			this.pendingIframes = [];
			pending.forEach(iframe => this.createPlayer(iframe));

			// Call any previous callback
			if (typeof previousCallback === 'function') {
				previousCallback();
			}
		};

		// Check if API is already loaded
		if (window.YT && window.YT.Player) {
			this.apiReady = true;
			this.apiLoading = false;
			const pending = [...this.pendingIframes];
			this.pendingIframes = [];
			pending.forEach(iframe => this.createPlayer(iframe));
			return;
		}

		// Load the YouTube IFrame Player API script
		const script = document.createElement('script');
		script.src = 'https://www.youtube.com/iframe_api';
		script.onerror = () => {
			console.error('[VSC] Failed to load YouTube IFrame Player API');
			this.apiLoading = false;
		};
		document.head.appendChild(script);
	}

	createPlayer(iframe) {
		if (!iframe || !iframe.isConnected) return;
		if (this.players.has(iframe)) return;

		// Ensure iframe has an id (required by YT.Player)
		if (!iframe.id) {
			iframe.id = 'vsc-yt-embed-' + Math.random().toString(36).substr(2, 9);
		}

		// Ensure enablejsapi is set
		this.enableJSAPI(iframe);

		try {
			const player = new YT.Player(iframe.id, {
				events: {
					onReady: () => {
						console.log('[VSC] YouTube embed player ready:', iframe.id);
						// Apply current speed if not 1x
						if (this.currentSpeed !== 1) {
							try {
								player.setPlaybackRate(this.currentSpeed);
							} catch (e) {
								// Player might not support this rate
							}
						}
					},
					onStateChange: (event) => {
						this.onPlayerStateChange(iframe, player, event);
					},
					onError: (event) => {
						console.warn('[VSC] YouTube embed player error:', event.data);
					}
				}
			});

			this.players.set(iframe, player);

			// If this is the first/only embed, make it active
			if (!this.activePlayer) {
				this.activePlayer = player;
				this.activeIframe = iframe;
			}
		} catch (error) {
			console.error('[VSC] Error creating YouTube player for iframe:', error);
		}
	}

	onPlayerStateChange(iframe, player, event) {
		// YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3
		if (event.data === 1) {
			// Video started playing — make this the active player
			this.activePlayer = player;
			this.activeIframe = iframe;
		}
	}

	hasEmbeds() {
		return this.players.size > 0 || this.pendingIframes.length > 0 || this.findYouTubeEmbeds().length > 0;
	}

	getActivePlayer() {
		// Verify active player's iframe is still connected
		if (this.activeIframe && !this.activeIframe.isConnected) {
			this.players.delete(this.activeIframe);
			this.activePlayer = null;
			this.activeIframe = null;
		}

		// If no active player, pick the first available
		if (!this.activePlayer) {
			for (const [iframe, player] of this.players) {
				if (iframe.isConnected) {
					this.activePlayer = player;
					this.activeIframe = iframe;
					break;
				}
			}
		}

		return this.activePlayer;
	}

	getActiveIframe() {
		this.getActivePlayer(); // Ensures activeIframe is up-to-date
		return this.activeIframe;
	}

	setPlaybackRate(rate) {
		this.currentSpeed = rate;
		const player = this.getActivePlayer();
		if (!player) return false;

		try {
			player.setPlaybackRate(rate);
			return true;
		} catch (error) {
			console.error('[VSC] Error setting playback rate on YouTube embed:', error);
			return false;
		}
	}

	getPlaybackRate() {
		const player = this.getActivePlayer();
		if (!player) return 1;

		try {
			return player.getPlaybackRate() || 1;
		} catch (error) {
			return this.currentSpeed;
		}
	}

	observeForNewEmbeds() {
		this.observer = new MutationObserver((mutations) => {
			const newIframes = [];
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node.nodeName === 'IFRAME' && this.isYouTubeEmbed(node)) {
						newIframes.push(node);
					} else if (node.querySelectorAll) {
						const iframes = node.querySelectorAll('iframe');
						iframes.forEach(iframe => {
							if (this.isYouTubeEmbed(iframe)) {
								newIframes.push(iframe);
							}
						});
					}
				}
			}

			if (newIframes.length > 0) {
				// Wait for iframes to load
				setTimeout(() => {
					this.loadAPI(newIframes);
				}, 500);
			}
		});

		if (document.body) {
			this.observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		}
	}

	cleanup() {
		if (this.observer) {
			this.observer.disconnect();
			this.observer = null;
		}
		this.players.clear();
		this.activePlayer = null;
		this.activeIframe = null;
		this.pendingIframes = [];
	}
}
