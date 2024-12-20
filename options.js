document.addEventListener('DOMContentLoaded', async () => {
    const speedListElement = document.getElementById('speedList');
    const statusElement = document.getElementById('status');
    const versionElement = document.getElementById('version');
    const defaultSpeeds = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10];

    // Default settings
    const defaultSettings = {
        customSpeeds: defaultSpeeds,
        shortcuts: {
            speedUp: 'd',
            speedDown: 's',
            reset: 'r'
        },
        enableNumberShortcuts: true,
        showSpeedButtons: true,
        showShortcutHints: true
    };

    // Display version
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = `Version ${manifest.version_name || manifest.version}`;

    // Load all settings
    const result = await chrome.storage.sync.get(defaultSettings);
    
    // Populate speeds
    speedListElement.value = result.customSpeeds.join('\n');

    // Populate shortcuts
    document.getElementById('shortcutSpeedUp').value = result.shortcuts.speedUp;
    document.getElementById('shortcutSpeedDown').value = result.shortcuts.speedDown;
    document.getElementById('shortcutReset').value = result.shortcuts.reset;

    // Populate checkboxes
    document.getElementById('enableNumberShortcuts').checked = result.enableNumberShortcuts;
    document.getElementById('showSpeedButtons').checked = result.showSpeedButtons;
    document.getElementById('showShortcutHints').checked = result.showShortcutHints;

    // Show saved status
    const showStatus = () => {
        statusElement.style.opacity = '1';
        setTimeout(() => {
            statusElement.style.opacity = '0';
        }, 750);
    };

    // Save settings function
    const saveSettings = async () => {
        const settings = {
            customSpeeds: speedListElement.value
                .split('\n')
                .map(speed => parseFloat(speed.trim()))
                .filter(speed => !isNaN(speed) && speed >= 0.05 && speed <= 16),
            shortcuts: {
                speedUp: document.getElementById('shortcutSpeedUp').value.toLowerCase(),
                speedDown: document.getElementById('shortcutSpeedDown').value.toLowerCase(),
                reset: document.getElementById('shortcutReset').value.toLowerCase()
            },
            enableNumberShortcuts: document.getElementById('enableNumberShortcuts').checked,
            showSpeedButtons: document.getElementById('showSpeedButtons').checked,
            showShortcutHints: document.getElementById('showShortcutHints').checked
        };

        await chrome.storage.sync.set(settings);
        showStatus();
    };

    // Add event listeners
    speedListElement.addEventListener('input', saveSettings);
    document.getElementById('shortcutSpeedUp').addEventListener('input', saveSettings);
    document.getElementById('shortcutSpeedDown').addEventListener('input', saveSettings);
    document.getElementById('shortcutReset').addEventListener('input', saveSettings);
    document.getElementById('enableNumberShortcuts').addEventListener('change', saveSettings);
    document.getElementById('showSpeedButtons').addEventListener('change', saveSettings);
    document.getElementById('showShortcutHints').addEventListener('change', saveSettings);
});
