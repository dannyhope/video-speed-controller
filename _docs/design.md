# Video Speed Controller — Design

> Living document. Update whenever visual design changes. Last updated: 2026-08-26.
>
> Companion to [`spec.md`](./spec.md) (behaviour). This file is the source of truth for **how it should look**.

---

## Visual intent

Quiet utility chrome that sits on top of video players without looking like a product landing page. Dark translucent panels, white type, system fonts — readable over any video.

## Local development

- The browser-facing development URL is `http://video-speed-controller.local/`, provided by Bombay’s shared port-80 proxy.
- The project server listens only on loopback at the preferred port `5237`; development files use the repository’s normal static reload workflow.

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
- A single underlined **Speed preferences** text link on a small dark translucent chip — not a row of icon buttons.
- Hidden by default; fade in while the pointer is over the video (or the link) and stay visible for that whole hover; fade out after leaving. Also appear briefly when speed is changed from the keyboard if YouTube’s bar is not showing.
- Shortcut help overlay: centred dark panel listing current keys; opened with `?`, not an on-video button.
- On YouTube, **Speed preferences** is a text control in the native right-hand player bar, styled to sit with YouTube’s own buttons.

---

## Settings popup / side panel

- Compact vertical form: speed pills, shortcut fields, checkboxes.
- Speed pills: click to edit, × to remove (not on 1×).
- Add speed uses the input’s min/max constraints without helper text. Shortcut and Skip Silence fields have labels only — no example or capability comments. No placeholder-only instructions.
- Footer: muted “Feedback” (left) → https://dannyhope.co.uk/feedback, and “A Danny Hope product” (right) → dannyhope.co.uk. Cool Grey 60 (`#616E73`), hover to foreground (`#343F44`). 11px.
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
