import browser from 'webextension-polyfill';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender) => {
    if (message.action === 'openSidePanel' && sender.tab?.windowId != null) {
      browser.sidePanel.open({ windowId: sender.tab.windowId }).catch((error: Error) => {
        console.warn('[VSC] Could not open side panel:', error);
      });
    }
  });
});
