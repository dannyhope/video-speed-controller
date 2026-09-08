import browser from 'webextension-polyfill';
import { DEFAULT_SPEEDS, DEFAULT_SETTINGS, type Settings } from '~/utils/constants';
import { safeStorageGet, safeStorageSet } from '~/utils/storage';
import '~/styles/popup.css';

// Debug logging wrapper
function debug(...args: any[]): void {
  console.log('[VSC Popup]', ...args);
}

// Validation utilities
function validateSpeed(speed: number): { valid: boolean; error?: string; value?: number } {
  const parsed = parseFloat(speed as any);
  if (isNaN(parsed)) return { valid: false, error: 'Invalid number' };
  if (parsed < 0.05) return { valid: false, error: 'Speed must be at least 0.05x' };
  if (parsed > 16) return { valid: false, error: 'Speed must be at most 16x' };
  return { valid: true, value: parsed };
}

function validateSpeedArray(speeds: number[]): {
  valid: boolean;
  error?: string;
  value: number[];
  errors?: string[];
} {
  if (!Array.isArray(speeds)) return { valid: false, error: 'Must be an array', value: [] };

  const validatedSpeeds: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < speeds.length; i++) {
    const result = validateSpeed(speeds[i]);
    if (result.valid && result.value) {
      validatedSpeeds.push(result.value);
    } else {
      errors.push(`Item ${i + 1}: ${result.error}`);
    }
  }

  const uniqueSpeeds = [...new Set(validatedSpeeds)].sort((a, b) => a - b);

  if (uniqueSpeeds.length < 3) {
    return { valid: false, error: 'At least 3 speeds required', value: uniqueSpeeds };
  }

  return {
    valid: errors.length === 0,
    value: uniqueSpeeds,
    errors,
  };
}

function validateSingleKey(key: string): { valid: boolean; error?: string; value?: string } {
  if (typeof key !== 'string') return { valid: false, error: 'Must be a string' };

  const sanitized = key.trim().toLowerCase();
  if (sanitized.length === 0) return { valid: false, error: 'Cannot be empty' };
  if (sanitized.length > 1) return { valid: false, error: 'Must be a single character' };

  const disallowedKeys = [
    'control',
    'alt',
    'shift',
    'meta',
    'tab',
    'escape',
    'enter',
    'backspace',
    'delete',
  ];
  if (disallowedKeys.includes(sanitized)) {
    return { valid: false, error: 'Control keys not allowed' };
  }

  return { valid: true, value: sanitized };
}

function validateShortcut(keys: string): {
  valid: boolean;
  error?: string;
  value?: string;
  keys?: string[];
  errors?: string[];
} {
  if (typeof keys !== 'string') return { valid: false, error: 'Must be a string' };

  const keyList = keys
    .split(',')
    .map((k) => k.trim().toLowerCase())
    .filter((k) => k.length > 0);

  if (keyList.length === 0) return { valid: false, error: 'Cannot be empty' };

  const validKeys: string[] = [];
  const errors: string[] = [];

  for (const key of keyList) {
    const result = validateSingleKey(key);
    if (result.valid && result.value) {
      if (!validKeys.includes(result.value)) {
        validKeys.push(result.value);
      }
    } else {
      errors.push(`"${key}": ${result.error}`);
    }
  }

  if (validKeys.length === 0) {
    return { valid: false, error: errors.join(', ') || 'No valid keys' };
  }

  return { valid: true, value: validKeys.join(', '), keys: validKeys, errors };
}

