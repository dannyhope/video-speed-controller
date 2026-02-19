# Fix: Remove hover gap flicker on control buttons

**Readiness:** unrefined
**Roadmap:** later

## Issue
The 5px gap between adjacent buttons in the control bar is small enough to cause a brief unhovered state as the pointer moves between buttons, creating visual flicker.

## Acceptance Criteria
- [ ] Buttons are either adjacent (0px gap) or spaced with an intentional 8px+ gap
- [ ] No visual flicker when moving the pointer from one button to the next
- [ ] All buttons have consistent spacing

## Implementation
- Change `gap: 5px` to either `gap: 0` or `gap: 10px` depending on design preference
- Test by moving the pointer between buttons quickly
- Option: Use inner padding instead of outer margin for spacing

## Files to Update
- `styles.css` – `.video-speed-controls` (line 23)
