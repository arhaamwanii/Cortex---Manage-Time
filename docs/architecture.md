# Architecture

The CORTEX Pomodoro Timer is a Manifest V3 Chrome extension. Its architecture is based on three main components that work together: a background service worker, a content script, and a new tab override page.

### 1. `background.js` (Service Worker)

This is the brain of the extension. It is responsible for:
- **State Management:** It holds the global timer state, including the time left, whether the timer is running, the current mode (Pomodoro/Stopwatch), and the current task.
- **Timer Logic:** It contains the `setInterval` logic that decrements or increments the timer every second.
- **Persistence:** It uses the `chrome.storage.sync` API to save the timer's state. This ensures the state persists across browser sessions and syncs between devices.
- **Communication Hub:** It acts as the central communication hub. It listens for messages from the content script (e.g., 'startTimer', 'setTask') and broadcasts state updates to all content scripts to keep the UI synchronized.

### 2. `content.js` and `timer.css` (Content Script)

This is the user-facing part of the extension.
- **UI Injection:** `content.js` is responsible for creating and injecting the floating timer element into every webpage the user visits. The `timer.css` file provides the styling for this element.
- **User Interaction:** It handles all user interactions with the timer UI, such as clicking buttons (start, reset, etc.) and dragging the timer around the screen.
- **Communication with Background:** When a user interacts with the UI, the content script sends a message to the `background.js` service worker to perform an action. For example, clicking the "Start" button sends a `{ action: 'startTimer' }` message.
- **Receiving Updates:** The content script has a listener (`chrome.runtime.onMessage`) that waits for `updateTimerDisplay` messages from the background script. When it receives an update, it redraws the timer UI with the new state.
- **Domain-Specific Positioning:** It saves the draggable timer's position in `chrome.storage.sync` with a key unique to the current domain (`position_www.example.com`), allowing for different saved positions on different websites.

### 3. `newtab.html` (New Tab Override)

This component enhances the new tab experience.
- **Integration, not Duplication:** Instead of building a separate timer for the new tab page, `newtab.html` is a nearly empty HTML file that simply includes the `content.js` script.
- **Centering the Timer:** It contains a small block of CSS that overrides the usual positioning rules from `timer.css` and forces the floating timer to be displayed in the center of the new tab page. This provides a focused view without duplicating any of the core timer logic.

### Communication Flow (Example: Starting the Timer)

1.  **User Action:** The user clicks the "Start" button on the floating timer UI of a webpage.
2.  **Content Script:** The `onclick` handler in `content.js` is triggered. It sends a message to the background script: `chrome.runtime.sendMessage({ action: 'startTimer' });`.
3.  **Background Script:** The `onMessage` listener in `background.js` receives this message. It calls the `startGlobalTimer()` function.
4.  **State Change:** `startGlobalTimer()` sets `globalTimer.isRunning = true` and starts a `setInterval` loop to update `globalTimer.timeLeft`.
5.  **Broadcast:** Inside the loop, `background.js` calls `broadcastTimerUpdate()`, which queries all open tabs and sends them the latest timer state: `chrome.tabs.sendMessage(tab.id, { action: 'updateTimerDisplay', ... });`.
6.  **UI Update:** The `onMessage` listener in `content.js` on *every* tab receives the new state and calls `updateDisplay()` to update the timer text and the button's appearance. 