# Testing Video Speed Controller

This extension has both unit tests and end-to-end (E2E) tests.

## Setup

Install dependencies:

```bash
npm install
```

## Running Tests

### Unit Tests

Unit tests run in Node.js and test individual functions in isolation:

```bash
npm test
```

Watch mode (reruns tests on file changes):

```bash
npm run test:watch
```

### End-to-End Tests

E2E tests load the extension in a real Chrome instance and test actual functionality:

```bash
npm run test:e2e
```

**Note:** E2E tests require Chrome to be installed and will launch a visible browser window.

## Test Structure

```
tests/
├── unit/               # Fast isolated tests
│   └── constants.test.js
├── e2e/               # Full browser integration tests
│   └── basic-functionality.test.js
└── README.md          # This file
```

## What's Tested

### Unit Tests
- Constants validation (DEFAULT_SPEEDS, DEFAULT_SETTINGS)
- Settings schema
- Keyboard shortcut defaults

### E2E Tests
- Extension loads without errors
- On-screen controls appear
- Speed overlay displays
- Keyboard shortcuts (d, a, s) work
- On-screen button clicks work
- Video playback rate changes correctly

## Adding New Tests

### Unit Test Example

```javascript
test('should do something', () => {
    expect(something).toBe(expected);
});
```

### E2E Test Example

```javascript
test('should interact with page', async () => {
    await page.goto('https://example.com');
    await page.click('.some-button');
    const result = await page.evaluate(() => {
        return document.querySelector('.result').textContent;
    });
    expect(result).toBe('expected');
});
```

## Continuous Integration

These tests can be run in CI environments like GitHub Actions, GitLab CI, or Jenkins using headless Chrome.

## Debugging Tests

To debug E2E tests:
1. Tests run in non-headless mode by default (you can see the browser)
2. Add `await page.waitForTimeout(10000)` to pause execution
3. Use `console.log()` to output debugging info
4. Check browser DevTools console for extension errors
