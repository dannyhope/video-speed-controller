/**
 * End-to-end tests for Video Speed Controller
 * Tests the extension in a real Chrome instance
 */

const puppeteer = require('puppeteer');
const path = require('path');

describe('Video Speed Controller E2E', () => {
    let browser;
    let page;

    beforeAll(async () => {
        // Launch Chrome with the extension loaded
        const extensionPath = path.join(__dirname, '../..');
        browser = await puppeteer.launch({
            headless: false, // Must be false for extensions
            args: [
                `--disable-extensions-except=${extensionPath}`,
                `--load-extension=${extensionPath}`,
                '--no-sandbox'
            ]
        });

        page = await browser.newPage();
    });

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
    });

    test('Extension loads without errors', async () => {
        // Navigate to a page with video
        await page.goto('https://www.w3schools.com/html/html5_video.asp', {
            waitUntil: 'networkidle2'
        });

        // Check for console errors
        const errors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push(msg.text());
            }
        });

        // Wait a bit for extension to initialize
        await page.waitForTimeout(1000);

        // Should have no critical errors
        const criticalErrors = errors.filter(err =>
            !err.includes('favicon') &&
            !err.includes('net::ERR')
        );
        expect(criticalErrors.length).toBe(0);
    });

    test('On-screen controls appear', async () => {
        await page.goto('https://www.w3schools.com/html/html5_video.asp', {
            waitUntil: 'networkidle2'
        });

        // Wait for controls to appear
        await page.waitForTimeout(1000);

        // Check if controls element exists
        const controls = await page.$('.video-speed-controls');
        expect(controls).not.toBeNull();
    });

    test('Speed overlay shows when speed changes', async () => {
        await page.goto('https://www.w3schools.com/html/html5_video.asp', {
            waitUntil: 'networkidle2'
        });

        await page.waitForTimeout(1000);

        // Press 'd' to increase speed
        await page.keyboard.press('d');
        await page.waitForTimeout(500);

        // Check if overlay appeared (has opacity > 0)
        const overlayVisible = await page.evaluate(() => {
            const overlay = document.querySelector('.video-speed-overlay');
            if (!overlay) return false;
            const opacity = window.getComputedStyle(overlay).opacity;
            return parseFloat(opacity) > 0;
        });

        expect(overlayVisible).toBe(true);
    });

    test('Keyboard shortcuts work', async () => {
        await page.goto('https://www.w3schools.com/html/html5_video.asp', {
            waitUntil: 'networkidle2'
        });

        await page.waitForTimeout(1000);

        // Get initial playback rate
        const initialRate = await page.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.playbackRate : null;
        });

        expect(initialRate).toBe(1);

        // Press 'd' to speed up
        await page.keyboard.press('d');
        await page.waitForTimeout(500);

        const newRate = await page.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.playbackRate : null;
        });

        expect(newRate).toBeGreaterThan(initialRate);

        // Press 's' to reset
        await page.keyboard.press('s');
        await page.waitForTimeout(500);

        const resetRate = await page.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.playbackRate : null;
        });

        expect(resetRate).toBe(1);
    });

    test('Clicking on-screen buttons works', async () => {
        await page.goto('https://www.w3schools.com/html/html5_video.asp', {
            waitUntil: 'networkidle2'
        });

        await page.waitForTimeout(1000);

        // Click the speed up button
        await page.click('.video-speed-controls .speed-up');
        await page.waitForTimeout(500);

        const newRate = await page.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.playbackRate : null;
        });

        expect(newRate).toBeGreaterThan(1);
    });
});
