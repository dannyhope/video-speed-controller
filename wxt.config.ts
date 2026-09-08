import { defineConfig } from 'wxt';

export default defineConfig({
  extensionApi: 'chrome',
  manifest: {
    name: 'Video Speed Controller',
    description: 'Control video playback speed with customisable keyboard shortcuts',
    version: '1.0',
    permissions: ['storage', 'sidePanel'],
    side_panel: {
      default_path: 'popup.html',
    },
    action: {
      default_popup: 'popup.html',
      default_icon: {
        16: '/assets/icons/icon-16.png',
        48: '/assets/icons/icon-48.png',
        128: '/assets/icons/icon-128.png',
      },
    },
    icons: {
      16: '/assets/icons/icon-16.png',
      48: '/assets/icons/icon-48.png',
      128: '/assets/icons/icon-128.png',
    },
    commands: {
      _execute_action: {
        suggested_key: {
          default: 'Ctrl+Shift+V',
          mac: 'Command+Shift+V',
        },
        description: 'Open Video Speed Controller settings',
      },
    },
  },
  runner: {
    disabled: true,
  },
  outDir: '.output',
  srcDir: 'src',
});
