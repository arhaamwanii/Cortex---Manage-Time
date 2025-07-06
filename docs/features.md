# Features

The CORTEX Pomodoro Timer is designed to be a simple yet powerful tool for focus. Here are its core features:

### 1. Floating Timer on Every Page
The timer is injected into every website you visit, ensuring it's always visible and accessible. You don't need to switch to a specific tab to see or control your timer.

### 2. Draggable and Position-Aware
You can drag and drop the timer anywhere on your screen. The extension is smart enough to remember the timer's position on a per-website basis. For example, you can have it on the top-right on Google Docs and bottom-left on GitHub.

### 3. Dual Modes: Pomodoro and Stopwatch
The timer can operate in two modes:
- **Pomodoro Mode:** A countdown timer for focused work intervals. You can set any duration you like.
- **Stopwatch Mode:** A count-up timer to track time on a task without a predefined limit.

You can instantly switch between these modes with a single click.

### 4. Persistent and Synchronized State
The timer's state (current time, running status, task, etc.) is saved using `chrome.storage.sync`. This means:
- **It survives browser restarts:** If you were in the middle of a Pomodoro session and you close your browser, the timer will resume from where it left off when you open it again.
- **It syncs across devices:** If you are logged into your Google account on multiple computers, the timer state will be synchronized between them.

### 5. Configurable Duration and Task
- **Set Duration:** You can easily change the duration of the Pomodoro timer by clicking the "Set" button.
- **Set Task:** You can add a label for your current task, which is displayed directly on the timer. This helps you stay focused on the task at hand. This also serves as a subtle, constant reminder of your goal.

### 6. Minimizable UI
If the timer feels intrusive, you can minimize it with the "×" button. It will shrink into a small, colored dot on the side of the screen. You can click the dot to bring the full timer back. The dot is also draggable.

### 7. New Tab Page Integration
When you open a new tab, the CORTEX timer appears centered on the screen. This turns your new tab page into a focused environment, reminding you of your current task and timer status.

### 8. Audio Alert on Completion
When a Pomodoro countdown finishes, the extension plays a sound to notify you that your work session is over and it's time for a break. 