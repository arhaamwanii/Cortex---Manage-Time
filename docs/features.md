# CORTEX - Smart Pomodoro Timer: Features

CORTEX is a sophisticated, floating Pomodoro timer designed to enhance productivity by providing a persistent, feature-rich time management tool that follows you across the web.

## Core Functionality

- **Floating Timer:** A persistent, floating timer is injected onto every website you visit, ensuring your session is always visible.
- **Draggable Interface:** The timer can be freely dragged and repositioned anywhere on the screen.
- **Per-Domain Position Memory:** The timer's position is saved for each individual website (domain), so it will always appear where you last left it on that site.
- **New Tab Integration:** The extension overrides the default new tab page, placing the timer in the center of the screen for immediate focus.

## Timer Modes

The extension offers two primary modes to suit different work styles:

- **Pomodoro Mode:** A classic countdown timer to structure work into focused intervals. The duration for the Pomodoro session can be customized.
- **Stopwatch Mode:** A count-up timer that allows you to track time without a predefined limit.

## Timer Controls

The timer controls are designed to be unobtrusive, appearing only when you hover over the timer element.

- **Start / Pause:** Begin or pause the current timer session.
- **Reset:** Reset the timer back to its default state or zero.
- **Set Duration:** A prompt allows you to define a custom duration (in minutes) for your Pomodoro sessions.
- **Switch Mode:** Instantly toggle between Pomodoro and Stopwatch modes.

## Task Management

- **Set Current Task:** You can define your current task, which will be prominently displayed on the timer, helping you stay focused on the objective.

## Notifications & Reminders

- **Task Reminders:** When a task is set and the timer is running, the extension provides periodic, gentle sound notifications to keep you engaged.
- **Adjustable Frequency:** The interval for these reminders can be easily adjusted to be more or less frequent.
- **Custom Sounds:** You can upload your own audio file to be used as the reminder sound for a personalized experience.

## User Interface & Experience

- **Modern Design:** The timer features a clean, modern, dark-themed aesthetic with semi-transparent and blurred background effects (`backdrop-filter`) that blend seamlessly with any website.
- **Minimizable:** The entire timer can be minimized into a small, colored dot to reduce screen clutter. This dot can also be dragged and repositioned.
- **One-Click Restore:** Clicking the minimized dot instantly restores the full timer interface.
- **Contextual Controls:** Controls for the timer and reminder frequency are hidden by default and only appear on hover, maintaining a clean and focused UI.

## Synchronization & Persistence

- **Cross-Tab Sync:** The timer's state, including the current time, mode, running status, and task, is synchronized across all open tabs in real-time.
- **Session Persistence:** The timer's state is saved and automatically restored when you close and reopen your browser, ensuring you never lose your session.

## Secondary Stopwatch

- **Independent Stopwatch:** In addition to the main timer modes, a secondary, simple stopwatch is available for miscellaneous time tracking. It can be started and stopped independently of the main Pomoro/Stopwatch timer.
