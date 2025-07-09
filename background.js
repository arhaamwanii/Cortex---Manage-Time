// Background script for synchronized timer
console.log('BACKGROUND: Service worker starting/restarting at', new Date().toISOString());

let globalTimer = {
  timeLeft: 25 * 60,
  isRunning: false,
  defaultTime: 25 * 60,
  interval: null,
  enabled: true,
  timerVisible: true, // Separate state for timer visibility (controlled by X button)
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

// CRITICAL FIX: Debounced saving to prevent quota issues
let saveTimeout = null;
let lastSavedState = null;
let pendingStateChange = false;

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('BACKGROUND: Extension startup detected');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('BACKGROUND: Extension installed/updated');
});

// Prevent service worker from going inactive
setInterval(() => {
  console.log('BACKGROUND: Service worker keepalive ping');
}, 20000);

// NEW TAB FUNCTIONALITY: Now handled via chrome_url_overrides in manifest
// The newtab.html will automatically load, and can check newtabEnabled state internally

// STATE RESET: Initialize timer from storage with forced synchronization
chrome.storage.sync.get(['timerState', 'timerDuration', 'timerEnabled', 'timerVisible', 'stopwatchState', 'newtabEnabled'], function(result) {
  console.log('BACKGROUND: Initializing with stored state:', result);
  
  if (result.timerDuration) {
    globalTimer.defaultTime = result.timerDuration * 60;
  }
  
  // CRITICAL FIX: Always set enabled to a boolean value, never null
  if (result.timerEnabled !== undefined && result.timerEnabled !== null) {
    globalTimer.enabled = Boolean(result.timerEnabled);
    console.log('BACKGROUND: Loaded timerEnabled from storage:', globalTimer.enabled);
  } else {
    // FORCE RESET: If no stored state, set to enabled and save immediately
    console.log('BACKGROUND: No timerEnabled found, forcing to true');
    globalTimer.enabled = true;
    // CRITICAL: Save state immediately to fix null issue
    chrome.storage.sync.set({ timerEnabled: true }, function() {
      console.log('BACKGROUND: Forced timerEnabled to true in storage');
    });
  }
  
  // Initialize timerVisible state
  if (result.timerVisible !== undefined && result.timerVisible !== null) {
    globalTimer.timerVisible = Boolean(result.timerVisible);
    console.log('BACKGROUND: Loaded timerVisible from storage:', globalTimer.timerVisible);
  } else {
    // Default to true (visible)
    globalTimer.timerVisible = true;
    chrome.storage.sync.set({ timerVisible: true });
  }
  
  // Initialize newtabEnabled state
  if (result.newtabEnabled === undefined || result.newtabEnabled === null) {
    console.log('BACKGROUND: No newtabEnabled found, setting default to true');
    chrome.storage.sync.set({ newtabEnabled: true });
  } else {
    console.log('BACKGROUND: Loaded newtabEnabled from storage:', result.newtabEnabled);
  }
  
  // EMERGENCY NULL CHECK: Ensure enabled is never null after initialization
  if (globalTimer.enabled === null || globalTimer.enabled === undefined) {
    console.error('BACKGROUND: EMERGENCY FIX - enabled was null/undefined, forcing to true');
    globalTimer.enabled = true;
    chrome.storage.sync.set({ timerEnabled: true });
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
    // FORCE SAVE: Ensure default state is stored
    debouncedSaveTimerState();
  }

  if (result.stopwatchState) {
    stopwatch = result.stopwatchState;
    if (stopwatch.isRunning) {
      startStopwatch();
    }
  }
  
  // CRITICAL: Force broadcast initial state to all tabs after 500ms
  setTimeout(() => {
    console.log('BACKGROUND: Force broadcasting initial state to sync all components');
    forceSyncAllTabs();
  }, 500);
});

