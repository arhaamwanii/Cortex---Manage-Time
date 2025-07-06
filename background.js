// Background script for synchronized timer
let globalTimer = {
  timeLeft: 25 * 60,
  isRunning: false,
  defaultTime: 25 * 60,
  interval: null,
  enabled: true,
  currentTask: ''
};

// Initialize timer from storage
chrome.storage.sync.get(['timerState', 'timerDuration', 'timerEnabled'], function(result) {
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
    
    // Resume timer if it was running and enabled
    if (globalTimer.isRunning && globalTimer.enabled) {
      startGlobalTimer();
    }
  } else {
    globalTimer.timeLeft = globalTimer.defaultTime;
  }
});

// Start the global timer
function startGlobalTimer() {
  if (globalTimer.interval) return;
  
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
}

// Stop the global timer
function stopGlobalTimer() {
  globalTimer.isRunning = false;
  if (globalTimer.interval) {
    clearInterval(globalTimer.interval);
    globalTimer.interval = null;
  }
  saveTimerState();
}

// Reset the global timer
function resetGlobalTimer() {
  stopGlobalTimer();
  globalTimer.timeLeft = globalTimer.defaultTime;
  globalTimer.currentTask = '';
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
        currentTask: globalTimer.currentTask
      }).catch(() => {}); // Ignore errors for inactive tabs
    });
  });
}

// Save timer state to storage
function saveTimerState() {
  chrome.storage.sync.set({
    timerState: {
      timeLeft: globalTimer.timeLeft,
      isRunning: globalTimer.isRunning,
      defaultTime: globalTimer.defaultTime,
      currentTask: globalTimer.currentTask
    },
    timerEnabled: globalTimer.enabled
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
        currentTask: globalTimer.currentTask
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
      
    case 'updateDuration':
      globalTimer.defaultTime = request.duration * 60;
      resetGlobalTimer();
      break;
      
    case 'setTask':
      if (!globalTimer.isRunning) {
        globalTimer.currentTask = request.task;
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
  }
});

// Clean up when browser closes
chrome.runtime.onSuspend.addListener(function() {
  saveTimerState();
});