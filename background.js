// Background script for synchronized timer
let globalTimer = {
  timeLeft: 25 * 60,
  isRunning: false,
  defaultTime: 25 * 60,
  interval: null,
  enabled: true,
  currentTask: '',
  mode: 'pomodoro', // 'pomodoro' or 'stopwatch'
  reminderFrequency: 2, // in minutes
  customReminderSound: null
};

let stopwatch = {
  time: 0,
  isRunning: false,
  interval: null
};

let taskReminderInterval = null;

// Initialize timer from storage
chrome.storage.sync.get(['timerState', 'timerDuration', 'timerEnabled', 'stopwatchState'], function(result) {
  if (result.timerDuration) {
    globalTimer.defaultTime = result.timerDuration * 60;
  }
  if (result.timerEnabled !== undefined) {
    globalTimer.enabled = result.timerEnabled;
  }
  if (result.timerState) {
    globalTimer.timeLeft = result.timerState.timeLeft;
    globalTimer.isRunning = result.timerState.isRunning;
    globalTimer.defaultTime = result.timerState.defaultTime;
    globalTimer.currentTask = result.timerState.currentTask || '';
    globalTimer.mode = result.timerState.mode || 'pomodoro';
    globalTimer.reminderFrequency = result.timerState.reminderFrequency || 2;
    globalTimer.customReminderSound = result.timerState.customReminderSound || null;
    
    // Resume timer if it was running and enabled
    if (globalTimer.isRunning && globalTimer.enabled) {
      startGlobalTimer();
    }
  } else {
    globalTimer.timeLeft = globalTimer.defaultTime;
  }

  if (result.stopwatchState) {
    stopwatch = result.stopwatchState;
    if (stopwatch.isRunning) {
      startStopwatch();
    }
  }
});

// Start the global timer
function startGlobalTimer() {
  if (globalTimer.interval) return;
  
  if (globalTimer.mode === 'pomodoro') {
    globalTimer.isRunning = true;
    globalTimer.interval = setInterval(() => {
      globalTimer.timeLeft--;
      
      // Broadcast to all tabs
      broadcastTimerUpdate();
      
      // Save state
      saveTimerState();
      
      if (globalTimer.timeLeft <= 0) {
        stopGlobalTimer();
        // Notify completion
        chrome.tabs.query({}, function(tabs) {
          tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'timerComplete'
            }).catch(() => {}); // Ignore errors for inactive tabs
          });
        });
      }
    }, 1000);
  } else { // Stopwatch mode
    globalTimer.isRunning = true;
    globalTimer.interval = setInterval(() => {
      globalTimer.timeLeft++; // Counting up
      broadcastTimerUpdate();
      saveTimerState();
    }, 1000);
  }
  startTaskReminder();
}

// Stop the global timer
function stopGlobalTimer() {
  globalTimer.isRunning = false;
  if (globalTimer.interval) {
    clearInterval(globalTimer.interval);
    globalTimer.interval = null;
  }
  saveTimerState();
  stopTaskReminder();
}

// Reset the global timer
function resetGlobalTimer() {
  stopGlobalTimer();
  if (globalTimer.mode === 'pomodoro') {
    globalTimer.timeLeft = globalTimer.defaultTime;
    globalTimer.currentTask = '';
  } else {
    globalTimer.timeLeft = 0;
  }
  broadcastTimerUpdate();
  saveTimerState();
}

// Broadcast timer update to all tabs
function broadcastTimerUpdate() {
  chrome.tabs.query({}, function(tabs) {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'updateTimerDisplay',
        timeLeft: globalTimer.timeLeft,
        isRunning: globalTimer.isRunning,
        enabled: globalTimer.enabled,
        currentTask: globalTimer.currentTask,
        mode: globalTimer.mode,
        stopwatch: stopwatch,
        reminderFrequency: globalTimer.reminderFrequency,
        customReminderSound: globalTimer.customReminderSound
      }).catch(() => {}); // Ignore errors for inactive tabs
    });
  });
}

function startStopwatch() {
  if (stopwatch.interval) return;
  stopwatch.isRunning = true;
  stopwatch.interval = setInterval(() => {
    stopwatch.time++;
    broadcastTimerUpdate();
    saveTimerState();
  }, 1000);
}