function validateShortcuts(shortcuts: Record<string, string>): {
  valid: boolean;
  error?: string;
  value?: Record<string, string>;
  errors?: string[];
} {
  if (typeof shortcuts !== 'object' || shortcuts === null) {
    return { valid: false, error: 'Must be an object' };
  }

  const validatedShortcuts: Record<string, string> = {};
  const allKeys: Record<string, string> = {};
  const errors: string[] = [];

  const requiredKeys = ['speedUp', 'speedDown', 'reset'];

  for (const key of requiredKeys) {
    if (!(key in shortcuts)) {
      errors.push(`Missing required key: ${key}`);
      continue;
    }

    const result = validateShortcut(shortcuts[key]);
    if (result.valid && result.value && result.keys) {
      validatedShortcuts[key] = result.value;

      for (const singleKey of result.keys) {
        if (allKeys[singleKey] && allKeys[singleKey] !== key) {
          errors.push(`Key "${singleKey}" is used by both ${allKeys[singleKey]} and ${key}`);
        } else {
          allKeys[singleKey] = key;
        }
      }
    } else {
      errors.push(`${key}: ${result.error}`);
    }
  }

  return {
    valid: errors.length === 0,
    value: validatedShortcuts,
    errors,
  };
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: number | undefined;
  return ((...args: any[]) => {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
  }) as T;
}

// Current settings state
let currentSettings: Settings = { ...DEFAULT_SETTINGS };
let editingSpeedIndex: number | null = null;

// DOM elements
interface Elements {
  status: HTMLElement | null;
  speedList: HTMLElement | null;
  newSpeedInput: HTMLInputElement | null;
  addSpeedBtn: HTMLButtonElement | null;
  shortcutSpeedUp: HTMLInputElement | null;
  shortcutSpeedDown: HTMLInputElement | null;
  shortcutReset: HTMLInputElement | null;
  pausingResetsSpeed: HTMLInputElement | null;
  skipSilenceEnabled: HTMLInputElement | null;
}

let elements: Elements = {
  status: null,
  speedList: null,
  newSpeedInput: null,
  addSpeedBtn: null,
  shortcutSpeedUp: null,
  shortcutSpeedDown: null,
  shortcutReset: null,
  pausingResetsSpeed: null,
  skipSilenceEnabled: null,
};

// Load settings from storage
async function loadSettings(): Promise<Settings> {
  try {
    debug('Loading settings...');

    const storageResult = await safeStorageGet<Settings>(null, DEFAULT_SETTINGS);
    if (!storageResult.success) {
      throw new Error(storageResult.error?.message || 'Failed to load settings');
    }

    const result = storageResult.result!;
    debug('Raw storage result:', result);

    currentSettings = { ...DEFAULT_SETTINGS };

    if (result && Object.keys(result).length > 0) {
      if (Array.isArray(result.customSpeeds)) {
        currentSettings.customSpeeds = result.customSpeeds;
      }

      if (result.shortcuts) {
        const shortcuts = {
          ...DEFAULT_SETTINGS.shortcuts,
          ...result.shortcuts,
        };
        delete (shortcuts as any).skipSilence;
        currentSettings.shortcuts = shortcuts;
      }

      if (typeof result.pausingResetsSpeed === 'boolean') {
        currentSettings.pausingResetsSpeed = result.pausingResetsSpeed;
      }

      if (typeof result.skipSilenceEnabled === 'boolean') {
        currentSettings.skipSilenceEnabled = result.skipSilenceEnabled;
      }

      if (typeof result.skipSilenceGapThreshold === 'number') {
        currentSettings.skipSilenceGapThreshold = result.skipSilenceGapThreshold;
      }
    }

    debug('Final settings:', currentSettings);
    return currentSettings;
  } catch (error) {
    console.error('Error loading settings:', error);
    debug('Using fallback default settings');
    return DEFAULT_SETTINGS;
  }
}

// Save settings to storage
async function saveSettings(settings: Settings): Promise<boolean> {
  try {
    debug('Saving settings:', settings);

    const storageResult = await safeStorageSet(settings);
    if (!storageResult.success) {
      throw new Error(storageResult.error?.message || 'Failed to save settings');
    }

    currentSettings = { ...settings };
    debug('Settings saved successfully');
    showStatus('Saved');
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    debug('Failed to save settings');
    showStatus('Error saving');
    return false;
  }
}

// Show status message
function showStatus(message: string): void {
  if (!elements.status) return;
  debug('Showing status:', message);
  elements.status.textContent = message;
  elements.status.classList.add('show');
  setTimeout(() => {
    elements.status?.classList.remove('show');
  }, 1500);
}

