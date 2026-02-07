chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
	if (message.action === 'openSidePanel') {
		chrome.sidePanel.open({ windowId: sender.tab.windowId });
	}
});
