# Publish in ~30 minutes — your checklist

**Use the interactive guide:** open [`publish/index.html`](index.html) in a browser — copy buttons, image downloads, and the zip are all there.

Markdown below is a backup. The HTML page is what you should use.

## Already done ✓
- Extension icons (16, 48, 128)
- `manifest.json` (MV3; `storage` + `sidePanel`; unused `activeTab` removed)
- Bug fixes for settings load crash and pause-reset overlay
- Privacy policy HTML (`privacy-policy.html` at project root) — live at https://dannyhope.co.uk/video-speed-controller/
- Store listing copy (`publish/LISTING.md`)
- Interactive guide (`publish/index.html`)
- Upload zip (`publish/video-speed-controller.zip`)
- Promo tile 440×280 (`publish/promo-tile-440x280.png`)
- Marquee tile 1400×560 (`publish/marquee-promo-tile-1400x560.png`) — optional
- Screenshots in `publish/`

---

## Step 1 — Developer account ✓ (already registered)

Your account is active — skip the $5 fee.

## Step 2 — Privacy policy ✓ (live)

**Paste this URL in the dashboard:**
```
https://dannyhope.co.uk/video-speed-controller/
```

## Step 3 — Screenshots ✓ (in `publish/`)

Upload these (all 1280×800 except settings):

| File | Shows |
|------|--------|
| `publish/screenshot.png` | Controls + 1.25× overlay (primary) |
| `publish/screenshot-overlay.png` | Speed overlay only (1.5×) |
| `publish/screenshot-settings.png` | Settings popup |

## Step 4 — Upload (10 min)
1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New item**
2. Upload **`publish/video-speed-controller.zip`**
3. Paste fields from **`publish/index.html`** (or LISTING.md)
4. Upload **`publish/icon-128.png`** (or `icons/icon-128.png`)
5. Upload **screenshot(s)**
6. Upload **promo tile** (`publish/promo-tile-440x280.png`) if the form asks
7. **Privacy policy URL** — your hosted URL from Step 2
8. **Single purpose** — from the guide
9. Category: **Productivity**
10. Visibility: **Unlisted** (link only) — switch to Public later if you want store search

## Step 5 — Submit
1. Complete **Privacy practices** questionnaire (answers in the guide)
2. Fill **permission justifications** — reviewers care about `<all_urls>`
3. Click **Submit for review**
4. Review usually takes **hours to a few days**

---

## Quick test before upload
1. `chrome://extensions` → Load unpacked → this folder
2. Open a video page → **D** / **A** / **S**
3. Open the popup → change a speed → confirm it applies after reload
4. Click the ⚙ on the video controls → side panel / settings opens

## Re-build zip after changes
```bash
cd "/Users/dannyhope/Dropbox/Video speed controller (browser plugin)/Repos/video-speed-controller"
zip -r publish/video-speed-controller.zip \
  manifest.json background.js content.js constants.js youtube-embed.js \
  popup.html popup.js popup.css styles.css \
  icons/icon-16.png icons/icon-48.png icons/icon-128.png \
  -x "*.DS_Store"
```
