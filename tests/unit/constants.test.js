/**
 * Unit tests for constants.js
 */

const { DEFAULT_SPEEDS, DEFAULT_SETTINGS } = require('../../constants.js');

describe('Constants', () => {
    describe('DEFAULT_SPEEDS', () => {
        test('should be an array', () => {
            expect(Array.isArray(DEFAULT_SPEEDS)).toBe(true);
        });

        test('should contain 1x speed', () => {
            expect(DEFAULT_SPEEDS).toContain(1);
        });

        test('should be sorted in ascending order', () => {
            const sorted = [...DEFAULT_SPEEDS].sort((a, b) => a - b);
            expect(DEFAULT_SPEEDS).toEqual(sorted);
        });

        test('all speeds should be numbers', () => {
            DEFAULT_SPEEDS.forEach(speed => {
                expect(typeof speed).toBe('number');
            });
        });

        test('all speeds should be positive', () => {
            DEFAULT_SPEEDS.forEach(speed => {
                expect(speed).toBeGreaterThan(0);
            });
        });

        test('all speeds should be within valid range (0.05-16)', () => {
            DEFAULT_SPEEDS.forEach(speed => {
                expect(speed).toBeGreaterThanOrEqual(0.05);
                expect(speed).toBeLessThanOrEqual(16);
            });
        });
    });

    describe('DEFAULT_SETTINGS', () => {
        test('should have all required fields', () => {
            expect(DEFAULT_SETTINGS).toHaveProperty('customSpeeds');
            expect(DEFAULT_SETTINGS).toHaveProperty('shortcuts');
            expect(DEFAULT_SETTINGS).toHaveProperty('enableNumberShortcuts');
            expect(DEFAULT_SETTINGS).toHaveProperty('showSpeedButtons');
            expect(DEFAULT_SETTINGS).toHaveProperty('showShortcutHints');
            expect(DEFAULT_SETTINGS).toHaveProperty('pausingResetsSpeed');
        });

        test('customSpeeds should default to DEFAULT_SPEEDS', () => {
            expect(DEFAULT_SETTINGS.customSpeeds).toBe(DEFAULT_SPEEDS);
        });

        test('shortcuts should have correct keys', () => {
            expect(DEFAULT_SETTINGS.shortcuts).toHaveProperty('speedUp');
            expect(DEFAULT_SETTINGS.shortcuts).toHaveProperty('speedDown');
            expect(DEFAULT_SETTINGS.shortcuts).toHaveProperty('reset');
        });

        test('shortcuts should be single characters', () => {
            expect(DEFAULT_SETTINGS.shortcuts.speedUp).toHaveLength(1);
            expect(DEFAULT_SETTINGS.shortcuts.speedDown).toHaveLength(1);
            expect(DEFAULT_SETTINGS.shortcuts.reset).toHaveLength(1);
        });

        test('shortcuts should be d, a, s', () => {
            expect(DEFAULT_SETTINGS.shortcuts.speedUp).toBe('d');
            expect(DEFAULT_SETTINGS.shortcuts.speedDown).toBe('a');
            expect(DEFAULT_SETTINGS.shortcuts.reset).toBe('s');
        });

        test('boolean settings should be booleans', () => {
            expect(typeof DEFAULT_SETTINGS.enableNumberShortcuts).toBe('boolean');
            expect(typeof DEFAULT_SETTINGS.showSpeedButtons).toBe('boolean');
            expect(typeof DEFAULT_SETTINGS.showShortcutHints).toBe('boolean');
            expect(typeof DEFAULT_SETTINGS.pausingResetsSpeed).toBe('boolean');
        });
    });
});