// Render speed pills
function renderSpeeds(): void {
  if (!elements.speedList) return;

  debug('Rendering speeds:', currentSettings.customSpeeds);

  elements.speedList.innerHTML = '';

  currentSettings.customSpeeds.forEach((speed, index) => {
    const pill = document.createElement('div');
    pill.className = 'speed-pill';
    pill.setAttribute('role', 'listitem');

    const valueEl = document.createElement('span');
    valueEl.className = 'speed-value';
    valueEl.textContent = `${speed}×`;
    valueEl.setAttribute('data-index', index.toString());

    valueEl.addEventListener('click', () => startEditingSpeed(index));

    if (speed !== 1) {
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-speed';
      removeBtn.innerHTML = '×';
      removeBtn.setAttribute('aria-label', `Remove ${speed}× speed`);
      removeBtn.setAttribute('data-index', index.toString());

      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeSpeed(index);
      });

      pill.appendChild(valueEl);
      pill.appendChild(removeBtn);
    } else {
      pill.appendChild(valueEl);
      pill.classList.add('non-removable');
    }

    elements.speedList.appendChild(pill);
  });
}

// Start editing a speed
function startEditingSpeed(index: number): void {
  const currentValue = currentSettings.customSpeeds[index];

  if (currentValue === 1) {
    showStatus('Cannot edit 1× (normal speed)');
    return;
  }

  if (editingSpeedIndex !== null) {
    cancelEditingSpeed();
  }

  editingSpeedIndex = index;
  const pill = elements.speedList!.children[index] as HTMLElement;
  pill.classList.add('editing');

  const valueEl = pill.querySelector('.speed-value') as HTMLElement;

  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0.05';
  input.max = '16';
  input.step = '0.05';
  input.value = currentValue.toString();

  valueEl.replaceWith(input);
  input.focus();
  input.select();

  const finishEdit = () => {
    const newValue = parseFloat(input.value);
    const validation = validateSpeed(newValue);

    if (!validation.valid) {
      showStatus(validation.error!);
      cancelEditingSpeed();
      return;
    }

    const newSpeeds = [...currentSettings.customSpeeds];
    newSpeeds[index] = validation.value!;

    const arrayValidation = validateSpeedArray(newSpeeds);
    if (!arrayValidation.valid) {
      showStatus(arrayValidation.error || 'Invalid speeds');
      cancelEditingSpeed();
      return;
    }

    const newSettings = { ...currentSettings, customSpeeds: arrayValidation.value };
    currentSettings = newSettings;
    editingSpeedIndex = null;
    renderSpeeds();
    debouncedSave(newSettings);
  };

  const cancelEdit = () => {
    cancelEditingSpeed();
  };

  input.addEventListener('blur', finishEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finishEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  });
}

// Cancel editing a speed
function cancelEditingSpeed(): void {
  editingSpeedIndex = null;
  renderSpeeds();
}

// Remove a speed
function removeSpeed(index: number): void {
  const speedToRemove = currentSettings.customSpeeds[index];

  if (speedToRemove === 1) {
    showStatus('Cannot remove 1× (normal speed)');
    return;
  }

  const newSpeeds = currentSettings.customSpeeds.filter((_, i) => i !== index);

  const validation = validateSpeedArray(newSpeeds);
  if (!validation.valid) {
    showStatus(validation.error || 'At least 3 speeds required');
    return;
  }

  const newSettings = { ...currentSettings, customSpeeds: validation.value };
  currentSettings = newSettings;
  renderSpeeds();
  debouncedSave(newSettings);
}

// Add a new speed
function addSpeed(): void {
  const input = elements.newSpeedInput!;
  const value = parseFloat(input.value);

  const validation = validateSpeed(value);
  if (!validation.valid) {
    input.classList.add('error');
    showStatus(validation.error!);
    setTimeout(() => input.classList.remove('error'), 2000);
    return;
  }

  const newSpeeds = [...currentSettings.customSpeeds, validation.value!];

  const arrayValidation = validateSpeedArray(newSpeeds);
  if (!arrayValidation.valid) {
    input.classList.add('error');
    showStatus(arrayValidation.error || 'Invalid speeds');
    setTimeout(() => input.classList.remove('error'), 2000);
    return;
  }

  const newSettings = { ...currentSettings, customSpeeds: arrayValidation.value };
  currentSettings = newSettings;
  input.value = '';
  renderSpeeds();
  debouncedSave(newSettings);
}

