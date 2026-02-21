# UX Lint Report – Video Speed Controller

**Readiness:** auto-refined
**Roadmap:** now
**Report date:** 2026-02-19
**Scope:** Popup settings interface, on-screen speed controls overlay, shortcut configuration UI

---

## 🔴 Critical Issues

None identified. The extension's core functionality is usable.

---

## 🟠 Medium Issues

### 1. Placeholder Text Instead of Visible Hint
**Location:** `popup.html:23` (Add speed input)
**Issue:** The input uses `placeholder="Add speed (0.05-16)"` instead of visible hint text. Placeholders disappear when the field is focused, making instructions inaccessible while typing.
**Rule:** Tips and Help Text, Form Control State
**Recommendation:** Add a visible `<p class="hint">` or `<label>` text that explains the range (0.05–16) and stays visible when the field is focused.

---

### 2. No Dark Mode / Theme Support
**Location:** `popup.css`, `styles.css`
**Issue:** The extension uses hardcoded colours (e.g., `#343F44` text, `#F8F9FA` background) that don't adapt to system dark mode preferences. On macOS/Windows in dark mode, white settings panel text on light backgrounds is illegible.
**Rule:** Theme Picker (Appearance)
**Recommendation:**
- Add a System/Light/Dark theme selector in the settings popup
- Use CSS variables for colours so themes can be swapped easily
- Default to System to respect OS preference
- Include `prefers-color-scheme` media query in CSS

---

### 3. Keyboard Shortcuts Not Discoverable
**Location:** `popup.html` (Keyboard Shortcuts section)
**Issue:** Users can configure shortcuts, but there's no way to discover what the current shortcuts are while using the extension. They must return to the settings popup to check.
**Rule:** Keyboard Shortcuts
**Recommendation:**
- Add a help overlay (triggered by `?` key or a help button on the controls) that shows the current assigned shortcuts
- Display the active shortcuts somewhere persistent (e.g., as a tooltip on the on-screen controls, or in the first time the controls appear)
- Update the help overlay dynamically when shortcuts change

---

### 4. On-Screen Control Buttons Lack Visible Labels
**Location:** `content.js:289–305`, `styles.css:32–47`
**Issue:** The on-screen control buttons (`-`, `1×`, `+`, `⏭`, `⚙`) only show symbols. Users must hover to see titles. This breaks discoverability — especially for first-time users and keyboard users who can't hover.
**Rule:** Clickable Element Standards, Affordance
**Recommendation:**
- Add visible text labels next to icons (e.g., "Speed Down", "Reset", "Speed Up", "Skip Silence", "Settings")
- Alternatively, make titles visible on first load (e.g., show a tooltip briefly when controls first appear)
- Consider icon + label layout, or icon-only with clearer visual affordance (e.g., glowing on first appearance)

---

### 5. Small Touch Targets on On-Screen Controls
**Location:** `styles.css:36` (buttons padding: 5px)
**Issue:** The control buttons have only 5px padding with small fonts. On touchscreen devices, buttons should be at least 44×44px. These are likely ~30px, making them hard to tap accurately.
**Rule:** Mobile & Responsive Design, Clickable Element Standards
**Recommendation:**
- Increase button padding to at least 8px (making buttons ~40px)
- Increase font-size from default to at least 14px
- Test on mobile viewport widths to ensure buttons are reachable without accidental overlaps

---

### 6. Hover Gap Flicker on Control Buttons
**Location:** `styles.css:23` (gap: 5px)
**Issue:** The 5px gap between adjacent buttons in `.video-speed-controls` is small enough to cause a brief unhovered state as the pointer moves from one button to the next, creating visual flicker.
**Rule:** Hover Gap Flicker
**Recommendation:**
- Either reduce the gap to 0px (buttons touch) or increase it to 8–10px to make it intentional
- Ensure all buttons are adjacent with no dead zones, or space them generously

---

### 7. Shortcut Input Format Not Visible by Default
**Location:** `popup.html:45, 57, 69, 109`
**Issue:** The shortcut input fields have `title="Enter keys separated by commas (e.g., d, =, +)"` but this is only visible on hover. Users won't know they can enter multiple keys without discovering the tooltip.
**Rule:** Form Control State, Clickable Element Standards
**Recommendation:**
- Replace the title-only instruction with visible hint text below the input (e.g., `<p class="hint">Separate multiple keys with commas</p>`)
- Keep the title attribute as a reinforcement for hover

---

## 🟢 Minor Issues

### 1. Abbreviation "×" Symbol Not Explained
**Location:** `popup.html:31` (Remove button hint)
**Issue:** The hint says "× to remove" but the × symbol may not be immediately clear to all users, especially non-Latin readers.
**Rule:** Abbreviations
**Recommendation:**
- Change the hint text to be more explicit: "Click speed to edit, or click the remove button (×) to delete" or just "Click speed to edit, or remove"
- Or add a `<abbr title="Remove">×</abbr>` markup (though × is more of a symbol than an abbreviation)

---

### 2. No Autosave Feedback Clarity
**Location:** `popup.html:12` (status indicator), `popup.js`
**Issue:** The status indicator exists but it's not always clear whether a change is saved, pending, or failed. After adjusting a setting, users might not notice the brief "Saved" message.
**Rule:** Autosave Feedback
**Recommendation:**
- Ensure the status indicator is always visible and provides clear feedback for:
  - Changes made (e.g., "Saving...")
  - Success (e.g., "Saved" in green with checkmark)
  - Failure (e.g., "Save failed" in red with explanation)
