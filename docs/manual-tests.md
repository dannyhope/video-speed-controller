# Manual Tests

Tests that require human verification. Run these periodically, especially after changes to keyboard handling or video detection.

**Last run:** _Never_

## YouTube-Specific Tests

### YouTube Key Acquisition (when implemented)
- [ ] Go to youtube.com and play a video
- [ ] Press `>` (Shift+.) - should use OUR speed list, not YouTube's limited options
- [ ] Press `<` (Shift+,) - should use OUR speed list
- [ ] Verify our overlay appears (not YouTube's native speed indicator)
- [ ] Verify speed increments through full speed list (0.05, 0.1, 0.25... not just 0.25, 0.5, 0.75...)

### YouTube General
- [ ] Extension works on youtube.com video pages
- [ ] Extension works on youtube.com embedded players
- [ ] Shortcuts work when video is focused
- [ ] Shortcuts work when video is not focused
- [ ] On-screen controls appear and function

## Site-Specific Tests

### Vimeo
- [ ] vimeo.com video pages
- [ ] Embedded Vimeo players

### Netflix
- [ ] netflix.com (requires account)
- [ ] Shortcuts work during playback

### Other Sites
- [ ] Twitter/X video players
- [ ] Reddit video players
- [ ] Twitch streams
- [ ] BBC iPlayer (UK)
- [ ] Generic HTML5 video (e.g., w3schools.com/html/html5_video.asp)

## Edge Cases

### Multiple Videos
- [ ] Page with multiple videos - controls attach to correct video
- [ ] Switching between videos works correctly

### Dynamic Content
- [ ] SPA navigation (video loads after page) - extension re-initialises
- [ ] Infinite scroll pages with videos

### Settings Persistence
- [ ] Custom speeds persist after browser restart
- [ ] Custom shortcuts persist after browser restart
- [ ] Settings sync across Chrome instances (if signed in)

## Recording Results

After running tests, update "Last run" date above and note any failures:

```
### Test Run: YYYY-MM-DD
- Passed: X/Y
- Failed: [list any failures]
- Notes: [any observations]
```
