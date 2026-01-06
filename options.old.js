// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}


// Simple state management
const defaultSpeeds = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10, 16];

const defaultSettings = {
    speeds: defaultSpeeds,
    shortcuts: {
        speedUp: 'd',
        speedDown: 's',
        reset: 'r'
    },
    enableNumberShortcuts: true,
    showSpeedButtons: true,
    showShortcutHints: true
};

let currentSettings = { ...defaultSettings };

async function loadSettings() {
    try {
        const result = await chrome.storage.sync.get('settings');
        if (result.settings) {
            currentSettings = {
                ...defaultSettings,
                ...result.settings,
                shortcuts: {
                    ...defaultSettings.shortcuts,
                    ...result.settings.shortcuts
                }
            };
        }
        return currentSettings;
    } catch (error) {
        console.error('Error loading settings:', error);
        return defaultSettings;
    }
}

async function saveSettings(settings) {
    try {
        await chrome.storage.sync.set({ settings });
        currentSettings = settings;
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
}

function areSpeedsDefault(speeds) {
    if (!Array.isArray(speeds)) return true;
    const normalize = s => s.map(x => parseFloat(x.toFixed(2))).sort((a, b) => a - b);
    return JSON.stringify(normalize(speeds)) === JSON.stringify(normalize(defaultSpeeds));
}

// Initialize the options page
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Options page loaded');
    
    // Initialize elements
    console.log('Getting DOM elements...');
    const speedListElement = document.getElementById('speedList');
    const statusElement = document.getElementById('status');
    const versionElement = document.getElementById('version');
    const resetButton = document.getElementById('resetSpeeds');

    if (!speedListElement) {
        console.error('Speed list element not found!');
        return;
    }
    console.log('Found speed list element:', speedListElement);

    // Initialize store
    console.log('Initializing store...');
    const store = new SettingsStore();
    console.log('Store initialized with default speeds:', store.defaultSpeeds);

    // Display version
    const manifest = chrome.runtime.getManifest();
    versionElement.textContent = `Version ${manifest.version_name || manifest.version}`;

    // UI update function
    const updateUI = (settings) => {
        console.log('updateUI called with settings:', settings);
        console.log('speedListElement exists:', !!speedListElement);
        console.log('customSpeeds array:', settings.customSpeeds);
        
        // Update speeds
        if (Array.isArray(settings.customSpeeds)) {
            const speedsText = settings.customSpeeds.join('\n');
            console.log('Setting speeds text:', speedsText);
            speedListElement.value = speedsText;
            console.log('Speed list value after set:', speedListElement.value);
        } else {
            console.error('customSpeeds is not an array:', settings.customSpeeds);
        }
        
        // Update reset button
        const isDefault = store.areSpeedsDefault();
        console.log('Speeds are default:', isDefault);
        resetButton.style.display = isDefault ? 'none' : 'block';
        
        // Update shortcuts
        document.getElementById('shortcutSpeedUp').value = settings.shortcuts.speedUp;
        document.getElementById('shortcutSpeedDown').value = settings.shortcuts.speedDown;
        document.getElementById('shortcutReset').value = settings.shortcuts.reset;

        // Update checkboxes
        document.getElementById('enableNumberShortcuts').checked = settings.enableNumberShortcuts;
        document.getElementById('showSpeedButtons').checked = settings.showSpeedButtons;
        document.getElementById('showShortcutHints').checked = settings.showShortcutHints;
    };

    // Set a test value directly to verify the textarea works
    console.log('Setting test value to textarea...');
    speedListElement.value = '1.0\n1.5\n2.0';
    console.log('Textarea value after direct set:', speedListElement.value);

    // Load settings from storage
    console.log('Loading settings from storage...');
    await store.load();
    
    // Then initialize UI with current settings
    console.log('Initializing UI with settings:', store.settings);
    updateUI(store.settings);
    
    // Check final textarea value
    console.log('Final textarea value:', speedListElement.value);
        console.log('updateUI called with settings:', settings);
        console.log('speedListElement exists:', !!speedListElement);
        console.log('customSpeeds array:', settings.customSpeeds);
        
        // Update speeds
        if (Array.isArray(settings.customSpeeds)) {
            const speedsText = settings.customSpeeds.join('\n');
            console.log('Setting speeds text:', speedsText);
            speedListElement.value = speedsText;
            console.log('Speed list value after set:', speedListElement.value);
        } else {
            console.error('customSpeeds is not an array:', settings.customSpeeds);
        }
        
        // Update reset button
        const isDefault = store.areSpeedsDefault();
        console.log('Speeds are default:', isDefault);
        resetButton.style.display = isDefault ? 'none' : 'block';
        
        // Update shortcuts
        document.getElementById('shortcutSpeedUp').value = settings.shortcuts.speedUp;
        document.getElementById('shortcutSpeedDown').value = settings.shortcuts.speedDown;
        document.getElementById('shortcutReset').value = settings.shortcuts.reset;

        // Update checkboxes
        document.getElementById('enableNumberShortcuts').checked = settings.enableNumberShortcuts;
        document.getElementById('showSpeedButtons').checked = settings.showSpeedButtons;
        document.getElementById('showShortcutHints').checked = settings.showShortcutHints;
    };
    
    // Subscribe to state changes
    store.subscribe(updateUI);

    // Status indicator
    const showStatus = (success = true) => {
        statusElement.textContent = success ? 'Settings saved' : 'Error saving settings';
        statusElement.style.color = success ? '#4CAF50' : '#f44336';
        statusElement.style.opacity = '1';
        setTimeout(() => {
            statusElement.style.opacity = '0';
        }, 2000);
    };

    // Debounced save function
    const debouncedSave = debounce(async () => {
        const success = await store.save();
        showStatus(success);
    }, 500);

    // Handle speed list changes
    speedListElement.addEventListener('input', (e) => {
        const newSpeeds = e.target.value
            .split('\n')
            .map(speed => parseFloat(speed.trim()))
            .filter(speed => !isNaN(speed));
        
        store.updateSpeeds(newSpeeds);
        debouncedSave();
    });

    // Reset speeds function
    const resetSpeeds = () => {
        updateSpeedList(defaultSpeeds);
        saveSettings();
    };


    // Listen for changes to active speeds
    chrome.storage.onChanged.addListener((changes) => {
        if (changes.activeSpeeds) {
            updateActiveSpeeds();
        }
    });

    // Handle clicks on video titles
    document.getElementById('activeSpeeds').addEventListener('click', (e) => {
        const button = e.target.closest('button.title');
        if (button) {
            const url = button.dataset.url;
            if (url) {
                window.open(url, '_blank');
            }
        }
    });

    // Settings import/export functions
    const exportSettings = async () => {
        const settings = await chrome.storage.sync.get();
        const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'video-speed-controller-settings.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const importSettings = async (file) => {
        try {
            const text = await file.text();
            const settings = JSON.parse(text);
            await chrome.storage.sync.set(settings);
            location.reload();
        } catch (error) {
            alert('Error importing settings: ' + error.message);
        }
    };

    // Add event listeners
    speedListElement.addEventListener('input', (e) => {
        // Parse and validate speeds
        const currentSpeeds = e.target.value
            .split('\n')
            .map(speed => parseFloat(speed.trim()))
            .filter(speed => !isNaN(speed));

        // Update store with new speeds
        store.updateSpeeds(currentSpeeds);
        
        // Save changes with debounce
        debouncedSave();
    });
    
    // Handle shortcut changes
    const handleShortcutChange = (e) => {
        const shortcuts = {
            ...store.settings.shortcuts,
            [e.target.id.replace('shortcut', '').toLowerCase()]: e.target.value
        };
        store.settings.shortcuts = shortcuts;
        debouncedSave();
    };

    document.getElementById('shortcutSpeedUp').addEventListener('input', handleShortcutChange);
    document.getElementById('shortcutSpeedDown').addEventListener('input', handleShortcutChange);
    document.getElementById('shortcutReset').addEventListener('input', handleShortcutChange);

    // Handle checkbox changes
    const handleCheckboxChange = (e) => {
        store.settings[e.target.id] = e.target.checked;
        debouncedSave();
    };

    document.getElementById('enableNumberShortcuts').addEventListener('change', handleCheckboxChange);
    document.getElementById('showSpeedButtons').addEventListener('change', handleCheckboxChange);
    document.getElementById('showShortcutHints').addEventListener('change', handleCheckboxChange);
    document.getElementById('resetSpeeds').addEventListener('click', resetSpeeds);
    document.getElementById('export-settings').addEventListener('click', exportSettings);
    document.getElementById('import-settings').addEventListener('click', () => {
        document.getElementById('import-file').click();
    });
    document.getElementById('import-file').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importSettings(e.target.files[0]);
        }
    });
});
