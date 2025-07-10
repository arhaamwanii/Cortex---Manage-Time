<div align="center">
  <img src="icon/icon128.png" alt="Elevate Logo" width="128" height="128">
  
  # Elevate
  **Rise Above Distractions**
  
  *A smart, floating Pomodoro timer that follows you across every website for focused productivity*
</div>

---

## Overview

Elevate is a comprehensive productivity Chrome extension that transforms your browsing experience into a focused workspace. Unlike traditional timer apps that exist in isolation, Elevate becomes an integral part of your web browsing, providing a floating timer that appears on every website you visit while offering intelligent website blocking and customizable productivity features.

The extension seamlessly integrates into your workflow by replacing your new tab page with a focused workspace and providing a persistent floating timer that remembers its position on each website. Whether you're researching, coding, writing, or studying, Elevate ensures your focus sessions are consistent and uninterrupted across your entire browsing experience.

---

## Features

### Core Timer Functionality

**Floating Universal Timer**
- Appears on every website you visit automatically
- Completely draggable and repositionable on any page
- Per-domain position memory - remembers where you place it on each website
- Cross-tab synchronization keeps timer state consistent across all browser tabs
- Persistent across browser sessions - continues where you left off after restart

**Dual Timer Modes**
- **Pomodoro Mode**: Traditional countdown timer for structured focus sessions (default 25 minutes)
- **Stopwatch Mode**: Count-up timer for open-ended work sessions
- Instant mode switching without losing current session
- Customizable durations for Pomodoro sessions

**Smart Controls**
- Hover-to-reveal control interface keeps your workspace clean
- Start, pause, reset, and duration setting all accessible from any webpage
- Task labeling system to keep you focused on current objectives
- One-click mode switching between Pomodoro and Stopwatch

### Advanced Productivity Features

**Intelligent Website Blocking**
- Blocks distracting websites during focus sessions
- Pre-configured with popular social media sites (YouTube, Facebook, Instagram, X/Twitter, TikTok, Reddit, Pinterest, LinkedIn, Snapchat)
- Customizable blocked websites list with easy add/remove functionality
- Visual website icons in blocking interface for easy management
- Redirects blocked sites to your focused new tab workspace
- Toggle blocking on/off instantly from popup interface

**Smart Audio Reminder System**
- Standalone audio reminders independent of timer state
- Customizable frequency settings (every 1-10 minutes)
- Volume control for perfect environment integration
- Custom audio upload capability for personalized reminder sounds
- Multiple built-in reminder sound options
- Works regardless of timer running status when enabled

**New Tab Integration**
- Replaces Chrome's default new tab with a focused workspace
- Centered timer display with optimized scaling for desktop use
- Distraction-free black background environment
- Toggleable - can be disabled to restore default Chrome new tab
- Maintains all timer functionality in new tab environment

### User Experience Enhancements

**Minimization & Visibility**
- Minimize timer to a small dot when not needed
- Draggable minimized state maintains position memory
- One-click restoration from minimized state
- Complete hiding option with easy re-enable functionality

**Seamless Synchronization**
- Real-time state synchronization across all browser tabs
- Automatic state refresh when returning to suspended tabs
- Persistent storage ensures continuity across browser restarts
- Background service worker prevents timer interruption

**Modern Interface Design**
- Clean, dark-themed aesthetic with orange accent colors
- Semi-transparent overlays that blend with any website
- Responsive design adapts to different screen sizes
- Contextual controls appear only when needed
- Professional appearance suitable for any work environment

### Task Management

**Focus Session Organization**
- Set and display current task labels during work sessions
- Task persistence across timer sessions and browser restarts
- Visual task display integrated into timer interface
- Helps maintain mental clarity on current objectives

---

## Installation

Since Elevate is distributed as an unpacked Chrome extension, you'll need to install it in Developer Mode. Follow these steps:

### Step 1: Download the Extension
- Clone this repository or download it as a ZIP file
- If downloaded as ZIP, extract the contents to a folder on your computer
- Note the location of the `pomodoro timer` folder

### Step 2: Access Chrome Extensions
- Open Google Chrome browser
- Navigate to `chrome://extensions/` by typing it in the address bar
- Alternatively, go to Chrome menu → More tools → Extensions