- Consider keeping the feedback visible for 2–3 seconds instead of fading quickly

---

### 3. Section Headings Use Title Case
**Location:** `popup.html:16, 35, 75, 89` (h2 elements)
**Issue:** Section headings like "Speed Presets", "Keyboard Shortcuts", "Playback Options" use Title Case. While acceptable for headings, sentence case would be more modern and scan-friendly.
**Rule:** Content Design, Button Text Casing
**Recommendation:** Change to sentence case: "Speed presets", "Keyboard shortcuts", "Playback options", "Skip silence"

---

### 4. Speed-Up/Down Buttons Not Labelled with Assigned Shortcuts
**Location:** `content.js:290–298` (speed-down, speed-up buttons)
**Issue:** The buttons say `-` and `+` but don't show what keys are assigned (e.g., "- [d key]" or similar). Users can't see their shortcuts on the controls.
**Rule:** Keyboard Shortcuts, Affordance
**Recommendation:**
- Dynamically update button labels to show the assigned shortcut keys (e.g., "- (d)" or "Speed Down (d)")
- Or display the shortcuts in a help tooltip triggered by hovering over controls

---

### 5. Missing Attribution / "Danny Hope product" Link
**Location:** `popup.html`
**Issue:** Per project guidelines, all projects should include attribution to Danny Hope (dannyhope.co.uk).
**Rule:** Attribution
**Recommendation:**
- Add a subtle footer link in `popup.html` with "A Danny Hope product" linking to https://dannyhope.co.uk
- Style it muted so it doesn't clutter the interface

---

## ✅ Good Practices Observed

- **Semantic HTML**: Buttons are used for actions, not divs
- **Accessibility attributes**: Proper `aria-labels`, `aria-live`, and role attributes throughout
- **Focus styles**: Clear 2px focus outlines on all interactive elements (blue, high contrast)
- **Status feedback**: Status indicator with `aria-live="polite"` for save feedback
- **Form validation**: Error states with red borders and background on invalid inputs
- **Responsive typography**: Consistent font family and size hierarchy
- **State persistence**: Settings appear to use `chrome.storage.sync` for cross-session persistence
- **Keyboard navigation**: All form controls and buttons are keyboard accessible with proper tabindex

---

## Summary

**High priority (🔴 → 🟠):** 7 medium-severity issues
**Low priority (🟢):** 5 minor-severity issues

**Quick wins:**
- Add visible hint text for placeholder inputs
- Implement dark mode support with system preference detection
- Add visible labels to on-screen control buttons
- Increase touch target sizes on buttons

**Longer term:**
- Implement keyboard shortcut discovery (help overlay)
- Add shortcut labels to control buttons
- Improve shortcut input instructions

---

*Report generated by `/ux-lint`*

---

## Auto-investigation
**Investigated:** 2026-02-21

### Findings
- This file is a **source report** (output of `/ux-lint`), not a conventional task. Its purpose is to be processed into actionable tasks.
- All 7 🟠 medium-severity issues have been converted into individual `.in/` tasks.
- 3 of the 5 🟢 minor-severity issues have **no corresponding task yet**.
- The "missing attribution" minor issue is covered by `add-attribution-footer.md`.
- The "speed-up/down button labels" minor issue partially overlaps with `add-visible-labels-to-controls.md`.

### Issue-to-task mapping

| Report issue | Task |
|---|---|
| 🟠 1. Placeholder text instead of visible hint | `fix-placeholder-hint-text.md` ✅ |
| 🟠 2. No dark mode / theme support | `add-dark-mode-support.md` ✅ |
| 🟠 3. Keyboard shortcuts not discoverable | `add-shortcut-discovery-help.md` ✅ |
| 🟠 4. On-screen controls lack visible labels | `add-visible-labels-to-controls.md` ✅ |
| 🟠 5. Small touch targets on controls | `increase-touch-target-sizes.md` ✅ |
| 🟠 6. Hover gap flicker on control buttons | `fix-hover-gap-flicker.md` ✅ |
| 🟠 7. Shortcut input format not visible | `improve-shortcut-input-hints.md` ✅ |
| 🟢 1. Abbreviation "×" symbol not explained | ❌ No task |
| 🟢 2. No autosave feedback clarity | ❌ No task |
| 🟢 3. Section headings use Title Case | ❌ No task |
| 🟢 4. Speed buttons not labelled with shortcuts | ↗️ Partially in `add-visible-labels-to-controls.md` |
| 🟢 5. Missing attribution link | `add-attribution-footer.md` ✅ |

### Scope
- No code changes needed for this file itself — it's a report
- Estimated complexity: small (decision task only)
- Docs impact: none

### Questions for refinement
1. Should tasks be created for the 3 uncovered minor issues (× abbreviation, autosave feedback, Title Case headings)?
2. Once resolved, this report file should move to `.in/built/` — agree?

### Documentation impact
- _(none — this is a report, not a code change)_

### Related items
- `fix-placeholder-hint-text.md` (`.in/`) — spawned from this report
- `add-dark-mode-support.md` (`.in/`) — spawned from this report
- `add-shortcut-discovery-help.md` (`.in/`) — spawned from this report
- `add-visible-labels-to-controls.md` (`.in/`) — spawned from this report
- `increase-touch-target-sizes.md` (`.in/`) — spawned from this report
- `fix-hover-gap-flicker.md` (`.in/`) — spawned from this report
- `improve-shortcut-input-hints.md` (`.in/`) — spawned from this report
- `add-attribution-footer.md` (`.in/`) — spawned from this report
