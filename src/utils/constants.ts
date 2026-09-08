// Shared constants for Video Speed Controller extension

export const DEFAULT_SPEEDS = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 3, 4, 6, 10, 16];

export interface Settings {
  customSpeeds: number[];
  shortcuts: {
    speedUp: string;
    speedDown: string;
    reset: string;
  };
  enableNumberShortcuts: boolean;
  showSpeedButtons: boolean;
  showShortcutHints: boolean;
  pausingResetsSpeed: boolean;
  skipSilenceEnabled: boolean;
  skipSilenceGapThreshold: number;
}

export const DEFAULT_SETTINGS: Settings = {
  customSpeeds: DEFAULT_SPEEDS,
  shortcuts: {
    speedUp: 'd',
    speedDown: 'a',
    reset: 's',
  },
  enableNumberShortcuts: true,
  showSpeedButtons: true,
  showShortcutHints: true,
  pausingResetsSpeed: false,
  skipSilenceEnabled: false,
  skipSilenceGapThreshold: 5,
};
