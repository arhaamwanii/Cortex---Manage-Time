# Shortcomings & Future Improvements

While CORTEX is a functional Pomodoro timer, it has several limitations and areas for potential improvement.

---

### User-Facing Shortcomings

These are limitations that directly affect the user experience.

-   **1. No Dedicated Break Timers:**
    A core part of the Pomodoro Technique is alternating between work intervals (Pomodoros) and breaks (short and long). This extension lacks a built-in system for this. The user must manually change the timer's duration to time their breaks, which is cumbersome and detracts from the methodology.
    
-   **2. Basic Notification System:**
    The only notification for a completed timer is an audio alert played from the content script. If the user's computer is muted, the tab is muted, or they are not wearing headphones, they will miss the alert.
    
-   **3. No Task History or Analytics:**
    The extension only keeps track of the current task. There is no log of completed Pomodoros, finished tasks, or daily/weekly focus statistics. This is a missed opportunity for user engagement and tracking productivity over time.
    
-   **4. No Pre-configurable Timer Durations:**
    The user can only set one custom duration at a time. They cannot create and save presets (e.g., "Work," "Short Break," "Long Break") for quick switching.

---

### Technical Shortcomings

These are limitations in the implementation that could be improved.

-   **1. Inefficient State Broadcasting:**
    The `background.js` script updates the UI by querying *all* open tabs and sending each one a message. For a user with a large number of tabs open, this is an inefficient approach that can consume unnecessary resources. A more optimized approach would involve a more direct line of communication or having content scripts pull data when they become visible.
    
-   **2. Confusing Internal State Logic:**
    In `background.js`, there is a `globalTimer` object that can operate as a countdown timer or a stopwatch. However, there is also a separate `stopwatch` object that is partially used. This creates confusion in the codebase about how state is managed. The logic could be refactored for clarity, likely by merging the two into a single, more robust state object.

---

### Potential Future Features

-   **Full Pomodoro Cycle:** Implement an automated cycle of Pomodoro -> Short Break -> Pomodoro -> ... -> Long Break.
-   **Chrome Rich Notifications:** Use the `chrome.notifications` API to provide native desktop notifications that are more noticeable and informative.
-   **Task Management & History:** Allow users to manage a list of tasks and view a history of their completed Pomodoros.
-   **Favicon Timer:** Display the remaining time on the tab's favicon for at-a-glance progress.
-   **Sounds & Themes:** Allow users to choose different alert sounds and customize the look of the timer.
-   **Data Export:** Allow users to export their productivity data as a CSV or JSON file. 