# CORTEX - A Smart Pomodoro Timer for Chrome

CORTEX is a smart, floating Pomodoro timer that follows you across every website, helping you stay focused and productive. It's designed to be unobtrusive yet always accessible, and it occasionally reminds you of your current task just by being present on your screen.

For detailed technical documentation, please see the [`docs`](./docs/README.md) folder.

---

## Features

-   **Floating Timer:** A draggable timer that is present on every webpage you visit.
-   **Per-Site Position Saving:** CORTEX remembers where you place the timer on different websites.
-   **Configurable Task Reminders:** Set a frequency for gentle, periodic reminders that play a sound and visually shake the timer to help you stay on task. An indicator shows when reminders are active.
-   **Dual Modes:** Switch between a countdown **Pomodoro** timer and a count-up **Stopwatch**.
-   **Persistent & Synced:** Your timer's state is saved and synced across your devices. It will resume right where you left off, even after restarting your browser.
-   **Task Label:** Set a label for your current task to keep you focused on your goal.
-   **Configurable Duration:** Easily set the length of your focus intervals.
-   **Minimizable:** Hide the timer to a small dot on the side of your screen to reduce distractions.
-   **New Tab Integration:** The timer appears in the center of your "New Tab" page.
-   **Audio Alerts:** Get notified with a sound when your Pomodoro session is complete.

---

## How to Install and Run It

Since this is an unpacked Chrome extension, you need to load it in Developer Mode.

1.  **Download the code:**
    -   Clone this repository or download it as a ZIP file and unzip it.

2.  **Open Chrome Extensions:**
    -   Open Google Chrome.
    -   Navigate to `chrome://extensions`. You can copy and paste this into your address bar.

3.  **Enable Developer Mode:**
    -   In the top-right corner of the Extensions page, you'll see a "Developer mode" toggle. Make sure it is switched **on**.

4.  **Load the Extension:**
    -   You will now see a "Load unpacked" button. Click it.
    -   A file selection dialog will open. Navigate to the folder where you saved this code and select the `pomodoro timer` directory.
    -   Click "Select".

5.  **Done!**
    -   The CORTEX extension should now appear in your list of extensions, and the floating timer will be active on your tabs. You can manage its settings from the timer itself.

## What Makes This Special

### 🌐 **Truly Universal**
Unlike other timer extensions that only work on specific pages, this timer appears on **every website** you visit. Whether you're reading articles, working on docs, or scrolling social media, your timer is always there to keep you focused.

### 🎯 **Smart Position Memory**
The timer remembers exactly where you placed it on each website. Move it to the top-right on GitHub? It'll be there next time. Bottom-left on YouTube? Same spot. Each domain gets its own saved position, so your timer feels like it belongs on every page.

### 🖱️ **Drag & Drop Anywhere**
Click and drag the timer to any corner, edge, or position on the page. It's not stuck in a fixed location - you control where it lives on each website.

### ⚡ **Seamless Synchronization**
Start the timer on one tab, switch to another - it keeps running. Pause it on YouTube, resume it on Stack Overflow. The timer state is synchronized across your entire browser, so you never lose track of your focus sessions.

### 🎨 **Minimal & Beautiful**
Clean, modern design that doesn't clutter your browsing experience. The timer only shows controls when you hover over it, keeping your workspace distraction-free.

## How It Works

### The New Tab Experience
Open a new tab and you'll see your timer perfectly centered on a pitch-black background. It's like having a dedicated focus space that's just one click away.

### On Every Website
The timer appears as a floating element that you can:
- **Hover** to reveal controls (Start/Pause, Reset, Set Time)
- **Drag** to reposition anywhere on the page
- **Click** to interact with buttons

### Smart Features
- **Auto-save positions** per website
- **Cross-tab synchronization** 
- **Desktop notifications** when timer completes
- **Customizable duration** (default: 25 minutes)
- **Responsive design** that works on any screen size

## Why Pomodoro?

The Pomodoro Technique is a time management method that uses focused work sessions (typically 25 minutes) followed by short breaks. This extension makes it effortless to implement this technique while browsing, helping you:

- **Stay focused** on one task at a time
- **Avoid burnout** with regular breaks
- **Track productivity** with consistent time blocks
- **Reduce distractions** by creating intentional work periods

## Technical Details

- **Content Script**: Runs on every page to show the timer
- **Background Script**: Manages timer state and synchronization
- **Chrome Storage**: Saves timer positions per domain
- **Message Passing**: Keeps timer state synchronized across tabs
- **Notifications**: Alerts when focus sessions complete

## Privacy

This extension:
- ✅ Only requests notification permission when needed
- ✅ Stores timer positions locally in Chrome storage
- ✅ Doesn't collect or transmit any personal data
- ✅ Works entirely offline

---

**CORTEX - Built for focus, designed for productivity.** 🚀 