// Start the global timer
function startGlobalTimer() {
  if (globalTimer.interval) return;
  
  if (globalTimer.mode === 'pomodoro') {
    globalTimer.isRunning = true;
    globalTimer.interval = setInterval(() => {
      globalTimer.timeLeft--;
      
      // Broadcast to all tabs every 5 seconds instead of every second
      if (globalTimer.timeLeft % 5 === 0 || globalTimer.timeLeft <= 10) {
        broadcastTimerUpdate();
      }
      
      // Only save state every 60 seconds instead of every second, or when timer completes/low
      if (globalTimer.timeLeft % 60 === 0 || globalTimer.timeLeft <= 0 || globalTimer.timeLeft <= 5) {
        debouncedSaveTimerState();
      }
      
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
      
      // Less frequent broadcasting for stopwatch too
      if (globalTimer.timeLeft % 5 === 0) {
        broadcastTimerUpdate();
      }
      
      // Save every 60 seconds for stopwatch
      if (globalTimer.timeLeft % 60 === 0) {
        debouncedSaveTimerState();
      }
    }, 1000);
  }
  startTaskReminder();
  
  debouncedSaveTimerState();
}

// Stop the global timer
function stopGlobalTimer() {
  globalTimer.isRunning = false;
  if (globalTimer.interval) {
    clearInterval(globalTimer.interval);
    globalTimer.interval = null;
  }
  debouncedSaveTimerState();
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
  debouncedSaveTimerState();
}

// Broadcast timer update to all tabs (optimized)
function broadcastTimerUpdate(source = null) {
  console.log('BACKGROUND: Broadcasting timer update, enabled:', globalTimer.enabled, 'visible:', globalTimer.timerVisible, 'source:', source);
  chrome.tabs.query({ status: 'complete' }, function(tabs) {
    // Filter out chrome:// and extension:// pages that can't receive messages
    const validTabs = tabs.filter(tab => 
      tab.url && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('moz-extension://')
    );
    
    console.log('BACKGROUND: Found', validTabs.length, 'valid tabs to update (filtered from', tabs.length, 'total)');
    
    const message = {
      action: 'updateTimerDisplay',
      timeLeft: globalTimer.timeLeft,
      isRunning: globalTimer.isRunning,
      enabled: globalTimer.enabled,
      timerVisible: globalTimer.timerVisible,
      currentTask: globalTimer.currentTask,
      mode: globalTimer.mode,
      stopwatch: stopwatch,
      reminderFrequency: globalTimer.reminderFrequency,
      customReminderSound: globalTimer.customReminderSound,
      disableSource: source
    };
    
    validTabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Silently ignore connection errors to dead tabs
      });
    });
  });
}

// FORCE SYNC: Optimized synchronization for startup and state mismatches
function forceSyncAllTabs() {
  console.log('BACKGROUND: Force syncing all tabs with state - enabled:', globalTimer.enabled, 'visible:', globalTimer.timerVisible);
  chrome.tabs.query({ status: 'complete' }, function(tabs) {
    // Filter valid tabs only
    const validTabs = tabs.filter(tab => 
      tab.url && 
      !tab.url.startsWith('chrome://') && 
      !tab.url.startsWith('chrome-extension://') &&
      !tab.url.startsWith('moz-extension://')
    );
    
    const message = {
      action: 'forceStateSync',
      timeLeft: globalTimer.timeLeft,
      isRunning: globalTimer.isRunning,
      enabled: globalTimer.enabled,
      timerVisible: globalTimer.timerVisible,
      currentTask: globalTimer.currentTask,
      mode: globalTimer.mode,
      stopwatch: stopwatch,
      reminderFrequency: globalTimer.reminderFrequency,
      customReminderSound: globalTimer.customReminderSound
    };
    
    validTabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {
        // Silently ignore connection errors
      });
    });
  });
}

function startStopwatch() {
  if (stopwatch.interval) return;
  stopwatch.isRunning = true;
  stopwatch.interval = setInterval(() => {
    stopwatch.time++;
    // Less frequent broadcasting for stopwatch
    if (stopwatch.time % 5 === 0) {
      broadcastTimerUpdate();
    }
    // Save every 60 seconds for stopwatch
    if (stopwatch.time % 60 === 0) {
      debouncedSaveTimerState();
    }
  }, 1000);
  debouncedSaveTimerState();
}

function stopStopwatch() {
  stopwatch.isRunning = false;
  if (stopwatch.interval) {
    clearInterval(stopwatch.interval);
    stopwatch.interval = null;
  }
  debouncedSaveTimerState();
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
  console.log('BACKGROUND: Saving timer state, enabled:', globalTimer.enabled, 'visible:', globalTimer.timerVisible);
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
    timerVisible: globalTimer.timerVisible, // Save the new state
    stopwatchState: stopwatch
  }, function() {
    if (chrome.runtime.lastError) {
      console.error('BACKGROUND: Error saving state:', chrome.runtime.lastError);
    } else {
      console.log('BACKGROUND: State saved successfully');
    }
  });
}

