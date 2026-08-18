# Chrome Web Store listing — paste these fields

Aligned with the **Store listing** form in the Developer Dashboard.

Title and summary are filled automatically from the package (`manifest.json`) — not listed here.

## Description
*(paste into Description — max 16,000 characters)*

Video Speed Controller lets you speed up or slow down HTML5 videos on almost any website — YouTube, courses, news clips, and more — without hunting through each player’s menus.

**Keyboard shortcuts (defaults)**
- **D** — speed up
- **A** — slow down
- **S** — reset / toggle normal speed
- **G** — toggle skip silence (where captions are available)

Change these keys in the extension settings. You can assign more than one key per action.

**On-screen controls**
When a video is playing, hover to show compact − / 1× / + controls on the video, plus settings.

**Custom speed presets**
Add or remove speeds from 0.05× to 16×. Normal speed (1×) always stays available.

**Optional behaviours**
- Reset to 1× when you pause
- Skip long gaps between captions on sites that expose HTML5 captions

**Privacy**
No account required. No analytics. No data sent to the developer. Your preferences stay in Chrome storage (and Chrome Sync if you use it).

## Category
**Tools** (under the Productivity *group* — Productivity itself is not selectable)

Other options in that group: Education, Functionality & UI, Household, Privacy & Security, Workflow & Planning.

## Language
English (United Kingdom) — British English spelling in all listing copy. If the dropdown only has “English”, use that and keep British spelling.

## Graphic assets
| Asset | File | Spec |
|-------|------|------|
| Store icon | `icon-128.png` | 128×128, 24-bit PNG no alpha |
| Screenshots (up to 5) | `screenshot.png`, `screenshot-overlay.png`, `screenshot-settings-1280x800.png` | 1280×800, 24-bit PNG no alpha |
| Small promo tile | `promo-tile-440x280.png` | 440×280 |
| Marquee promo tile | `marquee-promo-tile-1400x560.png` | 1400×560 |
| Promo video | — | Skip |

## Additional fields
| Field | Value |
|-------|--------|
| Official URL | None (or dannyhope.co.uk if verified in Search Console) |
| Homepage URL | https://dannyhope.co.uk/video-speed-controller/ |
| Support URL | https://dannyhope.co.uk/video-speed-controller/ |
| Mature content | No |
| Visibility | **Unlisted** (link only — not Public until you choose) |
| Item support | On |

## Single purpose
*(Privacy / distribution tab — not Store listing)*

Control HTML5 video playback speed on websites using keyboard shortcuts and on-screen controls.

## Permission justifications (dashboard)

**storage**
Saves the user’s custom speeds, keyboard shortcuts, and playback preferences so they persist across sessions (and sync with Chrome Sync if enabled).

**sidePanel**
Opens the settings UI from the on-video settings button without leaving the page.

**Host permission / content scripts (`<all_urls>`)**
Videos appear on many different websites. The content script must run on the page the user is watching so it can find `<video>` elements (and YouTube embeds) and change `playbackRate`. The extension does not collect browsing history or send page content to the developer.

## Privacy practices (dashboard questionnaire — typical answers)
- **Collect personal data?** No (developer does not collect)
- **Data used for:** Functionality only (settings in Chrome storage; in-page video control)
- **Data sold?** No
- **Privacy policy URL:** https://dannyhope.co.uk/video-speed-controller/

## Support email
danny.hope@gmail.com
