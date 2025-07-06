# 🧠 CORTEX - Smart Pomodoro Timer Chrome Extension

A smart, floating Pomodoro timer that follows you across every website. Perfect for maintaining focus and productivity while browsing.

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

## Installation Guide (For Non-Developers)

### Step 1: Download the Extension Files
1. **Download the ZIP file**: Click the green "Code" button on this page, then select "Download ZIP"
2. **Extract the files**: 
   - On Windows: Right-click the ZIP file and select "Extract All"
   - On Mac: Double-click the ZIP file to extract
   - On Linux: Right-click and select "Extract Here"
3. **Remember the folder location**: Note where you extracted the files - you'll need this in Step 4

### Step 2: Open Chrome Extensions Page
1. Open Google Chrome
2. Type `chrome://extensions/` in the address bar and press Enter
3. You should see a page with your installed extensions

### Step 3: Enable Developer Mode
1. Look for the toggle switch labeled "Developer mode" in the top-right corner
2. Turn it ON (it will turn blue)
3. You'll see new options appear below

### Step 4: Load the Extension
1. Click the "Load unpacked" button that appeared after enabling Developer mode
2. A file browser window will open
3. Navigate to the folder where you extracted the CORTEX files
4. Select the folder (not individual files) and click "Select Folder"
5. You should see CORTEX appear in your extensions list

### Step 5: Verify Installation
1. Look for CORTEX in your extensions list
2. Make sure the toggle switch next to it is ON (blue)
3. Open a new tab - you should see the timer centered on a black background
4. Visit any website - you should see the floating timer appear

### Troubleshooting
- **Extension not appearing?** Make sure you selected the folder containing the files, not individual files
- **Timer not showing?** Try refreshing the page or opening a new tab
- **Permission errors?** Make sure you enabled Developer mode first

### What You Should See
- A floating timer on every website you visit
- The timer can be dragged around and positioned anywhere
- Hover over the timer to see Start/Pause, Reset, and Set Time buttons
- New tabs show the timer centered on a black background

## Usage

### Basic Timer
- **Start/Pause**: Click the Start button to begin your focus session
- **Reset**: Reset the timer back to the original duration
- **Set Time**: Change the timer duration to any number of minutes

### Positioning
- **Drag**: Click and drag the timer to move it around
- **Auto-save**: Your position is automatically saved for each website
- **Hover**: Hover over the timer to see the control buttons

### New Tab
- Open a new tab to see the timer centered on a black background
- Perfect for starting a focused work session

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