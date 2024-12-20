# Video Speed Controller - User Stories

## Done

### Core Speed Control
- As a user, I want to press 'd' to increase video playback speed, so I can watch videos faster
- As a user, I want to press 's' to decrease video playback speed, so I can watch videos slower
- As a user, I want to long-press 'd' to jump to maximum speed that the browser supports, so I can quickly skip through unimportant sections
- As a user, I want to press 's' after using max speed to return to my previous speed, so I can resume watching at my preferred pace
- As a user, I want visual feedback showing my current playback speed, so I know how fast the video is playing

### Speed Customization
- As a user, I want to access a settings page to customize my available playback speeds
- As a user, I want to add my own custom speeds to the list of available speeds
- As a user, I want my custom speeds to persist between browser sessions
- As a user, I want to see my custom speeds displayed in a clear list format
- As a user, I want validation on my custom speeds to ensure they're between 0.05x and 16x

### User Interface
- As a user, I want an unobtrusive overlay that shows my current speed briefly when I change it
- As a user, I want the speed controls to be disabled when I'm typing in input fields or text areas
- As a user, I want to see the version and build number in the options page
- As a user, I want the interface to use system fonts and have a clean, modern appearance

### Default Behavior
- As a user, I want a sensible set of default speeds (0.05, 0.1×, 0.25×, 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×, 5×, 10×, 16×) when I haven't set custom speeds
- As a user, I want the video to start at normal (1x) speed by default
- As a user, I want the speed overlay to automatically fade out after showing the current speed

### Technical Requirements
- The extension should work on all websites with HTML5 video players
- The extension should maintain state using Chrome's storage sync API
- The extension should follow semantic versioning (major.minor.build)
- The extension should be lightweight and not impact page performance

## Later

### Keyboard Shortcuts
- As a user, I want to customize my keyboard shortcuts, so I can use keys that feel natural to me
- As a user, I want a keyboard shortcut to reset to normal (1x) speed, so I can quickly return to default
- As a user, I want to use number keys 1-9 to jump directly to specific speeds, so I can change speed more efficiently

### Advanced Features
- As a user, I want to save different speed presets for different websites, so I can have site-specific defaults
- As a user, I want to remember my last used speed per website, so I don't have to reset it each visit
- As a user, I want to see a small speed indicator permanently in the corner (toggleable), so I always know my current speed
- As a user, I want to control video speed with mouse wheel + modifier key, so I can adjust speed without keyboard

### User Experience
- As a user, I want to import/export my speed settings, so I can backup or share my configuration
- As a user, I want to see a tutorial on first use, so I can learn the controls quickly
- As a user, I want to see keyboard shortcut hints in the options page, so I can remember all available controls
