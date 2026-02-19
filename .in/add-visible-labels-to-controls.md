# Fix: Add visible labels to on-screen control buttons

**Readiness:** unrefined
**Roadmap:** now

## Issue
The on-screen control buttons (`-`, `1×`, `+`, `⏭`, `⚙`) only show symbols. Users can't discover what they do without hovering, breaking discoverability for first-time users.

## Acceptance Criteria
- [ ] Each button has a visible text label (e.g., "Speed Down", "Reset", "Speed Up", "Skip", "Settings")
- [ ] Labels are readable at small sizes (consider icon + short label layout)
- [ ] Layout doesn't become too wide on small screens
- [ ] Focus states are still clear on buttons
- [ ] Buttons maintain accessibility with alt text / aria-labels

## Implementation Options
1. **Icon + Label:** Small icon followed by text label (wider but clearer)
2. **Tooltip on Hover:** Keep current look, but make tooltip appear on hover (less discoverable)
3. **Labels on First Load:** Show tooltip for 3 seconds when controls first appear, then hide (compromise)

## Recommendation
Use option 1 (Icon + Label) with abbreviated labels if space is tight: "↓ Speed", "1×", "↑ Speed", "⏭ Skip", "⚙"

## Files to Update
- `content.js` – createControls() method (lines 285–318)
- `styles.css` – adjust button layout and spacing
