# Fix: Add attribution footer to popup

**Readiness:** unrefined
**Roadmap:** later

## Issue
Per project guidelines, all projects should include "A Danny Hope product" attribution linking to https://dannyhope.co.uk

## Acceptance Criteria
- [ ] Footer link added to bottom of popup.html
- [ ] Link text is "A Danny Hope product"
- [ ] Link points to https://dannyhope.co.uk
- [ ] Styling is subtle/muted (doesn't clutter the interface)
- [ ] Footer is visible but not intrusive (e.g., small font, light color)

## Implementation
Add a subtle footer in popup.html (before closing body tag):
```html
<footer>
    <a href="https://dannyhope.co.uk" class="attribution-link">A Danny Hope product</a>
</footer>
```

Add styling to popup.css:
```css
footer {
    text-align: center;
    margin-top: 20px;
    padding-top: 12px;
    border-top: 1px solid #E1E4E6;
}

.attribution-link {
    color: #999;
    font-size: 11px;
    text-decoration: none;
    transition: color 0.2s;
}

.attribution-link:hover {
    color: #0066cc;
    text-decoration: underline;
}
```

## Files to Update
- `popup.html`
- `popup.css`