// Update shortcuts in UI
function updateShortcutsUI(): void {
  if (elements.shortcutSpeedUp) {
    elements.shortcutSpeedUp.value = currentSettings.shortcuts.speedUp;
  }
  if (elements.shortcutSpeedDown) {
    elements.shortcutSpeedDown.value = currentSettings.shortcuts.speedDown;
  }
  if (elements.shortcutReset) {
    elements.shortcutReset.value = currentSettings.shortcuts.reset;
  }
}

// Update playback options in UI
function updatePlaybackOptionsUI(): void {
  if (elements.pausingResetsSpeed) {
    elements.pausingResetsSpeed.checked = currentSettings.pausingResetsSpeed || false;
  }
  if (elements.skipSilenceEnabled) {
    elements.skipSilenceEnabled.checked = currentSettings.skipSilenceEnabled || false;
  }
}

// Handle pausing resets speed checkbox change
function handlePausingResetsSpeedChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  const newSettings = { ...currentSettings, pausingResetsSpeed: target.checked };
  currentSettings = newSettings;
  debouncedSave(newSettings);
}

// Handle skip silence enabled checkbox change
function handleSkipSilenceEnabledChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  const newSettings = { ...currentSettings, skipSilenceEnabled: target.checked };
  currentSettings = newSettings;
  debouncedSave(newSettings);
}

// Handle shortcut keydown - adds pressed key to existing keys
function handleShortcutKeydown(e: KeyboardEvent): void {
  const inputId = (e.target as HTMLInputElement).id;
  const shortcutKey = inputId.replace('shortcut', '');
  const shortcutName = (shortcutKey.charAt(0).toLowerCase() +
    shortcutKey.slice(1)) as keyof Settings['shortcuts'];
  const pressedKey = e.key.toLowerCase();

  if (
    [
      'control',
      'alt',
      'shift',
      'meta',
      'tab',
      'escape',
      'arrowleft',
      'arrowright',
      'arrowup',
      'arrowdown',
      'home',
      'end',
    ].includes(pressedKey)
  ) {
    return;
  }

  if (['backspace', 'delete'].includes(pressedKey)) {
    return;
  }

  e.preventDefault();

  const currentKeys = currentSettings.shortcuts[shortcutName] || '';
  const keyList = currentKeys
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  if (!keyList.includes(pressedKey)) {
    keyList.push(pressedKey);
  }

  const newValue = keyList.join(', ');

  const validation = validateShortcut(newValue);
  if (!validation.valid) {
    (e.target as HTMLInputElement).classList.add('error');
    showStatus(validation.error!);
    setTimeout(() => (e.target as HTMLInputElement).classList.remove('error'), 2000);
    return;
  }

  const newShortcuts = { ...currentSettings.shortcuts, [shortcutName]: validation.value! };
  const shortcutValidation = validateShortcuts(newShortcuts);
  if (!shortcutValidation.valid) {
    (e.target as HTMLInputElement).classList.add('error');
    showStatus(shortcutValidation.errors?.join(', ') || 'Invalid shortcuts');
    setTimeout(() => (e.target as HTMLInputElement).classList.remove('error'), 2000);
    return;
  }

  const newSettings = { ...currentSettings, shortcuts: shortcutValidation.value! };
  currentSettings = newSettings;
  updateShortcutsUI();
  debouncedSave(newSettings);
}

