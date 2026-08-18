chrome.runtime.onMessage.addListener((message, sender) => {
	if (message.action === 'openSidePanel' && sender.tab?.windowId != null) {
		chrome.sidePanel.open({ windowId: sender.tab.windowId }).catch((error) => {
			console.warn('[VSC] Could not open side panel:', error);
		});
	}
});