### Step 3: Enable Developer Mode
- In the top-right corner of the Extensions page, locate the "Developer mode" toggle
- Switch the toggle to the **ON** position
- You should now see additional buttons including "Load unpacked"

### Step 4: Load the Extension
- Click the "Load unpacked" button that appeared after enabling Developer Mode
- In the file browser that opens, navigate to and select the `pomodoro timer` folder
- Click "Select" to confirm your choice

### Step 5: Verify Installation
- Elevate should now appear in your list of installed extensions
- You should see the orange Elevate icon in your Chrome toolbar
- The floating timer will automatically appear on your next webpage visit
- Your next new tab will show the Elevate workspace

### Permissions Explained
During installation, Chrome will request the following permissions:
- **activeTab**: To display the timer on your current webpage
- **storage**: To save your preferences and timer positions
- **tabs**: To synchronize timer state across browser tabs
- **scripting**: To inject the timer into webpages
- **webNavigation**: To detect new tab creation for workspace integration
- **notifications**: To alert you when focus sessions complete

---

## How to Use Elevate

### Getting Started

**First Launch**
1. After installation, visit any website to see the floating timer appear
2. The timer defaults to a 25-minute Pomodoro session
3. Drag the timer to your preferred position on the page
4. Open a new tab to experience the centered workspace view

**Basic Timer Operations**
1. **Start a Session**: Hover over the timer and click "Start"
2. **Set Your Task**: Click "Task" and enter what you're working on
3. **Adjust Duration**: Click "Set" to customize session length
4. **Pause/Resume**: Click "Start" again to pause or resume
5. **Reset**: Click "Reset" to return to default duration
6. **Switch Modes**: Click the mode button to toggle between Pomodoro and Stopwatch

### Advanced Features

**Website Blocking**
1. Click the Elevate icon in your toolbar to open the popup
2. Navigate to the "Website Blocker" section
3. Toggle the blocker on/off using the main switch
4. Click the dropdown arrow to customize blocked sites
5. Add custom websites or remove pre-configured ones
6. Sites with orange highlighting are currently blocked

**Audio Reminders**
1. In the popup, find the "Reminders" section
2. Toggle audio reminders on/off as needed
3. Adjust volume using the slider control
4. Set reminder frequency (1-10 minute intervals)
5. Upload custom reminder sounds using the upload button
6. Test your settings with the built-in sound preview

**Timer Positioning**
1. Drag the timer to any position on any website
2. Your preferred position is automatically saved for each domain
3. Visit the same site later and the timer appears in your saved position
4. Different websites can have different timer positions

**Minimization**
1. Look for the 'X' button when hovering over the timer
2. Click to minimize the timer to a small dot
3. Drag the dot to reposition it if needed
4. Click the dot to restore the full timer interface

### Productivity Tips

**Effective Focus Sessions**
- Set specific, actionable tasks before starting each session
- Use Pomodoro mode for time-boxed work with natural break points
- Use Stopwatch mode for deep work where you don't want time pressure
- Enable audio reminders during long research sessions to stay engaged

**Website Blocking Strategy**
- Block social media during work hours using the pre-configured list
- Add specific news sites or entertainment platforms that distract you
- Toggle blocking off during breaks but remember to re-enable for work
- Use the new tab workspace as a neutral starting point when blocked sites redirect

**Cross-Device Workflow**
- Your timer settings sync across all Chrome instances where you're signed in
- Start a session on your desktop and continue on your laptop
- Timer positions and preferences follow you to any Chrome browser

---

## File Structure and Technical Details

### Core Extension Files

**`manifest.json`** - Extension configuration and permissions
- Defines extension metadata (name, version, description)
- Specifies required Chrome permissions
- Configures content scripts to run on all websites
- Sets up background service worker and browser action popup

**`background.js`** (1,513 lines) - Service worker handling core logic
- Timer state management and cross-tab synchronization
- New tab redirection logic for workspace integration
- Website blocking enforcement and URL pattern matching
- Audio reminder system with standalone operation
- Chrome storage management for settings persistence
- Message passing coordination between components

**`content.js`** (1,346 lines) - Floating timer interface on websites
- Creates and manages the floating timer element on every webpage
- Handles drag-and-drop positioning with per-domain memory
- Timer display updates and visual state management
- Audio playback for reminders and notifications
- Cross-tab state synchronization and real-time updates
- Integration with website blocking redirects