// Handle shortcut input (typing/pasting) - debounced to allow editing
const handleShortcutInputDebounced = debounce((inputId: string, value: string) => {
  const shortcutKey = inputId.replace('shortcut', '');
  const shortcutName = (shortcutKey.charAt(0).toLowerCase() +
    shortcutKey.slice(1)) as keyof Settings['shortcuts'];

  if (value.length === 0) {
    updateShortcutsUI();
    return;
  }

  const validation = validateShortcut(value);
  if (!validation.valid) {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.classList.add('error');
      showStatus(validation.error!);
      setTimeout(() => input.classList.remove('error'), 2000);
    }
    return;
  }

  const newShortcuts = { ...currentSettings.shortcuts, [shortcutName]: validation.value! };
  const shortcutValidation = validateShortcuts(newShortcuts);
  if (!shortcutValidation.valid) {
    const input = document.getElementById(inputId) as HTMLInputElement;
    if (input) {
      input.classList.add('error');
      showStatus(shortcutValidation.errors?.join(', ') || 'Invalid shortcuts');
      setTimeout(() => input.classList.remove('error'), 2000);
    }
    return;
  }

  const newSettings = { ...currentSettings, shortcuts: shortcutValidation.value! };
  currentSettings = newSettings;
  updateShortcutsUI();
  debouncedSave(newSettings);
}, 500);

function handleShortcutInput(e: Event): void {
  const target = e.target as HTMLInputElement;
  const value = target.value.trim().toLowerCase();
  handleShortcutInputDebounced(target.id, value);
}

// Debounced save function
const debouncedSave = debounce(async (settings: Settings) => {
  await saveSettings(settings);
}, 250);

// Listen for storage changes from other sources
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync') {
    debug('Storage changed:', changes);

    if (
      changes.customSpeeds ||
      changes.shortcuts ||
      changes.pausingResetsSpeed ||
      changes.skipSilenceEnabled ||
      changes.skipSilenceGapThreshold
    ) {
      loadSettings().then((settings) => {
        currentSettings = settings;
        renderSpeeds();
        updateShortcutsUI();
        updatePlaybackOptionsUI();
      });
    }
  }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    debug('Popup loaded');

    elements = {
      status: document.getElementById('status'),
      speedList: document.getElementById('speedList'),
      newSpeedInput: document.getElementById('newSpeedInput') as HTMLInputElement,
      addSpeedBtn: document.getElementById('addSpeedBtn') as HTMLButtonElement,
      shortcutSpeedUp: document.getElementById('shortcutSpeedUp') as HTMLInputElement,
      shortcutSpeedDown: document.getElementById('shortcutSpeedDown') as HTMLInputElement,
      shortcutReset: document.getElementById('shortcutReset') as HTMLInputElement,
      pausingResetsSpeed: document.getElementById('pausingResetsSpeed') as HTMLInputElement,
      skipSilenceEnabled: document.getElementById('skipSilenceEnabled') as HTMLInputElement,
    };

    const settings = await loadSettings();
    currentSettings = settings;

    renderSpeeds();
    updateShortcutsUI();
    updatePlaybackOptionsUI();

    if (elements.addSpeedBtn) {
      elements.addSpeedBtn.addEventListener('click', addSpeed);
    }

    if (elements.newSpeedInput) {
      elements.newSpeedInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          addSpeed();
        }
      });
    }

    if (elements.shortcutSpeedUp) {
      elements.shortcutSpeedUp.addEventListener('keydown', handleShortcutKeydown);
      elements.shortcutSpeedUp.addEventListener('input', handleShortcutInput);
    }
    if (elements.shortcutSpeedDown) {
      elements.shortcutSpeedDown.addEventListener('keydown', handleShortcutKeydown);
      elements.shortcutSpeedDown.addEventListener('input', handleShortcutInput);
    }
    if (elements.shortcutReset) {
      elements.shortcutReset.addEventListener('keydown', handleShortcutKeydown);
      elements.shortcutReset.addEventListener('input', handleShortcutInput);
    }

    if (elements.pausingResetsSpeed) {
      elements.pausingResetsSpeed.addEventListener('change', handlePausingResetsSpeedChange);
    }

    if (elements.skipSilenceEnabled) {
      elements.skipSilenceEnabled.addEventListener('change', handleSkipSilenceEnabledChange);
    }

    debug('Popup initialized successfully');
  } catch (error) {
    console.error('Error initializing popup:', error);
  }
});