function stopStopwatch() {
  stopwatch.isRunning = false;
  if (stopwatch.interval) {
    clearInterval(stopwatch.interval);
    stopwatch.interval = null;
  }
  saveTimerState();
}

function startTaskReminder() {
    stopTaskReminder(); // Stop any existing reminder
    if (!globalTimer.currentTask || !globalTimer.isRunning || globalTimer.reminderFrequency === 0) return;

    const reminderIntervalMs = globalTimer.reminderFrequency * 60 * 1000;
    
    taskReminderInterval = setInterval(() => {
        chrome.tabs.query({}, function(tabs) {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { action: 'remindTask' }).catch(() => {});
            });
        });
    }, reminderIntervalMs);
}

function stopTaskReminder() {
    if (taskReminderInterval) {
        clearTimeout(taskReminderInterval);
        taskReminderInterval = null;
    }
}

// Save timer state to storage
function saveTimerState() {
  chrome.storage.sync.set({
    timerState: {
      timeLeft: globalTimer.timeLeft,
      isRunning: globalTimer.isRunning,
      defaultTime: globalTimer.defaultTime,
      currentTask: globalTimer.currentTask,
      mode: globalTimer.mode,
      reminderFrequency: globalTimer.reminderFrequency,
      customReminderSound: globalTimer.customReminderSound
    },
    timerEnabled: globalTimer.enabled,
    stopwatchState: stopwatch
  });
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.action) {
    case 'getTimerState':
      sendResponse({
        timeLeft: globalTimer.timeLeft,
        isRunning: globalTimer.isRunning,
        defaultTime: globalTimer.defaultTime,
        enabled: globalTimer.enabled,
        currentTask: globalTimer.currentTask,
        mode: globalTimer.mode,
        reminderFrequency: globalTimer.reminderFrequency,
        customReminderSound: globalTimer.customReminderSound
      });
      break;
      
    case 'startTimer':
      if (globalTimer.enabled) {
        startGlobalTimer();
        broadcastTimerUpdate();
      }
      break;
      
    case 'stopTimer':
      stopGlobalTimer();
      broadcastTimerUpdate();
      break;
      
    case 'resetTimer':
      resetGlobalTimer();
      break;
      
    case 'switchMode':
      stopGlobalTimer();
      if (globalTimer.mode === 'pomodoro') {
        globalTimer.mode = 'stopwatch';
        globalTimer.timeLeft = 0;
      } else {
        globalTimer.mode = 'pomodoro';
        globalTimer.timeLeft = globalTimer.defaultTime;
      }
      broadcastTimerUpdate();
      saveTimerState();
      break;
      
    case 'updateDuration':
      globalTimer.defaultTime = request.duration * 60;
      resetGlobalTimer();
      break;
      
    case 'setTask':
      if (!globalTimer.isRunning) {
        globalTimer.currentTask = request.task;
        if (globalTimer.currentTask) {
            startTaskReminder();
        } else {
            stopTaskReminder();
        }
        saveTimerState();
        broadcastTimerUpdate();
      }
      break;
      
    case 'toggleEnabled':
      globalTimer.enabled = request.enabled;
      saveTimerState();
      broadcastTimerUpdate();
      break;
      
    case 'getEnabled':
      sendResponse({ enabled: globalTimer.enabled });
      break;
      
    case 'toggleStopwatch':
      if (stopwatch.isRunning) {
        stopStopwatch();
      } else {
        startStopwatch();
      }
      break;
      
    case 'updateReminderFrequency':
      globalTimer.reminderFrequency = request.frequency;
      if (globalTimer.isRunning && globalTimer.currentTask) {
        startTaskReminder(); // Restart with new frequency
      }
      saveTimerState();
      broadcastTimerUpdate();
      break;
      
    case 'setCustomSound':
        globalTimer.customReminderSound = request.sound;
        saveTimerState();
        break;

    case 'removeCustomSound':
        globalTimer.customReminderSound = null;
        saveTimerState();
        break;
  }
});

// Clean up when browser closes
chrome.runtime.onSuspend.addListener(function() {
  saveTimerState();
});