// Debounced save function
function debouncedSaveTimerState() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  saveTimeout = setTimeout(() => {
    saveTimerState();
    lastSavedState = JSON.stringify(globalTimer); // Store a copy for comparison
    pendingStateChange = false;
    console.log('BACKGROUND: Debounced save triggered. State saved.');
  }, 5000); // 5 second debounce time to prevent quota issues
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('BACKGROUND: Received message:', request.action, 'from', sender.tab ? `tab ${sender.tab.id}` : 'popup/extension');
  
  switch(request.action) {
    case 'ping':
      // Simple ping for connectivity testing
      sendResponse({ success: true, timestamp: Date.now() });
      break;
      
    case 'getTimerState':
      const state = {
        timeLeft: globalTimer.timeLeft,
        isRunning: globalTimer.isRunning,
        defaultTime: globalTimer.defaultTime,
        enabled: globalTimer.enabled,
        timerVisible: globalTimer.timerVisible, // Include the new state
        currentTask: globalTimer.currentTask,
        mode: globalTimer.mode,
        reminderFrequency: globalTimer.reminderFrequency,
        customReminderSound: globalTimer.customReminderSound
      };
      console.log('BACKGROUND: Sending timer state:', state);
      sendResponse(state);
      break;
      
    case 'startTimer':
      console.log('BACKGROUND: Starting timer, enabled:', globalTimer.enabled, 'visible:', globalTimer.timerVisible);
      if (globalTimer.enabled) {
        startGlobalTimer();
        broadcastTimerUpdate();
      }
      sendResponse({ success: true, enabled: globalTimer.enabled, timerVisible: globalTimer.timerVisible });
      break;
      
    case 'stopTimer':
      console.log('BACKGROUND: Stopping timer');
      stopGlobalTimer();
      broadcastTimerUpdate();
      sendResponse({ success: true });
      break;
      
    case 'resetTimer':
      console.log('BACKGROUND: Resetting timer');
      resetGlobalTimer();
      sendResponse({ success: true });
      break;
      
    case 'switchMode':
      console.log('BACKGROUND: Switching mode from', globalTimer.mode);
      stopGlobalTimer();
      if (globalTimer.mode === 'pomodoro') {
        globalTimer.mode = 'stopwatch';
        globalTimer.timeLeft = 0;
      } else {
        globalTimer.mode = 'pomodoro';
        globalTimer.timeLeft = globalTimer.defaultTime;
      }
      broadcastTimerUpdate();
      debouncedSaveTimerState();
      sendResponse({ success: true, mode: globalTimer.mode });
      break;
      
    case 'updateDuration':
      console.log('BACKGROUND: Updating duration to', request.duration, 'minutes');
      globalTimer.defaultTime = request.duration * 60;
      resetGlobalTimer();
      sendResponse({ success: true });
      break;
      
    case 'setTask':
      console.log('BACKGROUND: Setting task to:', request.task);
      if (!globalTimer.isRunning) {
        globalTimer.currentTask = request.task;
        if (globalTimer.currentTask) {
            startTaskReminder();
        } else {
            stopTaskReminder();
        }
        debouncedSaveTimerState();
        broadcastTimerUpdate();
      }
      sendResponse({ success: true, task: globalTimer.currentTask });
      break;
      
    case 'toggleEnabled':
      // This is for the popup toggle - controls the main enabled state
      console.log('BACKGROUND: Toggle enabled from', globalTimer.enabled, 'to', request.enabled, 'source:', request.source);
      globalTimer.enabled = request.enabled;
      // When disabled via popup, also hide the timer
      if (!request.enabled) {
        globalTimer.timerVisible = false;
      } else {
        // When enabled via popup, make timer visible
        globalTimer.timerVisible = true;
      }
      debouncedSaveTimerState();
      broadcastTimerUpdate(request.source === 'popupToggle' ? 'popupToggle' : request.source);
      sendResponse({ success: true, enabled: globalTimer.enabled, timerVisible: globalTimer.timerVisible });
      break;
      
    case 'toggleVisible':
      // This is for the X button - only controls visibility, not enabled state
      console.log('BACKGROUND: Toggle visible from', globalTimer.timerVisible, 'to', request.visible, 'source:', request.source);
      globalTimer.timerVisible = request.visible;
      debouncedSaveTimerState();
      broadcastTimerUpdate(request.source);
      sendResponse({ success: true, enabled: globalTimer.enabled, timerVisible: globalTimer.timerVisible });
      break;
      
    case 'getEnabled':
      sendResponse({ enabled: globalTimer.enabled, timerVisible: globalTimer.timerVisible });
      break;
      
    case 'toggleStopwatch':
      console.log('BACKGROUND: Toggling stopwatch');
      if (stopwatch.isRunning) {
        stopStopwatch();
      } else {
        startStopwatch();
      }
      sendResponse({ success: true });
      break;
      
    case 'updateReminderFrequency':
      console.log('BACKGROUND: Updating reminder frequency to', request.frequency);
      globalTimer.reminderFrequency = request.frequency;
      if (globalTimer.isRunning && globalTimer.currentTask) {
        startTaskReminder(); // Restart with new frequency
      }
      debouncedSaveTimerState();
      broadcastTimerUpdate();
      sendResponse({ success: true });
      break;
      
    case 'setCustomSound':
        console.log('BACKGROUND: Setting custom sound');
        globalTimer.customReminderSound = request.sound;
        debouncedSaveTimerState();
        sendResponse({ success: true });
        break;

    case 'removeCustomSound':
        console.log('BACKGROUND: Removing custom sound');
        globalTimer.customReminderSound = null;
        debouncedSaveTimerState();
        sendResponse({ success: true });
        break;
        
    case 'toggleNewtab':
      console.log('BACKGROUND: Toggling new tab to:', request.enabled);
      // Handle new tab toggle with proper error handling
      chrome.storage.sync.set({ newtabEnabled: request.enabled }, function() {
        if (chrome.runtime.lastError) {
          console.error('BACKGROUND: Error saving newtab state:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          console.log('BACKGROUND: Newtab state saved successfully:', request.enabled);
          sendResponse({ success: true, enabled: request.enabled });
        }
      });
      return true; // Indicates async response
      break;
      
    case 'getNewtabState':
      chrome.storage.sync.get(['newtabEnabled'], function(result) {
        const enabled = result.newtabEnabled !== undefined ? result.newtabEnabled : true;
        sendResponse({ enabled: enabled });
      });
      return true; // Indicates async response
      
    case 'reportTimerState':
      // TIMER CONTROLS POPUP: Content script reports actual timer visibility
      console.log('BACKGROUND: Timer reporting its actual state:', request);
      console.log('BACKGROUND: Current stored visible state before update:', globalTimer.timerVisible);
      console.log('BACKGROUND: Timer says it is actually visible:', request.actuallyVisible);
      
      // CRITICAL FIX: Ensure we only accept boolean values, never null/undefined
      if (typeof request.actuallyVisible === 'boolean') {
        // Timer is the authority for visibility - if it reports different state, sync everything
        if (globalTimer.timerVisible !== request.actuallyVisible) {
          console.log('BACKGROUND: Timer visibility mismatch detected! Timer says:', request.actuallyVisible, 'Background says:', globalTimer.timerVisible);
          console.log('BACKGROUND: Updating stored visible state to match timer reality:', request.actuallyVisible);
          globalTimer.timerVisible = request.actuallyVisible;
          debouncedSaveTimerState();
          // Force sync popup and other tabs
          forceSyncAllTabs();
        } else {
          console.log('BACKGROUND: Timer and background visibility state are synchronized:', request.actuallyVisible);
        }
      } else {
        console.warn('BACKGROUND: Timer reported invalid state (not boolean):', request.actuallyVisible, 'ignoring');
      }
      sendResponse({ success: true });
      break;
      
    case 'forceStateReset':
      // EMERGENCY RESET: Force all components to sync to background state
      console.log('BACKGROUND: Force state reset requested');
      forceSyncAllTabs();
      sendResponse({ success: true });
      break;
  }
});

// Function to dynamically update new tab override
function updateManifestNewtab(enabled) {
  // Note: Chrome extensions cannot dynamically modify manifest.json
  // The new tab override is controlled by the newtab.html file itself
  // We'll handle this in the newtab.html by checking the newtabEnabled setting
}

// Clean up when browser closes
chrome.runtime.onSuspend.addListener(function() {
  // Force immediate save on suspend - no debouncing
  saveTimerState();
});