**`popup.js`** (1,892 lines) - Extension popup control interface
- Complete timer control panel with real-time updates
- Website blocker management interface with visual feedback
- Audio reminder configuration with volume and frequency controls
- Custom audio upload and management system
- Settings synchronization across all extension components
- Icon caching and display optimization for blocked websites

**`popup.html`** (1,103 lines) - Popup interface structure
- Complete HTML layout for extension popup
- Website blocker interface with dropdown functionality
- Audio reminder controls with upload capabilities
- Timer settings and mode switching interface
- Modern responsive design with dark theme

### Styling and Assets

**`timer.css`** (343 lines) - Complete styling for all components
- Floating timer appearance with backdrop blur effects
- Hover state animations and smooth transitions
- New tab workspace centered layout optimizations
- Website blocker interface styling with orange accent theme
- Audio reminder controls and custom upload interface styling
- Cross-browser compatibility for modern web features

**`icon/`** - Extension icons in multiple resolutions
- `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`
- Used for Chrome toolbar, extensions page, and system notifications
- Consistent orange and black branding across all sizes

### New Tab Integration

**`newtab.html`** (179 lines) - Focused workspace replacement for new tabs
- Full-screen black background for distraction-free environment
- Centered timer with optimized scaling for desktop viewing
- Loading states and error handling for robust experience
- Search suggestion integration maintaining browser functionality

**`newtab-main.js`** (841 lines) - New tab workspace functionality
- Timer initialization and state management for new tab environment
- Error handling and fallback mechanisms for reliable operation
- Integration with main timer system while maintaining independence
- Performance optimization for instant tab opening

### Website Blocking System

**`blocker/`** - Advanced website blocking infrastructure
- `website-blocker-background.js` (599 lines) - Core blocking logic with URL pattern matching
- `brain-rot-block.js` (1,594 lines) - Comprehensive blocking interface with custom block pages
- `brain-rot-block.css` (702 lines) - Styling for blocked page redirects
- `builtin-extensions.js` (589 lines) - Integration with Chrome's built-in extension blocking
- `builtin-extensions.css` (512 lines) - Styling for extension-based blocks

### Documentation and Development

**`docs/`** - Technical documentation
- `features.md` - Detailed feature descriptions and technical specifications
- `privacy-policy.md` - Privacy policy and data handling information
- `README.md` - Basic project information

**Development Files**
- `.gitignore` - Git version control exclusions
- `FORCE_RELOAD.md` - Development instructions for extension reloading
- `REMIND.TXT` - Development notes and feature requests
- `privacy-policy.md` - User privacy information

### Extension Architecture

**Message Passing System**
The extension uses Chrome's message passing API to coordinate between:
- Background service worker (global state management)
- Content scripts (website integration)
- Popup interface (user controls)
- New tab pages (workspace environment)

**Storage Strategy**
- `chrome.storage.sync` - User preferences and settings (synced across devices)
- `chrome.storage.local` - Temporary data and performance optimizations
- Per-domain position storage for individualized website experiences

**Performance Optimizations**
- Debounced state saving to prevent Chrome storage quota issues
- Icon caching system to reduce network requests
- Efficient cross-tab communication to minimize background processing
- Service worker keepalive mechanisms for consistent operation

---

## Technical Requirements

**Browser Compatibility**
- Google Chrome (minimum version supporting Manifest V3)
- Chromium-based browsers (Edge, Brave, etc.)

**System Requirements**
- No additional system dependencies
- Minimal memory footprint (background service worker)
- Works offline after initial installation

**Permissions Usage**
- All requested permissions are essential for core functionality
- No data is transmitted outside your browser
- All storage remains local to your Chrome installation

---

## Privacy and Security

Elevate is designed with privacy as a fundamental principle:

- **No Data Collection**: The extension does not collect, transmit, or store any personal information on external servers
- **Local Storage Only**: All settings, preferences, and timer data remain locally in your Chrome browser
- **No Network Communication**: The extension operates entirely offline after installation
- **Minimal Permissions**: Only requests permissions necessary for core timer and blocking functionality
- **Open Source**: All code is available for inspection in this repository

Your productivity data, browsing habits, and personal information remain completely private and under your control.

---

**Built for focus. Designed for productivity. Engineered for privacy.** 