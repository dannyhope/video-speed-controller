# Publish in ~30 minutes — your checklist

**Use the interactive guide:** open [`publish/index.html`](index.html) — titled *Publish Video Speed Controller to Chrome Web Store*.

Markdown below is a backup. The HTML page is what you should use.

## Already done ✓
- Extension icons (16, 48, 128)
- `manifest.json` (MV3; `storage` + `sidePanel`)
- Bug fixes for settings load crash and pause-reset overlay
- Privacy policy live at https://dannyhope.co.uk/video-speed-controller/
- Store listing copy (`publish/LISTING.md`)
- Interactive guide (`publish/index.html`)
- Upload zip (`publish/video-speed-controller.zip`)
- Promo tiles and screenshots in `publish/`

---

## Step 1 — Developer account ✓ (already registered)

Your account is active — skip the $5 fee.

## Step 2 — Privacy policy ✓ (live)

**Paste this URL in the dashboard:**
```
https://dannyhope.co.uk/video-speed-controller/
```

## Step 3 — Screenshots ✓ (in `publish/`)

Upload these (all 1280×800, 24-bit PNG, no alpha):

| File | Shows |
|------|--------|
| `publish/screenshot.png` | Controls + overlay (primary) |
| `publish/screenshot-overlay.png` | Speed overlay (1.5×) |
| `publish/screenshot-settings-1280x800.png` | Settings popup |

## Step 4 — Upload (10 min)
1. [Developer Dashboard](https://chrome.google.com/webstore/devconsole) → **New item**
2. Upload **`publish/video-speed-controller.zip`**
3. Title / Summary come from the package — skip pasting those
4. Paste remaining fields from **`publish/index.html`** (or LISTING.md)
5. Upload **`publish/icon-128.png`**
6. Upload screenshot(s) and **promo tile** (`promo-tile-440x280.png`)
7. **Privacy policy URL** — from Step 2
8. **Single purpose** — from the guide
9. Category: Productivity group → **Tools** (not the group name itself)
10. Language: **English (United Kingdom)** (British spelling throughout)
11. Visibility: **Unlisted** (link only) — switch to Public later if you want store search

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
