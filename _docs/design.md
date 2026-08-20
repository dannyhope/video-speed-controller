# Video Speed Controller — Design

> Living document. Update whenever visual design changes. Last updated: 2026-08-19.
>
> Companion to [`spec.md`](./spec.md) (behaviour). This file is the source of truth for **how it should look**.

---

## Visual intent

Quiet utility chrome that sits on top of video players without looking like a product landing page. Dark translucent panels, white type, system fonts — readable over any video.

---

## On-page overlay

| Token | Value |
|-------|--------|
| Background | `rgba(0, 0, 0, 0.8)` |
| Text | white |
| Padding | ~10px 20px |
| Radius | 5px |
| Font | system UI stack |
| Behaviour | Centred on video; fades after ~1s |

Label: `Normal speed` at 1×, otherwise `N×`.

---

## On-page controls

- Fixed near the video’s top-left (≈10px inset).
- Row of compact buttons (−, 1×, +, skip silence, settings).
- Same dark translucent bar as the overlay.
- Hidden by default; opacity fade in/out on hover.
- Skip silence **active**: green-tinted fill; **unavailable**: reduced opacity.

---

## Settings popup / side panel

- Compact vertical form: speed pills, shortcut fields, checkboxes.
- Speed pills: click to edit, × to remove (not on 1×).
- Status line for save / validation feedback.
- Prefer British English in labels (“customisable”, “colour” if used).

---

## Extension icons

Neutral mid-grey (`#7B858A`) double-triangle (fast-forward) glyph on a **transparent** background. No rounded-square tile. About 12% inner padding so the mark does not touch the canvas edge.

| Size | File |
|------|------|
| 16 / 48 / 128 | `icons/icon-*.png` (RGBA) |
| Source | `icons/icon.svg` / `icons/icon-2048.png` |

Store listing uses `publish/icon-128.png` (same glyph flattened onto white; no alpha).
